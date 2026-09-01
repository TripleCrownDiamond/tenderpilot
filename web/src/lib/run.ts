/**
 * TenderPilot - moteur de collecte.
 *
 *   SOURCES -> COLLECTE -> NORMALISATION -> DEDUPLICATION -> BASE
 *           -> DEADLINES -> NOTIFICATIONS
 *
 * Port de apps_script/Run.gs, deja verifie sur les huit scenarios du
 * cahier des charges.
 *
 * Ce fichier ne connait ni Prisma ni fetch : tout passe par les interfaces
 * Depot, Envoyeur et Recuperateur. C'est ce qui permet de le tester sans
 * base de donnees ni reseau, exactement comme la version Sheets.
 */

import {
  Config, Opportunite, TypeNotification, aujourdhui, champNotification,
  champsModifies, clesDedup, construireIndex, joursRestants,
  notificationsAEnvoyer, prochainId, statutDelai, tronquer, trouverDoublon,
} from "./domain/regles";
import { analyserFlux } from "./domain/rss";
import { analyseurHtml } from "./domain/html";
import { analyseurJson } from "./domain/json";

export interface SourceCollecte {
  id: string;
  code: string;
  nom: string;
  methode: string;
  url: string;
  paysDefaut?: string | null;
  secteurDefaut?: string | null;
  typeDefaut?: string | null;
  active: boolean;
}

export interface OpportuniteStockee extends Opportunite {
  id: string;
  reference: string;
  sourceId?: string | null;
}

export type NiveauJournal =
  | "SUCCESS" | "ERROR" | "SKIPPED" | "DUPLICATE" | "INFO";

/** Tout ce que le moteur a besoin de savoir faire sur les donnees. */
export interface Depot {
  lireConfig(): Promise<Config>;
  lireSources(): Promise<SourceCollecte[]>;
  lireOpportunites(): Promise<OpportuniteStockee[]>;
  creerOpportunites(nouvelles: Opportunite[]): Promise<OpportuniteStockee[]>;
  majOpportunite(id: string, champs: Partial<Opportunite>): Promise<void>;
  majDelais(
    lignes: { id: string; joursRestants: number | null; statutDelai: string }[],
  ): Promise<void>;
  marquerNotifications(id: string, cles: TypeNotification[]): Promise<void>;
  majSource(id: string, statut: string): Promise<void>;
  journaliser(
    source: string | null, action: string, statut: NiveauJournal,
    message: string,
  ): Promise<void>;
}

export interface Envoyeur {
  envoyer(destinataire: string, sujet: string, corps: string): Promise<void>;
}

/**
 * Second canal : Telegram.
 *
 * Volontairement separe d'Envoyeur plutot que de reutiliser son interface :
 * un message Telegram n'a ni destinataire ni objet. Le destinataire est le
 * salon configure une fois pour toutes, et il n'y a qu'un seul bloc de
 * texte. Faire passer Telegram pour un Envoyeur obligerait a inventer un
 * sujet, puis a le recoller au corps a l'arrivee.
 */
export interface Messager {
  publier(texte: string): Promise<void>;
}

/** Recuperation reseau, isolee pour pouvoir etre remplacee dans les tests. */
export type Recuperateur =
  (url: string) => Promise<{ code: number; texte: string }>;

export const recuperateurReel: Recuperateur = async (url) => {
  const reponse = await fetch(url, {
    headers: {
      "User-Agent": "TenderPilot/1.0",
      Accept: "application/rss+xml, application/xml, text/xml, */*",
    },
    // Une source lente ne doit pas bloquer toute la collecte.
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  return { code: reponse.status, texte: await reponse.text() };
};

// --------------------------------------------------------------- collecte --

/**
 * Lit une source et renvoie ses annonces normalisees.
 *
 * Trois methodes sont supportees, de la plus solide a la plus fragile :
 *
 *   JSON:<nom>  une API publique. Contrat stable, champs structures.
 *   RSS         un flux standard. Stable, mais texte libre et pauvre.
 *   HTML:<nom>  une extraction de page. A n'utiliser qu'a defaut : casse
 *               le jour ou le site refait sa mise en page.
 *
 * Une source MANUAL est ignoree, c'est un choix explicite : on ne se bat pas
 * contre les sites qui exigent un login, un captcha ou un navigateur pilote.
 */
export async function collecterSource(
  source: SourceCollecte, config: Config, recuperer: Recuperateur,
): Promise<Opportunite[]> {
  const analyseur = analyseurJson(source.methode) ?? analyseurHtml(source.methode);
  if (source.methode.trim().toUpperCase() !== "RSS" && !analyseur) return [];
  if (!source.url.trim()) throw new Error("Aucune URL");

  const { code, texte } = await recuperer(source.url.trim());
  if (code !== 200) throw new Error(`HTTP ${code}`);

  // API, RSS ou extraction HTML : les trois produisent des EntreeFlux.
  const entrees = analyseur ? analyseur(texte) : analyserFlux(texte);

  return entrees
    .slice(0, config.maxParSource)
    .map((entree) => ({
      titre: entree.titre,
      // Ce que l'annonce sait d'elle-meme prime sur le defaut de la source :
      // une API donne l'acheteur reel, la ou le defaut donnerait le nom du
      // bailleur pour ses milliers d'avis.
      organisation: entree.organisation || source.nom,
      pays: source.paysDefaut ?? null,
      secteur: source.secteurDefaut ?? null,
      type: entree.type || source.typeDefaut || null,
      source: source.id,
      lien: entree.lien || null,
      pdf: null,
      datePublication: entree.publie,
      deadline: entree.deadline,
      resume: tronquer(entree.resume),
    }))
    .filter((o) => o.titre);
}

/**
 * Parcourt toutes les sources actives.
 * Chaque source est isolee : une panne est journalisee et la suivante est
 * traitee normalement.
 */
export async function collecterToutesSources(
  depot: Depot, config: Config, recuperer: Recuperateur,
): Promise<Opportunite[]> {
  const sources = await depot.lireSources();
  const trouvees: Opportunite[] = [];

  for (const source of sources) {
    if (!source.active) {
      await depot.journaliser(source.code, "Collecte", "SKIPPED",
                              "Source desactivee");
      continue;
    }
    try {
      const annonces = await collecterSource(source, config, recuperer);
      trouvees.push(...annonces);
      await depot.majSource(source.id, "OK");
      await depot.journaliser(source.code, "Collecte", "SUCCESS",
                              `${annonces.length} annonce(s) lue(s)`);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await depot.majSource(source.id, "ERREUR");
      await depot.journaliser(source.code, "Collecte", "ERROR", message);
    }
  }
  return trouvees;
}

// ------------------------------------------------ deduplication + ecriture --

export interface BilanEcriture {
  nouvelles: OpportuniteStockee[];
  misesAJour: number;
}

/** Range les annonces : nouvelles d'un cote, mises a jour de l'autre. */
export async function enregistrerOuMettreAJour(
  depot: Depot, annonces: Opportunite[], existantes: OpportuniteStockee[],
): Promise<BilanEcriture> {
  const index = construireIndex(existantes);
  const aCreer: Opportunite[] = [];
  let misesAJour = 0;

  for (const annonce of annonces) {
    const doublon = trouverDoublon(annonce, index);
    if (doublon) {
      const champs = champsModifies(doublon, annonce);
      if (Object.keys(champs).length > 0) {
        await depot.majOpportunite(doublon.id, champs);
        Object.assign(doublon, champs);
        misesAJour++;
        await depot.journaliser(annonce.source ?? null, "Mise a jour", "SUCCESS",
          `${doublon.reference} : ${Object.keys(champs).join(", ")}`);
      } else {
        await depot.journaliser(annonce.source ?? null, "Doublon", "DUPLICATE",
                                `${doublon.reference} existe deja`);
      }
      continue;
    }
    // Deux annonces identiques dans la meme collecte ne doivent pas creer
    // deux lignes : on indexe au fur et a mesure.
    aCreer.push(annonce);
    const provisoire = { ...annonce, id: "", reference: "" } as OpportuniteStockee;
    for (const cle of clesDedup(annonce)) {
      if (!index.has(cle)) index.set(cle, provisoire);
    }
  }

  const nouvelles = aCreer.length ? await depot.creerOpportunites(aCreer) : [];
  return { nouvelles, misesAJour };
}

/** Reference lisible attribuee a une nouvelle opportunite. */
export function referenceSuivante(existantes: { reference?: string | null }[]) {
  return prochainId(existantes.map((o) => ({ id: o.reference ?? undefined })));
}

// -------------------------------------------------------------- deadlines --

/** Recalcule jours restants et statut, meme sans nouvelle opportunite. */
export async function majDeadlines(
  depot: Depot, lignes: OpportuniteStockee[], config: Config,
): Promise<number> {
  const jourCourant = aujourdhui(config.fuseau);
  const majs = lignes.map((ligne) => {
    ligne.joursRestants = joursRestants(ligne.deadline, jourCourant);
    ligne.statutDelai = statutDelai(ligne.joursRestants);
    return {
      id: ligne.id,
      joursRestants: ligne.joursRestants,
      statutDelai: ligne.statutDelai as string,
    };
  });
  if (majs.length) await depot.majDelais(majs);
  return majs.length;
}

// --------------------------------------------------------------- courriels --

const RAPPEL = "Consultez toujours la source officielle avant de candidater.";

function detail(o: Opportunite): string {
  const l: string[] = [`Titre : ${o.titre}`];
  if (o.organisation) l.push(`Organisation : ${o.organisation}`);
  if (o.pays) l.push(`Pays : ${o.pays}`);
  if (o.type) l.push(`Type : ${o.type}`);
  if (o.secteur) l.push(`Secteur : ${o.secteur}`);
  if (o.datePublication) l.push(`Date de publication : ${o.datePublication}`);
  l.push(`Deadline : ${o.deadline || "a verifier"}`);
  l.push(`Jours restants : ${o.joursRestants ?? "inconnu"}`);
  if (o.lien) l.push(`Lien officiel : ${o.lien}`);
  if (o.resume) l.push("", "Resume :", o.resume);
  return l.join("\n");
}

export function messageNotification(
  type: TypeNotification, o: Opportunite,
): { sujet: string; corps: string } {
  switch (type) {
    case "nouvelle":
      return {
        sujet: `[TenderPilot] Nouvelle opportunite - ${o.organisation ?? "source"}`
          + ` - ${o.titre}`,
        corps: `Nouvelle opportunite detectee.\n\n${detail(o)}\n\n${RAPPEL}`,
      };
    case "j7":
      return {
        sujet: `[TenderPilot] Deadline dans 7 jours - ${o.titre}`,
        corps: "Cette opportunite arrive bientot a echeance.\n\n"
          + `${detail(o)}\n\n${RAPPEL}`,
      };
    case "j3":
      return {
        sujet: `[TenderPilot] URGENT - ${o.joursRestants} jours restants`
          + ` - ${o.titre}`,
        corps: `Il ne reste que ${o.joursRestants} jour(s).\n\n`
          + `${detail(o)}\n\n${RAPPEL}`,
      };
    case "j1":
      return {
        sujet: `[TenderPilot] DERNIER RAPPEL - Deadline demain - ${o.titre}`,
        corps: `Dernier rappel avant echeance.\n\n${detail(o)}\n\n${RAPPEL}`,
      };
    default:
      return {
        sujet: `[TenderPilot] Opportunite expiree - ${o.titre}`,
        corps: `La deadline est passee.\n\nTitre : ${o.titre}\n`
          + `Deadline : ${o.deadline}`,
      };
  }
}

/** Email unique quand la collecte rapporte beaucoup. */
export function messageDigest(
  nouvelles: Opportunite[],
): { sujet: string; corps: string } {
  const lignes = [`Nouvelles opportunites detectees : ${nouvelles.length}`, ""];
  nouvelles.forEach((o, i) => {
    lignes.push(`${i + 1}. ${o.titre}`);
    lignes.push(`   Organisation : ${o.organisation ?? "-"} | Pays : `
      + `${o.pays ?? "-"} | Deadline : ${o.deadline || "a verifier"}`);
    if (o.lien) lignes.push(`   ${o.lien}`);
    lignes.push("");
  });
  lignes.push(RAPPEL);
  return {
    sujet: `[TenderPilot] ${nouvelles.length} nouvelles opportunites detectees`,
    corps: lignes.join("\n"),
  };
}

// ---------------------------------------------------------------- Telegram --

/**
 * Telegram interprete le HTML : un titre contenant "<" ou "&" casserait le
 * message, ou pire, serait interprete comme du balisage.
 */
function echapper(texte: unknown): string {
  return String(texte ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const ENTETES: Record<TypeNotification, string> = {
  nouvelle: "Nouvelle opportunite",
  j7: "Echeance dans 7 jours",
  j3: "URGENT - echeance proche",
  j1: "DERNIER RAPPEL - echeance demain",
  expire: "Opportunite expiree",
};

/**
 * Message Telegram pour une opportunite.
 *
 * Beaucoup plus court que l'email, et c'est voulu : on le lit sur un
 * telephone, souvent debout. Le titre, l'echeance, le lien. Le detail est
 * a un clic, sur la source officielle.
 */
export function messageTelegram(
  type: TypeNotification, o: Opportunite,
): string {
  const lignes = [`<b>${echapper(ENTETES[type])}</b>`, echapper(o.titre)];

  const infos: string[] = [];
  if (o.organisation) infos.push(echapper(o.organisation));
  if (o.pays) infos.push(echapper(o.pays));
  if (infos.length) lignes.push(infos.join(" - "));

  if (o.deadline) {
    const reste = o.joursRestants;
    const compte = reste === null || reste === undefined ? ""
      : reste < 0 ? " (passee)"
      : reste === 0 ? " (aujourd'hui)"
      : ` (dans ${reste} jour${reste > 1 ? "s" : ""})`;
    lignes.push(`Echeance : ${echapper(o.deadline)}${compte}`);
  } else {
    lignes.push("Echeance : a verifier sur la source");
  }

  if (o.lien) lignes.push(echapper(o.lien));
  return lignes.join("\n");
}

/** Message groupe, quand la collecte rapporte beaucoup d'un coup. */
export function messageTelegramDigest(nouvelles: Opportunite[]): string {
  const lignes = [
    `<b>${nouvelles.length} nouvelles opportunites</b>`,
    "",
  ];
  // Un message Telegram est plafonne a 4096 caracteres : au-dela d'une
  // dizaine de lignes, l'envoi echouerait. On liste les premieres et on
  // annonce le reste.
  const montrees = nouvelles.slice(0, 10);
  montrees.forEach((o, i) => {
    const echeance = o.deadline ? ` - ${echapper(o.deadline)}` : "";
    lignes.push(`${i + 1}. ${echapper(o.titre)}${echeance}`);
  });
  if (nouvelles.length > montrees.length) {
    lignes.push("", `... et ${nouvelles.length - montrees.length} autres.`);
  }
  return lignes.join("\n");
}

/**
 * Envoie ce qui doit l'etre et marque ce qui est desormais sans objet.
 *
 * Une opportunite ne recoit jamais deux fois le meme type de notification.
 * Les deux canaux - email et Telegram - partagent donc les memes regles de
 * declenchement, mais sont envoyes independamment : si Telegram est en
 * panne, les emails partent quand meme, et l'inverse est vrai aussi.
 *
 * Le comptage retourne le nombre de MESSAGES partis, tous canaux confondus.
 * Une alerte envoyee par email et par Telegram compte donc pour deux.
 */
export async function envoyerNotifications(
  depot: Depot, envoyeur: Envoyeur, lignes: OpportuniteStockee[],
  config: Config, nouvelles: OpportuniteStockee[],
  messager?: Messager,
): Promise<number> {
  const destinataire = config.emailNotification.trim();
  const parEmail = destinataire !== "";
  const parTelegram = Boolean(
    messager && config.envoiTelegram
    && config.telegramToken.trim() && config.telegramChatId.trim());

  if (!parEmail && !parTelegram) {
    await depot.journaliser(null, "Notifications", "SKIPPED",
                            "Aucun canal configure");
    return 0;
  }

  let envoyes = 0;

  /** Envoie sur les deux canaux ; l'echec de l'un n'arrete pas l'autre. */
  const diffuser = async (
    source: string | null, action: string,
    sujet: string, corps: string, texteTelegram: string,
  ) => {
    if (parEmail) {
      try {
        await envoyeur.envoyer(destinataire, sujet, corps);
        envoyes++;
      } catch (e) {
        await depot.journaliser(source, `${action} (email)`, "ERROR",
          e instanceof Error ? e.message : String(e));
      }
    }
    if (parTelegram) {
      try {
        await messager!.publier(texteTelegram);
        envoyes++;
      } catch (e) {
        await depot.journaliser(source, `${action} (Telegram)`, "ERROR",
          e instanceof Error ? e.message : String(e));
      }
    }
  };

  const envoiGroupe = nouvelles.length > config.seuilDigest && config.envoiNouvelle;
  if (envoiGroupe) {
    const digest = messageDigest(nouvelles);
    await diffuser(null, "Digest", digest.sujet, digest.corps,
                   messageTelegramDigest(nouvelles));
    await depot.journaliser(null, "Notifications", "SUCCESS",
      `Digest de ${nouvelles.length} nouvelles opportunites`);
  }

  for (const ligne of lignes) {
    const plan = notificationsAEnvoyer(ligne, config);
    if (plan.marquer.length === 0) continue;

    for (const type of plan.envoyer) {
      // Deja couvert par le digest : on marque sans renvoyer.
      if (type === "nouvelle" && envoiGroupe) continue;
      const message = messageNotification(type, ligne);
      await diffuser(ligne.source ?? null, `Notification ${type}`,
                     message.sujet, message.corps,
                     messageTelegram(type, ligne));
    }
    for (const cle of plan.marquer) {
      (ligne as unknown as Record<string, unknown>)[champNotification(cle) as string] = true;
    }
    await depot.marquerNotifications(ligne.id, plan.marquer);
  }
  return envoyes;
}

// --------------------------------------------------------------- execution --

export interface Resume {
  nouvelles: number;
  misesAJour: number;
  suivies: number;
  emails: number;
}

/** Point d'entree unique : le cron et le bouton manuel appellent celui-ci. */
export async function executer(
  depot: Depot, envoyeur: Envoyeur,
  recuperer: Recuperateur = recuperateurReel,
  messager?: Messager,
): Promise<Resume> {
  const config = await depot.lireConfig();
  try {
    const existantes = await depot.lireOpportunites();
    const annonces = await collecterToutesSources(depot, config, recuperer);
    const bilan = await enregistrerOuMettreAJour(depot, annonces, existantes);

    const toutes = [...existantes, ...bilan.nouvelles];
    const suivies = await majDeadlines(depot, toutes, config);
    const emails = await envoyerNotifications(
      depot, envoyeur, toutes, config, bilan.nouvelles, messager);

    const resume: Resume = {
      nouvelles: bilan.nouvelles.length,
      misesAJour: bilan.misesAJour,
      suivies,
      emails,
    };
    await depot.journaliser(null, "Execution", "SUCCESS",
      `${resume.nouvelles} nouvelle(s), ${resume.misesAJour} mise(s) a jour, `
      + `${resume.suivies} suivie(s), ${resume.emails} notification(s)`);
    return resume;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await depot.journaliser(null, "Execution", "ERROR", message);
    throw e;
  }
}
