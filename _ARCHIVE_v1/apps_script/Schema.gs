/**
 * TenderPilot - FICHIER GENERE. NE PAS MODIFIER A LA MAIN.
 *
 * Genere par builders/build_12_apps_script.py depuis schema/columns.py.
 * Toute modification sera perdue au prochain `python build.py`.
 *
 * C'est ce fichier qui garantit que le script et le classeur parlent des
 * memes colonnes. Pour renommer une colonne : modifier schema/columns.py,
 * puis relancer le build.
 *
 * Schema 0.1.0 - module 0.1.0
 */

var SCHEMA = {

  VERSION: "0.1.0",

  /** Noms des onglets du Command Center. */
  SHEETS: {
  "start_here": "START_HERE",
  "dashboard": "DASHBOARD",
  "opportunities": "OPPORTUNITIES",
  "pipeline": "PIPELINE",
  "deadlines": "DEADLINES",
  "watchlist": "WATCHLIST",
  "settings": "SETTINGS",
  "sources": "SOURCES",
  "logs": "LOGS",
  "lists": "LISTS"
},

  /** Cle technique -> nom de colonne de l'onglet OPPORTUNITIES. */
  OPP: {
  "id": "Opportunity_ID",
  "addedAt": "Added_At",
  "title": "Title",
  "organization": "Organization",
  "country": "Country",
  "sector": "Sector",
  "type": "Opportunity_Type",
  "sourceUrl": "Source_URL",
  "deadline": "Deadline_Date",
  "daysRemaining": "Days_Remaining",
  "budget": "Budget",
  "currency": "Currency",
  "relevance": "Relevance_Score",
  "status": "Status",
  "notes": "Notes"
},

  /** Cle technique -> nom de colonne de l'onglet SOURCES. */
  SRC: {
  "id": "Source_ID",
  "name": "Source_Name",
  "organization": "Organization",
  "url": "Source_URL",
  "country": "Country",
  "type": "Opportunity_Type",
  "rssAvailable": "RSS_Available",
  "rssUrl": "RSS_URL",
  "active": "Active"
},

  /** Cle technique -> nom de colonne de l'onglet LOGS. */
  LOG: {
  "id": "Log_ID",
  "timestamp": "Timestamp",
  "level": "Level",
  "module": "Module",
  "action": "Action",
  "opportunityId": "Opportunity_ID",
  "actor": "Actor",
  "details": "Details"
},

  /** En-tetes de l'onglet technique LISTS. */
  LISTS: {
  "status": "Status",
  "priority": "Priority",
  "type": "Opportunity_Type",
  "statusClosed": "Status_Closed",
  "yesNo": "Yes_No",
  "sector": "Sector",
  "country": "Country",
  "region": "Region",
  "currency": "Currency",
  "language": "Language",
  "automationLevel": "Automation_Level",
  "linkStatus": "Link_Status"
},

  /** Libelle en colonne A de l'onglet SETTINGS. */
  SETTINGS_LABELS: {
  "org_name": "Nom de l'organisation",
  "timezone": "Fuseau horaire",
  "language": "Langue de l'interface",
  "schema_version": "Version du schema",
  "module_version": "Version du module",
  "threshold_review": "Seuil de pertinence - a analyser",
  "threshold_ai": "Seuil de pertinence - analyse IA auto",
  "document_alert_days": "Delai d'alerte document expirant (jours)",
  "notify_email": "Email de notification",
  "reminders_enabled": "Rappels actifs",
  "reminder_days": "Jours de rappel",
  "telegram_enabled": "Telegram actif",
  "gmail_label": "Label Gmail surveille",
  "ai_provider": "Fournisseur IA",
  "ai_model": "Modele",
  "ai_temperature": "Temperature",
  "ai_max_tokens": "Max tokens"
},

  /** Libelle en colonne A de l'onglet WATCHLIST. */
  WATCHLIST_LABELS: {
  "region": "Region prioritaire",
  "international": "Opportunites internationales autorisees",
  "min_budget": "Budget minimum",
  "max_budget": "Budget maximum",
  "min_days": "Delai minimum avant deadline (jours)",
  "language": "Langue de travail",
  "positive_keywords": "Mots-cles positifs",
  "negative_keywords": "Mots-cles negatifs"
},

  /** Zone de selection de WATCHLIST : une colonne de valeurs, une de cases. */
  WATCHLIST_TARGETS_TITLE: "CIBLES - cocher ce que vous voulez suivre",
  WATCHLIST_CHECK_HEADER: "Suivi",
  WATCHLIST_BLOCKS: [
  {
    "key": "countries",
    "header": "Pays",
    "column": 1
  },
  {
    "key": "sectors",
    "header": "Secteur",
    "column": 4
  },
  {
    "key": "types",
    "header": "Type",
    "column": 7
  }
],
  WATCHLIST_CHECKED: [
  "OUI",
  "VRAI",
  "TRUE",
  "X"
],

  /** Statuts possibles d'une opportunite. */
  STATUSES: [
  "Nouveau",
  "A lire",
  "A qualifier",
  "GO",
  "NO-GO",
  "A preparer",
  "En preparation",
  "En validation",
  "Pret a soumettre",
  "Soumis",
  "Gagne",
  "Perdu",
  "Expire",
  "Archive"
],

  /**
   * Statuts clos. Regle produit : ils ne declenchent jamais d'alerte
   * d'urgence ni de rappel, meme la veille de la deadline.
   */
  STATUSES_CLOSED: [
  "Soumis",
  "Gagne",
  "Perdu",
  "Expire",
  "Archive",
  "NO-GO"
],

  /** Libelle lisible de chaque palier de deadline. */
  BUCKET_LABELS: {
  "expired": "Deadline depassee",
  "j1": "J-1 (0 a 2 jours)",
  "j3": "J-3 (3 a 7 jours)",
  "j7": "J-7 (8 a 15 jours)",
  "ok": "Au-dela de 15 jours",
  "closed": "Dossier clos",
  "none": "Sans deadline"
},

  /** Ligne de l'onglet DEADLINES ou le script ecrit la liste detaillee. */
  DEADLINES_LIST_ROW: 23
};

// Export pour les tests Node. Apps Script n'a pas de module.
if (typeof module !== 'undefined') {
  module.exports = { SCHEMA: SCHEMA };
}
