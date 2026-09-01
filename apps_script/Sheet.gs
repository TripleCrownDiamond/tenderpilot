/**
 * TenderPilot - acces au classeur.
 *
 * Performance (section 29) : on lit la feuille UNE fois par execution, on
 * travaille en memoire, puis on ecrit en bloc. Aucune boucle n'appelle
 * getRange cellule par cellule sur toute la feuille.
 *
 * Robustesse : une colonne est toujours retrouvee par son nom, jamais par
 * sa position. Deplacer une colonne ne casse rien.
 */

// Configuration chargee une seule fois par execution, par Run.gs.
var CONFIG_COURANTE = {};

function getSheet_(nom) {
  var feuille = SpreadsheetApp.getActive().getSheetByName(nom);
  if (!feuille) {
    throw new Error('Onglet "' + nom + '" introuvable. Ce fichier n est pas '
      + 'un classeur TenderPilot, ou un onglet a ete renomme.');
  }
  return feuille;
}

/** { nom de colonne: index 1-based } */
function entetes_(feuille) {
  var largeur = feuille.getLastColumn();
  if (largeur < 1) return {};
  var carte = {};
  feuille.getRange(1, 1, 1, largeur).getValues()[0].forEach(function (nom, i) {
    if (nom) carte[String(nom).trim()] = i + 1;
  });
  return carte;
}

// ------------------------------------------------------------------- temps

/** Date du jour dans le fuseau configure - section 33. */
function aujourdhui_() {
  return Utilities.formatDate(new Date(),
    String(CONFIG_COURANTE.TIMEZONE || 'Africa/Porto-Novo'), 'yyyy-MM-dd');
}

function maintenant_() {
  return Utilities.formatDate(new Date(),
    String(CONFIG_COURANTE.TIMEZONE || 'Africa/Porto-Novo'), 'yyyy-MM-dd HH:mm');
}

// ------------------------------------------------------------------ CONFIG

/** Toute la configuration, en un seul objet { CLE: valeur }. */
function lireConfig() {
  var feuille = getSheet_(SCHEMA.SHEETS.config);
  var dernier = feuille.getLastRow();
  var config = {};
  if (dernier < 2) return config;
  feuille.getRange(2, 1, dernier - 1, 2).getValues().forEach(function (r) {
    if (!estVide(r[0])) config[String(r[0]).trim()] = r[1];
  });
  return config;
}

// ----------------------------------------------------------------- SOURCES

/** Sources declarees, converties en objets a cles techniques. */
function lireSources() {
  var feuille = getSheet_(SCHEMA.SHEETS.sources);
  var dernier = feuille.getLastRow();
  if (dernier < 2) return [];
  var carte = entetes_(feuille);

  return feuille.getRange(2, 1, dernier - 1, feuille.getLastColumn())
    .getValues()
    .map(function (ligne, i) {
      var o = { _row: i + 2 };
      Object.keys(SCHEMA.SRC).forEach(function (cle) {
        var idx = carte[SCHEMA.SRC[cle]];
        o[cle] = idx ? ligne[idx - 1] : '';
      });
      return o;
    })
    .filter(function (s) { return !estVide(s.id); });
}

/** Trace le resultat de la collecte sur la ligne de la source. */
function majSource_(source, statut) {
  var feuille = getSheet_(SCHEMA.SHEETS.sources);
  var carte = entetes_(feuille);
  if (carte[SCHEMA.SRC.lastRun]) {
    feuille.getRange(source._row, carte[SCHEMA.SRC.lastRun])
           .setValue(maintenant_());
  }
  if (carte[SCHEMA.SRC.status]) {
    feuille.getRange(source._row, carte[SCHEMA.SRC.status]).setValue(statut);
  }
}

// ----------------------------------------------------------- OPPORTUNITIES

function feuilleOpp_() {
  return getSheet_(SCHEMA.SHEETS.opportunities);
}

/** Toutes les opportunites, lues en une seule fois. */
function lireOpportunites() {
  var feuille = feuilleOpp_();
  var dernier = feuille.getLastRow();
  if (dernier < 2) return [];
  var carte = entetes_(feuille);

  return feuille.getRange(2, 1, dernier - 1, feuille.getLastColumn())
    .getValues()
    .map(function (ligne, i) {
      var o = { _row: i + 2 };
      Object.keys(SCHEMA.OPP).forEach(function (cle) {
        var idx = carte[SCHEMA.OPP[cle]];
        o[cle] = idx ? ligne[idx - 1] : '';
      });
      o.deadline = jour(o.deadline);
      o.published = jour(o.published);
      return o;
    })
    .filter(function (o) { return !estVide(o.id); });
}

/** Objet -> ligne de tableau, selon l'ordre reel des en-tetes. */
function versLigne_(carte, largeur, valeurs) {
  var ligne = [];
  for (var i = 0; i < largeur; i++) ligne.push('');
  Object.keys(valeurs).forEach(function (cle) {
    var nom = SCHEMA.OPP[cle];
    if (nom && carte[nom]) ligne[carte[nom] - 1] = valeurs[cle];
  });
  return ligne;
}

/**
 * Ajoute plusieurs opportunites en UNE seule ecriture.
 * Les enregistrements recoivent leur id et leur numero de ligne.
 */
function ajouterOpportunites_(nouvelles, existantes) {
  if (!nouvelles.length) return [];
  var feuille = feuilleOpp_();
  var carte = entetes_(feuille);
  var largeur = feuille.getLastColumn();

  // Derniere ligne REELLE : getLastRow() peut compter des lignes mises en
  // forme mais vides.
  var depart = 2;
  existantes.forEach(function (o) { if (o._row >= depart) depart = o._row + 1; });

  var horodatage = maintenant_();
  var jourCourant = aujourdhui_();
  var connues = existantes.slice();
  var lignes = [];

  nouvelles.forEach(function (opp) {
    opp.id = prochainId(connues);
    opp.addedAt = horodatage;
    opp.updatedAt = horodatage;
    opp.days = joursRestants(opp.deadline, jourCourant);
    opp.status = statutDelai(opp.days);
    if (opp.days === null) opp.days = '';
    connues.push(opp);
    lignes.push(versLigne_(carte, largeur, opp));
  });

  feuille.getRange(depart, 1, lignes.length, largeur).setValues(lignes);
  nouvelles.forEach(function (opp, i) { opp._row = depart + i; });
  return nouvelles;
}

/** Applique des champs modifies a une ligne existante - section 8. */
function majLigne_(ligne, champs) {
  var cles = Object.keys(champs);
  if (!cles.length) return 0;
  var feuille = feuilleOpp_();
  var carte = entetes_(feuille);

  cles.forEach(function (cle) {
    var nom = SCHEMA.OPP[cle];
    if (nom && carte[nom]) {
      feuille.getRange(ligne._row, carte[nom]).setValue(champs[cle]);
      ligne[cle] = champs[cle];
    }
  });
  if (carte[SCHEMA.OPP.updatedAt]) {
    feuille.getRange(ligne._row, carte[SCHEMA.OPP.updatedAt])
           .setValue(maintenant_());
  }
  return cles.length;
}

/** Ecrit jours restants et statut pour toutes les lignes, en deux blocs. */
function ecrireDelais_(lignes) {
  if (!lignes.length) return;
  var feuille = feuilleOpp_();
  var carte = entetes_(feuille);
  var colJours = carte[SCHEMA.OPP.days];
  var colStatut = carte[SCHEMA.OPP.status];
  if (!colJours || !colStatut) return;

  var triees = lignes.slice().sort(function (a, b) { return a._row - b._row; });
  var premiere = triees[0]._row;
  var derniere = triees[triees.length - 1]._row;
  var hauteur = derniere - premiere + 1;

  var joursCol = [];
  var statutCol = [];
  for (var i = 0; i < hauteur; i++) { joursCol.push([null]); statutCol.push([null]); }

  var actuelJours = feuille.getRange(premiere, colJours, hauteur, 1).getValues();
  var actuelStatut = feuille.getRange(premiere, colStatut, hauteur, 1).getValues();
  for (var j = 0; j < hauteur; j++) {
    joursCol[j] = [actuelJours[j][0]];
    statutCol[j] = [actuelStatut[j][0]];
  }
  triees.forEach(function (l) {
    var i = l._row - premiere;
    joursCol[i] = [l.days === null ? '' : l.days];
    statutCol[i] = [l.status];
  });

  feuille.getRange(premiere, colJours, hauteur, 1).setValues(joursCol);
  feuille.getRange(premiere, colStatut, hauteur, 1).setValues(statutCol);
}

/**
 * Repeint les lignes selon leur statut - section 10.
 *
 * Les couleurs sont posees par le script, pas par une mise en forme
 * conditionnelle : c'est plus simple, cela survit a un import, et cela ne
 * depend d'aucune reference entre feuilles.
 */
function peindreLignes_(lignes) {
  if (!lignes.length) return;
  var feuille = feuilleOpp_();
  var largeur = feuille.getLastColumn();

  // On peint par blocs contigus de meme couleur plutot que ligne par ligne.
  var triees = lignes.slice().sort(function (a, b) { return a._row - b._row; });
  var debut = 0;
  while (debut < triees.length) {
    var fin = debut;
    var couleur = couleurStatut(triees[debut].status);
    while (fin + 1 < triees.length
           && triees[fin + 1]._row === triees[fin]._row + 1
           && couleurStatut(triees[fin + 1].status) === couleur) {
      fin++;
    }
    feuille.getRange(triees[debut]._row, 1, fin - debut + 1, largeur)
           .setBackground(couleur);
    debut = fin + 1;
  }
}

/** Marque des notifications comme envoyees - sections 12 et 17. */
function marquerNotifications_(ligne, cles) {
  if (!cles.length) return;
  var feuille = feuilleOpp_();
  var carte = entetes_(feuille);
  cles.forEach(function (cle) {
    var notif = SCHEMA.NOTIFICATIONS.filter(function (n) {
      return n.key === cle; })[0];
    if (!notif) return;
    var nom = SCHEMA.OPP[notif.column];
    if (nom && carte[nom]) {
      feuille.getRange(ligne._row, carte[nom]).setValue(true);
      ligne[notif.column] = true;
    }
  });
}

// -------------------------------------------------------------------- LOGS

/** Journal minimal - section 23. Un echec de log n'interrompt jamais rien. */
function logEvent(source, action, statut, message) {
  try {
    getSheet_(SCHEMA.SHEETS.logs).appendRow([
      maintenant_(), source || '', action || '', statut || 'INFO',
      String(message === null || message === undefined ? '' : message).slice(0, 500)
    ]);
  } catch (e) {
    console.error('Log impossible : ' + e.message);
  }
}
