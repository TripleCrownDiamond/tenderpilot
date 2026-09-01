/**
 * TenderPilot - envoi des notifications Telegram.
 *
 * Second canal, a cote des emails. Un email se perd dans une boite deja
 * pleine ; une notification Telegram arrive sur le telephone, et pour une
 * echeance a 24 heures cela change tout.
 *
 * Ce fichier ne contient aucune regle metier : quoi envoyer et quand est
 * decide dans lib/run.ts, exactement comme pour les emails. Ici on ne fait
 * que poster le texte deja redige.
 */

import type { Messager } from "./run";

const API = "https://api.telegram.org";

/** Reponse de l'API Telegram, reduite a ce qu'on en lit. */
interface ReponseTelegram {
  ok?: boolean;
  description?: string;
  error_code?: number;
}

/**
 * Limite d'un message Telegram.
 *
 * Au-dela, l'API repond 400 et le message est entierement perdu. On coupe
 * donc nous-memes : mieux vaut une alerte tronquee qu'une alerte jamais
 * arrivee.
 */
const LONGUEUR_MAX = 4096;

function tronquerMessage(texte: string): string {
  if (texte.length <= LONGUEUR_MAX) return texte;
  return texte.slice(0, LONGUEUR_MAX - 20).trimEnd() + "\n[...]";
}

/**
 * Cree le canal Telegram.
 *
 * Le jeton n'apparait que dans l'URL de l'appel : il n'est jamais journalise
 * ni renvoye dans un message d'erreur. Un jeton de bot dans les journaux,
 * c'est quelqu'un qui peut ecrire a votre place.
 */
export function envoyeurTelegram(
  token: string,
  chatId: string,
  poster: typeof fetch = fetch,
): Messager {
  return {
    async publier(texte: string): Promise<void> {
      const reponse = await poster(`${API}/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: tronquerMessage(texte),
          parse_mode: "HTML",
          // L'apercu du lien officiel aide a reconnaitre l'avis d'un coup
          // d'oeil : on le laisse.
          disable_web_page_preview: false,
        }),
        // Une API lente ne doit pas bloquer toute l'execution.
        signal: AbortSignal.timeout(15000),
      });

      if (!reponse.ok) {
        // Le corps porte la vraie cause ("chat not found", "bot was
        // blocked"...). Sans lui, un 400 ne dit rien d'exploitable.
        let cause = "";
        try {
          const corps = await reponse.json() as ReponseTelegram;
          cause = corps.description ? ` - ${corps.description}` : "";
        } catch {
          // Reponse illisible : le code HTTP suffira.
        }
        throw new Error(`Telegram HTTP ${reponse.status}${cause}`);
      }
    },
  };
}

/**
 * Verifie qu'un bot et un salon sont joignables.
 *
 * A appeler au moment de la configuration, pas a chaque collecte : c'est
 * la que l'utilisateur peut encore corriger une faute de frappe. Renvoie un
 * message lisible plutot que de lever une exception, parce que la reponse
 * est destinee a un ecran.
 */
export async function verifierTelegram(
  token: string, chatId: string, poster: typeof fetch = fetch,
): Promise<{ ok: boolean; message: string }> {
  if (!token.trim() || !chatId.trim()) {
    return { ok: false, message: "Jeton ou identifiant de salon manquant." };
  }
  try {
    const canal = envoyeurTelegram(token, chatId, poster);
    await canal.publier(
      "<b>TenderPilot</b>\nCanal Telegram configure. "
      + "Vous recevrez ici les alertes d'echeance.");
    return { ok: true, message: "Message de test envoye." };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : String(e),
    };
  }
}
