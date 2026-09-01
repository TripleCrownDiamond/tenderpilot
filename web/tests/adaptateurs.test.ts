/**
 * TenderPilot - les trois nouveaux adaptateurs de collecte.
 *
 *     cd web && npx tsx --test tests/adaptateurs.test.ts
 *
 * Les fixtures de tests/fixtures/ sont de VRAIES pages, capturees telles
 * quelles sur les sites le 2026-08-30. C'est volontaire : une fixture ecrite
 * a la main ne teste que l'idee qu'on se fait du site, jamais le site. Le
 * jour ou une extraction casse, il suffit de recapturer la page pour voir
 * exactement ce qui a change.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  analyserAbe, analyserAfd, analyserAfdb, analyserAraa, analyserArmp,
  analyserBceao,
  analyserDedras,
  analyserEnabel, analyserSbee, analyserSoneb, analyseurHtml,
} from "../src/lib/domain/html";
import { analyserWorldBank, analyseurJson } from "../src/lib/domain/json";
import { extraireDeadline, lireDateFlux } from "../src/lib/domain/rss";
import {
  alertes, compterAlertes, type Opportunite,
} from "../src/lib/domain/regles";
import { messageTelegram, messageTelegramDigest } from "../src/lib/run";
import { envoyeurTelegram } from "../src/lib/telegram";

const FIXTURES = join(import.meta.dirname, "..", "..", "tests", "fixtures");
const lire = (nom: string) => readFileSync(join(FIXTURES, nom), "utf8");

// ------------------------------------------------------------ Banque mondiale --

test("Banque mondiale : lit les avis de l'API JSON", () => {
  const entrees = analyserWorldBank(lire("worldbank-benin.json"));
  assert.ok(entrees.length > 0, "aucun avis lu");

  for (const e of entrees) {
    assert.ok(e.titre.length > 0);
    assert.match(e.lien, /projects\.worldbank\.org.*procurement-detail\/OP\d+/);
    if (e.publie) assert.match(e.publie, /^\d{4}-\d{2}-\d{2}$/);
    if (e.deadline) assert.match(e.deadline, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test("Banque mondiale : ecarte les marches deja attribues", () => {
  const brut = JSON.parse(lire("worldbank-benin.json")) as {
    procnotices: { notice_type: string }[];
  };
  const attribues = brut.procnotices.filter((n) => n.notice_type === "Contract Award");
  assert.ok(attribues.length > 0, "la fixture ne contient aucune attribution a ecarter");

  const entrees = analyserWorldBank(lire("worldbank-benin.json"));
  assert.equal(entrees.length, brut.procnotices.length - attribues.length);
  for (const e of entrees) assert.doesNotMatch(String(e.type), /contract award/i);
});

test("Banque mondiale : retient l'acheteur reel, pas le nom du bailleur", () => {
  const entrees = analyserWorldBank(lire("worldbank-benin.json"));
  const avecAcheteur = entrees.filter((e) => e.organisation);
  assert.ok(avecAcheteur.length > 0, "aucun acheteur renseigne");
  // "Seme City Development Agency", pas "Banque mondiale".
  assert.doesNotMatch(String(avecAcheteur[0].organisation), /world bank|banque mondiale/i);
});

test("Banque mondiale : le resume reste court malgre un notice_text enorme", () => {
  const entrees = analyserWorldBank(lire("worldbank-benin.json"));
  // notice_text depasse 60 ko par avis : il ne doit jamais finir dans le resume.
  for (const e of entrees) {
    assert.ok(e.resume.length < 500, `resume de ${e.resume.length} caracteres`);
  }
});

test("Banque mondiale : une reponse illisible ne fait pas tomber la collecte", () => {
  assert.deepEqual(analyserWorldBank("<html>maintenance</html>"), []);
  assert.deepEqual(analyserWorldBank(""), []);
  assert.deepEqual(analyserWorldBank('{"total":0}'), []);
});

// ------------------------------------------------------------------- Enabel --

test("Enabel : lit les marches de la page pays", () => {
  const entrees = analyserEnabel(lire("enabel-benin.html"));
  assert.ok(entrees.length > 0, "aucun marche lu");
  for (const e of entrees) {
    assert.ok(e.titre.length > 0);
    assert.match(e.lien, /^https:\/\/www\.enabel\.be\//);
  }
});

test("Enabel : ecarte les marches dont la remise est passee", () => {
  const html = lire("enabel-benin.html");
  const clos = (html.match(/<strong[^>]*>\s*Status\s*:?\s*<\/strong>\s*Close/gi) ?? []).length;
  assert.ok(clos > 0, "la fixture ne contient aucun marche clos");

  const entrees = analyserEnabel(html);
  const cartes = (html.match(/card--tenders/g) ?? []).length;
  assert.equal(entrees.length, cartes - clos);
});

test("Enabel : lit la date de cloture 'Closing date : 02 September 2026'", () => {
  const entrees = analyserEnabel(lire("enabel-benin.html"));
  const avecDeadline = entrees.filter((e) => e.deadline);
  assert.ok(avecDeadline.length > 0, "aucune echeance lue");
  for (const e of avecDeadline) assert.match(String(e.deadline), /^\d{4}-\d{2}-\d{2}$/);
});

// --------------------------------------------------------------------- BAD --

test("BAD : lit les avis prefixes EOI, AMI, SPN, GPN", () => {
  const entrees = analyserAfdb(lire("afdb-notices.html"));
  assert.ok(entrees.length > 0, "aucun avis lu");
  for (const e of entrees) {
    assert.match(e.titre, /^(EOI|AMI|SPN|GPN|IFB|RFP|RFQ)\b/i);
    assert.match(e.lien, /^https:\/\/www\.afdb\.org\/en\/documents\//);
  }
});

test("BAD : ignore les liens de rubrique du site", () => {
  const entrees = analyserAfdb(lire("afdb-notices.html"));
  const liens = new Set(entrees.map((e) => e.lien));
  assert.equal(liens.size, entrees.length, "des doublons sont remontes");
});

test("BAD : ne prend pas la date de publication pour une echeance", () => {
  // La page affiche "28-Aug-2026" avant chaque titre : c'est une date de
  // parution. La confondre avec une deadline ferait rater le vrai delai.
  const entrees = analyserAfdb(lire("afdb-notices.html"));
  assert.equal(entrees.filter((e) => e.deadline).length, 0);
});

// -------------------------------------------------------------------- ARMP --

test("ARMP : lit les avis de la page appels d'offres", () => {
  const entrees = analyserArmp(lire("armp-appels-offres.html"));
  assert.ok(entrees.length > 0, "aucun avis lu");
  for (const e of entrees) {
    assert.ok(e.titre.length > 0);
    assert.match(e.lien, /^https:\/\/armp\.bj\//);
    if (e.publie) assert.match(e.publie, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test("ARMP : ignore les liens de menu du site", () => {
  const entrees = analyserArmp(lire("armp-appels-offres.html"));
  // /avis/, /arbitrage/, /denonciation/... sont des rubriques, pas des avis.
  for (const e of entrees) {
    assert.doesNotMatch(e.lien, /armp\.bj\/(avis|arbitrage|denonciation|contact)\/$/);
  }
});

test("ARMP : n'invente aucune echeance", () => {
  // La vignette n'affiche pas de date limite : annoncer une deadline ici
  // reviendrait a faire passer la date de parution pour un delai.
  const entrees = analyserArmp(lire("armp-appels-offres.html"));
  assert.equal(entrees.filter((e) => e.deadline).length, 0);
});

// ------------------------------------------------------ lecture des dates --

test("une date nue garde le jour affiche, quel que soit le fuseau", () => {
  // Regression : "02 March 2026" etait relu en UTC depuis un fuseau positif
  // et devenait 2026-03-01. L'avis paraissait publie la veille.
  assert.equal(lireDateFlux("02 March 2026"), "2026-03-02");
  assert.equal(lireDateFlux("12 August 2024"), "2024-08-12");
  assert.equal(lireDateFlux("2026-09-16"), "2026-09-16");
});

test("une date avec fuseau est ramenee en UTC", () => {
  assert.equal(lireDateFlux("Tue, 26 Aug 2026 09:00:00 +0100"), "2026-08-26");
  assert.equal(lireDateFlux("Mon, 01 Sep 2026 23:30:00 GMT"), "2026-09-01");
  assert.equal(lireDateFlux("2026-09-16T00:00:00Z"), "2026-09-16");
});

test("une date illisible ne renvoie rien plutot qu'une date inventee", () => {
  assert.equal(lireDateFlux("prochainement"), null);
  assert.equal(lireDateFlux(""), null);
  assert.equal(lireDateFlux(null), null);
});

test("une echeance survit a l'heure collee derriere la date", () => {
  // Regression : "02 September 2026 12:00" devenait "2026 12 00", lu comme
  // une date ISO impossible, et l'echeance etait perdue.
  assert.equal(extraireDeadline("Closing date : 02 September 2026 12:00"),
               "2026-09-02");
  assert.equal(extraireDeadline("date limite : 15/10/2026 a 10:30"), "2026-10-15");
});

// ------------------------------------------- sources beninoises et regionales --

/**
 * Chaque source a son ancrage : le nombre d'avis de la fixture, et le fait
 * que les dates soient bien lues. Un analyseur qui casse renvoie zero, et
 * ces tests le disent avant la mise en production.
 */
const SOURCES: {
  nom: string;
  analyser: (h: string) => { titre: string; lien: string; publie: string | null;
                             deadline: string | null }[];
  fixture: string;
  minimum: number;
  hote: RegExp;
}[] = [
  { nom: "SBEE", analyser: analyserSbee, fixture: "sbee-marches.html",
    minimum: 5, hote: /marches-publics\.sbee\.bj/ },
  { nom: "SONEB", analyser: analyserSoneb, fixture: "soneb-marches.html",
    minimum: 20, hote: /web\.soneb\.bj\/marche-public\// },
  { nom: "ARAA", analyser: analyserAraa, fixture: "araa-marches.html",
    minimum: 6, hote: /www\.araa\.org\/fr\// },
  { nom: "BCEAO", analyser: analyserBceao, fixture: "bceao-marches.html",
    minimum: 10, hote: /www\.bceao\.int\/fr\/appels-offres\// },
  { nom: "ABE", analyser: analyserAbe, fixture: "abe-appels.html",
    minimum: 5, hote: /www\.abe\.bj/ },
];

for (const s of SOURCES) {
  test(`${s.nom} : lit les avis et pointe vers la source officielle`, () => {
    const avis = s.analyser(lire(s.fixture));
    assert.ok(avis.length >= s.minimum,
      `${avis.length} avis lus, au moins ${s.minimum} attendus`);
    for (const a of avis) {
      assert.ok(a.titre.length > 0, "titre vide");
      assert.match(a.lien, s.hote);
      if (a.publie) assert.match(a.publie, /^\d{4}-\d{2}-\d{2}$/);
      if (a.deadline) assert.match(a.deadline, /^\d{4}-\d{2}-\d{2}$/);
    }
  });
}

test("SBEE : lit reference, type et date limite au format jour-mois-annee", () => {
  const avis = analyserSbee(lire("sbee-marches.html"));
  const avecType = avis.filter((a) => a.type);
  assert.ok(avecType.length > 0, "aucun type de marche lu");
  // "06-10-2026 10:00:00" est en jour-mois-annee, pas mois-jour-annee.
  const avecDeadline = avis.filter((a) => a.deadline);
  assert.ok(avecDeadline.length >= avis.length - 1, "des echeances sont perdues");
  assert.ok(avis.every((a) => !a.resume || a.resume.length <= 400));
});

test("SONEB : chaque avis a sa date de parution et son echeance", () => {
  const avis = analyserSoneb(lire("soneb-marches.html"));
  assert.equal(avis.filter((a) => !a.publie).length, 0, "des dates manquent");
  assert.equal(avis.filter((a) => !a.deadline).length, 0, "des echeances manquent");
});

test("ARAA : l'echeance vient de l'attribut datetime, pas du texte", () => {
  const avis = analyserAraa(lire("araa-marches.html"));
  assert.equal(avis.filter((a) => !a.deadline).length, 0);
});

test("BCEAO : lit les mois ecrits en francais", () => {
  // "24 Aout 2026" et "08 Septembre 2026" : new Date() ne sait pas les lire.
  const avis = analyserBceao(lire("bceao-marches.html"));
  assert.ok(avis.filter((a) => a.publie).length > 0, "aucune date de parution");
  assert.equal(avis.filter((a) => !a.deadline).length, 0);
});

test("ABE : un libelle long n'est pas pris pour un type de marche", () => {
  const avis = analyserAbe(lire("abe-appels.html"));
  for (const a of avis) {
    if (a.type) assert.ok(a.type.length <= 60, `type de ${a.type.length} caracteres`);
  }
});

test("DEDRAS : lit les avis de l'ONG avec type, reference et echeance", () => {
  const avis = analyserDedras(lire("dedras-toutvoir.html"));
  assert.ok(avis.length >= 50, `${avis.length} avis lus, au moins 50 attendus`);
  assert.equal(avis.filter((a) => !a.deadline).length, 0, "des echeances manquent");
  assert.equal(avis.filter((a) => !a.publie).length, 0, "des dates manquent");
  for (const a of avis) {
    assert.match(a.lien, /eprocurement\.dedras\.org/);
    assert.match(String(a.deadline), /^\d{4}-\d{2}-\d{2}$/);
  }
});

test("DEDRAS : le titre commente en double n'est pas remonte", () => {
  // La page porte chaque titre deux fois : une fois dans un <h5> mis en
  // commentaire, une fois affiche. Sans retirer les commentaires on
  // creerait deux annonces pour un seul avis.
  const avis = analyserDedras(lire("dedras-toutvoir.html"));
  const titres = avis.map((a) => a.titre);
  assert.equal(new Set(titres).size >= titres.length - 2, true,
    "trop de titres identiques : les commentaires sont peut-etre lus");
});

test("AFD : lit les deux dates donnees ensemble dans le detail", () => {
  const appels = analyserAfd(lire("afd-appels-projets.html"));
  assert.ok(appels.length > 0, "aucun appel lu");
  for (const a of appels) {
    // "29 juillet 2026 - 9 octobre 2026" : ouverture puis cloture.
    assert.match(String(a.publie), /^\d{4}-\d{2}-\d{2}$/);
    assert.match(String(a.deadline), /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(String(a.deadline) > String(a.publie),
      "la cloture doit suivre l'ouverture");
    // Un financement n'est pas un marche : le type doit le dire.
    assert.equal(a.type, "Appel a projets");
    assert.match(a.lien, /www\.afd\.fr\/fr\/appels-a-projets\//);
  }
});

test("AFD et BAD ne se confondent pas malgre des noms proches", () => {
  // "afd.fr" et "afdb.org" : deux bailleurs differents, deux analyseurs.
  assert.equal(analyseurHtml("HTML:afd.fr")?.name, "analyserAfd");
  assert.equal(analyseurHtml("HTML:afdb.org")?.name, "analyserAfdb");
});

// --------------------------------------- alertes du tableau de bord --

/** Opportunite minimale, avec une echeance a N jours d'aujourd'hui. */
function dans(jours: number, extra: Partial<Opportunite> = {}): Opportunite {
  const d = new Date(REFERENCE + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + jours);
  return {
    titre: `Marche a ${jours} jour(s)`,
    organisation: "SBEE",
    deadline: d.toISOString().slice(0, 10),
    ...extra,
  };
}

const REFERENCE = "2026-09-15";

test("les echeances a trois jours ou moins sont urgentes", () => {
  const liste = alertes([dans(0), dans(1), dans(3)], REFERENCE);
  assert.equal(liste.length, 3);
  for (const a of liste) assert.equal(a.niveau, "urgent");
  // Le jour meme se dit autrement qu'un decompte.
  assert.match(liste[0].detail, /dernier jour/i);
});

test("les echeances de quatre a sept jours sont signalees sans alarmer", () => {
  const liste = alertes([dans(4), dans(7)], REFERENCE);
  assert.equal(liste.length, 2);
  for (const a of liste) assert.equal(a.niveau, "bientot");
});

test("au-dela de sept jours, rien ne remonte", () => {
  assert.deepEqual(alertes([dans(8), dans(60)], REFERENCE), []);
});

test("une echeance passee ne remonte qu'une semaine", () => {
  const recente = alertes([dans(-2)], REFERENCE);
  assert.equal(recente.length, 1);
  assert.equal(recente[0].niveau, "expire");
  // Un marche rate il y a trois mois n'a plus rien a dire.
  assert.deepEqual(alertes([dans(-90)], REFERENCE), []);
});

test("une opportunite sans echeance demande une verification", () => {
  const liste = alertes([{ titre: "Avis sans date", deadline: null }], REFERENCE);
  assert.equal(liste.length, 1);
  assert.equal(liste[0].niveau, "nouvelle");
  assert.match(liste[0].detail, /verifier/i);
});

test("le plus pressant s'affiche en premier", () => {
  const liste = alertes([dans(6), dans(-1), dans(1), dans(3)], REFERENCE);
  assert.deepEqual(liste.map((a) => a.niveau),
                   ["urgent", "urgent", "bientot", "expire"]);
  // A niveau egal, l'echeance la plus proche d'abord.
  assert.ok(Number(liste[0].joursRestants) < Number(liste[1].joursRestants));
});

test("le tableau de bord ignore les temoins d'email deja envoye", () => {
  // Un email J-3 parti hier ne doit pas faire disparaitre l'echeance de
  // l'ecran : l'email est un evenement, l'ecran est un etat.
  const liste = alertes([dans(2, { notifJ3: true, notifJ7: true })], REFERENCE);
  assert.equal(liste.length, 1);
  assert.equal(liste[0].niveau, "urgent");
});

test("les alertes sont plafonnees pour ne pas noyer l'ecran", () => {
  const beaucoup = Array.from({ length: 50 }, () => dans(2));
  assert.equal(alertes(beaucoup, REFERENCE).length, 20);
  assert.equal(alertes(beaucoup, REFERENCE, 5).length, 5);
});

test("le compteur par niveau suit la liste", () => {
  const liste = alertes([dans(1), dans(2), dans(6), dans(-1)], REFERENCE);
  assert.deepEqual(compterAlertes(liste),
                   { urgent: 2, bientot: 1, expire: 1, nouvelle: 0 });
});

// ------------------------------------------------------ notifications Telegram --

const OPP = {
  titre: "Acquisition d'equipements <informatiques> & reseaux",
  organisation: "SBEE",
  pays: "Benin",
  deadline: "2026-09-20",
  joursRestants: 2,
  lien: "https://marches-publics.sbee.bj/",
};

test("le message Telegram echappe le HTML du titre", () => {
  // Telegram interprete le HTML : un "<" non echappe casse le message.
  const m = messageTelegram("j3", OPP);
  assert.ok(m.includes("&lt;informatiques&gt;"), m);
  assert.ok(m.includes("&amp;"), m);
  assert.ok(!m.includes("<informatiques>"));
});

test("le message Telegram tient l'essentiel : titre, echeance, lien", () => {
  const m = messageTelegram("j3", OPP);
  assert.ok(m.includes("2026-09-20"));
  assert.ok(m.includes("dans 2 jours"));
  assert.ok(m.includes("https://marches-publics.sbee.bj/"));
  assert.ok(m.includes("SBEE"));
  // Court : on le lit sur un telephone.
  assert.ok(m.length < 400, `${m.length} caracteres`);
});

test("le message Telegram dit quand l'echeance manque", () => {
  const m = messageTelegram("nouvelle", { titre: "Avis sans date" });
  assert.match(m, /a verifier sur la source/i);
});

test("le jour meme et l'echeance passee se disent autrement", () => {
  assert.match(messageTelegram("j1", { ...OPP, joursRestants: 0 }),
               /aujourd'hui/);
  assert.match(messageTelegram("expire", { ...OPP, joursRestants: -3 }),
               /passee/);
});

test("le digest Telegram ne depasse pas la limite de l'API", () => {
  // Telegram refuse au-dela de 4096 caracteres : le message serait perdu.
  const beaucoup = Array.from({ length: 200 }, (_, i) => ({
    titre: `Marche numero ${i} avec un intitule volontairement long`,
    deadline: "2026-10-01",
  }));
  const m = messageTelegramDigest(beaucoup);
  assert.ok(m.length < 4096, `${m.length} caracteres`);
  assert.ok(m.includes("200 nouvelles opportunites"));
  assert.match(m, /et 190 autres/);
});

test("le canal Telegram poste sur la bonne adresse", async () => {
  const appels: { url: string; corps: Record<string, unknown> }[] = [];
  const faux = (async (url: string | URL | Request, init?: RequestInit) => {
    appels.push({
      url: String(url),
      corps: JSON.parse(String(init?.body)) as Record<string, unknown>,
    });
    return { ok: true, status: 200 } as Response;
  }) as unknown as typeof fetch;

  await envoyeurTelegram("JETON", "-100123", faux).publier("bonjour");

  assert.equal(appels.length, 1);
  assert.ok(appels[0].url.endsWith("/botJETON/sendMessage"), appels[0].url);
  assert.equal(appels[0].corps.chat_id, "-100123");
  assert.equal(appels[0].corps.parse_mode, "HTML");
});

test("une erreur Telegram remonte sa cause, jamais le jeton", async () => {
  const faux = (async () => ({
    ok: false, status: 400,
    json: async () => ({ ok: false, description: "chat not found" }),
  } as unknown as Response)) as unknown as typeof fetch;

  await assert.rejects(
    () => envoyeurTelegram("JETON-SECRET", "mauvais", faux).publier("test"),
    (e: Error) => {
      assert.match(e.message, /400/);
      assert.match(e.message, /chat not found/);
      // Un jeton dans un journal, c'est quelqu'un qui ecrit a votre place.
      assert.ok(!e.message.includes("JETON-SECRET"), e.message);
      return true;
    });
});

// --------------------------------------------------- resolution des methodes --

test("les methodes de source pointent vers le bon analyseur", () => {
  assert.equal(analyseurHtml("HTML:gouv.bj")?.name, "analyserGouvBj");
  assert.equal(analyseurHtml("HTML:afdb.org")?.name, "analyserAfdb");
  assert.equal(analyseurHtml("HTML:enabel.be")?.name, "analyserEnabel");
  assert.equal(analyseurHtml("HTML:armp.bj")?.name, "analyserArmp");
  assert.equal(analyseurHtml("HTML:sbee.bj")?.name, "analyserSbee");
  assert.equal(analyseurHtml("HTML:soneb.bj")?.name, "analyserSoneb");
  assert.equal(analyseurHtml("HTML:araa.org")?.name, "analyserAraa");
  assert.equal(analyseurHtml("HTML:bceao.int")?.name, "analyserBceao");
  assert.equal(analyseurHtml("HTML:abe.bj")?.name, "analyserAbe");
  assert.equal(analyseurHtml("HTML:dedras.org")?.name, "analyserDedras");
  assert.equal(analyseurJson("JSON:worldbank.org")?.name, "analyserWorldBank");

  // Une methode inconnue ne doit pas etre confondue avec une autre.
  assert.equal(analyseurHtml("HTML:inconnu.fr"), null);
  assert.equal(analyseurJson("JSON:inconnu.fr"), null);
  assert.equal(analyseurHtml("RSS"), null);
  assert.equal(analyseurJson("HTML:gouv.bj"), null);
});
