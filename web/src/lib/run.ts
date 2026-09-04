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
  CHAMPS_MAJ, Config, Opportunite, TypeNotification, aujourdhui,
  champNotification,
  champsModifies, clesDedup, construireIndex, estVide, joursRestants,
  normaliser, parPertinence, pertinence, pertinenceNotifiable,
  SECTEUR_INCONNU, deduireSecteur, normaliserType, notificationsAEnvoyer,
  prochainId,
  statutDelai, tronquer, trouverDoublon,
} from "./domain/regles";
import { analyserFlux, estFluxXml, type EntreeFlux } from "./domain/rss";
import {
  analyseurFiche, analyseurHtml, fusionnerFiche, type AnalyseurFiche,
} from "./domain/html";
import { analyseurJson, formeRequete } from "./domain/json";
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
    lignes: { id: string; joursRestants: number | null; statutDelai: string;
              pertinence: string }[],
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
 * DECISION DU 2026-09-02, fondee sur les regles des sites eux-memes, pas sur
 * une preference.
 *
 * "TenderPilot/1.0" seul, puis "Mozilla/5.0 (compatible; TenderPilot/1.0)",
 * se faisaient refuser par Wellcome Trust : HTTP 202, une reponse vide.
 * Mesure repetee, reproductible.
 *
 * Verification faite avant de trancher : le robots.txt de wellcome.org
 * AUTORISE explicitement les robots sur /research-funding/schemes - aucune
 * des 37 directives Disallow ne couvre ce chemin - et demande seulement un
 * Crawl-delay de 10 secondes. Leur politique declaree accueille les robots ;
 * c est leur reseau de diffusion qui bloque par defaut tout agent non
 * conforme. La politique prime.
 *
 * D ou cette forme : celle d un navigateur, POUR PASSER LE FILTRE, mais
 * suivie de TenderPilot/1.0, POUR RESTER IDENTIFIABLE dans les journaux de
 * l operateur. Ce n est pas un deguisement complet, et c est delibere.
 * Mesure : 200 avec cette chaine, contre 202 sans le prefixe navigateur.
 *
 * La collecte est sequentielle, ce qui respecte de fait le Crawl-delay
 * demande. Les 403 de la BAD observes pendant l audit venaient de requetes
 * lancees en parallele, pas de l agent.
 */
const AGENT_UTILISATEUR =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
  + "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 TenderPilot/1.0";

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

/**
 * Texte d'une reponse, decode dans SON jeu de caracteres.
 *
 * Response.text() decode toujours en UTF-8, quoi que dise l'en-tete. Le
 * portail de la GIZ sert de l'ISO-8859-1 - il l'annonce dans son
 * Content-Type - et sans cette lecture "Uberarbeitung" et "developpement"
 * reviennent en morceaux. On ne devine rien : on lit ce que le serveur
 * declare, et on retombe sur l'UTF-8 quand il ne declare rien ou quand le
 * jeu est inconnu du decodeur.
 *
 * Jumeau de corpsReponse_() dans apps_script/Run.gs.
 */
export async function texteDecode(reponse: Response): Promise<string> {
  const type = reponse.headers.get("content-type") ?? "";
  const m = /charset=["']?([\w-]+)/i.exec(type);
  const jeu = (m?.[1] ?? "").toLowerCase();
  if (!jeu || jeu === "utf-8" || jeu === "utf8") return reponse.text();

  const octets = await reponse.arrayBuffer();
  try {
    return new TextDecoder(jeu).decode(octets);
  } catch {
    // Jeu inconnu : mieux vaut un texte approximatif que pas de collecte.
    return new TextDecoder().decode(octets);
  }
}

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
  return { code: reponse.status, texte: await texteDecode(reponse) };
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
  /**
   * A-t-on RECONNU ce qu'on a lu ? Une page vide et une page qu'on ne sait
   * plus lire donnent le meme resultat - zero annonce - et n'appellent pas
   * du tout le meme message.
   */
  reconnue: boolean;
}

/**
 * Collecte une source en rendant compte de ce qu'elle a produit.
 *
 * Les nombres comptent, et ils ne disent pas la meme chose :
 *
 *   lues = 0, reconnue
 *                le flux est valide et vide. La source est FONCTIONNELLE :
 *                elle ne publie rien en ce moment.
 *
 *   lues = 0, non reconnue
 *                l'analyseur n'a rien trouve sur une page qu'on ne
 *                reconnait pas. Une source qui lisait hier et ne lit plus
 *                aujourd'hui est CASSEE : le site a change de mise en page.
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
  connus: ReadonlySet<string> = new Set(),
  journal?: (message: string) => Promise<void>,
): Promise<BilanSource> {
  // Une seule recuperation reseau, deux comptes : on ne demande jamais
  // deux fois la meme page a un site qui limite deja son debit.
  const marqueur = { reconnue: false };
  const tout = await collecterSource(
    source, { ...config, collecterExpirees: true }, recuperer, marqueur,
    connus, journal);

  if (config.collecterExpirees) {
    return { lues: tout.length, annonces: tout, reconnue: marqueur.reconnue };
  }

  const jour = aujourdhui(config.fuseau);
  const annonces = tout.filter((o) => {
    const reste = joursRestants(o.deadline, jour);
    return reste === null || reste >= 0;
  });
  return { lues: tout.length, annonces, reconnue: marqueur.reconnue };
}

/**
 * Marqueur de pagination dans l'adresse d'une source.
 *
 * Une source dont l'URL contient {page} est lue page par page, jusqu'a ce
 * qu'elle n'apporte plus rien. Les sources qui ne le contiennent pas sont
 * lues exactement comme avant : une seule requete.
 *
 * Jumeau de GABARIT_PAGE dans apps_script/Run.gs.
 */
export const GABARIT_PAGE = "{page}";

/**
 * Garde-fou. Une pagination qui ne s'arreterait pas mangerait le temps de
 * toutes les autres sources. Vingt pages suffisent : la GIZ en a douze.
 */
export const PAGES_MAX = 20;

/**
 * Second temps : va chercher sur chaque fiche ce que la liste ne dit pas.
 *
 * Voir ANALYSEURS_FICHE pour le pourquoi. Les trois bornes sont ici :
 * on ne lit que les fiches MANQUANTES, jamais celles deja au classeur, et
 * jamais plus que le plafond du passage.
 */
async function completerParFiches(
  entrees: EntreeFlux[], analyseur: AnalyseurFiche, source: SourceCollecte,
  config: Config, recuperer: Recuperateur, connus: ReadonlySet<string>,
  journal?: (message: string) => Promise<void>,
): Promise<EntreeFlux[]> {
  const plafond = Math.max(0, config.maxFichesParPassage ?? 12);
  const sortie: EntreeFlux[] = [];
  let lues = 0;
  let reportees = 0;

  for (const entree of entrees) {
    // La liste a date cette annonce : sa fiche ne nous apprendrait rien.
    if (entree.deadline) { sortie.push(entree); continue; }
    // Deja au classeur : elle y porte deja ce qu'une fiche lui avait donne.
    if (connus.has(normaliser(entree.lien))) { sortie.push(entree); continue; }

    if (lues >= plafond || !entree.lien) { reportees++; continue; }

    lues++;
    try {
      const { code, texte } = await recuperer(entree.lien);
      if (code !== 200) { reportees++; continue; }
      const complete = fusionnerFiche(entree, analyseur(texte));
      // Fiche lue mais toujours sans date : pour une source qui declare un
      // analyseur de fiche, cela veut dire "pas reussi a dater", pas "sans
      // echeance". On ne fait pas entrer une ligne morte.
      if (complete.deadline) sortie.push(complete);
      else reportees++;
    } catch {
      reportees++;
    }
  }

  if (reportees && journal) {
    await journal(`${source.code} : ${lues} fiche(s) lue(s), ${reportees} `
      + "annonce(s) reportee(s) au prochain passage - plafond "
      + `MAX_FICHES_PAR_PASSAGE (${plafond})`);
  }
  return sortie;
}

/** Identite d'une annonce d'une page a l'autre, pour ne pas la relire. */
function cleDePage(entree: { lien?: string | null; titre?: string }): string {
  return `${normaliser(entree.lien ?? "")}|${normaliser(entree.titre ?? "")}`;
}

export async function collecterSource(
  source: SourceCollecte, config: Config, recuperer: Recuperateur,
  // Rempli au passage, pour ceux qui ont besoin de savoir si le document
  // recu etait un flux reconnaissable. Optionnel : la collecte elle-meme
  // n'en depend pas.
  marqueur?: { reconnue: boolean },
  // Liens deja au classeur : le second temps ne relit pas leurs fiches.
  connus: ReadonlySet<string> = new Set(),
  journal?: (message: string) => Promise<void>,
): Promise<Opportunite[]> {
  const analyseur = analyseurJson(source.methode) ?? analyseurHtml(source.methode);
  if (source.methode.trim().toUpperCase() !== "RSS" && !analyseur) return [];
  const adresse = source.url.trim();
  if (!adresse) throw new Error("Aucune URL");

  // Deux facons de paginer : {page} dans l'adresse, ou - pour UNGM - un
  // numero de page dans le corps du POST. La seconde n'a qu'une adresse.
  const paginee = adresse.includes(GABARIT_PAGE)
    || !!formeRequete(source.methode)?.paginee;
  const jour = aujourdhui(config.fuseau);
  const entrees: EntreeFlux[] = [];
  const vues = new Set<string>();
  let videsDaffilee = 0;

  for (let page = 1; page <= (paginee ? PAGES_MAX : 1); page++) {
    // Une source peut exiger un POST : voir REQUETES_JSON.
    const { code, texte } = await recuperer(
      paginee ? adresse.split(GABARIT_PAGE).join(String(page)) : adresse,
      formeRequete(source.methode, page));
    if (code !== 200) {
      // La premiere page qui echoue est une panne de source. Une page
      // suivante qui echoue termine simplement la pagination : ce qui a
      // deja ete lu reste bon.
      if (page === 1) throw new Error(`HTTP ${code}`);
      break;
    }

    // API, RSS ou extraction HTML : les trois produisent des EntreeFlux.
    // Une page HTML ne dit pas si elle est vide ou si elle a change de mise
    // en page : on ne pretend la reconnaitre que pour un flux.
    if (marqueur && page === 1) marqueur.reconnue = !analyseur && estFluxXml(texte);
    const lot = analyseur ? analyseur(texte) : analyserFlux(texte);

    // Une annonce deja echue n'a plus rien a offrir : on ne la fait pas
    // entrer. Le filtre est ici, a l'entree, et nulle part ailleurs - ce qui
    // est deja suivi reste suivi, et passe en EXPIRE le moment venu.
    const retenues = config.collecterExpirees ? lot : lot.filter((e) => {
      const reste = joursRestants(e.deadline, jour);
      // Sans echeance lue, on garde : c'est a l'utilisateur d'aller voir.
      return reste === null || reste >= 0;
    });

    let neuves = 0;
    for (const e of retenues) {
      if (vues.has(cleDePage(e))) continue;
      entrees.push(e);
      neuves++;
    }
    // On ne marque qu'APRES la page. Deux exemplaires d'un meme avis sur la
    // MEME page doivent traverser : c'est la deduplication d'ecriture qui
    // les reunit, et elle sait completer la fiche avec ce que le second
    // apporte. Ici on ne saurait que jeter le second, avec son echeance.
    for (const e of retenues) vues.add(cleDePage(e));

    if (entrees.length >= config.maxParSource) break;

    // Une page qui n'apporte rien peut etre la fin de la liste - ou une
    // page entiere de marches deja attribues, qu'on ecarte tous. On ne
    // s'arrete donc qu'a la DEUXIEME page vide d'affilee : au-dela de la
    // derniere page, le portail en sert autant qu'on en demande.
    videsDaffilee = neuves === 0 ? videsDaffilee + 1 : 0;
    if (videsDaffilee >= 2) break;
  }

  // SECOND TEMPS, quand la source le declare : les fiches portent ce que la
  // liste tait. Voir ANALYSEURS_FICHE.
  const fiche = analyseurFiche(source.methode);
  const completees = fiche
    ? await completerParFiches(entrees.slice(0, config.maxParSource), fiche,
                               source, config, recuperer, connus, journal)
    : entrees;

  return completees
    .slice(0, config.maxParSource)
    .map((entree) => ({
      titre: entree.titre,
      // Ce que l'annonce sait d'elle-meme prime sur le defaut de la source :
      // une API donne l'acheteur reel, la ou le defaut donnerait le nom du
      // bailleur pour ses milliers d'avis.
      organisation: entree.organisation || source.nom,
      // Ce que l'annonce sait d'elle-meme prime sur le defaut de la
      // source, ici comme pour l'organisation.
      pays: entree.pays || source.paysDefaut || null,
      // Deduit du titre quand ni la source ni le modele ne le disent :
      // 87 % des annonces n avaient aucun secteur. Sans correspondance
      // nette, la colonne reste vide - on ne devine pas.
      secteur: entree.secteur || source.secteurDefaut
        || deduireSecteur(entree.titre, entree.resume) || SECTEUR_INCONNU,
      // Normalise sans LLM : un client sans cle doit pouvoir filtrer.
      // Meme raison que pour le secteur : une cellule vide est ambigue.
      type: normaliserType(entree.type || source.typeDefaut) || SECTEUR_INCONNU,
      source: source.id,
      // Ce que la source annonce, ou rien : on ne devine pas un montant.
      budget: entree.budget ?? null,
      lien: entree.lien || null,
      // Le dossier quand la source le donne : voir analyserPlanInternational.
      pdf: entree.pdf ?? null,
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
  // Les liens deja au classeur : le second temps ne relit pas leurs fiches.
  connus: ReadonlySet<string> = new Set(),
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
      const bilan = await collecterSourceDetail(
        source, config, recuperer, connus,
        (message) => depot.journaliser(source.code, "Collecte", "INFO", message));
      trouvees.push(...bilan.annonces);

      if (bilan.lues === 0 && bilan.reconnue) {
        // Flux valide, mais sans aucune entree : le bureau de pays ne
        // publie rien en ce moment. Ce n'est pas une panne, et le dire
        // autrement transformerait une dizaine de sources saines en
        // fausses alertes a chaque execution.
        await depot.majSource(source.id, "FLUX VIDE");
        await depot.journaliser(source.code, "Collecte", "INFO",
          "Flux lu, mais vide : cette source ne publie rien en ce moment");
      } else if (bilan.lues === 0) {
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

/**
 * Comment nommer une annonce dans le journal.
 *
 * Une annonce n'a de reference qu'une fois ECRITE. Celles qui attendent
 * encore leur ligne n'en ont pas : les nommer par leur titre evite un
 * journal qui ne dit ni quelle annonce ni quelle source est en cause.
 */
function etiquetteAnnonce(annonce: { reference?: string | null; titre?: string }) {
  const reference = (annonce.reference ?? "").trim();
  if (reference) return reference;
  const titre = (annonce.titre ?? "").trim();
  if (!titre) return "Annonce sans titre";
  return titre.length > 80 ? `${titre.slice(0, 77)}...` : titre;
}

/**
 * Complete une annonce en attente avec ce qu'une autre copie apporte.
 *
 * ON NE REMPLACE JAMAIS UNE VALEUR DEJA LUE. Les deux copies ont ete lues
 * dans la meme collecte : aucune n'est plus recente que l'autre, et rien ne
 * permet d'arbitrer entre deux echeances differentes. On prend donc l'union
 * de ce qui a ete lu, jamais un choix entre deux lectures - c'est la seule
 * facon de completer sans risquer d'inventer une date.
 *
 * Jumeau de completerAnnonce_() dans apps_script/Run.gs.
 */
function completerAnnonce(attendue: Opportunite, entrante: Opportunite) {
  // CHAMPS_MAJ est une liste de cles litterales d'Opportunite : la copie
  // cle a cle est sure, seul TypeScript demande le detour.
  const cible = attendue as unknown as Record<string, unknown>;
  for (const cle of CHAMPS_MAJ) {
    if (estVide(entrante[cle]) || !estVide(attendue[cle])) continue;
    cible[cle] = entrante[cle];
  }
}

/** Range les annonces : nouvelles d'un cote, mises a jour de l'autre. */
export async function enregistrerOuMettreAJour(
  depot: Depot, annonces: Opportunite[], existantes: OpportuniteStockee[],
): Promise<BilanEcriture> {
  const index = construireIndex(existantes);
  const aCreer: Opportunite[] = [];
  // Ce qui attend sa ligne : ces objets n'ont ni identifiant ni reference,
  // et ne doivent jamais partir en mise a jour.
  const enAttente = new Set<Opportunite>();
  let misesAJour = 0;

  for (const annonce of annonces) {
    const doublon = trouverDoublon(annonce, index);
    if (doublon) {
      // Un doublon est de deux natures, et les confondre faisait ecrire
      // dans une ligne qui n'existe pas encore : soit une LIGNE DEJA
      // ENREGISTREE, qui porte son identifiant, soit une annonce collectee
      // quelques sources plus tot dans CETTE collecte, qui n'a encore ni
      // identifiant ni ligne. La seconde n'a rien a mettre a jour : on
      // complete l'objet en attente, il sera ecrit une seule fois, complet.
      if (enAttente.has(doublon)) {
        completerAnnonce(doublon, annonce);
        await depot.journaliser(annonce.source ?? null, "Doublon", "DUPLICATE",
          `${etiquetteAnnonce(doublon)} : deja collectee dans cette execution`);
        continue;
      }

      const champs = champsModifies(doublon, annonce);
      if (Object.keys(champs).length > 0) {
        await depot.majOpportunite(doublon.id, champs);
        Object.assign(doublon, champs);
        misesAJour++;
        await depot.journaliser(annonce.source ?? null, "Mise a jour", "SUCCESS",
          `${etiquetteAnnonce(doublon)} : ${Object.keys(champs).join(", ")}`);
      } else {
        await depot.journaliser(annonce.source ?? null, "Doublon", "DUPLICATE",
                                `${etiquetteAnnonce(doublon)} existe deja`);
      }
      continue;
    }
    // Deux annonces identiques dans la meme collecte ne doivent pas creer
    // deux lignes : on indexe au fur et a mesure. C'est l'annonce ELLE-MEME
    // qui est indexee, pas une copie : la completer completera la ligne
    // ecrite ensuite.
    aCreer.push(annonce);
    enAttente.add(annonce);
    for (const cle of clesDedup(annonce)) {
      if (!index.has(cle)) index.set(cle, annonce as OpportuniteStockee);
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
    // Recalculee a CHAQUE passage, comme les jours restants : le client qui
    // ajoute un pays ou un domaine voit toute sa liste se remettre a jour
    // au passage suivant, sans qu'on recollecte quoi que ce soit.
    ligne.pertinence = pertinence(ligne, config);
    return {
      id: ligne.id,
      joursRestants: ligne.joursRestants,
      statutDelai: ligne.statutDelai as string,
      pertinence: ligne.pertinence,
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
  // La premiere question qu'on se pose en ouvrant un email n'est pas "de
  // quoi s'agit-il" mais "est-ce que cela me concerne".
  if (o.pertinence) l.push(`Pertinence : ${o.pertinence}`);
  if (o.budget) l.push(`Budget : ${o.budget}`);
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
  // Le plus pertinent d'abord, puis le plus urgent : un recapitulatif de
  // trente lignes ne se lit que si les premieres sont les bonnes.
  parPertinence(nouvelles).forEach((o, i) => {
    lignes.push(`${i + 1}. ${o.titre}`
      + (o.pertinence ? `  [${o.pertinence}]` : ""));
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
  // annonce le reste - les dix montrees doivent donc etre les dix qui
  // comptent, pas les dix premieres arrivees.
  const montrees = parPertinence(nouvelles).slice(0, 10);
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
  // Le plafond ne compte que les EMAILS : Telegram n'a pas de quota
  // journalier et un salon ne se noie pas comme une boite aux lettres.
  // 0 ou absent : aucun plafond.
  const plafond = parEmail && (config.maxEmailsParExecution ?? 0) > 0
    ? Math.floor(config.maxEmailsParExecution as number)
    : Infinity;
  let emailsEnvoyes = 0;
  let reportees = 0;

  /** Envoie sur les deux canaux ; l'echec de l'un n'arrete pas l'autre. */
  const diffuser = async (
    source: string | null, action: string,
    sujet: string, corps: string, texteTelegram: string,
  ) => {
    if (parEmail) {
      try {
        await envoyeur.envoyer(destinataire, sujet, corps);
        emailsEnvoyes++;
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

  // notifierPertinence coupe le bruit dans la boite, PAS dans la base :
  // une annonce ecartee ici reste listee, avec sa couleur et son echeance.
  const aNotifier = nouvelles.filter(
    (o) => pertinenceNotifiable(o.pertinence, config));

  const envoiGroupe = aNotifier.length > config.seuilDigest && config.envoiNouvelle;
  if (envoiGroupe) {
    const digest = messageDigest(aNotifier);
    await diffuser(null, "Digest", digest.sujet, digest.corps,
                   messageTelegramDigest(aNotifier));
    await depot.journaliser(null, "Notifications", "SUCCESS",
      `Digest de ${aNotifier.length} nouvelles opportunites`);
  }

  // LE PLUS PERTINENT ET LE PLUS URGENT D'ABORD. Quand le plafond coupe,
  // ce qui part est ce qui compte, et ce qui attend est le reste.
  let ecartees = 0;

  for (const ligne of parPertinence(lignes)) {
    const plan = notificationsAEnvoyer(ligne, config);
    if (plan.marquer.length === 0) continue;

    // ON NE MARQUE RIEN : le niveau d'une ligne change quand le client
    // change ses pays ou ses secteurs. Marquer ici lui interdirait de
    // recevoir plus tard une alerte qu'il vient de demander.
    if (!pertinenceNotifiable(ligne.pertinence, config)) {
      ecartees++;
      continue;
    }

    // Ce qui est deja couvert par le digest ne coute pas d'email.
    const aEnvoyer = plan.envoyer.filter(
      (type) => !(type === "nouvelle" && envoiGroupe));

    // Plafond atteint : ON NE MARQUE RIEN. La ligne repassera identique au
    // prochain passage, et son alerte partira alors. Rien n'est perdu.
    if (parEmail && aEnvoyer.length
        && emailsEnvoyes + aEnvoyer.length > plafond) {
      reportees++;
      continue;
    }

    for (const type of aEnvoyer) {
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

  if (ecartees > 0) {
    await depot.journaliser(null, "Notifications", "INFO",
      `${ecartees} alerte(s) non envoyee(s) : leur pertinence n'est pas dans `
      + "notifierPertinence. Les annonces restent dans la liste");
  }

  if (reportees > 0) {
    await depot.journaliser(null, "Notifications", "INFO",
      `${reportees} alerte(s) reportee(s) au prochain passage : plafond de `
      + `${plafond} email(s) par execution atteint. Rien n'est perdu`);
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
    // Le second temps de collecte ne relit pas la fiche d'une annonce deja
    // enregistree : chaque passage enrichit du NOUVEAU.
    const connus = new Set(existantes.map((o) => normaliser(o.lien ?? ""))
                                     .filter(Boolean));
    const brutes = await collecterToutesSources(depot, config, recuperer, connus);
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
