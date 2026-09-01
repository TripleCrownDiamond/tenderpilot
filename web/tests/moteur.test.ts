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
  CONFIG_DEFAUT, Config, Opportunite, TypeNotification, champNotification,
} from "../src/lib/domain/regles";
import {
  Depot, Envoyeur, OpportuniteStockee, Recuperateur, SourceCollecte,
  enregistrerOuMettreAJour, executer, referenceSuivante,
} from "../src/lib/run";

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
  sources: SourceCollecte[];
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
      if (cible) Object.assign(cible, champs);
    },
    async majDelais(lignes) {
      for (const l of lignes) {
        const cible = opportunites.find((o) => o.id === l.id);
        if (cible) {
          cible.joursRestants = l.joursRestants;
          cible.statutDelai = l.statutDelai as OpportuniteStockee["statutDelai"];
        }
      }
    },
    async marquerNotifications(id, cles: TypeNotification[]) {
      const cible = opportunites.find((o) => o.id === id);
      if (!cible) return;
      for (const cle of cles) {
        (cible as unknown as Record<string, unknown>)[champNotification(cle) as string] = true;
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

  return { depot, envoyeur, recuperer, opportunites, journal, boite, sources };
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
  assert.ok(m.opportunites.every((o) => o.notifNouvelle === true));
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
