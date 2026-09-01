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

/** Analyseurs disponibles, par nom de methode "JSON:<nom>". */
export const ANALYSEURS_JSON: Record<string, (corps: string) => EntreeFlux[]> = {
  "worldbank.org": analyserWorldBank,
};

/** Retourne l'analyseur d'une methode "JSON:<nom>", ou null. */
export function analyseurJson(methode: string): ((corps: string) => EntreeFlux[]) | null {
  const m = /^JSON:(.+)$/i.exec(methode.trim());
  return m ? (ANALYSEURS_JSON[m[1].trim()] ?? null) : null;
}
