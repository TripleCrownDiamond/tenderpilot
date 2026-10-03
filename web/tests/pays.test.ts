/**
 * Les portails nationaux ajoutés pour vendre dans huit pays : l'ARMP du
 * Cameroun et la DNCCP du Togo. Mesures du 2026-09-15. Jumeau du contrôle
 * [Pays] de tests/test_logic.js.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { analyserArmpCameroun, analyseurHtml } from "../src/lib/domain/html";
import { analyserFlux } from "../src/lib/domain/rss";

const fixture = (nom: string) =>
  readFileSync(join(process.cwd(), "..", "tests", "fixtures", nom), "utf8");

const jourRelatif = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

test("Cameroun : seuls les appels d'offres datés de l'ARMP", () => {
  const futur = jourRelatif(20).split("-").reverse().join("-");
  const corps = fixture("armp-cameroun-aoi.html").replace(
    /(Date de cl[ôo]ture\s*:\s*<\/div>\s*<div class="d-table-cell">\s*)\d{2}-\d{2}-\d{4}/g, `$1${futur}`);
  const attendus = corps.split("list-group-item-action").slice(1).filter((b) =>
    /details\?type_publication=AO&/.test(b)
    && /Date de cl[ôo]ture\s*:\s*<\/div>\s*<div class="d-table-cell">\s*\d/.test(b)).length;

  const lus = analyserArmpCameroun(corps);
  assert.ok(attendus > 0);
  assert.equal(lus.length, attendus);
  assert.ok(lus.every((e) => /type_publication=AO&/.test(e.lien ?? "")));
  assert.ok(lus.every((e) => e.deadline === jourRelatif(20)));
  assert.ok(lus.every((e) => e.pays === "Cameroun" && e.organisation));
  assert.ok(lus.some((e) => /FCFA/.test(e.budget ?? "")));
  assert.equal(analyseurHtml("HTML:armp.cm")?.name, "analyserArmpCameroun");
});

test("Togo : le flux de la DNCCP se lit", () => {
  assert.equal(analyserFlux(fixture("dnccp-togo.xml")).length, 10);
});
