/**
 * TenderPilot - l'intelligence optionnelle.
 *
 *     cd web && npx tsx --test tests/llm.test.ts
 *
 * Deux familles de tests portent tout le reste.
 *
 * Celle sur les dates, d'abord. Le LLM n'a pas le droit d'en produire une,
 * et il ne suffit pas de le lui ecrire dans l'invite : il faut que le code
 * rende la chose impossible. Le test lui fait donc renvoyer une echeance
 * interdite et verifie qu'elle n'atteint pas la fiche.
 *
 * Celle sur l'empreinte ensuite, qui rejoue une mesure reelle : deux
 * lectures d'enabel.be a trois secondes d'intervalle ne different que par un
 * compteur anti-spam loge dans un attribut. Si l'empreinte bougeait pour si
 * peu, le LLM serait rappele a chaque collecte et l'economie serait nulle.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  llmActif,
  texteVisible,
  empreinteContenu,
  pageAChange,
  urlRequete,
  entetesRequete,
  corpsRequete,
  lireReponse,
  extraireJson,
  enLots,
  choisirDansListe,
  appliquerClassement,
  filtrerPertinentes,
  filtrerOpportunites,
  invitePourClassement,
  SECTEURS,
  TYPES,
  LLM_DEFAUTS,
  ENDPOINTS_CONNUS,
  type ConfigLlm,
} from "../src/lib/domain/llm";

const config = (extra: Partial<ConfigLlm> = {}): ConfigLlm => ({
  actif: true,
  dialecte: "openai",
  endpoint: ENDPOINTS_CONNUS.openai,
  cle: "cle-de-test",
  modele: LLM_DEFAUTS.modele,
  maxAppelsJour: LLM_DEFAUTS.maxAppelsJour,
  tailleLot: LLM_DEFAUTS.tailleLot,
  ...extra,
});

const entree = (extra: Record<string, unknown> = {}) => ({
  titre: "Fourniture de materiel informatique",
  lien: "https://exemple.org/avis/1",
  publie: "2026-08-20" as string | null,
  resume: "Avis initial",
  deadline: "2026-09-25" as string | null,
  secteur: undefined as string | null | undefined,
  type: undefined as string | null | undefined,
  pertinent: undefined as boolean | undefined,
  opportunite: undefined as boolean | undefined,
  ...extra,
});

// --------------------------------------------------------- L'INTERDICTION

test("le LLM ne peut pas ecrire une deadline, meme s'il en renvoie une", () => {
  const lot = [entree()];

  // Reponse deliberement fautive : le modele a ignore l'interdiction.
  const reponse = [{
    i: 0,
    secteur: "Numerique et technologie",
    type: "Appel d offres",
    resume: "Achat de postes de travail",
    pertinent: true,
    deadline: "2030-01-01",
    publie: "2030-01-01",
    echeance: "2030-01-01",
  }];

  const [sortie] = appliquerClassement(lot, reponse);

  assert.equal(sortie.deadline, "2026-09-25", "la deadline d'origine doit survivre");
  assert.equal(sortie.publie, "2026-08-20", "la date de publication doit survivre");
  assert.equal(sortie.secteur, "Numerique et technologie");
  assert.equal(sortie.resume, "Achat de postes de travail");
});

test("une entree sans deadline n'en recoit pas une du modele", () => {
  const lot = [entree({ deadline: null })];
  const [sortie] = appliquerClassement(lot, [{ i: 0, deadline: "2030-01-01" }]);
  assert.equal(sortie.deadline, null);
});

test("l'invite n'autorise aucun champ de date", () => {
  const invite = invitePourClassement([{ titre: "Un avis" }], "le Benin");
  assert.match(invite, /AUCUNE date/);
  assert.ok(!/"deadline"/.test(invite), "le format de sortie ne doit pas nommer deadline");
});

// ---------------------------------------------------------- LE VOCABULAIRE

test("un libelle hors vocabulaire est rejete, pas range dans Autre", () => {
  assert.equal(choisirDansListe("Tech", SECTEURS), null);
  assert.equal(choisirDansListe("IT", SECTEURS), null);
  assert.equal(choisirDansListe("Sante", SECTEURS), "Sante");
  // La casse ne doit pas faire perdre une valeur juste.
  assert.equal(choisirDansListe("sante", SECTEURS), "Sante");
  assert.equal(choisirDansListe("AMI", TYPES), "AMI");
});

test("un secteur invente laisse la valeur precedente en place", () => {
  const lot = [entree({ secteur: "Energie" })];
  const [sortie] = appliquerClassement(lot, [{ i: 0, secteur: "Trucs divers" }]);
  assert.equal(sortie.secteur, "Energie");
});

// ------------------------------------------------------------ L'EMPREINTE

test("un compteur anti-spam dans un attribut ne change pas l'empreinte", () => {
  // Mesure du 2026-09-01 sur enabel.be : entre deux lectures a trois
  // secondes d'intervalle, seul ak_js bouge.
  const page = (jeton: string) => `
    <html><head><style>.a{color:red}</style></head><body>
      <div class="card--tenders"><p class="h5">2204BEN-10373 - Marche de fournitures</p></div>
      <input type="hidden" id="ak_js_1" name="ak_js" value="${jeton}" />
      <script>var t=${jeton};</script>
    </body></html>`;

  assert.equal(
    empreinteContenu(page("159")),
    empreinteContenu(page("1")),
    "l'empreinte doit ignorer le balisage et les scripts",
  );
});

test("une annonce ajoutee change l'empreinte", () => {
  const avant = "<div><p>Avis A</p></div>";
  const apres = "<div><p>Avis A</p><p>Avis B</p></div>";
  assert.notEqual(empreinteContenu(avant), empreinteContenu(apres));
});

test("l'empreinte est stable d'un appel a l'autre", () => {
  const html = "<div><p>Avis A</p></div>";
  assert.equal(empreinteContenu(html), empreinteContenu(html));
});

test("texteVisible retire scripts, styles et commentaires", () => {
  const html = "<style>x{}</style><!-- note --><script>var a=1;</script><p>Titre</p>";
  assert.equal(texteVisible(html), "Titre");
});

test("une page jamais lue est toujours a lire", () => {
  assert.equal(pageAChange("", "abc"), true);
  assert.equal(pageAChange(null, "abc"), true);
  assert.equal(pageAChange(undefined, "abc"), true);
});

test("une page inchangee ne reveille pas le LLM", () => {
  assert.equal(pageAChange("abc123", "abc123"), false);
  assert.equal(pageAChange("  abc123  ", "abc123"), false);
  assert.equal(pageAChange("abc123", "def456"), true);
});

// ------------------------------------------------------------ LES DIALECTES

test("openai : cle en en-tete Bearer, endpoint inchange", () => {
  const c = config();
  assert.equal(urlRequete(c), ENDPOINTS_CONNUS.openai);
  assert.equal(entetesRequete(c).authorization, "Bearer cle-de-test");
  const corps = corpsRequete(c, "salut") as Record<string, unknown>;
  assert.equal(corps.model, LLM_DEFAUTS.modele);
});

test("anthropic : cle en x-api-key, jamais en Bearer", () => {
  const c = config({ dialecte: "anthropic", endpoint: ENDPOINTS_CONNUS.anthropic });
  const entetes = entetesRequete(c);
  assert.equal(entetes["x-api-key"], "cle-de-test");
  assert.equal(entetes.authorization, undefined);
  assert.equal(entetes["anthropic-version"], "2023-06-01");
});

test("gemini : modele dans le chemin, cle en parametre d'URL", () => {
  const c = config({
    dialecte: "gemini",
    endpoint: ENDPOINTS_CONNUS.gemini,
    modele: "gemini-2.0-flash",
  });
  const url = urlRequete(c);
  assert.match(url, /\/gemini-2\.0-flash:generateContent\?key=cle-de-test$/);
  assert.equal(entetesRequete(c).authorization, undefined);
});

test("une barre finale en trop dans l'endpoint ne casse pas l'URL", () => {
  const c = config({ dialecte: "gemini", endpoint: ENDPOINTS_CONNUS.gemini + "///" });
  assert.ok(!urlRequete(c).includes("//gemini"), urlRequete(c));
});

test("chaque dialecte sait relire sa propre reponse", () => {
  assert.equal(
    lireReponse("openai", JSON.stringify({ choices: [{ message: { content: "A" } }] })),
    "A");
  assert.equal(
    lireReponse("anthropic", JSON.stringify({ content: [{ text: "B" }] })),
    "B");
  assert.equal(
    lireReponse("gemini",
      JSON.stringify({ candidates: [{ content: { parts: [{ text: "C" }] } }] })),
    "C");
});

test("une reponse illisible ne fait pas tomber la collecte", () => {
  assert.equal(lireReponse("openai", "pas du json"), "");
  assert.equal(lireReponse("openai", "{}"), "");
  assert.equal(lireReponse("anthropic", JSON.stringify({ content: [] })), "");
});

// -------------------------------------------------------- LA MISE EN FORME

test("le JSON entoure de balises Markdown est recupere", () => {
  assert.deepEqual(extraireJson('```json\n[{"i":0}]\n```'), [{ i: 0 }]);
  assert.deepEqual(extraireJson('```\n[{"i":0}]\n```'), [{ i: 0 }]);
});

test("le JSON precede d'un bavardage est recupere", () => {
  assert.deepEqual(
    extraireJson('Voici le resultat :\n[{"i":0,"secteur":"Sante"}]'),
    [{ i: 0, secteur: "Sante" }]);
});

test("une reponse sans JSON exploitable renvoie null", () => {
  assert.equal(extraireJson("je ne sais pas"), null);
  assert.equal(extraireJson(""), null);
});

// ------------------------------------------------------------- LA ROBUSTESSE

test("un verdict manquant ne decale pas le lot", () => {
  const lot = [
    entree({ titre: "A", deadline: "2026-09-01" }),
    entree({ titre: "B", deadline: "2026-09-02" }),
    entree({ titre: "C", deadline: "2026-09-03" }),
  ];
  // Le modele a oublie l'annonce 1 : se fier a l'ordre decalerait tout.
  const sortie = appliquerClassement(lot, [
    { i: 0, secteur: "Sante" },
    { i: 2, secteur: "Energie" },
  ]);
  assert.equal(sortie[0].secteur, "Sante");
  assert.equal(sortie[1].secteur, undefined);
  assert.equal(sortie[2].secteur, "Energie");
  assert.equal(sortie[1].titre, "B");
  assert.equal(sortie[2].deadline, "2026-09-03");
});

test("un index hors bornes est ignore", () => {
  const lot = [entree()];
  const sortie = appliquerClassement(lot, [
    { i: 99, secteur: "Sante" }, { i: -1, secteur: "Sante" }, { i: 0, secteur: "Energie" },
  ]);
  assert.equal(sortie.length, 1);
  assert.equal(sortie[0].secteur, "Energie");
});

test("une reponse qui n'est pas un tableau laisse le lot intact", () => {
  const lot = [entree({ secteur: "Energie" })];
  assert.equal(appliquerClassement(lot, null)[0].secteur, "Energie");
  assert.equal(appliquerClassement(lot, { i: 0 })[0].secteur, "Energie");
});

test("le doute profite a l'annonce : sans verdict, elle est conservee", () => {
  const gardees = filtrerPertinentes([
    { titre: "vue et jugee hors zone", pertinent: false },
    { titre: "vue et jugee pertinente", pertinent: true },
    { titre: "jamais vue par le modele" },
  ] as Array<{ titre: string; pertinent?: boolean }>);
  assert.deepEqual(gardees.map((e) => e.titre),
    ["vue et jugee pertinente", "jamais vue par le modele"]);
});

// ------------------------------------------------------ CE QUI EST UN APPEL

test("une FAQ sur un appel n est pas l appel", () => {
  // Cas reel, verifie avec Mistral le 2026-09-02 : sur le flux d Open
  // Technology Fund, "Request for Proposals: Security Lab" est un appel,
  // "Frequently Asked Questions: Security Lab RFP" n en est pas un. Un
  // filtre par mots-cles retenait les deux - les deux contiennent "RFP".
  const lot = [
    entree({ titre: "Request for Proposals: Security Lab" }),
    entree({ titre: "Frequently Asked Questions: Security Lab RFP" }),
    entree({ titre: "How OTF Security Lab Improves Internet Freedom" }),
  ];
  const sortie = appliquerClassement(lot, [
    { i: 0, opportunite: true }, { i: 1, opportunite: false },
    { i: 2, opportunite: false },
  ]);
  assert.deepEqual(sortie.map((e) => e.opportunite), [true, false, false]);
  assert.equal(filtrerOpportunites(sortie).length, 1);
});

test("une annonce que le modele n a pas jugee est conservee", () => {
  // Le doute profite a l annonce : mieux vaut une ligne de trop qu un
  // marche manque.
  const gardees = filtrerOpportunites([
    { titre: "jugee article", opportunite: false },
    { titre: "jugee appel", opportunite: true },
    { titre: "jamais vue" },
  ] as Array<{ titre: string; opportunite?: boolean }>);
  assert.deepEqual(gardees.map((e) => e.titre), ["jugee appel", "jamais vue"]);
});

test("le tri final exige les deux verdicts", () => {
  const gardees = filtrerPertinentes([
    { titre: "appel ouvert au Benin", opportunite: true, pertinent: true },
    { titre: "appel reserve a un autre pays", opportunite: true, pertinent: false },
    { titre: "article sur le Benin", opportunite: false, pertinent: true },
  ] as Array<{ titre: string; opportunite?: boolean; pertinent?: boolean }>);
  assert.deepEqual(gardees.map((e) => e.titre), ["appel ouvert au Benin"]);
});

test("l invite demande si l on PEUT CANDIDATER, pas si ca parle du pays", () => {
  // Mesure du 2026-09-02 : formulee "l avis concerne-t-il le Benin", la
  // question faisait rejeter un appel mondial d Open Technology Fund
  // auquel une structure beninoise peut parfaitement candidater.
  const invite = invitePourClassement([{ titre: "Un avis" }], "le Benin");
  assert.match(invite, /PEUT CANDIDATER/);
  assert.match(invite, /appel mondial/);
  assert.match(invite, /opportunite/);
  assert.match(invite, /FAQ/);
});

// ------------------------------------------------------------ L'ACTIVATION

test("sans cle, sans modele ou sans endpoint, le LLM reste eteint", () => {
  assert.equal(llmActif(config()), true);
  assert.equal(llmActif(config({ actif: false })), false);
  assert.equal(llmActif(config({ cle: "" })), false);
  assert.equal(llmActif(config({ cle: "   " })), false);
  assert.equal(llmActif(config({ modele: "" })), false);
  assert.equal(llmActif(config({ endpoint: "" })), false);
  assert.equal(llmActif(null), false);
  assert.equal(llmActif(undefined), false);
});

// ---------------------------------------------------------------- LES LOTS

test("les lots respectent la taille demandee", () => {
  const elements = Array.from({ length: 65 }, (_, i) => i);
  const lots = enLots(elements, 30);
  assert.equal(lots.length, 3);
  assert.deepEqual(lots.map((l) => l.length), [30, 30, 5]);
  assert.deepEqual(lots.flat(), elements);
});

test("une taille de lot absurde ne provoque pas de boucle infinie", () => {
  assert.equal(enLots([1, 2, 3], 0).length, 3);
  assert.equal(enLots([1, 2, 3], -5).length, 3);
  assert.equal(enLots([], 30).length, 0);
});
