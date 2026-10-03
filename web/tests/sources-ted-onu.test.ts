/**
 * TED, la Division des achats de l'ONU, et les calendriers d'achats rangés
 * dans les plans. Mesures du 2026-09-14. Jumeau des controles [TED], [ONU]
 * et [Plans] de tests/test_logic.js.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  analyserTed, analyseurJson, formeRequete, fusionnerPlans, plansDepuisAnnonces,
  type LignePlan,
} from "../src/lib/domain/json";
import {
  analyserNationsUniesEoi, analyserUnicefSupply, analyseurHtml, dateEnToutesLettres, lireCsv,
} from "../src/lib/domain/html";
import { estMethodePlans } from "../src/lib/domain/regles";

const fixture = (nom: string) =>
  readFileSync(join(process.cwd(), "..", "tests", "fixtures", nom), "utf8");

const jourRelatif = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

test("TED : les avis ouest-africains, sans ce qui est deja suivi", () => {
  const donnees = JSON.parse(fixture("ted-notices.json"));
  for (const n of donnees.notices) {
    n["deadline-receipt-tender-date-lot"] = (n["deadline-receipt-tender-date-lot"] ?? [])
      .map(() => `${jourRelatif(20)}+01:00`);
  }
  const lus = analyserTed(JSON.stringify(donnees));
  assert.ok(lus.length > 0);
  assert.ok(!lus.some((e) => /Internationale Zusammenarbeit/.test(e.organisation ?? "")), "GIZ ecartee");
  assert.ok(!lus.some((e) => /Krajowy/.test(e.organisation ?? "")), "marche mondial ecarte");
  assert.ok(lus.every((e) => /^https:\/\/ted\.europa\.eu\//.test(e.lien ?? "")));
  assert.ok(lus.every((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.deadline ?? "")));
  assert.ok(lus.some((e) => e.pays === "Benin"));
  assert.ok(!lus.some((e) => /^(Allemagne|Belgique|France|Suisse|Bénin) – /.test(e.titre)));
  assert.equal(analyseurJson("JSON:ted.europa.eu")?.name, "analyserTed");
});

test("TED : un POST sur les echeances a venir", () => {
  const requete = formeRequete("JSON:ted.europa.eu", 1);
  assert.equal(requete?.methode, "POST");
  const corps = JSON.parse(requete?.corps ?? "{}");
  assert.ok(corps.query.includes(
    `deadline-receipt-tender-date-lot>=${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`));
});

test("ONU : le CSV des manifestations d'interet", () => {
  const MOIS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const enLettres = (iso: string) => {
    const p = iso.split("-");
    return `${Number(p[2])} ${MOIS_EN[Number(p[1]) - 1]} ${p[0]}`;
  };
  const brut = fixture("unpd-eoi.csv");
  const corps = brut.replace(/"\d{1,2} [A-Z][a-z]+ \d{4}","\d{1,2} [A-Z][a-z]+ \d{4}"/g,
    `"${enLettres(jourRelatif(-2))}","${enLettres(jourRelatif(15))}"`);
  const lus = analyserNationsUniesEoi(corps);
  assert.equal(lus.length, lireCsv(brut).length - 1);
  assert.ok(lus.some((e) => e.titre.includes(",")), "virgule dans un titre");
  assert.ok(lus.every((e) => e.deadline === jourRelatif(15)));
  assert.ok(lus.every((e) => /\.pdf$/.test(e.pdf ?? "")));
  assert.equal(analyserNationsUniesEoi("<html><body>x</body></html>").length, 0);
  assert.equal(dateEnToutesLettres("30 September 2026"), "2026-09-30");
  assert.equal(dateEnToutesLettres("31 Feb 2026"), null);
  assert.equal(analyseurHtml("HTML:un.org/procurement")?.name, "analyserNationsUniesEoi");
});

test("Plans : un calendrier UNICEF devient une ligne de plan", () => {
  const entrees = analyserUnicefSupply(fixture("unicef-tenders.html"));
  const lignes = plansDepuisAnnonces(entrees, { code: "UNICEF-SUPPLY", nom: "UNICEF Supply Division" });
  assert.ok(lignes.length > 0);
  assert.ok(lignes.every((r) => r.source === "UNICEF-SUPPLY" && /^https:\/\//.test(r.lien ?? "")));
  assert.equal(new Set(lignes.map((r) => r.reference)).size, lignes.length);
  assert.ok(estMethodePlans("PLANS:unicef.org/supply"));
  assert.ok(!estMethodePlans("HTML:unicef.org/supply"));

  const base = { autorite: "", objet: "O", type: "", mode: "", montant: "", demarrage: "", bailleur: "", annee: "" };
  const existantes: LignePlan[] = [
    { ...base, reference: "D-1", source: "BJ-DNCMP", lancement: jourRelatif(5) },
    { ...base, reference: "D-0", lancement: jourRelatif(9) },
    { ...base, reference: "UNICEF-SUPPLY-retire", source: "UNICEF-SUPPLY", lancement: "" },
    { ...base, reference: "X-1", source: "AUTRE-CALENDRIER", lancement: "" },
  ];
  const f = fusionnerPlans(existantes, lignes, jourRelatif(0), ["UNICEF-SUPPLY"]);
  assert.ok(!f.some((r) => r.reference === "UNICEF-SUPPLY-retire"));
  assert.ok(f.some((r) => r.reference === "X-1"));
  assert.ok(f.some((r) => r.reference === "D-0"));
  assert.ok(f[0].lancement && !f[f.length - 1].lancement);
});
