/**
 * Un resume se lit. Mesure du 2026-09-14 : dans les mails d'un client, des
 * resumes coupes au milieu d'un mot, sans ponctuation, aux paragraphes
 * soudes. Jumeau des controles [Core] de tests/test_logic.js.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { resumeLisible } from "../src/lib/domain/regles";
import { premiereSection, texteAvecLignes } from "../src/lib/domain/rss";
import { analyserFicheJobrelais } from "../src/lib/domain/html";
import { analyserFicheFundpilote } from "../src/lib/domain/json";

const longue = "Appel a propositions pour des cooperatives agricoles du Benin, "
  + "du Togo et du Niger, avec un accompagnement technique, un budget de dix "
  + "millions et un suivi sur trois ans.";

test("coupe a la source : on revient a la derniere phrase entiere", () => {
  assert.equal(resumeLisible(`${longue} Les candidats doivent depends on ...`), longue);
});

test("trop long sans phrase : coupe a un mot, et le dit", () => {
  const r = resumeLisible("mot ".repeat(300));
  assert.match(r, /\w\.\.\.$/);
  assert.ok(r.length <= 403);
});

test("deux morceaux relies par un tiret deviennent deux phrases", () => {
  assert.equal(resumeLisible("Type : Marche de fournitures - DAO n°378 du 26/08/2026"),
    "Type : Marche de fournitures. DAO n°378 du 26/08/2026.");
  assert.equal(resumeLisible("Please use reference PIN_CO_26_004 – ICT Materials in all communications"),
    "Please use reference PIN_CO_26_004 – ICT Materials in all communications.");
  assert.equal(resumeLisible("Periode : 29 juillet 2026 - 9 octobre 2026"),
    "Periode : 29 juillet 2026 - 9 octobre 2026.");
});

test("paragraphes, bruit, pictogrammes et titre repete", () => {
  assert.equal(resumeLisible("Contexte\nIB bank lance un appel"),
    "Contexte. IB bank lance un appel.");
  assert.equal(resumeLisible("Texte utile.\nThe post Texte appeared first on Site.\nRead more"),
    "Texte utile.");
  assert.ok(!resumeLisible("\u{1F4DD} Programme de recherche").includes("\u{1F4DD}"));
  assert.equal(resumeLisible("Mon titre\nDetail utile", "Mon titre"), "Detail utile.");
});

test("un resume deja lisible ne change pas", () => {
  for (const s of [`${longue} coupe ...`, "mot ".repeat(300), "A - B : c", "x:", ""]) {
    assert.equal(resumeLisible(resumeLisible(s)), resumeLisible(s));
  }
});

test("un paragraphe HTML reste une ligne", () => {
  assert.equal(texteAvecLignes("<p>Contexte</p><p>IB bank <b>lance</b></p><ul><li>un</li><li>deux</li></ul>"),
    "Contexte\nIB bank lance\nun\ndeux");
});

test("JobRelais : le resume vient de la page, pas du JSON-LD soude", () => {
  const html = readFileSync(join(process.cwd(), "..", "tests", "fixtures", "jobrelais-fiche.html"), "utf8");
  const resume = resumeLisible(analyserFicheJobrelais(html).resume);
  assert.ok(!resume.includes("CANDIDATURESAmnesty"), resume);
  assert.ok(resume.includes("Amnesty International Togo."), resume);
  assert.ok(resume.length <= 403);
});

test("Fundpilote : la premiere section seulement, sans intertitre", () => {
  const fiche = analyserFicheFundpilote(JSON.stringify({
    application_url: "https://exemple.org/appel",
    description: "\u{1F4DD} Description\n\nProgramme de subventions d'amorcage.\n\n"
      + "Environ 8 subventions.\n\n\u{1F30D} Zones ciblees\n\nRwanda, Angola.\n\n"
      + "\u{1F4C5} Date limite\n\nLundi 14 septembre 2026. Demarrage des projets : 1er",
    how_to_apply: "\u{1F4EE} Comment postuler\n\nSoumission via le portail.\n\n\u{1F4B0} Montant\n\n30 000 USD",
  }));
  assert.equal(premiereSection("\u{1F4DD} Description\n\nA.\n\nB.\n\n\u{1F30D} Zones\n\nC."), "A.\nB.");
  assert.equal(resumeLisible(fiche.resume),
    "Programme de subventions d'amorcage. Environ 8 subventions. Candidature : Soumission via le portail.");
});
