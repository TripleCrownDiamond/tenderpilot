/**
 * TenderPilot - sources livrees par defaut.
 *
 * FICHIER GENERE depuis data/sources.csv a la racine du depot.
 * Relancer `python scripts/exporter_sources.py` apres modification du CSV.
 * Toute retouche faite ici sera perdue a la prochaine generation.
 *
 * 113 sources : 71 flux RSS, 22 API JSON,
 * 19 collectes HTML, 1 manuelle(s).
 * 54 actives par defaut. Chaque source a ete recuperee et verifiee :
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
    "active": false,
    "statut": "Verifie le 2026-09-02 : HTTP 403 sur TOUT le site, robots.txt compris. www.afdb.org est passe derriere un controle anti-robot Cloudflare (page Just a moment..., challenge JavaScript) : aucun client sans navigateur ne passe, quel que soit l'agent utilisateur, et la collecte sequentielle n'y change rien. Desactivee plutot que supprimee, et la methode RSS est conservee : le jour ou la BAD rouvre son site aux clients simples, il suffit de remettre OUI. A consulter a la main en attendant."
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
    "statut": "Verifie le 2026-09-02 : 46 annonces. Le portail www.marches-publics.bj est une application Angular, vide cote serveur, et le reste de son API repond 401 : le flux RSS est la SEULE porte publique. Il ne porte AUCUNE echeance - ouvrir le lien pour la date limite - et tous ses titres valent 'Appel d'Offre' : l'objet reel est dans la description, l'acheteur dans <author> (SBEE, ASIN, agences territoriales)."
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
    "active": false,
    "statut": "Verifie le 2026-09-02 : HTTP 403, meme cause que AFDB-EOI - controle anti-robot Cloudflare sur tout www.afdb.org. L'extraction HTML est conservee telle quelle, elle lisait 11 avis le 2026-08-31 : seule l'entree du site est fermee. A consulter a la main en attendant."
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
    "url": "https://www.enabel.be/public-procurement/?in_country=850&is_status=all",
    "paysDefaut": "Benin",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": true,
    "statut": "Verifie le 2026-09-02 : 10 marches publies, 1 seul ouvert (2204BEN-10373, cloture le 02/09/2026). La page n'a pas change : c'est le filtre is_status=0 du site qui ne rend plus rien depuis le 2026-09-02, il rendait les 10 avis le 2026-08-31. On demande donc is_status=all et c'est l'analyseur qui ecarte les marches Close - il le faisait deja. NE PAS basculer sur la page francaise /fr/marches-publics/ : ses etiquettes sont traduites (Pays, Date de cloture) et l'analyseur lit Country et Closing date."
  },
  {
    "code": "ARMP-BJ",
    "nom": "ARMP Benin - appels d'offres et AMI",
    "methode": "HTML:armp.bj",
    "url": "https://armp.bj/category/actualites/appels-doffres/",
    "paysDefaut": "Benin",
    "secteurDefaut": "Gouvernance et institutions",
    "typeDefaut": "AMI",
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
    "typeDefaut": "Appel d'offres",
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
    "typeDefaut": "Appel d'offres",
    "active": true,
    "statut": "Verifie le 2026-08-31 : 30 avis, tous avec date de publication et de cloture. Table Drupal stable."
  },
  {
    "code": "BJ-ABE",
    "nom": "ABE - appels d'offres (environnement)",
    "methode": "HTML:abe.bj",
    "url": "https://www.abe.bj/appels-doffres/",
    "paysDefaut": "Benin",
    "secteurDefaut": "Environnement et climat",
    "typeDefaut": "Appel d'offres",
    "active": true,
    "statut": "Verifie le 2026-08-31 : 9 avis en premiere page (22 au total), 7 avec echeance. Les avis echus ne sont pas ecartes : l'ABE n'offre aucun filtre d'URL."
  },
  {
    "code": "ARAA-CEDEAO",
    "nom": "ARAA - marches (agriculture CEDEAO)",
    "methode": "HTML:araa.org",
    "url": "https://www.araa.org/fr/marches",
    "paysDefaut": "Afrique de l'Ouest",
    "secteurDefaut": "Agriculture et agroalimentaire",
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
    "typeDefaut": "Appel d'offres",
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
    "typeDefaut": "Demande de cotation",
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
    "secteurDefaut": "Environnement et climat",
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
  },
  {
    "code": "OTF-GRANTS",
    "nom": "Open Technology Fund - RFP et subventions tech",
    "methode": "RSS",
    "url": "https://www.opentech.fund/feed",
    "paysDefaut": "International",
    "secteurDefaut": "Numerique et technologie",
    "typeDefaut": "Subvention",
    "active": true,
    "statut": "Verifie le 2026-09-01 : feed RSS actif avec RFP (Request for Proposals) et subventions tech. Thematiques : Internet freedom, censure numerique, securite. Flux fiable, mises a jour regulieres."
  },
  {
    "code": "TEF-GRANTS",
    "nom": "Tony Elumelu Foundation - programme entrepreneuriat",
    "methode": "RSS",
    "url": "https://www.tonyelumelufoundation.org/feed",
    "paysDefaut": "Afrique (multi-pays)",
    "secteurDefaut": "Entrepreneuriat et PME",
    "typeDefaut": "Subvention",
    "active": false,
    "statut": "Verifie le 2026-09-02 par collecte reelle : 0 sur 10 items sont de vraies opportunites. Portraits d entrepreneurs, pas d appels. Le programme TEF s ouvre une fois par an et s annonce ailleurs. Flux d ACTUALITES : inactive pour ne pas diluer la veille. Le client peut la reactiver."
  },
  {
    "code": "ADAPT-FUND",
    "nom": "Fonds d'adaptation - subventions climat",
    "methode": "RSS",
    "url": "https://www.adaptation-fund.org/feed",
    "paysDefaut": "International",
    "secteurDefaut": "Environnement et climat",
    "typeDefaut": "Subvention",
    "active": false,
    "statut": "Verifie le 2026-09-02 par collecte reelle : 0 sur 10 items sont de vraies opportunites. Recits de projets et lecons apprises. Flux d ACTUALITES : inactive pour ne pas diluer la veille. Le client peut la reactiver."
  },
  {
    "code": "AFRILABS-NEWS",
    "nom": "AfriLabs - actualites et partenariats",
    "methode": "RSS",
    "url": "https://www.afrilabs.com/feed",
    "paysDefaut": "Afrique (multi-pays)",
    "secteurDefaut": "Numerique et technologie",
    "typeDefaut": null,
    "active": false,
    "statut": "Verifie le 2026-09-02 par collecte reelle : 0 sur 10 items sont de vraies opportunites. Annonces de partenariats. Flux d ACTUALITES : inactive pour ne pas diluer la veille. Le client peut la reactiver."
  },
  {
    "code": "PROPARCO-NEWS",
    "nom": "Proparco - actualites investissements",
    "methode": "RSS",
    "url": "https://www.proparco.fr/rss.xml",
    "paysDefaut": "International",
    "secteurDefaut": "Finance",
    "typeDefaut": "Investissement",
    "active": false,
    "statut": "Verifie le 2026-09-02 par collecte reelle : 5 sur 10 items sont de vraies opportunites. Les 5 retenues sont des communiques contenant le mot financement, pas des appels : faux positifs. Flux d ACTUALITES : inactive pour ne pas diluer la veille. Le client peut la reactiver."
  },
  {
    "code": "ACBF-NEWS",
    "nom": "Fonds africain de capacitation - actualites",
    "methode": "RSS",
    "url": "https://www.acbf-pact.org/news/feed",
    "paysDefaut": "Afrique (multi-pays)",
    "secteurDefaut": "Gouvernance et institutions",
    "typeDefaut": null,
    "active": false,
    "statut": "Verifie le 2026-09-02 par collecte reelle : 0 sur 10 items sont de vraies opportunites. Communiques institutionnels. Flux d ACTUALITES : inactive pour ne pas diluer la veille. Le client peut la reactiver."
  },
  {
    "code": "AU-NEWS",
    "nom": "Union africaine - actualites officielles",
    "methode": "RSS",
    "url": "https://www.au.int/rss.xml",
    "paysDefaut": "Afrique (multi-pays)",
    "secteurDefaut": "Gouvernance et institutions",
    "typeDefaut": null,
    "active": false,
    "statut": "Verifie le 2026-09-02 par collecte reelle : 1 sur 10 items sont de vraies opportunites. Communiques officiels, dont certains remontent a 2019. Flux d ACTUALITES : inactive pour ne pas diluer la veille. Le client peut la reactiver."
  },
  {
    "code": "UNHABITAT-NEWS",
    "nom": "ONU-Habitat - actualites et appels",
    "methode": "RSS",
    "url": "https://www.unhabitat.org/rss.xml",
    "paysDefaut": "International",
    "secteurDefaut": "Infrastructures et BTP",
    "typeDefaut": null,
    "active": false,
    "statut": "Verifie le 2026-09-02 par collecte reelle : 0 sur 10 items sont de vraies opportunites. Actualites urbaines et formulaires d inscription a des evenements. Flux d ACTUALITES : inactive pour ne pas diluer la veille. Le client peut la reactiver."
  },
  {
    "code": "ADB-NEWS",
    "nom": "Banque asiatique de developpement - actualites",
    "methode": "RSS",
    "url": "https://www.adb.org/rss.xml",
    "paysDefaut": "Asie",
    "secteurDefaut": "Finance",
    "typeDefaut": "Investissement",
    "active": false,
    "statut": "Verifie le 2026-09-01 : feed RSS actif (114ko, 10 items). Actualites et opportunites. Hors zone CEDEAO : inactive par defaut."
  },
  {
    "code": "WELLCOME-GRANTS",
    "nom": "Wellcome Trust - programmes de financement recherche",
    "methode": "HTML:wellcome.org",
    "url": "https://wellcome.org/research-funding/schemes",
    "paysDefaut": "International",
    "secteurDefaut": "Sante",
    "typeDefaut": "Subvention",
    "active": true,
    "statut": "Verifie le 2026-09-01 : 13 programmes de financement (Discovery Awards, Early-Career, Career Development, Springboard, etc.). JSON embarque dans la page avec statut, deadline, montant. 4 ouverts, 7 fermes, 2 any-time."
  },
  {
    "code": "GC-GRANTS",
    "nom": "Grand Challenges Gates Foundation - opportunites de financement",
    "methode": "HTML:grandchallenges.org",
    "url": "https://www.grandchallenges.org/grant-opportunities",
    "paysDefaut": "International",
    "secteurDefaut": "Sante",
    "typeDefaut": "Subvention",
    "active": true,
    "statut": "Verifie le 2026-09-01 : JSON embarque dans __NEXT_DATA__ avec 3 defis actifs (Pathogen Sequencing, Micronutrient Status, Keystone Symposia). Dates UNIX, domaine, lien de candidature. Filtrage par date_end > maintenant."
  },
  {
    "code": "J360-NEWS",
    "nom": "J360 - actualites marches publics et achats publics",
    "methode": "RSS",
    "url": "https://www.j360.info/en/news/rss/",
    "paysDefaut": "International",
    "secteurDefaut": "Gouvernance et institutions",
    "typeDefaut": "Actualites",
    "active": false,
    "statut": "Verifie le 2026-09-02 par collecte reelle : 37 sur 55 items sont de vraies opportunites. Blog editorial sur les marches publics, archives depuis 2016. Les 37 retenues parlent DE marches publics, elles n en sont pas. Flux d ACTUALITES : inactive pour ne pas diluer la veille. Le client peut la reactiver."
  },
  {
    "code": "UNICEF-SUPPLY",
    "nom": "UNICEF Supply Division - tender calendars",
    "methode": "HTML:unicef.org/supply",
    "url": "https://www.unicef.org/supply/tender-calendars",
    "paysDefaut": "International",
    "secteurDefaut": "Sante",
    "typeDefaut": "Appel d'offres",
    "active": true,
    "statut": "Verifie le 2026-09-01 : page principale avec 4 PDFs (Education, Medical Devices, Medicines, Nutrition) et 3 sous-pages HTML (SIE, Vaccines, WASH). 10 entrees extraites. Calendriers indicative, dates a verifier sur chaque sous-page."
  },
  {
    "code": "FUNDPILOTE-API",
    "nom": "Fundpilote - subventions et appels a projets (agregateur)",
    "methode": "JSON:fundpilote.com",
    "url": "https://fundpilote.com/api/v1/opportunities/",
    "paysDefaut": "International",
    "secteurDefaut": null,
    "typeDefaut": "Subvention",
    "active": true,
    "statut": "Verifie le 2026-09-02 : API publique SANS authentification (200, count=283, 20 par page). 15 ouvertes sur 20 en page 1, aucune expiree. AGREGATEUR : reindexe 227 bailleurs, a traiter comme une piste, pas comme une source primaire. La reponse anonyme ne porte NI application_url NI source_url : le lien est bati depuis l id (/opportunities/<id>)."
  },
  {
    "code": "EU-PORTAL",
    "nom": "Commission europeenne - appels a propositions et marches",
    "methode": "JSON:ec.europa.eu",
    "url": "https://api.tech.ec.europa.eu/search-api/prod/rest/search?apiKey=SEDIA&text=***&pageSize=100&pageNumber=1",
    "paysDefaut": "International",
    "secteurDefaut": null,
    "typeDefaut": "Appel a projets",
    "active": true,
    "statut": "Verifie le 2026-09-02 : 2314 appels ouverts ou a venir, 92 retenus par page, TOUS a echeance future. Inclut EuropeAid (type 2), la cooperation au developpement ou le Benin est pleinement eligible. POST multipart avec type de contenu declare PAR PARTIE : toute autre forme rend 200 en IGNORANT le filtre. Tri decroissant car un appel en deux etapes porte plusieurs echeances et le tri croissant retient la plus ancienne."
  },
  {
    "code": "GRANTS-GOV",
    "nom": "Grants.gov - subventions federales americaines",
    "methode": "JSON:grants.gov",
    "url": "https://api.grants.gov/v1/api/search2",
    "paysDefaut": "International",
    "secteurDefaut": null,
    "typeDefaut": "Subvention",
    "active": true,
    "statut": "Verifie le 2026-09-02 : 1034 subventions ouvertes, 100 par page, 82 datees a echeance future. 31 mentionnent l Afrique, dont U.S.-Africa Strategic Investment Program. RESERVE A DIRE AU CLIENT : la plupart des subventions federales exigent un enregistrement SAM.gov d entite americaine. Certaines - Departement d Etat, USAID - acceptent les organisations etrangeres, mais l eligibilite se verifie avis par avis."
  },
  {
    "code": "GIZ-VERGABE",
    "nom": "GIZ - marches de la cooperation allemande",
    "methode": "HTML:giz.de",
    "url": "https://ausschreibungen.giz.de/Satellite/company/welcome.do?method=showTable&fromSearch=1&selectedTablePagePROJECT_RESULT={page}",
    "paysDefaut": "International",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": true,
    "statut": "Verifie le 2026-09-02 : 224 avis sur 12 pages, sans authentification. 91 sont ouverts et dates ; les 133 autres sont des marches deja attribues (Vergebener Auftrag) ou des avenants, ecartes par l'analyseur - meme decision que pour les Contract Award de la Banque mondiale. 16 avis nomment un pays africain, dont 6 en Afrique de l'Ouest (Burkina, Senegal, Ghana, Nigeria), certains rediges en francais. Source PAGINEE : le {page} de l'URL est remplace page apres page jusqu'a MAX_ITEMS_PER_SOURCE. Page servie en ISO-8859-1, decodee d'apres l'en-tete. Les dates sont en JJ.MM.AAAA et converties a la main : 02.09.2026 lu par new Date() vaut le 9 fevrier."
  },
  {
    "code": "NE-MARCHES",
    "nom": "Niger Marches - appels d offres",
    "methode": "JSON:nigermarches.com",
    "url": "https://www.nigermarches.com/wp-json/wp/v2/appel_d_offre?per_page=100&page={page}&_fields=id,link,title,date,acf",
    "paysDefaut": "Niger",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": true,
    "statut": "Verifie le 2026-09-02 : 668 avis, API WordPress publique sans authentification, 20 sur 20 avec une date d'expiration. Les champs ACF donnent l'echeance (date_expiration) et l'acheteur reel (nom_de_la_societe) : NDE, AMF-UMOA, Medecins Sans Frontieres, GIZ Niger. On lit l'API et non la page : la page est construite par Elementor et ses classes changent a chaque theme. Le _fields de l'URL divise le volume par vingt - ne pas le retirer. Source PAGINEE."
  },
  {
    "code": "EF-OFFRES",
    "nom": "Expertise France - consultations et expertises",
    "methode": "HTML:expertise-france.gestmax.fr",
    "url": "https://expertise-france.gestmax.fr/search/index/page/{page}",
    "paysDefaut": "International",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": true,
    "statut": "Verifie le 2026-09-04 : 144 offres, dix par page, quinze pages, rendues cote serveur. Rare par sa richesse : chaque carte porte le PAYS de l'annonce, le secteur declare et une vraie date limite de candidature. L'agence francaise publie ici ses consultations autant que ses postes - le \"Recrutement d'une agence de communication, Benin\" est un marche. Les contrats CDD/CDDU/CDI/stage sont ranges en Recrutement ; \"Contrat de prestation de services\" n'est PAS traduit, il recouvre l'expert individuel comme l'agence. Source PAGINEE."
  },
  {
    "code": "AFD-DGMARKET",
    "nom": "AFD - avis de marches sur dgMarket",
    "methode": "MANUAL",
    "url": "https://afd.dgmarket.com/tenders/brandedNoticeList.do",
    "paysDefaut": "International",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-09-04 : la liste EXISTE et est riche - pays, titre, date de publication et date limite par avis, rendus cote serveur. Mais le portail impose une poignee de main de session : il pose digi_session_id=UNASSIGNED puis renvoie vers web3-login.dgmarket.com pour l'echanger, sur un second domaine. Une requete simple, meme avec les cookies de la premiere, repond 302. Simuler cette ouverture de session reviendrait a rejouer un login : le produit ne se bat pas contre les sites qui en exigent un. Et les dossiers d'appel d'offres eux-memes demandent une adhesion dgMarket. Consultable a la main, gratuitement : voir le guide AFD joint au catalogue. Livree MANUAL et inactive."
  },
  {
    "code": "PLAN-TENDERS",
    "nom": "Plan International - appels d offres",
    "methode": "HTML:plan-international.org",
    "url": "https://plan-international.org/calls-tender/",
    "paysDefaut": "International",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": true,
    "statut": "Verifie le 2026-09-04 : 8 appels actifs, tous dates ET tous avec leur dossier telechargeable - la premiere source qui remplit la colonne PDF. Un appel beninois en cours (006/Plan Int'l BEN/CO/CD/Aout 2026). Pas de page par appel : les huit vivent sur la meme, le lien mene donc a la liste et c'est le dossier qui est propre a chacun. Echeances en prose anglaise (no later than Friday, 28th August 2026) : la tournure et le rang ordinal ont ete ajoutes a extractDeadline le meme jour."
  },
  {
    "code": "JOBRELAIS",
    "nom": "JobRelais - appels d offres (Benin)",
    "methode": "HTML:jobrelais.com",
    "url": "https://www.jobrelais.com/opportunities/call-for-tenders",
    "paysDefaut": "Benin",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": true,
    "statut": "Verifie le 2026-09-04 : 12 avis par page, 27 pages, de vrais avis ouest-africains (BCEAO, GIZ, Plan International Benin, LuxDev, Amnesty). PREMIERE SOURCE LUE EN DEUX TEMPS : sa liste ne porte aucune echeance - pour toute date, 'il y a 3 mois' - mais chaque fiche porte un JSON-LD propre avec validThrough. Le moteur lit donc la liste, puis les fiches manquantes, dans la limite de MAX_FICHES_PAR_PASSAGE. Une annonce qu'on n'a pas pu dater n'entre pas : pour cette source, sans date veut dire fiche non lue, pas avis sans echeance. AGREGATEUR : GIZ, Plan International et la BCEAO sont aussi collectes a la source."
  },
  {
    "code": "UNGM-CEDEAO",
    "nom": "UNGM - marches des agences de l'ONU (CEDEAO)",
    "methode": "HTML:ungm.org",
    "url": "https://www.ungm.org/Public/Notice/Search",
    "paysDefaut": "Afrique de l'Ouest",
    "secteurDefaut": null,
    "typeDefaut": "Appel d'offres",
    "active": false,
    "statut": "Verifie le 2026-09-04 : 15 avis par page, au moins 15 pages, TOUS dates, filtres sur les quinze pays de la CEDEAO. Les acheteurs sont les agences elles-memes - FAO, UNICEF, IOM, ILO, UNDP, UNFPA, UNHCR, UNOPS, WFP, WHO, UNIDO, Secretariat de l'ONU : neuf ne sont couverts par aucune autre source du registre. PREMIERE SOURCE HTML SERVIE PAR UN POST : la page /Public/Notice ne rend aucun avis, la liste arrive d'un POST sur /Public/Notice/Search qui repond par des rangees HTML, et la pagination se fait par PageIndex dans le corps (PageSize plafonne a 15 par le serveur). LIVREE INACTIVE POUR UNE SEULE RAISON, MESUREE : UNGM repond 403 des que l'agent utilisateur porte le suffixe TenderPilot/1.0, et 200 a la meme chaine sans ce suffixe. Ce n'est ni Cloudflare ni un defi - un filtre IIS sur la chaine d'agent. Retirer le suffixe reviendrait a ne plus s'identifier : c'est une decision du proprietaire du produit, pas un choix technique, et elle n'a pas ete prise. L'analyseur et la forme de requete sont ecrits, testes sur fixture des deux cotes, et n'attendent qu'un OUI."
  }
];
