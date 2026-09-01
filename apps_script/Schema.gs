/**
 * TenderPilot - FICHIER GENERE. NE PAS MODIFIER A LA MAIN.
 *
 * Genere par builders/toolkit.py depuis schema/columns.py.
 * Pour renommer une colonne : modifier le schema, puis relancer
 * `python build.py`.
 *
 * Schema 1.0.0
 */

var SCHEMA = {
  VERSION: "1.0.0",
  SHEETS: {
  "opportunities": "OPPORTUNITIES",
  "sources": "SOURCES",
  "config": "CONFIG",
  "logs": "LOGS"
},

  /** Cle technique -> nom de colonne de l'onglet OPPORTUNITIES. */
  OPP: {
  "id": "ID",
  "addedAt": "Date_Ajout",
  "title": "Opportunite",
  "org": "Organisation",
  "country": "Pays",
  "type": "Type",
  "sector": "Secteur",
  "source": "Source",
  "url": "Lien",
  "pdf": "PDF",
  "published": "Date_Publication",
  "deadline": "Deadline",
  "days": "Jours_Restants",
  "status": "Statut_Delai",
  "summary": "Resume",
  "notifNew": "Notif_Nouvelle",
  "notifJ7": "Notif_J7",
  "notifJ3": "Notif_J3",
  "notifJ1": "Notif_J1",
  "notifExpired": "Notif_Expire",
  "updatedAt": "Derniere_MAJ"
},

  /** Cle technique -> nom de colonne de l'onglet SOURCES. */
  SRC: {
  "id": "Source_ID",
  "name": "Nom",
  "method": "Methode",
  "url": "URL",
  "country": "Pays_Defaut",
  "sector": "Secteur_Defaut",
  "type": "Type_Defaut",
  "active": "Active",
  "lastRun": "Derniere_Collecte",
  "status": "Statut"
},

  /** Champs compares a chaque collecte pour detecter un changement. */
  UPDATABLE: [
  "title",
  "org",
  "country",
  "type",
  "sector",
  "url",
  "pdf",
  "published",
  "deadline",
  "summary"
],

  ID_PREFIX: "TP",
  SUMMARY_MAX: 400,

  STATUT_OUVERT: "OUVERT",
  STATUT_SURVEILLER: "A SURVEILLER",
  STATUT_BIENTOT: "BIENTOT",
  STATUT_URGENT: "URGENT",
  STATUT_EXPIRE: "EXPIRE",
  STATUT_INCONNU: "DATE A VERIFIER",

  /** (statut, seuil haut inclus), du plus urgent au plus large. */
  DELAI_SEUILS: [["URGENT", 3], ["BIENTOT", 7], ["A SURVEILLER", 15]],

  COULEURS: {
  "OUVERT": "#D8F3DC",
  "A SURVEILLER": "#FFF3BF",
  "BIENTOT": "#FFE0C2",
  "URGENT": "#FFD6D6",
  "EXPIRE": "#ECECEC",
  "DATE A VERIFIER": "#FFFBEA"
},

  /** Une opportunite recoit au maximum un email de chaque type. */
  NOTIFICATIONS: [
  {
    "key": "new",
    "column": "notifNew",
    "config": "SEND_NEW_OPPORTUNITY",
    "threshold": null
  },
  {
    "key": "j7",
    "column": "notifJ7",
    "config": "SEND_J7",
    "threshold": 7
  },
  {
    "key": "j3",
    "column": "notifJ3",
    "config": "SEND_J3",
    "threshold": 3
  },
  {
    "key": "j1",
    "column": "notifJ1",
    "config": "SEND_J1",
    "threshold": 1
  },
  {
    "key": "expired",
    "column": "notifExpired",
    "config": "SEND_EXPIRED",
    "threshold": -1
  }
],

  /**
   * Le catalogue de sources livre avec cette version.
   *
   * Il est embarque ici pour que le script puisse comparer l'onglet SOURCES
   * a ce qui devrait s'y trouver. Sans cette copie, un classeur installe il
   * y a six mois n'aurait aucun moyen d'apprendre qu'une source a ete
   * ajoutee ou qu'une adresse a change : il faudrait recreer le classeur et
   * perdre les opportunites deja collectees.
   *
   * Chaque entree est une ligne prete pour l'onglet, dans l'ordre des
   * colonnes de SCHEMA.SRC.
   */
  SOURCES_LIVREES: [
  [
    "UNDP-RAF",
    "PNUD - avis de marches - toute l'Afrique",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/RAF.xml",
    "Afrique (multi-pays)",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 141 annonce(s) - volumineux, activez avec prudence"
  ],
  [
    "AFDB-EOI",
    "BAD - avis a manifestation d'interet consultants",
    "RSS",
    "https://www.afdb.org/en/about-us/careers/current-vacancies/consultants/rss",
    "Afrique (multi-pays)",
    "",
    "AMI",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 16 avis (EOI cabinets et consultants)"
  ],
  [
    "UNDP-ALL",
    "PNUD - avis de marches - tous pays confondus",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/rss.xml",
    "International",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 429 annonce(s) - volumineux, activez avec prudence"
  ],
  [
    "UNDP-BEN",
    "PNUD - avis de marches - Benin",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/BEN.xml",
    "Benin",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 1 annonce(s)"
  ],
  [
    "BJ-DNCMP",
    "Marches Publics du Benin - appels d'offres",
    "RSS",
    "https://api.marches-publics.bj/v2/rss",
    "Benin",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 44 annonces. Flux succinct (titre generique, deadline rarement presente) : ouvrir le lien pour le detail."
  ],
  [
    "UNDP-BKF",
    "PNUD - avis de marches - Burkina Faso",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/BKF.xml",
    "Burkina Faso",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 3 annonce(s)"
  ],
  [
    "UNDP-CVI",
    "PNUD - avis de marches - Cap-Vert",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/CVI.xml",
    "Cap-Vert",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 0 annonce(s)"
  ],
  [
    "UNDP-IVC",
    "PNUD - avis de marches - Cote d'Ivoire",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/IVC.xml",
    "Cote d'Ivoire",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 2 annonce(s)"
  ],
  [
    "UNDP-GAM",
    "PNUD - avis de marches - Gambie",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/GAM.xml",
    "Gambie",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 4 annonce(s)"
  ],
  [
    "UNDP-GHA",
    "PNUD - avis de marches - Ghana",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/GHA.xml",
    "Ghana",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 3 annonce(s)"
  ],
  [
    "UNDP-GUI",
    "PNUD - avis de marches - Guinee",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/GUI.xml",
    "Guinee",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 5 annonce(s)"
  ],
  [
    "UNDP-GBS",
    "PNUD - avis de marches - Guinee-Bissau",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/GBS.xml",
    "Guinee-Bissau",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 12 annonce(s)"
  ],
  [
    "UNDP-LIR",
    "PNUD - avis de marches - Liberia",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/LIR.xml",
    "Liberia",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 1 annonce(s)"
  ],
  [
    "UNDP-MLI",
    "PNUD - avis de marches - Mali",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/MLI.xml",
    "Mali",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 1 annonce(s)"
  ],
  [
    "UNDP-MAU",
    "PNUD - avis de marches - Mauritanie",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/MAU.xml",
    "Mauritanie",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 2 annonce(s)"
  ],
  [
    "UNDP-NER",
    "PNUD - avis de marches - Niger",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/NER.xml",
    "Niger",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 5 annonce(s)"
  ],
  [
    "UNDP-NIR",
    "PNUD - avis de marches - Nigeria",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/NIR.xml",
    "Nigeria",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 6 annonce(s)"
  ],
  [
    "UNDP-SEN",
    "PNUD - avis de marches - Senegal",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/SEN.xml",
    "Senegal",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 7 annonce(s)"
  ],
  [
    "UNDP-SIL",
    "PNUD - avis de marches - Sierra Leone",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/SIL.xml",
    "Sierra Leone",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 3 annonce(s)"
  ],
  [
    "UNDP-TOG",
    "PNUD - avis de marches - Togo",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/TOG.xml",
    "Togo",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 2 annonce(s)"
  ],
  [
    "UNDP-BDI",
    "PNUD - avis de marches - Burundi",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/BDI.xml",
    "Burundi",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 2 annonce(s)"
  ],
  [
    "UNDP-CMR",
    "PNUD - avis de marches - Cameroun",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/CMR.xml",
    "Cameroun",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 2 annonce(s)"
  ],
  [
    "UNDP-PRC",
    "PNUD - avis de marches - Congo",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/PRC.xml",
    "Congo",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 2 annonce(s)"
  ],
  [
    "UNDP-GAB",
    "PNUD - avis de marches - Gabon",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/GAB.xml",
    "Gabon",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 1 annonce(s)"
  ],
  [
    "UNDP-EQG",
    "PNUD - avis de marches - Guinee equatoriale",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/EQG.xml",
    "Guinee equatoriale",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 2 annonce(s)"
  ],
  [
    "UNDP-ZAI",
    "PNUD - avis de marches - RDC",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/ZAI.xml",
    "RDC",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 3 annonce(s)"
  ],
  [
    "UNDP-CAF",
    "PNUD - avis de marches - Republique centrafricaine",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/CAF.xml",
    "Republique centrafricaine",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 3 annonce(s)"
  ],
  [
    "UNDP-STP",
    "PNUD - avis de marches - Sao Tome-et-Principe",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/STP.xml",
    "Sao Tome-et-Principe",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 2 annonce(s)"
  ],
  [
    "UNDP-CHD",
    "PNUD - avis de marches - Tchad",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/CHD.xml",
    "Tchad",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 8 annonce(s)"
  ],
  [
    "UNDP-COI",
    "PNUD - avis de marches - Comores",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/COI.xml",
    "Comores",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 0 annonce(s)"
  ],
  [
    "UNDP-DJI",
    "PNUD - avis de marches - Djibouti",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/DJI.xml",
    "Djibouti",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 1 annonce(s)"
  ],
  [
    "UNDP-ERI",
    "PNUD - avis de marches - Erythree",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/ERI.xml",
    "Erythree",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 0 annonce(s)"
  ],
  [
    "UNDP-ETH",
    "PNUD - avis de marches - Ethiopie",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/ETH.xml",
    "Ethiopie",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 8 annonce(s)"
  ],
  [
    "UNDP-KEN",
    "PNUD - avis de marches - Kenya",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/KEN.xml",
    "Kenya",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 0 annonce(s)"
  ],
  [
    "UNDP-MAG",
    "PNUD - avis de marches - Madagascar",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/MAG.xml",
    "Madagascar",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 14 annonce(s)"
  ],
  [
    "UNDP-MAR",
    "PNUD - avis de marches - Maurice",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/MAR.xml",
    "Maurice",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 2 annonce(s)"
  ],
  [
    "UNDP-UGA",
    "PNUD - avis de marches - Ouganda",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/UGA.xml",
    "Ouganda",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 3 annonce(s)"
  ],
  [
    "UNDP-RWA",
    "PNUD - avis de marches - Rwanda",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/RWA.xml",
    "Rwanda",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 3 annonce(s)"
  ],
  [
    "UNDP-SEY",
    "PNUD - avis de marches - Seychelles",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/SEY.xml",
    "Seychelles",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 0 annonce(s)"
  ],
  [
    "UNDP-SOM",
    "PNUD - avis de marches - Somalie",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/SOM.xml",
    "Somalie",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 3 annonce(s)"
  ],
  [
    "UNDP-SUD",
    "PNUD - avis de marches - Soudan",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/SUD.xml",
    "Soudan",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 1 annonce(s)"
  ],
  [
    "UNDP-SSD",
    "PNUD - avis de marches - Soudan du Sud",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/SSD.xml",
    "Soudan du Sud",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 4 annonce(s)"
  ],
  [
    "UNDP-URT",
    "PNUD - avis de marches - Tanzanie",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/URT.xml",
    "Tanzanie",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 2 annonce(s)"
  ],
  [
    "UNDP-ALG",
    "PNUD - avis de marches - Algerie",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/ALG.xml",
    "Algerie",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 2 annonce(s)"
  ],
  [
    "UNDP-EGY",
    "PNUD - avis de marches - Egypte",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/EGY.xml",
    "Egypte",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 2 annonce(s)"
  ],
  [
    "UNDP-LIB",
    "PNUD - avis de marches - Libye",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/LIB.xml",
    "Libye",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 5 annonce(s)"
  ],
  [
    "UNDP-MOR",
    "PNUD - avis de marches - Maroc",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/MOR.xml",
    "Maroc",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 3 annonce(s)"
  ],
  [
    "UNDP-TUN",
    "PNUD - avis de marches - Tunisie",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/TUN.xml",
    "Tunisie",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 21 annonce(s)"
  ],
  [
    "UNDP-SAF",
    "PNUD - avis de marches - Afrique du Sud",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/SAF.xml",
    "Afrique du Sud",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 1 annonce(s)"
  ],
  [
    "UNDP-ANG",
    "PNUD - avis de marches - Angola",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/ANG.xml",
    "Angola",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 0 annonce(s)"
  ],
  [
    "UNDP-BOT",
    "PNUD - avis de marches - Botswana",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/BOT.xml",
    "Botswana",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 1 annonce(s)"
  ],
  [
    "UNDP-SWA",
    "PNUD - avis de marches - Eswatini",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/SWA.xml",
    "Eswatini",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 3 annonce(s)"
  ],
  [
    "UNDP-LES",
    "PNUD - avis de marches - Lesotho",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/LES.xml",
    "Lesotho",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 3 annonce(s)"
  ],
  [
    "UNDP-MLW",
    "PNUD - avis de marches - Malawi",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/MLW.xml",
    "Malawi",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 1 annonce(s)"
  ],
  [
    "UNDP-MOZ",
    "PNUD - avis de marches - Mozambique",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/MOZ.xml",
    "Mozambique",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 6 annonce(s)"
  ],
  [
    "UNDP-NAM",
    "PNUD - avis de marches - Namibie",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/NAM.xml",
    "Namibie",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 1 annonce(s)"
  ],
  [
    "UNDP-ZAM",
    "PNUD - avis de marches - Zambie",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/ZAM.xml",
    "Zambie",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 3 annonce(s)"
  ],
  [
    "UNDP-ZIM",
    "PNUD - avis de marches - Zimbabwe",
    "RSS",
    "https://procurement-notices.undp.org/rss_feeds/ZIM.xml",
    "Zimbabwe",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 4 annonce(s)"
  ],
  [
    "BJ-GOUV",
    "Portail national du Benin - marches publics",
    "HTML:gouv.bj",
    "https://www.gouv.bj/opportunites/marches-publics/",
    "Benin",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-30 : 32 annonces, 19 avec echeance. Collecte HTML (pas de RSS) : peut casser si le site change."
  ],
  [
    "AFDB-NOTICES",
    "BAD - avis de marches (EOI, AMI, SPN, GPN)",
    "HTML:afdb.org",
    "https://www.afdb.org/en/documents/project-related-procurement",
    "Afrique (multi-pays)",
    "",
    "AMI",
    "OUI",
    "",
    "Verifie le 2026-08-31 : 11 avis (EOI, AMI, SPN). Collecte HTML : peut casser si le site change. Le site limite le debit et repond parfois 403 : la collecte suivante repasse."
  ],
  [
    "WB-BEN",
    "Banque mondiale - avis de marches des projets au Benin",
    "JSON:worldbank.org",
    "https://search.worldbank.org/api/v2/procnotices?format=json&project_ctry_name=Benin&rows=100&srt=noticedate&order=desc",
    "Benin",
    "",
    "",
    "OUI",
    "",
    "Verifie le 2026-08-31 : 2562 avis Benin au total ; 31 remontes par collecte apres retrait des marches deja attribues. API JSON publique : acheteur, type et echeance structures."
  ],
  [
    "ENABEL-BEN",
    "Enabel - marches publics au Benin",
    "HTML:enabel.be",
    "https://www.enabel.be/public-procurement/?in_country=850&is_status=0",
    "Benin",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-31 : 1 marche ouvert sur 10 publies. Seule source donnant un statut Open/Close explicite : les marches clos sont ecartes. Collecte HTML : peut casser."
  ],
  [
    "ARMP-BJ",
    "ARMP Benin - appels d'offres et AMI",
    "HTML:armp.bj",
    "https://armp.bj/category/actualites/appels-doffres/",
    "Benin",
    "Gouvernance et institutions",
    "",
    "NON",
    "",
    "Verifie le 2026-08-31 : 9 avis, le plus recent du 02/03/2026. L'ARMP publie 1 a 2 avis par an : inactive par defaut pour ne pas encombrer."
  ],
  [
    "BJ-SBEE",
    "SBEE - portail des marches (electricite)",
    "HTML:sbee.bj",
    "https://marches-publics.sbee.bj/",
    "Benin",
    "Energie",
    "",
    "OUI",
    "",
    "Verifie le 2026-08-31 : 8 avis, tous dates. La source beninoise la plus complete : reference, type de marche, publication et date limite en clair."
  ],
  [
    "BJ-SONEB",
    "SONEB - marches publics (eau)",
    "HTML:soneb.bj",
    "https://web.soneb.bj/marches-publics",
    "Benin",
    "Eau et assainissement",
    "",
    "OUI",
    "",
    "Verifie le 2026-08-31 : 30 avis, tous avec date de publication et de cloture. Table Drupal stable."
  ],
  [
    "BJ-ABE",
    "ABE - appels d'offres (environnement)",
    "HTML:abe.bj",
    "https://www.abe.bj/appels-doffres/",
    "Benin",
    "Environnement",
    "",
    "OUI",
    "",
    "Verifie le 2026-08-31 : 9 avis en premiere page (22 au total), 7 avec echeance. Les avis echus ne sont pas ecartes : l'ABE n'offre aucun filtre d'URL."
  ],
  [
    "ARAA-CEDEAO",
    "ARAA - marches (agriculture CEDEAO)",
    "HTML:araa.org",
    "https://www.araa.org/fr/marches",
    "Afrique de l'Ouest",
    "Agriculture",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-31 : 12 avis, tous avec echeance ISO. Attention : l'adresse /fr/opportunites renvoie 404, la liste est sur /fr/marches."
  ],
  [
    "BCEAO-MP",
    "BCEAO - marches publics UMOA",
    "HTML:bceao.int",
    "https://www.bceao.int/fr/appels-offres/appels-offres-marches-publics-achats",
    "Afrique de l'Ouest",
    "",
    "Appel d'offres",
    "OUI",
    "",
    "Verifie le 2026-08-31 : 20 avis, tous dates. Couvre les huit pays de l'UMOA, pas seulement le Benin."
  ],
  [
    "BJ-MCA",
    "MCA-Benin Regional - actualites et avis",
    "RSS",
    "https://mcabeninreg.bj/feed/",
    "Benin",
    "Infrastructures et BTP",
    "",
    "NON",
    "",
    "Verifie le 2026-08-31 : flux MIXTE - 1 avis de marche sur 10 items, le reste est de l'actualite. Inactive par defaut : a activer pour la veille projet."
  ],
  [
    "BJ-DEDRAS",
    "DEDRAS-ONG - portail e-procurement",
    "HTML:dedras.org",
    "https://eprocurement.dedras.org/toutvoir",
    "Benin",
    "",
    "",
    "OUI",
    "",
    "Verifie le 2026-08-31 : 98 avis, tous avec type, date de publication et limite de depot. ONG locale : demandes de cotation et AMI que les grands agregateurs ne couvrent pas."
  ],
  [
    "AFD-APPELS",
    "AFD - appels a projets",
    "HTML:afd.fr",
    "https://www.afd.fr/fr/appels-a-projets/liste?status%5Bongoing%5D=ongoing&status%5Bsoon%5D=soon",
    "International",
    "",
    "Appel a projets",
    "OUI",
    "",
    "Verifie le 2026-08-31 : 2 appels ouverts. Volume faible mais bailleur majeur. Les deux dates sont donnees ensemble (ouverture - cloture)."
  ],
  [
    "TERRAVIVA",
    "Terra Viva Grants - financements environnement",
    "RSS",
    "https://www.terravivagrants.org/feed/",
    "International",
    "Environnement",
    "Subvention",
    "OUI",
    "",
    "Verifie le 2026-08-31 : 10 items a jour (aout 2026), vrais appels a financement. Agriculture, climat, energie, biodiversite."
  ],
  [
    "OPP-AFRICANS",
    "Opportunities For Africans - bourses et programmes",
    "RSS",
    "https://www.opportunitiesforafricans.com/feed/",
    "Afrique (multi-pays)",
    "Education et formation",
    "Bourse",
    "OUI",
    "",
    "Verifie le 2026-08-31 : 10 items a jour. Bourses et fellowships destines a des PERSONNES, pas a des structures : type Bourse."
  ]
]
};

// Export pour les tests Node. Apps Script n'a pas de module.
if (typeof module !== 'undefined') {
  module.exports = { SCHEMA: SCHEMA };
}
