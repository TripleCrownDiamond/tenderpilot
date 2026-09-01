/**
 * TenderPilot - couche d'acces au classeur.
 *
 * Tout ce qui touche a SpreadsheetApp vit ici. La logique metier vit dans
 * Core.gs et ne connait pas le classeur.
 *
 * Regle : on ne lit JAMAIS une colonne par sa position. On la retrouve par
 * son nom, via SCHEMA. Un utilisateur qui deplace une colonne ne doit pas
 * casser le script.
 */

/** Recupere un onglet, avec un message comprehensible s'il manque. */
function getSheet_(name) {
  var sheet = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sheet) {
    throw new Error(
      'Onglet "' + name + '" introuvable. Ce fichier ne semble pas etre un ' +
      'Command Center TenderPilot, ou un onglet a ete renomme.');
  }
  return sheet;
}

/** { nom de colonne: index 1-based } depuis la ligne d'en-tete. */
function headerIndex_(sheet, headerRow) {
  var row = headerRow || 1;
  var values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  var map = {};
  values.forEach(function (name, i) {
    if (name) map[String(name).trim()] = i + 1;
  });
  return map;
}

function columnIndex_(sheet, name, headerRow) {
  var idx = headerIndex_(sheet, headerRow)[name];
  if (!idx) {
    throw new Error('Colonne "' + name + '" introuvable dans l onglet "' +
                    sheet.getName() + '". Ne pas renommer les colonnes.');
  }
  return idx;
}

function isBlank_(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

// --------------------------------------------------------------- reglages --

/**
 * Lit un onglet en paires libelle (colonne A) / valeur (colonne B).
 * Retourne { libelle: { row: n, value: v } }.
 */
function readLabelledRows_(sheetName) {
  var sheet = getSheet_(sheetName);
  var last = sheet.getLastRow();
  if (last < 1) return {};
  var values = sheet.getRange(1, 1, last, 2).getValues();
  var out = {};
  values.forEach(function (row, i) {
    var label = row[0];
    if (!isBlank_(label)) {
      out[String(label).trim()] = { row: i + 1, value: row[1] };
    }
  });
  return out;
}

/** Reglages de l'onglet SETTINGS, indexes par cle technique. */
function readSettings() {
  var rows = readLabelledRows_(SCHEMA.SHEETS.settings);
  var out = {};
  Object.keys(SCHEMA.SETTINGS_LABELS).forEach(function (key) {
    var entry = rows[SCHEMA.SETTINGS_LABELS[key]];
    out[key] = entry ? entry.value : '';
  });
  return out;
}

/** Ecrit des reglages depuis un objet { cle: valeur }. */
function writeSettings_(updates) {
  var sheet = getSheet_(SCHEMA.SHEETS.settings);
  var rows = readLabelledRows_(SCHEMA.SHEETS.settings);
  var written = [];
  Object.keys(updates).forEach(function (key) {
    var label = SCHEMA.SETTINGS_LABELS[key];
    if (!label) return;
    var entry = rows[label];
    if (!entry) return;
    sheet.getRange(entry.row, 2).setValue(updates[key]);
    written.push(key);
  });
  return written;
}

// -------------------------------------------------------------- watchlist --

/** Ligne d'en-tete de la zone de selection, ou null si elle a ete supprimee. */
function targetsHeaderRow_(labelledRows) {
  var titre = labelledRows[SCHEMA.WATCHLIST_TARGETS_TITLE];
  // Le titre, une ligne d'explication, puis les en-tetes.
  return titre ? titre.row + 2 : null;
}

/**
 * Une case est consideree cochee qu'elle contienne OUI (liste deroulante
 * Excel) ou true (vraie case a cocher Google Sheets).
 */
function isChecked_(value) {
  if (value === true) return true;
  if (isBlank_(value)) return false;
  return SCHEMA.WATCHLIST_CHECKED.indexOf(
    String(value).trim().toUpperCase()) !== -1;
}

/** Valeurs cochees d'un bloc de selection. */
function readCheckedColumn_(sheet, headerRow, columnIndex) {
  var last = sheet.getLastRow();
  if (last <= headerRow) return [];
  var rows = sheet.getRange(headerRow + 1, columnIndex, last - headerRow, 2)
                  .getValues();
  return rows
    .filter(function (r) { return !isBlank_(r[0]) && isChecked_(r[1]); })
    .map(function (r) { return String(r[0]).trim(); });
}

/**
 * Transforme les colonnes de cases en vraies cases a cocher Google Sheets.
 *
 * La case conserve les valeurs OUI et NON : le classeur reste lisible dans
 * Excel, qui ne connait pas les cases a cocher et affiche une liste.
 */
function enableCheckboxes() {
  var sheet = getSheet_(SCHEMA.SHEETS.watchlist);
  var headerRow = targetsHeaderRow_(readLabelledRows_(SCHEMA.SHEETS.watchlist));
  if (!headerRow) {
    throw new Error('Zone de selection introuvable dans l onglet ' +
                    SCHEMA.SHEETS.watchlist + '.');
  }

  var rule = SpreadsheetApp.newDataValidation()
    .requireCheckbox(SCHEMA.WATCHLIST_CHECKED[0], 'NON')
    .build();

  var converties = 0;
  SCHEMA.WATCHLIST_BLOCKS.forEach(function (bloc) {
    var last = headerRow;
    var colonne = sheet.getRange(headerRow + 1, bloc.column,
                                 sheet.getMaxRows() - headerRow, 1).getValues();
    colonne.forEach(function (r, i) {
      if (!isBlank_(r[0])) last = headerRow + 1 + i;
    });
    if (last <= headerRow) return;
    sheet.getRange(headerRow + 1, bloc.column + 1, last - headerRow, 1)
         .setDataValidation(rule);
    converties += last - headerRow;
  });
  return converties;
}

/** Coche exactement les valeurs fournies, decoche les autres. */
function setCheckedValues_(sheet, headerRow, bloc, selection) {
  var wanted = (selection || []).map(function (v) {
    return String(v).trim().toLowerCase();
  });
  var hauteur = sheet.getMaxRows() - headerRow;
  if (hauteur < 1) return;
  var rows = sheet.getRange(headerRow + 1, bloc.column, hauteur, 2).getValues();
  var out = rows.map(function (r) {
    if (isBlank_(r[0])) return [r[1]];
    var coche = wanted.indexOf(String(r[0]).trim().toLowerCase()) !== -1;
    return [coche ? SCHEMA.WATCHLIST_CHECKED[0] : 'NON'];
  });
  sheet.getRange(headerRow + 1, bloc.column + 1, hauteur, 1).setValues(out);
}

function splitList_(value) {
  if (isBlank_(value)) return [];
  return String(value).split(/[;,]/)
    .map(function (p) { return p.trim(); })
    .filter(Boolean);
}

/** Criteres de pertinence saisis par l'utilisateur. */
function readWatchlist() {
  var sheet = getSheet_(SCHEMA.SHEETS.watchlist);
  var rows = readLabelledRows_(SCHEMA.SHEETS.watchlist);
  var L = SCHEMA.WATCHLIST_LABELS;

  function val(key) {
    var entry = rows[L[key]];
    return entry ? entry.value : '';
  }

  var targets = { countries: [], sectors: [], types: [] };
  var headerRow = targetsHeaderRow_(rows);
  if (headerRow) {
    SCHEMA.WATCHLIST_BLOCKS.forEach(function (bloc) {
      targets[bloc.key] = readCheckedColumn_(sheet, headerRow, bloc.column);
    });
  }

  var minDays = val('min_days');
  return {
    countries: targets.countries,
    sectors: targets.sectors,
    types: targets.types,
    positiveKeywords: splitList_(val('positive_keywords')),
    negativeKeywords: splitList_(val('negative_keywords')),
    minBudget: isBlank_(val('min_budget')) ? '' : Number(val('min_budget')),
    maxBudget: isBlank_(val('max_budget')) ? '' : Number(val('max_budget')),
    minDays: isBlank_(minDays) ? 7 : Number(minDays)
  };
}

// ----------------------------------------------------------------- listes --

/** Valeurs d'une colonne de l'onglet technique LISTS. */
function listOptions_(listName) {
  var sheet = getSheet_(SCHEMA.SHEETS.lists);
  var idx = headerIndex_(sheet)[listName];
  if (!idx) return [];
  var last = sheet.getLastRow();
  if (last < 2) return [];
  return sheet.getRange(2, idx, last - 1, 1).getValues()
    .map(function (r) { return r[0]; })
    .filter(function (v) { return !isBlank_(v); })
    .map(String);
}

// ----------------------------------------------------------- opportunites --

function opportunitiesSheet_() {
  return getSheet_(SCHEMA.SHEETS.opportunities);
}

/** Toutes les opportunites saisies, sous forme d'objets. */
function readOpportunities_() {
  var sheet = opportunitiesSheet_();
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var headers = headerIndex_(sheet);
  var width = sheet.getLastColumn();
  var values = sheet.getRange(2, 1, last - 1, width).getValues();

  return values
    .map(function (row, i) {
      var obj = { _row: i + 2 };
      Object.keys(headers).forEach(function (name) {
        obj[name] = row[headers[name] - 1];
      });
      return obj;
    })
    .filter(function (o) { return !isBlank_(o[SCHEMA.OPP.id]); });
}

/**
 * Ajoute une opportunite. Retourne { added, id, reason }.
 *
 * La deduplication compare titre, organisation et deadline : la meme annonce
 * arrivee par email puis saisie a la main ne cree qu'une seule ligne.
 */
function appendOpportunity_(record) {
  var sheet = opportunitiesSheet_();
  var existing = readOpportunities_();

  var key = dedupKey(record.title, record.organization, record.deadline);
  var duplicate = null;
  existing.forEach(function (o) {
    if (dedupKey(o[SCHEMA.OPP.title], o[SCHEMA.OPP.organization],
                 o[SCHEMA.OPP.deadline]) === key) {
      duplicate = o;
    }
  });
  if (duplicate) {
    return { added: false, id: duplicate[SCHEMA.OPP.id],
             reason: 'Cette opportunite existe deja (' +
                     duplicate[SCHEMA.OPP.id] + ').' };
  }

  var ids = existing.map(function (o) { return o[SCHEMA.OPP.id]; });
  var id = nextOpportunityId(ids);

  var headers = headerIndex_(sheet);
  var width = sheet.getLastColumn();
  var row = [];
  for (var i = 0; i < width; i++) row.push('');

  function put(column, value) {
    var idx = headers[column];
    if (idx) row[idx - 1] = value;
  }

  put(SCHEMA.OPP.id, id);
  put(SCHEMA.OPP.addedAt, new Date());
  put(SCHEMA.OPP.title, record.title);
  put(SCHEMA.OPP.organization, record.organization || '');
  put(SCHEMA.OPP.country, record.country || '');
  put(SCHEMA.OPP.sector, record.sector || '');
  put(SCHEMA.OPP.type, record.type || '');
  put(SCHEMA.OPP.sourceUrl, record.sourceUrl || '');
  put(SCHEMA.OPP.deadline, record.deadline);
  put(SCHEMA.OPP.budget, isBlank_(record.budget) ? '' : Number(record.budget));
  put(SCHEMA.OPP.currency, record.currency || '');
  put(SCHEMA.OPP.status, record.status || 'Nouveau');
  put(SCHEMA.OPP.notes, record.notes || '');
  if (!isBlank_(record.relevance)) put(SCHEMA.OPP.relevance, record.relevance);

  // On vise la ligne suivant la derniere opportunite REELLE, pas
  // getLastRow() : les colonnes calculees descendent jusqu'en bas du tableau
  // et fausseraient le compte.
  var target = 2;
  existing.forEach(function (o) {
    if (o._row >= target) target = o._row + 1;
  });
  sheet.getRange(target, 1, 1, width).setValues([row]);

  return { added: true, id: id, row: target };
}

// -------------------------------------------------------------- sources --

/** Sources de veille saisies dans l'onglet SOURCES. */
function readSources_() {
  var sheet = getSheet_(SCHEMA.SHEETS.sources);
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var headers = headerIndex_(sheet);
  var width = sheet.getLastColumn();

  return sheet.getRange(2, 1, last - 1, width).getValues()
    .map(function (row) {
      var obj = {};
      Object.keys(headers).forEach(function (name) {
        obj[name] = row[headers[name] - 1];
      });
      return obj;
    })
    .filter(function (source) { return !isBlank_(source[SCHEMA.SRC.id]); });
}

/** Sources actives disposant d'une adresse de flux exploitable. */
function activeFeeds_() {
  return readSources_().filter(function (source) {
    return String(source[SCHEMA.SRC.active]).toUpperCase() === 'OUI'
      && !isBlank_(source[SCHEMA.SRC.rssUrl]);
  });
}

// -------------------------------------------------------------- deadlines --

/**
 * Remplit la liste detaillee de l'onglet DEADLINES.
 *
 * C'est la limite connue du classeur seul : un .xlsx ne sait pas produire une
 * liste filtree dynamique. Le script la construit.
 */
function fillDeadlinesList() {
  var sheet = getSheet_(SCHEMA.SHEETS.deadlines);
  var today = new Date();
  var rows = [];

  readOpportunities_().forEach(function (o) {
    var days = daysRemaining(o[SCHEMA.OPP.deadline], today);
    var bucket = deadlineBucket(days, o[SCHEMA.OPP.status]);
    if (bucket === 'closed' || bucket === 'none' || bucket === 'ok') return;
    rows.push([o[SCHEMA.OPP.id], o[SCHEMA.OPP.title],
               o[SCHEMA.OPP.organization], o[SCHEMA.OPP.deadline], days,
               o[SCHEMA.OPP.status], SCHEMA.BUCKET_LABELS[bucket]]);
  });

  rows.sort(function (a, b) { return a[4] - b[4]; });

  var start = SCHEMA.DEADLINES_LIST_ROW;
  var width = 7;
  var available = Math.max(sheet.getMaxRows() - start, 1);
  sheet.getRange(start, 1, available, width).clearContent();

  var header = [SCHEMA.OPP.id, 'Titre', 'Organisation', 'Deadline',
                'Jours restants', 'Statut', 'Palier'];
  sheet.getRange(start, 1, 1, width).setValues([header]).setFontWeight('bold');

  if (rows.length) {
    sheet.getRange(start + 1, 1, rows.length, width).setValues(rows);
  } else {
    sheet.getRange(start + 1, 1).setValue('Aucune deadline dans les 15 jours.');
  }
  return rows.length;
}

// ------------------------------------------------------------------- logs --

function appendLog_(level, module, action, opportunityId, details) {
  try {
    var sheet = getSheet_(SCHEMA.SHEETS.logs);
    var headers = headerIndex_(sheet);
    var width = sheet.getLastColumn();
    var row = [];
    for (var i = 0; i < width; i++) row.push('');

    var values = {};
    values[SCHEMA.LOG.id] = 'LOG-' + Date.now();
    values[SCHEMA.LOG.timestamp] = new Date();
    values[SCHEMA.LOG.level] = level;
    values[SCHEMA.LOG.module] = module;
    values[SCHEMA.LOG.action] = action;
    values[SCHEMA.LOG.opportunityId] = opportunityId || '';
    values[SCHEMA.LOG.actor] = Session.getActiveUser().getEmail() || 'script';
    values[SCHEMA.LOG.details] = details || '';

    Object.keys(values).forEach(function (name) {
      if (headers[name]) row[headers[name] - 1] = values[name];
    });
    sheet.appendRow(row);
  } catch (e) {
    // Un echec d'ecriture du journal ne doit jamais interrompre l'action que
    // l'utilisateur a demandee.
    console.error('Log impossible : ' + e.message);
  }
}
