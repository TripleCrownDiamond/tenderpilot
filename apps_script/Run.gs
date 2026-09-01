/**
 * TenderPilot - enchainement complet.
 *
 *   SOURCES -> COLLECTE -> NORMALISATION -> DEDUPLICATION -> FEUILLE
 *           -> DEADLINES -> COULEURS -> EMAILS
 *
 * Une execution = un appel a executerTenderPilot(). Les deadlines et les
 * couleurs sont recalculees meme quand aucune nouvelle opportunite n'a ete
 * trouvee (section 25).
 */

var MENU = 'TenderPilot';
var DECLENCHEUR = 'executerTenderPilot';

function onOpen() {
  SpreadsheetApp.getUi().createMenu(MENU)
    .addItem('Executer maintenant', 'executerManuellement')
    .addSeparator()
    .addItem('Activer l execution automatique', 'installerDeclencheur')
    .addItem('Desactiver l execution automatique', 'retirerDeclencheur')
    .addSeparator()
    .addItem('Synchroniser les sources', 'synchroniserSources')
    .addItem('Tester la notification Telegram', 'testerTelegram')
    .addItem('Afficher / masquer l onglet SOURCES', 'basculerOngletSources')
    .addToUi();
}

// ---------------------------------------------------------------- COLLECTE

/**
 * Lit une source et renvoie ses annonces normalisees.
 *
 * Trois methodes sont supportees, de la plus solide a la plus fragile :
 *
 *   JSON:<nom>  une API publique. Contrat stable, champs structures.
 *   RSS         un flux standard. Stable, mais texte libre et pauvre.
 *   HTML:<nom>  une extraction de page. A n'utiliser qu'a defaut : casse
 *               le jour ou le site refait sa mise en page.
 *
 * Une source MANUAL est ignoree, c'est un choix explicite (sections 20 et
 * 21) : on ne se bat pas contre les sites qui exigent un login, un captcha
 * ou un navigateur automatise.
 */
function collectSource(source, config) {
  var methode = String(source.method || '').trim();
  var analyseur = analyseurJson_(methode) || analyseurHtml_(methode);

  // Une methode qui n'est ni RSS ni un analyseur connu = saisie manuelle.
  if (methode.toUpperCase() !== 'RSS' && !analyseur) {
    logEvent(source.id, 'Collecte', 'SKIPPED',
             'Methode ' + (methode || 'non definie') + ' : saisie manuelle.');
    return [];
  }
  if (estVide(source.url)) {
    logEvent(source.id, 'Collecte', 'SKIPPED', 'Aucune URL.');
    return [];
  }

  var reponse = UrlFetchApp.fetch(String(source.url).trim(), {
    muteHttpExceptions: true,
    followRedirects: true,
    validateHttpsCertificates: true
  });
  var code = reponse.getResponseCode();
  if (code !== 200) throw new Error('HTTP ' + code);

  var maximum = Number(config.MAX_ITEMS_PER_SOURCE) || 40;
  var corps = reponse.getContentText();

  // Collecte par API ou par extraction HTML, pour les sites sans flux.
  if (analyseur) {
    return retirerExpirees_(analyseur(corps, source), config)
      .slice(0, maximum);
  }

  // Collecte RSS, le cas general.
  var lues = parseFeedXml(corps)
    .map(function (item) {
      return normalizeOpportunity({
        title: item.title,
        url: item.link,
        summary: item.summary,
        published: item.published,
        deadline: item.deadline
      }, source);
    })
    .filter(function (o) { return o.title; });

  return retirerExpirees_(lues, config).slice(0, maximum);
}

/**
 * Ecarte les annonces dont l'echeance est deja passee.
 *
 * Les portails laissent des annees d'archives en ligne : sur les sources
 * beninoises, la grande majorite des annonces publiees ont une echeance
 * depassee. Les collecter donnerait un tableau de centaines de lignes
 * grises ou il faudrait chercher celles auxquelles on peut encore repondre.
 *
 * Le filtre ne s'applique qu'a l'ENTREE. Une opportunite deja suivie qui
 * arrive a echeance reste dans la feuille et passe simplement en EXPIRE :
 * effacer l'historique ferait perdre la trace des dossiers deposes.
 */
/**
 * Collecte une source en rendant compte de ce qu'elle a produit.
 *
 * Les deux nombres ne disent pas la meme chose :
 *
 *   lues = 0                l'analyseur n'a rien trouve : source CASSEE.
 *   lues > 0, annonces = 0  page lue, aucune echeance ouverte : source
 *                           FONCTIONNELLE, en periode creuse.
 *
 * Confondre les deux ferait desactiver des sources qui vont republier.
 */
function collectSourceDetail(source, config) {
  // Une seule recuperation reseau : on ne demande jamais deux fois la meme
  // page a un site qui limite deja son debit.
  var tout = collectSource(source, Object.assign({}, config,
                                                 { COLLECT_EXPIRED: 'true' }));
  if (estVrai(config.COLLECT_EXPIRED)) {
    return { lues: tout.length, annonces: tout };
  }
  return { lues: tout.length, annonces: retirerExpirees_(tout, config) };
}

function retirerExpirees_(annonces, config) {
  if (estVrai(config.COLLECT_EXPIRED)) return annonces;

  var jour = aujourdhui_();
  return annonces.filter(function (o) {
    var reste = joursRestants(o.deadline, jour);
    // Sans echeance lue, on garde : c'est a l'utilisateur d'aller voir.
    return reste === null || reste >= 0;
  });
}

/**
 * Parcourt toutes les sources actives.
 * Chaque source est isolee : une panne est journalisee et la suivante est
 * traitee normalement (section 22).
 */
function collectAllSources(config) {
  var trouvees = [];
  lireSources().forEach(function (source) {
    if (!estVrai(source.active)) {
      logEvent(source.id, 'Collecte', 'SKIPPED', 'Source desactivee.');
      return;
    }
    try {
      var bilan = collectSourceDetail(source, config);
      var annonces = bilan.annonces;
      trouvees = trouvees.concat(annonces);

      if (bilan.lues === 0) {
        // L'analyseur n'a rien trouve sur la page. Une source qui lisait
        // hier et ne lit plus aujourd'hui a change de mise en page.
        majSource_(source, 'RIEN LU');
        logEvent(source.id, 'Collecte', 'INFO',
                 'Aucune annonce lue : la page a peut-etre change de '
                 + 'structure.');
      } else if (!annonces.length) {
        // Page lue correctement, mais rien d'ouvert. Les portails publient
        // par a-coups : ce n'est pas une panne, c'est une periode creuse.
        majSource_(source, 'EN ATTENTE');
        logEvent(source.id, 'Collecte', 'INFO',
                 bilan.lues + ' annonce(s) lue(s), aucune encore ouverte.');
      } else {
        // Une source joignable mais silencieuse depuis des mois est
        // signalee : l'utilisateur doit savoir qu'un canal officiel ne
        // publie plus. C'est different d'une periode creuse.
        var dates = annonces.map(function (a) { return a.published; });
        var f = fraicheurSource_(dates, new Date());
        if (f.silencieuse) {
          majSource_(source, 'SILENCIEUSE depuis ' + f.jours + ' j');
          logEvent(source.id, 'Collecte', 'INFO',
                   annonces.length + ' annonce(s), mais rien de neuf depuis '
                   + f.jours + ' jours : source peut-etre abandonnee.');
        } else {
          majSource_(source, 'OK');
          logEvent(source.id, 'Collecte', 'SUCCESS',
                   annonces.length + ' annonce(s) retenue(s) sur '
                   + bilan.lues + '.');
        }
      }
    } catch (e) {
      majSource_(source, 'ERREUR');
      logEvent(source.id, 'Collecte', 'ERROR', e.message);
    }
  });
  return trouvees;
}

// ------------------------------------------------ DEDUPLICATION + ECRITURE

/**
 * Range les annonces collectees : nouvelles d'un cote, mises a jour de
 * l'autre - sections 7 et 8.
 */
function saveOrUpdateOpportunity(annonces, existantes) {
  var index = construireIndex(existantes);
  var nouvelles = [];
  var majFaites = 0;

  annonces.forEach(function (annonce) {
    var doublon = trouverDoublon(annonce, index);
    if (doublon) {
      var champs = champsModifies(doublon, annonce);
      if (Object.keys(champs).length) {
        majLigne_(doublon, champs);
        majFaites++;
        logEvent(annonce.source, 'Mise a jour', 'SUCCESS',
                 doublon.id + ' : ' + Object.keys(champs).join(', '));
      } else {
        logEvent(annonce.source, 'Doublon', 'DUPLICATE',
                 doublon.id + ' existe deja.');
      }
      return;
    }
    // Deux annonces identiques dans la meme execution ne doivent pas creer
    // deux lignes : on indexe au fur et a mesure.
    nouvelles.push(annonce);
    clesDedup(annonce).forEach(function (cle) {
      if (index[cle] === undefined) index[cle] = annonce;
    });
  });

  ajouterOpportunites_(nouvelles, existantes);
  return { nouvelles: nouvelles, misesAJour: majFaites };
}

// --------------------------------------------------------------- DEADLINES

/** Recalcule jours restants, statut et couleur - sections 9, 10 et 25. */
function updateDeadlines(lignes) {
  var jourCourant = aujourdhui_();
  lignes.forEach(function (ligne) {
    ligne.days = joursRestants(ligne.deadline, jourCourant);
    ligne.status = statutDelai(ligne.days);
  });
  ecrireDelais_(lignes);
  peindreLignes_(lignes);
  return lignes.length;
}

// ------------------------------------------------------------------ EMAILS

function sendEmail(destinataire, sujet, corps) {
  MailApp.sendEmail(destinataire, sujet, corps);
}

var RAPPEL = 'Consultez toujours la source officielle avant de candidater.';

function detail_(ligne) {
  var l = [];
  l.push('Titre : ' + ligne.title);
  if (ligne.org) l.push('Organisation : ' + ligne.org);
  if (ligne.country) l.push('Pays : ' + ligne.country);
  if (ligne.type) l.push('Type : ' + ligne.type);
  if (ligne.sector) l.push('Secteur : ' + ligne.sector);
  if (ligne.published) l.push('Date de publication : ' + ligne.published);
  l.push('Deadline : ' + (ligne.deadline || 'a verifier'));
  l.push('Jours restants : ' + (ligne.days === null || ligne.days === ''
    ? 'inconnu' : ligne.days));
  if (ligne.source) l.push('Source : ' + ligne.source);
  if (ligne.url) l.push('Lien officiel : ' + ligne.url);
  if (ligne.pdf) l.push('PDF : ' + ligne.pdf);
  if (ligne.summary) l.push('', 'Resume :', ligne.summary);
  return l.join('\n');
}

/** Sujet et corps d'une notification - sections 11 et 13 a 16. */
function messageNotification(type, ligne) {
  var t = ligne.title;
  if (type === 'new') {
    return {
      sujet: '[TenderPilot] Nouvelle opportunite - '
        + (ligne.org || 'source') + ' - ' + t,
      corps: 'Nouvelle opportunite detectee.\n\n' + detail_(ligne)
        + '\n\n' + RAPPEL
    };
  }
  if (type === 'j7') {
    return {
      sujet: '[TenderPilot] Deadline dans 7 jours - ' + t,
      corps: 'Cette opportunite arrive bientot a echeance.\n\n'
        + detail_(ligne) + '\n\n' + RAPPEL
    };
  }
  if (type === 'j3') {
    return {
      sujet: '[TenderPilot] URGENT - ' + ligne.days + ' jours restants - ' + t,
      corps: 'Il ne reste que ' + ligne.days + ' jour(s).\n\n'
        + detail_(ligne) + '\n\n' + RAPPEL
    };
  }
  if (type === 'j1') {
    return {
      sujet: '[TenderPilot] DERNIER RAPPEL - Deadline demain - ' + t,
      corps: 'Dernier rappel avant echeance.\n\n' + detail_(ligne)
        + '\n\n' + RAPPEL
    };
  }
  return {
    sujet: '[TenderPilot] Opportunite expiree - ' + t,
    corps: 'La deadline est passee.\n\nTitre : ' + t
      + (ligne.org ? '\nOrganisation : ' + ligne.org : '')
      + '\nDeadline : ' + ligne.deadline
  };
}

/** Email recapitulatif quand la collecte rapporte beaucoup - section 19. */
function messageDigest(nouvelles) {
  var lignes = ['Nouvelles opportunites detectees : ' + nouvelles.length, ''];
  nouvelles.forEach(function (o, i) {
    lignes.push((i + 1) + '. ' + o.title);
    lignes.push('   Organisation : ' + (o.org || '-')
      + ' | Pays : ' + (o.country || '-')
      + ' | Deadline : ' + (o.deadline || 'a verifier'));
    if (o.url) lignes.push('   ' + o.url);
    lignes.push('');
  });
  lignes.push(RAPPEL);
  return {
    sujet: '[TenderPilot] ' + nouvelles.length
      + ' nouvelles opportunites detectees',
    corps: lignes.join('\n')
  };
}

/**
 * Envoie ce qui doit l'etre, et marque tout ce qui est desormais sans objet
 * - sections 12 et 17. Une opportunite ne recoit jamais deux fois le meme
 * type d'email.
 */
/**
 * Liste de destinataires, separes par des virgules ou des points-virgules.
 * MailApp accepte une liste separee par des virgules : on normalise.
 */
function destinataires_(valeur) {
  return String(valeur || '')
    .split(/[;,]/)
    .map(function (a) { return a.trim(); })
    .filter(function (a) { return a.indexOf('@') > 0; })
    .join(',');
}

/**
 * Envoie ce qui doit l'etre, sur les canaux configures.
 *
 * Email et Telegram partagent les memes regles de declenchement - une
 * opportunite ne previent jamais deux fois par le meme canal - mais sont
 * envoyes independamment : si Telegram est en panne, les emails partent
 * quand meme, et l'inverse est vrai aussi.
 *
 * Le compte retourne est le nombre de MESSAGES partis, tous canaux
 * confondus : une alerte envoyee par les deux compte pour deux.
 */
function sendNotifications(lignes, config, nouvelles) {
  var destinataire = destinataires_(config.NOTIFICATION_EMAIL);
  var parEmail = Boolean(destinataire);
  var parTelegram = telegramActif_(config);

  if (!parEmail && !parTelegram) {
    logEvent('', 'Notifications', 'SKIPPED', 'Aucun canal configure.');
    return 0;
  }

  var seuilDigest = Number(config.DIGEST_THRESHOLD) || 5;
  var envoiGroupe = nouvelles.length > seuilDigest
    && estVrai(config.SEND_NEW_OPPORTUNITY);
  var envoyes = 0;

  /** Diffuse sur les deux canaux ; l'echec de l'un n'arrete pas l'autre. */
  function diffuser(source, action, sujet, corps, texteTelegram) {
    if (parEmail) {
      try {
        sendEmail(destinataire, sujet, corps);
        envoyes++;
      } catch (e) {
        logEvent(source, action + ' (email)', 'ERROR', e.message);
      }
    }
    if (parTelegram) {
      try {
        envoyerTelegram_(config, texteTelegram);
        envoyes++;
      } catch (e) {
        logEvent(source, action + ' (Telegram)', 'ERROR', e.message);
      }
    }
  }

  if (envoiGroupe) {
    var digest = messageDigest(nouvelles);
    diffuser('', 'Digest', digest.sujet, digest.corps,
             messageTelegramDigest(nouvelles));
    logEvent('', 'Notifications', 'SUCCESS',
             'Digest de ' + nouvelles.length + ' nouvelles opportunites.');
  }

  lignes.forEach(function (ligne) {
    var plan = notificationsAEnvoyer(ligne, config);
    if (!plan.marquer.length) return;

    plan.envoyer.forEach(function (type) {
      // Deja couvert par le digest : on marque sans renvoyer.
      if (type === 'new' && envoiGroupe) return;
      var message = messageNotification(type, ligne);
      diffuser(ligne.source, 'Notification ' + type,
               message.sujet, message.corps, messageTelegram(type, ligne));
    });
    marquerNotifications_(ligne, plan.marquer);
  });

  return envoyes;
}

// --------------------------------------------------------------- EXECUTION

/** Point d'entree unique : le declencheur et le menu appellent celui-ci. */
function executerTenderPilot() {
  CONFIG_COURANTE = lireConfig();
  var config = CONFIG_COURANTE;
  var resume = { nouvelles: 0, misesAJour: 0, emails: 0, suivies: 0 };

  try {
    var existantes = lireOpportunites();
    var annonces = collectAllSources(config);
    var bilan = saveOrUpdateOpportunity(annonces, existantes);
    resume.nouvelles = bilan.nouvelles.length;
    resume.misesAJour = bilan.misesAJour;

    var toutes = existantes.concat(bilan.nouvelles);
    resume.suivies = updateDeadlines(toutes);
    resume.emails = sendNotifications(toutes, config, bilan.nouvelles);

    logEvent('', 'Execution', 'SUCCESS',
      resume.nouvelles + ' nouvelle(s), ' + resume.misesAJour
      + ' mise(s) a jour, ' + resume.suivies + ' suivie(s), '
      + resume.emails + ' email(s).');
  } catch (e) {
    logEvent('', 'Execution', 'ERROR', e.message);
    throw e;
  }
  return resume;
}

function executerManuellement() {
  try {
    var r = executerTenderPilot();
    SpreadsheetApp.getActive().toast(
      r.nouvelles + ' nouvelle(s), ' + r.misesAJour + ' mise(s) a jour, '
      + r.emails + ' email(s) envoye(s).', MENU, 8);
  } catch (e) {
    var ui = SpreadsheetApp.getUi();
    ui.alert(MENU, 'L execution a echoue.\n\n' + e.message
      + '\n\nDetail dans l onglet ' + SCHEMA.SHEETS.logs + '.', ui.ButtonSet.OK);
  }
}

// ------------------------------------------------------------ DECLENCHEURS

/** Trois passages par jour suffisent largement - section 24. */
var HEURES = [8, 13, 18];

function retirerDeclencheur_() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === DECLENCHEUR) ScriptApp.deleteTrigger(t);
  });
}

function installerDeclencheur() {
  retirerDeclencheur_();
  HEURES.forEach(function (h) {
    ScriptApp.newTrigger(DECLENCHEUR).timeBased().atHour(h).everyDays(1).create();
  });
  CONFIG_COURANTE = lireConfig();
  logEvent('', 'Declencheur', 'SUCCESS',
           'Execution automatique a ' + HEURES.join('h, ') + 'h.');
  SpreadsheetApp.getActive().toast(
    'Execution automatique activee : ' + HEURES.join('h, ') + 'h.', MENU, 8);
}

function retirerDeclencheur() {
  retirerDeclencheur_();
  CONFIG_COURANTE = lireConfig();
  logEvent('', 'Declencheur', 'SUCCESS', 'Execution automatique desactivee.');
  SpreadsheetApp.getActive().toast('Execution automatique desactivee.', MENU, 8);
}
