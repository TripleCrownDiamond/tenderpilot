/**
 * TenderPilot - intelligence optionnelle.
 *
 * Le LLM ne remplace jamais le moteur : il l'assiste. Sans cle, tout ce
 * fichier reste inerte et la collecte se comporte exactement comme avant.
 *
 * Trois emplois, et une interdiction.
 *
 *   Il classe    - secteur et type, annonce par annonce, la ou le registre
 *                  n'a qu'un defaut par source. La Banque mondiale sort
 *                  quarante avis etiquetes pareil ; c'est la que ca rapporte.
 *   Il filtre    - un avis pour le Bangladesh n'a rien a faire chez un
 *                  soumissionnaire beninois.
 *   Il resume    - un titre administratif de trois lignes devient lisible.
 *
 *   Il ne lit JAMAIS une date limite. Un modele produit toujours une date
 *   plausible plutot que rien, et une echeance inventee fait rater un depot.
 *   extraireDeadline reste seul juge. Le LLM propose, le code dispose.
 *
 * Rien ici ne touche au reseau : tout est testable hors de Google et hors
 * de Vercel.
 */

// --------------------------------------------------------------- DIALECTES

/**
 * Les fournisseurs ne parlent pas tous la meme langue. Trois dialectes
 * couvrent le marche :
 *
 *   openai    - Mistral, Groq, DeepSeek, OpenRouter, Together, vLLM local.
 *               Le client change une URL, pas notre code.
 *   anthropic - en-tete x-api-key, corps et reponse differents.
 *   gemini    - la cle passe en parametre d'URL, le modele est dans le
 *               chemin.
 */
export type DialecteLlm = "openai" | "anthropic" | "gemini";

export const DIALECTES: readonly DialecteLlm[] = ["openai", "anthropic", "gemini"];

/** Reglages par defaut, pour que le client n'ait qu'une cle a coller. */
export const ENDPOINTS_CONNUS: Record<DialecteLlm, string> = {
  openai: "https://api.mistral.ai/v1/chat/completions",
  anthropic: "https://api.anthropic.com/v1/messages",
  gemini: "https://generativelanguage.googleapis.com/v1beta/models",
};

export interface ConfigLlm {
  actif: boolean;
  dialecte: DialecteLlm;
  endpoint: string;
  cle: string;
  modele: string;
  /** Plafond quotidien. Au-dela, le LLM se tait et la collecte continue. */
  maxAppelsJour: number;
  /** Annonces envoyees en un seul appel. */
  tailleLot: number;
}

export const LLM_DEFAUTS = {
  dialecte: "openai" as DialecteLlm,
  modele: "mistral-small-latest",
  maxAppelsJour: 100,
  tailleLot: 30,
  /** Au-dela, on tronque la page : inutile de payer pour un pied de page. */
  maxCaracteresPage: 40000,
};

/**
 * Le LLM est-il utilisable ?
 *
 * Trois conditions, et l'absence d'une seule suffit a tout desactiver
 * silencieusement. C'est voulu : un client qui n'a pas de cle doit avoir un
 * produit qui marche, pas un produit qui se plaint.
 */
export function llmActif(config: ConfigLlm | null | undefined): boolean {
  if (!config || !config.actif) return false;
  return Boolean(
    String(config.cle ?? "").trim() &&
      String(config.modele ?? "").trim() &&
      String(config.endpoint ?? "").trim(),
  );
}

// ------------------------------------------------------------- EMPREINTE

/**
 * Empreinte d'une page, pour ne reveiller le LLM que si elle a bouge.
 *
 * Le nettoyage n'est pas un detail, c'est ce qui fait marcher la chose.
 * Mesure du 2026-09-01 sur six sources reelles, deux lectures a trois
 * secondes d'intervalle :
 *
 *   empreinte du HTML brut ......... stable sur 2 sources sur 6
 *   empreinte du texte visible ..... stable sur 5 sur 5 (pages valides)
 *
 * Autrement dit, hacher la page telle quelle ne sert a rien : GIZ, AFDB et
 * SRTB changent a chaque visite sans que le contenu bouge. ENABEL donne la
 * raison en clair - son seul element volatil est un compteur anti-spam
 * (ak_js) loge dans un attribut. Invisible dans le texte, fatal dans le
 * balisage.
 *
 * D'ou la regle : on hache le texte, jamais le balisage.
 */
export function texteVisible(html: string): string {
  if (!html) return "";
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[\s ]+/g, " ")
    .trim();
}

/**
 * Hachage FNV-1a sur deux registres, rendu en hexadecimal.
 *
 * Ecrit a la main plutot qu'emprunte a une bibliotheque : le meme code doit
 * tourner a l'identique dans Apps Script et dans Node, et une empreinte qui
 * differerait entre les deux moteurs ferait diverger les deux produits.
 *
 * Ce n'est pas du hachage cryptographique et ca n'a pas a l'etre : on
 * compare une page a sa propre version precedente, on ne cherche pas une
 * collision dans un espace ouvert.
 */
export function empreinteContenu(html: string): string {
  const texte = texteVisible(html);
  if (!texte) return "";

  let a = 0x811c9dc5;
  let b = 0x01000193;
  for (let i = 0; i < texte.length; i += 1) {
    const c = texte.charCodeAt(i);
    a ^= c;
    a = Math.imul(a, 0x01000193) >>> 0;
    b = (b + c) >>> 0;
    b = Math.imul(b, 0x85ebca6b) >>> 0;
  }
  const hex = (n: number): string => (n >>> 0).toString(16).padStart(8, "0");
  return hex(a) + hex(b);
}

/**
 * Faut-il rappeler le LLM sur cette source ?
 *
 * Une source dont la page n'a pas bouge n'a rien de nouveau a raconter. En
 * regime courant, deux ou trois sources sur cinquante changent un jour
 * donne : on passe de cinquante appels quotidiens a deux ou trois.
 *
 * Une empreinte precedente vide veut dire "jamais lue" : on lit.
 */
export function pageAChange(
  empreintePrecedente: string | null | undefined,
  empreinteActuelle: string,
): boolean {
  const avant = String(empreintePrecedente ?? "").trim();
  if (!avant) return true;
  return avant !== empreinteActuelle;
}

// ------------------------------------------------------------- REQUETES

/** URL a appeler. Gemini range le modele dans le chemin et la cle en query. */
export function urlRequete(config: ConfigLlm): string {
  const base = String(config.endpoint).trim().replace(/\/+$/, "");
  if (config.dialecte === "gemini") {
    return `${base}/${encodeURIComponent(config.modele)}:generateContent`
      + `?key=${encodeURIComponent(String(config.cle).trim())}`;
  }
  return base;
}

/**
 * En-tetes.
 *
 * La cle ne figure que la (ou dans l'URL pour Gemini). Elle ne doit jamais
 * ressortir dans un message d'erreur ni dans un journal - meme regle que le
 * jeton Telegram, et pour la meme raison : c'est le compte du client qui
 * paie.
 */
export function entetesRequete(config: ConfigLlm): Record<string, string> {
  const cle = String(config.cle).trim();
  if (config.dialecte === "anthropic") {
    return {
      "content-type": "application/json",
      "x-api-key": cle,
      "anthropic-version": "2023-06-01",
    };
  }
  if (config.dialecte === "gemini") {
    return { "content-type": "application/json" };
  }
  return {
    "content-type": "application/json",
    authorization: `Bearer ${cle}`,
  };
}

/** Corps de la requete, dans le dialecte du fournisseur. */
export function corpsRequete(config: ConfigLlm, invite: string): unknown {
  if (config.dialecte === "anthropic") {
    return {
      model: config.modele,
      max_tokens: 4096,
      messages: [{ role: "user", content: invite }],
    };
  }
  if (config.dialecte === "gemini") {
    return {
      contents: [{ parts: [{ text: invite }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 4096 },
    };
  }
  return {
    model: config.modele,
    temperature: 0,
    max_tokens: 4096,
    messages: [{ role: "user", content: invite }],
  };
}

/** Extrait le texte de la reponse, quel que soit le dialecte. */
export function lireReponse(dialecte: DialecteLlm, corps: string): string {
  let donnees: unknown;
  try {
    donnees = JSON.parse(corps);
  } catch {
    return "";
  }
  const d = donnees as Record<string, unknown>;

  if (dialecte === "anthropic") {
    const contenu = d.content as Array<{ text?: string }> | undefined;
    return Array.isArray(contenu) ? String(contenu[0]?.text ?? "") : "";
  }
  if (dialecte === "gemini") {
    const cands = d.candidates as
      Array<{ content?: { parts?: Array<{ text?: string }> } }> | undefined;
    return Array.isArray(cands)
      ? String(cands[0]?.content?.parts?.[0]?.text ?? "")
      : "";
  }
  const choix = d.choices as Array<{ message?: { content?: string } }> | undefined;
  return Array.isArray(choix) ? String(choix[0]?.message?.content ?? "") : "";
}

/**
 * Un modele encadre volontiers son JSON de texte ou de balises Markdown,
 * meme quand on le lui interdit. On recupere le premier objet ou tableau
 * plutot que de rejeter la reponse entiere.
 */
export function extraireJson(texte: string): unknown {
  const t = String(texte ?? "").trim();
  if (!t) return null;

  const sansCloture = t
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  const essais = [sansCloture];
  const debut = sansCloture.search(/[[{]/);
  if (debut > 0) essais.push(sansCloture.slice(debut));

  for (const essai of essais) {
    try {
      return JSON.parse(essai);
    } catch {
      // On tente le suivant.
    }
  }

  // Dernier recours : du premier crochet ouvrant au dernier fermant.
  const i = sansCloture.indexOf("[");
  const j = sansCloture.lastIndexOf("]");
  if (i >= 0 && j > i) {
    try {
      return JSON.parse(sansCloture.slice(i, j + 1));
    } catch {
      return null;
    }
  }
  return null;
}

// --------------------------------------------------------------- DECOUPE

/** Decoupe en lots, pour tenir dans les six minutes d'Apps Script. */
export function enLots<T>(elements: readonly T[], taille: number): T[][] {
  const n = Math.max(1, Math.floor(taille) || 1);
  const lots: T[][] = [];
  for (let i = 0; i < elements.length; i += n) {
    lots.push(elements.slice(i, i + n));
  }
  return lots;
}

// ------------------------------------------------------------- VOCABULAIRE

/**
 * Vocabulaire ferme.
 *
 * Laisse libre, un modele invente ses propres libelles : "Tech", "IT",
 * "Numerique", "Technologies de l information" pour une seule et meme
 * chose. Les filtres du tableau de bord deviennent alors inutilisables.
 * Toute valeur hors de ces listes est rejetee, pas rangee dans "Autre" en
 * douce.
 */
export const SECTEURS = [
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

export const TYPES = [
  "Appel d offres",
  "AMI",
  "Demande de cotation",
  "Appel a projets",
  "Subvention",
  "Bourse",
  "Investissement",
  "Recrutement",
  "Autre",
] as const;

/** Ne retient une valeur que si elle figure au vocabulaire. */
export function choisirDansListe(
  valeur: unknown,
  liste: readonly string[],
): string | null {
  const v = String(valeur ?? "").trim();
  if (!v) return null;
  const trouve = liste.find((c) => c.toLowerCase() === v.toLowerCase());
  return trouve ?? null;
}

// ------------------------------------------------------------- CLASSEMENT

/**
 * Invite de classement.
 *
 * Deux precautions y pesent plus que le reste.
 *
 * L interdiction des dates est repetee et explicite. Un modele a qui on
 * montre un avis produira une echeance plausible plutot que rien, et une
 * echeance inventee fait rater un depot. On ne lui demande pas de s en
 * abstenir poliment : le champ n existe pas dans le format de sortie.
 *
 * L index est renvoye par le modele. Se fier a l ordre du tableau serait
 * fragile - il en oublie un, et tout le lot est decale d un cran.
 */
export function invitePourClassement(
  lot: readonly { titre: string; resume?: string }[],
  zone: string,
): string {
  const annonces = lot.map((e, i) => {
    const resume = String(e.resume ?? "").replace(/\s+/g, " ").slice(0, 300);
    return `${i}. ${String(e.titre ?? "").slice(0, 250)}${resume ? " | " + resume : ""}`;
  }).join("\n");

  return [
    "Tu classes des avis de marches publics et d appels a financement.",
    "",
    "Pour CHAQUE annonce, renvoie un objet JSON avec exactement ces cles :",
    '  i        - le numero de l annonce, entier',
    '  secteur  - une valeur EXACTE de cette liste : ' + SECTEURS.join(" | "),
    '  type     - une valeur EXACTE de cette liste : ' + TYPES.join(" | "),
    '  resume   - une phrase de 20 mots maximum, en francais',
    '  pertinent- true si l avis concerne ' + zone + ', false sinon',
    "",
    "REGLES ABSOLUES :",
    "- Ne renvoie AUCUNE date, sous aucune forme. Pas de deadline, pas d echeance,",
    "  pas de date de publication. Ces informations sont lues ailleurs.",
    "- N invente pas de libelle : si aucun secteur ne convient, mets Autre.",
    "- Reponds UNIQUEMENT par un tableau JSON, sans texte avant ni apres.",
    "",
    "Annonces :",
    annonces,
  ].join("\n");
}

/**
 * Fusionne le verdict du modele dans les entrees.
 *
 * La ligne qui compte est la derniere : deadline et publie sont recopiees
 * depuis l entree d origine, apres l etalement. Meme si la reponse du
 * modele contient une echeance - et il en glisse une de temps en temps
 * malgre l interdiction - elle n atteint jamais la fiche. Un test le
 * verifie avec une reponse qui en contient une.
 */
export function appliquerClassement<T extends {
  titre: string; deadline: string | null; publie: string | null;
  resume: string; type?: string | null; secteur?: string | null;
  pertinent?: boolean;
}>(lot: readonly T[], brut: unknown): T[] {
  const parIndex = new Map<number, Record<string, unknown>>();
  if (Array.isArray(brut)) {
    for (const item of brut) {
      const o = item as Record<string, unknown>;
      const i = Number(o?.i);
      if (Number.isInteger(i) && i >= 0 && i < lot.length) parIndex.set(i, o);
    }
  }

  return lot.map((entree, i) => {
    const verdict = parIndex.get(i);
    if (!verdict) return entree;

    const resume = String(verdict.resume ?? "").trim();

    return {
      ...entree,
      secteur: choisirDansListe(verdict.secteur, SECTEURS) ?? entree.secteur ?? null,
      type: choisirDansListe(verdict.type, TYPES) ?? entree.type ?? null,
      resume: resume || entree.resume,
      pertinent: typeof verdict.pertinent === "boolean"
        ? verdict.pertinent : entree.pertinent,

      // Rien de ce qui suit ne vient du modele. Jamais.
      deadline: entree.deadline,
      publie: entree.publie,
    };
  });
}

/**
 * Ecarte les annonces jugees hors zone.
 *
 * Une entree que le modele n a pas vue - lot perdu, reponse illisible -
 * n a pas de verdict et reste. Le doute profite a l annonce : mieux vaut
 * une ligne de trop qu un marche manque.
 */
export function filtrerPertinentes<T extends { pertinent?: boolean }>(
  entrees: readonly T[],
): T[] {
  return entrees.filter((e) => e.pertinent !== false);
}
