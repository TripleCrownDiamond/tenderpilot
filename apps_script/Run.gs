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
    .addItem('Tester le classement intelligent', 'testerLlm')
    .addItem('Afficher / masquer l onglet SOURCES', 'basculerOngletSources')
    .addSeparator()
    .addItem('Vider les opportunites et le journal', 'viderOpportunites')
    .addToUi();
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
function completerParFiches_(annonces, analyseur, source, config, options,
                             connus) {
  var plafond = Number(config.MAX_FICHES_PAR_PASSAGE);
  if (!isFinite(plafond) || plafond < 0) plafond = 12;

  var sortie = [];
  var lues = 0;
  var reportees = 0;

  annonces.forEach(function (annonce) {
    // La liste a date cette annonce : sa fiche ne nous apprendrait rien.
    if (annonce.deadline) { sortie.push(annonce); return; }
    // Deja au classeur : elle y porte ce qu'une fiche lui avait donne.
    if (connus[normalizeText(annonce.url || '')]) { sortie.push(annonce); return; }

    if (lues >= plafond || !annonce.url) { reportees++; return; }

    lues++;
    try {
      var reponse = UrlFetchApp.fetch(annonce.url, options);
      if (reponse.getResponseCode() !== 200) { reportees++; return; }
      fusionnerFiche_(annonce, analyseur(corpsReponse_(reponse)));
      // Fiche lue mais toujours sans date : pour une source qui declare un
      // analyseur de fiche, cela veut dire "pas reussi a dater". On ne fait
      // pas entrer une ligne morte.
      if (annonce.deadline) sortie.push(annonce);
      else reportees++;
    } catch (e) {
      reportees++;
    }
  });

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
    .filter(function (o) { return o.title; });

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
  // Le plus pertinent d'abord, puis le plus urgent : un recapitulatif de
  // trente lignes ne se lit que si les premieres sont les bonnes.
  parPertinence_(nouvelles).forEach(function (o, i) {
    lignes.push((i + 1) + '. ' + o.title
      + (o.pertinence ? '  [' + o.pertinence + ']' : ''));
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

  // Le plafond ne compte que les EMAILS. Telegram n'a pas de quota
  // journalier et un salon ne se noie pas comme une boite aux lettres.
  var plafond = parEmail ? plafondEnvois_(config, destinataire) : Infinity;
  var emailsEnvoyes = 0;
  var reportees = 0;

  /** Diffuse sur les deux canaux ; l'echec de l'un n'arrete pas l'autre. */
  function diffuser(source, action, sujet, corps, texteTelegram) {
    if (parEmail) {
      try {
        sendEmail(destinataire, sujet, corps);
        emailsEnvoyes++;
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
    var digest = messageDigest(aNotifier);
    diffuser('', 'Digest', digest.sujet, digest.corps,
             messageTelegramDigest(aNotifier));
    logEvent('', 'Notifications', 'SUCCESS',
             'Digest de ' + aNotifier.length + ' nouvelles opportunites.');
  }

  // LE PLUS PERTINENT ET LE PLUS URGENT D'ABORD. Quand le plafond coupe,
  // ce qui part est ce qui compte, et ce qui attend est le reste.
  var ecartees = 0;

  parPertinence_(lignes).forEach(function (ligne) {
    var plan = notificationsAEnvoyer(ligne, config);
    if (!plan.marquer.length) return;

    // ON NE MARQUE RIEN. Le niveau de pertinence d'une ligne change quand
    // le client change ses pays ou ses secteurs : marquer ici lui
    // interdirait de recevoir plus tard une alerte qu'il vient tout juste
    // de demander.
    if (!pertinenceNotifiable(ligne.pertinence, config)) {
      ecartees++;
      return;
    }

    // Combien d'emails cette ligne demande-t-elle vraiment ? Ce qui est
    // deja couvert par le digest ne coute rien.
    var aEnvoyer = plan.envoyer.filter(function (type) {
      return !(type === 'new' && envoiGroupe);
    });

    // Plafond atteint : ON NE MARQUE RIEN. La ligne repassera identique au
    // prochain passage, et son alerte partira alors.
    if (parEmail && aEnvoyer.length
        && emailsEnvoyes + aEnvoyer.length > plafond) {
      reportees++;
      return;
    }

    aEnvoyer.forEach(function (type) {
      var message = messageNotification(type, ligne);
      diffuser(ligne.source, 'Notification ' + type,
               message.sujet, message.corps, messageTelegram(type, ligne));
    });
    marquerNotifications_(ligne, plan.marquer);
  });

  if (ecartees > 0) {
    logEvent('', 'Notifications', 'INFO',
             ecartees + ' alerte(s) non envoyee(s) : leur pertinence n est '
             + 'pas dans NOTIFIER_PERTINENCE. Les annonces restent dans le '
             + 'tableau.');
  }

  if (reportees > 0) {
    logEvent('', 'Notifications', 'INFO',
             reportees + ' alerte(s) reportee(s) au prochain passage : '
             + 'plafond de ' + plafond + ' email(s) par execution atteint. '
             + 'Rien n est perdu.');
  }

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
  var resume = { nouvelles: 0, misesAJour: 0, emails: 0, suivies: 0 };

  try {
    var existantes = lireOpportunites();
    // Le second temps de collecte ne relit pas la fiche d'une annonce deja
    // enregistree : chaque passage enrichit du NOUVEAU.
    var connus = {};
    existantes.forEach(function (o) {
      var cle = normalizeText(o.url || '');
      if (cle) connus[cle] = true;
    });
    var annonces = classerNouvelles_(collectAllSources(config, connus),
                                     existantes, config);
    var bilan = saveOrUpdateOpportunity(annonces, existantes);
    resume.nouvelles = bilan.nouvelles.length;
    resume.misesAJour = bilan.misesAJour;

    var toutes = existantes.concat(bilan.nouvelles);
    resume.suivies = updateDeadlines(toutes, config);
    resume.emails = sendNotifications(toutes, config, bilan.nouvelles);

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
