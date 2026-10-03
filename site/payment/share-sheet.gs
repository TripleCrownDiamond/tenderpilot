// =============================================================
//  Partage Google Sheet en LECTURE SEULE par email apres achat.
//
//  PROJET AUTONOME, PAS le projet du classeur maitre.
//  Le pont DEIT etre deploye en Web app, or un Web app lie au
//  classeur ne peut pas utiliser getActiveSpreadsheet() : il faut
//  openById(), qui exige le scope "spreadsheets" plein. Le projet
//  du maitre (produit) ne declare que "spreadsheets.currentonly" :
//  on ne l'elargit PAS.
//
//  1. https://script.google.com  ->  Nouveau projet  (autonome)
//  2. Collez ce fichier
//  3. Creez le fichier appsscript.json (voir share-appsscript.json)
//  4. Deploy > New deployment > Web app :
//       - Execute as : Me
//       - Who has access : Anyone
//     Autorisez : le consentement demandera "acces a vos feuilles
//     de calcul" (scope spreadsheets).
//  5. Copiez l'URL /exec dans le .env (SHEET_SHARE_APP_URL).
// =============================================================

// --- A REGLER ICI (les memes valeurs que dans le .env du site) ---
var TOKEN_PARTAGE = 'c879246c03186f9a1743a2fe82155953a55ea517c1c89a2a';

// L'ID du classeur maitre, entre /d/ et /edit (ou /copy).
// Exemple : "https://docs.google.com/spreadsheets/d/ABC123/copy"
//   -> ID = ABC123
var SPREADSHEET_ID = '12QlucqVQtk5hyx73osm7wuoFmzhDlzQHvnaI29df18s';

function maitre() {
  var id = SPREADSHEET_ID;
  if (!id || id.indexOf('ICI_L_ID') === 0) {
    var actif = SpreadsheetApp.getActiveSpreadsheet();
    if (actif) { return actif; }
    return null;
  }
  return SpreadsheetApp.openById(id);
}

function doPost(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    if (params['token'] !== TOKEN_PARTAGE) {
      return repondre('AUTH_FAIL');
    }
    var email = String(params['email'] || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return repondre('EMAIL_INVALIDE');
    }
    var feuille = maitre();
    if (!feuille) {
      return repondre('MAITRE_INTROUVABLE');
    }
    // LECTEUR SEUL. Jamais addEditor : un editeur pourrait modifier le
    // maitre, et tous les acheteurs suivants heriteraient de ces modifs.
    feuille.addViewer(email);
    return repondre('OK');
  } catch (err) {
    return repondre('ERREUR:' + err);
  }
}

function doGet(e) {
  return repondre('PONT_ACTIF');
}

function repondre(txt) {
  return ContentService
    .createTextOutput(String(txt))
    .setMimeType(ContentService.MimeType.TEXT);
}