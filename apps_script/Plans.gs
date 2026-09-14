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
var CLES_PLANS = ['reference', 'autorite', 'objet', 'type', 'mode', 'montant',
                  'lancement', 'demarrage', 'bailleur', 'annee'];

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
function fusionnerPlans_(existantes, nouvelles, aujourdhui) {
  var parReference = {};
  (existantes || []).forEach(function (r) {
    if (!r || !r.reference) return;
    if (!r.lancement || r.lancement < aujourdhui) return;
    parReference[r.reference] = r;
  });
  (nouvelles || []).forEach(function (r) {
    if (r && r.reference) parReference[r.reference] = r;
  });
  return Object.keys(parReference).map(function (k) { return parReference[k]; })
    .sort(function (a, b) {
      if (a.lancement !== b.lancement) return a.lancement < b.lancement ? -1 : 1;
      return a.reference < b.reference ? -1 : a.reference > b.reference ? 1 : 0;
    });
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

/** L'onglet des plans, lu en rangees ; null s'il n'existe pas. */
function lirePlans_() {
  var feuille = SpreadsheetApp.getActive().getSheetByName(SCHEMA.SHEETS.plans);
  if (!feuille) return null;
  var dernier = feuille.getLastRow();
  if (dernier < 2) return [];
  return feuille.getRange(2, 1, dernier - 1, CLES_PLANS.length).getValues()
    .map(function (v) {
      var r = {};
      CLES_PLANS.forEach(function (cle, i) {
        var x = v[i];
        r[cle] = x instanceof Date ? jour(x)
          : String(x === null || x === undefined ? '' : x).trim();
      });
      return r;
    })
    .filter(function (r) { return r.reference; });
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
  // Classeur d'avant la fonctionnalite : pas d'onglet, rien a faire.
  if (existantes === null) return 0;

  var debut = new Date().getTime();
  var aujourdhui = aujourdhui_();
  var parPassage = Number(reglages.PLANS_AUTORITES_PAR_PASSAGE);
  if (!isFinite(parPassage) || parPassage <= 0) parPassage = 30;

  var autorites;
  try {
    autorites = lireAutoritesPlans_();
  } catch (e) {
    logEvent('BJ-PLANS', 'Plans', 'ERROR',
             'Liste des autorites illisible : ' + e.message);
    return 0;
  }
  if (!autorites.length) return 0;

  var depart = rangPlans_(autorites.length);
  var nouvelles = [];
  var visitees = 0;
  var echecs = 0;

  for (var k = 0; k < Math.min(parPassage, autorites.length); k++) {
    if (k > 0 && new Date().getTime() - debut > PLANS_BUDGET_MS) break;
    var autorite = autorites[(depart + k) % autorites.length];
    try {
      // Une autorite porte ~57 lignes : une page de 100 suffit presque
      // toujours, trois au plus pour les plus gros plans.
      for (var page = 0; page < 3; page++) {
        var d = obtenirJsonPortail_(PLANS_API + '/' + autorite.id
          + '/realisations?page=' + page + '&size=100&search=');
        nouvelles = nouvelles.concat(
          lignesDepuisDonnees_(d, autorite.nom, aujourdhui));
        if (d.last !== false) break;
      }
    } catch (e) {
      echecs++;
    }
    visitees++;
  }

  noterRangPlans_((depart + visitees) % autorites.length);

  var ecrites = ecrirePlans_(fusionnerPlans_(existantes, nouvelles, aujourdhui));
  logEvent('BJ-PLANS', 'Plans', echecs && !nouvelles.length ? 'ERROR' : 'SUCCESS',
           visitees + ' autorite(s) lue(s) sur ' + autorites.length + ', '
           + nouvelles.length + ' lancement(s) a venir, ' + ecrites
           + ' ligne(s) dans ' + SCHEMA.SHEETS.plans
           + (echecs ? ', ' + echecs + ' autorite(s) en echec' : '') + '.');
  return ecrites;
}

if (typeof module !== 'undefined') {
  module.exports = {
    lignePlan_: lignePlan_, analyserLignesPlan: analyserLignesPlan,
    fusionnerPlans_: fusionnerPlans_, collecterPlans_: collecterPlans_,
    CLES_PLANS: CLES_PLANS
  };
}
