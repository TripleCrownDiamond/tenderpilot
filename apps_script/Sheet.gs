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
    // La note d'aide en bas de l'onglet n'est pas une source : voir
    // estIdSource, et le journal du 2026-09-02 qu'elle polluait.
    .filter(function (s) { return estIdSource(s.id); });
}

/**
 * Trace le resultat de la collecte sur la ligne de la source.
 *
 * Tamponne, pour la meme raison que le journal : ecrit ligne par ligne,
 * cela relisait les en-tetes et faisait deux setValue PAR SOURCE, soit
 * deux cents aller-retours par passage. On note en memoire, on ecrit une
 * fois - voir ecrireStatutsSources_.
 */
var STATUTS_SOURCES = [];

function majSource_(source, statut) {
  if (source && source._row) {
    STATUTS_SOURCES.push({ _row: source._row, statut: statut });
  }
}

/**
 * Ecrit les colonnes Derniere_Collecte et Statut en deux appels.
 *
 * On relit le bloc et on ne remplace que les lignes vues : une source
 * ajoutee a la main, jamais collectee, garde son statut d'origine.
 */
function ecrireStatutsSources_() {
  if (!STATUTS_SOURCES.length) return 0;
  var vues = STATUTS_SOURCES;
  STATUTS_SOURCES = [];

  var feuille = getSheet_(SCHEMA.SHEETS.sources);
  var carte = entetes_(feuille);
  var dernier = feuille.getLastRow();
  if (dernier < 2) return 0;

  var premiere = dernier;
  var derniere = 2;
  vues.forEach(function (v) {
    if (v._row < premiere) premiere = v._row;
    if (v._row > derniere) derniere = v._row;
  });
  if (derniere > dernier) derniere = dernier;
  if (premiere > derniere) return 0;
  var hauteur = derniere - premiere + 1;
  var horodatage = maintenant_();

  [[SCHEMA.SRC.lastRun, function () { return horodatage; }],
   [SCHEMA.SRC.status, function (v) { return v.statut; }]
  ].forEach(function (paire) {
    var colonne = carte[paire[0]];
    if (!colonne) return;
    var valeurs = feuille.getRange(premiere, colonne, hauteur, 1).getValues();
    vues.forEach(function (v) {
      if (v._row >= premiere && v._row <= derniere) {
        valeurs[v._row - premiere] = [paire[1](v)];
      }
    });
    feuille.getRange(premiere, colonne, hauteur, 1).setValues(valeurs);
  });
  return vues.length;
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
  if (!cles.length || !ligne._row) return 0;
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

/**
 * Ecrit les colonnes recalculees a chaque passage : jours restants, statut
 * de delai et pertinence.
 *
 * Les trois se recalculent ensemble parce qu'elles dependent du jour ou de
 * la configuration, jamais de la source. Changer PAYS_SUIVIS et relancer
 * suffit donc a remettre a jour TOUT le tableau, y compris les lignes
 * collectees il y a six mois.
 *
 * Une seule lecture et une seule ecriture par colonne, sur le bloc qui va
 * de la premiere a la derniere ligne concernee : les cellules qui ne nous
 * appartiennent pas sont relues puis reecrites a l'identique.
 */
function ecrireDelais_(lignes) {
  if (!lignes.length) return;
  var feuille = feuilleOpp_();
  var carte = entetes_(feuille);

  var triees = lignes.slice().sort(function (a, b) { return a._row - b._row; });
  var premiere = triees[0]._row;
  var derniere = triees[triees.length - 1]._row;
  var hauteur = derniere - premiere + 1;

  var colonnes = [
    { nom: SCHEMA.OPP.days,
      valeur: function (l) { return l.days === null ? '' : l.days; } },
    { nom: SCHEMA.OPP.status, valeur: function (l) { return l.status; } },
    { nom: SCHEMA.OPP.pertinence,
      valeur: function (l) { return l.pertinence || ''; } }
  ];

  colonnes.forEach(function (colonne) {
    var index = carte[colonne.nom];
    if (!index) return;
    var valeurs = feuille.getRange(premiere, index, hauteur, 1).getValues();
    triees.forEach(function (l) {
      valeurs[l._row - premiere] = [colonne.valeur(l)];
    });
    feuille.getRange(premiere, index, hauteur, 1).setValues(valeurs);
  });
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

/**
 * Range physiquement le tableau, une fois tout le reste ecrit.
 *
 * POURQUOI EN DERNIER, ET PAS AILLEURS. Toute l'execution designe ses
 * lignes par leur numero - majLigne_, marquerNotifications_, ecrireDelais_.
 * Deplacer les lignes avant que ces ecritures soient finies ferait ecrire
 * dans la mauvaise. Ici, plus personne ne s'en sert : le passage suivant
 * relit la feuille et recalcule tous les numeros.
 *
 * On trie EN MEMOIRE puis on reecrit le bloc, plutot que d'appeler
 * Range.sort() : Sheets range toujours les cellules vides en dernier, quel
 * que soit le sens, et on ne veut pas dependre de ce detail non ecrit. Le
 * tri en memoire dit exactement ou vont les annonces sans echeance.
 *
 * Les couleurs ne suivent pas les valeurs : on repeint apres.
 */
function trierOpportunites_(lignes) {
  var feuille = feuilleOpp_();
  var dernier = feuille.getLastRow();
  if (dernier < 3) return 0;
  var largeur = feuille.getLastColumn();

  var triees = parDelai_(lignes).filter(function (l) {
    return l._row >= 2 && l._row <= dernier;
  });
  if (triees.length < 2) return 0;

  // On ne bouge que les lignes qu'on connait, et on les remet dans les
  // memes emplacements : une ligne ajoutee a la main hors collecte garde
  // donc sa place, elle n'est jamais ecrasee.
  var places = triees.map(function (l) { return l._row; })
    .sort(function (a, b) { return a - b; });

  var valeurs = feuille.getRange(2, 1, dernier - 1, largeur).getValues();
  var contenus = triees.map(function (l) { return valeurs[l._row - 2]; });

  places.forEach(function (rang, i) {
    valeurs[rang - 2] = contenus[i];
    triees[i]._row = rang;
  });
  feuille.getRange(2, 1, dernier - 1, largeur).setValues(valeurs);

  peindreLignes_(triees);
  return triees.length;
}

/**
 * Vide un onglet de ses lignes, l'en-tete excepte.
 *
 * clearContents laisserait la mise en forme des anciennes lignes derriere
 * lui : on efface aussi le format, sinon le tableau vide reste barre de
 * vert et de rouge.
 */
function viderOnglet_(nom) {
  var feuille = getSheet_(nom);
  var dernier = feuille.getLastRow();
  if (dernier < 2) return 0;
  var largeur = Math.max(1, feuille.getLastColumn());
  var hauteur = dernier - 1;
  feuille.getRange(2, 1, hauteur, largeur).clear();
  return hauteur;
}

/**
 * Vide le journal des executions.
 *
 * Il part AVEC les opportunites, et non separement : apres un vidage, la
 * collecte reprend tout depuis zero, et un journal qui melangerait les
 * lignes de l'essai precedent avec celles du nouveau ne se lirait plus.
 * L'evenement de vidage est journalise APRES l'effacement : la premiere
 * ligne du journal neuf dit donc ce qui vient de se passer.
 */
function viderJournal_() {
  return viderOnglet_(SCHEMA.SHEETS.logs);
}

/**
 * Vide l'onglet OPPORTUNITIES : toutes les lignes, l'en-tete excepte.
 *
 * Sans interface : c'est viderOpportunites() qui demande confirmation.
 * Separee pour etre testable et rappelable par un script.
 */
function viderOpportunites_() {
  return viderOnglet_(SCHEMA.SHEETS.opportunities);
}

/**
 * Reecrit l'onglet PAYS_ET_SECTEURS depuis les opportunites du tableau.
 *
 * Une seule lecture, un seul effacement, une seule ecriture : c'est la
 * regle apprise le 2026-09-03 sur les six minutes d'Apps Script, et un
 * inventaire de cinquante lignes ne merite pas cinquante requetes.
 *
 * L'onglet est reecrit ENTIER a chaque passage, jamais complete : un pays
 * dont la source a ete desactivee doit disparaitre de la liste, sinon le
 * client continuerait de le suivre sans plus jamais rien en recevoir.
 */
function ecrireProfil_(lignes, config) {
  var rangees = inventaireProfil(lignes, config);
  var feuille = SpreadsheetApp.getActive()
    .getSheetByName(SCHEMA.SHEETS.profil);
  // L'onglet n'existe pas dans les classeurs livres avant sa creation :
  // son absence ne doit pas faire echouer une collecte.
  if (!feuille) return 0;

  var largeur = SCHEMA.PROFIL.length;
  var dernier = feuille.getLastRow();
  if (dernier >= 2) {
    feuille.getRange(2, 1, dernier - 1, Math.max(largeur,
      feuille.getLastColumn())).clear();
  }
  if (!rangees.length) return 0;

  feuille.getRange(2, 1, rangees.length, largeur).setValues(rangees);
  return rangees.length;
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

/**
 * Journal tamponne.
 *
 * MESURE DU 2026-09-03 : la derniere execution a depasse les six minutes
 * d'Apps Script. Le reseau n'y etait pour presque rien - 52 secondes pour
 * les 51 sources actives. Le coupable etait le BAVARDAGE AVEC LA FEUILLE :
 *
 *   appendRow ligne par ligne ......... ~500 aller-retours par passage
 *   majSource_ (en-tetes relus a chaque
 *   source, puis deux setValue) ....... ~200 aller-retours
 *
 * Sept cents aller-retours a 150-300 ms chacun font deux a quatre minutes,
 * pour ecrire ce qui tient en deux appels. Chaque setValue, chaque
 * appendRow est une requete reseau vers Google - c'est la regle numero un
 * d'Apps Script, et le fichier l'affichait en tete sans l'appliquer au
 * journal.
 *
 * On empile donc en memoire et on ecrit en bloc. Le tampon est vide tous
 * les JOURNAL_LOT evenements malgre tout : si l'execution est tuee net -
 * depassement de duree, panne - on perd au pire les cent dernieres lignes,
 * pas la trace entiere. Sans ce garde-fou, une execution qui deborde ne
 * laisserait AUCUN journal, et le diagnostic serait impossible.
 */
var JOURNAL_EN_ATTENTE = [];
var JOURNAL_LOT = 100;

function logEvent(source, action, statut, message) {
  JOURNAL_EN_ATTENTE.push([
    maintenant_(), source || '', action || '', statut || 'INFO',
    String(message === null || message === undefined ? '' : message).slice(0, 500)
  ]);
  if (JOURNAL_EN_ATTENTE.length >= JOURNAL_LOT) ecrireJournal_();
}

/** Ecrit le tampon en UN appel, et le vide. */
function ecrireJournal_() {
  if (!JOURNAL_EN_ATTENTE.length) return 0;
  var lignes = JOURNAL_EN_ATTENTE;
  JOURNAL_EN_ATTENTE = [];
  try {
    var feuille = getSheet_(SCHEMA.SHEETS.logs);
    feuille.getRange(feuille.getLastRow() + 1, 1, lignes.length, lignes[0].length)
           .setValues(lignes);
  } catch (e) {
    // Un journal qu'on ne peut pas ecrire ne doit jamais faire echouer une
    // collecte : c'est une trace, pas un resultat.
    console.error('Journal impossible : ' + e.message);
  }
  return lignes.length;
}

