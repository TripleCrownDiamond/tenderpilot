/**
 * Les plans de passation du portail national du Benin.
 *
 * CE QU'EST UN PLAN, ET POURQUOI IL VIT A PART. Chaque autorite
 * contractante publie en debut d'annee ce qu'elle PREVOIT d'acheter : un
 * objet, un budget estime, un mode de passation, une date de lancement
 * prevue. Ce n'est pas un appel d'offres - il n'y a ni dossier ni date de
 * depot, rien a quoi repondre aujourd'hui. Le melanger aux opportunites
 * ferait croire au client qu'il peut deposer : c'est exactement ce que
 * estPlanDePassation_ empeche depuis le 2026-09-09. Mais un plan dit ce
 * qui VA sortir, et avec quel budget - c'est ce qui permet de preparer un
 * dossier avant que l'avis ne paraisse. D'ou un onglet a part.
 *
 * MESURE DU 2026-09-14. La page publique est une application Angular vide
 * cote serveur ; son code appelle une API publique, sans authentification :
 *
 *   GET .../portail/plandepassations/autorites?page=N&size=100
 *       -> 284 autorites
 *   GET .../portail/plandepassations/<id>/realisations?page=0&size=100
 *       -> les lignes du plan de cette autorite, ~57 en moyenne
 *
 * Sur 25 autorites tirees : 1 156 lignes, dont 110 au lancement encore a
 * venir, TOUTES avec un budget estime. Extrapole : ~1 250 lancements a
 * venir, et ~355 s pour tout parcourir a 1,25 s la requete.
 *
 * TROIS CONSEQUENCES, QUI FONT LA FORME DE CE FICHIER.
 *
 * 1. PAS EN UNE FOIS. 355 s depasse ce qu'une execution peut consacrer a
 *    une tache annexe. On lit PLANS_AUTORITES_PAR_PASSAGE autorites, et on
 *    reprend a la suivante au passage d'apres - le meme mecanisme que la
 *    reprise des sources, avec sa propre memoire. L'onglet se complete en
 *    deux ou trois jours, puis se tient a jour.
 * 2. LE FILTRE DE DATE EST CHEZ NOUS. L'API accepte un parametre
 *    startedAt dans son code, mais l'ignore cote serveur : mesure, meme
 *    reponse avec ou sans. On trie donc a la lecture.
 * 3. ON FUSIONNE, ON NE REMPLACE PAS. Chaque passage n'a vu qu'une
 *    tranche : l'onglet garde ce que les passages precedents ont lu, met a
 *    jour par reference ce que celui-ci apporte, et retire ce dont le
 *    lancement est passe.
 */
var PLANS_API = 'https://api.marches-publics.bj/v2/api/portail/plandepassations';
/** La page publique des plans : le lien des lignes du portail beninois. */
var PLANS_PAGE_DNCMP = 'https://www.marches-publics.bj/plan-de-passation';
var CLE_REPRISE_PLANS = 'TENDERPILOT_REPRISE_PLANS';

/**
 * Temps maximum consacre aux plans dans une execution.
 *
 * La collecte des sources prend jusqu'a quatre minutes, et Google arrete
 * tout a six. Les plans passent en dernier, sur ce qui reste : une minute
 * laisse la marge des ecritures.
 */
var PLANS_BUDGET_MS = 60 * 1000;

/** Colonnes de l'onglet, dans l'ordre de SCHEMA.PLANS. */
var CLES_PLANS = ['reference', 'source', 'autorite', 'objet', 'type', 'mode',
                  'montant', 'lancement', 'demarrage', 'bailleur', 'annee',
                  'lien'];

/**
 * Une ligne de plan de l'API, en rangee - ou null si elle ne sert a rien.
 *
 * Ecartee : une ligne marquee non utilisable, sans reference ou sans objet,
 * et surtout une ligne dont le lancement est passe. Elle est devenue un
 * appel d'offres - que la collecte des sources ramene deja - ou elle n'aura
 * pas lieu. Dans les deux cas elle n'annonce plus rien.
 */
function lignePlan_(l, autorite, aujourdhui) {
  if (!l || l.utilisable === 0) return null;
  var lancement = isoDepuis_(l.datelancement);
  if (!lancement || lancement < aujourdhui) return null;

  var objet = stripTags(reparerCaracteres(String(l.libelle || '')))
    .replace(/\s+/g, ' ').trim();
  var reference = String(l.reference || '').trim();
  if (!objet || !reference) return null;

  var mode = l.modepassation_ID || {};
  var type = l.typeMarche || {};
  var bailleur = l.typesBailleurs || {};
  var plan = l.plan || {};

  return {
    reference: reference,
    source: 'BJ-DNCMP',
    lien: PLANS_PAGE_DNCMP,
    autorite: reparerCaracteres(String(autorite || ''))
      .replace(/\s*\n\s*/g, ' ').trim(),
    objet: objet,
    type: String(type.libelle || '').trim(),
    mode: String(mode.description || mode.code || '').trim(),
    // L'estimation du plan, telle qu'ecrite. Jamais devinee.
    montant: formaterMontant(l.montantEstime),
    lancement: lancement,
    demarrage: isoDepuis_(l.datedemarrage) || '',
    bailleur: String(bailleur.libelle || '').trim(),
    annee: plan.annee ? String(plan.annee) : ''
  };
}

/** Les lignes utiles d'une reponse deja decodee. */
function lignesDepuisDonnees_(donnees, autorite, aujourdhui) {
  var items = donnees && donnees.content;
  if (!items || !items.length) return [];
  return items.map(function (l) { return lignePlan_(l, autorite, aujourdhui); })
    .filter(function (x) { return x; });
}

/** Les lignes utiles d'une reponse brute. Sert aux tests, et au jumeau web. */
function analyserLignesPlan(corps, autorite, aujourdhui) {
  var donnees;
  try {
    donnees = JSON.parse(corps);
  } catch (e) {
    return [];
  }
  return lignesDepuisDonnees_(donnees, autorite, aujourdhui);
}

/**
 * Ce qui est deja dans l'onglet, plus ce que ce passage apporte.
 *
 * Par REFERENCE : une ligne relue remplace son ancienne version - le budget
 * ou la date ont pu bouger. Ce qui a ete lu aux passages precedents reste,
 * sauf si son lancement est passe entre-temps. Trie par lancement : le plus
 * proche en haut, parce que c'est celui qu'il faut preparer maintenant.
 */
function fusionnerPlans_(existantes, nouvelles, aujourdhui, sourcesRelues) {
  var relues = {};
  (sourcesRelues || []).forEach(function (s) { relues[s] = true; });
  var parReference = {};
  (existantes || []).forEach(function (r) {
    if (!r || !r.reference) return;
    // Une source relue EN ENTIER se remplace : un calendrier retire du site
    // doit disparaitre de l'onglet.
    if (r.source && relues[r.source]) return;
    // Un lancement passe s'en va. Une ligne sans lancement n'a de sens que
    // pour un calendrier, qui porte toujours sa source.
    if (r.lancement ? r.lancement < aujourdhui : !r.source) return;
    parReference[r.reference] = r;
  });
  (nouvelles || []).forEach(function (r) {
    if (r && r.reference) parReference[r.reference] = r;
  });
  return Object.keys(parReference).map(function (k) { return parReference[k]; })
    .sort(function (a, b) {
      // Les lancements dates d'abord, le plus proche en haut ; les
      // calendriers, sans date, ensuite.
      if (!a.lancement !== !b.lancement) return a.lancement ? -1 : 1;
      if (a.lancement !== b.lancement) return a.lancement < b.lancement ? -1 : 1;
      return a.reference < b.reference ? -1 : a.reference > b.reference ? 1 : 0;
    });
}

/**
 * Les annonces d'une source PLANS:, en lignes de plan.
 *
 * Un calendrier n'a pas de date de lancement : la colonne reste vide, et la
 * ligne se range apres les lancements dates. Sa reference derive de son
 * lien - stable d'un passage a l'autre, c'est ce qui permet la fusion.
 */
function plansDepuisAnnonces_(annonces, source) {
  var vues = {};
  var lignes = [];
  (annonces || []).forEach(function (o) {
    var lien = String((o && o.url) || '').trim();
    if (!o || !o.title || !lien) return;
    var bout = lien.replace(/[?#].*$/, '').replace(/\/+$/, '').split('/').pop();
    var reference = source.id + '-' + bout;
    if (vues[reference]) return;
    vues[reference] = true;
    lignes.push({
      reference: reference, source: source.id,
      autorite: o.org || source.name, objet: o.title, type: 'Calendrier',
      mode: '', montant: '', lancement: o.deadline || '', demarrage: '',
      bailleur: '', annee: '', lien: lien
    });
  });
  return lignes;
}

/**
 * Lit les sources PLANS: actives et rend leurs lignes, avec la liste des
 * sources relues en entier. Une source en panne ou vide n'est PAS relue :
 * ses lignes des passages precedents restent dans l'onglet.
 */
function collecterSourcesDePlans_() {
  var bilan = { lignes: [], relues: [] };
  var sources;
  try {
    sources = lireSources();
  } catch (e) {
    return bilan;
  }
  sources.forEach(function (s) {
    if (!estVrai(s.active) || !estMethodePlans(s.method)) return;
    var cle = String(s.method).trim().replace(/^PLANS:/i, '').trim();
    var analyseur = analyseurHtml_('HTML:' + cle) || analyseurJson_('JSON:' + cle);
    if (!analyseur || estVide(s.url)) {
      majSource_(s, 'ERREUR');
      logEvent(s.id, 'Plans', 'ERROR', 'Aucun analyseur pour ' + s.method + '.');
      return;
    }
    try {
      var reponse = UrlFetchApp.fetch(String(s.url).trim(), {
        muteHttpExceptions: true,
        followRedirects: true,
        headers: { 'User-Agent': AGENT_UTILISATEUR }
      });
      var code = reponse.getResponseCode();
      if (code !== 200) throw new Error('HTTP ' + code);
      var lignes = plansDepuisAnnonces_(analyseur(corpsReponse_(reponse), s), s);
      bilan.lignes = bilan.lignes.concat(lignes);
      if (lignes.length) bilan.relues.push(s.id);
      majSource_(s, lignes.length ? 'OK' : 'RIEN LU');
      logEvent(s.id, 'Plans', lignes.length ? 'SUCCESS' : 'INFO',
               lignes.length + ' calendrier(s) pour ' + SCHEMA.SHEETS.plans + '.');
    } catch (e) {
      majSource_(s, 'ERREUR');
      logEvent(s.id, 'Plans', 'ERROR', e.message);
    }
  });
  ecrireStatutsSources_();
  return bilan;
}

/**
 * Des valeurs de l'onglet en lignes de plan, colonne par colonne SELON
 * L'EN-TETE, jamais selon le rang. Un onglet cree avant les colonnes Source
 * et Lien se relit donc sans que ses montants glissent dans les dates.
 */
function rangeesPlans_(entetes, valeurs) {
  var index = {};
  (entetes || []).forEach(function (nom, i) { index[String(nom).trim()] = i; });
  return (valeurs || []).map(function (v) {
    var r = {};
    CLES_PLANS.forEach(function (cle, i) {
      var j = index[SCHEMA.PLANS[i]];
      var x = j === undefined ? '' : v[j];
      r[cle] = x instanceof Date ? jour(x)
        : String(x === null || x === undefined ? '' : x).trim();
    });
    return r;
  }).filter(function (r) { return r.reference; });
}

/** Rang de l'autorite par laquelle reprendre, ou 0. Jamais bloquant. */
function rangPlans_(total) {
  try {
    var n = parseInt(PropertiesService.getScriptProperties()
      .getProperty(CLE_REPRISE_PLANS), 10);
    return isFinite(n) && n > 0 && n < total ? n : 0;
  } catch (e) {
    return 0;
  }
}

function noterRangPlans_(rang) {
  try {
    PropertiesService.getScriptProperties()
      .setProperty(CLE_REPRISE_PLANS, String(rang));
  } catch (e) {
    // Sans memoire, on repartira du debut : degrade, pas en panne.
  }
}

/** Une reponse JSON du portail, ou une erreur explicite. */
function obtenirJsonPortail_(url) {
  var reponse = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    followRedirects: true,
    headers: { 'User-Agent': AGENT_UTILISATEUR, 'Accept': 'application/json' }
  });
  var code = reponse.getResponseCode();
  if (code !== 200) throw new Error('HTTP ' + code);
  return JSON.parse(reponse.getContentText('UTF-8'));
}

/** Toutes les autorites qui publient un plan : trois requetes pour 284. */
function lireAutoritesPlans_() {
  var autorites = [];
  for (var page = 0; page < 10; page++) {
    var d = obtenirJsonPortail_(PLANS_API + '/autorites?page=' + page
                                + '&size=100&search=');
    (d.content || []).forEach(function (a) {
      if (a && a.id) autorites.push({ id: a.id, nom: String(a.denomination || '') });
    });
    if (d.last !== false) break;
  }
  return autorites;
}

/**
 * L'onglet des plans, cree s'il manque.
 *
 * UN CLASSEUR EN SERVICE N'A PAS CET ONGLET. Recoller Plans.gs apporte le
 * code, pas l'onglet - la meme lecon que completerConfig_ le 2026-09-09 pour
 * les reglages : ce que le script doit poser dans le classeur doit pouvoir
 * arriver sans reimporter le fichier. Sans creation, la collecte des plans
 * ne ferait rien, en silence, chez tous les clients deja equipes.
 *
 * On n'arrive ici que si COLLECTER_PLANS est actif : un client qui a coupe
 * les plans ne voit pas apparaitre un onglet vide.
 */
function feuillePlans_() {
  var classeur = SpreadsheetApp.getActive();
  var feuille = classeur.getSheetByName(SCHEMA.SHEETS.plans);
  if (feuille) {
    // UN ONGLET CREE AVANT LA MISE EN FORME la recoit, une seule fois : son
    // en-tete n'a pas encore la couleur du classeur. Une lecture par passage.
    if (String(feuille.getRange(1, 1).getBackground()).toLowerCase()
        !== COULEUR_ENTETE_PLANS) {
      mettreEnFormePlans_(feuille);
    }
    return feuille;
  }

  feuille = classeur.insertSheet(SCHEMA.SHEETS.plans);
  feuille.getRange(1, 1, 1, SCHEMA.PLANS.length).setValues([SCHEMA.PLANS]);
  mettreEnFormePlans_(feuille);
  logEvent('BJ-PLANS', 'Plans', 'SUCCESS',
           'Onglet ' + SCHEMA.SHEETS.plans + ' cree : ce classeur ne l avait '
           + 'pas encore. Il se remplira par tranches d autorites, au fil des '
           + 'executions.');
  return feuille;
}

/**
 * L'apparence de l'onglet des plans : celle des autres onglets du classeur.
 *
 * Mesure du 2026-09-15 sur le classeur maitre : l'onglet cree par le script
 * n'avait qu'un en-tete en gras et des colonnes de cent pixels. L'autorite et
 * l'objet - les deux colonnes qu'on lit - etaient coupes au premier mot. Les
 * largeurs sont celles de builders/toolkit.py, converties en pixels.
 */
var COULEUR_ENTETE_PLANS = '#1f3a5f';
var LARGEURS_PLANS = {
  Reference: 120, Source: 105, Autorite: 240, Objet: 420, Type: 130,
  Mode: 210, Montant_Estime: 120, Lancement_Prevu: 115, Demarrage_Prevu: 115,
  Bailleur: 160, Annee: 60, Lien: 210, Derniere_MAJ: 125
};

function mettreEnFormePlans_(feuille) {
  feuille.getRange(1, 1, 1, SCHEMA.PLANS.length)
    .setFontWeight('bold').setFontColor('#ffffff')
    .setBackground(COULEUR_ENTETE_PLANS)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  feuille.setRowHeight(1, 34);
  SCHEMA.PLANS.forEach(function (nom, i) {
    feuille.setColumnWidth(i + 1, LARGEURS_PLANS[nom] || 110);
  });
  feuille.setFrozenRows(1);
}

/** L'onglet des plans, lu en rangees ; null s'il est impossible a ouvrir. */
function lirePlans_() {
  var feuille;
  try {
    feuille = feuillePlans_();
  } catch (e) {
    return null;
  }
  if (!feuille) return null;
  var dernier = feuille.getLastRow();
  if (dernier < 2) return [];
  var largeur = Math.max(1, feuille.getLastColumn());
  return rangeesPlans_(feuille.getRange(1, 1, 1, largeur).getValues()[0],
                       feuille.getRange(2, 1, dernier - 1, largeur).getValues());
}

/** Reecrit l'onglet en une seule operation. */
function ecrirePlans_(rangees) {
  var feuille = SpreadsheetApp.getActive().getSheetByName(SCHEMA.SHEETS.plans);
  if (!feuille) return 0;
  var largeur = SCHEMA.PLANS.length;
  var dernier = feuille.getLastRow();
  if (dernier >= 2) {
    feuille.getRange(2, 1, dernier - 1,
                     Math.max(largeur, feuille.getLastColumn())).clearContent();
  }
  // L'EN-TETE EST REECRIT A CHAQUE FOIS : c'est ce qui fait arriver les
  // colonnes Source et Lien dans un onglet cree avant elles, sans rien
  // demander au client. Les lignes sont reecrites en entier juste apres.
  feuille.getRange(1, 1, 1, largeur).setValues([SCHEMA.PLANS]);
  if (!rangees.length) return 0;
  var maj = maintenant_();
  var valeurs = rangees.map(function (r) {
    return CLES_PLANS.map(function (cle) { return r[cle] || ''; }).concat([maj]);
  });
  feuille.getRange(2, 1, valeurs.length, largeur).setValues(valeurs);
  return valeurs.length;
}

/**
 * Une tranche d'autorites, lue et fusionnee dans l'onglet.
 *
 * N'echoue jamais l'execution : les plans sont un complement, la collecte
 * des opportunites est deja enregistree quand on arrive ici.
 */
function collecterPlans_(config) {
  var reglages = config || {};
  if (!estVrai(reglages.COLLECTER_PLANS)) return 0;

  var existantes = lirePlans_();
  // Onglet ni trouve ni creable : rien a faire, et rien ne tombe.
  if (existantes === null) return 0;

  var debut = new Date().getTime();
  // LES PLANS PRENNENT CE QUI RESTE, jamais plus que leur minute. Ils
  // passent en dernier : s'ils debordaient, c'est tout le journal du
  // passage qui serait perdu. Voir LIMITE_EXECUTION_MS dans Run.gs.
  var budget = PLANS_BUDGET_MS;
  if (typeof tempsRestantMs_ === 'function') {
    budget = Math.min(budget, tempsRestantMs_() - 15 * 1000);
    if (budget < 10 * 1000) {
      logEvent('BJ-PLANS', 'Plans', 'INFO',
               'Plans reportes au prochain passage : temps d execution '
               + 'presque epuise.');
      return 0;
    }
  }
  var aujourdhui = aujourdhui_();
  var parPassage = Number(reglages.PLANS_AUTORITES_PAR_PASSAGE);
  if (!isFinite(parPassage) || parPassage <= 0) parPassage = 30;

  // LES CALENDRIERS D'ABORD : une requete par source PLANS:, et une panne
  // du portail beninois ne doit pas les priver de leur place.
  var calendriers = collecterSourcesDePlans_();
  var nouvelles = calendriers.lignes;

  var autorites = [];
  try {
    autorites = lireAutoritesPlans_();
  } catch (e) {
    logEvent('BJ-PLANS', 'Plans', 'ERROR',
             'Liste des autorites illisible : ' + e.message);
  }

  var depart = rangPlans_(autorites.length);
  var lancements = 0;
  var visitees = 0;
  var echecs = 0;

  for (var k = 0; k < Math.min(parPassage, autorites.length); k++) {
    if (k > 0 && new Date().getTime() - debut > budget) break;
    var autorite = autorites[(depart + k) % autorites.length];
    try {
      // Une autorite porte ~57 lignes : une page de 100 suffit presque
      // toujours, trois au plus pour les plus gros plans.
      for (var page = 0; page < 3; page++) {
        var d = obtenirJsonPortail_(PLANS_API + '/' + autorite.id
          + '/realisations?page=' + page + '&size=100&search=');
        var lues = lignesDepuisDonnees_(d, autorite.nom, aujourdhui);
        lancements += lues.length;
        nouvelles = nouvelles.concat(lues);
        if (d.last !== false) break;
      }
    } catch (e) {
      echecs++;
    }
    visitees++;
  }

  if (autorites.length) noterRangPlans_((depart + visitees) % autorites.length);

  var ecrites = ecrirePlans_(fusionnerPlans_(existantes, nouvelles, aujourdhui,
                                             calendriers.relues));
  if (autorites.length) {
    logEvent('BJ-PLANS', 'Plans', echecs && !lancements ? 'ERROR' : 'SUCCESS',
             visitees + ' autorite(s) lue(s) sur ' + autorites.length + ', '
             + lancements + ' lancement(s) a venir, ' + ecrites
             + ' ligne(s) dans ' + SCHEMA.SHEETS.plans
             + (echecs ? ', ' + echecs + ' autorite(s) en echec' : '') + '.');
  }
  return ecrites;
}

if (typeof module !== 'undefined') {
  module.exports = {
    lignePlan_: lignePlan_, analyserLignesPlan: analyserLignesPlan,
    fusionnerPlans_: fusionnerPlans_, collecterPlans_: collecterPlans_,
    feuillePlans_: feuillePlans_, plansDepuisAnnonces_: plansDepuisAnnonces_,
    rangeesPlans_: rangeesPlans_,
    CLES_PLANS: CLES_PLANS
  };
}
