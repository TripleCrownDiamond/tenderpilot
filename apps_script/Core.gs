/**
 * TenderPilot - logique pure.
 *
 * Aucune fonction ici n'appelle SpreadsheetApp, MailApp ou UrlFetchApp.
 * C'est ce qui permet de la tester hors de Google (tests/test_logic.js).
 * Tout ce qui touche au classeur vit dans Sheet.gs.
 */

/** Texte normalise pour comparaison : accents, casse, ponctuation. */
function normalizeText(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function estVide(v) {
  return v === null || v === undefined || String(v).trim() === '';
}

/** Date -> "aaaa-mm-jj". Accepte deja une chaine au bon format. */
function jour(valeur) {
  if (estVide(valeur)) return '';
  if (valeur instanceof Date) {
    return valeur.getFullYear() + '-'
      + ('0' + (valeur.getMonth() + 1)).slice(-2) + '-'
      + ('0' + valeur.getDate()).slice(-2);
  }
  var m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(valeur).trim());
  if (!m) return '';
  return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
}

/**
 * Jours restants avant une deadline.
 *
 * Le calcul se fait sur des dates sans heure : un changement d'heure
 * saisonnier ne doit pas produire 6,96 jours au lieu de 7.
 */
function joursRestants(deadline, aujourdhui) {
  var d = jour(deadline);
  var t = jour(aujourdhui);
  if (!d || !t) return null;
  var a = d.split('-').map(Number);
  var b = t.split('-').map(Number);
  return Math.round((new Date(a[0], a[1] - 1, a[2])
    - new Date(b[0], b[1] - 1, b[2])) / 86400000);
}

/** Statut de delai - section 9 du cahier des charges. */
function statutDelai(jours) {
  if (jours === null || jours === undefined || jours === '') {
    return SCHEMA.STATUT_INCONNU;
  }
  if (jours < 0) return SCHEMA.STATUT_EXPIRE;
  for (var i = 0; i < SCHEMA.DELAI_SEUILS.length; i++) {
    if (jours <= SCHEMA.DELAI_SEUILS[i][1]) return SCHEMA.DELAI_SEUILS[i][0];
  }
  return SCHEMA.STATUT_OUVERT;
}

function couleurStatut(statut) {
  return SCHEMA.COULEURS[statut] || SCHEMA.COULEURS[SCHEMA.STATUT_INCONNU];
}

/**
 * Cles de deduplication, dans l'ordre de fiabilite - section 7 :
 * 1. lien officiel + titre, 2. reference officielle, 3. titre + organisation
 * + deadline. Une seule correspondance suffit a reconnaitre un doublon.
 *
 * MESURE DU 2026-09-02. Le lien seul faisait office d identite, et c etait
 * faux. Beaucoup de portails pointent chaque avis vers la meme page de
 * liste : trouverDoublon s arretant a la premiere cle qui correspond, la
 * cle URL suffisait a confondre des avis differents.
 *
 * Degats constates en production, sur des sources actives :
 *   DNCMP Benin ..... 43 avis publies, 1 seul enregistre
 *   SBEE ............  7 avis,          1 seul
 *   DEDRAS ..........  2 avis,          1 seul
 *
 * La cle URL porte donc aussi le titre. Deux avis distincts sur une meme
 * page restent distincts ; un meme avis recollecte reste reconnu. Le
 * compromis est assume : si une source reecrit le titre d un avis, il peut
 * creer une seconde ligne. Une ligne en double se voit et se supprime ;
 * quarante-deux marches jamais enregistres ne se voient pas.
 */
function clesDedup(opp) {
  var cles = [];
  // Voir la note ci-dessus : le lien seul confondait des avis distincts.
  if (!estVide(opp.url)) {
    cles.push('url:' + normalizeText(opp.url) + '|' + normalizeText(opp.title));
  }
  if (!estVide(opp.ref)) cles.push('ref:' + normalizeText(opp.ref));
  if (!estVide(opp.title)) {
    cles.push('t:' + [normalizeText(opp.title), normalizeText(opp.org),
                      jour(opp.deadline)].join('|'));
  }
  return cles;
}

/** Index de deduplication construit une seule fois par execution. */
function construireIndex(lignes) {
  var index = {};
  (lignes || []).forEach(function (ligne) {
    clesDedup(ligne).forEach(function (cle) {
      if (index[cle] === undefined) index[cle] = ligne;
    });
  });
  return index;
}

function trouverDoublon(opp, index) {
  var cles = clesDedup(opp);
  for (var i = 0; i < cles.length; i++) {
    if (index[cles[i]]) return index[cles[i]];
  }
  return null;
}

/**
 * Champs a mettre a jour sur une opportunite deja connue - section 8.
 *
 * On ne remplace jamais une valeur existante par du vide : une source qui
 * cesse temporairement de publier un champ ne doit pas effacer le classeur.
 */
function champsModifies(existant, entrant) {
  var diff = {};
  SCHEMA.UPDATABLE.forEach(function (cle) {
    var neuf = entrant[cle];
    if (estVide(neuf)) return;
    var ancien = existant[cle];
    if (cle === 'deadline' || cle === 'published') {
      if (jour(neuf) !== jour(ancien)) diff[cle] = jour(neuf);
      return;
    }
    var avant = ancien === undefined || ancien === null ? '' : String(ancien).trim();
    if (String(neuf).trim() !== avant) diff[cle] = String(neuf).trim();
  });
  return diff;
}

function estVrai(valeur) {
  if (valeur === true) return true;
  var t = String(valeur === null || valeur === undefined ? '' : valeur)
    .trim().toLowerCase();
  return t === 'true' || t === 'vrai' || t === 'oui' || t === 'yes' || t === '1';
}

/**
 * Notifications a declencher pour une ligne - sections 12 a 17.
 * Retourne { envoyer: [...], marquer: [...] }.
 *
 * Deux precisions au-dela du texte du cahier des charges, pour tenir la
 * promesse "ne pas spammer" :
 *
 * - les rappels J-7 / J-3 / J-1 ne concernent que les deadlines a venir.
 *   Sans cela une opportunite expiree depuis un mois satisferait aussi
 *   "jours restants <= 7" et recevrait quatre emails d'un coup.
 * - une opportunite ajoutee alors qu'il reste 2 jours declenche J-7, J-3 et
 *   J-1 en meme temps. On envoie alors le plus urgent seulement, et on
 *   marque les autres comme envoyes : ils n'ont plus lieu d'etre.
 */
function notificationsAEnvoyer(ligne, config) {
  var envoyer = [];
  var candidats = [];
  var jours = ligne.days;
  if (jours === '' || jours === undefined) jours = null;

  SCHEMA.NOTIFICATIONS.forEach(function (notif) {
    if (!estVrai(config[notif.config])) return;
    if (estVrai(ligne[notif.column])) return;

    if (notif.key === 'new') { envoyer.push('new'); return; }
    if (jours === null) return;
    if (notif.key === 'expired') {
      if (jours < 0) candidats.push('expired');
      return;
    }
    if (jours >= 0 && jours <= notif.threshold) candidats.push(notif.key);
  });

  // Parmi les rappels d'echeance, un seul part : le plus urgent.
  var ordre = ['expired', 'j1', 'j3', 'j7'];
  for (var i = 0; i < ordre.length; i++) {
    if (candidats.indexOf(ordre[i]) !== -1) { envoyer.push(ordre[i]); break; }
  }

  // Tous les candidats sont marques : les moins urgents sont sans objet.
  var marquer = candidats.slice();
  if (envoyer.indexOf('new') !== -1) marquer.push('new');
  return { envoyer: envoyer, marquer: marquer };
}

/** Identifiant stable TP-000001. */
function prochainId(lignes) {
  var max = 0;
  var motif = new RegExp('^' + SCHEMA.ID_PREFIX + '-(\\d+)$');
  (lignes || []).forEach(function (l) {
    var m = motif.exec(String(l.id || '').trim());
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  var n = String(max + 1);
  while (n.length < 6) n = '0' + n;
  return SCHEMA.ID_PREFIX + '-' + n;
}

/**
 * Seuil au-dela duquel une source qui ne publie plus est jugee silencieuse.
 * Un flux qui n'a rien sorti depuis six mois est presque toujours abandonne.
 */
var JOURS_SOURCE_SILENCIEUSE = 180;

/**
 * Statut de fraicheur d'une source, d'apres la date de publication la plus
 * recente de ses annonces.
 *
 * Une source techniquement joignable mais qui ne publie plus donne un faux
 * sentiment de securite : l'utilisateur croit surveiller un canal officiel
 * qui, en realite, est mort. On le signale dans le statut de la source.
 *
 * `dates` : tableau d'objets Date (ou valeurs vides). `aujourdhui` : Date.
 */
function fraicheurSource_(dates, aujourdhui) {
  // Accepte des objets Date comme des chaines "aaaa-mm-jj" : les annonces
  // normalisees stockent la date de publication en texte.
  var temps = (dates || []).map(function (d) {
    if (d instanceof Date) return d.getTime();
    var j = jour(d);
    if (!j) return null;
    var p = j.split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]).getTime();
  }).filter(function (t) { return t !== null && !isNaN(t); });

  if (!temps.length) return { silencieuse: false, jours: null };

  var plusRecente = Math.max.apply(null, temps);
  var jours = Math.floor((aujourdhui.getTime() - plusRecente) / 86400000);
  return { silencieuse: jours > JOURS_SOURCE_SILENCIEUSE, jours: jours };
}

/** Resume tronque proprement - section 28. Pas d'IA. */
function tronquer(texte, maximum) {
  var t = String(texte === null || texte === undefined ? '' : texte)
    .replace(/\s+/g, ' ').trim();
  var max = maximum || SCHEMA.SUMMARY_MAX;
  if (t.length <= max) return t;
  var coupe = t.slice(0, max);
  var espace = coupe.lastIndexOf(' ');
  if (espace > max * 0.6) coupe = coupe.slice(0, espace);
  return coupe + '...';
}

/**
 * Normalisation minimale d'une annonce - section 26.
 *
 * Les valeurs par defaut de la source comblent ce que le flux ne fournit
 * pas. Ce qui reste inconnu reste VIDE : on ne devine rien (section 27).
 */
function normalizeOpportunity(brut, source) {
  return {
    title: String(brut.title || '').trim(),
    org: String(brut.org || source.name || '').trim(),
    country: String(brut.country || source.country || '').trim(),
    type: String(brut.type || source.type || '').trim(),
    sector: String(brut.sector || source.sector || '').trim(),
    source: String(source.id || '').trim(),
    url: String(brut.url || '').trim(),
    pdf: String(brut.pdf || '').trim(),
    published: jour(brut.published),
    deadline: jour(brut.deadline),
    summary: tronquer(brut.summary),
    ref: String(brut.ref || '').trim()
  };
}

// Export pour les tests Node. Apps Script n'a pas de module.
if (typeof module !== 'undefined') {
  module.exports = {
    normalizeText: normalizeText, estVide: estVide, jour: jour,
    joursRestants: joursRestants, statutDelai: statutDelai,
    couleurStatut: couleurStatut, clesDedup: clesDedup,
    construireIndex: construireIndex, trouverDoublon: trouverDoublon,
    champsModifies: champsModifies, estVrai: estVrai,
    notificationsAEnvoyer: notificationsAEnvoyer, prochainId: prochainId,
    tronquer: tronquer,
    fraicheurSource_: fraicheurSource_,
    JOURS_SOURCE_SILENCIEUSE: JOURS_SOURCE_SILENCIEUSE, normalizeOpportunity: normalizeOpportunity
  };
}
