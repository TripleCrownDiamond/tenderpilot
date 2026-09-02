/**
 * TenderPilot - collecte par API JSON.
 *
 * Troisieme methode de collecte, a cote du RSS et de l'extraction HTML.
 * Elle existe parce que certaines institutions n'offrent ni flux ni page
 * lisible : leur portail est une application JavaScript vide cote serveur,
 * mais l'API qui l'alimente, elle, est publique et stable.
 *
 * C'est le cas de la Banque mondiale : la page /projects-operations/procurement
 * ne contient aucun avis dans son HTML, alors que search.worldbank.org/api/v2
 * en renvoie des centaines de milliers en JSON.
 *
 * Une API est un contrat plus solide qu'une extraction HTML : elle ne casse
 * pas quand le site change de mise en page. On la prefere donc a chaque fois
 * qu'elle existe.
 *
 * Aucune requete reseau ici : la recuperation vit dans lib/run.ts.
 */

import { EntreeFlux, reparerCaracteres, retirerBalises, nettoyerLien } from "./rss";

/** "28-Aug-2026" ou "2026-09-16T00:00:00Z" -> "2026-09-16". */
function enIso(valeur: unknown): string | null {
  if (!valeur) return null;
  const texte = String(valeur).trim();
  const deja = /^(\d{4}-\d{2}-\d{2})/.exec(texte);
  if (deja) return deja[1];
  const d = new Date(texte);
  if (isNaN(d.getTime())) return null;
  return [d.getUTCFullYear(),
          String(d.getUTCMonth() + 1).padStart(2, "0"),
          String(d.getUTCDate()).padStart(2, "0")].join("-");
}

/**
 * Avis de marches des projets finances par la Banque mondiale.
 *
 * Reponse : { total, procnotices: [ { id, notice_type, noticedate,
 * submission_deadline_date, bid_description, project_name, project_id,
 * contact_organization, bid_reference_no, notice_text }, ... ] }
 *
 * Deux choix explicites :
 *
 * 1. On ecarte les "Contract Award". Ce sont des marches DEJA attribues :
 *    ils representent les trois quarts du flux Benin et n'offrent rien a
 *    soumissionner. TenderPilot sert a candidater, pas a lire un palmares.
 *
 * 2. On ignore notice_text, qui contient l'avis integral en HTML - jusqu'a
 *    65 ko pour un seul avis. Le resume est construit a partir des champs
 *    courts ; le texte complet reste a un clic, sur la page officielle.
 */
export function analyserWorldBank(corps: string): EntreeFlux[] {
  let donnees: unknown;
  try {
    donnees = JSON.parse(corps);
  } catch {
    // Une reponse illisible ne doit pas interrompre les autres sources.
    return [];
  }
  const avis = (donnees as { procnotices?: unknown })?.procnotices;
  if (!Array.isArray(avis)) return [];

  return avis.map((brut): EntreeFlux | null => {
    const a = brut as Record<string, unknown>;
    const type = String(a.notice_type ?? "").trim();
    if (/contract award/i.test(type)) return null;

    const titre = reparerCaracteres(retirerBalises(a.bid_description ?? ""));
    if (!titre) return null;

    const projet = reparerCaracteres(retirerBalises(a.project_name ?? ""));
    const acheteur = reparerCaracteres(retirerBalises(a.contact_organization ?? ""));
    const reference = String(a.bid_reference_no ?? "").trim();
    const methode = String(a.procurement_method_name ?? "").trim();
    const id = String(a.id ?? "").trim();

    const resume = [
      type && `Type : ${type}`,
      projet && `Projet : ${projet}`,
      a.project_id && `Identifiant projet : ${a.project_id}`,
      methode && `Mode de passation : ${methode}`,
      reference && `Reference : ${reference}`,
    ].filter(Boolean).join(" - ");

    return {
      titre,
      lien: id ? nettoyerLien(
        `https://projects.worldbank.org/en/projects-operations/procurement-detail/${id}`) : "",
      publie: enIso(a.noticedate),
      resume,
      deadline: enIso(a.submission_deadline_date),
      // L'acheteur reel figure dans l'avis : il vaut mieux que le nom de la
      // source, qui serait le meme pour les milliers d'avis du bailleur.
      organisation: acheteur || null,
      type: type || null,
    };
  }).filter((e): e is EntreeFlux => e !== null);
}

/**
 * Opportunites de subventions, bourses et appels a projets via l'API
 * publique de Fundpilote.
 *
 * Mesure du 2026-09-02, sans aucun identifiant :
 *   GET /api/v1/opportunities/  ->  200, count=283, 20 par page.
 *
 * ATTENTION, piege verifie ce jour-la. La reponse ANONYME ne contient PAS
 * application_url, source_url, description, eligibility, how_to_apply ni
 * editorial_note : ces champs n'existent que pour une session connectee.
 * L'analyseur d'origine construisait donc le lien avec deux chaines vides
 * et rendait des annonces SANS LIEN - un defaut muet, du meme genre que
 * l'analyseur AfDB absent cote web pendant des mois.
 *
 * Le lien est donc bati depuis l'id : /opportunities/<id> repond 200 et
 * redirige vers la page publique de l'annonce.
 *
 * Les champs descriptifs anonymes sont des codes opaques (GOU-11, ORG-ONGL,
 * PRO-01) : illisibles pour un lecteur, ils n'ont rien a faire dans un
 * resume. Seul eligible_countries, en ISO3, est exploitable - et il est
 * precieux, c'est lui qui dit si l'annonce concerne le Benin.
 */
export function analyserFundpilote(corps: string): EntreeFlux[] {
  let donnees: unknown;
  try {
    donnees = JSON.parse(corps);
  } catch {
    return [];
  }
  const resultats = (donnees as { results?: unknown })?.results;
  if (!Array.isArray(resultats)) return [];

  const TYPE_MAP: Record<string, string> = {
    grant: "Subvention",
    bourse: "Bourse",
    aap: "Appel a projets",
    ami: "AMI",
    formation: "Formation",
    fellowship: "Bourse",
    investment: "Investissement",
  };

  return resultats.map((brut): EntreeFlux | null => {
    const a = brut as Record<string, unknown>;
    const titre = String(a.title ?? "").trim();
    if (!titre) return null;

    // Les deux premieres n'existent que pour une session connectee ; l'id
    // est toujours la. On garde les deux au cas ou l'API changerait.
    const lien = nettoyerLien(
      String(a.application_url ?? "").trim()
      || String(a.source_url ?? "").trim()
      || (a.id ? `https://fundpilote.com/opportunities/${String(a.id)}` : ""),
    );
    if (!lien) return null;

    const devise = String(a.currency ?? "").trim();
    // Un minimum a zero n est pas une information : l API le pose par
    // defaut sur la moitie des annonces.
    const brutMin = a.amount_min ? String(a.amount_min) : "";
    const min = Number(brutMin) > 0 ? brutMin : "";
    const max = a.amount_max ? String(a.amount_max) : "";
    const montant = min && max ? `${min} - ${max} ${devise}`.trim()
      : max ? `jusqu'a ${max} ${devise}`.trim()
      : min ? `a partir de ${min} ${devise}`.trim() : "";

    const pays = Array.isArray(a.eligible_countries)
      ? (a.eligible_countries as unknown[]).map((c) => String(c).trim())
          .filter(Boolean).slice(0, 12)
      : [];

    const description = String(a.description ?? "").trim();
    const eligibilite = String(a.eligibility ?? "").trim();

    const resume = [
      description && description.slice(0, 200),
      eligibilite && `Eligibilite : ${eligibilite.slice(0, 120)}`,
      pays.length ? `Pays eligibles : ${pays.join(", ")}` : "",
      montant && `Budget : ${montant}`,
    ].filter(Boolean).join(" - ").slice(0, 500);

    const typeBrut = String(a.funding_type ?? "").trim();

    return {
      titre,
      lien,
      publie: null,
      resume,
      deadline: enIso(a.deadline),
      organisation: String(a.sponsor_name ?? "").trim() || null,
      type: TYPE_MAP[typeBrut] || typeBrut || null,
    };
  }).filter((e): e is EntreeFlux => e !== null);
}


/**
 * Appels et marches du portail europeen Funding & Tenders.
 *
 * MESURE DU 2026-09-02, sans authentification. L API accepte ses filtres a
 * UNE SEULE condition : un POST multipart dont chaque partie declare son
 * type de contenu. Les autres formes rendent 200 mais IGNORENT le filtre -
 * 4 175 120 resultats au lieu de 1 421 - et le GET rend 405. Une requete
 * sans type de contenu par partie rend 500.
 *
 * Trois familles utiles, une fois le bruit ecarte :
 *   type=1  Horizon Europe, 1 226 appels, echeances a venir
 *   type=2  EuropeAid, 24 appels - LA COOPERATION AU DEVELOPPEMENT, ou le
 *           Benin est pleinement eligible
 *   type=8  EIT, DIGITAL, Europe Creative, 171 appels
 *
 * type=0 est ecarte : ce sont les marches des institutions europeennes
 * elles-memes - fournitures de bureau a Bruxelles, personnel a Strasbourg -
 * sans rapport avec un soumissionnaire beninois.
 *
 * Statuts 31094501 (a venir) et 31094502 (ouvert). 31094503 est clos.
 */
export function analyserEuropa(corps: string): EntreeFlux[] {
  let donnees: unknown;
  try {
    donnees = JSON.parse(corps);
  } catch {
    return [];
  }
  const resultats = (donnees as { results?: unknown })?.results;
  if (!Array.isArray(resultats)) return [];

  return resultats.map((brut): EntreeFlux | null => {
    const x = brut as { metadata?: Record<string, unknown>; url?: unknown };
    const m = x.metadata ?? {};
    const prem = (cle: string): string => {
      const v = m[cle];
      return Array.isArray(v) ? String(v[0] ?? "").trim() : String(v ?? "").trim();
    };

    const titre = retirerBalises(reparerCaracteres(prem("title")));
    if (!titre) return null;

    const identifiant = prem("identifier");
    const lien = nettoyerLien(
      (Array.isArray(x.url) ? String(x.url[0] ?? "") : String(x.url ?? ""))
      || (identifiant
        ? "https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen"
          + "/opportunities/topic-details/" + encodeURIComponent(identifiant)
        : ""));
    if (!lien) return null;

    const programme = prem("frameworkProgramme") || prem("programmePeriod");
    const description = retirerBalises(reparerCaracteres(prem("description")));

    return {
      titre,
      lien,
      publie: enIso(prem("startDate")),
      resume: [identifiant && ("Reference : " + identifiant),
               programme && ("Programme : " + programme),
               description].filter(Boolean).join(" - ").slice(0, 500),
      deadline: enIso(prem("deadlineDate") || prem("closingDate")),
      organisation: "Commission europeenne",
      type: prem("type") === "2" ? "Appel a projets" : null,
    };
  }).filter((e): e is EntreeFlux => e !== null);
}

/**
 * Subventions federales americaines, via l API publique de Grants.gov.
 *
 * Mesure du 2026-09-02 : POST JSON simple, sans authentification, 1 034
 * subventions ouvertes dont 31 mentionnant l Afrique.
 *
 * ATTENTION, a dire au client. La plupart des subventions federales exigent
 * un enregistrement SAM.gov d entite americaine. Certaines - Departement d
 * Etat, USAID - acceptent les organisations etrangeres, mais l eligibilite
 * se verifie AVIS PAR AVIS. Ce n est pas un guichet ouvert.
 *
 * Les dates arrivent en MM/JJ/AAAA, pas en ISO.
 */
export function analyserGrantsGov(corps: string): EntreeFlux[] {
  let donnees: unknown;
  try {
    donnees = JSON.parse(corps);
  } catch {
    return [];
  }
  const data = (donnees as { data?: { oppHits?: unknown } })?.data;
  const avis = data?.oppHits;
  if (!Array.isArray(avis)) return [];

  // "11/17/2026" -> "2026-11-17". enIso passerait par new Date(), dont la
  // lecture des dates americaines depend de l environnement.
  const depuisUs = (v: unknown): string | null => {
    const t = String(v ?? "").trim();
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t);
    return m ? m[3] + "-" + m[1] + "-" + m[2] : enIso(t);
  };

  return avis.map((brut): EntreeFlux | null => {
    const o = brut as Record<string, unknown>;
    const titre = retirerBalises(reparerCaracteres(String(o.title ?? "").trim()));
    const numero = String(o.number ?? "").trim();
    if (!titre || !numero) return null;

    return {
      titre,
      lien: nettoyerLien(
        "https://www.grants.gov/search-results-detail/" + encodeURIComponent(String(o.id ?? ""))),
      publie: depuisUs(o.openDate),
      resume: ["Reference : " + numero,
               o.agencyCode && ("Agence : " + String(o.agencyCode)),
               "Eligibilite a verifier sur l avis officiel"]
        .filter(Boolean).join(" - ").slice(0, 500),
      deadline: depuisUs(o.closeDate),
      organisation: String(o.agencyCode ?? "").trim() || "Gouvernement des Etats-Unis",
      type: "Subvention",
    };
  }).filter((e): e is EntreeFlux => e !== null);
}


// --------------------------------------------------------- FORMES DE REQUETE

/**
 * Ce qu il faut envoyer quand un simple GET ne suffit pas.
 *
 * Deux sources sur cent six en ont besoin. Les autres n en declarent aucune
 * et restent en GET, sans changement.
 */
export interface RequeteJson {
  methode?: "GET" | "POST";
  entetes?: Record<string, string>;
  corps?: string;
  contentType?: string;
}

/**
 * Corps multipart, construit a la main.
 *
 * C EST LA LIGNE QUI DEBLOQUE TOUT, et elle merite son explication. Le
 * portail europeen n applique ses filtres que si CHAQUE PARTIE declare son
 * type de contenu. Une bibliotheque HTTP qui pose les parties sans
 * Content-Type obtient un 500 ; une requete en parametre d URL ou en corps
 * JSON obtient un 200 trompeur, filtre ignore.
 *
 * Ecrit a la main plutot que confie a une bibliotheque pour une seconde
 * raison, decisive ici : Apps Script ne sait pas typer les parties d un
 * multipart via UrlFetchApp. Une chaine construite nous-memes tourne a
 * l identique dans les deux moteurs.
 */
export function corpsMultipart(
  champs: readonly [string, string][], frontiere: string,
): string {
  let corps = "";
  for (const [cle, valeur] of champs) {
    corps += "--" + frontiere + "\r\n"
      + 'Content-Disposition: form-data; name="' + cle + '"\r\n'
      + "Content-Type: application/json\r\n\r\n"
      + valeur + "\r\n";
  }
  return corps + "--" + frontiere + "--\r\n";
}

/** Frontiere fixe : rien dans les donnees envoyees ne peut la contenir. */
export const FRONTIERE_MULTIPART = "----TenderPilotFrontiere";

/**
 * Requete du portail europeen.
 *
 * type 1, 2 et 8 : Horizon Europe, EuropeAid et les programmes thematiques.
 * type 0 est ecarte - marches internes des institutions europeennes.
 * status 31094501 et 31094502 : a venir et ouvert. 31094503 est clos.
 */
function requeteEuropa(): RequeteJson {
  const filtre = {
    bool: {
      must: [
        { terms: { type: ["1", "2", "8"] } },
        { terms: { status: ["31094501", "31094502"] } },
        // Ecarte les echeances passees des le serveur : 2324 -> 2314, et
        // surtout une reponse plus legere pour Apps Script.
        { range: { deadlineDate: { gte: "now" } } },
      ],
    },
  };
  return {
    methode: "POST",
    contentType: "multipart/form-data; boundary=" + FRONTIERE_MULTIPART,
    corps: corpsMultipart([
      ["query", JSON.stringify(filtre)],
      ["languages", JSON.stringify(["en", "fr"])],
      // DECROISSANT, et ce n est pas un caprice. Un appel en deux etapes
      // porte PLUSIEURS echeances, et le tri croissant retient la plus
      // ancienne - souvent passee. Mesure du 2026-09-02 : croissant rend 0
      // echeance a venir sur 100, decroissant en rend 92.
      //
      // La contrepartie est assumee : on voit d abord les echeances les plus
      // lointaines. Le filtre d entree du moteur ecarte de toute facon ce
      // qui reste d expire.
      ["sort", JSON.stringify({ field: "deadlineDate", order: "DESC" })],
    ], FRONTIERE_MULTIPART),
  };
}

/** Requete de Grants.gov : un corps JSON ordinaire. */
function requeteGrantsGov(): RequeteJson {
  return {
    methode: "POST",
    contentType: "application/json",
    corps: JSON.stringify({ rows: 100, keyword: "", oppStatuses: "posted" }),
  };
}

export const REQUETES_JSON: Record<string, () => RequeteJson> = {
  "ec.europa.eu": requeteEuropa,
  "grants.gov": requeteGrantsGov,
};

/** Forme de requete d une methode "JSON:<nom>", ou undefined pour un GET. */
export function requeteJson(methode: string): RequeteJson | undefined {
  const m = /^JSON:(.+)$/i.exec(String(methode ?? "").trim());
  if (!m) return undefined;
  const fabrique = REQUETES_JSON[m[1].trim()];
  return fabrique ? fabrique() : undefined;
}

/** Analyseurs disponibles, par nom de methode "JSON:<nom>". */
export const ANALYSEURS_JSON: Record<string, (corps: string) => EntreeFlux[]> = {
  "worldbank.org": analyserWorldBank,
  "fundpilote.com": analyserFundpilote,
  "ec.europa.eu": analyserEuropa,
  "grants.gov": analyserGrantsGov,
};

/** Retourne l'analyseur d'une methode "JSON:<nom>", ou null. */
export function analyseurJson(methode: string): ((corps: string) => EntreeFlux[]) | null {
  const m = /^JSON:(.+)$/i.exec(methode.trim());
  return m ? (ANALYSEURS_JSON[m[1].trim()] ?? null) : null;
}
