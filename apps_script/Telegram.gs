/**
 * TenderPilot - notifications Telegram.
 *
 * Second canal, a cote des emails. Un email se perd dans une boite deja
 * pleine ; une notification Telegram arrive sur le telephone, et pour une
 * echeance a vingt-quatre heures cela change tout.
 *
 * Ce fichier ne decide rien : quoi envoyer et quand est calcule par
 * notificationsAEnvoyer() dans Core.gs, exactement comme pour les emails.
 * Ici on redige le texte et on le poste.
 *
 * Il touche au reseau mais pas au classeur : la mise en forme des messages
 * est donc testable hors de Google.
 */

/** Limite d'un message Telegram. Au-dela, l'API refuse tout le message. */
var TELEGRAM_MAX = 4096;

/** Intitules, par type de notification. */
var TELEGRAM_ENTETES = {
  'new': 'Nouvelle opportunite',
  'j7': 'Echeance dans 7 jours',
  'j3': 'URGENT - echeance proche',
  'j1': 'DERNIER RAPPEL - echeance demain',
  'expired': 'Opportunite expiree'
};

/**
 * Telegram interprete le HTML : un titre contenant "<" ou "&" casserait le
 * message, ou pire, serait pris pour du balisage.
 */
function echapperTelegram_(texte) {
  return String(texte === null || texte === undefined ? '' : texte)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Message Telegram pour une opportunite.
 *
 * Beaucoup plus court que l'email, et c'est voulu : on le lit sur un
 * telephone, souvent debout. Le titre, l'echeance, le lien. Le detail est a
 * un clic, sur la source officielle.
 */
function messageTelegram(type, o) {
  var lignes = ['<b>' + echapperTelegram_(TELEGRAM_ENTETES[type] || type)
                + '</b>', echapperTelegram_(o.title)];

  var infos = [];
  if (o.org) infos.push(echapperTelegram_(o.org));
  if (o.country) infos.push(echapperTelegram_(o.country));
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
    lignes.push('Echeance : ' + echapperTelegram_(jour(o.deadline)) + compte);
  } else {
    lignes.push('Echeance : a verifier sur la source');
  }

  if (o.url) lignes.push(echapperTelegram_(o.url));
  return lignes.join('\n');
}

/** Message groupe, quand la collecte rapporte beaucoup d'un coup. */
function messageTelegramDigest(nouvelles) {
  var lignes = ['<b>' + nouvelles.length + ' nouvelles opportunites</b>', ''];
  // Au-dela d'une dizaine de lignes on depasserait la limite de l'API : on
  // liste les premieres et on annonce le reste.
  var montrees = nouvelles.slice(0, 10);
  montrees.forEach(function (o, i) {
    var echeance = estVide(o.deadline) ? ''
      : ' - ' + echapperTelegram_(jour(o.deadline));
    lignes.push((i + 1) + '. ' + echapperTelegram_(o.title) + echeance);
  });
  if (nouvelles.length > montrees.length) {
    lignes.push('', '... et ' + (nouvelles.length - montrees.length)
                + ' autres.');
  }
  return lignes.join('\n');
}

/** Coupe plutot que de laisser l'API refuser tout le message. */
function tronquerTelegram_(texte) {
  var t = String(texte || '');
  return t.length <= TELEGRAM_MAX
    ? t
    : t.slice(0, TELEGRAM_MAX - 20).replace(/\s+$/, '') + '\n[...]';
}

/** Le canal est-il utilisable ? */
function telegramActif_(config) {
  return estVrai(config.SEND_TELEGRAM)
    && !estVide(config.TELEGRAM_TOKEN)
    && !estVide(config.TELEGRAM_CHAT_ID);
}

/**
 * Poste un message. Leve une erreur en cas d'echec, pour que l'appelant la
 * journalise.
 *
 * Le jeton ne figure que dans l'URL : il n'apparait jamais dans un message
 * d'erreur ni dans les journaux. Un jeton de bot dans un journal, c'est
 * quelqu'un qui peut ecrire a votre place.
 */
function envoyerTelegram_(config, texte) {
  var reponse = UrlFetchApp.fetch(
    'https://api.telegram.org/bot' + String(config.TELEGRAM_TOKEN).trim()
    + '/sendMessage',
    {
      method: 'post',
      contentType: 'application/json',
      muteHttpExceptions: true,
      payload: JSON.stringify({
        chat_id: String(config.TELEGRAM_CHAT_ID).trim(),
        text: tronquerTelegram_(texte),
        parse_mode: 'HTML',
        disable_web_page_preview: false
      })
    });

  var code = reponse.getResponseCode();
  if (code === 200) return;

  // Le corps porte la vraie cause ("chat not found", "bot was blocked").
  // Sans lui, un 400 ne dit rien d'exploitable.
  var cause = '';
  try {
    var corps = JSON.parse(reponse.getContentText());
    if (corps && corps.description) cause = ' - ' + corps.description;
  } catch (e) {
    // Reponse illisible : le code HTTP suffira.
  }
  throw new Error('Telegram HTTP ' + code + cause);
}

/**
 * Envoie un message de test.
 *
 * Appele depuis le menu, au moment ou l'utilisateur configure le canal :
 * c'est la qu'il peut encore corriger une faute de frappe.
 */
function testerTelegram() {
  var config = lireConfig();
  var ui = SpreadsheetApp.getUi();

  if (!telegramActif_(config)) {
    ui.alert(MENU,
      'Telegram n est pas configure.\n\n'
      + 'Dans l onglet CONFIG, renseignez :\n'
      + '  SEND_TELEGRAM = true\n'
      + '  TELEGRAM_TOKEN = le jeton donne par @BotFather\n'
      + '  TELEGRAM_CHAT_ID = l identifiant de votre salon',
      ui.ButtonSet.OK);
    return;
  }

  try {
    envoyerTelegram_(config,
      '<b>TenderPilot</b>\nCanal Telegram configure. '
      + 'Vous recevrez ici les alertes d echeance.');
    ui.alert(MENU, 'Message de test envoye. Verifiez votre salon Telegram.',
             ui.ButtonSet.OK);
  } catch (e) {
    ui.alert(MENU, 'Echec de l envoi :\n\n' + e.message, ui.ButtonSet.OK);
  }
}

if (typeof module !== 'undefined') {
  module.exports = {
    messageTelegram: messageTelegram,
    messageTelegramDigest: messageTelegramDigest,
    echapperTelegram_: echapperTelegram_,
    tronquerTelegram_: tronquerTelegram_,
    telegramActif_: telegramActif_,
    TELEGRAM_MAX: TELEGRAM_MAX
  };
}
