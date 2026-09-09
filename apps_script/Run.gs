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

/**
 * Construit le menu a l'ouverture du classeur.
 *
 * NE LEVE JAMAIS D'ERREUR, ET C'EST LE POINT ENTIER DE CE try.
 *
 * SpreadsheetApp.getUi() n'existe que quand une INTERFACE est la. Lance
 * depuis l'editeur Apps Script, depuis un declencheur horaire, ou pendant
 * qu'un autre service ouvre le fichier, il jette "Cannot call
 * SpreadsheetApp.getUi() from this context" - mesure du 2026-09-06, sur
 * l'installation d'un client, en suivant notre propre guide qui faisait
 * lancer onOpen pour declencher l'autorisation.
 *
 * Un menu qui ne se construit pas est sans consequence : il n'y a pas de
 * barre de menus ou l'accrocher. Une exception, elle, s'affiche en rouge
 * dans le journal d'un client qui vient d'installer le produit, et lui
 * fait croire que rien ne marche.
 */
function onOpen() {
  try {
    construireMenu_();
  } catch (e) {
    // DEUX CAS SE RESSEMBLENT ET N'ONT RIEN A VOIR, D'OU CE JOURNAL.
    //
    // Pas d'interface - lance depuis l'editeur, un declencheur horaire, un
    // autre service : il n'y a rien a construire, et c'est sans gravite.
    //
    // Ou bien le script est CASSE : un fichier manquant, un fichier colle a
    // moitie. Le menu n'apparait pas non plus, mais rien ne marchera. Se
    // taire dans ce cas laisse le client devant un classeur muet, sans un
    // mot pour lui dire ou chercher - c'est le defaut qu'a introduit la
    // correction du 2026-09-06, en attrapant l'erreur sans la dire.
    try {
      console.log('TenderPilot : menu non construit - ' + e.message);
      logEvent('', 'Menu', 'ERROR',
               'Menu non construit : ' + e.message + '. Si le menu manque '
               + 'apres une copie, ouvrez Extensions > Apps Script et '
               + 'lancez autoriser : l erreur exacte y apparaitra.');
      ecrireJournal_();
    } catch (e2) {
      // Meme le journal est hors de portee : on ne fait pas de bruit.
    }
  }
}

/** Voir onOpen. Separe pour rester testable et lisible. */
function construireMenu_() {
  SpreadsheetApp.getUi().createMenu(MENU)
    .addItem('Executer maintenant', 'executerManuellement')
    .addSeparator()
    .addItem('Activer l execution automatique', 'installerDeclencheur')
    .addItem('Desactiver l execution automatique', 'retirerDeclencheur')
    .addSeparator()
    .addItem('Synchroniser les sources', 'synchroniserSources')
    .addItem('Tester la notification Telegram', 'testerTelegram')
    .addItem('Tester l agenda', 'testerAgenda')
    .addItem('Tester le classement intelligent', 'testerLlm')
    .addItem('Afficher / masquer l onglet SOURCES', 'basculerOngletSources')
    .addItem('Verifier l installation', 'verifierInstallation')
    .addSeparator()
    .addItem('Vider les opportunites et le journal', 'viderOpportunites')
    .addToUi();
}

/**
 * Menu > Verifier l'installation.
 *
 * A QUOI CA SERT. Un classeur en service a ete cree a une date donnee, et
 * le produit a bouge depuis. Recoller les fichiers .gs ne suffit pas
 * toujours : une colonne ajoutee au schema n'apparait pas toute seule dans
 * un onglet existant, et majLigne_ ignore EN SILENCE une colonne absente -
 * ce qui est le bon comportement, mais rend le manque invisible.
 *
 * Cette fonction remplace le "j'espere que j'ai tout colle" par une
 * reponse. Elle ne repare rien : elle dit ce qui manque, et ou.
 */
function verifierInstallation() {
  var lignes = [];

  // 1. Le code. On ne peut pas lister les fichiers du projet, mais une
  //    fonction absente prouve qu'un fichier n'a pas ete colle.
  var attendues = {
    'Agenda.gs': 'synchroniserAgenda_',
    'Telegram.gs': 'envoyerTelegram_',
    'Marque.gs': 'logoEmail_',
    'Sources.gs': 'synchroniserSources',
    'Llm.gs': 'testerLlm'
  };
  var fichiersManquants = Object.keys(attendues).filter(function (f) {
    return typeof this[attendues[f]] !== 'function';
  }, this);
  lignes.push(fichiersManquants.length
    ? 'CODE : fichier(s) a coller - ' + fichiersManquants.join(', ')
    : 'CODE : les fichiers attendus sont la.');

  // 2. Les colonnes. Le point qui coute le plus cher a rater.
  var carte = entetes_(feuilleOpp_());
  var colonnes = [];
  Object.keys(SCHEMA.OPP).forEach(function (cle) {
    if (!carte[SCHEMA.OPP[cle]]) colonnes.push(SCHEMA.OPP[cle]);
  });
  lignes.push(colonnes.length
    ? 'COLONNES : a ajouter dans ' + SCHEMA.SHEETS.opportunities + ' - '
      + colonnes.join(', ')
    : 'COLONNES : completes.');

  // 3. La configuration. Le script cree les cles manquantes quand il en a
  //    besoin ; on les signale quand meme, pour que le client les VOIE.
  var config = lireConfig();
  var cles = (SCHEMA.CONFIG_CLES || []).filter(function (c) {
    return !(c in config);
  });
  lignes.push(cles.length
    ? 'CONFIG : ' + cles.length + ' reglage(s) absent(s) - ils seront '
      + 'ajoutes a la prochaine execution : ' + cles.join(', ')
    : 'CONFIG : complete.');

  // 4. Les sources que le catalogue ne connait plus. La synchronisation
  //    AJOUTE et met a jour, elle ne supprime jamais - une source ajoutee
  //    par le client ne doit pas disparaitre. Mais une source RENOMMEE au
  //    catalogue laisse donc son ancienne ligne en place, active, sous son
  //    ancien nom. On la signale ; c'est au proprietaire de trancher.
  var duCatalogue = {};
  (SCHEMA.SOURCES_LIVREES || []).forEach(function (s) {
    var id = String(s[0] || '').trim();
    if (id) duCatalogue[id] = true;
  });
  var orphelines = lireSources()
    .map(function (s) { return String(s.id || '').trim(); })
    .filter(function (id) { return id && !duCatalogue[id]; });
  lignes.push(orphelines.length
    ? 'SOURCES : ' + orphelines.join(', ') + ' - absente(s) du catalogue '
      + 'livre. Soit vous les avez ajoutees, soit elles ont ete renommees : '
      + 'dans le second cas, supprimez la ligne.'
    : 'SOURCES : toutes connues du catalogue.');

  var rapport = lignes.join('\n');
  logEvent('', 'Verification', 'INFO', lignes.join(' | '));
  ecrireJournal_();
  SpreadsheetApp.getActive().toast(rapport, 'Verification', 30);
  console.log(rapport);
  return rapport;
}

/**
 * A LANCER UNE FOIS DEPUIS L'EDITEUR, pour accorder les autorisations.
 *
 * C'est la fonction que le guide d'installation designe. Elle existe pour
 * une raison precise : Google n'affiche l'ecran de consentement que
 * lorsqu'une fonction est executee a la main, et il faut donc en designer
 * une. Le guide designait onOpen - qui echoue justement dans ce
 * contexte-la, faute d'interface.
 *
 * Celle-ci ne touche a aucune interface, n'envoie rien, n'ecrit rien. Elle
 * lit le classeur et dit ce qu'elle voit. Les autorisations demandees ne
 * dependent pas d'elle : Google les deduit de TOUT le code du projet, quelle
 * que soit la fonction lancee.
 */
function autoriser() {
  var sources = lireSources();
  var actives = sources.filter(function (s) { return estVrai(s.active); });
  var message = 'Autorisations accordees. ' + sources.length
    + ' source(s) au registre, dont ' + actives.length + ' active(s). '
    + 'Rechargez le classeur : le menu ' + MENU + ' apparaitra.';
  console.log(message);
  return message;
}

// ---------------------------------------------------------------- COLLECTE

/**
 * Agent utilisateur.
 *
 * DECISION DU 2026-09-02, fondee sur les regles des sites eux-memes, pas sur
 * une preference.
 *
 * "TenderPilot/1.0" seul, puis "Mozilla/5.0 (compatible; TenderPilot/1.0)",
 * se faisaient refuser par Wellcome Trust : HTTP 202, une reponse vide.
 * Mesure repetee, reproductible.
 *
 * Verification faite avant de trancher : le robots.txt de wellcome.org
 * AUTORISE explicitement les robots sur /research-funding/schemes - aucune
 * des 37 directives Disallow ne couvre ce chemin - et demande seulement un
 * Crawl-delay de 10 secondes. Leur politique declaree accueille les robots ;
 * c est leur reseau de diffusion qui bloque par defaut tout agent non
 * conforme. La politique prime.
 *
 * D ou cette forme : celle d un navigateur, POUR PASSER LE FILTRE, mais
 * suivie de TenderPilot/1.0, POUR RESTER IDENTIFIABLE dans les journaux de
 * l operateur. Ce n est pas un deguisement complet, et c est delibere.
 * Mesure : 200 avec cette chaine, contre 202 sans le prefixe navigateur.
 *
 * La collecte est sequentielle, ce qui respecte de fait le Crawl-delay
 * demande.
 *
 * CE QUE CETTE CHAINE NE PEUT PAS FAIRE, mesure le 2026-09-02 : la BAD
 * repond desormais 403 a TOUTES ses adresses, robots.txt compris, derriere
 * un controle anti-robot Cloudflare qui exige l execution de JavaScript.
 * Aucun agent utilisateur n en vient a bout, et ce n est pas une question
 * de debit - l explication precedente, qui attribuait ces 403 a des
 * requetes lancees en parallele, etait fausse. Les deux sources de la BAD
 * sont donc desactivees dans le registre, avec la mesure en clair.
 */
var AGENT_UTILISATEUR =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
  + "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 TenderPilot/1.0";


/**
 * Second temps : va chercher sur chaque fiche ce que la liste ne dit pas.
 *
 * Voir ANALYSEURS_FICHE dans Html.gs pour le pourquoi. Les trois bornes
 * sont ici : on ne lit que les fiches MANQUANTES, jamais celles deja au
 * classeur, et jamais plus que le plafond du passage.
 */
/**
 * Cette annonce est-elle deja au classeur ?
 *
 * Par son lien quand elle en a un, et par son IDENTITE sinon - titre,
 * organisation, echeance, les memes cles que la deduplication d'ecriture.
 * Une annonce dont la liste ne donne pas encore le lien n'a que cela.
 */
function dejaConnue_(annonce, connus) {
  if (annonce.url && connus[normalizeText(annonce.url)]) return true;
  return clesDedup(annonce).some(function (cle) { return connus[cle]; });
}

function completerParFiches_(annonces, analyseur, source, config, options,
                             connus) {
  var plafond = Number(config.MAX_FICHES_PAR_PASSAGE);
  if (!isFinite(plafond) || plafond < 0) plafond = 12;

  var sortie = [];
  var lues = 0;
  var reportees = 0;

  annonces.forEach(function (annonce) {
    // LA FICHE APPORTE CE QUE LA LISTE TAIT : une echeance (JobRelais) ou
    // le vrai lien de l'annonce (Fundpilote, dont la liste ne donne qu'un
    // identifiant d'API). Il ne manque rien : on ne depense pas de requete.
    if (annonce.deadline && annonce.url) { sortie.push(annonce); return; }

    // Deja au classeur : elle y porte ce qu'une fiche lui avait donne.
    if (dejaConnue_(annonce, connus)) { sortie.push(annonce); return; }

    // L'adresse a INTERROGER n'est pas toujours celle de l'annonce : voir
    // ficheUrl, pose par les analyseurs de liste qui les distinguent.
    var adresse = annonce.ficheUrl || annonce.url;
    if (lues >= plafond || !adresse) { reportees++; return; }

    lues++;
    try {
      var reponse = UrlFetchApp.fetch(adresse, options);
      if (reponse.getResponseCode() !== 200) { reportees++; return; }
      fusionnerFiche_(annonce, analyseur(corpsReponse_(reponse)));
      // Fiche lue mais toujours incomplete : pour une source qui declare un
      // analyseur de fiche, cela veut dire "pas reussi a lire", pas "avis
      // sans date" ni "avis sans lien". On ne fait pas entrer une ligne
      // morte, ni une ligne dont le lien menerait a un mur d'inscription.
      if (annonce.deadline && annonce.url) sortie.push(annonce);
      else reportees++;
    } catch (e) {
      reportees++;
    }
  });

  // ficheUrl est un OUTIL DE COLLECTE, pas une donnee de l'annonce : il ne
  // doit pas voyager plus loin. Le classeur n'a pas de colonne pour lui,
  // mais une notification ou un export le trainerait - et il porte le nom
  // du service qui a trouve l'avis, que le client n'a pas a lire.
  sortie.forEach(function (a) { delete a.ficheUrl; });

  if (reportees) {
    logEvent(source.id, 'Collecte', 'INFO',
             lues + ' fiche(s) lue(s), ' + reportees + ' annonce(s) '
             + 'reportee(s) au prochain passage - plafond '
             + 'MAX_FICHES_PAR_PASSAGE (' + plafond + ').');
  }
  return sortie;
}

/**
 * Marqueur de pagination dans l'adresse d'une source.
 *
 * Une source dont l'URL contient {page} est lue page par page, jusqu'a ce
 * qu'elle n'apporte plus rien - voir collecterDetail_. Les sources qui ne
 * le contiennent pas sont lues exactement comme avant : une seule requete.
 */
var GABARIT_PAGE = '{page}';

/**
 * Garde-fou. Une pagination qui ne s'arreterait pas mangerait les six
 * minutes d'execution d'Apps Script et les requetes de toutes les autres
 * sources. Vingt pages suffisent : la GIZ en a douze.
 */
var PAGES_MAX = 20;

/** Identite d'une annonce d'une page a l'autre, pour ne pas la relire. */
function cleDePage_(annonce) {
  return normalizeText(annonce.url || '') + '|'
    + normalizeText(annonce.title || '');
}

/**
 * Texte de la reponse, decode dans SON jeu de caracteres.
 *
 * getContentText() sans argument suppose l'UTF-8. Le portail de la GIZ sert
 * de l'ISO-8859-1 - il l'annonce dans son en-tete Content-Type - et sans
 * cette lecture "Uberarbeitung" et "developpement" reviennent en morceaux.
 * On ne devine rien : on lit ce que le serveur declare, et on retombe sur
 * l'UTF-8 quand il ne declare rien ou quand le jeu est inconnu.
 */
function corpsReponse_(reponse) {
  var entetes = reponse.getAllHeaders ? (reponse.getAllHeaders() || {}) : {};
  var type = '';
  Object.keys(entetes).forEach(function (cle) {
    if (String(cle).toLowerCase() === 'content-type') type = String(entetes[cle]);
  });
  var m = /charset=["']?([\w-]+)/i.exec(type);
  var jeu = m ? m[1].toUpperCase() : '';
  if (jeu && jeu !== 'UTF-8' && jeu !== 'UTF8') {
    try {
      return reponse.getContentText(jeu);
    } catch (e) {
      // Jeu de caracteres inconnu d'Apps Script : mieux vaut un texte
      // approximatif que pas de collecte du tout.
    }
  }
  return reponse.getContentText();
}

/**
 * Transforme le corps d'une page en annonces, quel que soit le moyen.
 *
 * Sorti de collecterDetail_ pour que la pagination puisse le rappeler page
 * apres page sans dupliquer la normalisation.
 */
function annoncesDuCorps_(corps, source, analyseur, config) {
  // Collecte par API ou par extraction HTML, pour les sites sans flux.
  // Une page HTML ne dit pas si elle est vide ou si elle a change de mise
  // en page : on ne pretend pas la reconnaitre.
  if (analyseur) {
    return { annonces: retirerExpirees_(analyseur(corps, source), config),
             reconnue: false };
  }

  // Collecte RSS, le cas general.
  var lues = parseFeedXml(corps)
    .map(function (item) {
      return normalizeOpportunity({
        title: item.title,
        // L'acheteur reel quand le flux le donne dans <author> : voir
        // auteurFlux_. Sinon normalizeOpportunity reprend le nom de la
        // source, comme avant.
        org: item.org,
        url: item.link,
        summary: item.summary,
        published: item.published,
        deadline: item.deadline
      }, source);
    })
    // UN PLAN DE PASSATION N'EST PAS UN AVIS, quelle que soit la source.
    // Il annonce ce qu'un acheteur COMPTE lancer dans l'annee : ni dossier,
    // ni echeance de depot, rien a quoi repondre. Et il porte une date -
    // souvent le 31 decembre - donc le filtre des echues ne l'arrete pas.
    .filter(function (o) {
      return o.title && !estPlanDePassation_(o.title);
    });

  return { annonces: retirerExpirees_(lues, config),
           reconnue: estFluxXml(corps) };
}

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
function collectSource(source, config, connus) {
  return collecterDetail_(source, config, connus).annonces;
}

/**
 * Le detail que collectSource ne rend pas : a-t-on RECONNU ce qu'on a lu ?
 *
 * Une page vide et une page qu'on ne sait plus lire donnent le meme
 * resultat - zero annonce - et n'appellent pas du tout le meme message.
 * Un flux RSS valide annonce sa nature des la premiere balise : quand il
 * est reconnu et qu'il ne contient rien, la source va bien, elle n'a
 * simplement rien a publier aujourd'hui. C'est le cas de plusieurs bureaux
 * de pays du PNUD, qui passaient pour casses a chaque execution.
 */
function collecterDetail_(source, config, connus) {
  var methode = String(source.method || '').trim();
  var analyseur = analyseurJson_(methode) || analyseurHtml_(methode);

  // Une methode qui n'est ni RSS ni un analyseur connu = saisie manuelle.
  if (methode.toUpperCase() !== 'RSS' && !analyseur) {
    logEvent(source.id, 'Collecte', 'SKIPPED',
             'Methode ' + (methode || 'non definie') + ' : saisie manuelle.');
    return { annonces: [], reconnue: false };
  }
  if (estVide(source.url)) {
    logEvent(source.id, 'Collecte', 'SKIPPED', 'Aucune URL.');
    return { annonces: [], reconnue: false };
  }

  // Une source peut exiger un POST : voir REQUETES_SOURCES dans Json.gs.
  function optionsBase_() {
    return {
      muteHttpExceptions: true,
      followRedirects: true,
      validateHttpsCertificates: true,
      headers: { 'User-Agent': AGENT_UTILISATEUR }
    };
  }
  // La forme de requete vaut pour la LISTE, page par page. Une fiche est
  // une autre adresse : elle se lit toujours en GET simple, sans le corps
  // qui interrogeait la liste.
  function optionsDePage_(page) {
    var options = optionsBase_();
    var requete = formeRequete_(source.method, page);
    if (requete) {
      options.method = requete.methode;
      options.contentType = requete.contentType;
      options.payload = requete.corps;
    }
    return options;
  }

  var maximum = Number(config.MAX_ITEMS_PER_SOURCE) || 40;
  var adresse = String(source.url).trim();
  // Deux facons de paginer : {page} dans l'adresse, ou - pour UNGM - un
  // numero de page dans le corps du POST. La seconde n'a qu'une adresse.
  var forme = formeRequete_(source.method, 1);
  var paginee = adresse.indexOf(GABARIT_PAGE) !== -1
    || !!(forme && forme.paginee);

  var annonces = [];
  var vues = {};
  var reconnue = false;
  var videsDaffilee = 0;

  for (var page = 1; page <= (paginee ? PAGES_MAX : 1); page++) {
    var reponse = UrlFetchApp.fetch(
      paginee ? adresse.split(GABARIT_PAGE).join(String(page)) : adresse,
      optionsDePage_(page));
    var code = reponse.getResponseCode();
    if (code !== 200) {
      // La premiere page qui echoue est une panne de source. Une page
      // suivante qui echoue termine simplement la pagination : ce qui a
      // deja ete lu reste bon.
      if (page === 1) throw new Error('HTTP ' + code);
      break;
    }

    var lot = annoncesDuCorps_(corpsReponse_(reponse), source, analyseur,
                               config);
    if (page === 1) reconnue = lot.reconnue;

    var neuves = 0;
    lot.annonces.forEach(function (a) {
      if (vues[cleDePage_(a)]) return;
      annonces.push(a);
      neuves++;
    });
    // On ne marque qu'APRES la page. Deux exemplaires d'un meme avis sur la
    // MEME page doivent traverser : c'est la deduplication d'ecriture qui
    // les reunit, et elle sait completer la fiche avec ce que le second
    // apporte. Ici on ne saurait que jeter le second, avec son echeance.
    lot.annonces.forEach(function (a) { vues[cleDePage_(a)] = true; });

    if (annonces.length >= maximum) break;

    // Une page qui n'apporte rien peut etre la fin de la liste - ou une
    // page entiere de marches deja attribues, qu'on ecarte tous. On ne
    // s'arrete donc qu'a la DEUXIEME page vide d'affilee : au-dela de la
    // derniere page, le portail en sert autant qu'on en demande.
    videsDaffilee = neuves === 0 ? videsDaffilee + 1 : 0;
    if (videsDaffilee >= 2) break;
  }

  // SECOND TEMPS, quand la source le declare : les fiches portent ce que
  // la liste tait. Voir ANALYSEURS_FICHE.
  var fiche = analyseurFiche_(source.method);
  if (fiche) {
    annonces = completerParFiches_(annonces.slice(0, maximum), fiche, source,
                                   config, optionsBase_(), connus || {});
  }

  return { annonces: annonces.slice(0, maximum), reconnue: reconnue };
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
 * Les trois cas ne disent pas la meme chose :
 *
 *   lues = 0, reconnue      flux valide et vide : source FONCTIONNELLE,
 *                           elle ne publie rien en ce moment.
 *   lues = 0, non reconnue  l'analyseur n'a rien trouve sur une page qu'on
 *                           ne reconnait pas : source probablement CASSEE.
 *   lues > 0, annonces = 0  page lue, aucune echeance ouverte : source
 *                           FONCTIONNELLE, en periode creuse.
 *
 * Les confondre ferait desactiver des sources qui vont republier.
 */
function collectSourceDetail(source, config, connus) {
  // Une seule recuperation reseau : on ne demande jamais deux fois la meme
  // page a un site qui limite deja son debit.
  var detail = collecterDetail_(source, Object.assign({}, config,
                                                      { COLLECT_EXPIRED: 'true' }),
                                connus);
  var tout = detail.annonces;
  if (estVrai(config.COLLECT_EXPIRED)) {
    return { lues: tout.length, annonces: tout, reconnue: detail.reconnue };
  }
  return { lues: tout.length, annonces: retirerExpirees_(tout, config),
           reconnue: detail.reconnue };
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
 * Budget de temps de la collecte, en millisecondes.
 *
 * Apps Script tue une execution a six minutes. Le 2026-09-03, la collecte
 * a depasse : 51 sources actives, et le passage entier n'a rien ecrit -
 * ni deadlines, ni couleurs, ni emails.
 *
 * QUATRE MINUTES POUR LIRE, DEUX POUR ECRIRE. Passe ce budget, la collecte
 * s'arrete d'elle-meme et laisse la place a la suite : ce qui a ete lu est
 * enregistre, les echeances sont recalculees, les alertes partent. Un
 * passage tronque vaut infiniment mieux qu'un passage tue.
 *
 * ET ON REPREND OU L'ON S'EST ARRETE. Le rang de la derniere source lue
 * est garde dans les proprietes du script : le passage suivant commence
 * juste apres, et fait le tour. Sans cette rotation, les memes vingt
 * premieres sources seraient lues chaque fois et les dernieres jamais.
 */
var BUDGET_COLLECTE_MS = 4 * 60 * 1000;
var CLE_REPRISE = 'TENDERPILOT_REPRISE';

/** Rang de depart du prochain tour, ou 0. Jamais bloquant. */
function rangDeReprise_(total) {
  try {
    var brut = PropertiesService.getScriptProperties().getProperty(CLE_REPRISE);
    var n = parseInt(brut, 10);
    return isFinite(n) && n > 0 && n < total ? n : 0;
  } catch (e) {
    return 0;
  }
}

function noterReprise_(rang) {
  try {
    PropertiesService.getScriptProperties()
      .setProperty(CLE_REPRISE, String(rang));
  } catch (e) {
    // Sans memoire de reprise on relira depuis le debut : c'est degrade,
    // ce n'est pas une panne.
  }
}

/**
 * Parcourt toutes les sources actives.
 * Chaque source est isolee : une panne est journalisee et la suivante est
 * traitee normalement (section 22).
 */
function collectAllSources(config, connus) {
  var trouvees = [];
  // MESURE DU 2026-09-03 : 57 des 108 sources sont desactivees, et chacune
  // ecrivait sa ligne "Source desactivee" a CHAQUE passage - 57 lignes qui
  // ne disent rien, et 57 aller-retours vers la feuille. On les compte, on
  // le dit une fois.
  var toutes = lireSources();
  var actives = toutes.filter(function (s) { return estVrai(s.active); });
  var desactivees = toutes.length - actives.length;

  // On commence la ou le passage precedent s'est arrete, et on fait le tour.
  var depart = rangDeReprise_(actives.length);
  var debut = new Date().getTime();
  var budget = Number(config.BUDGET_COLLECTE_SECONDES) > 0
    ? Number(config.BUDGET_COLLECTE_SECONDES) * 1000
    : BUDGET_COLLECTE_MS;
  var reportees = 0;

  for (var rang = 0; rang < actives.length; rang++) {
    var source = actives[(depart + rang) % actives.length];

    // Au moins une source est lue a chaque passage, meme si le budget est
    // deja depasse : sinon un budget mal regle bloquerait tout.
    if (rang > 0 && new Date().getTime() - debut > budget) {
      reportees = actives.length - rang;
      noterReprise_((depart + rang) % actives.length);
      logEvent('', 'Collecte', 'INFO',
               reportees + ' source(s) reportee(s) au prochain passage : '
               + Math.round(budget / 1000) + ' s de collecte atteintes. '
               + 'La prochaine execution reprendra a ' + source.id + '.');
      break;
    }

    try {
      var bilan = collectSourceDetail(source, config, connus);
      var annonces = bilan.annonces;
      trouvees = trouvees.concat(annonces);

      if (bilan.lues === 0 && bilan.reconnue) {
        // Flux valide, mais sans aucune entree : le bureau de pays ne
        // publie rien en ce moment. Ce n'est pas une panne, et le dire
        // autrement transformerait une dizaine de sources saines en
        // fausses alertes a chaque execution.
        majSource_(source, 'FLUX VIDE');
        logEvent(source.id, 'Collecte', 'INFO',
                 'Flux lu, mais vide : cette source ne publie rien en ce '
                 + 'moment.');
      } else if (bilan.lues === 0) {
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
        // Une echeance encore ouverte prime sur l'age des publications :
        // voir aUneEcheanceOuverte_, et le cas Grants.gov qui l'a montre.
        if (f.silencieuse && !aUneEcheanceOuverte_(annonces, aujourdhui_())) {
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
  }

  // Tour complet : le prochain passage repart du debut.
  if (!reportees) noterReprise_(0);

  if (desactivees) {
    logEvent('', 'Collecte', 'SKIPPED',
             desactivees + ' source(s) desactivee(s) dans l onglet '
             + SCHEMA.SHEETS.sources + ', ignoree(s).');
  }
  // Une seule ecriture pour les colonnes Derniere_Collecte et Statut.
  ecrireStatutsSources_();
  return trouvees;
}

// ------------------------------------------------ DEDUPLICATION + ECRITURE

/**
 * Comment nommer une annonce dans le journal.
 *
 * Une annonce n'a d'identifiant qu'une fois ECRITE. Celles qui attendent
 * encore leur ligne n'en ont pas : les nommer par leur titre evite le
 * "undefined existe deja." qui ne disait a l'utilisateur ni quelle annonce
 * ni quelle source etait en cause.
 */
function etiquetteAnnonce_(annonce) {
  if (!estVide(annonce.id)) return String(annonce.id).trim();
  var titre = String(annonce.title || '').trim();
  if (!titre) return 'Annonce sans titre';
  return titre.length > 80 ? titre.slice(0, 77) + '...' : titre;
}

/**
 * Complete une annonce en attente avec ce qu'une autre copie apporte.
 *
 * ON NE REMPLACE JAMAIS UNE VALEUR DEJA LUE. Les deux copies ont ete lues
 * dans la meme execution : aucune n'est plus recente que l'autre, et rien
 * ne permet d'arbitrer entre deux echeances differentes. On prend donc
 * l'union de ce qui a ete lu, jamais un choix entre deux lectures - c'est
 * la seule facon de completer sans risquer d'inventer une date.
 */
function completerAnnonce_(attendue, entrante) {
  SCHEMA.UPDATABLE.forEach(function (cle) {
    if (estVide(entrante[cle]) || !estVide(attendue[cle])) return;
    attendue[cle] = entrante[cle];
  });
}

/**
 * Range les annonces collectees : nouvelles d'un cote, mises a jour de
 * l'autre - sections 7 et 8.
 */
function saveOrUpdateOpportunity(annonces, existantes) {
  var index = construireIndex(existantes);
  var nouvelles = [];
  var majFaites = 0;
  var dejaConnues = 0;

  annonces.forEach(function (annonce) {
    var doublon = trouverDoublon(annonce, index);
    if (doublon) {
      // Un doublon est de deux natures, et les confondre a coute une
      // execution entiere le 2026-09-02 : soit une LIGNE DEJA ECRITE, qui
      // porte son numero de ligne, soit une annonce collectee quelques
      // sources plus tot dans CETTE execution, qui n'a encore ni
      // identifiant ni ligne. La seconde n'a rien a mettre a jour dans la
      // feuille - majLigne_ recevait _row indefini, et
      // getRange(null, colonne) arretait tout le traitement, sans
      // deadlines, sans couleurs et sans emails.
      if (!doublon._row) {
        completerAnnonce_(doublon, annonce);
        logEvent(annonce.source, 'Doublon', 'DUPLICATE',
                 etiquetteAnnonce_(doublon)
                 + ' : deja collectee dans cette execution.');
        return;
      }

      var champs = champsModifies(doublon, annonce);
      if (Object.keys(champs).length) {
        majLigne_(doublon, champs);
        majFaites++;
        logEvent(annonce.source, 'Mise a jour', 'SUCCESS',
                 etiquetteAnnonce_(doublon) + ' : '
                 + Object.keys(champs).join(', '));
      } else {
        // MESURE DU 2026-09-03 : en regime courant, presque toutes les
        // annonces collectees sont deja connues - 390 lignes "existe deja"
        // par passage, 390 aller-retours vers la feuille, et un journal
        // illisible. On compte, on le dit une fois a la fin.
        dejaConnues++;
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

  if (dejaConnues) {
    logEvent('', 'Doublon', 'DUPLICATE',
             dejaConnues + ' annonce(s) deja suivie(s), inchangee(s).');
  }

  ajouterOpportunites_(nouvelles, existantes);
  return { nouvelles: nouvelles, misesAJour: majFaites };
}

// --------------------------------------------------------------- DEADLINES

/**
 * Recalcule ce qui depend du jour et de la configuration - sections 9, 10
 * et 25 : jours restants, statut de delai, couleur et pertinence.
 *
 * La pertinence est recalculee a CHAQUE passage, comme les jours restants.
 * Le client qui ajoute un pays ou un secteur dans l'onglet CONFIG voit donc
 * tout son tableau se remettre a jour au passage suivant, y compris les
 * lignes collectees il y a six mois.
 */
function updateDeadlines(lignes, config) {
  var jourCourant = aujourdhui_();
  var reglages = config || CONFIG_COURANTE || {};
  lignes.forEach(function (ligne) {
    ligne.days = joursRestants(ligne.deadline, jourCourant);
    ligne.status = statutDelai(ligne.days);
    ligne.pertinence = pertinence(ligne, reglages);
  });
  ecrireDelais_(lignes);
  peindreLignes_(lignes);
  return lignes.length;
}

// ------------------------------------------------------------------ EMAILS

/**
 * Envoie un email, en HTML avec repli en texte brut.
 *
 * POURQUOI DU HTML. Un rappel d'echeance se lit en trois secondes, souvent
 * sur un telephone, entre deux autres choses. Un pave de "Cle : valeur" sur
 * quinze lignes oblige a TOUT lire pour trouver la seule information qui
 * decide : combien de jours reste-t-il. Une pastille de couleur repond
 * avant la premiere ligne.
 *
 * Les couleurs sont CELLES DU TABLEAU - SCHEMA.COULEURS. Un email orange et
 * une ligne orange doivent vouloir dire la meme chose, sinon la couleur
 * n'apprend rien.
 *
 * LE TEXTE BRUT RESTE. Certains clients de messagerie n'affichent pas le
 * HTML, certains lecteurs le desactivent : `body` porte exactement la meme
 * information. Un email illisible est un email perdu.
 */
function sendEmail(destinataire, sujet, corps, html) {
  var options = { to: destinataire, subject: sujet, body: corps };
  if (html) {
    options.htmlBody = html;
    // Le logo voyage AVEC le message, pas depuis une adresse distante :
    // la plupart des messageries bloquent les images externes tant que le
    // lecteur n'a pas clique "afficher les images", et un email dont
    // l'en-tete est vide a l'ouverture ne ressemble a rien.
    // typeof, PAS un appel direct. Marque.gs est un fichier a part : un
    // client qui recolle Run.gs sans lui aurait un ReferenceError a
    // CHAQUE envoi, et perdrait tous ses emails pour une image. Une
    // alerte sans logo reste une alerte ; une alerte qui ne part pas, non.
    var logo = typeof logoEmail_ === 'function' ? logoEmail_() : null;
    if (logo) options.inlineImages = { logoTenderPilot: logo };
  }
  MailApp.sendEmail(options);
}

/** Encadre le texte pour qu'un titre d'annonce ne casse pas la mise en page. */
function echapperHtml_(texte) {
  return String(texte === null || texte === undefined ? '' : texte)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * L'en-tete de marque, commun a tous les emails.
 *
 * L'image est referencee par cid: - l'identifiant de la piece jointe posee
 * par sendEmail. Un alt reste : si le lecteur refuse toutes les images, il
 * lit le nom du produit au lieu d'un carre vide.
 */
function enteteMarque_() {
  return '<div style="padding-bottom:14px;margin-bottom:16px;'
    + 'border-bottom:1px solid #D5DBE3">'
    + '<img src="cid:logoTenderPilot" alt="TenderPilot" width="160" '
    + 'style="display:block;border:0;height:auto;width:160px" /></div>';
}

/** Encre lisible sur une pastille de statut. Les fonds sont clairs. */
var ENCRE_EMAIL = '#16202D';
var MARINE_EMAIL = '#1F3A5F';
var LIEN_EMAIL = '#0050F0';

/**
 * Le corps HTML d'une alerte.
 *
 * Trois blocs, dans l'ordre ou on les lit : ce qui presse (la pastille et
 * le compte a rebours), de quoi il s'agit (titre, resume), et ou aller
 * (les liens). Le reste - type, secteur, budget - vient apres, en tableau,
 * pour qui veut verifier.
 *
 * Tout est en style INLINE : les clients de messagerie ignorent les
 * feuilles de style, et Gmail retire les balises <style>.
 */
function corpsHtml_(entete, ligne) {
  var statut = ligne.status || SCHEMA.STATUT_INCONNU;
  var fond = SCHEMA.COULEURS[statut] || SCHEMA.COULEURS[SCHEMA.STATUT_INCONNU];
  var jours = ligne.days;
  var reste = (jours === null || jours === undefined || jours === '')
    ? 'echeance a verifier'
    : (Number(jours) < 0 ? 'echeance passee'
       : Number(jours) === 0 ? "dernier jour"
       : 'dans ' + jours + ' jour' + (Number(jours) > 1 ? 's' : ''));

  // LES INTITULES VIENNENT DU SCHEMA, PAS D'UNE LISTE ECRITE ICI. L'email
  // et le tableau doivent nommer une donnee de la meme facon : si la
  // colonne est renommee, l'email suit. Le tiret bas devient une espace :
  // un nom de colonne n'est pas un intitule de lecture.
  var champs = [
    ['org', ligne.org],
    ['country', ligne.country],
    ['type', ligne.type],
    ['sector', ligne.sector],
    ['budget', ligne.budget],
    ['pertinence', ligne.pertinence],
    ['deadline', ligne.deadline || 'a verifier'],
    ['published', ligne.published],
    ['source', ligne.source]
  ].filter(function (p) { return p[1]; })
   .map(function (p) {
     return [String(SCHEMA.OPP[p[0]] || p[0]).replace(/_/g, ' '), p[1]];
   });

  var rangs = champs.map(function (p) {
    return '<tr>'
      + '<td style="padding:6px 12px 6px 0;color:#4A5665;font-size:13px;'
      + 'vertical-align:top;white-space:nowrap">' + echapperHtml_(p[0])
      + '</td>'
      + '<td style="padding:6px 0;color:' + ENCRE_EMAIL + ';font-size:13px">'
      + echapperHtml_(p[1]) + '</td></tr>';
  }).join('');

  var boutons = '';
  if (ligne.url) {
    boutons += '<a href="' + echapperHtml_(ligne.url) + '" '
      + 'style="display:inline-block;background:' + MARINE_EMAIL + ';'
      + 'color:#FFFFFF;text-decoration:none;padding:11px 18px;'
      + 'border-radius:6px;font-size:14px;font-weight:bold;margin:0 8px 8px 0">'
      + "Ouvrir l'avis officiel</a>";
  }
  if (ligne.pdf) {
    boutons += '<a href="' + echapperHtml_(ligne.pdf) + '" '
      + 'style="display:inline-block;border:1px solid ' + MARINE_EMAIL + ';'
      + 'color:' + MARINE_EMAIL + ';text-decoration:none;padding:10px 18px;'
      + 'border-radius:6px;font-size:14px;margin:0 8px 8px 0">'
      + 'Telecharger le dossier</a>';
  }

  return '<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,'
    + 'sans-serif;max-width:620px;color:' + ENCRE_EMAIL + ';line-height:1.5">'
    + enteteMarque_()
    + '<div style="background:' + fond + ';border-radius:8px;'
    + 'padding:14px 18px;margin-bottom:18px">'
    + '<div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;'
    + 'color:#4A5665">' + echapperHtml_(entete) + '</div>'
    + '<div style="font-size:20px;font-weight:bold;margin-top:4px">'
    + echapperHtml_(statut) + ' &middot; ' + echapperHtml_(reste) + '</div>'
    + '</div>'
    + '<h2 style="font-size:17px;margin:0 0 10px;color:' + MARINE_EMAIL + '">'
    + echapperHtml_(ligne.title) + '</h2>'
    + (ligne.summary
        ? '<p style="font-size:14px;margin:0 0 16px;color:#4A5665">'
          + echapperHtml_(ligne.summary) + '</p>' : '')
    + (boutons ? '<div style="margin:0 0 18px">' + boutons + '</div>' : '')
    + '<table style="border-collapse:collapse;margin-bottom:18px">'
    + rangs + '</table>'
    + '<p style="font-size:12px;color:#4A5665;border-top:1px solid #D5DBE3;'
    + 'padding-top:12px;margin:0">' + echapperHtml_(RAPPEL) + '</p></div>';
}

var RAPPEL = 'Consultez toujours la source officielle avant de candidater.';

function detail_(ligne) {
  var l = [];
  l.push('Titre : ' + ligne.title);
  if (ligne.org) l.push('Organisation : ' + ligne.org);
  if (ligne.country) l.push('Pays : ' + ligne.country);
  if (ligne.type) l.push('Type : ' + ligne.type);
  if (ligne.sector) l.push('Secteur : ' + ligne.sector);
  // Ce que l'annonce vaut pour VOUS, d'apres PAYS_SUIVIS et
  // SECTEURS_SUIVIS : la premiere question qu'on se pose en ouvrant un
  // email n'est pas "de quoi s'agit-il" mais "est-ce que cela me concerne".
  if (ligne.pertinence) l.push('Pertinence : ' + ligne.pertinence);
  if (ligne.budget) l.push('Budget : ' + ligne.budget);
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
var ENTETES_EMAIL = {
  new: 'Nouvelle opportunite',
  j7: 'Echeance dans 7 jours',
  j3: 'Echeance proche',
  j1: 'Dernier rappel',
  expired: 'Echeance depassee'
};

function messageNotification(type, ligne) {
  var t = ligne.title;
  var message;

  if (type === 'new') {
    message = {
      sujet: '[TenderPilot] Nouvelle opportunite - '
        + (ligne.org || 'source') + ' - ' + t,
      corps: 'Nouvelle opportunite detectee.\n\n' + detail_(ligne)
        + '\n\n' + RAPPEL
    };
  } else if (type === 'j7') {
    message = {
      sujet: '[TenderPilot] Deadline dans 7 jours - ' + t,
      corps: 'Cette opportunite arrive bientot a echeance.\n\n'
        + detail_(ligne) + '\n\n' + RAPPEL
    };
  } else if (type === 'j3') {
    message = {
      sujet: '[TenderPilot] URGENT - ' + ligne.days + ' jours restants - ' + t,
      corps: 'Il ne reste que ' + ligne.days + ' jour(s).\n\n'
        + detail_(ligne) + '\n\n' + RAPPEL
    };
  } else if (type === 'j1') {
    message = {
      sujet: '[TenderPilot] DERNIER RAPPEL - Deadline demain - ' + t,
      corps: 'Dernier rappel avant echeance.\n\n' + detail_(ligne)
        + '\n\n' + RAPPEL
    };
  } else {
    message = {
      sujet: '[TenderPilot] Opportunite expiree - ' + t,
      corps: 'La deadline est passee.\n\nTitre : ' + t
        + (ligne.org ? '\nOrganisation : ' + ligne.org : '')
        + '\nDeadline : ' + ligne.deadline
    };
  }

  // Le texte brut reste la reference ; le HTML est la mise en forme du
  // MEME contenu. Voir corpsHtml_.
  message.html = corpsHtml_(ENTETES_EMAIL[type] || type, ligne);
  return message;
}

/** Email recapitulatif quand la collecte rapporte beaucoup - section 19. */
function messageDigest(nouvelles, config) {
  var groupes = grouperDigest_(nouvelles,
    (config || CONFIG_COURANTE || {}).DIGEST_GROUPE_PAR);
  var lignes = ['Nouvelles opportunites detectees : ' + nouvelles.length, ''];
  var rang = 0;

  groupes.forEach(function (groupe) {
    if (groupe.titre) {
      lignes.push('== ' + groupe.titre.toUpperCase()
        + ' (' + groupe.annonces.length + ') ==', '');
    }
    // Le plus pertinent d'abord, puis le plus urgent : un recapitulatif de
    // trente lignes ne se lit que si les premieres sont les bonnes.
    groupe.annonces.forEach(function (o) {
      rang++;
      lignes.push(rang + '. ' + o.title
        + (o.pertinence ? '  [' + o.pertinence + ']' : ''));
      lignes.push('   Organisation : ' + (o.org || '-')
        + ' | Pays : ' + (o.country || '-')
        + ' | Deadline : ' + (o.deadline || 'a verifier'));
      if (o.url) lignes.push('   ' + o.url);
      lignes.push('');
    });
  });

  lignes.push(RAPPEL);
  return {
    sujet: '[TenderPilot] ' + nouvelles.length
      + ' nouvelles opportunites detectees',
    corps: lignes.join('\n'),
    html: digestHtml_(groupes, nouvelles.length)
  };
}

/**
 * Le recapitulatif, en HTML.
 *
 * Une carte par annonce, avec sa pastille de pertinence : le client doit
 * pouvoir sauter d'un coup d'oeil aux deux ou trois qui le concernent.
 * C'est le seul email qui peut contenir trente annonces - s'il n'est pas
 * scannable, il n'est pas lu.
 */
function digestHtml_(groupes, total) {
  var carte = function (o) {
    var statut = o.status || SCHEMA.STATUT_INCONNU;
    var fond = SCHEMA.COULEURS[statut]
      || SCHEMA.COULEURS[SCHEMA.STATUT_INCONNU];
    var infos = [o.org, o.country, o.deadline ? 'Deadline ' + o.deadline : '']
      .filter(function (v) { return v; }).map(echapperHtml_).join(' &middot; ');
    var titre = o.url
      ? '<a href="' + echapperHtml_(o.url) + '" style="color:' + MARINE_EMAIL
        + ';text-decoration:none">' + echapperHtml_(o.title) + '</a>'
      : echapperHtml_(o.title);
    return '<tr><td style="padding:0 0 10px">'
      + '<div style="border-left:4px solid ' + fond + ';padding:2px 0 2px 12px">'
      + '<div style="font-size:15px;font-weight:bold">' + titre + '</div>'
      + '<div style="font-size:13px;color:#4A5665;margin-top:2px">'
      + infos + (o.pertinence
          ? ' &middot; <b>' + echapperHtml_(o.pertinence) + '</b>' : '')
      + '</div></div></td></tr>';
  };

  var corps = groupes.map(function (groupe) {
    // UN INTITULE DE RUBRIQUE, quand il y a plus d'un groupe. Poser un
    // titre au-dessus d'un groupe unique n'apprend rien et ajoute du bruit.
    var entete = (groupe.titre && groupes.length > 1)
      ? '<tr><td style="padding:14px 0 8px">'
        + '<div style="font-size:12px;letter-spacing:.08em;'
        + 'text-transform:uppercase;color:' + MARINE_EMAIL + ';font-weight:bold;'
        + 'border-bottom:1px solid #D5DBE3;padding-bottom:5px">'
        + echapperHtml_(groupe.titre) + ' &middot; ' + groupe.annonces.length
        + '</div></td></tr>'
      : '';
    return entete + groupe.annonces.map(carte).join('');
  }).join('');

  return '<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,'
    + 'sans-serif;max-width:620px;color:' + ENCRE_EMAIL + ';line-height:1.5">'
    + enteteMarque_()
    + '<h2 style="font-size:18px;color:' + MARINE_EMAIL + ';margin:0 0 16px">'
    + total + ' nouvelles opportunites</h2>'
    + '<table style="border-collapse:collapse;width:100%">' + corps
    + '</table>'
    + '<p style="font-size:12px;color:#4A5665;border-top:1px solid #D5DBE3;'
    + 'padding-top:12px;margin:16px 0 0">' + echapperHtml_(RAPPEL) + '</p></div>';
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
 * Combien d'alertes cette execution a-t-elle le droit d'envoyer ?
 *
 * MESURE DU 2026-09-02 : sur une feuille vierge, la premiere collecte
 * ramene 239 annonces dont 28 a moins de sept jours. Le digest ramene les
 * 239 nouveautes a UN email - mais les 28 rappels d'echeance partaient un
 * par un, d'un coup. En regime courant il en part un ou deux par jour ;
 * c'est le premier passage qui concentre tout.
 *
 * On ne les perd pas, on les ETALE : au-dela du plafond, l'execution
 * s'arrete d'envoyer et NE MARQUE RIEN. Les alertes non parties repartent
 * telles quelles au passage suivant, dans le meme ordre. Rien n'est
 * supprime, rien n'est envoye deux fois.
 *
 * Le plafond tient compte de ce que Google laisse encore : le quota est
 * compte en DESTINATAIRES, pas en messages, et une liste de trois adresses
 * consomme trois unites par envoi. Depasser ne fait pas planter la collecte
 * - l'echec est attrape et journalise - mais l'alerte serait marquee comme
 * envoyee sans l'etre. La verifier avant vaut mieux que la perdre.
 */
function plafondEnvois_(config, destinataires) {
  var demande = Number(config.MAX_EMAILS_PAR_EXECUTION);
  // 0 ou absent : aucun plafond voulu par le client.
  var plafond = isFinite(demande) && demande > 0 ? Math.floor(demande) : Infinity;

  var parAdresse = Math.max(1, String(destinataires || '').split(',')
    .filter(function (a) { return a.trim(); }).length);
  try {
    // MailApp n'existe pas hors de Google : le banc d'essai s'en passe.
    if (typeof MailApp !== 'undefined' && MailApp.getRemainingDailyQuota) {
      var reste = Number(MailApp.getRemainingDailyQuota());
      if (isFinite(reste)) {
        plafond = Math.min(plafond, Math.floor(reste / parAdresse));
      }
    }
  } catch (e) {
    // Quota illisible : on s'en tient au plafond configure.
  }
  return plafond;
}

/**
 * Le plafond de Telegram, qui n'obeit pas aux memes contraintes.
 *
 * Pas de quota journalier a menager ici : l'API Telegram tolere une
 * trentaine de messages par seconde vers un meme salon. Le plafond n'est
 * donc pas une protection technique, c'est un REGLAGE DE CONFORT - a
 * quelle cadence le client accepte de voir son salon sonner.
 *
 * Vide ou 0 : aucun plafond, comme avant l'existence de ce reglage.
 */
function plafondTelegram_(config) {
  var demande = Number(config.MAX_TELEGRAM_PAR_EXECUTION);
  return isFinite(demande) && demande > 0 ? Math.floor(demande) : Infinity;
}

/**
 * Le recapitulatif des RAPPELS d'echeance.
 *
 * POURQUOI IL EXISTE. Les nouveautes tenaient deja en un mail ; les rappels
 * partaient un par un. Sur un classeur bien rempli, un passage peut en
 * declencher vingt d'un coup - vingt mails, et le quota Google de cent
 * destinataires par jour y passe en trois jours.
 *
 * MESURE DU 2026-09-09, signalee par un client : "les rappels c'est bon,
 * mais ca epuise le quota". Le probleme n'etait pas leur contenu, c'etait
 * leur NOMBRE. On ne coupe donc rien - on met tout dans un seul message,
 * du plus urgent au moins urgent.
 *
 * Les entrees sont des couples { ligne, types } : une meme ligne peut
 * porter un rappel et une expiration.
 */
function messageRappels(entrees) {
  var lignes = ['Echeances a surveiller : ' + entrees.length, ''];

  entrees.forEach(function (e, i) {
    var o = e.ligne;
    var reste = o.days;
    var quand = (reste === null || reste === undefined || reste === '')
      ? 'echeance a verifier'
      : (Number(reste) < 0 ? 'echeance passee'
         : Number(reste) === 0 ? "dernier jour"
         : 'dans ' + reste + ' jour' + (Number(reste) > 1 ? 's' : ''));

    lignes.push((i + 1) + '. ' + o.title + '  [' + quand + ']');
    lignes.push('   Organisation : ' + (o.org || '-')
      + ' | Pays : ' + (o.country || '-')
      + ' | Deadline : ' + (o.deadline || 'a verifier'));
    if (o.url) lignes.push('   ' + o.url);
    lignes.push('');
  });

  lignes.push(RAPPEL);
  return {
    sujet: '[TenderPilot] ' + entrees.length + ' echeance(s) a surveiller',
    corps: lignes.join('\n'),
    html: rappelsHtml_(entrees),
    telegram: telegramRappels_(entrees)
  };
}

/** Le meme, en cartes colorees par urgence. */
function rappelsHtml_(entrees) {
  var cartes = entrees.map(function (e) {
    var o = e.ligne;
    var statut = o.status || SCHEMA.STATUT_INCONNU;
    var fond = SCHEMA.COULEURS[statut]
      || SCHEMA.COULEURS[SCHEMA.STATUT_INCONNU];
    var infos = [o.org, o.country, o.deadline ? 'Deadline ' + o.deadline : '']
      .filter(function (v) { return v; }).map(echapperHtml_).join(' &middot; ');
    var titre = o.url
      ? '<a href="' + echapperHtml_(o.url) + '" style="color:' + MARINE_EMAIL
        + ';text-decoration:none">' + echapperHtml_(o.title) + '</a>'
      : echapperHtml_(o.title);
    return '<tr><td style="padding:0 0 10px">'
      + '<div style="border-left:4px solid ' + fond + ';padding:2px 0 2px 12px">'
      + '<div style="font-size:15px;font-weight:bold">' + titre + '</div>'
      + '<div style="font-size:13px;color:#4A5665;margin-top:2px">' + infos
      + ' &middot; <b>' + echapperHtml_(statut) + '</b></div></div></td></tr>';
  }).join('');

  return '<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,'
    + 'sans-serif;max-width:620px;color:' + ENCRE_EMAIL + ';line-height:1.5">'
    + enteteMarque_()
    + '<h2 style="font-size:18px;color:' + MARINE_EMAIL + ';margin:0 0 16px">'
    + entrees.length + ' echeances a surveiller</h2>'
    + '<table style="border-collapse:collapse;width:100%">' + cartes
    + '</table>'
    + '<p style="font-size:12px;color:#4A5665;border-top:1px solid #D5DBE3;'
    + 'padding-top:12px;margin:16px 0 0">' + echapperHtml_(RAPPEL) + '</p></div>';
}

/** Et pour le salon : court, comme tout ce qui part sur Telegram. */
function telegramRappels_(entrees) {
  var lignes = ['<b>' + entrees.length + ' echeances a surveiller</b>', ''];
  entrees.slice(0, 10).forEach(function (e, i) {
    var o = e.ligne;
    lignes.push((i + 1) + '. ' + String(o.title || '')
      + (o.deadline ? ' - ' + o.deadline : ''));
  });
  if (entrees.length > 10) {
    lignes.push('', '... et ' + (entrees.length - 10) + ' autres.');
  }
  return lignes.join('\n');
}

/**
 * Envoie ce qui doit l'etre, sur les canaux configures.
 *
 * Email et Telegram partagent les memes regles de DECLENCHEMENT - une
 * opportunite ne previent jamais deux fois par le meme canal - mais tout
 * le reste leur est propre : leur plafond, leur compteur, leur memoire.
 * Si Telegram est en panne les emails partent quand meme, si l'email est
 * plafonne Telegram continue, et aucun des deux ne renvoie ce qu'il a
 * deja envoye.
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

  // CHAQUE CANAL AVANCE A SON RYTHME. L'email est contraint par le quota
  // Google et par une boite aux lettres qu'on noie vite ; Telegram n'a ni
  // l'un ni l'autre. Les tenir au meme rythme obligeait a regler les deux
  // sur le plus etroit - et un salon Telegram qui pourrait tout recevoir
  // n'en recevait que vingt.
  //
  // Chaque canal a donc son plafond, son compteur, et SA MEMOIRE : une
  // alerte partie sur Telegram mais pas encore par email laisse la case
  // Notif_* a 'telegram', et l'email partira au passage suivant sans
  // renvoyer Telegram. Voir canauxNotifies_ dans Core.gs.
  var canaux = [];
  if (parEmail) {
    canaux.push({
      nom: 'email',
      plafond: plafondEnvois_(config, destinataire),
      envoyes: 0,
      reportees: 0,
      envoyer: function (message) {
        sendEmail(destinataire, message.sujet, message.corps, message.html);
      }
    });
  }
  if (parTelegram) {
    canaux.push({
      nom: 'telegram',
      plafond: plafondTelegram_(config),
      envoyes: 0,
      reportees: 0,
      envoyer: function (message) {
        envoyerTelegram_(config, message.telegram);
      }
    });
  }

  // NOTIFIER_PERTINENCE coupe le bruit dans la boite, PAS dans le tableau.
  // Une annonce ecartee ici reste dans le classeur, avec sa couleur et son
  // echeance : c'est la meme regle que partout, on etiquette, on ne
  // supprime pas.
  var aNotifier = nouvelles.filter(function (o) {
    return pertinenceNotifiable(o.pertinence, config);
  });

  var seuilDigest = Number(config.DIGEST_THRESHOLD) || 5;
  var envoiGroupe = aNotifier.length > seuilDigest
    && estVrai(config.SEND_NEW_OPPORTUNITY);
  var envoyes = 0;

  /** Un envoi sur un canal ; son echec n'arrete jamais l'autre canal. */
  function emettre_(canal, source, action, message) {
    try {
      canal.envoyer(message);
      canal.envoyes++;
      envoyes++;
      return true;
    } catch (e) {
      logEvent(source, action + ' (' + canal.nom + ')', 'ERROR', e.message);
      // L'envoi a echoue : le canal n'a rien servi, et ne doit pas etre
      // marque. La ligne repassera au prochain passage.
      return false;
    }
  }

  if (envoiGroupe) {
    // Meme raison qu'au cas par cas : un digest qu'on ne sait pas composer
    // ne doit pas emporter l'execution avec lui.
    var messageDigest_ = null;
    try {
      var digest = messageDigest(aNotifier, config);
      messageDigest_ = {
        sujet: digest.sujet, corps: digest.corps, html: digest.html,
        telegram: messageTelegramDigest(aNotifier)
      };
    } catch (e) {
      logEvent('', 'Digest', 'ERROR', 'Digest non compose : ' + e.message);
      envoiGroupe = false;
    }
    if (messageDigest_) {
      canaux.forEach(function (canal) {
        // Le digest compte pour un message sur chaque canal. Un plafond a 0
        // n'existe pas - plafondEnvois_ rend Infinity - mais un quota Google
        // epuise, si.
        if (canal.envoyes + 1 > canal.plafond) { canal.reportees++; return; }
        emettre_(canal, '', 'Digest', messageDigest_);
      });
      logEvent('', 'Notifications', 'SUCCESS',
               'Digest de ' + aNotifier.length + ' nouvelles opportunites.');
    }
  }

  // LE PLUS PERTINENT, PUIS LE PAYS LE MIEUX PLACE, PUIS LE PLUS URGENT.
  // Quand le plafond coupe, ce qui part est ce qui compte.
  var ecartees = 0;
  var ordonnees = parPertinence_(lignes, config);

  // LES RAPPELS TIENNENT EN UN MAIL QUAND ILS SONT NOMBREUX.
  //
  // Les nouveautes avaient leur digest ; les rappels partaient un par un.
  // Sur un classeur bien rempli, un passage peut en declencher vingt d'un
  // coup - et le quota Google de cent destinataires par jour y passe en
  // trois jours. Mesure du 2026-09-09, signalee par un client : le
  // probleme n'etait pas leur contenu mais leur NOMBRE.
  //
  // On ne coupe donc rien : au-dela du seuil, tout entre dans un seul
  // message, dans le meme ordre. Un rappel groupe reste un rappel ; vingt
  // mails ne sont plus des rappels, c'est une avalanche.
  var candidats = [];
  ordonnees.forEach(function (ligne) {
    if (!pertinenceNotifiable(ligne.pertinence, config)) return;
    // On regarde le premier canal : les regles de declenchement sont les
    // memes partout, seule la memoire differe.
    var plan = notificationsAEnvoyer(ligne, config, canaux[0].nom);
    var types = plan.envoyer.filter(function (type) {
      return type !== 'new' && type !== 'expired';
    });
    if (types.length) candidats.push({ ligne: ligne, types: types });
  });

  var rappelsGroupes = candidats.length > seuilDigest;
  if (rappelsGroupes) {
    var messageRappels_ = null;
    try {
      messageRappels_ = messageRappels(candidats);
    } catch (e) {
      logEvent('', 'Rappels', 'ERROR', 'Recapitulatif non compose : '
               + e.message);
      rappelsGroupes = false;
    }
    if (messageRappels_) {
      canaux.forEach(function (canal) {
        if (canal.envoyes + 1 > canal.plafond) { canal.reportees++; return; }
        if (emettre_(canal, '', 'Rappels', messageRappels_)) {
          // MARQUER APRES L'ENVOI, ET SEULEMENT CE QUI EST PARTI : c'est la
          // meme regle que partout. Un recapitulatif qui n'a pas pu partir
          // ne doit rien marquer.
          candidats.forEach(function (c) {
            marquerNotifications_(c.ligne, c.types, canal.nom);
          });
        }
      });
      logEvent('', 'Rappels', 'SUCCESS',
               'Recapitulatif de ' + candidats.length + ' echeance(s), '
               + 'au lieu d autant de mails.');
    }
  }

  ordonnees.forEach(function (ligne) {
    // ON NE MARQUE RIEN. Le niveau de pertinence d'une ligne change quand
    // le client change ses pays ou ses secteurs : marquer ici lui
    // interdirait de recevoir plus tard une alerte qu'il vient tout juste
    // de demander.
    var notifiable = pertinenceNotifiable(ligne.pertinence, config);
    var comptee = false;

    canaux.forEach(function (canal) {
      var plan = notificationsAEnvoyer(ligne, config, canal.nom);
      if (!plan.marquer.length) return;

      if (!notifiable) {
        // Une ligne ecartee ne l'est qu'une fois dans le journal, meme
        // quand deux canaux la voient passer.
        if (!comptee) { ecartees++; comptee = true; }
        return;
      }

      // Ce qui est deja couvert par un recapitulatif ne coute pas un
      // message de plus.
      var aEnvoyer = plan.envoyer.filter(function (type) {
        if (type === 'new') return !envoiGroupe;
        if (type === 'expired') return true;
        return !rappelsGroupes;
      });

      // Plafond atteint : ON NE MARQUE RIEN, sur ce canal. La ligne
      // repassera identique au prochain passage, et son alerte partira
      // alors. L'autre canal, lui, continue.
      if (aEnvoyer.length && canal.envoyes + aEnvoyer.length > canal.plafond) {
        canal.reportees++;
        return;
      }

      var tousPartis = true;
      aEnvoyer.forEach(function (type) {
        // LA FABRICATION DU MESSAGE EST DANS LE try, PAS SEULEMENT L'ENVOI.
        // Seul emettre_ etait protege : une ligne mal formee - un champ
        // absent, une valeur inattendue - faisait tomber TOUTE l'execution
        // au moment de composer son texte, et avec elle les alertes des
        // lignes suivantes, le tri, et l'inventaire. Une annonce qu'on ne
        // sait pas mettre en forme doit couter une ligne de journal, pas
        // un passage.
        var message;
        try {
          message = messageNotification(type, ligne);
          message.telegram = messageTelegram(type, ligne);
        } catch (e) {
          logEvent(ligne.source, 'Notification ' + type, 'ERROR',
                   'Message non compose pour ' + (ligne.id || 'sans id')
                   + ' : ' + e.message);
          tousPartis = false;
          return;
        }
        if (!emettre_(canal, ligne.source, 'Notification ' + type, message)) {
          tousPartis = false;
        }
      });
      if (tousPartis) marquerNotifications_(ligne, plan.marquer, canal.nom);
    });
  });

  if (ecartees > 0) {
    logEvent('', 'Notifications', 'INFO',
             ecartees + ' alerte(s) non envoyee(s) : leur pertinence n est '
             + 'pas dans NOTIFIER_PERTINENCE. Les annonces restent dans le '
             + 'tableau.');
  }

  canaux.forEach(function (canal) {
    if (!canal.reportees) return;
    logEvent('', 'Notifications', 'INFO',
             canal.reportees + ' alerte(s) reportee(s) au prochain passage : '
             + 'plafond de ' + canal.plafond + ' message(s) ' + canal.nom
             + ' par execution atteint. Rien n est perdu.');
  });

  return envoyes;
}

// --------------------------------------------------------------- EXECUTION

/**
 * Fait juger les annonces nouvelles par le modele, quand il est configure.
 *
 * DEUX PRECAUTIONS PORTENT TOUT LE RESTE.
 *
 * On ne soumet que le NOUVEAU. Ce qui est deja suivi a deja son jugement ;
 * le renvoyer a chaque passage triplerait la facture du client sans rien
 * apprendre. En regime courant cela fait un ou deux appels par collecte.
 *
 * On n en perd aucune. Sans cle, en cas de panne du fournisseur, de reponse
 * illisible ou de plafond atteint, les annonces traversent intactes.
 * appliquerPreferences_ ne retire que ce que le modele a EXPLICITEMENT juge
 * non pertinent : une annonce sans jugement reste.
 *
 * Jumeau de classerNouvelles() dans web/src/lib/run.ts.
 */
function classerNouvelles_(annonces, existantes, config) {
  var index = construireIndex(existantes);
  var nouvelles = annonces.filter(function (a) {
    return !trouverDoublon(a, index);
  });
  if (!nouvelles.length) return annonces;

  var r = classerAnnonces_(nouvelles, config);
  if (!r.actif) return annonces;

  logEvent('', 'Classement', 'SUCCESS',
    nouvelles.length + ' annonce(s) jugee(s) en ' + r.appels + ' appel(s), '
    + r.ecartees + ' ecartee(s)');

  // Les annonces deja connues repassent telles quelles : elles ne sont ni
  // jugees ni filtrees, leur ligne existe et ne doit pas disparaitre.
  var dejaVues = annonces.filter(function (a) {
    return nouvelles.indexOf(a) === -1;
  });
  return dejaVues.concat(r.annonces);
}

/**
 * Vide le tableau des opportunites ET le journal, sur confirmation.
 *
 * A QUOI CA SERT. Refaire un essai propre : effacer trois cents lignes a la
 * main n'est pas raisonnable, et supprimer les lignes une par une casse la
 * mise en forme du tableau.
 *
 * LE JOURNAL PART AVEC, et ce n'est pas un detail. Apres un vidage, la
 * collecte reprend tout depuis zero : un journal qui melangerait les lignes
 * de l'essai precedent avec celles du nouveau ne se lirait plus. Il est
 * efface AVANT que le vidage soit journalise - la premiere ligne du journal
 * neuf dit donc ce qui vient de se passer.
 *
 * CE QUE CA EFFACE ENCORE, et pourquoi la confirmation le dit. Les temoins
 * d'envoi (Notif_Nouvelle, Notif_J7...) partent avec les lignes : la
 * prochaine collecte renverra les alertes des memes opportunites. Sur une
 * adresse gmail.com ordinaire, cela consomme a nouveau du quota - d'ou le
 * plafond par execution.
 *
 * L'onglet SOURCES et la CONFIG ne sont JAMAIS touches : on remet a zero le
 * resultat, jamais le reglage.
 */
function viderOpportunites() {
  var ui = SpreadsheetApp.getUi();
  var lignes = lireOpportunites().length;

  if (!lignes) {
    ui.alert(MENU, 'Le tableau est deja vide.', ui.ButtonSet.OK);
    return 0;
  }

  var reponse = ui.alert(
    MENU,
    'Effacer les ' + lignes + ' opportunite(s) et tout le journal ?\n\n'
    + 'Les temoins d envoi partent avec les lignes : la prochaine collecte '
    + 'renverra les alertes de ces memes opportunites.\n\n'
    + 'Vos sources et votre configuration ne sont pas touchees.\n\n'
    + 'Cette action ne peut pas etre annulee.',
    ui.ButtonSet.YES_NO);

  if (reponse !== ui.Button.YES) {
    ui.alert(MENU, 'Rien n a ete efface.', ui.ButtonSet.OK);
    return 0;
  }

  var effacees = viderOpportunites_();
  // Le journal est vide AVANT d'etre reecrit : la ligne ci-dessous est la
  // premiere du journal neuf, et elle dit ce qui vient d'etre efface.
  var journal = viderJournal_();
  logEvent('', 'Vidage', 'SUCCESS',
           effacees + ' opportunite(s) et ' + journal
           + ' ligne(s) de journal effacees a la demande de l utilisateur.');
  ecrireJournal_();
  SpreadsheetApp.getActiveSpreadsheet().toast(
    effacees + ' opportunite(s) effacee(s), journal remis a zero.', MENU, 5);
  return effacees;
}

/** Point d'entree unique : le declencheur et le menu appellent celui-ci. */
function executerTenderPilot() {
  CONFIG_COURANTE = lireConfig();
  var config = CONFIG_COURANTE;
  var resume = { nouvelles: 0, misesAJour: 0, emails: 0, suivies: 0,
                 agenda: 0 };

  try {
    // AVANT TOUT LE RESTE : les reglages nouveaux entrent dans l'onglet.
    // Un client qui recolle ses fichiers doit voir ce que la version
    // apporte, pas le deviner. Voir completerConfig_.
    completerConfig_();

    var existantes = lireOpportunites();
    // Le second temps de collecte ne relit pas la fiche d'une annonce deja
    // enregistree : chaque passage enrichit du NOUVEAU.
    // CE QUI EST DEJA AU CLASSEUR, PAR IDENTITE ET PAS SEULEMENT PAR LIEN.
    // Une source dont la liste ne porte pas le vrai lien - Fundpilote, dont
    // le lien du bailleur n'existe que sur la fiche - ne peut pas etre
    // reconnue par son adresse : celle du classeur est celle du bailleur,
    // celle de la liste est un identifiant d'API. Sans les cles d'identite,
    // sa fiche serait relue a CHAQUE passage, indefiniment.
    //
    // On reutilise clesDedup : la meme notion d'identite sert deja a ne pas
    // enregistrer deux fois la meme annonce.
    var connus = {};
    existantes.forEach(function (o) {
      clesDedup(o).forEach(function (cle) { connus[cle] = true; });
      var lien = normalizeText(o.url || '');
      if (lien) connus[lien] = true;
    });
    var annonces = classerNouvelles_(collectAllSources(config, connus),
                                     existantes, config);
    var bilan = saveOrUpdateOpportunity(annonces, existantes);
    resume.nouvelles = bilan.nouvelles.length;
    resume.misesAJour = bilan.misesAJour;

    var toutes = existantes.concat(bilan.nouvelles);
    resume.suivies = updateDeadlines(toutes, config);
    resume.emails = sendNotifications(toutes, config, bilan.nouvelles);

    // L'agenda APRES le recalcul des jours restants : une echeance corrigee
    // par la source doit etre posee a la bonne date. Et avant le tri, qui
    // deplace les lignes - synchroniserAgenda_ ecrit par numero de ligne.
    resume.agenda = synchroniserAgenda_(toutes, config);

    // L'inventaire vient APRES le recalcul de la pertinence : il montre
    // l'etat du jour, pas celui d'avant le passage.
    ecrireProfil_(toutes, config);

    // EN DERNIER, une fois toutes les ecritures faites : le tri deplace les
    // lignes, et plus rien ne doit les designer par leur numero apres lui.
    trierOpportunites_(toutes);

    logEvent('', 'Execution', 'SUCCESS',
      resume.nouvelles + ' nouvelle(s), ' + resume.misesAJour
      + ' mise(s) a jour, ' + resume.suivies + ' suivie(s), '
      + resume.emails + ' email(s).');
  } catch (e) {
    logEvent('', 'Execution', 'ERROR', e.message);
    // Le journal part AVANT de relancer l'erreur : sans cela, une execution
    // qui echoue n'expliquerait nulle part pourquoi.
    ecrireJournal_();
    throw e;
  }
  ecrireJournal_();
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
    // nearMinute(0) RESSERRE LA FENETRE. Sans lui, atHour(8) veut dire
    // "entre 8h00 et 9h00" : Google se reserve l'heure entiere et repartit
    // la charge de tous ses utilisateurs dedans. Mesure du 2026-09-03 :
    // l'execution de 8h est passee a 8h55, ce qui est conforme et
    // deroutant. Avec nearMinute, la fenetre tombe a plus ou moins quinze
    // minutes - 7h45 a 8h15.
    //
    // Elle ne tombera jamais a zero : un declencheur horaire n'est pas une
    // alarme, et le promettre au client serait mentir.
    ScriptApp.newTrigger(DECLENCHEUR).timeBased()
      .atHour(h).nearMinute(0).everyDays(1).create();
  });
  CONFIG_COURANTE = lireConfig();
  logEvent('', 'Declencheur', 'SUCCESS',
           'Execution automatique a ' + HEURES.join('h, ') + 'h, '
           + 'a quinze minutes pres.');
  ecrireJournal_();
  SpreadsheetApp.getActive().toast(
    'Execution automatique activee : ' + HEURES.join('h, ') + 'h, '
    + 'a quinze minutes pres.', MENU, 8);
}

function retirerDeclencheur() {
  retirerDeclencheur_();
  CONFIG_COURANTE = lireConfig();
  logEvent('', 'Declencheur', 'SUCCESS', 'Execution automatique desactivee.');
  SpreadsheetApp.getActive().toast('Execution automatique desactivee.', MENU, 8);
}
