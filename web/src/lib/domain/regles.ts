/**
 * TenderPilot - regles metier.
 *
 * Port fidele de apps_script/Core.gs : memes seuils, memes couleurs, meme
 * cascade de notifications. La version Sheets et la version web doivent
 * decider exactement la meme chose, sinon le produit ment a son
 * utilisateur selon la porte par laquelle il entre.
 *
 * Aucune fonction de ce fichier ne touche a la base, au reseau ou au
 * courrier : tout y est testable sans infrastructure.
 */

export type StatutDelai =
  | "OUVERT"
  | "A SURVEILLER"
  | "BIENTOT"
  | "URGENT"
  | "EXPIRE"
  | "DATE A VERIFIER";

export const STATUTS: StatutDelai[] = [
  "OUVERT", "A SURVEILLER", "BIENTOT", "URGENT", "EXPIRE", "DATE A VERIFIER",
];

/** (statut, seuil haut inclus), du plus urgent au plus large. */
const SEUILS: [StatutDelai, number][] = [
  ["URGENT", 3],
  ["BIENTOT", 7],
  ["A SURVEILLER", 15],
];

/** La couleur ne porte jamais seule une information : le statut reste roi. */
export const COULEURS: Record<StatutDelai, string> = {
  "OUVERT": "#D8F3DC",
  "A SURVEILLER": "#FFF3BF",
  "BIENTOT": "#FFE0C2",
  "URGENT": "#FFD6D6",
  "EXPIRE": "#ECECEC",
  "DATE A VERIFIER": "#FFFBEA",
};

export const RESUME_MAX = 400;
export const PREFIXE_ID = "TP";

export interface Opportunite {
  id?: string;
  titre: string;
  organisation?: string | null;
  pays?: string | null;
  type?: string | null;
  secteur?: string | null;
  /** Montant annonce PAR LA SOURCE, en texte. Jamais devine. */
  budget?: string | null;
  source?: string | null;
  lien?: string | null;
  pdf?: string | null;
  reference?: string | null;
  datePublication?: string | null;
  deadline?: string | null;
  joursRestants?: number | null;
  statutDelai?: StatutDelai | null;
  /** Ce que l'annonce vaut pour CE client-la. Voir pertinence(). */
  pertinence?: string | null;
  resume?: string | null;
  // Les canaux deja servis pour cette alerte : "", "email", "telegram" ou
  // "email,telegram". Le booleen des versions precedentes vaut "tous
  // canaux". Voir canauxNotifies().
  /** La seule colonne que le client remplit : les avis qu'il compte suivre. */
  suivi?: boolean | string | null;
  notifNouvelle?: MarqueNotification;
  notifJ7?: MarqueNotification;
  notifJ3?: MarqueNotification;
  notifJ1?: MarqueNotification;
  notifExpire?: MarqueNotification;
}

export interface Config {
  emailNotification: string;
  envoiNouvelle: boolean;
  envoiJ7: boolean;
  envoiJ3: boolean;
  envoiJ1: boolean;
  envoiExpire: boolean;
  seuilDigest: number;
  /**
   * Emails envoyes au maximum en une execution. Au-dela, les alertes ne
   * sont pas perdues : elles repartent au passage suivant, les plus
   * pertinentes et les plus urgentes d'abord. 0 = aucun plafond.
   */
  maxEmailsParExecution?: number;
  /** Plafond propre a Telegram. 0 ou absent : aucun plafond. */
  maxTelegramParExecution?: number;
  /** Plafond propre aux notifications push. 0 ou absent : aucun plafond. */
  maxNtfyParExecution?: number;
  envoiNtfy?: boolean;
  /** Reserver les rappels d'echeance aux offres suivies. Jamais les nouveautes. */
  rappelsSuivisSeulement?: boolean;
  ntfySujet?: string;
  ntfyServeur?: string;
  /**
   * Fiches lues au maximum en un passage, pour les sources qui datent leurs
   * avis sur la fiche et non dans la liste. Voir ANALYSEURS_FICHE.
   */
  maxFichesParPassage?: number;
  fuseau: string;
  maxParSource: number;
  /**
   * Telegram, en plus des emails.
   *
   * Un email se perd dans une boite deja pleine ; une notification Telegram
   * arrive sur le telephone. Les deux canaux partagent les memes regles de
   * declenchement - une opportunite ne previent jamais deux fois par le
   * meme canal - mais ils sont independants : couper l'un n'affecte pas
   * l'autre.
   */
  envoiTelegram: boolean;
  telegramToken: string;
  telegramChatId: string;

  /**
   * Le profil du client : ses pays et ses domaines, en clair, separes par
   * des virgules. Ils ne decident pas de ce qui est COLLECTE - c'est le
   * registre de sources qui le decide - mais de ce qui est MIS EN AVANT.
   * Vides, ils ne restreignent rien.
   */
  paysSuivis?: string;
  secteursSuivis?: string;
  /**
   * Niveaux de pertinence qui declenchent une notification, separes par des
   * virgules. Vide = tous. Coupe le bruit dans la boite, jamais le tableau.
   */
  notifierPertinence?: string;

  /**
   * Preferences de tri du client, appliquees apres le jugement du modele.
   *
   * Absentes, elles valent leurs defauts prudents : la zone etiquette sans
   * supprimer, les evenements sont ecartes. Voir domain/llm.ts.
   */
  preferences?: import("./llm").Preferences;
  /**
   * Reprendre les annonces dont l'echeance est deja passee.
   *
   * Faux par defaut, et ce n'est pas un detail : les portails laissent des
   * annees d'archives en ligne. Sur les sources beninoises, 85 % des
   * annonces publiees ont une echeance depassee. Les collecter donnerait a
   * l'utilisateur un tableau de plusieurs centaines de lignes grises ou il
   * faudrait chercher les quelques dizaines auxquelles il peut repondre.
   *
   * Ce filtre ne s'applique qu'a l'ENTREE. Une opportunite deja suivie qui
   * arrive a echeance reste dans la base et passe simplement en EXPIRE :
   * effacer l'historique ferait perdre la trace des dossiers deposes.
   */
  collecterExpirees: boolean;
}

export const CONFIG_DEFAUT: Config = {
  emailNotification: "",
  envoiNouvelle: true,
  envoiJ7: true,
  envoiJ3: true,
  envoiJ1: true,
  envoiExpire: false,
  seuilDigest: 5,
  maxEmailsParExecution: 20,
  maxTelegramParExecution: 0,
  maxNtfyParExecution: 0,
  envoiNtfy: false,
  rappelsSuivisSeulement: false,
  ntfySujet: "",
  ntfyServeur: "https://ntfy.sh",
  maxFichesParPassage: 12,
  fuseau: "Africa/Porto-Novo",
  maxParSource: 40,
  envoiTelegram: false,
  telegramToken: "",
  telegramChatId: "",
  paysSuivis: "Benin",
  secteursSuivis: "",
  notifierPertinence: "",
  collecterExpirees: false,
};

// --------------------------------------------------------------- textes --

export function estVide(v: unknown): boolean {
  return v === null || v === undefined || String(v).trim() === "";
}

/** Normalise pour comparaison : accents, casse, ponctuation. */
export function normaliser(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Resume tronque proprement. Pas d'IA : on coupe, c'est tout. */
export function tronquer(texte: unknown, maximum = RESUME_MAX): string {
  const t = String(texte ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= maximum) return t;
  const coupe = t.slice(0, maximum);
  const espace = coupe.lastIndexOf(" ");
  return (espace > maximum * 0.6 ? coupe.slice(0, espace) : coupe) + "...";
}

// ----------------------------------------------------------------- dates --

/** Date -> "aaaa-mm-jj". Chaine deja au bon format acceptee. */
export function jour(valeur: unknown): string {
  if (estVide(valeur)) return "";
  if (valeur instanceof Date) {
    return [
      valeur.getFullYear(),
      String(valeur.getMonth() + 1).padStart(2, "0"),
      String(valeur.getDate()).padStart(2, "0"),
    ].join("-");
  }
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(valeur).trim());
  if (!m) return "";
  return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
}

/** Date du jour dans un fuseau donne, au format "aaaa-mm-jj". */
export function aujourdhui(
  fuseau = CONFIG_DEFAUT.fuseau, maintenant = new Date(),
): string {
  return new Intl.DateTimeFormat("fr-CA", {
    timeZone: fuseau, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(maintenant).replace(/\//g, "-");
}

/**
 * Jours restants avant une deadline.
 *
 * Le calcul se fait sur des dates sans heure : un changement d'heure
 * saisonnier ne doit pas produire 6,96 jours au lieu de 7.
 */
export function joursRestants(deadline: unknown, reference: unknown): number | null {
  const d = jour(deadline);
  const t = jour(reference);
  if (!d || !t) return null;
  const [ay, am, ad] = d.split("-").map(Number);
  const [by, bm, bd] = t.split("-").map(Number);
  return Math.round(
    (Date.UTC(ay, am - 1, ad) - Date.UTC(by, bm - 1, bd)) / 86400000,
  );
}

export function statutDelai(jours: number | null | undefined): StatutDelai {
  if (jours === null || jours === undefined) return "DATE A VERIFIER";
  if (jours < 0) return "EXPIRE";
  for (const [statut, seuil] of SEUILS) if (jours <= seuil) return statut;
  return "OUVERT";
}

export function couleurStatut(statut: StatutDelai | null | undefined): string {
  return COULEURS[statut ?? "DATE A VERIFIER"] ?? COULEURS["DATE A VERIFIER"];
}

// --------------------------------------------------------- deduplication --

// ------------------------------------------------------------- SECTEURS

/**
 * Ce qu on affiche quand aucune tentative n a abouti.
 *
 * Une cellule vide est ambigue : le client ne sait pas si l information
 * manque a la source ou si le produit a un defaut. Une valeur explicite
 * repond, et devient une entree de filtre utilisable - il peut aller voir
 * ce qui n a pas ete classe.
 *
 * A DISTINGUER D "Autre", qui veut dire autre chose : classe, mais aucune
 * categorie ne convient. Ici, on n a pas su.
 *
 * Pose en DERNIER, apres le defaut de la source, le modele et la deduction
 * par mots-cles.
 */
export const SECTEUR_INCONNU = "Non precise";

/**
 * Vocabulaire des secteurs, partage par tout le produit.
 *
 * Vit ici, a cote de TYPES_ANNONCE : le modele et la deduction
 * deterministe doivent puiser dans la meme liste.
 */
export const SECTEURS_ANNONCE = [
  "Agriculture et agroalimentaire",
  "Eau et assainissement",
  "Education et formation",
  "Energie",
  "Environnement et climat",
  "Entrepreneuriat et PME",
  "Finance",
  "Genre et inclusion",
  "Gouvernance et institutions",
  "Humanitaire, paix et securite",
  "Infrastructures et BTP",
  "Numerique et technologie",
  "Sante",
  "Transport et logistique",
  "Culture et arts",
  "Autre",
] as const;

/**
 * Mots qui designent un secteur sans ambiguite.
 *
 * MESURE DU 2026-09-02 : 390 opportunites sur 449 n avaient AUCUN secteur,
 * soit 87 %. Un client sans classement intelligent n avait donc pas de
 * filtre secteur du tout.
 *
 * Les termes sont choisis pour etre SPECIFIQUES. "Projet", "programme" ou
 * "appui" ne figurent nulle part : ils designent tout et donc rien. Mieux
 * vaut une colonne vide qu un secteur faux - une annonce mal rangee est une
 * annonce que le client ne trouvera pas.
 *
 * Francais et anglais melanges : les sources sont bilingues.
 */
const MOTS_SECTEUR: readonly (readonly [string, readonly string[]])[] = [
  ["Sante", ["sante", "health", "medical", "medicaux", "hopital", "hospital",
    "clinique", "clinical", "medicament", "pharmaceutic", "vaccin", "vaccine",
    "nutrition", "epidemi", "maladie", "disease", "patient", "soins",
    "medico", "chirurg", "dispensaire", "infirmerie", "maternite",
    "centre de sante", "sanitaire"]],
  ["Eau et assainissement", ["assainissement", "sanitation", "eau potable",
    "drinking water", "forage", "borehole", "adduction", "hydraulique",
    "latrine", "hygiene", "wash"]],
  ["Energie", ["energie", "energy", "electri", "solaire", "solar",
    "photovoltai", "reseau electrique", "grid", "renouvelable", "renewable",
    "centrale", "power plant", "compteur", "eclairage"]],
  ["Agriculture et agroalimentaire", ["agricole", "agriculture", "agro",
    "elevage", "livestock", "semence", "seed", "irrigation", "peche",
    "fisheries", "recolte", "harvest", "farmer", "agriculteur", "betail"]],
  ["Education et formation", ["education", "scolaire", "school", "enseign",
    "universit", "student", "etudiant", "formation professionnelle",
    "curriculum", "pedagog", "alphabetisation", "literacy",
    "salle de classe", "salles de classe", "ecole", "lycee", "college",
    "apprenant", "eleve", "eleves", "classroom"]],
  ["Numerique et technologie", ["numerique", "digital", "informatique",
    "logiciel", "software", "internet", "cybersecur", "donnees", "data",
    "intelligence artificielle", "artificial intelligence", "serveur",
    "ordinateur", "computer", "telecom", "connectivite"]],
  // "building" seul a ete RETIRE le 2026-09-02 : en anglais du
  // developpement, "capacity building" est partout, et il rangeait
  // "TRAINING MODULE & CAPACITY BUILDING ON HUMAN RIGHTS" dans le BTP.
  // Les vrais travaux restent couverts par construction, civil works,
  // batiment et genie civil.
  ["Infrastructures et BTP", ["construction", "travaux de rehabilitation",
    "batiment", "building works", "building construction", "genie civil",
    "civil works", "voirie", "amenagement", "refection", "pistes rurales",
    "pont", "bridge"]],
  ["Transport et logistique", ["transport", "logistique", "logistics",
    "vehicule", "vehicle", "fret", "freight", "portuaire", "aeroport",
    "airport", "route nationale", "ferroviaire", "railway"]],
  ["Environnement et climat", ["environnement", "environmental", "climat",
    "climate", "biodiversit", "foret", "forest", "dechets", "waste",
    "pollution", "carbone", "carbon", "adaptation", "resilience"]],
  ["Finance", ["microfinance", "bancaire", "banking", "microcredit", "assurance",
    "insurance", "fiscal", "budgetaire", "audit financier", "tresorerie"]],
  ["Genre et inclusion", ["genre", "gender", "femme", "women", "handicap",
    "disabilit", "inclusion", "egalite", "equality", "jeunes filles"]],
  ["Humanitaire, paix et securite", ["humanitaire", "humanitarian",
    "refugie", "refugee", "deplace", "displaced", "urgence", "emergency",
    "paix", "peace", "securite civile", "conflit", "conflict", "deminage"]],
  ["Gouvernance et institutions", ["gouvernance", "governance",
    "etat de droit", "rule of law", "justice", "judiciaire", "election",
    "parlement", "decentralisation", "societe civile", "civil society",
    "transparence", "anticorruption", "corruption"]],
  ["Culture et arts", ["culturel", "artistique", "artist",
    "patrimoine", "heritage", "musee", "museum", "cinema", "audiovisuel",
    "musique", "music", "theatre"]],
  ["Entrepreneuriat et PME", ["entrepreneur", "startup", "start-up", "pme",
    "sme", "incubat", "accelerat", "petites et moyennes entreprises",
    "business plan", "artisan"]],
];

/**
 * Deduit un secteur du titre et du resume, sans modele.
 *
 * TROIS PRECAUTIONS.
 *
 * On ne devine pas. Sans correspondance nette, la colonne reste VIDE - une
 * annonce mal rangee est une annonce que le client ne trouvera pas.
 *
 * Le titre pese plus que le resume : un resume mentionne souvent le contexte
 * du bailleur plutot que l objet du marche. On cherche donc d abord dans le
 * titre seul, et seulement ensuite dans l ensemble.
 *
 * Un secteur deja renseigne - par la source ou par le modele - n est jamais
 * ecrase.
 */
export function deduireSecteur(titre: unknown, _resume?: unknown): string {
  const nettoyer = (v: unknown): string => {
    const sansAccents = String(v ?? "").normalize("NFD").split("")
      .filter((ch) => { const n = ch.charCodeAt(0); return n < 0x300 || n > 0x36f; })
      .join("").toLowerCase();
    let out = "";
    for (const ch of sansAccents) {
      out += (ch >= "a" && ch <= "z") || (ch >= "0" && ch <= "9") ? ch : " ";
    }
    return " " + out.split(" ").filter(Boolean).join(" ") + " ";
  };

  // UNE SEULE PASSE, SUR LE TITRE. La seconde passe sur le resume a ete
  // retiree apres mesure : elle produisait l essentiel des erreurs, parce
  // qu un resume parle du contexte du bailleur plutot que de l objet du
  // marche. Un secteur faux est PIRE qu un secteur vide - le client ne
  // trouvera pas l annonce.
  const t = nettoyer(titre);
  const jetons = new Set(t.split(" ").filter(Boolean));

  // UN TERME D UN SEUL MOT DOIT CORRESPONDRE A UN MOT ENTIER.
  //
  // Mesure du 2026-09-02 : cherche en sous-chaine, "election" se trouvait a
  // l interieur de "selection" et rangeait "Cabinet pour la selection de 20
  // campements" en Gouvernance. Les expressions de plusieurs mots, elles,
  // restent cherchees en sous-chaine : elles sont assez specifiques.
  const correspond = (m: string): boolean => {
    if (m.includes(" ")) return t.includes(m);
    if (jetons.has(m)) return true;
    // Une racine volontairement tronquee - "electri", "biodiversit" - vise
    // les mots qui COMMENCENT par elle.
    for (const jeton of jetons) if (jeton.startsWith(m)) return true;
    return false;
  };

  for (const [secteur, mots] of MOTS_SECTEUR) {
    if (mots.some(correspond)) return secteur;
  }
  return "";
}

// ------------------------------------------------------- TYPES D ANNONCE

/**
 * Vocabulaire des types, partage par tout le produit.
 *
 * MESURE DU 2026-09-02, sur 449 opportunites reellement collectees : la
 * colonne Type portait QUATORZE libelles pour huit notions. "Appel d offres"
 * apparaissait 90 fois et "Appel d Offre" 43 fois - deux ecritures de la
 * meme chose, donc deux entrees de filtre, donc un filtre inutilisable.
 *
 * La normalisation est DETERMINISTE et n a besoin d aucune cle : un client
 * sans classement intelligent doit pouvoir filtrer par type.
 */
export const TYPES_ANNONCE = [
  "Appel d'offres",
  "AMI",
  "Demande de cotation",
  "Appel a projets",
  "Subvention",
  "Bourse",
  "Investissement",
  "Recrutement",
  "Evenement",
  "Autre",
] as const;

/**
 * Libelles rencontres en production, et ce qu ils veulent dire.
 *
 * Compares apres passage en minuscules et retrait des accents et de la
 * ponctuation : "Appel d'Offre", "APPEL D OFFRES" et "appel doffre"
 * tombent tous sur la meme cle.
 */
const TYPES_CONNUS: Record<string, string> = {
  "appel d offre": "Appel d'offres",
  "appel d offres": "Appel d'offres",
  "appel doffre": "Appel d'offres",
  "appel doffres": "Appel d'offres",
  "avis d appel d offres": "Appel d'offres",
  "marche de fournitures": "Appel d'offres",
  "marche de travaux": "Appel d'offres",
  "marche de services": "Appel d'offres",
  "invitation for bids": "Appel d'offres",
  "invitation to bid": "Appel d'offres",
  "request for bids": "Appel d'offres",
  "invitation for prequalification": "Appel d'offres",
  "ami": "AMI",
  "avis a manifestation d interet": "AMI",
  "manifestation d interet": "AMI",
  "request for expression of interest": "AMI",
  "expression of interest": "AMI",
  // UNGM abrege : "Request for EOI".
  "request for eoi": "AMI",
  "general procurement notice": "AMI",
  "demande de cotation": "Demande de cotation",
  "demande de prix": "Demande de cotation",
  "request for quotation": "Demande de cotation",
  "request for proposal": "Demande de cotation",
  "request for proposals": "Demande de cotation",
  "consultant qualification selection": "AMI",
  "appel a projet": "Appel a projets",
  "appel a projets": "Appel a projets",
  "appel a propositions": "Appel a projets",
  "call for proposals": "Appel a projets",
  "subvention": "Subvention",
  "subventions": "Subvention",
  "grant": "Subvention",
  "grants": "Subvention",
  "bourse": "Bourse",
  "bourses": "Bourse",
  "fellowship": "Bourse",
  "scholarship": "Bourse",
  "investissement": "Investissement",
  "investment": "Investissement",
  "recrutement": "Recrutement",
  "individual consultant": "Recrutement",
  "evenement": "Evenement",
  "formation": "Evenement",
  "conference": "Evenement",
  "actualites": "Autre",
};

/** Minuscules, sans accents, sans ponctuation : la cle de comparaison. */
function cleType(brut: string): string {
  const sansAccents = brut.normalize("NFD").split("")
    .filter((ch) => { const n = ch.charCodeAt(0); return n < 0x300 || n > 0x36f; })
    .join("").toLowerCase();
  let sortie = "";
  for (const ch of sansAccents) {
    sortie += (ch >= "a" && ch <= "z") || (ch >= "0" && ch <= "9") ? ch : " ";
  }
  return sortie.split(" ").filter(Boolean).join(" ");
}

/**
 * Ramene un type au vocabulaire commun.
 *
 * TROIS PRECAUTIONS, apprises en production.
 *
 * Un libelle inconnu est CONSERVE tel quel plutot que range dans "Autre" :
 * une source peut employer un terme juste que nous n avons pas encore
 * rencontre, et l ecraser ferait perdre de l information.
 *
 * En revanche, ce qui ne ressemble pas a un type est ecarte. L analyseur de
 * l ABE deversait des references entieres dans la colonne - "AVIS N°
 * 001/2026/PRMP-ABE/APM du 19 Janvier 2026" y figurait comme TYPE. Au-dela
 * de 40 caracteres ou en presence de chiffres longs, ce n est pas un type.
 *
 * Une valeur vide reste vide : on n invente pas un type par defaut.
 */
export function normaliserType(brut: unknown): string {
  const texte = String(brut ?? "").trim();
  if (!texte) return "";

  const cle = cleType(texte);
  const connu = TYPES_CONNUS[cle];
  if (connu) return connu;

  // Une reference, une date ou une phrase entiere n est pas un type.
  if (texte.length > 40) return "";
  if (/\d{3}/.test(texte)) return "";

  return texte;
}

// ------------------------------------------------------------ pertinence --

/**
 * Pertinence : ce que l'annonce vaut POUR CE CLIENT-LA.
 *
 * Jumeau de pertinence() dans apps_script/Core.gs, meme vocabulaire et
 * memes seuils - le libelle commence par son rang pour qu'un tri
 * alphabetique range le plus pertinent en premier.
 *
 * ELLE ETIQUETTE, ELLE NE SUPPRIME PAS. Une annonce hors profil reste dans
 * la liste : une ligne de trop coute un defilement, une opportunite
 * supprimee coute un marche.
 */
export const PERTINENCE_PRIORITAIRE = "3 - PRIORITAIRE";
export const PERTINENCE_A_VOIR = "2 - A VOIR";
export const PERTINENCE_POSSIBLE = "1 - POSSIBLE";
export const PERTINENCE_HORS_PROFIL = "0 - HORS PROFIL";

export const PERTINENCES = [PERTINENCE_PRIORITAIRE, PERTINENCE_A_VOIR,
                            PERTINENCE_POSSIBLE, PERTINENCE_HORS_PROFIL];

/** (libelle, score minimum), du plus pertinent au moins pertinent. */
const PERTINENCE_SEUILS: [string, number][] = [
  [PERTINENCE_PRIORITAIRE, 4],
  [PERTINENCE_A_VOIR, 3],
  [PERTINENCE_POSSIBLE, 2],
];

/**
 * Un pays ecrit ainsi n'exclut personne : l'annonce est ouverte a tous. Une
 * structure beninoise peut candidater a un appel mondial - meme decision
 * que LLM_APPELS_MONDIAUX, et elle vaut sans aucune cle.
 */
const PAYS_OUVERTS = ["international", "afrique", "multi-pays", "monde",
                      "mondial", "global", "worldwide", "afrique de l'ouest",
                      "cedeao", "umoa"];

/** Une liste "Benin, Togo, Niger" en mots comparables. */
export function listeConfig(valeur: unknown): string[] {
  return String(valeur ?? "")
    .split(/[;,]/)
    .map((m) => normaliser(m))
    .filter((m) => m.length > 0);
}

function correspond(texte: unknown, liste: string[]): boolean {
  const t = normaliser(texte);
  if (!t) return false;
  return liste.some((m) => t.includes(m) || m.includes(t));
}

/**
 * Deux axes, deux points chacun.
 *
 * PAYS. Deux points dans un pays suivi. UN point quand l'annonce n'exclut
 * personne - "International", "Afrique (multi-pays)", pays vide. Zero pour
 * un pays qui n'est pas le sien.
 *
 * SECTEUR. Deux points si le secteur est suivi, mais AUSSI deux points si
 * le client n'a declare aucun secteur : ne rien dire n'est pas se
 * restreindre. Un point quand le secteur est inconnu. Zero sinon.
 */
export function pertinence(
  annonce: { pays?: string | null; secteur?: string | null },
  config: { paysSuivis?: string; secteursSuivis?: string } = {},
): string {
  const paysSuivis = listeConfig(config.paysSuivis);
  const secteursSuivis = listeConfig(config.secteursSuivis);

  let points = 0;
  const pays = annonce.pays ?? "";
  if (paysSuivis.length && correspond(pays, paysSuivis)) points += 2;
  else if (!paysSuivis.length || estVide(pays) || correspond(pays, PAYS_OUVERTS)) {
    points += 1;
  }

  const secteur = annonce.secteur ?? "";
  if (!secteursSuivis.length || correspond(secteur, secteursSuivis)) points += 2;
  else if (estVide(secteur) || secteur === SECTEUR_INCONNU) points += 1;

  for (const [libelle, minimum] of PERTINENCE_SEUILS) {
    if (points >= minimum) return libelle;
  }
  return PERTINENCE_HORS_PROFIL;
}

/**
 * Ce qui a REELLEMENT ete collecte : pays et secteurs, avec leur compte.
 *
 * PAYS_SUIVIS et SECTEURS_SUIVIS se remplissent a la main. Une valeur
 * inventee - un pays qu'aucune source ne publie, un secteur ecrit
 * autrement - ne correspond a rien, ne remonte rien, et NE SE VOIT PAS.
 * L'inventaire montre ce qui existe vraiment, avec le nombre d'annonces et
 * ce que la configuration retient aujourd'hui.
 *
 * Jumeau de inventaireProfil() dans apps_script/Core.gs.
 */
export const PROFIL_TYPE_PAYS = "Pays";
export const PROFIL_TYPE_SECTEUR = "Secteur";

export type RangeeProfil = [string, string, number, string];

export function inventaireProfil(
  lignes: readonly { pays?: string | null; secteur?: string | null }[],
  config: { paysSuivis?: string; secteursSuivis?: string } = {},
): RangeeProfil[] {
  const compter = (champ: "pays" | "secteur") => {
    const comptes = new Map<string, number>();
    for (const l of lignes) {
      const valeur = (l[champ] ?? "").trim();
      if (!valeur) continue;
      comptes.set(valeur, (comptes.get(valeur) ?? 0) + 1);
    }
    return comptes;
  };

  // Le plus present d'abord ; a egalite, l'ordre alphabetique fige le
  // classement pour que deux passages ne l'intervertissent pas.
  const rangs = (comptes: Map<string, number>, type: string,
                 suivis: string[]): RangeeProfil[] =>
    [...comptes.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([valeur, n]) => [
        type, valeur, n,
        !suivis.length || correspond(valeur, suivis) ? "OUI" : "NON",
      ]);

  return [
    ...rangs(compter("pays"), PROFIL_TYPE_PAYS, listeConfig(config.paysSuivis)),
    ...rangs(compter("secteur"), PROFIL_TYPE_SECTEUR,
             listeConfig(config.secteursSuivis)),
  ];
}

/**
 * Ce niveau de pertinence doit-il declencher une notification ?
 *
 * Liste vide = tout est notifie : un client qui n'a rien regle ne doit rien
 * rater. La comparaison est tolerante - "3 - PRIORITAIRE", "PRIORITAIRE" et
 * "3" designent le meme niveau - parce que le libelle se recopie a la main.
 *
 * Jumeau de pertinenceNotifiable() dans apps_script/Core.gs.
 */
export function pertinenceNotifiable(
  pertinence: string | null | undefined,
  config: { notifierPertinence?: string } = {},
): boolean {
  const voulus = listeConfig(config.notifierPertinence);
  if (!voulus.length) return true;

  const brut = (pertinence ?? "").trim();
  // Une annonce sans pertinence calculee passe : le doute lui profite.
  if (!brut) return true;

  const normalise = normaliser(brut);
  const rang = /^(\d)/.exec(brut)?.[1];
  return voulus.some((voulu) =>
    normalise.includes(voulu) || voulu.includes(normalise)
    || (!!rang && voulu === rang));
}

/**
 * L'ordre du tableau : le plus de temps devant en haut.
 *
 * Trois rangs, dans cet ordre :
 *
 *   1. les opportunites ENCORE OUVERTES, de la plus lointaine a la plus
 *      proche - on voit d'abord celles qu'on a le temps de preparer ;
 *   2. les EXPIREES, jours restants negatifs ;
 *   3. les SANS ECHEANCE, tout en bas. Elles ne sont pas moins bonnes - la
 *      DNCMP n'en publie aucune - mais elles ne se rangent nulle part sur
 *      un axe de temps.
 *
 * A egalite de delai, le plus pertinent passe devant.
 *
 * Ne modifie pas le tableau recu. Jumeau de parDelai_() dans Core.gs.
 */
export function parDelai<T extends {
  id?: string; joursRestants?: number | null; pertinence?: string | null;
}>(lignes: readonly T[]): T[] {
  const jours = (l: T) => {
    const j = l.joursRestants;
    return j === null || j === undefined || !isFinite(Number(j))
      ? null : Number(j);
  };
  return lignes.slice().sort((a, b) => {
    const ja = jours(a);
    const jb = jours(b);
    // Sans echeance : toujours en bas, quel que soit le reste.
    if (ja === null && jb === null) return 0;
    if (ja === null) return 1;
    if (jb === null) return -1;
    if (ja !== jb) return jb - ja;
    const pa = a.pertinence ?? "";
    const pb = b.pertinence ?? "";
    if (pa !== pb) return pa < pb ? 1 : -1;
    return String(a.id ?? "").localeCompare(String(b.id ?? ""));
  });
}

/**
 * Du plus pertinent au moins pertinent, puis du plus urgent au moins
 * urgent. Ce qui vous concerne se lit en premier.
 */
export function parPertinence<T extends {
  pertinence?: string | null; joursRestants?: number | null;
}>(lignes: readonly T[]): T[] {
  return lignes.slice().sort((a, b) => {
    const pa = a.pertinence ?? "";
    const pb = b.pertinence ?? "";
    if (pa !== pb) return pa < pb ? 1 : -1;
    return (a.joursRestants ?? 9999) - (b.joursRestants ?? 9999);
  });
}

/**
 * MESURE DU 2026-09-02. Le lien seul faisait office d identite, et c etait
 * faux. Beaucoup de portails pointent chaque avis vers la meme page de
 * liste : trouverDoublon s arretant a la premiere cle qui correspond, la
 * cle URL suffisait a confondre des avis differents.
 *
 * Degats constates en production, sur des sources actives :
 *   DNCMP Benin ..... 43 avis publies, 1 seul enregistre
 *   SBEE ............  7 avis,          1 seul
 *   DEDRAS ..........  2 avis,          1 seul
 *
 * La cle URL porte donc aussi le titre. Deux avis distincts sur une meme
 * page restent distincts ; un meme avis recollecte reste reconnu. Le
 * compromis est assume : si une source reecrit le titre d un avis, il peut
 * creer une seconde ligne. Une ligne en double se voit et se supprime ;
 * quarante-deux marches jamais enregistres ne se voient pas.
 *
 * Cles de deduplication, par ordre de fiabilite :
 * 1. lien officiel, 2. reference officielle, 3. titre + organisation +
 * deadline. Une seule correspondance suffit a reconnaitre un doublon.
 */
export function clesDedup(o: Opportunite): string[] {
  const cles: string[] = [];
  // Voir la note ci-dessus : le lien seul confondait des avis distincts.
  if (!estVide(o.lien)) {
    cles.push("url:" + normaliser(o.lien) + "|" + normaliser(o.titre));
  }
  if (!estVide(o.reference)) cles.push("ref:" + normaliser(o.reference));
  if (!estVide(o.titre)) {
    cles.push("t:" + [normaliser(o.titre), normaliser(o.organisation),
                      jour(o.deadline)].join("|"));
  }
  return cles;
}

export function construireIndex<T extends Opportunite>(
  lignes: T[],
): Map<string, T> {
  const index = new Map<string, T>();
  for (const ligne of lignes) {
    for (const cle of clesDedup(ligne)) if (!index.has(cle)) index.set(cle, ligne);
  }
  return index;
}

export function trouverDoublon<T extends Opportunite>(
  o: Opportunite, index: Map<string, T>,
): T | null {
  for (const cle of clesDedup(o)) {
    const trouve = index.get(cle);
    if (trouve) return trouve;
  }
  return null;
}

/** Champs modifiables quand la source republie une annonce connue. */
export const CHAMPS_MAJ = [
  "titre", "organisation", "pays", "type", "secteur", "lien", "pdf",
  "datePublication", "deadline", "budget", "resume",
] as const;

/**
 * Ce qui a change depuis la derniere collecte.
 *
 * On ne remplace jamais une valeur existante par du vide : une source qui
 * cesse temporairement de publier un champ ne doit pas effacer la base.
 */
export function champsModifies(
  existant: Opportunite, entrant: Opportunite,
): Partial<Opportunite> {
  // CHAMPS_MAJ est une liste de cles litterales : l'indexation est donc
  // sure sans conversion de type.
  const diff: Record<string, string> = {};
  for (const cle of CHAMPS_MAJ) {
    const neuf = entrant[cle];
    if (estVide(neuf)) continue;
    const ancien = existant[cle];
    if (cle === "deadline" || cle === "datePublication") {
      if (jour(neuf) !== jour(ancien)) diff[cle] = jour(neuf);
      continue;
    }
    if (String(neuf).trim() !== String(ancien ?? "").trim()) {
      diff[cle] = String(neuf).trim();
    }
  }
  return diff as unknown as Partial<Opportunite>;
}

/** Identifiant lisible et stable : TP-000001. */
export function prochainId(existants: { id?: string | null }[]): string {
  let max = 0;
  const motif = new RegExp(`^${PREFIXE_ID}-(\\d+)$`);
  for (const o of existants) {
    const m = motif.exec(String(o.id ?? "").trim());
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${PREFIXE_ID}-${String(max + 1).padStart(6, "0")}`;
}

// ------------------------------------------------------- fraicheur source --

/** Six mois sans publication : une source est presque toujours abandonnee. */
export const JOURS_SOURCE_SILENCIEUSE = 180;

/**
 * Une source joignable mais silencieuse depuis des mois donne un faux
 * sentiment de securite : on le signale plutot que de la laisser passer
 * pour active. `dates` : chaines "aaaa-mm-jj". `reference` : le jour courant.
 */
export function fraicheurSource(
  dates: (string | null | undefined)[], reference: string,
): { silencieuse: boolean; jours: number | null } {
  const jours = dates
    .map((d) => jour(d))
    .filter(Boolean)
    .map((d) => -(joursRestants(d, reference) ?? 0));
  if (!jours.length) return { silencieuse: false, jours: null };
  const plusRecent = Math.min(...jours);
  return { silencieuse: plusRecent > JOURS_SOURCE_SILENCIEUSE, jours: plusRecent };
}

// --------------------------------------------------------- notifications --

export type TypeNotification = "nouvelle" | "j7" | "j3" | "j1" | "expire";

interface RegleNotification {
  cle: TypeNotification;
  champ: keyof Opportunite;
  actif: keyof Config;
  seuil: number | null;
}

export const NOTIFICATIONS: RegleNotification[] = [
  { cle: "nouvelle", champ: "notifNouvelle", actif: "envoiNouvelle", seuil: null },
  { cle: "j7", champ: "notifJ7", actif: "envoiJ7", seuil: 7 },
  { cle: "j3", champ: "notifJ3", actif: "envoiJ3", seuil: 3 },
  { cle: "j1", champ: "notifJ1", actif: "envoiJ1", seuil: 1 },
  { cle: "expire", champ: "notifExpire", actif: "envoiExpire", seuil: -1 },
];

/**
 * Cette opportunite est-elle suivie par le client ?
 *
 * Jumeau d'estSuivie_() dans Core.gs. Deux mecanismes s'en servent :
 * l'agenda, et les rappels quand le client a demande qu'ils s'y limitent.
 */
export function estSuivie(o: Opportunite): boolean {
  const v = o.suivi;
  if (v === true) return true;
  return ["true", "vrai", "oui", "yes", "1"]
    .includes(String(v ?? "").trim().toLowerCase());
}

/** Les canaux d'alerte, dans l'ordre ou une case les enumere. */
export const CANAUX = ["email", "telegram", "ntfy"] as const;
export type Canal = (typeof CANAUX)[number];

/** Ce que porte une case Notif_* : la liste des canaux deja servis. */
export type MarqueNotification = string | boolean;

/**
 * LA MEMOIRE D'UNE ALERTE EST PAR CANAL, PAS PAR LIGNE.
 *
 * Un booleen suffisait tant que les deux canaux partaient ensemble. Des
 * l'instant ou l'email et Telegram ont leur propre plafond, ils n'avancent
 * plus au meme rythme : Telegram peut avoir servi une ligne que l'email
 * doit encore envoyer au passage suivant. Un seul booleen ne sait pas dire
 * cela - il ferait soit un doublon sur Telegram, soit un email perdu.
 *
 * RETROCOMPATIBILITE : `true`, ecrit par une version precedente, se lit
 * "tous canaux servis". C'est le seul choix sur pour une base deja en
 * service - l'inverse renverrait des alertes deja recues.
 *
 * Jumeau de canauxNotifies_() dans Core.gs.
 */
export function canauxNotifies(valeur: unknown): Canal[] {
  if (valeur === true) return [...CANAUX];
  return String(valeur ?? "").toLowerCase().split(",")
    .map((c) => c.trim())
    .filter((c): c is Canal => (CANAUX as readonly string[]).includes(c));
}

/** Cette alerte est-elle deja partie SUR CE CANAL ? */
export function dejaNotifie(valeur: unknown, canal: Canal): boolean {
  return canauxNotifies(valeur).includes(canal);
}

/** Ajoute un canal a une case, sans perdre ceux qui y sont deja. */
export function ajouterCanal(valeur: unknown, canal: Canal): string {
  const canaux = canauxNotifies(valeur);
  if (!canaux.includes(canal)) canaux.push(canal);
  // Toujours dans l'ordre de CANAUX : deux passages doivent produire la
  // meme chaine, sinon la cellule change sans que rien n'ait change.
  return CANAUX.filter((c) => canaux.includes(c)).join(",");
}

/**
 * Notifications a declencher pour une opportunite, SUR UN CANAL donne.
 *
 * Deux regles qui evitent le harcelement :
 * - les rappels J-7 / J-3 / J-1 ne concernent que les deadlines a venir.
 *   Sans cela une opportunite expiree depuis un mois satisferait aussi
 *   "jours restants <= 7" et recevrait quatre emails d'un coup.
 * - une opportunite decouverte alors qu'il reste 2 jours declenche J-7, J-3
 *   et J-1 en meme temps. On envoie le plus urgent, et on marque les autres
 *   comme envoyes : ils n'ont plus lieu d'etre.
 */
export function notificationsAEnvoyer(
  o: Opportunite, config: Config, canal: Canal = "email",
): { envoyer: TypeNotification[]; marquer: TypeNotification[] } {
  const envoyer: TypeNotification[] = [];
  const candidats: TypeNotification[] = [];
  const jours = o.joursRestants ?? null;

  // LES RAPPELS PEUVENT ETRE RESERVES AUX OFFRES SUIVIES, PAS L'ANNONCE
  // D'UNE NOUVEAUTE : une opportunite qui vient d'entrer ne peut pas encore
  // etre suivie, et la restreindre reviendrait a ne plus rien annoncer.
  const rappelsReserves = Boolean(config.rappelsSuivisSeulement)
    && !estSuivie(o);

  for (const regle of NOTIFICATIONS) {
    if (!config[regle.actif]) continue;
    if (dejaNotifie(o[regle.champ], canal)) continue;
    // NI ENVOYE, NI MARQUE : le client peut cocher Suivi demain.
    if (regle.cle !== "nouvelle" && rappelsReserves) continue;

    if (regle.cle === "nouvelle") { envoyer.push("nouvelle"); continue; }
    if (jours === null) continue;
    if (regle.cle === "expire") {
      if (jours < 0) candidats.push("expire");
      continue;
    }
    if (jours >= 0 && jours <= (regle.seuil as number)) candidats.push(regle.cle);
  }

  for (const cle of ["expire", "j1", "j3", "j7"] as TypeNotification[]) {
    if (candidats.includes(cle)) { envoyer.push(cle); break; }
  }

  const marquer = [...candidats];
  if (envoyer.includes("nouvelle")) marquer.push("nouvelle");
  return { envoyer, marquer };
}

// ------------------------------------------------- alertes du tableau de bord --

export type NiveauAlerte = "urgent" | "bientot" | "expire" | "nouvelle";

export interface Alerte {
  niveau: NiveauAlerte;
  titre: string;
  detail: string;
  /** Identifiant de l'opportunite concernee, pour pouvoir y renvoyer. */
  id?: string | null;
  lien?: string | null;
  deadline?: string | null;
  joursRestants?: number | null;
}

/** Ordre d'affichage : le plus pressant en premier. */
const ORDRE_ALERTES: NiveauAlerte[] = ["urgent", "bientot", "expire", "nouvelle"];

/**
 * Ce qui demande l'attention de l'utilisateur, maintenant.
 *
 * Le tableau de bord et les emails partagent volontairement les memes
 * seuils - ceux de NOTIFICATIONS - pour qu'ils ne se contredisent jamais :
 * recevoir un email "plus que 3 jours" et voir un ecran qui n'en parle pas
 * ferait douter de l'outil.
 *
 * Mais ils ne fonctionnent PAS de la meme facon, et c'est voulu :
 *
 *   un email est un evenement. Il part une fois, et l'opportunite est
 *   marquee pour ne pas etre relancee.
 *
 *   le tableau de bord est un etat. Il montre la situation a l'instant ou
 *   on le regarde, sans rien consommer. Une echeance a 2 jours reste
 *   affichee tant qu'elle est a 2 jours, meme si l'email est deja parti.
 *
 * C'est pour cela que cette fonction ignore les temoins notifJ7, notifJ3 et
 * les autres : ils disent ce qui a ete envoye, pas ce qui est vrai.
 */
export function alertes(
  lignes: Opportunite[], reference: string, maximum = 20,
): Alerte[] {
  const trouvees: Alerte[] = [];

  for (const o of lignes) {
    const jours = joursRestants(o.deadline, reference);
    const commun = {
      id: o.id ?? o.reference ?? null,
      lien: o.lien ?? null,
      deadline: o.deadline ?? null,
      joursRestants: jours,
    };
    const ou = o.organisation ? ` - ${o.organisation}` : "";

    if (jours !== null && jours >= 0 && jours <= 3) {
      trouvees.push({
        niveau: "urgent",
        titre: o.titre,
        detail: jours === 0
          ? `Dernier jour pour deposer${ou}`
          : `Plus que ${jours} jour${jours > 1 ? "s" : ""}${ou}`,
        ...commun,
      });
      continue;
    }
    if (jours !== null && jours > 3 && jours <= 7) {
      trouvees.push({
        niveau: "bientot",
        titre: o.titre,
        detail: `Echeance dans ${jours} jours${ou}`,
        ...commun,
      });
      continue;
    }
    // Une opportunite expiree depuis des mois n'a plus rien a dire. On ne
    // garde que la semaine ecoulee : le temps de constater qu'on l'a ratee.
    if (jours !== null && jours < 0 && jours >= -7) {
      trouvees.push({
        niveau: "expire",
        titre: o.titre,
        detail: `Echeance passee depuis ${-jours} jour${jours < -1 ? "s" : ""}${ou}`,
        ...commun,
      });
      continue;
    }
    if (canauxNotifies(o.notifNouvelle).length === 0 && estVide(o.deadline)) {
      trouvees.push({
        niveau: "nouvelle",
        titre: o.titre,
        detail: `Aucune echeance lue : a verifier sur la source${ou}`,
        ...commun,
      });
    }
  }

  trouvees.sort((a, b) => {
    const rang = ORDRE_ALERTES.indexOf(a.niveau) - ORDRE_ALERTES.indexOf(b.niveau);
    if (rang !== 0) return rang;
    // A niveau egal, le plus urgent d'abord.
    return (a.joursRestants ?? 9999) - (b.joursRestants ?? 9999);
  });
  return trouvees.slice(0, maximum);
}

/** Combien d'alertes de chaque niveau, pour les compteurs du tableau de bord. */
export function compterAlertes(liste: Alerte[]): Record<NiveauAlerte, number> {
  const total: Record<NiveauAlerte, number> = {
    urgent: 0, bientot: 0, expire: 0, nouvelle: 0,
  };
  for (const a of liste) total[a.niveau]++;
  return total;
}

/** Champ temoin correspondant a un type de notification. */
export function champNotification(cle: TypeNotification): keyof Opportunite {
  const regle = NOTIFICATIONS.find((n) => n.cle === cle);
  if (!regle) throw new Error(`Notification inconnue : ${cle}`);
  return regle.champ;
}
