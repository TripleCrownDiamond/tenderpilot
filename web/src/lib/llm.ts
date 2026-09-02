/**
 * TenderPilot - appel du modele de langage.
 *
 * Calque de telegram.ts : aucune regle metier ici. Quoi demander et comment
 * relire la reponse est decide dans domain/llm.ts, testable hors reseau. Ce
 * fichier ne fait que poster et rendre le texte.
 *
 * UNE REGLE PRIME SUR TOUTES LES AUTRES : le modele ne doit jamais casser la
 * collecte. Cle absente, quota atteint, API en panne, reponse illisible - les
 * annonces traversent alors sans classement, et le produit se comporte
 * exactement comme avant que cette fonctionnalite existe. Un client dont le
 * fournisseur est en panne doit recevoir ses appels d offres, pas une erreur.
 *
 * La cle n apparait que dans l en-tete ou l URL de l appel. Elle n est jamais
 * journalisee ni renvoyee dans un message d erreur - meme regle que le jeton
 * Telegram, et pour la meme raison : c est le compte du client qui paie.
 */

import {
  llmActif, urlRequete, entetesRequete, corpsRequete, lireReponse,
  extraireJson, invitePourClassement, appliquerClassement, enLots,
  phraseZone, type ConfigLlm,
} from "./domain/llm";

/** Ce que le moteur attend d un classeur, quel qu il soit. */
export interface Classeur {
  /**
   * Rend les entrees enrichies. En cas d echec, rend les entrees d origine :
   * ne jamais lever, ne jamais perdre une annonce.
   */
  classer<T extends {
    titre: string;
    deadline?: string | null; resume?: string | null; publie?: string | null;
    type?: string | null; secteur?: string | null;
    pertinent?: boolean; opportunite?: boolean;
  }>(entrees: readonly T[]): Promise<T[]>;
  /** Appels reellement effectues, pour la journalisation. */
  appels(): number;
}

/** Au-dela, on abandonne le lot plutot que de bloquer la collecte. */
const DELAI_MS = 30000;

/**
 * Cree le classeur.
 *
 * Le plafond est compte PAR EXECUTION, pas par jour : le moteur web est
 * sans memoire d une invocation a l autre. Le classeur Apps Script, lui,
 * tient un vrai compteur quotidien dans les proprietes du script - c est la
 * seule difference assumee entre les deux moteurs.
 */
export function classeurLlm(config: ConfigLlm, poster: typeof fetch = fetch): Classeur {
  let faits = 0;

  async function unLot(invite: string): Promise<unknown> {
    const reponse = await poster(urlRequete(config), {
      method: "POST",
      headers: entetesRequete(config),
      body: JSON.stringify(corpsRequete(config, invite)),
      signal: AbortSignal.timeout(DELAI_MS),
    });
    if (!reponse.ok) {
      // Le corps porte la cause utile (modele inconnu, quota depasse). Il ne
      // contient pas la cle : elle voyage en en-tete.
      let cause = "";
      try {
        cause = " - " + (await reponse.text()).slice(0, 200);
      } catch {
        // Reponse illisible : le code HTTP suffira.
      }
      throw new Error(`LLM HTTP ${reponse.status}${cause}`);
    }
    return extraireJson(lireReponse(config.dialecte, await reponse.text()));
  }

  return {
    appels: () => faits,

    async classer(entrees) {
      if (!llmActif(config) || !entrees.length) return [...entrees];

      const zone = phraseZone(config.paysCibles, config.accepterMondial ?? true);
      const sortie: typeof entrees[number][] = [];

      for (const lot of enLots(entrees, config.tailleLot)) {
        if (faits >= config.maxAppelsJour) {
          // Plafond atteint : le reste passe sans classement plutot que de
          // faire exploser la facture du client.
          sortie.push(...lot);
          continue;
        }
        try {
          faits += 1;
          sortie.push(...appliquerClassement(lot,
            await unLot(invitePourClassement(lot, zone))));
        } catch {
          // Un lot perdu ne fait perdre aucune annonce : elles sortent
          // telles quelles, sans verdict. Le doute profite a l annonce.
          sortie.push(...lot);
        }
      }
      return sortie;
    },
  };
}

/**
 * Verifie qu une cle et un modele repondent.
 *
 * A appeler au moment du reglage, pas a chaque collecte : c est la que le
 * client peut encore corriger une faute de frappe. Rend un message lisible
 * plutot que de lever, parce que la reponse va a un ecran.
 */
export async function verifierLlm(
  config: ConfigLlm, poster: typeof fetch = fetch,
): Promise<{ ok: boolean; message: string }> {
  if (!llmActif(config)) {
    return { ok: false, message: "Cle, modele ou adresse manquants." };
  }
  const essai: Array<{
    titre: string; resume?: string | null; deadline?: string | null;
    type?: string | null; secteur?: string | null;
  }> = [{
    titre: "Avis d appel d offres pour la fourniture de materiel informatique",
    resume: "", deadline: null,
  }];
  try {
    const classeur = classeurLlm(config, poster);
    const [sortie] = await classeur.classer(essai);
    if (!sortie.type && !sortie.secteur) {
      return { ok: false, message: "Le modele a repondu, mais sans classement lisible." };
    }
    return {
      ok: true,
      message: `Reponse recue : type ${sortie.type ?? "-"}, secteur ${sortie.secteur ?? "-"}.`,
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}
