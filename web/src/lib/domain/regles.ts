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
  source?: string | null;
  lien?: string | null;
  pdf?: string | null;
  reference?: string | null;
  datePublication?: string | null;
  deadline?: string | null;
  joursRestants?: number | null;
  statutDelai?: StatutDelai | null;
  resume?: string | null;
  notifNouvelle?: boolean;
  notifJ7?: boolean;
  notifJ3?: boolean;
  notifJ1?: boolean;
  notifExpire?: boolean;
}

export interface Config {
  emailNotification: string;
  envoiNouvelle: boolean;
  envoiJ7: boolean;
  envoiJ3: boolean;
  envoiJ1: boolean;
  envoiExpire: boolean;
  seuilDigest: number;
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
  fuseau: "Africa/Porto-Novo",
  maxParSource: 40,
  envoiTelegram: false,
  telegramToken: "",
  telegramChatId: "",
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
  ["Infrastructures et BTP", ["construction", "travaux de rehabilitation",
    "batiment", "building", "genie civil", "civil works", "voirie",
    "amenagement", "refection", "pistes rurales", "pont", "bridge"]],
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
  "datePublication", "deadline", "resume",
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
 * Notifications a declencher pour une opportunite.
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
  o: Opportunite, config: Config,
): { envoyer: TypeNotification[]; marquer: TypeNotification[] } {
  const envoyer: TypeNotification[] = [];
  const candidats: TypeNotification[] = [];
  const jours = o.joursRestants ?? null;

  for (const regle of NOTIFICATIONS) {
    if (!config[regle.actif]) continue;
    if (o[regle.champ] === true) continue;

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
    if (!o.notifNouvelle && estVide(o.deadline)) {
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
