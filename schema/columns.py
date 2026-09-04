"""
TenderPilot MVP - source unique de verite.

Un seul fichier definit les colonnes, les statuts, les couleurs et les cles
de configuration. Le classeur Google Sheets et le script Apps Script en sont
tous les deux derives : Schema.gs est genere depuis ici.

Regle : ne jamais renommer une colonne ailleurs qu'ici, puis relancer
`python build.py`.
"""

SCHEMA_VERSION = "1.0.0"

# --------------------------------------------------------------------------
# Onglets
# --------------------------------------------------------------------------
SHEETS = {
    "opportunities": "OPPORTUNITIES",
    "sources": "SOURCES",
    "config": "CONFIG",
    "logs": "LOGS",
    "profil": "PAYS_ET_SECTEURS",
}

# --------------------------------------------------------------------------
# OPPORTUNITIES - l'ordre de cette liste EST l'ordre des colonnes.
# Les 5 colonnes Notif_* sont techniques : elles empechent le renvoi d'un
# meme email et sont masquees dans le classeur livre.
# --------------------------------------------------------------------------
OPPORTUNITIES = [
    "ID",
    "Date_Ajout",
    "Opportunite",
    "Organisation",
    "Pays",
    "Type",
    "Secteur",
    "Budget",
    "Source",
    "Lien",
    "PDF",
    "Date_Publication",
    "Deadline",
    "Jours_Restants",
    "Statut_Delai",
    "Pertinence",
    "Resume",
    "Notif_Nouvelle",
    "Notif_J7",
    "Notif_J3",
    "Notif_J1",
    "Notif_Expire",
    "Derniere_MAJ",
]

HIDDEN_COLUMNS = ["Notif_Nouvelle", "Notif_J7", "Notif_J3", "Notif_J1",
                  "Notif_Expire"]

# Cle technique -> nom de colonne. Le script ne nomme jamais une colonne en
# dur : il passe par SCHEMA.OPP.<cle>.
OPP_KEYS = {
    "id": "ID",
    "addedAt": "Date_Ajout",
    "title": "Opportunite",
    "org": "Organisation",
    "country": "Pays",
    "type": "Type",
    "sector": "Secteur",
    "budget": "Budget",
    "source": "Source",
    "url": "Lien",
    "pdf": "PDF",
    "published": "Date_Publication",
    "deadline": "Deadline",
    "days": "Jours_Restants",
    "status": "Statut_Delai",
    "pertinence": "Pertinence",
    "summary": "Resume",
    "notifNew": "Notif_Nouvelle",
    "notifJ7": "Notif_J7",
    "notifJ3": "Notif_J3",
    "notifJ1": "Notif_J1",
    "notifExpired": "Notif_Expire",
    "updatedAt": "Derniere_MAJ",
}

# Champs compares a chaque collecte : si la source a change, on met a jour.
UPDATABLE = ["title", "org", "country", "type", "sector", "url", "pdf",
             "published", "deadline", "budget", "summary"]

ID_PREFIX = "TP"
SUMMARY_MAX = 400  # caracteres - section 28

# --------------------------------------------------------------------------
# Statut de delai - section 9
# --------------------------------------------------------------------------
STATUT_OUVERT = "OUVERT"
STATUT_SURVEILLER = "A SURVEILLER"
STATUT_BIENTOT = "BIENTOT"
STATUT_URGENT = "URGENT"
STATUT_EXPIRE = "EXPIRE"
STATUT_INCONNU = "DATE A VERIFIER"

DELAI_STATUTS = [STATUT_OUVERT, STATUT_SURVEILLER, STATUT_BIENTOT,
                 STATUT_URGENT, STATUT_EXPIRE, STATUT_INCONNU]

# (statut, seuil haut inclus), du plus urgent au plus large.
# Au-dela du dernier seuil : OUVERT.
DELAI_SEUILS = [
    (STATUT_URGENT, 3),
    (STATUT_BIENTOT, 7),
    (STATUT_SURVEILLER, 15),
]

# Section 10 - couleur de la ligne entiere. Le statut texte reste la source
# de verite : aucune information n'est portee uniquement par la couleur.
COULEURS = {
    STATUT_OUVERT: "#D8F3DC",
    STATUT_SURVEILLER: "#FFF3BF",
    STATUT_BIENTOT: "#FFE0C2",
    STATUT_URGENT: "#FFD6D6",
    STATUT_EXPIRE: "#ECECEC",
    STATUT_INCONNU: "#FFFBEA",
}

# --------------------------------------------------------------------------
# Pertinence - ce que l'annonce vaut POUR CE CLIENT-LA.
#
# Deux clients recoivent les memes annonces et n'ont pas le meme metier. La
# colonne Pertinence repond a une seule question : "est-ce que cela me
# concerne ?", d'apres PAYS_SUIVIS et SECTEURS_SUIVIS dans l'onglet CONFIG.
#
# ELLE ETIQUETTE, ELLE NE SUPPRIME PAS. Une annonce hors profil reste dans
# le tableau : une ligne de trop coute un defilement, une opportunite
# supprimee coute un marche. Le libelle commence par un chiffre pour que le
# tri alphabetique de Google Sheets range le plus pertinent en premier.
#
# Le calcul est DETERMINISTE et n'a besoin d'aucune cle : c'est la meme
# regle que pour les types et les secteurs, un client sans classement
# intelligent doit pouvoir trier.
# --------------------------------------------------------------------------
PERTINENCE_PRIORITAIRE = "3 - PRIORITAIRE"
PERTINENCE_A_VOIR = "2 - A VOIR"
PERTINENCE_POSSIBLE = "1 - POSSIBLE"
PERTINENCE_HORS_PROFIL = "0 - HORS PROFIL"

PERTINENCES = [PERTINENCE_PRIORITAIRE, PERTINENCE_A_VOIR,
               PERTINENCE_POSSIBLE, PERTINENCE_HORS_PROFIL]

# Score total (pays + secteur, 0 a 2 chacun) -> libelle.
PERTINENCE_SEUILS = [
    (PERTINENCE_PRIORITAIRE, 4),
    (PERTINENCE_A_VOIR, 3),
    (PERTINENCE_POSSIBLE, 2),
]

# Un pays ecrit ainsi n'exclut personne : l'annonce est ouverte a tous. Une
# structure beninoise peut candidater a un appel mondial - c'est la meme
# decision que LLM_APPELS_MONDIAUX, et elle vaut sans aucune cle.
PAYS_OUVERTS = ["international", "afrique", "multi-pays", "monde", "mondial",
                "global", "worldwide", "afrique de l'ouest", "cedeao", "umoa"]

# --------------------------------------------------------------------------
# Notifications - sections 11 a 17. Une opportunite recoit au maximum un
# email de chaque type, jamais deux.
# --------------------------------------------------------------------------
NOTIFICATIONS = [
    {"key": "new", "column": "notifNew", "config": "SEND_NEW_OPPORTUNITY",
     "threshold": None},
    {"key": "j7", "column": "notifJ7", "config": "SEND_J7", "threshold": 7},
    {"key": "j3", "column": "notifJ3", "config": "SEND_J3", "threshold": 3},
    {"key": "j1", "column": "notifJ1", "config": "SEND_J1", "threshold": 1},
    {"key": "expired", "column": "notifExpired", "config": "SEND_EXPIRED",
     "threshold": -1},
]

# --------------------------------------------------------------------------
# SOURCES
# --------------------------------------------------------------------------
SOURCES = [
    "Source_ID",
    "Nom",
    "Methode",
    "URL",
    "Pays_Defaut",
    "Secteur_Defaut",
    "Type_Defaut",
    "Active",
    "Derniere_Collecte",
    "Statut",
]

SOURCE_KEYS = {
    "id": "Source_ID",
    "name": "Nom",
    "method": "Methode",
    "url": "URL",
    "country": "Pays_Defaut",
    "sector": "Secteur_Defaut",
    "type": "Type_Defaut",
    "active": "Active",
    "lastRun": "Derniere_Collecte",
    "status": "Statut",
}

# Sections 20 et 21 : on ne supporte que ce qui est simple et stable. Une
# source exigeant un login, un captcha ou un navigateur automatise est
# marquee MANUAL et n'est jamais collectee.
METHODES = ["RSS", "MANUAL"]
# Les methodes "HTML:<site>" designent un analyseur dedie (voir Html.gs) et
# les methodes "JSON:<site>" un adaptateur d'API publique (voir Json.gs).
#
# Ordre de preference quand plusieurs voies existent pour une meme source :
# JSON d'abord (contrat stable, champs structures), RSS ensuite, HTML en
# dernier recours - une extraction de page casse des que le site change.
METHODE_HTML_PREFIXE = "HTML:"
METHODE_JSON_PREFIXE = "JSON:"
METHODE_PREFIXES = (METHODE_HTML_PREFIXE, METHODE_JSON_PREFIXE)


# --------------------------------------------------------------------------
# TYPES ET SECTEURS - de quoi ranger ce qu'on collecte
# --------------------------------------------------------------------------
#
# TenderPilot ne remonte pas que des appels d'offres. Une PME cherche des
# marches, un cabinet cherche des manifestations d'interet, une association
# cherche des subventions. Melanger les trois oblige chacun a trier a la
# main ce qui ne le concerne pas.
#
# Ces listes ne sont PAS contraignantes : la colonne Type reste libre, car
# une source peut publier un libelle qu'on n'a pas prevu et il vaut mieux le
# garder tel quel que le perdre. Elles servent a proposer des valeurs
# coherentes et a grouper l'affichage.

TYPES_OPPORTUNITE = [
    "Appel d'offres",       # marche public classique, on soumissionne
    "AMI",                  # manifestation d'interet, souvent en amont
    "Demande de cotation",  # petit montant, procedure allegee - vise les PME
    "Accord-cadre",         # marche repetitif sur plusieurs annees
    "Appel a projets",      # financement : on candidate, on ne vend pas
    "Subvention",           # idem, sans mise en concurrence marchande
    "Bourse",               # destine a une personne, pas a une structure
    "Repertoire fournisseurs",  # inscription prealable, avant tout marche
]

SECTEURS = [
    "Agriculture",
    "Eau et assainissement",
    "Energie",
    "Environnement",
    "Sante",
    "Education et formation",
    "Numerique",
    "Infrastructures et BTP",
    "Transport et logistique",
    "Gouvernance et institutions",
    "Social et genre",
]

# --------------------------------------------------------------------------
# LOGS - section 23
# --------------------------------------------------------------------------
LOGS = ["Date", "Source", "Action", "Statut", "Message"]

# --------------------------------------------------------------------------
# PAYS_ET_SECTEURS - l'inventaire de ce qui a REELLEMENT ete collecte.
#
# Cet onglet est REECRIT a chaque passage, depuis les opportunites du
# tableau. Il existe pour une raison precise : PAYS_SUIVIS et
# SECTEURS_SUIVIS se remplissent a la main, et une valeur inventee - un pays
# qu'aucune source ne publie, un secteur ecrit autrement - ne correspond a
# rien et ne se voit pas. Le client lit ici ce qui existe vraiment, avec le
# nombre d'annonces, et recopie.
#
# Une seule table plutot que deux blocs cote a cote : elle se trie et se
# filtre, ce que deux blocs juxtaposes ne permettent pas.
# --------------------------------------------------------------------------
PROFIL = ["Type", "Valeur", "Annonces", "Suivi"]

PROFIL_TYPE_PAYS = "Pays"
PROFIL_TYPE_SECTEUR = "Secteur"
LOG_STATUTS = ["SUCCESS", "ERROR", "SKIPPED", "DUPLICATE", "INFO"]

# --------------------------------------------------------------------------
# CONFIG - sections 18 et 32. Toute la configuration en un seul endroit,
# modifiable sans toucher au code.
# --------------------------------------------------------------------------
CONFIG_COLUMNS = ["Cle", "Valeur", "Description"]

CONFIG = [
    ("NOTIFICATION_EMAIL", "",
     "Adresse qui recoit les alertes. Plusieurs adresses possibles, "
     "separees par des points-virgules. Vide = aucun email envoye."),
    ("SEND_NEW_OPPORTUNITY", "true", "Email a chaque nouvelle opportunite."),
    ("SEND_J7", "true", "Email quand il reste 7 jours ou moins."),
    ("SEND_J3", "true", "Email quand il reste 3 jours ou moins."),
    ("SEND_J1", "true", "Email quand il reste 1 jour ou moins."),
    ("SEND_EXPIRED", "false", "Email quand la deadline est depassee."),
    ("NOTIFIER_PERTINENCE", "",
     "Ne recevoir que certains niveaux de pertinence, separes par des "
     "virgules. Exemple : 3 - PRIORITAIRE, 2 - A VOIR. Vide = tout est "
     "notifie. Les annonces ecartees restent dans le tableau : ce reglage "
     "coupe le bruit dans votre boite, il ne supprime rien. Voir l'onglet "
     "PAYS_ET_SECTEURS pour regler vos pays et vos secteurs."),
    ("MAX_EMAILS_PAR_EXECUTION", "20",
     "Nombre maximum d'emails envoyes en une seule execution. Les alertes "
     "au-dela ne sont PAS perdues : elles repartent au passage suivant, les "
     "plus pertinentes et les plus urgentes d'abord. Evite les 30 emails "
     "d'un coup au premier passage, et protege le quota Google (100 "
     "destinataires par jour sur un compte gmail.com, 1500 sur Workspace). "
     "Mettez 0 pour ne plafonner que sur le quota."),
    ("DIGEST_THRESHOLD", "5",
     "Au-dela de ce nombre de nouvelles opportunites dans une meme "
     "execution, un seul email recapitulatif remplace les emails unitaires."),
    ("TIMEZONE", "Africa/Porto-Novo",
     "Fuseau utilise pour calculer les jours restants."),
    ("BUDGET_COLLECTE_SECONDES", "240",
     "Temps maximum passe a lire les sources, en secondes. Google arrete "
     "toute execution a 6 minutes : au-dela de ce budget la collecte rend "
     "la main, et ce qui a ete lu est enregistre normalement - deadlines, "
     "couleurs et alertes comprises. Les sources non lues passent en tete "
     "au passage suivant, rien n'est oublie. Baissez-le si vos executions "
     "sont trop longues."),
    ("MAX_FICHES_PAR_PASSAGE", "12",
     "Certaines sources listent leurs avis sans date : l'echeance n'existe "
     "que sur la fiche de chaque avis. TenderPilot va alors la chercher, "
     "fiche par fiche, dans la limite de ce nombre par execution. Les "
     "annonces non traitees reviennent au passage suivant. Mettez 0 pour "
     "desactiver cette lecture en deux temps."),
    ("MAX_ITEMS_PER_SOURCE", "40",
     "Nombre maximum d'annonces lues par source et par execution."),
    ("COLLECT_EXPIRED", "false",
     "Collecter aussi les annonces dont la date limite est deja passee. "
     "Laisse a false : les portails gardent des annees d'archives en ligne, "
     "et elles noieraient les opportunites auxquelles vous pouvez repondre."),
    ("SEND_TELEGRAM", "false",
     "Envoyer aussi les alertes sur Telegram, en plus des emails."),
    ("TELEGRAM_TOKEN", "",
     "Jeton du bot, donne par @BotFather. Ne le partagez pas : il permet "
     "d'ecrire a votre place."),
    ("TELEGRAM_CHAT_ID", "",
     "Identifiant du salon ou du canal qui recoit les alertes. "
     "Ecrivez a @userinfobot pour connaitre le votre."),

    # ------------------------------------------------------------------
    # Votre profil. Il remplit la colonne Pertinence de l'onglet
    # OPPORTUNITIES, SANS AUCUNE CLE : ces deux reglages agissent meme
    # quand le classement intelligent est eteint.
    # ------------------------------------------------------------------
    ("PAYS_SUIVIS", "Benin",
     "Vos pays, separes par des virgules. Exemple : Benin, Togo, Niger. "
     "Remplit la colonne Pertinence a chaque passage, sans aucune cle : vos "
     "annonces remontent en tete du tableau. Ne decide PAS de ce qui est "
     "collecte - c'est l'onglet SOURCES qui le decide - et ne supprime "
     "jamais une ligne."),
    ("SECTEURS_SUIVIS", "",
     "Vos domaines, separes par des virgules. Exemple : Energie, Eau et "
     "assainissement, Numerique et technologie. Vide = tous les secteurs "
     "comptent. Comme PAYS_SUIVIS : remplit la colonne Pertinence, sans cle, "
     "et ne supprime jamais rien."),

    # ------------------------------------------------------------------
    # Classement intelligent. Entierement optionnel : sans cle, la collecte
    # se comporte exactement comme avant. La cle est celle du CLIENT - c'est
    # lui qui paie ses appels, et lui seul y a acces.
    # ------------------------------------------------------------------
    ("USE_LLM", "false",
     "Faire trier les annonces par un modele de langage. Il ecarte les "
     "articles et les FAQ, attribue un secteur et un type, et resume. "
     "Sans cle, ce reglage n'a aucun effet."),
    ("LLM_CLE", "",
     "Votre cle chez le fournisseur. Ne la partagez pas : c'est votre "
     "compte qui paie les appels."),
    ("LLM_MODELE", "mistral-small-latest",
     "Nom du modele. Un petit modele suffit largement pour trier."),
    ("LLM_DIALECTE", "openai",
     "openai (Mistral, Groq, DeepSeek, OpenRouter), anthropic ou gemini."),
    ("LLM_ENDPOINT", "",
     "Adresse de l'API. Vide = celle du dialecte choisi. A renseigner "
     "seulement pour un fournisseur inhabituel ou un modele auto-heberge."),
    ("LLM_MAX_APPELS_JOUR", "100",
     "Plafond d'appels par jour. Au-dela, le tri s'arrete pour la journee "
     "et la collecte continue normalement. C'est votre garde-fou de "
     "facture : en usage courant, une collecte demande 1 a 2 appels."),
    ("LLM_TAILLE_LOT", "30",
     "Nombre d'annonces envoyees en un seul appel. 30 est un bon compromis "
     "entre le cout et le risque de reponse tronquee."),
    ("LLM_APPELS_MONDIAUX", "true",
     "Garder les appels ouverts a tous les pays. Laissez a true : une "
     "structure beninoise peut candidater a un appel mondial."),
    ("LLM_FILTRER_ZONE", "false",
     "Supprimer les annonces jugees hors de vos pays. Laisse a false, "
     "elles restent visibles et simplement signalees - un salon a Nairobi "
     "peut valoir le deplacement."),
    ("LLM_INCLURE_EVENEMENTS", "false",
     "Garder les salons, ateliers, formations et conferences. Ecartes par "
     "defaut : ce ne sont pas des marches."),
]

CONFIG_KEYS = [key for key, _value, _desc in CONFIG]


def col_letter(sheet_columns, name):
    """Lettre de colonne Excel pour un nom de champ."""
    from openpyxl.utils import get_column_letter

    return get_column_letter(sheet_columns.index(name) + 1)
