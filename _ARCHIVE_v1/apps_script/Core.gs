/**
 * TenderPilot - logique metier pure.
 *
 * Aucune fonction de ce fichier n'appelle SpreadsheetApp, GmailApp ni
 * MailApp. C'est volontaire : ces fonctions sont testables hors de Google,
 * et elles le sont (tests/test_12_apps_script.js).
 *
 * Tout ce qui touche reellement au classeur vit dans Sheets.gs.
 */

/** Nombre de jours entre aujourd'hui et une deadline. */
function daysRemaining(deadline, today) {
  if (!deadline) return null;
  var d = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
  var t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((d - t) / 86400000);
}

/**
 * Palier de deadline d'une opportunite.
 *
 * La regle produit passe avant le calendrier : un dossier clos n'est jamais
 * urgent, meme la veille de la deadline. Identique a la mise en forme
 * conditionnelle du classeur - les deux doivent dire la meme chose.
 */
function deadlineBucket(days, status) {
  if (SCHEMA.STATUSES_CLOSED.indexOf(status) !== -1) return 'closed';
  if (days === null || days === undefined || days === '') return 'none';
  if (days < 0) return 'expired';
  if (days <= 2) return 'j1';
  if (days <= 7) return 'j3';
  if (days <= 15) return 'j7';
  return 'ok';
}

/** "14;7;3;1" devient [14, 7, 3, 1]. Tolerant aux espaces et aux virgules. */
function parseReminderDays(text) {
  if (!text) return [];
  return String(text)
    .split(/[;,]/)
    .map(function (p) { return parseInt(String(p).trim(), 10); })
    .filter(function (n) { return !isNaN(n) && n >= 0; })
    .sort(function (a, b) { return b - a; });
}

/**
 * Faut-il envoyer un rappel aujourd'hui ?
 *
 * Uniquement le jour exact du palier, pour ne pas rappeler tous les jours.
 * Un dossier clos ne declenche jamais de rappel.
 */
function shouldRemind(days, status, reminderDays) {
  if (SCHEMA.STATUSES_CLOSED.indexOf(status) !== -1) return false;
  if (days === null || days === undefined || days === '') return false;
  return reminderDays.indexOf(days) !== -1;
}

/** Normalise un texte pour comparaison : accents, casse, ponctuation. */
function normalizeText(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Cle de deduplication d'une opportunite.
 *
 * Une meme annonce peut arriver par deux canaux (email et saisie manuelle)
 * avec des titres presentes differemment. On compare le titre normalise,
 * l'organisation et le jour de la deadline.
 */
function dedupKey(title, organization, deadline) {
  var day = '';
  if (deadline instanceof Date) {
    day = [deadline.getFullYear(),
           ('0' + (deadline.getMonth() + 1)).slice(-2),
           ('0' + deadline.getDate()).slice(-2)].join('-');
  } else if (deadline) {
    day = String(deadline).slice(0, 10);
  }
  return [normalizeText(title), normalizeText(organization), day].join('|');
}

/** Identifiant sequentiel OPP-0001, en repartant du plus grand existant. */
function nextOpportunityId(existingIds) {
  var max = 0;
  (existingIds || []).forEach(function (id) {
    var m = /^OPP-(\d+)$/.exec(String(id).trim());
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  // Le remplissage a 4 chiffres ne doit pas tronquer au-dela de 9999 :
  // 'OPP-' + '10000'.slice(-4) donnerait 'OPP-0000' et creerait des
  // identifiants en collision.
  var next = String(max + 1);
  while (next.length < 4) next = '0' + next;
  return 'OPP-' + next;
}

/** Premiere URL http(s) trouvee dans un texte. */
function firstUrl(text) {
  if (!text) return '';
  var m = /https?:\/\/[^\s<>"')]+/.exec(String(text));
  return m ? m[0] : '';
}

/**
 * Score de pertinence algorithmique, sans IA.
 *
 * Volontairement simple et explicable : l'utilisateur doit pouvoir
 * comprendre pourquoi une opportunite est remontee. Le detail par critere
 * est renvoye avec le score. Bareme de la section 7 de la documentation.
 */
function relevanceScore(opportunity, watchlist) {
  var detail = [];
  var score = 0;

  function add(points, label) {
    score += points;
    detail.push('+' + points + ' ' + label);
  }

  var countries = (watchlist.countries || []).map(normalizeText).filter(Boolean);
  var sectors = (watchlist.sectors || []).map(normalizeText).filter(Boolean);
  var types = (watchlist.types || []).map(normalizeText).filter(Boolean);

  var haystack = normalizeText(
    [opportunity.title, opportunity.organization, opportunity.notes].join(' '));

  // Un mot-cle negatif est un veto, pas un malus : il ecarte l'opportunite
  // avant tout calcul.
  var negatives = (watchlist.negativeKeywords || []).map(normalizeText).filter(Boolean);
  var blocked = negatives.filter(function (k) { return haystack.indexOf(k) !== -1; });
  if (blocked.length) {
    return { score: 0, excluded: true,
             detail: ['exclu par mot-cle negatif : ' + blocked.join(', ')] };
  }

  var days = opportunity.daysRemaining;
  if (days !== null && days !== undefined && days !== '' && days < 0) {
    return { score: 0, excluded: true, detail: ['deadline depassee'] };
  }

  if (countries.length && countries.indexOf(normalizeText(opportunity.country)) !== -1) {
    add(20, 'pays cible');
  }
  if (sectors.length && sectors.indexOf(normalizeText(opportunity.sector)) !== -1) {
    add(30, 'secteur cible');
  }
  if (types.length && types.indexOf(normalizeText(opportunity.type)) !== -1) {
    add(15, 'type accepte');
  }

  var positives = (watchlist.positiveKeywords || []).map(normalizeText).filter(Boolean);
  var matched = positives.filter(function (k) { return haystack.indexOf(k) !== -1; });
  if (matched.length) add(20, 'mot-cle : ' + matched.join(', '));

  var minDays = watchlist.minDays === undefined ? 7 : watchlist.minDays;
  if (days !== null && days !== undefined && days !== '') {
    if (days >= minDays) add(10, 'delai suffisant');
    else detail.push('0 delai trop court (' + days + ' j)');
  }

  var budget = opportunity.budget;
  if (budget !== null && budget !== undefined && budget !== '') {
    var min = watchlist.minBudget;
    var max = watchlist.maxBudget;
    var okMin = (min === null || min === undefined || min === '' || budget >= min);
    var okMax = (max === null || max === undefined || max === '' || budget <= max);
    if (okMin && okMax) add(5, 'budget compatible');
    else detail.push('0 budget hors fourchette');
  }

  return { score: Math.min(score, 100), detail: detail, excluded: false };
}

/** Interpretation du score, section 7 de la documentation. */
function relevanceLabel(score) {
  if (score >= 80) return 'Tres pertinent';
  if (score >= 60) return 'A analyser';
  if (score >= 40) return 'Faible priorite';
  return 'Ignorer';
}

/**
 * Valide une saisie du formulaire avant ecriture dans le classeur.
 * Retourne la liste des erreurs, vide si tout va bien.
 */
function validateOpportunity(form) {
  var errors = [];
  if (!form.title || !String(form.title).trim()) {
    errors.push('Le titre est obligatoire.');
  }
  if (!form.deadline) {
    errors.push('La deadline est obligatoire.');
  } else if (isNaN(new Date(form.deadline).getTime())) {
    errors.push('La deadline n est pas une date valide.');
  }
  if (form.sourceUrl && !/^https?:\/\//.test(form.sourceUrl)) {
    errors.push('Le lien doit commencer par http:// ou https://');
  }
  if (form.budget !== '' && form.budget !== null && form.budget !== undefined
      && isNaN(Number(form.budget))) {
    errors.push('Le budget doit etre un nombre.');
  }
  return errors;
}

// Export pour les tests Node. Apps Script n'a pas de module : la garde evite
// une erreur au chargement dans Google.
if (typeof module !== 'undefined') {
  module.exports = {
    daysRemaining: daysRemaining,
    deadlineBucket: deadlineBucket,
    parseReminderDays: parseReminderDays,
    shouldRemind: shouldRemind,
    normalizeText: normalizeText,
    dedupKey: dedupKey,
    nextOpportunityId: nextOpportunityId,
    firstUrl: firstUrl,
    relevanceScore: relevanceScore,
    relevanceLabel: relevanceLabel,
    validateOpportunity: validateOpportunity
  };
}
