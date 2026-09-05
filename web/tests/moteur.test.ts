/**
 * TenderPilot web - tests du moteur de collecte.
 *
 * Le vrai moteur est execute. Seuls la base, le courrier et le reseau sont
 * remplaces : ce sont les trois choses qui exigeraient une infrastructure.
 * La logique testee ici est celle qui sera deployee.
 *
 *     npx tsx --test tests/moteur.test.ts
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  ajouterCanal, Canal, canauxNotifies, dejaNotifie, estSuivie,
  CONFIG_DEFAUT, Config, Opportunite, TypeNotification, champNotification,
  construireIndex, inventaireProfil, listeConfig, parDelai,
  parPertinence, pertinence, pertinenceNotifiable, PROFIL_TYPE_PAYS,
  PERTINENCES, PERTINENCE_A_VOIR, PERTINENCE_HORS_PROFIL,
  PERTINENCE_POSSIBLE, PERTINENCE_PRIORITAIRE,
  trouverDoublon,
  normaliserType,
  deduireSecteur,
  SECTEUR_INCONNU,
} from "../src/lib/domain/regles";
import {
  Depot, Envoyeur, Messager, NotificationPush, OpportuniteStockee, Pousseur,
  Recuperateur, SourceCollecte,
  enregistrerOuMettreAJour, executer, referenceSuivante,
} from "../src/lib/run";
import { analyserFlux, estFluxXml } from "../src/lib/domain/rss";

function jourRelatif(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/** "2026-09-15" devient "15/09/2026", la forme trouvee dans les annonces. */
function enFrancais(iso: string): string {
  const [a, m, j] = iso.split("-");
  return `${j}/${m}/${a}`;
}

function fluxRss(entrees: { titre: string; lien: string; texte?: string }[]) {
  return '<?xml version="1.0"?><rss version="2.0"><channel>'
    + entrees.map((e) =>
        `<item><title>${e.titre}</title><link>${e.lien}</link>`
        + `<description>${e.texte ?? ""}</description></item>`).join("")
    + "</channel></rss>";
}

interface Monde {
  depot: Depot;
  envoyeur: Envoyeur;
  recuperer: Recuperateur;
  opportunites: OpportuniteStockee[];
  journal: { source: string | null; action: string; statut: string;
             message: string }[];
  boite: { sujet: string; corps: string }[];
  /** Ce que Telegram a recu : le second canal, compte a part. */
  salon: string[];
  messager: Messager;
  /** Ce que le canal push a recu, compte a part lui aussi. */
  pousses: NotificationPush[];
  pousseur: Pousseur;
  sources: SourceCollecte[];
  /** La configuration vivante : la modifier change le passage suivant. */
  config: Config;
}

function monde(options: {
  sources?: SourceCollecte[];
  flux?: Record<string, string | number>;
  config?: Partial<Config>;
  /** Opportunites deja en base : pour tester ce qui expire APRES etre entre. */
  opportunites?: OpportuniteStockee[];
} = {}): Monde {
  const opportunites: OpportuniteStockee[] = [...(options.opportunites ?? [])];
  const journal: Monde["journal"] = [];
  const boite: Monde["boite"] = [];
  const salon: string[] = [];
  const pousses: NotificationPush[] = [];
  const sources = options.sources ?? [];
  const flux = options.flux ?? {};
  const config: Config = {
    ...CONFIG_DEFAUT, emailNotification: "veille@example.org", ...options.config,
  };

  let compteur = 0;

  const depot: Depot = {
    async lireConfig() { return config; },
    async lireSources() { return sources; },
    // Le depot Prisma reconstruit des objets a chaque lecture : on copie.
    async lireOpportunites() { return opportunites.map((o) => ({ ...o })); },
    async creerOpportunites(nouvelles: Opportunite[]) {
      return nouvelles.map((n) => {
        const stockee: OpportuniteStockee = {
          ...n,
          id: `id-${++compteur}`,
          reference: referenceSuivante(opportunites),
        };
        opportunites.push(stockee);
        return stockee;
      });
    },
    async majOpportunite(id, champs) {
      const cible = opportunites.find((o) => o.id === id);
      // Prisma refuse une mise a jour sur un identifiant inconnu (P2025).
      // Le faux depot doit refuser pareil : sans cela il absorbe en silence
      // une ecriture dans une ligne qui n'existe pas encore, exactement le
      // defaut mesure le 2026-09-02 cote Sheets.
      if (!cible) {
        throw new Error(`majOpportunite : aucune opportunite "${id}"`);
      }
      Object.assign(cible, champs);
    },
    async majDelais(lignes) {
      for (const l of lignes) {
        const cible = opportunites.find((o) => o.id === l.id);
        if (cible) {
          cible.joursRestants = l.joursRestants;
          cible.statutDelai = l.statutDelai as OpportuniteStockee["statutDelai"];
          cible.pertinence = l.pertinence;
        }
      }
    },
    // Le banc doit marquer COMME LA VRAIE BASE : par canal, en cumulant.
    // Un faux qui ecrirait `true` masquerait exactement le defaut qu'on
    // cherche a empecher - une alerte renvoyee sur un canal deja servi.
    async marquerNotifications(id, cles: TypeNotification[], canal: Canal) {
      const cible = opportunites.find((o) => o.id === id);
      if (!cible) throw new Error(`marquerNotifications : ${id} inconnue`);
      for (const cle of cles) {
        const champ = champNotification(cle) as string;
        const dossier = cible as unknown as Record<string, unknown>;
        dossier[champ] = ajouterCanal(dossier[champ], canal);
      }
    },
    async majSource(id, statut) {
      const s = sources.find((x) => x.id === id);
      if (s) (s as unknown as Record<string, unknown>).statut = statut;
    },
    async journaliser(source, action, statut, message) {
      journal.push({ source, action, statut, message });
    },
  };

  const envoyeur: Envoyeur = {
    async envoyer(_destinataire, sujet, corps) { boite.push({ sujet, corps }); },
  };

  const recuperer: Recuperateur = async (url) => {
    const reponse = flux[url];
    if (reponse === undefined) throw new Error("reseau injoignable");
    if (typeof reponse === "number") return { code: reponse, texte: "" };
    return { code: 200, texte: reponse };
  };

  const messager: Messager = {
    async publier(texte: string) { salon.push(texte); },
  };
  const pousseur: Pousseur = {
    async pousser(n) { pousses.push(n); },
  };

  return { depot, envoyeur, recuperer, opportunites, journal, boite, salon,
           messager, pousses, pousseur, sources, config };
}

function source(id: string, url: string, extra: Partial<SourceCollecte> = {}) {
  return {
    id, code: `SRC-${id}`, nom: `Source ${id}`, methode: "RSS", url,
    paysDefaut: "Benin", secteurDefaut: "Digital",
    typeDefaut: "Appel d'offres", active: true, ...extra,
  } as SourceCollecte;
}

// ==========================================================================

test("nouvelle opportunite : une ligne creee et un email", async () => {
  const url = "https://example.org/f1";
  const m = monde({
    sources: [source("s1", url)],
    flux: { [url]: fluxRss([{ titre: "Plateforme de suivi",
      lien: "https://example.org/a1",
      texte: `Date limite : ${enFrancais(jourRelatif(30))}` }]) },
  });

  const r = await executer(m.depot, m.envoyeur, m.recuperer);

  assert.equal(m.opportunites.length, 1);
  assert.match(m.opportunites[0].reference, /^TP-\d{6}$/);
  assert.equal(m.opportunites[0].deadline, jourRelatif(30),
               "la deadline doit etre lue dans l'annonce");
  assert.equal(m.opportunites[0].statutDelai, "OUVERT");
  assert.equal(m.boite.length, 1);
  assert.ok(m.boite[0].sujet.startsWith("[TenderPilot] Nouvelle opportunite"));
  assert.ok(m.boite[0].corps.includes("source officielle"));
  assert.equal(r.nouvelles, 1);
});

test("relance : aucun doublon, aucun nouvel email", async () => {
  const url = "https://example.org/f2";
  const xml = fluxRss([{ titre: "Etude de faisabilite",
    lien: "https://example.org/a2",
    texte: `Date limite : ${enFrancais(jourRelatif(30))}` }]);
  const m = monde({ sources: [source("s1", url)], flux: { [url]: xml } });

  await executer(m.depot, m.envoyeur, m.recuperer);
  await executer(m.depot, m.envoyeur, m.recuperer);

  assert.equal(m.opportunites.length, 1);
  assert.equal(m.boite.length, 1);
  assert.ok(m.journal.some((l) => l.statut === "DUPLICATE"));
});

test("rappels : un seul email malgre trois paliers atteints", async () => {
  const url = "https://example.org/f3";
  const m = monde({
    sources: [source("s1", url)],
    flux: { [url]: fluxRss([{ titre: "Mission de demain",
      lien: "https://example.org/a3",
      texte: `Date limite : ${enFrancais(jourRelatif(1))}` }]) },
    config: { envoiNouvelle: false },
  });

  await executer(m.depot, m.envoyeur, m.recuperer);

  assert.equal(m.boite.length, 1, "un seul email doit partir");
  assert.ok(m.boite[0].sujet.includes("DERNIER RAPPEL"));
  const o = m.opportunites[0];
  assert.ok(o.notifJ7 && o.notifJ3 && o.notifJ1,
            "les paliers depasses sont marques sans email");

  await executer(m.depot, m.envoyeur, m.recuperer);
  assert.equal(m.boite.length, 1, "la relance ne renvoie rien");
});

test("une annonce deja echue n'est pas collectee", async () => {
  // Les portails laissent des annees d'archives en ligne : sans ce filtre,
  // la grande majorite des lignes seraient grises des le premier passage.
  const url = "https://example.org/f4";
  const m = monde({
    sources: [source("s1", url)],
    flux: { [url]: fluxRss([
      { titre: "Mission passee", lien: "https://example.org/a4-vieux",
        texte: `Date limite : ${enFrancais(jourRelatif(-5))}` },
      { titre: "Mission ouverte", lien: "https://example.org/a4-neuf",
        texte: `Date limite : ${enFrancais(jourRelatif(20))}` },
    ]) },
    config: { envoiNouvelle: false },
  });

  await executer(m.depot, m.envoyeur, m.recuperer);

  const titres = m.opportunites.map((o) => o.titre);
  assert.deepEqual(titres, ["Mission ouverte"]);
});

test("une opportunite suivie qui expire passe en EXPIRE, sans rappel", async () => {
  // Le filtre agit a l'ENTREE seulement. Ce qui est deja suivi reste suivi :
  // effacer l'historique ferait perdre la trace des dossiers deposes.
  const url = "https://example.org/f4b";
  const m = monde({
    sources: [source("s1", url)],
    flux: { [url]: fluxRss([]) },
    config: { envoiNouvelle: false },
    opportunites: [{
      id: "1", reference: "TP-000001", titre: "Mission deja suivie",
      lien: "https://example.org/a4b", deadline: jourRelatif(-5),
      source: "s1",
    } as OpportuniteStockee],
  });

  await executer(m.depot, m.envoyeur, m.recuperer);

  assert.equal(m.opportunites.length, 1);
  assert.equal(m.opportunites[0].statutDelai, "EXPIRE");
  assert.equal(m.boite.length, 0);
});

test("deadline modifiee a la source : la date est remplacee", async () => {
  const url = "https://example.org/f5";
  const lien = "https://example.org/a5";
  const avant = jourRelatif(30);
  const apres = jourRelatif(45);
  const flux: Record<string, string> = {
    [url]: fluxRss([{ titre: "Mission reportee", lien,
      texte: `Date limite : ${enFrancais(avant)}` }]),
  };
  const m = monde({ sources: [source("s1", url)], flux,
                    config: { envoiNouvelle: false } });

  await executer(m.depot, m.envoyeur, m.recuperer);
  assert.equal(m.opportunites[0].deadline, avant);

  flux[url] = fluxRss([{ titre: "Mission reportee", lien,
    texte: `Date limite : ${enFrancais(apres)}` }]);
  await executer(m.depot, m.envoyeur, m.recuperer);

  assert.equal(m.opportunites.length, 1, "toujours une seule ligne");
  assert.equal(m.opportunites[0].deadline, apres);
  assert.ok(m.journal.some((l) => l.action === "Mise a jour"
                                  && l.message.includes("deadline")));
});

test("source en erreur : les autres continuent", async () => {
  const ok = "https://example.org/ok";
  const casse = "https://example.org/casse";
  const m = monde({
    sources: [source("ko", casse), source("ok", ok)],
    flux: {
      [casse]: 403,
      [ok]: fluxRss([{ titre: "Annonce valide", lien: "https://example.org/v",
        texte: `Date limite : ${enFrancais(jourRelatif(20))}` }]),
    },
    config: { envoiNouvelle: false },
  });

  const r = await executer(m.depot, m.envoyeur, m.recuperer);

  assert.equal(m.opportunites.length, 1);
  assert.equal(r.suivies, 1);
  assert.ok(m.journal.some((l) => l.statut === "ERROR"
                                  && l.message.includes("403")));
});

test("digest : au-dela du seuil, un seul email recapitulatif", async () => {
  const url = "https://example.org/f6";
  const entrees = Array.from({ length: 8 }, (_, i) => ({
    titre: `Annonce numero ${i}`, lien: `https://example.org/d${i}`,
    texte: `Date limite : ${enFrancais(jourRelatif(30))}`,
  }));
  const m = monde({ sources: [source("s1", url)],
                    flux: { [url]: fluxRss(entrees) } });

  await executer(m.depot, m.envoyeur, m.recuperer);

  assert.equal(m.opportunites.length, 8);
  assert.equal(m.boite.length, 1, "un seul email au lieu de huit");
  assert.equal(m.boite[0].sujet,
               "[TenderPilot] 8 nouvelles opportunites detectees");
  assert.ok(m.opportunites.every(
    (o) => canauxNotifies(o.notifNouvelle).includes("email")),
    "le digest marque chaque ligne, sur le canal qui l a servie");
});

test("source MANUAL : ignoree sans erreur", async () => {
  const m = monde({
    sources: [source("s1", "https://example.org/page", { methode: "MANUAL" })],
    flux: {},
  });
  const r = await executer(m.depot, m.envoyeur, m.recuperer);
  assert.equal(r.nouvelles, 0);
  assert.equal(m.opportunites.length, 0);
});

test("deux annonces identiques dans la meme collecte : une seule ligne", async () => {
  const url = "https://example.org/f7";
  const lien = "https://example.org/meme";
  const texte = `Date limite : ${enFrancais(jourRelatif(20))}`;
  const m = monde({
    sources: [source("s1", url)],
    flux: { [url]: fluxRss([
      { titre: "Doublon", lien, texte },
      { titre: "Doublon", lien, texte },
    ]) },
    config: { envoiNouvelle: false },
  });

  await executer(m.depot, m.envoyeur, m.recuperer);
  assert.equal(m.opportunites.length, 1);
});

test("deux copies d une meme annonce, dont une seule datee", async () => {
  // MESURE DU 2026-09-02, sur la BCEAO : la meme page listait deux fois le
  // meme avis. Le second exemplaire etait reconnu comme doublon du PREMIER
  // - une annonce qui n'a ni identifiant ni ligne tant qu'elle n'est pas
  // ecrite - et partait quand meme en mise a jour de base.
  const url = "https://example.org/f-doublon-interne";
  const lien = "https://example.org/meme-avis";
  const m = monde({
    sources: [source("s1", url)],
    flux: { [url]: fluxRss([
      { titre: "Fourniture de materiel", lien, texte: "Avis de la banque" },
      { titre: "Fourniture de materiel", lien,
        texte: `Date limite : ${enFrancais(jourRelatif(25))}` },
      // Un troisieme avis, distinct : sans lui tous les titres seraient
      // identiques et le flux passerait par la reparation DNCMP.
      { titre: "Etude hydraulique", lien: "https://example.org/autre",
        texte: `Date limite : ${enFrancais(jourRelatif(40))}` },
    ]) },
    config: { envoiNouvelle: false },
  });

  await executer(m.depot, m.envoyeur, m.recuperer);

  assert.equal(m.opportunites.length, 2, "l avis en double ne cree qu une ligne");
  assert.equal(m.opportunites[0].deadline, jourRelatif(25),
    "l echeance lue sur le second exemplaire complete le premier");

  const doublons = m.journal.filter((l) => l.statut === "DUPLICATE");
  assert.equal(doublons.length, 1);
  assert.ok(!doublons[0].message.includes("undefined"));
  assert.ok(doublons[0].message.startsWith("Fourniture de materiel"),
            doublons[0].message);
});

test("une valeur deja lue n est jamais remplacee par une autre copie", async () => {
  // Les deux exemplaires ont ete lus dans la MEME collecte : aucun n'est
  // plus recent que l'autre. On complete ce qui manque, on n'arbitre pas
  // entre deux echeances - regle 2 du depot, ne jamais inventer une date.
  const url = "https://example.org/f-doublon-dates";
  const lien = "https://example.org/avis-deux-dates";
  const m = monde({
    sources: [source("s1", url)],
    flux: { [url]: fluxRss([
      { titre: "Avis date deux fois", lien,
        texte: `Date limite : ${enFrancais(jourRelatif(10))}` },
      { titre: "Avis date deux fois", lien,
        texte: `Date limite : ${enFrancais(jourRelatif(50))}` },
      { titre: "Autre avis", lien: "https://example.org/autre-2",
        texte: `Date limite : ${enFrancais(jourRelatif(40))}` },
    ]) },
    config: { envoiNouvelle: false },
  });

  await executer(m.depot, m.envoyeur, m.recuperer);

  assert.equal(m.opportunites.length, 2);
  assert.equal(m.opportunites[0].deadline, jourRelatif(10),
    "la premiere echeance lue reste celle de la fiche");
});

test("un flux valide mais vide n est pas signale comme casse", async () => {
  // MESURE DU 2026-09-02 : les bureaux PNUD du Cap-Vert et du Togo servent
  // un flux RSS 1.0 parfaitement valide, dont la liste est vide. Ils
  // etaient signales comme "la page a peut-etre change de structure" a
  // chaque execution.
  const vide = "https://example.org/f-vide";
  const casse = "https://example.org/f-casse";
  const m = monde({
    sources: [source("s-vide", vide), source("s-casse", casse)],
    flux: {
      [vide]: '<?xml version="1.0" encoding="ISO-8859-1" ?><rdf:RDF '
        + 'xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" '
        + 'xmlns="http://purl.org/rss/1.0/"><channel><title>UNDP - TOGO'
        + "</title><items><rdf:Seq></rdf:Seq></items></channel></rdf:RDF>",
      [casse]: "<!DOCTYPE html><html><body><h1>Page introuvable</h1></body></html>",
    },
    config: { envoiNouvelle: false },
  });

  await executer(m.depot, m.envoyeur, m.recuperer);

  const journalVide = m.journal.filter((l) => l.source === "SRC-s-vide");
  const journalCasse = m.journal.filter((l) => l.source === "SRC-s-casse");
  assert.equal(journalVide.length, 1);
  assert.ok(!journalVide[0].message.includes("structure"),
            journalVide[0].message);
  assert.ok(journalVide[0].message.includes("vide"), journalVide[0].message);
  assert.equal(journalCasse.length, 1);
  assert.ok(journalCasse[0].message.includes("structure"),
            journalCasse[0].message);
});

test("estFluxXml distingue un flux d une page", () => {
  assert.equal(estFluxXml('<?xml version="1.0"?><rss version="2.0"></rss>'), true);
  assert.equal(estFluxXml('<feed xmlns="http://www.w3.org/2005/Atom"></feed>'), true);
  assert.equal(estFluxXml(""), false);
  // Une page HTML qui mentionne un flux bien plus loin n'en est pas un.
  assert.equal(
    estFluxXml(`<!DOCTYPE html><html><body>${"texte ".repeat(900)}<a>rss</a>`),
    false);
});

// ------------------------------------------------------------ pertinence --

test("pertinence : les deux axes, pays et secteur", () => {
  const profil = { paysSuivis: "Benin, Togo",
                   secteursSuivis: "Energie, Eau et assainissement" };
  const avis = (pays: string, secteur: string) => ({ pays, secteur });

  assert.equal(pertinence(avis("Benin", "Energie"), profil),
               PERTINENCE_PRIORITAIRE);
  assert.equal(pertinence(avis("Togo", "Non precise"), profil),
               PERTINENCE_A_VOIR);
  assert.equal(pertinence(avis("Benin", "Culture et arts"), profil),
               PERTINENCE_POSSIBLE);
  // Un appel mondial n'est jamais ecarte : une structure beninoise peut y
  // candidater. Meme decision que LLM_APPELS_MONDIAUX, sans aucune cle.
  assert.equal(pertinence(avis("International", "Energie"), profil),
               PERTINENCE_A_VOIR);
  assert.equal(pertinence(avis("Kenya", "Culture et arts"), profil),
               PERTINENCE_HORS_PROFIL);
});

test("pertinence : ne rien declarer n'est pas se restreindre", () => {
  const sansSecteurs = { paysSuivis: "Benin", secteursSuivis: "" };
  assert.equal(pertinence({ pays: "Benin", secteur: "Culture et arts" },
                          sansSecteurs), PERTINENCE_PRIORITAIRE);
  // Configuration entierement vide : rien n'est jamais degrade.
  assert.equal(pertinence({ pays: "Kenya", secteur: "Culture et arts" }, {}),
               PERTINENCE_A_VOIR);
});

test("pertinence : les deux moteurs partagent le meme vocabulaire", () => {
  // Jumeau de SCHEMA.PERTINENCE_* dans apps_script/Schema.gs. Les libelles
  // commencent par leur rang : le tri alphabetique de Google Sheets range
  // alors le plus pertinent en premier.
  for (const p of PERTINENCES) assert.match(p, /^\d - [A-Z]/);
  assert.deepEqual(PERTINENCES, ["3 - PRIORITAIRE", "2 - A VOIR",
                                 "1 - POSSIBLE", "0 - HORS PROFIL"]);
});

test("pertinence : la liste de configuration tolere l'ecriture humaine", () => {
  assert.deepEqual(listeConfig("Benin, Togo ; Niger"), ["benin", "togo", "niger"]);
  assert.deepEqual(listeConfig(""), []);
  assert.deepEqual(listeConfig(null), []);
  assert.equal(pertinence({ pays: "BENIN", secteur: "ENERGIE" },
                          { paysSuivis: "benin", secteursSuivis: "energie" }),
               PERTINENCE_PRIORITAIRE);
});

test("le profil ETIQUETTE, il ne supprime jamais", async () => {
  const url = "https://example.org/f-pertinence";
  const m = monde({
    sources: [source("s1", url, { paysDefaut: "Kenya",
                                  secteurDefaut: "Culture et arts" })],
    flux: { [url]: fluxRss([
      { titre: "Atelier de peinture a Nairobi", lien: "https://example.org/p1",
        texte: `Date limite : ${enFrancais(jourRelatif(30))}` }]) },
    config: { envoiNouvelle: false, paysSuivis: "Benin", secteursSuivis: "Energie" },
  });

  await executer(m.depot, m.envoyeur, m.recuperer);
  assert.equal(m.opportunites.length, 1, "l'annonce hors profil est conservee");
  assert.equal(m.opportunites[0].pertinence, PERTINENCE_HORS_PROFIL);
});

test("elargir le profil remet a jour la liste entiere", async () => {
  const url = "https://example.org/f-pertinence-2";
  const m = monde({
    sources: [source("s1", url, { paysDefaut: "Kenya",
                                  secteurDefaut: "Culture et arts" })],
    flux: { [url]: fluxRss([
      { titre: "Atelier de peinture a Nairobi", lien: "https://example.org/p2",
        texte: `Date limite : ${enFrancais(jourRelatif(30))}` }]) },
    config: { envoiNouvelle: false, paysSuivis: "Benin",
              secteursSuivis: "Energie" },
  });

  await executer(m.depot, m.envoyeur, m.recuperer);
  assert.equal(m.opportunites[0].pertinence, PERTINENCE_HORS_PROFIL);

  // Le client elargit son profil. Rien n'est recollecte : la pertinence se
  // recalcule au passage suivant, comme les jours restants.
  m.config.paysSuivis = "Benin, Kenya";
  m.config.secteursSuivis = "Energie, Culture et arts";
  await executer(m.depot, m.envoyeur, m.recuperer);
  assert.equal(m.opportunites.length, 1);
  assert.equal(m.opportunites[0].pertinence, PERTINENCE_PRIORITAIRE);
});

test("les alertes au-dela du plafond sont reportees, jamais perdues", async () => {
  // MESURE DU 2026-09-02 : sur une base vierge, 28 opportunites se
  // retrouvaient d'un coup a moins de sept jours. Le digest ramene les
  // nouveautes a un email, mais les rappels partaient un par un.
  const url = "https://example.org/f-etalement";
  const entrees = Array.from({ length: 8 }, (_, i) => ({
    titre: `Echeance proche ${i}`,
    lien: `https://example.org/e${i}`,
    texte: `Date limite : ${enFrancais(jourRelatif(5))}`,
  }));
  const m = monde({
    sources: [source("s1", url)],
    flux: { [url]: fluxRss(entrees) },
    config: { envoiNouvelle: false, maxEmailsParExecution: 3 },
  });

  await executer(m.depot, m.envoyeur, m.recuperer);
  assert.equal(m.boite.length, 3, "le plafond doit etre respecte");
  assert.equal(m.opportunites.filter((o) => o.notifJ7).length, 3,
               "seules les lignes servies sont marquees");
  assert.ok(m.journal.some((l) => l.message.includes("reportee")));

  await executer(m.depot, m.envoyeur, m.recuperer);
  assert.equal(m.boite.length, 6);
  const sujets = m.boite.map((e) => e.sujet);
  assert.equal(new Set(sujets).size, sujets.length,
               "aucune alerte ne part deux fois");

  await executer(m.depot, m.envoyeur, m.recuperer);
  await executer(m.depot, m.envoyeur, m.recuperer);
  assert.equal(m.boite.length, 8, "au bout du compte, les huit sont parties");
});

test("sans plafond, le comportement ne change pas", async () => {
  const url = "https://example.org/f-sans-plafond";
  const entrees = Array.from({ length: 4 }, (_, i) => ({
    titre: `Echeance ${i}`,
    lien: `https://example.org/s${i}`,
    texte: `Date limite : ${enFrancais(jourRelatif(5))}`,
  }));
  const m = monde({
    sources: [source("s1", url)],
    flux: { [url]: fluxRss(entrees) },
    config: { envoiNouvelle: false, maxEmailsParExecution: 0 },
  });

  await executer(m.depot, m.envoyeur, m.recuperer);
  assert.equal(m.boite.length, 4);
  assert.ok(!m.journal.some((l) => l.message.includes("reportee")));
});

test("l'ordre du tableau : le plus de temps devant en haut", () => {
  const l = (id: string, joursRestants: number | null, pertinence?: string) =>
    ({ id, joursRestants, pertinence });

  const ordre = parDelai([
    l("C", 3), l("A", 60), l("SANS", null), l("B", 12), l("EXPIRE", -5),
  ]).map((o) => o.id);
  assert.deepEqual(ordre, ["A", "B", "C", "EXPIRE", "SANS"]);

  // A delai egal, c'est la pertinence qui departage.
  const egalite = parDelai([
    l("BANAL", 10, PERTINENCE_HORS_PROFIL),
    l("POUR-MOI", 10, PERTINENCE_PRIORITAIRE),
  ]).map((o) => o.id);
  assert.deepEqual(egalite, ["POUR-MOI", "BANAL"]);

  // Le tableau recu n'est pas modifie.
  const source = [l("X", 1), l("Y", 9)];
  parDelai(source);
  assert.equal(source[0].id, "X");
});

test("l'inventaire ne montre que ce qui existe vraiment", () => {
  const a = (pays: string, secteur: string) => ({ pays, secteur });
  const lignes = [
    a("Benin", "Energie"), a("Benin", "Energie"), a("Benin", "Sante"),
    a("Niger", "Energie"), a("Togo", ""), a("", "Eau et assainissement"),
  ];
  const rangees = inventaireProfil(lignes,
    { paysSuivis: "Benin", secteursSuivis: "Energie" });

  const pays = rangees.filter((r) => r[0] === PROFIL_TYPE_PAYS);
  assert.deepEqual(pays.map((r) => r[1]), ["Benin", "Niger", "Togo"]);
  assert.equal(pays[0][2], 3, "le plus present passe en tete");
  assert.equal(pays[0][3], "OUI");
  assert.equal(pays[1][3], "NON");
  // Une case vide n'invente jamais une valeur.
  assert.ok(rangees.every((r) => r[1].trim().length > 0));

  // Sans liste declaree, rien n'est ecarte.
  assert.ok(inventaireProfil(lignes, {}).every((r) => r[3] === "OUI"));

  // A egalite, l'ordre alphabetique fige le classement.
  const un = inventaireProfil([a("Zimbabwe", "X"), a("Angola", "X")], {});
  const deux = inventaireProfil([a("Angola", "X"), a("Zimbabwe", "X")], {});
  assert.deepEqual(un, deux);
});

test("le client choisit les niveaux de pertinence qui le previennent", () => {
  assert.equal(pertinenceNotifiable(PERTINENCE_HORS_PROFIL, {}), true,
               "sans reglage, tout est notifie");

  const seul = { notifierPertinence: "3 - PRIORITAIRE" };
  assert.equal(pertinenceNotifiable(PERTINENCE_PRIORITAIRE, seul), true);
  assert.equal(pertinenceNotifiable(PERTINENCE_A_VOIR, seul), false);

  const deux = { notifierPertinence: "3 - PRIORITAIRE, 2 - A VOIR" };
  assert.equal(pertinenceNotifiable(PERTINENCE_A_VOIR, deux), true);
  assert.equal(pertinenceNotifiable(PERTINENCE_POSSIBLE, deux), false);

  // Le libelle se recopie a la main : trois ecritures pour un niveau.
  assert.equal(pertinenceNotifiable(PERTINENCE_PRIORITAIRE,
                                    { notifierPertinence: "PRIORITAIRE" }), true);
  assert.equal(pertinenceNotifiable(PERTINENCE_PRIORITAIRE,
                                    { notifierPertinence: "3" }), true);
  assert.equal(pertinenceNotifiable(PERTINENCE_A_VOIR,
                                    { notifierPertinence: "3" }), false);
  // Une annonce sans pertinence passe : le doute lui profite.
  assert.equal(pertinenceNotifiable("", seul), true);
  assert.equal(pertinenceNotifiable(null, seul), true);
});

test("le filtre coupe les emails, jamais la liste", async () => {
  const url = "https://example.org/f-notif-pertinence";
  const m = monde({
    sources: [source("s1", url, { paysDefaut: "Kenya",
                                  secteurDefaut: "Culture et arts" })],
    flux: { [url]: fluxRss([
      { titre: "Atelier lointain", lien: "https://example.org/n1",
        texte: `Date limite : ${enFrancais(jourRelatif(20))}` }]) },
    config: { paysSuivis: "Benin", secteursSuivis: "Energie",
              notifierPertinence: "3 - PRIORITAIRE" },
  });

  await executer(m.depot, m.envoyeur, m.recuperer);
  assert.equal(m.opportunites.length, 1, "l'annonce entre dans la liste");
  assert.equal(m.boite.length, 0, "aucun email");
  assert.ok(m.journal.some((l) => l.message.includes("notifierPertinence")));
  assert.equal(canauxNotifies(m.opportunites[0].notifNouvelle).length, 0,
               "rien n'est marque comme notifie, sur aucun canal");

  // Elargir le profil libere l'alerte, sans recollecter.
  m.config.paysSuivis = "Benin, Kenya";
  m.config.secteursSuivis = "Energie, Culture et arts";
  await executer(m.depot, m.envoyeur, m.recuperer);
  assert.equal(m.boite.length, 1);
});

test("references sequentielles sans trou", async () => {
  const m = monde();
  const bilan = await enregistrerOuMettreAJour(
    m.depot,
    [{ titre: "A", lien: "https://example.org/a" },
     { titre: "B", lien: "https://example.org/b" }],
    [],
  );
  assert.deepEqual(bilan.nouvelles.map((o) => o.reference),
                   ["TP-000001", "TP-000002"]);
});

// ------------------------------------------------- identite d une annonce

test("deux avis d une meme page de liste ne sont pas des doublons", () => {
  // Mesure du 2026-09-02 : la cle URL seule confondait des avis differents.
  // La DNCMP publiait 43 marches, un seul etait enregistre. La SBEE, 7 pour
  // 1. Le lien ne suffit pas a identifier un avis.
  const a = { titre: "Acquisition de mobiliers de bureaux",
              lien: "https://marches-publics.sbee.bj/" } as never;
  const b = { titre: "Acquisition de compteurs communicants",
              lien: "https://marches-publics.sbee.bj/" } as never;
  const index = construireIndex([{ ...(a as object), id: "1",
                                   reference: "TP-000001" }] as never);
  assert.equal(trouverDoublon(b, index), null,
    "deux avis distincts sur la meme page doivent rester distincts");
});

test("le meme avis recollecte reste reconnu", () => {
  const a = { titre: "Acquisition de mobiliers de bureaux",
              lien: "https://marches-publics.sbee.bj/" } as never;
  const index = construireIndex([{ ...(a as object), id: "1",
                                   reference: "TP-000001" }] as never);
  assert.ok(trouverDoublon(a, index), "un avis deja suivi ne doit pas se dedoubler");
});

test("l'auteur d'une entree devient l'acheteur", () => {
  // MESURE DU 2026-09-02, sur la DNCMP : le flux des marches publics du
  // Benin met le pouvoir adjudicateur dans <author>. On l'ignorait, et les
  // 46 annonces portaient le nom de la SOURCE a la place de leur acheteur.
  const flux = '<?xml version="1.0"?><rss version="2.0"><channel>'
    + "<item><title>Appel d'Offre</title>"
    + "<link>https://www.marches-public.bj/appels-doffres</link>"
    + "<description>Acquisition d'une infrastructure hyperconvergee</description>"
    + "<author>Societe Beninoise d'Energie Electrique</author></item>"
    + "<item><title>Appel d'Offre</title>"
    + "<link>https://www.marches-public.bj/appels-doffres</link>"
    + "<description>Renouvellement des licences</description>"
    + "<author>Agence des Systemes d'Information et du Numerique (ASIN)</author>"
    + "</item></channel></rss>";

  const entrees = analyserFlux(flux);
  assert.equal(entrees[0].organisation, "Societe Beninoise d'Energie Electrique");
  // La parenthese ne prime que derriere une adresse : un acheteur ne doit
  // pas etre reduit a son sigle.
  assert.equal(entrees[1].organisation,
               "Agence des Systemes d'Information et du Numerique (ASIN)");
});

test("une adresse email seule ne nomme aucun acheteur", () => {
  const item = (auteur: string) =>
    '<?xml version="1.0"?><rss version="2.0"><channel>'
    + `<item><title>Avis</title><link>https://x.test/a</link>`
    + `<description>Objet</description><author>${auteur}</author>`
    + "</item></channel></rss>";

  // La specification RSS dit que <author> est une ADRESSE, pas un nom.
  assert.equal(analyserFlux(item("redaction@site.org"))[0].organisation, null);
  assert.equal(analyserFlux(item("redaction@site.org (Agence X)"))[0].organisation,
               "Agence X");
  // Sans auteur, c'est le defaut de la source qui reprend la main.
  assert.equal(analyserFlux(item(""))[0].organisation, null);
});

test("un flux dont tous les titres sont identiques remonte les descriptions", () => {
  // Le flux de la DNCMP intitule ses 43 elements "Appel d'Offre" - un
  // libelle de categorie. L objet reel est dans la description.
  const xml = `<rss><channel>
    <item><title>Appel d'Offre</title>
      <description>Acquisition d une infrastructure hyperconvergee</description>
      <link>https://www.marches-public.bj/appels-doffres</link></item>
    <item><title>Appel d'Offre</title>
      <description>Renouvellement des licences MICROSOFT O365</description>
      <link>https://www.marches-public.bj/appels-doffres</link></item>
  </channel></rss>`;
  const e = analyserFlux(xml);
  assert.equal(e.length, 2);
  assert.match(e[0].titre, /infrastructure hyperconvergee/);
  assert.match(e[1].titre, /MICROSOFT O365/);
  // Le libelle de categorie n est pas perdu : il devient le type.
  assert.equal(e[0].type, "Appel d'Offre");
});

test("un flux normal n est jamais touche par cette reparation", () => {
  const xml = `<rss><channel>
    <item><title>Premier avis</title><description>Corps A</description>
      <link>https://exemple.org/1</link></item>
    <item><title>Second avis</title><description>Corps B</description>
      <link>https://exemple.org/2</link></item>
  </channel></rss>`;
  const e = analyserFlux(xml);
  assert.deepEqual(e.map((x) => x.titre), ["Premier avis", "Second avis"]);
});

// ------------------------------------------------- classement sans modele

test("un meme type ecrit de quatre facons devient une seule valeur", () => {
  // Mesure du 2026-09-02 : la colonne Type portait 14 libelles pour 8
  // notions. "Appel d offres" 90 fois et "Appel d Offre" 43 fois - deux
  // entrees de filtre pour la meme chose.
  for (const brut of ["Appel d'Offre", "APPEL D OFFRES", "appel doffres",
                      "Invitation for Bids", "Marche de Fournitures"]) {
    assert.equal(normaliserType(brut), "Appel d'offres", brut);
  }
  assert.equal(normaliserType("Request for Expression of Interest"), "AMI");
  assert.equal(normaliserType("Subvention"), "Subvention");
});

test("une reference n'est pas un type", () => {
  // L'analyseur ABE deversait ceci dans la colonne Type. La limite de
  // longueur existante - 60 caracteres - ne suffisait pas : 45 caracteres.
  assert.equal(normaliserType("AVIS N° 001/2026/PRMP-ABE/APM du 19 Janvier 2026"), "");
  assert.equal(normaliserType("N° 0022 PRMP-ABE/PI_DAF_98927/APM"), "");
});

test("un libelle inconnu est conserve, pas range dans Autre", () => {
  // Une source peut employer un terme juste que nous n'avons pas rencontre.
  assert.equal(normaliserType("Concession de service"), "Concession de service");
});

test("le secteur se deduit du titre, sans aucune cle", () => {
  assert.equal(deduireSecteur("Rehabilitation du Centre de Sante d'Ayomi"), "Sante");
  assert.equal(deduireSecteur("Travaux d'electrification solaire a Kampti"), "Energie");
  assert.equal(deduireSecteur("Systemes d'Approvisionnement en Eau Potable"),
               "Eau et assainissement");
  assert.equal(deduireSecteur("Acquisition d'equipements informatiques"),
               "Numerique et technologie");
});

test("les trois erreurs mesurees le 2026-09-02 ne reviennent pas", () => {
  // Ces trois-la etaient fausses avant correction, et chacune illustre une
  // cause differente.

  // Un mot manquant : "medico" n'etait pas dans le vocabulaire, l'annonce
  // tombait dans Infrastructures a cause de "Construction".
  assert.equal(deduireSecteur("Construction du Centre medico-social chirurgical de GBADA"),
               "Sante");

  // Un autre mot manquant : "salles de classe" absent.
  assert.equal(deduireSecteur("Construction d'un module de trois salles de classe"),
               "Education et formation");

  // LE PLUS INSTRUCTIF : "election" se trouvait a l'interieur de
  // "selection". Un terme d'un seul mot doit correspondre a un MOT ENTIER.
  assert.equal(deduireSecteur("Cabinet international pour la selection de 20 campements"), "");
});

test("capacity building n'est pas du BTP", () => {
  // Mesure du 2026-09-02, sur la GIZ : "building" seul rangeait "CAPACITY
  // BUILDING ON HUMAN RIGHTS" dans les infrastructures. En anglais du
  // developpement, "capacity building" est partout - c'etait donc une
  // erreur systematique, pas un cas isole.
  assert.notEqual(
    deduireSecteur("TRAINING MODULE & CAPACITY BUILDING ON HUMAN RIGHTS"),
    "Infrastructures et BTP");
  // Les vrais travaux restent couverts.
  assert.equal(deduireSecteur("Building works for the new warehouse"),
               "Infrastructures et BTP");
  assert.equal(deduireSecteur("Civil works for the bridge"),
               "Infrastructures et BTP");
  assert.equal(deduireSecteur("Construction d un batiment administratif"),
               "Infrastructures et BTP");
});

test("sans correspondance nette, on ne devine pas", () => {
  // Un secteur faux est PIRE qu'un secteur absent : le client ne trouvera
  // pas l'annonce en filtrant.
  assert.equal(deduireSecteur("Un titre parfaitement neutre sans aucun mot cle"), "");
  assert.equal(deduireSecteur(""), "");
  assert.equal(deduireSecteur(null), "");
});

test("une racine tronquee vise les mots qui commencent par elle", () => {
  assert.equal(deduireSecteur("Travaux d'electrification"), "Energie");
  assert.equal(deduireSecteur("Biodiversity review"), "Environnement et climat");
});

test("Non precise plutot qu'une cellule vide", () => {
  // Une cellule vide est ambigue : information manquante, ou defaut du
  // produit ? Une valeur explicite repond, et devient filtrable.
  assert.equal(SECTEUR_INCONNU, "Non precise");
  assert.notEqual(SECTEUR_INCONNU, "Autre");
});

// ==========================================================================
// Deux canaux, deux rythmes.
//
// L'email est contraint par le quota du fournisseur et par une boite qu'on
// noie vite ; un salon Telegram, non. Tant que les deux partageaient un
// seul plafond et un seul temoin d'envoi, regler l'email a 3 imposait 3 a
// Telegram - et l'inverse aurait fait des doublons.

test("chaque canal a son plafond, et personne ne recoit deux fois", async () => {
  const url = "https://example.org/f-deux-canaux";
  const entrees = Array.from({ length: 8 }, (_, i) => ({
    titre: `Echeance proche ${i}`,
    lien: `https://example.org/dc${i}`,
    texte: `Date limite : ${enFrancais(jourRelatif(5))}`,
  }));
  const m = monde({
    sources: [source("s1", url)],
    flux: { [url]: fluxRss(entrees) },
    config: {
      envoiNouvelle: false,
      maxEmailsParExecution: 3,
      maxTelegramParExecution: 0,   // 0 = aucun plafond
      envoiTelegram: true, telegramToken: "jeton", telegramChatId: "salon",
    },
  });

  await executer(m.depot, m.envoyeur, m.recuperer, m.messager);

  assert.equal(m.boite.length, 3, "l'email s'arrete a son plafond");
  assert.equal(m.salon.length, 8,
               "Telegram n'est plus retenu par le plafond de l'email");

  // La memoire est par canal : huit lignes servies sur Telegram, trois
  // seulement par email.
  const parCanal = (canal: Canal) => m.opportunites.filter(
    (o) => canauxNotifies(o.notifJ7).includes(canal)).length;
  assert.equal(parCanal("telegram"), 8);
  assert.equal(parCanal("email"), 3);

  // AU PASSAGE SUIVANT : l'email rattrape, Telegram ne renvoie RIEN.
  m.boite.length = 0;
  m.salon.length = 0;
  await executer(m.depot, m.envoyeur, m.recuperer, m.messager);

  assert.equal(m.boite.length, 3, "l'email reprend ou il s'etait arrete");
  assert.equal(m.salon.length, 0,
               "Telegram a deja tout envoye : il ne doit rien redire");
  assert.equal(parCanal("email"), 6);

  await executer(m.depot, m.envoyeur, m.recuperer, m.messager);
  assert.equal(parCanal("email"), 8, "au troisieme passage, tout est parti");
  assert.equal(m.salon.length, 0);
});

test("un temoin ecrit par une version precedente vaut tous canaux", async () => {
  // Une base en service porte des `true`. Les relire comme "aucun canal"
  // renverrait au client des alertes qu'il a deja recues - c'est le seul
  // choix qui n'est pas rattrapable.
  assert.deepEqual(canauxNotifies(true), ["email", "telegram", "ntfy"]);
  assert.equal(dejaNotifie(true, "telegram"), true);
  assert.equal(dejaNotifie("", "email"), false);
  assert.equal(dejaNotifie("telegram", "email"), false);

  assert.equal(ajouterCanal("", "telegram"), "telegram");
  assert.equal(ajouterCanal("telegram", "email"), "email,telegram");
  assert.equal(ajouterCanal("email,telegram", "email"), "email,telegram",
               "ajouter deux fois le meme canal ne change rien");
  assert.equal(ajouterCanal("n importe quoi", "email"), "email",
               "une valeur illisible ne bloque pas un envoi legitime");
});

test("Telegram plafonne de son cote sans retenir l'email", async () => {
  const url = "https://example.org/f-plafond-telegram";
  const entrees = Array.from({ length: 6 }, (_, i) => ({
    titre: `Avis ${i}`,
    lien: `https://example.org/pt${i}`,
    texte: `Date limite : ${enFrancais(jourRelatif(5))}`,
  }));
  const m = monde({
    sources: [source("s1", url)],
    flux: { [url]: fluxRss(entrees) },
    config: {
      envoiNouvelle: false,
      maxEmailsParExecution: 0,     // aucun plafond email
      maxTelegramParExecution: 2,
      envoiTelegram: true, telegramToken: "jeton", telegramChatId: "salon",
    },
  });

  await executer(m.depot, m.envoyeur, m.recuperer, m.messager);
  assert.equal(m.boite.length, 6, "l'email n'est pas retenu par Telegram");
  assert.equal(m.salon.length, 2, "Telegram tient son propre plafond");
  assert.ok(m.journal.some((l) => l.message.includes("telegram par execution")),
            "le report est journalise, canal nomme");
});

test("ntfy : un troisieme canal, avec son plafond et sa memoire", async () => {
  const url = "https://example.org/f-ntfy";
  const entrees = Array.from({ length: 5 }, (_, i) => ({
    titre: `Avis push ${i}`,
    lien: `https://example.org/np${i}`,
    texte: `Date limite : ${enFrancais(jourRelatif(5))}`,
  }));
  const m = monde({
    sources: [source("s1", url)],
    flux: { [url]: fluxRss(entrees) },
    config: {
      envoiNouvelle: false,
      maxEmailsParExecution: 2,
      maxNtfyParExecution: 0,
      envoiNtfy: true, ntfySujet: "tp-essai-9f2a",
    },
  });

  await executer(m.depot, m.envoyeur, m.recuperer, undefined, undefined,
                 m.pousseur);

  assert.equal(m.pousses.length, 5, "les cinq notifications partent");
  assert.equal(m.boite.length, 2, "l'email garde son propre plafond");
  assert.equal(m.pousses[0].titre, "Echeance dans 7 jours");
  assert.ok(m.pousses[0].lien.startsWith("https://example.org/np"));
  assert.ok(!m.pousses[0].corps.includes("<"),
            "le corps est du texte simple, ntfy n'interprete pas de balisage");

  m.pousses.length = 0;
  await executer(m.depot, m.envoyeur, m.recuperer, undefined, undefined,
                 m.pousseur);
  assert.equal(m.pousses.length, 0, "rien n'est pousse deux fois");
});

test("les rappels peuvent se limiter aux offres suivies", async () => {
  const url = "https://example.org/f-suivi";
  const m = monde({
    sources: [source("s1", url)],
    flux: { [url]: fluxRss([
      { titre: "Avis suivi", lien: "https://example.org/s1",
        texte: `Date limite : ${enFrancais(jourRelatif(5))}` },
      { titre: "Avis ignore", lien: "https://example.org/s2",
        texte: `Date limite : ${enFrancais(jourRelatif(5))}` },
    ]) },
    config: { rappelsSuivisSeulement: true },
  });

  // Les NOUVEAUTES partent quand meme : une annonce qui vient d'entrer ne
  // peut pas encore etre suivie. C'est tout l'interet de l'exception.
  await executer(m.depot, m.envoyeur, m.recuperer);
  const nouveautes = m.boite.filter((e) => e.sujet.includes("Nouvelle"));
  assert.equal(nouveautes.length, 2, "les nouveautes ne sont pas restreintes");
  assert.equal(m.boite.filter((e) => e.sujet.includes("7 jours")).length, 0,
               "aucun rappel d'echeance");

  const ignoree = m.opportunites.find((o) => o.titre === "Avis ignore")!;
  assert.equal(canauxNotifies(ignoree.notifJ7).length, 0,
               "un rappel non envoye n'est pas marque");

  // Le client coche une ligne : son rappel part au passage suivant.
  const suivie = m.opportunites.find((o) => o.titre === "Avis suivi")!;
  suivie.suivi = true;
  m.boite.length = 0;
  await executer(m.depot, m.envoyeur, m.recuperer);
  assert.equal(m.boite.length, 1, "cocher Suivi libere le rappel");
  assert.ok(m.boite[0].sujet.includes("Avis suivi"));

  m.boite.length = 0;
  await executer(m.depot, m.envoyeur, m.recuperer);
  assert.equal(m.boite.length, 0,
               "celle qui n'est pas suivie ne rappelle jamais");
});

test("sans le reglage, les rappels partent comme avant", async () => {
  const url = "https://example.org/f-suivi-defaut";
  const m = monde({
    sources: [source("s1", url)],
    flux: { [url]: fluxRss([
      { titre: "Avis non suivi", lien: "https://example.org/d1",
        texte: `Date limite : ${enFrancais(jourRelatif(5))}` },
    ]) },
    config: { envoiNouvelle: false },
  });
  await executer(m.depot, m.envoyeur, m.recuperer);
  assert.equal(m.boite.length, 1, "le rappel part sans qu'on ait rien coche");

  assert.ok(["oui", "true", "VRAI", "1"].every((v) => estSuivie({ titre: "x", suivi: v })));
  assert.equal(estSuivie({ titre: "x" }), false);
});
