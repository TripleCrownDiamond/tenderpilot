/**
 * TenderPilot - synchronisation du catalogue de sources.
 *
 * Le classeur est installe une fois, puis vit sa vie. Les sources, elles,
 * bougent : une adresse change, un site nouveau est ajoute, une extraction
 * est reparee. Sans ce fichier, la seule facon d'en profiter serait de
 * recreer le classeur - et de perdre les opportunites deja collectees.
 *
 * La synchronisation suit trois regles, dans cet ordre de priorite :
 *
 *   1. On n'efface jamais une ligne. Une source ajoutee a la main par
 *      l'utilisateur reste, meme si elle n'est pas au catalogue.
 *   2. On ne touche jamais a la colonne Active. C'est le choix de
 *      l'utilisateur, pas celui du catalogue.
 *   3. On met a jour ce qui est technique - nom, adresse, methode, statut de
 *      verification - parce que c'est nous qui le savons.
 *
 * Ce fichier touche au classeur : contrairement a Core.gs, Rss.gs, Html.gs
 * et Json.gs, il n'est pas testable hors de Google.
 */

/**
 * Colonnes que la synchronisation a le droit de reecrire.
 *
 * "active" en est volontairement absente : desactiver une source est une
 * decision de l'utilisateur, qu'une mise a jour ne doit jamais annuler.
 * "lastRun" non plus : c'est une trace d'execution, pas une donnee livree.
 */
var CHAMPS_SYNCHRONISES = ['name', 'method', 'url', 'country', 'sector',
                           'type', 'status'];

/** Synchronise, puis rend compte a l'utilisateur. */
function synchroniserSources() {
  var bilan = appliquerCatalogue_();
  var lignes = [
    'Catalogue livre : ' + bilan.catalogue + ' sources.',
    '',
    bilan.ajoutees + ' ajoutee(s)',
    bilan.majs + ' mise(s) a jour',
    bilan.inchangees + ' inchangee(s)'
  ];
  if (bilan.propres > 0) {
    lignes.push(bilan.propres + ' source(s) a vous, laissee(s) intacte(s)');
  }
  var ui = SpreadsheetApp.getUi();
  ui.alert(MENU, lignes.join('\n'), ui.ButtonSet.OK);
  return bilan;
}

/**
 * Aligne l'onglet SOURCES sur le catalogue livre avec cette version.
 *
 * Separee de synchroniserSources pour pouvoir etre appelee sans interface :
 * par l'installation, ou par un declencheur.
 */
function appliquerCatalogue_() {
  var catalogue = SCHEMA.SOURCES_LIVREES || [];
  var feuille = getSheet_(SCHEMA.SHEETS.sources);
  var carte = entetes_(feuille);
  var largeur = feuille.getLastColumn();
  var colId = carte[SCHEMA.SRC.id];

  var dernier = feuille.getLastRow();
  var existantes = dernier > 1
    ? feuille.getRange(2, 1, dernier - 1, largeur).getValues()
    : [];

  // Ou se trouve chaque source deja presente, par identifiant.
  var rangs = {};
  existantes.forEach(function (ligne, i) {
    var id = String(ligne[colId - 1] || '').trim();
    // Meme filtre que lireSources : la note d'aide de bas de tableau n'est
    // pas une source, et ne doit pas etre comptee comme une source a vous.
    if (estIdSource(id)) rangs[id] = i + 2;
  });

  var bilan = { catalogue: catalogue.length, ajoutees: 0, majs: 0,
                inchangees: 0, propres: 0 };
  var connus = {};
  var aAjouter = [];

  catalogue.forEach(function (source) {
    var id = String(source[colId - 1] || '').trim();
    if (!id) return;
    connus[id] = true;

    var rang = rangs[id];
    if (!rang) {
      aAjouter.push(source);
      bilan.ajoutees++;
      return;
    }

    var change = false;
    CHAMPS_SYNCHRONISES.forEach(function (cle) {
      var col = carte[SCHEMA.SRC[cle]];
      if (!col) return;
      var brut = source[col - 1];
      var neuf = String(brut === null || brut === undefined ? '' : brut).trim();
      // Une valeur vide au catalogue n'efface pas ce qui est en place :
      // l'utilisateur a pu renseigner un secteur que nous ignorons.
      if (!neuf) return;
      var ancien = String(feuille.getRange(rang, col).getValue() || '').trim();
      if (neuf !== ancien) {
        feuille.getRange(rang, col).setValue(neuf);
        change = true;
      }
    });
    if (change) bilan.majs++; else bilan.inchangees++;
  });

  if (aAjouter.length) {
    feuille.getRange(feuille.getLastRow() + 1, 1, aAjouter.length, largeur)
      .setValues(aAjouter.map(function (source) {
        // Le catalogue peut etre plus court ou plus long que l'entete.
        var ligne = source.slice(0, largeur);
        while (ligne.length < largeur) ligne.push('');
        return ligne;
      }));
  }

  // Ce que l'utilisateur a ajoute lui-meme : on le compte, on n'y touche pas.
  Object.keys(rangs).forEach(function (id) {
    if (!connus[id]) bilan.propres++;
  });

  logEvent(null, 'Synchronisation', 'SUCCESS',
    bilan.ajoutees + ' ajoutee(s), ' + bilan.majs + ' mise(s) a jour, '
    + bilan.propres + ' source(s) propre(s) preservee(s)');
  // Hors execution, personne d'autre ne videra le tampon du journal.
  ecrireJournal_();
  return bilan;
}

/**
 * Montre ou masque l'onglet SOURCES.
 *
 * L'onglet est desormais livre VISIBLE. Il a longtemps ete masque - c'etait
 * de la plomberie - mais sa colonne Active est le seul endroit ou le client
 * choisit ce qu'il surveille : mettre une commande de menu devant le
 * reglage le plus utile du produit etait une marche de trop.
 *
 * Cette bascule reste, pour qui veut le ranger une fois sa selection faite.
 */
function basculerOngletSources() {
  var feuille = getSheet_(SCHEMA.SHEETS.sources);
  var etaitMasque = feuille.isSheetHidden();
  if (etaitMasque) {
    feuille.showSheet();
    feuille.activate();
  } else {
    feuille.hideSheet();
  }
  SpreadsheetApp.getActiveSpreadsheet().toast(
    etaitMasque ? 'Onglet SOURCES affiche.' : 'Onglet SOURCES masque.',
    MENU, 5);
}
