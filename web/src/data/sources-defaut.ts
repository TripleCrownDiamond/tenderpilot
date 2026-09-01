/**
 * TenderPilot - sources livrees par defaut.
 *
 * FICHIER GENERE depuis data/sources.csv a la racine du depot.
 * Relancer `python scripts/exporter_sources.py` apres modification du CSV.
 * Toute retouche faite ici sera perdue a la prochaine generation.
 *
 * 90 sources : 61 flux RSS, 18 API JSON,
 * 11 collectes HTML, 0 manuelle(s).
 * 44 actives par defaut. Chaque source a ete recuperee et verifiee :
 * la propriete `statut` porte la date du controle et ce qui a ete trouve
 * ce jour-la.
 *
 * Les trois methodes, de la plus solide a la plus fragile :
 *
 *   JSON:<nom>  une API publique. Contrat stable, champs structures.
 *   RSS         un flux standard. Stable, mais texte libre et pauvre.
 *   HTML:<nom>  une extraction de page. A n'utiliser qu'a defaut.
 */

export type MethodeSource =
  | "RSS"
  | "MANUAL"
  | `HTML:${string}`
  | `JSON:${string}`;

export interface SourceDefaut {
  code: string;
  nom: string;
  methode: MethodeSource;
  url: string;
  paysDefaut: string | null;
  secteurDefaut: string | null;
  typeDefaut: string | null;
  active: boolean;
  statut: string | null;
}

export const SOURCES_DEFAUT: SourceDefaut[] = [
  {
    "code": "UNDP-RAF",
    "nom": "PNUD - avis de marches - toute l'Afrique",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/RAF.xml",
    "paysDefaut": "Afrique (multi-pays)",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-08-30 : 141 annonce(s) - volumineux, activez avec prudence. Livree inactive : flux tres volumineux, tous pays confondus. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "AFDB-EOI",
    "nom": "BAD - avis a manifestation d'interet consultants",
    "methode": "RSS",
    "url": "https://www.afdb.org/en/about-us/careers/current-vacancies/consultants/rss",
    "paysDefaut": "Afrique (multi-pays)",
    "secteurDefaut": null,
    "typeDefaut": "AMI",
    "active": true,
    "statut": "Verifie le 2026-08-30 : 16 avis (EOI cabinets et consultants)"
  },
  {
    "code": "UNDP-ALL",
    "nom": "PNUD - avis de marches - tous pays confondus",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/rss.xml",
    "paysDefaut": "International",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-08-30 : 429 annonce(s) - volumineux, activez avec prudence. Livree inactive : flux tres volumineux, tous pays confondus. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "UNDP-BEN",
    "nom": "PNUD - avis de marches - Benin",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/BEN.xml",
    "paysDefaut": "Benin",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": true,
    "statut": "Verifie le 2026-08-30 : 1 annonce(s)"
  },
  {
    "code": "BJ-DNCMP",
    "nom": "Marches Publics du Benin - appels d'offres",
    "methode": "RSS",
    "url": "https://api.marches-publics.bj/v2/rss",
    "paysDefaut": "Benin",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": true,
    "statut": "Verifie le 2026-08-30 : 44 annonces. Flux succinct (titre generique, deadline rarement presente) : ouvrir le lien pour le detail."
  },
  {
    "code": "UNDP-BKF",
    "nom": "PNUD - avis de marches - Burkina Faso",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/BKF.xml",
    "paysDefaut": "Burkina Faso",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": true,
    "statut": "Verifie le 2026-08-30 : 3 annonce(s)"
  },
  {
    "code": "UNDP-CVI",
    "nom": "PNUD - avis de marches - Cap-Vert",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/CVI.xml",
    "paysDefaut": "Cap-Vert",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": true,
    "statut": "Verifie le 2026-08-30 : 0 annonce(s)"
  },
  {
    "code": "UNDP-IVC",
    "nom": "PNUD - avis de marches - Cote d'Ivoire",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/IVC.xml",
    "paysDefaut": "Cote d'Ivoire",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": true,
    "statut": "Verifie le 2026-08-30 : 2 annonce(s)"
  },
  {
    "code": "UNDP-GAM",
    "nom": "PNUD - avis de marches - Gambie",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/GAM.xml",
    "paysDefaut": "Gambie",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": true,
    "statut": "Verifie le 2026-08-30 : 4 annonce(s)"
  },
  {
    "code": "UNDP-GHA",
    "nom": "PNUD - avis de marches - Ghana",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/GHA.xml",
    "paysDefaut": "Ghana",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": true,
    "statut": "Verifie le 2026-08-30 : 3 annonce(s)"
  },
  {
    "code": "UNDP-GUI",
    "nom": "PNUD - avis de marches - Guinee",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/GUI.xml",
    "paysDefaut": "Guinee",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": true,
    "statut": "Verifie le 2026-08-30 : 5 annonce(s)"
  },
  {
    "code": "UNDP-GBS",
    "nom": "PNUD - avis de marches - Guinee-Bissau",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/GBS.xml",
    "paysDefaut": "Guinee-Bissau",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": true,
    "statut": "Verifie le 2026-08-30 : 12 annonce(s)"
  },
  {
    "code": "UNDP-LIR",
    "nom": "PNUD - avis de marches - Liberia",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/LIR.xml",
    "paysDefaut": "Liberia",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": true,
    "statut": "Verifie le 2026-08-30 : 1 annonce(s)"
  },
  {
    "code": "UNDP-MLI",
    "nom": "PNUD - avis de marches - Mali",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/MLI.xml",
    "paysDefaut": "Mali",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": true,
    "statut": "Verifie le 2026-08-30 : 1 annonce(s)"
  },
  {
    "code": "UNDP-MAU",
    "nom": "PNUD - avis de marches - Mauritanie",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/MAU.xml",
    "paysDefaut": "Mauritanie",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-08-30 : 2 annonce(s). Livree inactive : hors zone CEDEAO. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "UNDP-NER",
    "nom": "PNUD - avis de marches - Niger",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/NER.xml",
    "paysDefaut": "Niger",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": true,
    "statut": "Verifie le 2026-08-30 : 5 annonce(s)"
  },
  {
    "code": "UNDP-NIR",
    "nom": "PNUD - avis de marches - Nigeria",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/NIR.xml",
    "paysDefaut": "Nigeria",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": true,
    "statut": "Verifie le 2026-08-30 : 6 annonce(s)"
  },
  {
    "code": "UNDP-SEN",
    "nom": "PNUD - avis de marches - Senegal",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/SEN.xml",
    "paysDefaut": "Senegal",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": true,
    "statut": "Verifie le 2026-08-30 : 7 annonce(s)"
  },
  {
    "code": "UNDP-SIL",
    "nom": "PNUD - avis de marches - Sierra Leone",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/SIL.xml",
    "paysDefaut": "Sierra Leone",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": true,
    "statut": "Verifie le 2026-08-30 : 3 annonce(s)"
  },
  {
    "code": "UNDP-TOG",
    "nom": "PNUD - avis de marches - Togo",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/TOG.xml",
    "paysDefaut": "Togo",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": true,
    "statut": "Verifie le 2026-08-30 : 2 annonce(s)"
  },
  {
    "code": "UNDP-BDI",
    "nom": "PNUD - avis de marches - Burundi",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/BDI.xml",
    "paysDefaut": "Burundi",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-08-30 : 2 annonce(s). Livree inactive : hors zone CEDEAO. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "UNDP-CMR",
    "nom": "PNUD - avis de marches - Cameroun",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/CMR.xml",
    "paysDefaut": "Cameroun",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-08-30 : 2 annonce(s). Livree inactive : hors zone CEDEAO. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "UNDP-PRC",
    "nom": "PNUD - avis de marches - Congo",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/PRC.xml",
    "paysDefaut": "Congo",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-08-30 : 2 annonce(s). Livree inactive : hors zone CEDEAO. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "UNDP-GAB",
    "nom": "PNUD - avis de marches - Gabon",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/GAB.xml",
    "paysDefaut": "Gabon",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-08-30 : 1 annonce(s). Livree inactive : hors zone CEDEAO. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "UNDP-EQG",
    "nom": "PNUD - avis de marches - Guinee equatoriale",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/EQG.xml",
    "paysDefaut": "Guinee equatoriale",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-08-30 : 2 annonce(s). Livree inactive : hors zone CEDEAO. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "UNDP-ZAI",
    "nom": "PNUD - avis de marches - RDC",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/ZAI.xml",
    "paysDefaut": "RDC",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-08-30 : 3 annonce(s). Livree inactive : hors zone CEDEAO. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "UNDP-CAF",
    "nom": "PNUD - avis de marches - Republique centrafricaine",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/CAF.xml",
    "paysDefaut": "Republique centrafricaine",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-08-30 : 3 annonce(s). Livree inactive : hors zone CEDEAO. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "UNDP-STP",
    "nom": "PNUD - avis de marches - Sao Tome-et-Principe",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/STP.xml",
    "paysDefaut": "Sao Tome-et-Principe",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-08-30 : 2 annonce(s). Livree inactive : hors zone CEDEAO. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "UNDP-CHD",
    "nom": "PNUD - avis de marches - Tchad",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/CHD.xml",
    "paysDefaut": "Tchad",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-08-30 : 8 annonce(s). Livree inactive : hors zone CEDEAO. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "UNDP-COI",
    "nom": "PNUD - avis de marches - Comores",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/COI.xml",
    "paysDefaut": "Comores",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-08-30 : 0 annonce(s). Livree inactive : hors zone CEDEAO. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "UNDP-DJI",
    "nom": "PNUD - avis de marches - Djibouti",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/DJI.xml",
    "paysDefaut": "Djibouti",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-08-30 : 1 annonce(s). Livree inactive : hors zone CEDEAO. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "UNDP-ERI",
    "nom": "PNUD - avis de marches - Erythree",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/ERI.xml",
    "paysDefaut": "Erythree",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-08-30 : 0 annonce(s). Livree inactive : hors zone CEDEAO. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "UNDP-ETH",
    "nom": "PNUD - avis de marches - Ethiopie",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/ETH.xml",
    "paysDefaut": "Ethiopie",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-08-30 : 8 annonce(s). Livree inactive : hors zone CEDEAO. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "UNDP-KEN",
    "nom": "PNUD - avis de marches - Kenya",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/KEN.xml",
    "paysDefaut": "Kenya",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-08-30 : 0 annonce(s). Livree inactive : hors zone CEDEAO. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "UNDP-MAG",
    "nom": "PNUD - avis de marches - Madagascar",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/MAG.xml",
    "paysDefaut": "Madagascar",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-08-30 : 14 annonce(s). Livree inactive : hors zone CEDEAO. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "UNDP-MAR",
    "nom": "PNUD - avis de marches - Maurice",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/MAR.xml",
    "paysDefaut": "Maurice",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-08-30 : 2 annonce(s). Livree inactive : hors zone CEDEAO. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "UNDP-UGA",
    "nom": "PNUD - avis de marches - Ouganda",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/UGA.xml",
    "paysDefaut": "Ouganda",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-08-30 : 3 annonce(s). Livree inactive : hors zone CEDEAO. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "UNDP-RWA",
    "nom": "PNUD - avis de marches - Rwanda",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/RWA.xml",
    "paysDefaut": "Rwanda",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-08-30 : 3 annonce(s). Livree inactive : hors zone CEDEAO. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "UNDP-SEY",
    "nom": "PNUD - avis de marches - Seychelles",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/SEY.xml",
    "paysDefaut": "Seychelles",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-08-30 : 0 annonce(s). Livree inactive : hors zone CEDEAO. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "UNDP-SOM",
    "nom": "PNUD - avis de marches - Somalie",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/SOM.xml",
    "paysDefaut": "Somalie",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-08-30 : 3 annonce(s). Livree inactive : hors zone CEDEAO. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "UNDP-SUD",
    "nom": "PNUD - avis de marches - Soudan",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/SUD.xml",
    "paysDefaut": "Soudan",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-08-30 : 1 annonce(s). Livree inactive : hors zone CEDEAO. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "UNDP-SSD",
    "nom": "PNUD - avis de marches - Soudan du Sud",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/SSD.xml",
    "paysDefaut": "Soudan du Sud",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-08-30 : 4 annonce(s). Livree inactive : hors zone CEDEAO. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "UNDP-URT",
    "nom": "PNUD - avis de marches - Tanzanie",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/URT.xml",
    "paysDefaut": "Tanzanie",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-08-30 : 2 annonce(s). Livree inactive : hors zone CEDEAO. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "UNDP-ALG",
    "nom": "PNUD - avis de marches - Algerie",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/ALG.xml",
    "paysDefaut": "Algerie",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-08-30 : 2 annonce(s). Livree inactive : hors zone CEDEAO. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "UNDP-EGY",
    "nom": "PNUD - avis de marches - Egypte",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/EGY.xml",
    "paysDefaut": "Egypte",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-08-30 : 2 annonce(s). Livree inactive : hors zone CEDEAO. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "UNDP-LIB",
    "nom": "PNUD - avis de marches - Libye",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/LIB.xml",
    "paysDefaut": "Libye",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-08-30 : 5 annonce(s). Livree inactive : hors zone CEDEAO. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "UNDP-MOR",
    "nom": "PNUD - avis de marches - Maroc",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/MOR.xml",
    "paysDefaut": "Maroc",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-08-30 : 3 annonce(s). Livree inactive : hors zone CEDEAO. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "UNDP-TUN",
    "nom": "PNUD - avis de marches - Tunisie",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/TUN.xml",
    "paysDefaut": "Tunisie",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-08-30 : 21 annonce(s). Livree inactive : hors zone CEDEAO. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "UNDP-SAF",
    "nom": "PNUD - avis de marches - Afrique du Sud",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/SAF.xml",
    "paysDefaut": "Afrique du Sud",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-08-30 : 1 annonce(s). Livree inactive : hors zone CEDEAO. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "UNDP-ANG",
    "nom": "PNUD - avis de marches - Angola",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/ANG.xml",
    "paysDefaut": "Angola",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-08-30 : 0 annonce(s). Livree inactive : hors zone CEDEAO. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "UNDP-BOT",
    "nom": "PNUD - avis de marches - Botswana",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/BOT.xml",
    "paysDefaut": "Botswana",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-08-30 : 1 annonce(s). Livree inactive : hors zone CEDEAO. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "UNDP-SWA",
    "nom": "PNUD - avis de marches - Eswatini",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/SWA.xml",
    "paysDefaut": "Eswatini",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-08-30 : 3 annonce(s). Livree inactive : hors zone CEDEAO. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "UNDP-LES",
    "nom": "PNUD - avis de marches - Lesotho",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/LES.xml",
    "paysDefaut": "Lesotho",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-08-30 : 3 annonce(s). Livree inactive : hors zone CEDEAO. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "UNDP-MLW",
    "nom": "PNUD - avis de marches - Malawi",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/MLW.xml",
    "paysDefaut": "Malawi",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-08-30 : 1 annonce(s). Livree inactive : hors zone CEDEAO. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "UNDP-MOZ",
    "nom": "PNUD - avis de marches - Mozambique",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/MOZ.xml",
    "paysDefaut": "Mozambique",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-08-30 : 6 annonce(s). Livree inactive : hors zone CEDEAO. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "UNDP-NAM",
    "nom": "PNUD - avis de marches - Namibie",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/NAM.xml",
    "paysDefaut": "Namibie",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-08-30 : 1 annonce(s). Livree inactive : hors zone CEDEAO. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "UNDP-ZAM",
    "nom": "PNUD - avis de marches - Zambie",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/ZAM.xml",
    "paysDefaut": "Zambie",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-08-30 : 3 annonce(s). Livree inactive : hors zone CEDEAO. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "UNDP-ZIM",
    "nom": "PNUD - avis de marches - Zimbabwe",
    "methode": "RSS",
    "url": "https://procurement-notices.undp.org/rss_feeds/ZIM.xml",
    "paysDefaut": "Zimbabwe",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-08-30 : 4 annonce(s). Livree inactive : hors zone CEDEAO. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "BJ-GOUV",
    "nom": "Portail national du Benin - marches publics",
    "methode": "HTML:gouv.bj",
    "url": "https://www.gouv.bj/opportunites/marches-publics/",
    "paysDefaut": "Benin",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": true,
    "statut": "Verifie le 2026-08-30 : 32 annonces, 19 avec echeance. Collecte HTML (pas de RSS) : peut casser si le site change."
  },
  {
    "code": "AFDB-NOTICES",
    "nom": "BAD - avis de marches (EOI, AMI, SPN, GPN)",
    "methode": "HTML:afdb.org",
    "url": "https://www.afdb.org/en/documents/project-related-procurement",
    "paysDefaut": "Afrique (multi-pays)",
    "secteurDefaut": null,
    "typeDefaut": "AMI",
    "active": true,
    "statut": "Verifie le 2026-08-31 : 11 avis (EOI, AMI, SPN). Collecte HTML : peut casser si le site change. Le site limite le debit et repond parfois 403 : la collecte suivante repasse."
  },
  {
    "code": "WB-BEN",
    "nom": "Banque mondiale - avis de marches des projets au Benin",
    "methode": "JSON:worldbank.org",
    "url": "https://search.worldbank.org/api/v2/procnotices?format=json&project_ctry_name=Benin&rows=100&srt=noticedate&order=desc",
    "paysDefaut": "Benin",
    "secteurDefaut": null,
    "typeDefaut": null,
    "active": true,
    "statut": "Verifie le 2026-08-31 : 2562 avis Benin au total ; 31 remontes par collecte apres retrait des marches deja attribues. API JSON publique : acheteur, type et echeance structures."
  },
  {
    "code": "ENABEL-BEN",
    "nom": "Enabel - marches publics au Benin",
    "methode": "HTML:enabel.be",
    "url": "https://www.enabel.be/public-procurement/?in_country=850&is_status=0",
    "paysDefaut": "Benin",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": true,
    "statut": "Verifie le 2026-08-31 : 1 marche ouvert sur 10 publies. Seule source donnant un statut Open/Close explicite : les marches clos sont ecartes. Collecte HTML : peut casser."
  },
  {
    "code": "ARMP-BJ",
    "nom": "ARMP Benin - appels d'offres et AMI",
    "methode": "HTML:armp.bj",
    "url": "https://armp.bj/category/actualites/appels-doffres/",
    "paysDefaut": "Benin",
    "secteurDefaut": "Gouvernance et institutions",
    "typeDefaut": null,
    "active": false,
    "statut": "Verifie le 2026-08-31 : 9 avis, le plus recent du 02/03/2026. L'ARMP publie 1 a 2 avis par an : inactive par defaut pour ne pas encombrer."
  },
  {
    "code": "BJ-SBEE",
    "nom": "SBEE - portail des marches (electricite)",
    "methode": "HTML:sbee.bj",
    "url": "https://marches-publics.sbee.bj/",
    "paysDefaut": "Benin",
    "secteurDefaut": "Energie",
    "typeDefaut": null,
    "active": true,
    "statut": "Verifie le 2026-08-31 : 8 avis, tous dates. La source beninoise la plus complete : reference, type de marche, publication et date limite en clair."
  },
  {
    "code": "BJ-SONEB",
    "nom": "SONEB - marches publics (eau)",
    "methode": "HTML:soneb.bj",
    "url": "https://web.soneb.bj/marches-publics",
    "paysDefaut": "Benin",
    "secteurDefaut": "Eau et assainissement",
    "typeDefaut": null,
    "active": true,
    "statut": "Verifie le 2026-08-31 : 30 avis, tous avec date de publication et de cloture. Table Drupal stable."
  },
  {
    "code": "BJ-ABE",
    "nom": "ABE - appels d'offres (environnement)",
    "methode": "HTML:abe.bj",
    "url": "https://www.abe.bj/appels-doffres/",
    "paysDefaut": "Benin",
    "secteurDefaut": "Environnement",
    "typeDefaut": null,
    "active": true,
    "statut": "Verifie le 2026-08-31 : 9 avis en premiere page (22 au total), 7 avec echeance. Les avis echus ne sont pas ecartes : l'ABE n'offre aucun filtre d'URL."
  },
  {
    "code": "ARAA-CEDEAO",
    "nom": "ARAA - marches (agriculture CEDEAO)",
    "methode": "HTML:araa.org",
    "url": "https://www.araa.org/fr/marches",
    "paysDefaut": "Afrique de l'Ouest",
    "secteurDefaut": "Agriculture",
    "typeDefaut": "Appel d'offres",
    "active": true,
    "statut": "Verifie le 2026-08-31 : 12 avis, tous avec echeance ISO. Attention : l'adresse /fr/opportunites renvoie 404, la liste est sur /fr/marches."
  },
  {
    "code": "BCEAO-MP",
    "nom": "BCEAO - marches publics UMOA",
    "methode": "HTML:bceao.int",
    "url": "https://www.bceao.int/fr/appels-offres/appels-offres-marches-publics-achats",
    "paysDefaut": "Afrique de l'Ouest",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": true,
    "statut": "Verifie le 2026-08-31 : 20 avis, tous dates. Couvre les huit pays de l'UMOA, pas seulement le Benin."
  },
  {
    "code": "BJ-MCA",
    "nom": "MCA-Benin Regional - actualites et avis",
    "methode": "RSS",
    "url": "https://mcabeninreg.bj/feed/",
    "paysDefaut": "Benin",
    "secteurDefaut": "Infrastructures et BTP",
    "typeDefaut": null,
    "active": false,
    "statut": "Verifie le 2026-08-31 : flux MIXTE - 1 avis de marche sur 10 items, le reste est de l'actualite. Inactive par defaut : a activer pour la veille projet."
  },
  {
    "code": "BJ-DEDRAS",
    "nom": "DEDRAS-ONG - portail e-procurement",
    "methode": "HTML:dedras.org",
    "url": "https://eprocurement.dedras.org/toutvoir",
    "paysDefaut": "Benin",
    "secteurDefaut": null,
    "typeDefaut": null,
    "active": true,
    "statut": "Verifie le 2026-08-31 : 98 avis, tous avec type, date de publication et limite de depot. ONG locale : demandes de cotation et AMI que les grands agregateurs ne couvrent pas."
  },
  {
    "code": "AFD-APPELS",
    "nom": "AFD - appels a projets",
    "methode": "HTML:afd.fr",
    "url": "https://www.afd.fr/fr/appels-a-projets/liste?status%5Bongoing%5D=ongoing&status%5Bsoon%5D=soon",
    "paysDefaut": "International",
    "secteurDefaut": null,
    "typeDefaut": "Appel a projets",
    "active": true,
    "statut": "Verifie le 2026-08-31 : 2 appels ouverts. Volume faible mais bailleur majeur. Les deux dates sont donnees ensemble (ouverture - cloture)."
  },
  {
    "code": "TERRAVIVA",
    "nom": "Terra Viva Grants - financements environnement",
    "methode": "RSS",
    "url": "https://www.terravivagrants.org/feed/",
    "paysDefaut": "International",
    "secteurDefaut": "Environnement",
    "typeDefaut": "Subvention",
    "active": true,
    "statut": "Verifie le 2026-08-31 : 10 items a jour (aout 2026), vrais appels a financement. Agriculture, climat, energie, biodiversite."
  },
  {
    "code": "OPP-AFRICANS",
    "nom": "Opportunities For Africans - bourses et programmes",
    "methode": "RSS",
    "url": "https://www.opportunitiesforafricans.com/feed/",
    "paysDefaut": "Afrique (multi-pays)",
    "secteurDefaut": "Education et formation",
    "typeDefaut": "Bourse",
    "active": true,
    "statut": "Verifie le 2026-08-31 : 10 items a jour. Bourses et fellowships destines a des PERSONNES, pas a des structures : type Bourse."
  },
  {
    "code": "WB-TGO",
    "nom": "Banque mondiale - avis de marches au Togo",
    "methode": "JSON:worldbank.org",
    "url": "https://search.worldbank.org/api/v2/procnotices?format=json&rows=100&srt=noticedate&order=desc&project_ctry_name=Togo",
    "paysDefaut": "Togo",
    "secteurDefaut": null,
    "typeDefaut": null,
    "active": true,
    "statut": "Verifie le 2026-09-01 : 0 avis encore ouverts. Meme adaptateur que WB-BEN, filtre sur le pays. Le volume ouvert varie fortement d'un mois a l'autre."
  },
  {
    "code": "WB-SEN",
    "nom": "Banque mondiale - avis de marches au Senegal",
    "methode": "JSON:worldbank.org",
    "url": "https://search.worldbank.org/api/v2/procnotices?format=json&rows=100&srt=noticedate&order=desc&project_ctry_name=Senegal",
    "paysDefaut": "Senegal",
    "secteurDefaut": null,
    "typeDefaut": null,
    "active": true,
    "statut": "Verifie le 2026-09-01 : 1 avis encore ouverts. Meme adaptateur que WB-BEN, filtre sur le pays. Le volume ouvert varie fortement d'un mois a l'autre."
  },
  {
    "code": "WB-CIV",
    "nom": "Banque mondiale - avis de marches au Cote d'Ivoire",
    "methode": "JSON:worldbank.org",
    "url": "https://search.worldbank.org/api/v2/procnotices?format=json&rows=100&srt=noticedate&order=desc&project_ctry_name=Cote%20d%27Ivoire",
    "paysDefaut": "Cote d'Ivoire",
    "secteurDefaut": null,
    "typeDefaut": null,
    "active": true,
    "statut": "Verifie le 2026-09-01 : 2 avis encore ouverts. Meme adaptateur que WB-BEN, filtre sur le pays. Le volume ouvert varie fortement d'un mois a l'autre."
  },
  {
    "code": "WB-BFA",
    "nom": "Banque mondiale - avis de marches au Burkina Faso",
    "methode": "JSON:worldbank.org",
    "url": "https://search.worldbank.org/api/v2/procnotices?format=json&rows=100&srt=noticedate&order=desc&project_ctry_name=Burkina%20Faso",
    "paysDefaut": "Burkina Faso",
    "secteurDefaut": null,
    "typeDefaut": null,
    "active": true,
    "statut": "Verifie le 2026-09-01 : 4 avis encore ouverts. Meme adaptateur que WB-BEN, filtre sur le pays. Le volume ouvert varie fortement d'un mois a l'autre."
  },
  {
    "code": "WB-MLI",
    "nom": "Banque mondiale - avis de marches au Mali",
    "methode": "JSON:worldbank.org",
    "url": "https://search.worldbank.org/api/v2/procnotices?format=json&rows=100&srt=noticedate&order=desc&project_ctry_name=Mali",
    "paysDefaut": "Mali",
    "secteurDefaut": null,
    "typeDefaut": null,
    "active": true,
    "statut": "Verifie le 2026-09-01 : 0 avis encore ouverts. Meme adaptateur que WB-BEN, filtre sur le pays. Le volume ouvert varie fortement d'un mois a l'autre."
  },
  {
    "code": "WB-NER",
    "nom": "Banque mondiale - avis de marches au Niger",
    "methode": "JSON:worldbank.org",
    "url": "https://search.worldbank.org/api/v2/procnotices?format=json&rows=100&srt=noticedate&order=desc&project_ctry_name=Niger",
    "paysDefaut": "Niger",
    "secteurDefaut": null,
    "typeDefaut": null,
    "active": true,
    "statut": "Verifie le 2026-09-01 : 15 avis encore ouverts. Meme adaptateur que WB-BEN, filtre sur le pays. Le volume ouvert varie fortement d'un mois a l'autre."
  },
  {
    "code": "WB-GHA",
    "nom": "Banque mondiale - avis de marches au Ghana",
    "methode": "JSON:worldbank.org",
    "url": "https://search.worldbank.org/api/v2/procnotices?format=json&rows=100&srt=noticedate&order=desc&project_ctry_name=Ghana",
    "paysDefaut": "Ghana",
    "secteurDefaut": null,
    "typeDefaut": null,
    "active": true,
    "statut": "Verifie le 2026-09-01 : 6 avis encore ouverts. Meme adaptateur que WB-BEN, filtre sur le pays. Le volume ouvert varie fortement d'un mois a l'autre."
  },
  {
    "code": "WB-NGA",
    "nom": "Banque mondiale - avis de marches au Nigeria",
    "methode": "JSON:worldbank.org",
    "url": "https://search.worldbank.org/api/v2/procnotices?format=json&rows=100&srt=noticedate&order=desc&project_ctry_name=Nigeria",
    "paysDefaut": "Nigeria",
    "secteurDefaut": null,
    "typeDefaut": null,
    "active": true,
    "statut": "Verifie le 2026-09-01 : 14 avis encore ouverts. Meme adaptateur que WB-BEN, filtre sur le pays. Le volume ouvert varie fortement d'un mois a l'autre."
  },
  {
    "code": "WB-GIN",
    "nom": "Banque mondiale - avis de marches au Guinee",
    "methode": "JSON:worldbank.org",
    "url": "https://search.worldbank.org/api/v2/procnotices?format=json&rows=100&srt=noticedate&order=desc&project_ctry_name=Guinea",
    "paysDefaut": "Guinee",
    "secteurDefaut": null,
    "typeDefaut": null,
    "active": true,
    "statut": "Verifie le 2026-09-01 : 7 avis encore ouverts. Meme adaptateur que WB-BEN, filtre sur le pays. Le volume ouvert varie fortement d'un mois a l'autre."
  },
  {
    "code": "WB-GNB",
    "nom": "Banque mondiale - avis de marches au Guinee-Bissau",
    "methode": "JSON:worldbank.org",
    "url": "https://search.worldbank.org/api/v2/procnotices?format=json&rows=100&srt=noticedate&order=desc&project_ctry_name=Guinea-Bissau",
    "paysDefaut": "Guinee-Bissau",
    "secteurDefaut": null,
    "typeDefaut": null,
    "active": true,
    "statut": "Verifie le 2026-09-01 : 1 avis encore ouverts. Meme adaptateur que WB-BEN, filtre sur le pays. Le volume ouvert varie fortement d'un mois a l'autre."
  },
  {
    "code": "WB-CPV",
    "nom": "Banque mondiale - avis de marches au Cap-Vert",
    "methode": "JSON:worldbank.org",
    "url": "https://search.worldbank.org/api/v2/procnotices?format=json&rows=100&srt=noticedate&order=desc&project_ctry_name=Cabo%20Verde",
    "paysDefaut": "Cap-Vert",
    "secteurDefaut": null,
    "typeDefaut": null,
    "active": true,
    "statut": "Verifie le 2026-09-01 : 2 avis encore ouverts. Meme adaptateur que WB-BEN, filtre sur le pays. Le volume ouvert varie fortement d'un mois a l'autre."
  },
  {
    "code": "WB-GMB",
    "nom": "Banque mondiale - avis de marches au Gambie",
    "methode": "JSON:worldbank.org",
    "url": "https://search.worldbank.org/api/v2/procnotices?format=json&rows=100&srt=noticedate&order=desc&project_ctry_name=Gambia%2C%20The",
    "paysDefaut": "Gambie",
    "secteurDefaut": null,
    "typeDefaut": null,
    "active": true,
    "statut": "Verifie le 2026-09-01 : 0 avis encore ouverts. Meme adaptateur que WB-BEN, filtre sur le pays. Le volume ouvert varie fortement d'un mois a l'autre."
  },
  {
    "code": "WB-LBR",
    "nom": "Banque mondiale - avis de marches au Liberia",
    "methode": "JSON:worldbank.org",
    "url": "https://search.worldbank.org/api/v2/procnotices?format=json&rows=100&srt=noticedate&order=desc&project_ctry_name=Liberia",
    "paysDefaut": "Liberia",
    "secteurDefaut": null,
    "typeDefaut": null,
    "active": true,
    "statut": "Verifie le 2026-09-01 : 3 avis encore ouverts. Meme adaptateur que WB-BEN, filtre sur le pays. Le volume ouvert varie fortement d'un mois a l'autre."
  },
  {
    "code": "WB-SLE",
    "nom": "Banque mondiale - avis de marches au Sierra Leone",
    "methode": "JSON:worldbank.org",
    "url": "https://search.worldbank.org/api/v2/procnotices?format=json&rows=100&srt=noticedate&order=desc&project_ctry_name=Sierra%20Leone",
    "paysDefaut": "Sierra Leone",
    "secteurDefaut": null,
    "typeDefaut": null,
    "active": true,
    "statut": "Verifie le 2026-09-01 : 5 avis encore ouverts. Meme adaptateur que WB-BEN, filtre sur le pays. Le volume ouvert varie fortement d'un mois a l'autre."
  },
  {
    "code": "WB-MRT",
    "nom": "Banque mondiale - avis de marches au Mauritanie",
    "methode": "JSON:worldbank.org",
    "url": "https://search.worldbank.org/api/v2/procnotices?format=json&rows=100&srt=noticedate&order=desc&project_ctry_name=Mauritania",
    "paysDefaut": "Mauritanie",
    "secteurDefaut": null,
    "typeDefaut": null,
    "active": false,
    "statut": "Verifie le 2026-09-01 : 1 avis encore ouverts. Meme adaptateur que WB-BEN, filtre sur le pays. Le volume ouvert varie fortement d'un mois a l'autre. Livree inactive : hors zone CEDEAO. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "WB-TCD",
    "nom": "Banque mondiale - avis de marches au Tchad",
    "methode": "JSON:worldbank.org",
    "url": "https://search.worldbank.org/api/v2/procnotices?format=json&rows=100&srt=noticedate&order=desc&project_ctry_name=Chad",
    "paysDefaut": "Tchad",
    "secteurDefaut": null,
    "typeDefaut": null,
    "active": false,
    "statut": "Verifie le 2026-09-01 : 7 avis encore ouverts. Meme adaptateur que WB-BEN, filtre sur le pays. Le volume ouvert varie fortement d'un mois a l'autre. Livree inactive : hors zone CEDEAO. Activez-la si vous prospectez ce marche."
  },
  {
    "code": "WB-CMR",
    "nom": "Banque mondiale - avis de marches au Cameroun",
    "methode": "JSON:worldbank.org",
    "url": "https://search.worldbank.org/api/v2/procnotices?format=json&rows=100&srt=noticedate&order=desc&project_ctry_name=Cameroon",
    "paysDefaut": "Cameroun",
    "secteurDefaut": null,
    "typeDefaut": null,
    "active": false,
    "statut": "Verifie le 2026-09-01 : 0 avis encore ouverts. Meme adaptateur que WB-BEN, filtre sur le pays. Le volume ouvert varie fortement d'un mois a l'autre. Livree inactive : hors zone CEDEAO. Activez-la si vous prospectez ce marche."
  }
];
