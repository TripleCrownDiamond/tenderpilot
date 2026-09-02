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

/** Analyseurs disponibles, par nom de methode "JSON:<nom>". */
export const ANALYSEURS_JSON: Record<string, (corps: string) => EntreeFlux[]> = {
  "worldbank.org": analyserWorldBank,
  "fundpilote.com": analyserFundpilote,
};

/** Retourne l'analyseur d'une methode "JSON:<nom>", ou null. */
export function analyseurJson(methode: string): ((corps: string) => EntreeFlux[]) | null {
  const m = /^JSON:(.+)$/i.exec(methode.trim());
  return m ? (ANALYSEURS_JSON[m[1].trim()] ?? null) : null;
}
