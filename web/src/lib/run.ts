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
  normaliserType, notificationsAEnvoyer, prochainId, statutDelai, tronquer,
  trouverDoublon,
} from "./domain/regles";
import { analyserFlux } from "./domain/rss";
import { analyseurHtml } from "./domain/html";
import { analyseurJson, requeteJson } from "./domain/json";
import { appliquerPreferences, type Preferences } from "./domain/llm";
import type { Classeur } from "./llm";

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
/**
 * Agent utilisateur.
 *
 * MESURE DU 2026-09-02. "TenderPilot/1.0" seul faisait refuser Wellcome
 * Trust - HTTP 202, une reponse vide servie aux clients non reconnus. La
 * meme URL rend 200 avec la forme ci-dessous.
 *
 * Le prefixe Mozilla/5.0 n est pas un deguisement : la chaine annonce
 * clairement un robot et ce qu il fait. Beaucoup de reseaux de diffusion
 * refusent par defaut tout client dont l agent ne commence pas ainsi, meme
 * sur des pages publiques. On s identifie donc, sans se faire passer pour un
 * navigateur - un agent de navigateur complet fonctionnait aussi, il a ete
 * ecarte.
 */
const AGENT_UTILISATEUR =
  "Mozilla/5.0 (compatible; TenderPilot/1.0; veille d'appels d'offres et de financements)";

/**
 * Forme de requete d une source, quand un GET ne suffit pas.
 *
 * Ajoute pour le portail europeen Funding & Tenders, dont l API n accepte
 * ses filtres qu en POST multipart avec un type de contenu declare PAR
 * PARTIE. Mesure du 2026-09-02 : la meme requete en parametre d URL ou en
 * corps JSON rend 200 mais IGNORE le filtre - 4,17 millions de resultats au
 * lieu de 1 421. En GET, elle rend 405.
 *
 * Les 104 sources existantes n en declarent aucune et restent en GET.
 */
export interface RequeteSource {
  methode?: "GET" | "POST";
  entetes?: Record<string, string>;
  corps?: string;
  contentType?: string;
}

export type Recuperateur =
  (url: string, requete?: RequeteSource) => Promise<{ code: number; texte: string }>;

export const recuperateurReel: Recuperateur = async (url, requete) => {
  const entetes: Record<string, string> = {
    "User-Agent": AGENT_UTILISATEUR,
    Accept: "application/rss+xml, application/xml, text/xml, */*",
    ...(requete?.entetes ?? {}),
  };
  if (requete?.contentType) entetes["Content-Type"] = requete.contentType;

  const reponse = await fetch(url, {
    method: requete?.methode ?? "GET",
    headers: entetes,
    body: requete?.corps,
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
export interface BilanSource {
  /** Annonces que l'analyseur a su lire sur la page. */
  lues: number;
  /** Celles qui restent apres le retrait des echeances passees. */
  annonces: Opportunite[];
}

/**
 * Collecte une source en rendant compte de ce qu'elle a produit.
 *
 * Les deux nombres comptent, et ils ne disent pas la meme chose :
 *
 *   lues = 0     l'analyseur n'a rien trouve sur la page. Une source qui
 *                lisait hier et ne lit plus aujourd'hui est CASSEE : le
 *                site a change de mise en page.
 *
 *   lues > 0, annonces = 0
 *                la page est lue correctement, mais aucune echeance n'est
 *                encore ouverte. La source est FONCTIONNELLE, simplement
 *                silencieuse - les portails publient par a-coups, et un
 *                organisme peut ne rien passer pendant des mois.
 *
 * Confondre les deux ferait desactiver des sources qui vont republier.
 */
export async function collecterSourceDetail(
  source: SourceCollecte, config: Config, recuperer: Recuperateur,
): Promise<BilanSource> {
  // Une seule recuperation reseau, deux comptes : on ne demande jamais
  // deux fois la meme page a un site qui limite deja son debit.
  const tout = await collecterSource(
    source, { ...config, collecterExpirees: true }, recuperer);

  if (config.collecterExpirees) return { lues: tout.length, annonces: tout };

  const jour = aujourdhui(config.fuseau);
  const annonces = tout.filter((o) => {
    const reste = joursRestants(o.deadline, jour);
    return reste === null || reste >= 0;
  });
  return { lues: tout.length, annonces };
}

export async function collecterSource(
  source: SourceCollecte, config: Config, recuperer: Recuperateur,
): Promise<Opportunite[]> {
  const analyseur = analyseurJson(source.methode) ?? analyseurHtml(source.methode);
  if (source.methode.trim().toUpperCase() !== "RSS" && !analyseur) return [];
  if (!source.url.trim()) throw new Error("Aucune URL");

  // Une source peut exiger un POST : voir REQUETES_JSON.
  const { code, texte } = await recuperer(source.url.trim(),
                                          requeteJson(source.methode));
  if (code !== 200) throw new Error(`HTTP ${code}`);

  // API, RSS ou extraction HTML : les trois produisent des EntreeFlux.
  const entrees = analyseur ? analyseur(texte) : analyserFlux(texte);

  // Une annonce deja echue n'a plus rien a offrir : on ne la fait pas
  // entrer. Le filtre est ici, a l'entree, et nulle part ailleurs - ce qui
  // est deja suivi reste suivi, et passe en EXPIRE le moment venu.
  const jour = aujourdhui(config.fuseau);
  const retenues = config.collecterExpirees ? entrees : entrees.filter((e) => {
    const reste = joursRestants(e.deadline, jour);
    // Sans echeance lue, on garde : c'est a l'utilisateur d'aller voir.
    return reste === null || reste >= 0;
  });

  return retenues
    .slice(0, config.maxParSource)
    .map((entree) => ({
      titre: entree.titre,
      // Ce que l'annonce sait d'elle-meme prime sur le defaut de la source :
      // une API donne l'acheteur reel, la ou le defaut donnerait le nom du
      // bailleur pour ses milliers d'avis.
      organisation: entree.organisation || source.nom,
      pays: source.paysDefaut ?? null,
      secteur: source.secteurDefaut ?? null,
      // Normalise sans LLM : un client sans cle doit pouvoir filtrer.
      type: normaliserType(entree.type || source.typeDefaut) || null,
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
      const bilan = await collecterSourceDetail(source, config, recuperer);
      trouvees.push(...bilan.annonces);

      if (bilan.lues === 0) {
        // L'analyseur n'a rien trouve sur la page. Une source qui lisait
        // hier et ne lit plus aujourd'hui a change de mise en page.
        await depot.majSource(source.id, "RIEN LU");
        await depot.journaliser(source.code, "Collecte", "INFO",
          "Aucune annonce lue : la page a peut-etre change de structure");
      } else if (bilan.annonces.length === 0) {
        // Page lue correctement, mais rien d'ouvert. Les portails publient
        // par a-coups : ce n'est pas une panne, c'est une periode creuse.
        await depot.majSource(source.id, "EN ATTENTE");
        await depot.journaliser(source.code, "Collecte", "INFO",
          `${bilan.lues} annonce(s) lue(s), aucune encore ouverte`);
      } else {
        await depot.majSource(source.id, "OK");
        await depot.journaliser(source.code, "Collecte", "SUCCESS",
          `${bilan.annonces.length} annonce(s) retenue(s) sur ${bilan.lues}`);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await depot.majSource(source.id, "ERREUR");
      await depot.journaliser(source.code, "Collecte", "ERROR", message);
    }
  }
  return trouvees;
}

// ------------------------------------------------------------- classement --

/**
 * Fait juger les annonces nouvelles par le modele, quand il est configure.
 *
 * DEUX PRECAUTIONS PORTENT TOUT LE RESTE.
 *
 * On ne soumet que le NOUVEAU. Ce qui est deja suivi a deja son jugement ;
 * le renvoyer a chaque passage triplerait la facture du client sans rien
 * apprendre. En regime courant cela fait un ou deux appels par collecte, la
 * ou tout soumettre en ferait neuf.
 *
 * On n en perd aucune. Sans classeur, sans cle, en cas de panne du
 * fournisseur, les annonces traversent intactes. appliquerPreferences ne
 * retire que ce que le modele a EXPLICITEMENT juge non pertinent : une
 * annonce sans jugement reste. Le doute profite toujours a l annonce.
 */
export async function classerNouvelles(
  depot: Depot, annonces: Opportunite[], existantes: OpportuniteStockee[],
  classeur?: Classeur, prefs: Preferences = {},
): Promise<Opportunite[]> {
  if (!classeur) return annonces;

  const index = construireIndex(existantes);
  const nouvelles = annonces.filter((a) => !trouverDoublon(a, index));
  if (!nouvelles.length) return annonces;

  const dejaVues = new Set(nouvelles);
  const jugees = await classeur.classer(nouvelles);
  const gardees = appliquerPreferences(jugees, prefs);
  const ecartees = jugees.length - gardees.length;

  await depot.journaliser(null, "Classement", "SUCCESS",
    `${nouvelles.length} annonce(s) jugee(s) en ${classeur.appels()} appel(s), `
    + `${ecartees} ecartee(s)`);

  // Les annonces deja connues repassent telles quelles : elles ne sont ni
  // jugees ni filtrees, leur ligne existe et ne doit pas disparaitre.
  return [...annonces.filter((a) => !dejaVues.has(a)), ...gardees];
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
  classeur?: Classeur,
): Promise<Resume> {
  const config = await depot.lireConfig();
  try {
    const existantes = await depot.lireOpportunites();
    const brutes = await collecterToutesSources(depot, config, recuperer);
    // Le classement s intercale ici : apres la collecte, avant l ecriture.
    // Une annonce ecartee ne doit jamais atteindre le classeur du client.
    const annonces = await classerNouvelles(
      depot, brutes, existantes, classeur, config.preferences);
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
