/**
 * TenderPilot - lecture des flux RSS et Atom.
 *
 * Comme Core.gs, ce fichier ne touche a aucune API Google : il est teste
 * hors de Google (tests/test_12_apps_script.js). La recuperation reseau
 * elle-meme vit dans Menu.gs.
 *
 * Le parsing est fait a la main plutot qu'avec XmlService, pour deux
 * raisons : les flux d'appels d'offres sont souvent mal formes et feraient
 * echouer un parseur strict, et un parseur en JavaScript pur est testable
 * en local.
 */

/**
 * Repare les caracteres perdus au decodage.
 *
 * Certains flux - celui du PNUD par exemple - melangent de l'UTF-8 et des
 * octets Windows-1252 isoles, typiquement l'apostrophe courbe que Word
 * insere. Ces octets ne forment pas une sequence UTF-8 valide : le
 * decodeur les remplace par le caractere de substitution U+FFFD, et le
 * titre devient "TRAVAUX D?AMENAGEMENT".
 *
 * On ne peut pas retrouver l'octet d'origine apres coup. Mais dans un
 * texte, un caractere de substitution place entre deux lettres est une
 * apostrophe dans la quasi-totalite des cas : on la retablit. Ailleurs, on
 * retire simplement le caractere plutot que de laisser un losange noir.
 */
function reparerCaracteres(texte) {
  if (!texte) return '';
  return String(texte)
    .replace(/([A-Za-zÀ-ÿ])�([A-Za-zÀ-ÿ])/g, "$1'$2")
    .replace(/�/g, '');
}

/** Remplace les entites HTML courantes par leur caractere. */
function decodeEntities(text) {
  if (!text) return '';
  return String(text)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, function (_m, code) {
      return String.fromCharCode(parseInt(code, 10));
    })
    .replace(/&#x([0-9a-fA-F]+);/g, function (_m, code) {
      return String.fromCharCode(parseInt(code, 16));
    })
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

/** Supprime les balises HTML d'un resume de flux. */
function stripTags(text) {
  if (!text) return '';
  return reparerCaracteres(decodeEntities(String(text).replace(/<[^>]*>/g, ' ')))
    .replace(/\s+/g, ' ')
    .trim();
}

function tagContent_(xml, tag) {
  var match = new RegExp('<' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + tag + '>',
                         'i').exec(xml);
  return match ? decodeEntities(match[1]).trim() : '';
}

/**
 * Retire les parametres de tracage d'un lien.
 *
 * Beaucoup de liens portent des marqueurs publicitaires (utm_source, fbclid,
 * gclid...) qui n'ont rien a voir avec la ressource. Ils allongent le lien et,
 * surtout, faussent la deduplication : la meme annonce vue avec et sans
 * "?utm_source=..." passerait pour deux opportunites differentes.
 */
function nettoyerLien(url) {
  if (!url) return '';
  var brut = String(url).trim();
  var sep = brut.indexOf('?');
  if (sep === -1) return brut;

  var base = brut.slice(0, sep);
  var reste = brut.slice(sep + 1).split('#')[0];
  var indesirables = /^(utm_|fbclid$|gclid$|mc_|ref$|ref_src$|source$|spm$|igshid$|_ga$)/i;

  var gardes = reste.split('&').filter(function (paire) {
    var cle = paire.split('=')[0];
    return cle && !indesirables.test(cle);
  });
  return gardes.length ? base + '?' + gardes.join('&') : base;
}

/** Extrait le lien, en gerant la forme RSS et la forme Atom. */
function itemLink_(xml) {
  var rss = tagContent_(xml, 'link');
  if (rss && /^https?:\/\//.test(rss)) return rss;

  // Atom : <link rel="alternate" href="..."/>. On ignore les liens
  // d'edition ou d'auto-reference, qui ne menent pas a l'annonce.
  var pattern = /<link\b[^>]*href=["']([^"']+)["'][^>]*>/gi;
  var match;
  var fallback = '';
  while ((match = pattern.exec(xml)) !== null) {
    var tag = match[0];
    if (/rel=["'](self|edit)["']/i.test(tag)) continue;
    if (/rel=["']alternate["']/i.test(tag)) return match[1];
    if (!fallback) fallback = match[1];
  }
  return fallback || rss;
}

/**
 * Date de publication d'une entree, ou null si illisible.
 *
 * Un pubDate RSS porte son fuseau ("Tue, 26 Aug 2026 09:00:00 +0100") et se
 * lit tel quel. Une date nue ("02 March 2026", affichee sur une vignette
 * ARMP) n'en porte aucun : JavaScript la place a minuit LOCAL, et toute
 * relecture en UTC depuis un fuseau positif la fait reculer d'un jour.
 * On la ramene donc a midi, a l'abri de tout decalage horaire.
 */
function parseFeedDate(text) {
  if (!text) return null;
  var brut = String(text).trim();
  var date = new Date(brut);
  if (isNaN(date.getTime())) return null;

  var avecFuseau = /(Z|GMT|UTC|[+-]\d{2}:?\d{2})\s*$/i.test(brut);
  if (!avecFuseau) date.setHours(12, 0, 0, 0);
  return date;
}

/**
 * Mois reconnus, en francais et en anglais, entiers ou abreges.
 *
 * Le PNUD ecrit "Application Deadline: 31-Aug-26" : sans les mois anglais
 * ni les annees a deux chiffres, aucune echeance n'etait extraite.
 */
var MOIS = {
  janvier: 0, janv: 0, jan: 0, january: 0,
  fevrier: 1, fevr: 1, feb: 1, february: 1,
  mars: 2, mar: 2, march: 2,
  avril: 3, avr: 3, apr: 3, april: 3,
  mai: 4, may: 4,
  juin: 5, jun: 5, june: 5,
  juillet: 6, juil: 6, jul: 6, july: 6,
  aout: 7, aou: 7, aug: 7, august: 7,
  septembre: 8, sept: 8, sep: 8, september: 8,
  octobre: 9, oct: 9, october: 9,
  novembre: 10, nov: 10, november: 10,
  decembre: 11, dec: 11, december: 11
};

/** "26" designe 2026, pas l'an 26. */
function anneeComplete_(valeur) {
  var n = parseInt(valeur, 10);
  return n < 100 ? 2000 + n : n;
}

/** Construit une date en refusant les valeurs impossibles (32/13). */
function buildDate_(year, month, day) {
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;
  var date = new Date(year, month, day);
  if (date.getFullYear() !== year || date.getMonth() !== month
      || date.getDate() !== day) {
    return null;
  }
  return date;
}

/**
 * Cherche une date d'echeance dans un texte libre.
 *
 * Une date n'est retenue QUE si elle suit un mot annonciateur (date limite,
 * cloture, deadline...). Sans cette regle on renverrait la premiere date
 * venue - souvent la date de publication - et le client se fierait a une
 * echeance inventee. Mieux vaut ne rien renvoyer et le lui faire saisir.
 */
function extractDeadline(text) {
  if (!text) return null;
  var normalized = normalizeText(text);
  var keywords = ['date limite', 'date de cloture', 'cloture', 'deadline',
                  'limite de depot', 'closing date', 'submission deadline',
                  'a soumettre avant', 'avant le'];

  var start = -1;
  for (var i = 0; i < keywords.length; i++) {
    var at = normalized.indexOf(keywords[i]);
    if (at !== -1 && (start === -1 || at < start)) start = at;
  }
  if (start === -1) return null;

  // normalizeText a deja remplace tous les separateurs par des espaces.
  var window = normalized.slice(start, start + 90);

  // Chaque motif est ESSAYE, pas impose : un motif qui accroche une date
  // impossible ne doit pas interrompre la recherche. Sans cela, une heure
  // collee a la date ("02 September 2026 12:00" -> "2026 12 00") passerait
  // pour une date ISO, serait rejetee comme invalide, et l'echeance pourtant
  // ecrite juste a cote serait perdue.
  var essais = [];

  var numeric = /(\d{1,2}) (\d{1,2}) (\d{4})/.exec(window);
  if (numeric) {
    essais.push(buildDate_(parseInt(numeric[3], 10), parseInt(numeric[2], 10) - 1,
                           parseInt(numeric[1], 10)));
  }

  var iso = /(\d{4}) (\d{1,2}) (\d{1,2})/.exec(window);
  if (iso) {
    essais.push(buildDate_(parseInt(iso[1], 10), parseInt(iso[2], 10) - 1,
                           parseInt(iso[3], 10)));
  }

  // 31 aug 26, 15 septembre 2026, 5 Jan 2027...
  var lettres = /(\d{1,2}) ([a-z]+) (\d{2,4})/.exec(window);
  if (lettres && MOIS.hasOwnProperty(lettres[2])) {
    essais.push(buildDate_(anneeComplete_(lettres[3]), MOIS[lettres[2]],
                           parseInt(lettres[1], 10)));
  }
  // Aug 31 2026 : forme anglaise, mois en premier.
  var moisDabord = /([a-z]+) (\d{1,2}) (\d{2,4})/.exec(window);
  if (moisDabord && MOIS.hasOwnProperty(moisDabord[1])) {
    essais.push(buildDate_(anneeComplete_(moisDabord[3]), MOIS[moisDabord[1]],
                           parseInt(moisDabord[2], 10)));
  }

  for (var i = 0; i < essais.length; i++) {
    if (essais[i]) return essais[i];
  }
  return null;
}

/**
 * Repare les flux dont chaque element porte le meme titre.
 *
 * MESURE DU 2026-09-02 sur le flux de la DNCMP, la direction beninoise des
 * marches publics : ses 43 elements portent tous le titre "Appel d'Offre" -
 * un libelle de categorie, pas un intitule - et tous le meme lien. L objet
 * reel du marche est dans <description>.
 *
 * Deux consequences, toutes deux graves. Les cles de deduplication devenant
 * identiques, 42 marches sur 43 n etaient jamais enregistres. Et les rares
 * lignes ecrites s intitulaient "Appel d'Offre", ce qui n apprend rien.
 *
 * La regle est deliberement etroite : il faut que TOUS les elements
 * partagent le meme titre et que les descriptions, elles, different. Un flux
 * normal n est jamais touche.
 */
function reparerTitresIdentiques_(entrees) {
  if (entrees.length < 2) return entrees;

  var titres = {};
  var resumes = {};
  var nTitres = 0;
  var nResumes = 0;
  entrees.forEach(function (e) {
    var t = String(e.title || '').trim().toLowerCase();
    var r = String(e.summary || '').trim().toLowerCase();
    if (!titres[t]) { titres[t] = true; nTitres++; }
    if (!resumes[r]) { resumes[r] = true; nResumes++; }
  });
  if (nTitres !== 1 || nResumes < entrees.length) return entrees;

  var categorie = String(entrees[0].title || '').trim();
  return entrees.map(function (e) {
    return {
      title: tronquer(e.summary) || e.title,
      link: e.link,
      published: e.published,
      // Le libelle de categorie reste utile : il dit la nature de l avis.
      summary: categorie,
      type: e.type || categorie,
      deadline: e.deadline
    };
  });
}

/**
 * Transforme le XML d'un flux RSS ou Atom en liste d'entrees.
 *
 * Retourne [] plutot que de lever une erreur sur un flux illisible : une
 * source cassee ne doit pas interrompre la collecte des autres.
 */
function parseFeedXml(xml) {
  if (!xml) return [];
  var blocks = String(xml).match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) || [];

  var entrees = blocks.map(function (block) {
    var title = stripTags(tagContent_(block, 'title'));
    var summary = stripTags(tagContent_(block, 'description')
                            || tagContent_(block, 'summary')
                            || tagContent_(block, 'content'));
    return {
      title: title,
      link: nettoyerLien(itemLink_(block)),
      published: parseFeedDate(tagContent_(block, 'pubDate')
                               || tagContent_(block, 'published')
                               || tagContent_(block, 'updated')
                               || tagContent_(block, 'dc:date')),
      summary: summary,
      deadline: extractDeadline(title + ' ' + summary)
    };
  });

  var retenues = entrees.filter(function (item) { return item.title; });
  return reparerTitresIdentiques_(retenues);
}

if (typeof module !== 'undefined') {
  module.exports = {
    decodeEntities: decodeEntities,
    nettoyerLien: nettoyerLien,
    reparerCaracteres: reparerCaracteres,
    stripTags: stripTags,
    parseFeedDate: parseFeedDate,
    extractDeadline: extractDeadline,
    parseFeedXml: parseFeedXml,
    reparerTitresIdentiques_: reparerTitresIdentiques_
  };
}
