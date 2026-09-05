/**
 * Les echeances suivies, posees dans Google Agenda.
 *
 * POURQUOI CE CANAL EST DIFFERENT DES AUTRES. Un email, un message
 * Telegram, une notification push : trois facons d'interrompre quelqu'un.
 * L'agenda ne l'interrompt pas, il ORGANISE - la date limite apparait dans
 * le calendrier du telephone, a sa place, des semaines a l'avance, et
 * Google se charge des rappels. Pour un produit dont la promesse est "ne
 * ratez pas une date", c'est le canal le plus proche de la promesse.
 *
 * ET SURTOUT : ON NE POSE PAS TOUT.
 *
 * Le classeur ramene des centaines d'avis. Les verser tous dans l'agenda
 * du client le rendrait inutilisable en une semaine - c'est exactement le
 * contraire du service rendu. Seules entrent les lignes dont la colonne
 * SUIVI porte OUI : les avis auxquels le client a decide de repondre.
 *
 * C'est la SEULE colonne que le client remplit. Tout le reste du classeur
 * est ecrit par le script ; celle-la est sa decision, et elle commande son
 * agenda.
 *
 * Une echeance posee ne l'est jamais deux fois : la colonne Agenda garde
 * l'identifiant de l'evenement. La vider fait reposer l'evenement, et
 * decocher SUIVI le retire.
 *
 * PAS DE JUMEAU DANS LE MOTEUR WEB, ET C'EST VOULU. CalendarApp agit sur
 * le compte Google du proprietaire du classeur, qui est aussi le
 * destinataire. Le produit web a sa propre base et aucun compte Google :
 * un jumeau demanderait un consentement OAuth que ce produit ne demande
 * pas. La regle de parite vise les ANALYSEURS - ce qui lit une source -
 * pas les transports.
 */

/** Le canal est-il utilisable ? */
function agendaActif_(config) {
  return estVrai(config.SEND_AGENDA);
}

/**
 * Les jours de rappel, lus dans la configuration.
 *
 * "7, 1" veut dire une semaine avant et la veille. Vide veut dire aucun
 * rappel : l'evenement est pose, sans alerte. Une valeur illisible est
 * ignoree plutot que de faire echouer la pose.
 */
function rappelsAgenda_(config) {
  return String(config.AGENDA_RAPPELS_JOURS || '').split(',')
    .map(function (v) { return parseInt(String(v).trim(), 10); })
    .filter(function (n) { return isFinite(n) && n >= 0 && n <= 28; });
}

/** L'agenda vise, ou l'agenda principal quand rien n'est precise. */
function agendaCible_(config) {
  var id = String(config.AGENDA_ID || '').trim();
  return id ? CalendarApp.getCalendarById(id)
            : CalendarApp.getDefaultCalendar();
}

/** Le texte de l'evenement : le strict necessaire, et le lien. */
function descriptionAgenda_(ligne) {
  var bouts = [];
  if (ligne.org) bouts.push(String(ligne.org));
  if (ligne.country) bouts.push(String(ligne.country));
  if (ligne.source) bouts.push('Source : ' + String(ligne.source));
  if (ligne.url) bouts.push(String(ligne.url));
  if (ligne.pdf) bouts.push('Dossier : ' + String(ligne.pdf));
  return bouts.join('\n');
}

/**
 * Pose dans l'agenda les echeances suivies qui n'y sont pas encore.
 *
 * Retourne le nombre d'evenements crees. N'echoue jamais l'execution : un
 * agenda indisponible ne doit pas empecher la collecte d'etre enregistree.
 */
function synchroniserAgenda_(lignes, config) {
  if (!agendaActif_(config)) return 0;

  var aPoser = (lignes || []).filter(function (l) {
    // Trois conditions, et les trois comptent : le client l'a choisie,
    // elle a une date, et elle n'est pas deja posee.
    return estSuivie_(l) && !estVide(l.deadline) && estVide(l.agenda);
  });
  if (!aPoser.length) return 0;

  var calendrier;
  try {
    calendrier = agendaCible_(config);
  } catch (e) {
    logEvent('', 'Agenda', 'ERROR', 'Agenda introuvable : ' + e.message);
    return 0;
  }
  if (!calendrier) {
    logEvent('', 'Agenda', 'ERROR',
             'Aucun agenda accessible. Verifiez AGENDA_ID.');
    return 0;
  }

  var rappels = rappelsAgenda_(config);
  var poses = 0;

  aPoser.forEach(function (ligne) {
    try {
      var d = jour(ligne.deadline).split('-').map(Number);
      // Un evenement d'une journee entiere : une date limite n'a pas
      // d'heure utile, et un evenement horaire se perd dans la grille.
      var evenement = calendrier.createAllDayEvent(
        'Echeance : ' + String(ligne.title || '').slice(0, 120),
        new Date(d[0], d[1] - 1, d[2]),
        { description: descriptionAgenda_(ligne) });

      rappels.forEach(function (n) {
        // Google compte les rappels en MINUTES avant l'evenement.
        evenement.addPopupReminder(n * 24 * 60);
      });

      majLigne_(ligne, { agenda: evenement.getId() });
      poses++;
    } catch (e) {
      logEvent(ligne.source, 'Agenda', 'ERROR',
               'Echeance non posee (' + String(ligne.id) + ') : ' + e.message);
    }
  });

  if (poses) {
    logEvent('', 'Agenda', 'SUCCESS',
             poses + ' echeance(s) posee(s) dans l agenda.');
  }
  return poses;
}

/**
 * Menu > Tester l'agenda.
 *
 * Ne pose rien : dit seulement ce que le prochain passage ferait. Un test
 * qui ecrit dans l'agenda du client sans qu'il l'ait demande serait un
 * mauvais test.
 */
function testerAgenda() {
  var config = lireConfig();
  if (!agendaActif_(config)) {
    SpreadsheetApp.getActive().toast(
      'Mettez SEND_AGENDA a true dans CONFIG.', 'Agenda', 8);
    return;
  }
  try {
    var calendrier = agendaCible_(config);
    var lignes = lireOpportunites();
    var suivies = lignes.filter(function (l) {
      return estSuivie_(l) && !estVide(l.deadline);
    });
    var restantes = suivies.filter(function (l) { return estVide(l.agenda); });
    SpreadsheetApp.getActive().toast(
      'Agenda "' + calendrier.getName() + '" accessible. '
      + suivies.length + ' echeance(s) suivie(s), dont ' + restantes.length
      + ' a poser au prochain passage.', 'Agenda', 10);
  } catch (e) {
    SpreadsheetApp.getActive().toast(e.message, 'Agenda', 10);
  }
}

if (typeof module !== 'undefined') {
  module.exports = {
    agendaActif_: agendaActif_,
    rappelsAgenda_: rappelsAgenda_, synchroniserAgenda_: synchroniserAgenda_,
    descriptionAgenda_: descriptionAgenda_
  };
}
