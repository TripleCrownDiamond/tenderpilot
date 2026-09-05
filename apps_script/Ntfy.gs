/**
 * Troisieme canal : ntfy.
 *
 * POURQUOI CELUI-LA. L'email demande une boite qu'on releve ; Telegram
 * demande un bot, un jeton, un salon. ntfy demande UN MOT. Le client
 * installe l'application, s'abonne a un sujet, colle ce sujet dans CONFIG,
 * et son telephone sonne. Aucun compte, aucune inscription, gratuit.
 *
 * VERIFIE LE 2026-09-04, par un aller-retour reel sur ntfy.sh : un POST
 * avec le texte en corps et les en-tetes Title / Priority / Tags / Click
 * rend 200, et le message se relit tel quel sur le sujet. Le contrat est
 * donc mesure, pas suppose.
 *
 * CE QUE LE CLIENT DOIT SAVOIR, ET QUI EST ECRIT DANS CONFIG. Sur le
 * serveur public, UN SUJET N'EST PAS UN SECRET : quiconque le devine lit
 * les alertes et peut en envoyer. D'ou la consigne de choisir un sujet
 * long. Les avis de marches sont publics - c'est le confort du client qui
 * est en jeu, pas sa confidentialite - mais il doit le savoir.
 */

/** Limite de corps d'un message ntfy. Au-dela, le serveur tronque. */
var NTFY_MAX = 4096;

/** Intitules, par type de notification. Jumeaux de ceux de Telegram. */
var NTFY_ENTETES = {
  new: 'Nouvelle opportunite',
  j7: 'Echeance dans 7 jours',
  j3: 'Echeance dans 3 jours',
  j1: 'Echeance demain',
  expired: 'Echeance depassee'
};

/**
 * Le rang d'urgence que porte la notification.
 *
 * ntfy sait faire sonner un telephone en mode silencieux avec la priorite
 * haute. On la reserve a ce qui la merite : un J-1 ou une echeance
 * depassee. Une nouveaute n'a pas a reveiller quelqu'un.
 */
var NTFY_PRIORITES = { new: '3', j7: '3', j3: '4', j1: '5', expired: '4' };

/**
 * Message ntfy pour une opportunite.
 *
 * Trois parties, parce que ntfy les affiche differemment : un TITRE gras
 * sur l'ecran verrouille, un CORPS en texte simple, et un LIEN que l'appui
 * sur la notification ouvre directement. Pas de balisage : ntfy affiche le
 * texte tel quel, contrairement a Telegram.
 */
function messageNtfy(type, o) {
  var lignes = [String(o.title || '')];

  var infos = [];
  if (o.org) infos.push(String(o.org));
  if (o.country) infos.push(String(o.country));
  if (infos.length) lignes.push(infos.join(' - '));

  if (!estVide(o.deadline)) {
    var reste = o.daysLeft;
    var compte = '';
    if (reste !== null && reste !== undefined && reste !== '') {
      reste = Number(reste);
      compte = reste < 0 ? ' (passee)'
        : reste === 0 ? " (aujourd'hui)"
        : ' (dans ' + reste + ' jour' + (reste > 1 ? 's' : '') + ')';
    }
    lignes.push('Echeance : ' + jour(o.deadline) + compte);
  } else {
    lignes.push('Echeance : a verifier sur la source');
  }

  return {
    titre: NTFY_ENTETES[type] || String(type),
    corps: lignes.join('\n'),
    lien: o.url ? String(o.url) : '',
    priorite: NTFY_PRIORITES[type] || '3'
  };
}

/** Message groupe, quand la collecte rapporte beaucoup d'un coup. */
function messageNtfyDigest(nouvelles) {
  var lignes = [];
  // Le plus pertinent d'abord : les cinq montrees doivent etre les cinq qui
  // comptent. Cinq et non dix - une notification push se lit d'un coup
  // d'oeil, pas comme un message de salon.
  var montrees = parPertinence_(nouvelles).slice(0, 5);
  montrees.forEach(function (o, i) {
    var echeance = estVide(o.deadline) ? '' : ' - ' + jour(o.deadline);
    lignes.push((i + 1) + '. ' + String(o.title || '') + echeance);
  });
  if (nouvelles.length > montrees.length) {
    lignes.push('... et ' + (nouvelles.length - montrees.length) + ' autres.');
  }
  return {
    titre: nouvelles.length + ' nouvelles opportunites',
    corps: lignes.join('\n'),
    lien: '',
    priorite: '3'
  };
}

/** Le canal est-il utilisable ? */
function ntfyActif_(config) {
  return estVrai(config.SEND_NTFY) && !estVide(config.NTFY_SUJET);
}

/** L'adresse du sujet, serveur par defaut compris. */
function adresseNtfy_(config) {
  var serveur = String(config.NTFY_SERVEUR || '').trim() || 'https://ntfy.sh';
  return serveur.replace(/\/+$/, '') + '/'
    + String(config.NTFY_SUJET).trim();
}

/** Coupe plutot que de laisser le serveur tronquer n'importe ou. */
function tronquerNtfy_(texte) {
  var t = String(texte || '');
  return t.length <= NTFY_MAX ? t
    : t.slice(0, NTFY_MAX - 20).replace(/\s+$/, '') + '\n[...]';
}

/**
 * Poste une notification. Leve une erreur en cas d'echec, pour que
 * l'appelant la journalise.
 *
 * Les en-tetes portent le titre et le lien parce que le CORPS d'une
 * requete ntfy est le texte du message, rien d'autre. Un accent dans le
 * titre casserait l'en-tete HTTP : ASCII seulement, comme partout ailleurs
 * dans ce depot.
 */
function envoyerNtfy_(config, message) {
  var entetes = {
    Title: message.titre,
    Priority: message.priorite || '3',
    Tags: 'loudspeaker'
  };
  // Un appui sur la notification ouvre l'avis, sans recopier le lien.
  if (message.lien) entetes.Click = message.lien;
  // Seulement si le client a un serveur qui le demande.
  if (!estVide(config.NTFY_JETON)) {
    entetes.Authorization = 'Bearer ' + String(config.NTFY_JETON).trim();
  }

  var reponse = UrlFetchApp.fetch(adresseNtfy_(config), {
    method: 'post',
    contentType: 'text/plain; charset=utf-8',
    muteHttpExceptions: true,
    headers: entetes,
    payload: tronquerNtfy_(message.corps)
  });

  var code = reponse.getResponseCode();
  if (code !== 200) {
    // Le jeton ne doit jamais atterrir dans le journal.
    throw new Error('ntfy HTTP ' + code + ' : '
      + String(reponse.getContentText() || '').slice(0, 200));
  }
}

/**
 * Menu > Tester la notification push.
 *
 * Le meme chemin que les vraies alertes : si ce test arrive, les alertes
 * arriveront.
 */
function testerNtfy() {
  var config = lireConfig();
  if (!ntfyActif_(config)) {
    SpreadsheetApp.getActive().toast(
      'Renseignez SEND_NTFY et NTFY_SUJET dans CONFIG.', 'ntfy', 8);
    return;
  }
  try {
    envoyerNtfy_(config, {
      titre: 'TenderPilot',
      corps: 'Test reussi : vos alertes arriveront ici.',
      lien: '',
      priorite: '3'
    });
    SpreadsheetApp.getActive().toast('Notification envoyee.', 'ntfy', 5);
    logEvent('', 'Test ntfy', 'SUCCESS', 'Notification de test envoyee.');
  } catch (e) {
    SpreadsheetApp.getActive().toast(e.message, 'ntfy', 10);
    logEvent('', 'Test ntfy', 'ERROR', e.message);
  }
}

if (typeof module !== 'undefined') {
  module.exports = {
    messageNtfy: messageNtfy, messageNtfyDigest: messageNtfyDigest,
    ntfyActif_: ntfyActif_, envoyerNtfy_: envoyerNtfy_,
    adresseNtfy_: adresseNtfy_, tronquerNtfy_: tronquerNtfy_
  };
}
