"""
TenderPilot - SOURCE UNIQUE DE VERITE DES NOMS DE COLONNES.

Regle produit (guide de dependances, section 5) :
"Ne jamais casser les noms de colonnes sans mettre a jour les scripts qui
en dependent."

Tout module (Apps Script K, Telegram L, Collector M, Postgres N, Scoring O,
Analyzer P) doit se referer a ce fichier. Un renommage se fait ICI et nulle
part ailleurs, puis `python build.py` regenere les livrables.

Version : 0.1.0
"""

SCHEMA_VERSION = "0.1.0"

# --------------------------------------------------------------------------
# 02_COMMAND_CENTER / onglet OPPORTUNITIES
# L'ordre de cette liste EST l'ordre des colonnes du classeur.
# --------------------------------------------------------------------------
OPPORTUNITIES = [
    "Opportunity_ID",
    "Added_At",
    "Title",
    "Organization",
    "Country",
    "Region",
    "Sector",
    "Subsector",
    "Opportunity_Type",
    "Source_ID",
    "Source_URL",
    "PDF_URL",
    "Publication_Date",
    "Deadline_Date",
    "Deadline_Time",
    "Days_Remaining",
    "Budget",
    "Currency",
    "Language",
    "Relevance_Score",
    "Eligibility_Score",
    "Readiness_Score",
    "Eliminatory_Criterion",
    "Status",
    "Priority",
    "Owner",
    "Next_Action",
    "Next_Action_Date",
    "Missing_Documents",
    "Notes",
]

# 02_COMMAND_CENTER / onglet SOURCES (miroir allege de 01_Sources.xlsx)
SOURCES = [
    "Source_ID",
    "Source_Name",
    "Organization",
    "Source_URL",
    "Country",
    "Region",
    "Opportunity_Type",
    "Automation_Level",
    "Email_Alerts",
    "RSS_Available",
    "RSS_URL",
    "API_Available",
    "Registration_Required",
    "Free_or_Paid",
    "Last_Verified",
    "Link_Status",
    "Active",
    "Notes",
]

# 04_GO_NO_GO / onglet CRITERIA
# Les 4 dernieres colonnes sont techniques : elles neutralisent les lignes
# vides pour que les moyennes ponderees ne renvoient pas d'erreur. Elles sont
# masquees dans le classeur livre.
GO_NOGO = [
    "Criterion_ID",
    "Category",
    "Requirement",
    "Source_Page",
    "Mandatory",
    "Eliminatory",
    "Candidate_Evidence",
    "Evidence_Link",
    "Result",
    "Risk",
    "Weight",
    "Score",
    "Action",
    "Owner",
    "Poids_Effectif",
    "Points",
    "Poids_Readiness",
    "Points_Readiness",
]

CRITERION_CATEGORIES = [
    "Administratif",
    "Legal",
    "Financier",
    "Technique",
    "Experience",
    "Equipe",
    "Geographie",
    "Delai",
    "Certification",
    "Partenariat",
    "Document",
]

# Categories qui mesurent la capacite a repondre MAINTENANT (Readiness Score).
READINESS_CATEGORIES = ["Document", "Equipe", "Certification"]

CRITERION_RESULTS = [
    "Satisfait",
    "Partiellement satisfait",
    "Non satisfait",
    "A verifier",
]

# Correspondance Result -> points. Un critere non evalue ne vaut pas 0 : il
# bloque la decision, ce qui est gere separement par le verdict.
RESULT_SCORES = {
    "Satisfait": 100,
    "Partiellement satisfait": 50,
    "Non satisfait": 0,
    "A verifier": 0,
}

RISK_LEVELS = ["Faible", "Moyen", "Eleve"]

# Sorties du moteur de decision, de la plus favorable a la moins favorable.
VERDICTS = ["GO", "GO_WITH_ACTIONS", "NO_GO_CONDITIONAL", "NO_GO"]

# 02_COMMAND_CENTER / onglet LOGS
LOGS = [
    "Log_ID",
    "Timestamp",
    "Level",
    "Module",
    "Action",
    "Opportunity_ID",
    "Actor",
    "Details",
]

# --------------------------------------------------------------------------
# LISTES DE VALEURS (validation de donnees + coherence inter-modules)
# --------------------------------------------------------------------------
STATUSES = [
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
    "Archive",
]

# Statuts qui ne doivent JAMAIS declencher une alerte d'urgence deadline.
# Utilise par la mise en forme conditionnelle et par les rappels Apps Script.
STATUSES_CLOSED = ["Soumis", "Gagne", "Perdu", "Expire", "Archive", "NO-GO"]

PRIORITIES = ["Haute", "Moyenne", "Basse"]

OPPORTUNITY_TYPES = [
    "Appel d'offres",
    "Consultation",
    "AMI",
    "RFP",
    "RFQ",
    "Grant",
    "Appel a projets",
    "Consultant individuel",
    "Cabinet",
    "Fourniture",
    "Service",
]

YES_NO = ["OUI", "NON", "A verifier"]

AUTOMATION_LEVELS = [
    "0 - Manual only",
    "1 - Email",
    "2 - RSS",
    "3 - Public HTML",
    "4 - API",
    "5 - Highly automatable",
]

LINK_STATUSES = ["OK", "A verifier", "Casse", "Deplace"]

# Seuils deadline (jours restants). Sert aux couleurs ET aux rappels.
DEADLINE_BUCKETS = [
    ("J-14", 15, "Vert / a surveiller"),
    ("J-7", 7, "Jaune / a preparer"),
    ("J-3", 3, "Orange / urgent"),
    ("J-1", 1, "Rouge / critique"),
]


# --------------------------------------------------------------------------
# NOMS D'ONGLETS ET CLES DE REGLAGES
#
# Le projet Apps Script (module 12) lit et ecrit dans ces onglets et ces
# lignes de reglages. Les constantes sont ici pour que le script et le
# classeur ne puissent pas diverger : Schema.gs est genere depuis ce fichier.
# --------------------------------------------------------------------------
SHEETS = {
    "start_here": "START_HERE",
    "dashboard": "DASHBOARD",
    "opportunities": "OPPORTUNITIES",
    "pipeline": "PIPELINE",
    "deadlines": "DEADLINES",
    "watchlist": "WATCHLIST",
    "settings": "SETTINGS",
    "sources": "SOURCES",
    "logs": "LOGS",
    "lists": "LISTS",
}

# Libelle affiche en colonne A de l'onglet SETTINGS -> cle technique.
# Le script retrouve un reglage par sa cle, jamais par sa position.
SETTINGS_LABELS = {
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
    "ai_max_tokens": "Max tokens",
}

# Reglages ecrits par l'assistant de configuration du module 12.
SETUP_KEYS = ["org_name", "timezone", "notify_email", "reminders_enabled",
              "reminder_days", "gmail_label", "threshold_review"]

# Libelles de l'onglet WATCHLIST, lus par le moteur de pertinence.
WATCHLIST_LABELS = {
    "region": "Region prioritaire",
    "international": "Opportunites internationales autorisees",
    "min_budget": "Budget minimum",
    "max_budget": "Budget maximum",
    "min_days": "Delai minimum avant deadline (jours)",
    "language": "Langue de travail",
    "positive_keywords": "Mots-cles positifs",
    "negative_keywords": "Mots-cles negatifs",
}

# En-tetes de l'onglet technique LISTS. Le formulaire de saisie du module 12
# y lit ses listes deroulantes : les deux cotes doivent nommer les memes
# colonnes.
LISTS_COLUMNS = {
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
    "linkStatus": "Link_Status",
}

# Cles techniques utilisees par le script Apps Script pour designer une
# colonne. Le script n'ecrit jamais un nom de colonne en dur : il passe par
# SCHEMA.OPP.<cle>, generee depuis ce dictionnaire.
OPP_KEYS = {
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
    "notes": "Notes",
}

SOURCE_KEYS = {
    "id": "Source_ID",
    "name": "Source_Name",
    "organization": "Organization",
    "url": "Source_URL",
    "country": "Country",
    "type": "Opportunity_Type",
    "rssAvailable": "RSS_Available",
    "rssUrl": "RSS_URL",
    "active": "Active",
}

LOG_KEYS = {
    "id": "Log_ID",
    "timestamp": "Timestamp",
    "level": "Level",
    "module": "Module",
    "action": "Action",
    "opportunityId": "Opportunity_ID",
    "actor": "Actor",
    "details": "Details",
}

# Libelle lisible de chaque palier de deadline, partage entre le classeur et
# le script.
BUCKET_LABELS = {
    "expired": "Deadline depassee",
    "j1": "J-1 (0 a 2 jours)",
    "j3": "J-3 (3 a 7 jours)",
    "j7": "J-7 (8 a 15 jours)",
    "ok": "Au-dela de 15 jours",
    "closed": "Dossier clos",
    "none": "Sans deadline",
}

# Ligne de l'onglet DEADLINES a partir de laquelle le script ecrit la liste
# detaillee. Doit rester sous le contenu genere par le builder du module 02 :
# le test du module 02 le verifie.
DEADLINES_LIST_ROW = 23

# Zone de selection de l'onglet WATCHLIST.
#
# Chaque bloc occupe deux colonnes : la valeur, puis une case a cocher. Tout
# est pre-rempli et decoche : l'utilisateur coche ce qu'il veut suivre, au
# lieu de retaper des noms au risque de fautes de frappe.
WATCHLIST_TARGETS_TITLE = "CIBLES - cocher ce que vous voulez suivre"
WATCHLIST_CHECK_HEADER = "Suivi"

WATCHLIST_BLOCKS = [
    {"key": "countries", "header": "Pays", "column": 1},
    {"key": "sectors", "header": "Secteur", "column": 4},
    {"key": "types", "header": "Type", "column": 7},
]

# Valeurs acceptees comme "coche", quelle que soit la forme : liste OUI/NON
# dans Excel, vraie case a cocher dans Google Sheets.
WATCHLIST_CHECKED = ["OUI", "VRAI", "TRUE", "X"]


def col_letter(sheet_columns, name):
    """Lettre de colonne Excel (A, B, ... AD) pour un nom de champ.

    Permet d'ecrire les formules sans coder en dur les references : si
    l'ordre des colonnes change ci-dessus, les formules suivent.
    """
    from openpyxl.utils import get_column_letter

    return get_column_letter(sheet_columns.index(name) + 1)
