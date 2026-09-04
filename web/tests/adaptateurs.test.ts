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
  analyserEnabel, analyserExpertiseFrance, analyserGiz,
  analyserGrandChallenges, analyserJobrelais, analyserPlanInternational,
  analyseurFiche, fusionnerFiche, analyserSbee,
  analyserSoneb, analyseurHtml, analyserUngm,
  dateAllemande, dateUngm,
} from "../src/lib/domain/html";
import {
  analyserEuropa, analyserFundpilote, analyserNigerMarches, analyserWorldBank,
  analyseurJson, budgetFourchette, budgetSimple, formeRequete,
} from "../src/lib/domain/json";
import {
  decoderEntites, extraireDeadline, lireDateFlux, nettoyerLien,
} from "../src/lib/domain/rss";
import {
  alertes, compterAlertes, CONFIG_DEFAUT, TYPES_ANNONCE, type Opportunite,
} from "../src/lib/domain/regles";
import { collecterSource } from "../src/lib/run";
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

// --------------------------------------------------------------------- GIZ --

test("GIZ : lit le tableau des avis", () => {
  const entrees = analyserGiz(lire("giz-ausschreibungen.html"));
  assert.ok(entrees.length > 0, "aucun avis lu");
  for (const e of entrees) {
    assert.ok(e.titre.length > 0);
    assert.match(e.lien, /^https:\/\/ausschreibungen\.giz\.de\/.*pid=\d+$/);
  }
});

test("GIZ : ecarte les marches deja attribues", () => {
  const html = lire("giz-ausschreibungen.html");
  const attribues = (html.match(/Vergebener Auftrag/g) ?? []).length;
  assert.ok(attribues > 0, "la fixture ne contient aucun marche attribue");

  const lignes = (html.match(/projectForwarding\.do\?pid=/g) ?? []).length;
  assert.equal(analyserGiz(html).length, lignes - attribues);
});

test("GIZ : toutes les annonces retenues portent une echeance", () => {
  // Mesure du 2026-09-02 : sur les 224 avis des douze pages, les 133 sans
  // echeance sont EXACTEMENT les marches attribues et les avenants.
  for (const e of analyserGiz(lire("giz-ausschreibungen.html"))) {
    assert.match(String(e.deadline), /^\d{4}-\d{2}-\d{2}$/, e.titre);
  }
});

test("GIZ : une date allemande n'est jamais lue a l'americaine", () => {
  // 02.09.2026 est le 2 SEPTEMBRE. new Date("02.09.2026") rend le 9
  // fevrier, et lireDateFlux avec lui : d'ou la conversion a la main.
  assert.equal(dateAllemande("02.09.2026"), "2026-09-02");
  assert.equal(dateAllemande("24.09.2026"), "2026-09-24");
  assert.equal(dateAllemande("1.3.2027"), "2027-03-01");
  assert.equal(lireDateFlux("02.09.2026"), "2026-02-09",
    "si ceci change, la conversion maison n'est plus necessaire");

  // Tout le reste est refuse plutot que devine : regle 2 du depot.
  assert.equal(dateAllemande("nv"), null);
  assert.equal(dateAllemande(""), null);
  assert.equal(dateAllemande("24.13.2026"), null);
  assert.equal(dateAllemande("2026-09-24"), null);
});

test("GIZ : traduit le type allemand dans le vocabulaire ferme", () => {
  const entrees = analyserGiz(lire("giz-ausschreibungen.html"));
  const types = new Set(entrees.map((e) => e.type));
  const vocabulaire: readonly string[] = TYPES_ANNONCE;
  for (const t of types) assert.ok(vocabulaire.includes(String(t)), String(t));
  assert.ok(types.has("AMI"), "TNW doit devenir AMI");
  assert.ok(types.has("Appel d'offres"), "Ausschreibung doit devenir Appel d'offres");
});

test("GIZ : les accents survivent au decodage ISO-8859-1", () => {
  const entrees = analyserGiz(lire("giz-ausschreibungen.html"));
  const texte = entrees.map((e) => e.titre + " " + e.resume).join(" ");
  assert.ok(/Überarbeitung|für/.test(texte), "les umlauts sont perdus");
  assert.ok(!texte.includes("�"), "des caracteres de substitution subsistent");
});

// ------------------------------------------------------- Niger Marches --

test("Niger Marches : lit les avis de l'API WordPress", () => {
  const entrees = analyserNigerMarches(lire("nigermarches-appels.json"));
  assert.ok(entrees.length > 0, "aucun avis lu");
  for (const e of entrees) {
    assert.ok(e.titre.length > 0);
    assert.match(e.lien, /^https:\/\/www\.nigermarches\.com\//);
  }
});

test("Niger Marches : l'echeance vient du champ ACF date_expiration", () => {
  // Mesure du 2026-09-02 : 20 avis sur 20 en portent une. Une source qui
  // date toutes ses annonces est rare et vaut d'etre verifiee.
  const entrees = analyserNigerMarches(lire("nigermarches-appels.json"));
  for (const e of entrees) {
    assert.match(String(e.deadline), /^\d{4}-\d{2}-\d{2}$/, e.titre);
  }
  // "2026-10-05 09:00:00" ne doit pas reculer d'un jour en passant par un
  // fuseau : on garde la partie date telle quelle.
  assert.equal(entrees[0].deadline, "2026-10-05");
});

test("Niger Marches : l'acheteur reel remplace le nom de la source", () => {
  const entrees = analyserNigerMarches(lire("nigermarches-appels.json"));
  const acheteurs = entrees.map((e) => e.organisation).filter(Boolean);
  assert.ok(acheteurs.length > 0, "aucun acheteur lu");
  assert.ok(acheteurs.some((a) => /Médecins Sans Frontières/.test(String(a))),
            String(acheteurs.slice(0, 3)));
});

test("Niger Marches : le type se lit dans l'intitule quand il s'y trouve", () => {
  const entrees = analyserNigerMarches(lire("nigermarches-appels.json"));
  const ami = entrees.find((e) => /MANIFESTATION/i.test(e.titre));
  assert.equal(ami?.type, "AMI");
  // Sans mention explicite, on ne devine pas : le defaut de la source
  // s'applique plus loin, dans collecterSource.
  const ordinaire = entrees.find((e) => /pompage/i.test(e.titre));
  assert.equal(ordinaire?.type, null);
});

test("Niger Marches : une reponse illisible ne casse pas la collecte", () => {
  assert.deepEqual(analyserNigerMarches(""), []);
  assert.deepEqual(analyserNigerMarches("<html>"), []);
  assert.deepEqual(analyserNigerMarches('{"code":"rest_no_route"}'), []);
});

// ---------------------------------------------------------------- budget --

test("un budget est mis en forme, jamais devine", () => {
  assert.equal(budgetSimple("120000", "EUR"), "120 000 EUR");
  assert.equal(budgetSimple("1234567", "EUR"), "1 234 567 EUR");
  assert.equal(budgetSimple("42000.00", "usd"), "42 000 USD");
  // Rien a annoncer : la colonne reste vide, elle ne dit pas "0".
  assert.equal(budgetSimple("0", "EUR"), "");
  assert.equal(budgetSimple("", "EUR"), "");
  assert.equal(budgetSimple(null, "EUR"), "");
  assert.equal(budgetSimple("a negocier", "EUR"), "");
});

test("une fourchette se lit dans les deux sens", () => {
  assert.equal(budgetFourchette("10000", "250000", "USD"), "10 000 - 250 000 USD");
  assert.equal(budgetFourchette("730000", "730000", "USD"), "730 000 USD");
  // Fundpilote pose un minimum a zero sur la moitie de ses annonces : ce
  // n'est pas une information, c'est un defaut d'API.
  assert.equal(budgetFourchette("0.00", "42000.00", "EUR"), "jusqu'a 42 000 EUR");
  assert.equal(budgetFourchette("15000", "", "EUR"), "a partir de 15 000 EUR");
  assert.equal(budgetFourchette(null, null, "EUR"), "");
});

test("le portail europeen expose son budget", () => {
  // Mesure du 2026-09-02 : 20 avis sur 100 en portent un, en euros, sous
  // forme de nombre nu dans metadata.budget.
  const corps = JSON.stringify({ results: [{
    reference: "topic/TEST-01",
    metadata: { title: ["Appel de test"], identifier: ["TEST-01"],
                deadlineDate: ["2026-12-01T17:00:00+01:00"], budget: ["120000"],
                type: ["1"] },
  }, {
    reference: "topic/TEST-02",
    metadata: { title: ["Appel sans budget"], identifier: ["TEST-02"],
                deadlineDate: ["2026-12-01T17:00:00+01:00"], type: ["1"] },
  }] });
  const entrees = analyserEuropa(corps);
  assert.equal(entrees[0].budget, "120 000 EUR");
  // Une source muette laisse la colonne vide : c'est exact, pas une panne.
  assert.equal(entrees[1].budget, null);
});

test("Fundpilote : le montant quitte le resume pour sa colonne", () => {
  const entrees = analyserFundpilote(lire("fundpilote-opportunities.json"));
  const avec = entrees.filter((e) => e.budget);
  assert.ok(avec.length > 0, "aucun montant lu");
  for (const e of avec) {
    assert.match(String(e.budget), /\d/);
    // Le montant ne doit plus etre duplique dans le resume.
    assert.ok(!String(e.resume).includes("Budget :"), String(e.resume));
  }
});

// ------------------------------------------------------------- les liens --

test("DEDRAS : chaque avis pointe sur sa fiche, pas sur la liste", () => {
  // Mesure du 2026-09-02 : les 98 avis renvoyaient tous a /toutvoir, et il
  // fallait y rechercher l'annonce a la main.
  const entrees = analyserDedras(lire("dedras-toutvoir.html"));
  assert.ok(entrees.length > 1);
  const liens = new Set(entrees.map((e) => e.lien));
  assert.equal(liens.size, entrees.length, "chaque avis a son propre lien");
  for (const e of entrees) {
    assert.match(e.lien,
      /^https:\/\/eprocurement\.dedras\.org\/tenderforapplication/);
  }
});

test("un domaine que la source ecrit faux est corrige", () => {
  // Mesure du 2026-09-02 : le flux de la DNCMP publie marches-public.bj,
  // sans le s. Ce domaine ne resout pas ; le portail est marches-publics.bj
  // et sert la meme page.
  assert.equal(nettoyerLien("https://www.marches-public.bj/appels-doffres"),
               "https://www.marches-publics.bj/appels-doffres");
  assert.equal(nettoyerLien("http://marches-public.bj/x?a=1"),
               "https://www.marches-publics.bj/x?a=1");
  // Deja correct : inchange.
  assert.equal(nettoyerLien("https://www.marches-publics.bj/appels-doffres"),
               "https://www.marches-publics.bj/appels-doffres");
  // UN DOMAINE SOSIE N'EST PAS REECRIT. Sans cette precaution, un domaine
  // qui commence pareil serait redirige vers le portail beninois.
  assert.equal(nettoyerLien("https://www.marches-public.bj.autre.test/x"),
               "https://www.marches-public.bj.autre.test/x");
});

test("le portail europeen : un appel, une ligne", () => {
  // Mesure du 2026-09-02 : 100 resultats pour 50 identifiants. Le portail
  // rend chaque appel dans toutes ses langues.
  const topic = (id: string, langue: string, titre: string) => ({
    reference: `topic/${id}-${langue}`,
    metadata: { title: [titre], identifier: [id], language: [langue],
                deadlineDate: ["2026-12-01T17:00:00+01:00"], type: ["1"] },
  });
  const corps = JSON.stringify({ results: [
    topic("CERV-2026-TEST", "en", "Call for proposals"),
    topic("CERV-2026-TEST", "fr", "Appel a propositions"),
    topic("HORIZON-2026-SEUL", "en", "Only in English"),
  ] });

  const entrees = analyserEuropa(corps);
  assert.equal(entrees.length, 2, "le meme appel ne compte qu'une fois");
  // Le francais l'emporte quand il existe.
  assert.equal(entrees[0].titre, "Appel a propositions");
  // Sans version francaise, l'appel reste, dans sa langue.
  assert.equal(entrees[1].titre, "Only in English");
});

test("Grand Challenges : le lien de candidature plutot qu'un 404", () => {
  // Mesure du 2026-09-02 : www.grandchallenges.org + le slug rend 404 pour
  // les trois defis ouverts. apply_link repond 200 pour les trois.
  const corps = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
    props: { pageProps: { initialData: { listing: { data: [
      { title: "Defi avec lien de candidature",
        url: "/challenge/defi-un",
        apply_link: "https://submit.gatesfoundation.org/prog/defi_un",
        date_end: Math.floor(Date.now() / 1000) + 86400 * 30 },
      { title: "Defi sans lien de candidature",
        url: "/challenge/defi-deux",
        date_end: Math.floor(Date.now() / 1000) + 86400 * 30 },
    ] } } } },
  })}</script>`;

  const entrees = analyserGrandChallenges(corps);
  assert.equal(entrees.length, 2);
  assert.equal(entrees[0].lien, "https://submit.gatesfoundation.org/prog/defi_un");
  // Sans candidature, on retombe sur l'hote qui repond - gcgh, pas www.
  assert.equal(entrees[1].lien,
               "https://gcgh.grandchallenges.org/challenge/defi-deux");
});

// ------------------------------------------------- Expertise France --

test("Expertise France : lit les offres avec pays, secteur et echeance", () => {
  const entrees = analyserExpertiseFrance(lire("expertise-france-offres.html"));
  assert.equal(entrees.length, 10, "dix offres par page");
  for (const e of entrees) {
    assert.ok(e.titre.length > 0);
    assert.match(e.lien, /^https:\/\/expertise-france\.gestmax\.fr\/\d+\/\d+\//);
    // Le lien ne garde pas le ?backlink=search du site.
    assert.ok(!e.lien.includes("backlink"));
  }
});

test("Expertise France : chaque offre porte une date limite", () => {
  // Mesure du 2026-09-04 : dix sur dix. Une source qui date tout son flux
  // est assez rare pour etre verifiee.
  for (const e of analyserExpertiseFrance(lire("expertise-france-offres.html"))) {
    assert.match(String(e.deadline), /^\d{4}-\d{2}-\d{2}$/, e.titre);
  }
});

test("Expertise France : le PAYS prime sur la zone", () => {
  // Deux <span class="country"> : "AFRIQUE SUBSAHARIENNE" puis "TANZANIE".
  // C'est le pays qui situe l'annonce, et c'est lui que la colonne
  // Pertinence compare aux pays suivis.
  const entrees = analyserExpertiseFrance(lire("expertise-france-offres.html"));
  const pays = entrees.map((e) => e.pays);
  assert.ok(pays.includes("TANZANIE"), String(pays));
  assert.ok(!pays.includes("AFRIQUE SUBSAHARIENNE"),
            "la zone ne doit pas remplacer le pays");
  // La zone reste dans le resume : elle n'est pas perdue.
  assert.ok(entrees[0].resume.includes("AFRIQUE SUBSAHARIENNE"));
});

test("Expertise France : un poste est un poste, une prestation reste ouverte", () => {
  const entrees = analyserExpertiseFrance(lire("expertise-france-offres.html"));
  const cddu = entrees.find((e) => /Responsable Administratif/i.test(e.titre));
  assert.equal(cddu?.type, "Recrutement", "CDDU est un poste");

  // "Contrat de prestation de services" recouvre l'expert individuel comme
  // l'agence : on ne tranche pas, le defaut de la source s'applique.
  const prestation = entrees.find((e) => /career guidance/i.test(e.titre));
  assert.equal(prestation?.type, null);
  assert.ok(prestation?.resume.includes("Contrat de prestation de services"));
});

test("les entites nommees des pages francaises sont decodees", () => {
  // Mesure du 2026-09-04 : les titres d'Expertise France arrivaient en
  // "Consultant charg&eacute; d&rsquo;une &eacute;tude".
  assert.equal(decoderEntites("charg&eacute; d&rsquo;une &eacute;tude"),
               "chargé d’une étude");
  assert.equal(decoderEntites("C&ocirc;te d&rsquo;Ivoire &amp; ailleurs"),
               "Côte d’Ivoire & ailleurs");
  assert.equal(decoderEntites("&laquo; oui &raquo; &hellip;"), "« oui » …");
  // Une entite inconnue reste telle quelle : on ne devine pas.
  assert.equal(decoderEntites("&inconnu; intact"), "&inconnu; intact");

  const entrees = analyserExpertiseFrance(lire("expertise-france-offres.html"));
  const texte = entrees.map((e) => e.titre + " " + e.resume).join(" ");
  assert.ok(!/&[a-z]+;/i.test(texte), "aucune entite ne subsiste");
});

// ------------------------------------------------- Plan International --

test("Plan International : huit appels, tous dates", () => {
  const entrees = analyserPlanInternational(lire("plan-international-tenders.html"));
  assert.equal(entrees.length, 8);
  for (const e of entrees) {
    assert.ok(e.titre.length > 0);
    // Mesure du 2026-09-04 : huit sur huit portent une echeance, en prose
    // anglaise. C'est ce qui a fait ajouter "no later than" et le rang
    // ordinal a extraireDeadline.
    assert.match(String(e.deadline), /^\d{4}-\d{2}-\d{2}$/, e.titre);
  }
});

test("Plan International : le dossier remplit la colonne PDF", () => {
  // Pas de page par appel - les huit vivent sur la meme - mais le dossier,
  // lui, est propre a chacun. C'est le contraire de la DNCMP.
  const entrees = analyserPlanInternational(lire("plan-international-tenders.html"));
  for (const e of entrees) {
    assert.equal(e.lien, "https://plan-international.org/calls-tender/");
    assert.match(String(e.pdf),
                 /^https:\/\/plan-international\.org\/uploads\//, e.titre);
  }
  // Les separateurs <h3> vides de la page ne deviennent pas des annonces.
  assert.ok(entrees.every((e) => e.titre.trim().length > 3));
});

test("une echeance en prose anglaise est lue", () => {
  // Mesure du 2026-09-04 : ni la tournure ni le rang ordinal n'etaient
  // reconnus, et huit appels sur huit arrivaient sans date.
  assert.equal(
    extraireDeadline("Responses should be submitted no later than Friday, 28th August 2026."),
    "2026-08-28");
  assert.equal(
    extraireDeadline("no later than Wednesday, 2nd September 2026"), "2026-09-02");
  assert.equal(extraireDeadline("Bids must be received by 15 October 2026"),
               "2026-10-15");
  // Une date sans mot annonciateur reste ignoree : c'est la regle.
  assert.equal(extraireDeadline("Publie le 12 mars 2026, sans autre mention"), null);
});

test("la lecture en deux temps : la fiche date ce que la liste tait", () => {
  const liste = analyserJobrelais(lire("jobrelais-liste.html"));
  assert.equal(liste.length, 12);
  assert.ok(liste.every((e) => !e.deadline), "la liste ne date rien");
  assert.equal(new Set(liste.map((e) => e.lien)).size, liste.length,
               "la meme carte n'est pas comptee deux fois");

  const fiche = analyseurFiche("HTML:jobrelais.com")!(lire("jobrelais-fiche.html"));
  assert.equal(fiche.deadline, "2026-11-26");
  assert.equal(fiche.publie, "2026-08-26");

  // La fusion comble les vides, jamais le reste.
  const complete = fusionnerFiche(
    { titre: "De la liste", lien: "x", publie: null, resume: "deja la",
      deadline: null },
    { deadline: "2026-11-26", resume: "de la fiche", titre: "De la fiche" });
  assert.equal(complete.deadline, "2026-11-26");
  assert.equal(complete.resume, "deja la");
  assert.equal(complete.titre, "De la liste");
});

test("un analyseur de fiche n'existe que pour les sources qui en declarent", () => {
  assert.equal(typeof analyseurFiche("HTML:jobrelais.com"), "function");
  assert.equal(analyseurFiche("HTML:giz.de"), null);
  assert.equal(analyseurFiche("RSS"), null);
  // Une fiche illisible rend un objet vide, jamais une exception.
  assert.deepEqual(analyseurFiche("HTML:jobrelais.com")!("<html>rien</html>"), {});
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

// --------------------------------------- les annonces echues n'entrent pas --

/** Depot et envoyeur reduits a ce que collecterSource n'utilise pas. */
const SOURCE = {
  id: "S1", code: "S1", nom: "Test", methode: "RSS",
  url: "https://exemple.test/flux.xml", active: true,
} as const;

function fluxAvec(entrees: { titre: string; limite: string }[]): string {
  return '<?xml version="1.0"?><rss version="2.0"><channel>'
    + entrees.map((e) => "<item><title>" + e.titre + "</title>"
        + "<link>https://exemple.test/" + e.titre + "</link>"
        + "<description>Date limite : " + e.limite + "</description></item>")
      .join("")
    + "</channel></rss>";
}

function dansNJours(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return [String(d.getDate()).padStart(2, "0"),
          String(d.getMonth() + 1).padStart(2, "0"),
          d.getFullYear()].join("/");
}

test("une annonce dont l'echeance est passee n'est pas collectee", async () => {
  // Les portails laissent des annees d'archives en ligne : sans ce filtre,
  // la grande majorite des lignes seraient grises des le premier passage.
  const flux = fluxAvec([
    { titre: "Passee", limite: dansNJours(-5) },
    { titre: "Ouverte", limite: dansNJours(20) },
  ]);
  const annonces = await collecterSource(
    SOURCE as never, CONFIG_DEFAUT,
    async () => ({ code: 200, texte: flux }));

  const titres = annonces.map((a) => a.titre);
  assert.ok(!titres.includes("Passee"), titres.join(" | "));
  assert.ok(titres.includes("Ouverte"));
});

test("une annonce sans echeance lue est gardee", async () => {
  // On ne devine jamais une date : c'est a l'utilisateur d'aller voir.
  const flux = '<?xml version="1.0"?><rss version="2.0"><channel>'
    + "<item><title>Sans date</title>"
    + "<link>https://exemple.test/x</link>"
    + "<description>Consultez l avis officiel.</description></item>"
    + "</channel></rss>";
  const annonces = await collecterSource(
    SOURCE as never, CONFIG_DEFAUT,
    async () => ({ code: 200, texte: flux }));

  assert.equal(annonces.length, 1);
  assert.equal(annonces[0].deadline, null);
});

test("le reglage collecterExpirees ramene les archives", async () => {
  const flux = fluxAvec([{ titre: "Passee", limite: dansNJours(-5) }]);
  const annonces = await collecterSource(
    SOURCE as never, { ...CONFIG_DEFAUT, collecterExpirees: true },
    async () => ({ code: 200, texte: flux }));

  assert.equal(annonces.length, 1);
  assert.equal(annonces[0].titre, "Passee");
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

// ----------------------------------------------------------------- UNGM --

test("UNGM : une reponse de recherche, pas une page", () => {
  // La fixture est la reponse REELLE du POST /Public/Notice/Search filtre
  // sur les quinze pays de la CEDEAO, capturee le 2026-09-04.
  const entrees = analyserUngm(lire("ungm-cedeao.html"));
  assert.equal(entrees.length, 15, "quinze avis par page, plafond du serveur");

  for (const e of entrees) {
    assert.ok(e.titre.length > 0, "un avis sans titre n'entre pas");
    assert.match(e.lien, /^https:\/\/www\.ungm\.org\/Public\/Notice\/\d+$/);
    // Une source dont TOUTES les annonces sont datees est assez rare pour
    // etre verifiee : c'est ce qui la rend utilisable sans second temps.
    assert.match(String(e.deadline), /^\d{4}-\d{2}-\d{2}$/, e.titre);
    assert.ok(e.organisation, "l'acheteur reel est l'agence, jamais UNGM");
  }
  assert.equal(new Set(entrees.map((e) => e.lien)).size, 15,
               "la meme rangee ne compte pas deux fois");
});

test("UNGM : chaque cellule va dans la bonne colonne", () => {
  const entrees = analyserUngm(lire("ungm-cedeao.html"));
  const unops = entrees.find((e) => e.lien.endsWith("/313464"));
  assert.equal(unops?.deadline, "2026-09-22");
  assert.equal(unops?.publie, "2026-09-04");
  assert.equal(unops?.organisation, "UNOPS");
  assert.equal(unops?.pays, "Guinea-Bissau");
  assert.equal(unops?.type, "Invitation to bid");
  assert.equal(unops?.resume, "ITB/2026/64376", "la reference sert de resume");
});

test("UNGM : la derniere cellule s'arrete avant le script", () => {
  // La rangee est suivie du <script> qui colore les echeances proches.
  // Sans la borne sur </div>, le pays du dernier avis valait trente lignes
  // de JavaScript - et la colonne Pays devenait illisible.
  for (const e of analyserUngm(lire("ungm-cedeao.html"))) {
    assert.ok(!String(e.pays ?? "").includes("document"), String(e.pays));
    assert.ok((e.pays ?? "").length < 40, String(e.pays));
  }
});

test("UNGM : un avis regional n'invente pas de pays", () => {
  // "Multiple destinations" n'est pas un pays. On laisse le champ vide pour
  // que le defaut de la source s'applique, plutot que d'ecrire dans la
  // colonne Pays une valeur qu'aucun filtre ne saurait lire.
  const entrees = analyserUngm(lire("ungm-cedeao.html"));
  const regionaux = entrees.filter((e) => !e.pays);
  assert.ok(regionaux.length > 0, "la fixture en contient");
  for (const e of entrees) {
    assert.ok(!/multiple/i.test(String(e.pays ?? "")), String(e.pays));
  }
});

test("UNGM : la date se lit, ou ne se lit pas - jamais a peu pres", () => {
  assert.equal(dateUngm("15-Sep-2026 13:00"), "2026-09-15");
  assert.equal(dateUngm("02-Oct-2026 23:59"), "2026-10-02");
  assert.equal(dateUngm("4-Jan-2027"), "2027-01-04");
  // Un mois qui n'existe pas ne devient pas janvier.
  assert.equal(dateUngm("15-Xyz-2026"), null);
  assert.equal(dateUngm("2026-09-15"), null);
  assert.equal(dateUngm(""), null);
});

test("UNGM : le POST pagine par le corps, pas par l'URL", () => {
  const page1 = formeRequete("HTML:ungm.org", 1);
  const page3 = formeRequete("HTML:ungm.org", 3);
  assert.equal(page1?.methode, "POST");
  assert.equal(page1?.paginee, true, "le moteur doit boucler sans {page}");
  // PageIndex commence a 0 la ou le moteur compte a partir de 1.
  assert.equal(JSON.parse(String(page1?.corps)).PageIndex, 0);
  assert.equal(JSON.parse(String(page3?.corps)).PageIndex, 2);
  // Plafonne A 15 PAR LE SERVEUR : en demander 100 en rend 15.
  assert.equal(JSON.parse(String(page1?.corps)).PageSize, 15);
  assert.equal(JSON.parse(String(page1?.corps)).Countries.length, 15);

  // Une methode HTML ordinaire reste un GET : rien n'a change pour elle.
  assert.equal(formeRequete("HTML:giz.de"), undefined);
  assert.equal(formeRequete("RSS"), undefined);
  // Et les deux formes JSON existantes sont intactes.
  assert.match(String(formeRequete("JSON:ec.europa.eu")?.contentType),
               /^multipart\/form-data/);
  assert.equal(formeRequete("JSON:grants.gov")?.contentType,
               "application/json");
});

test("UNGM : le moteur enchaine les pages d'un POST", async () => {
  // Sans {page} dans l'adresse, le moteur ne paginait pas. Le drapeau
  // paginee de la forme de requete le lui dit.
  const corps: string[] = [];
  const annonces = await collecterSource(
    { id: "UNGM-CEDEAO", nom: "UNGM", methode: "HTML:ungm.org",
      url: "https://www.ungm.org/Public/Notice/Search",
      pays: "Afrique de l'Ouest", secteur: "", type: "Appel d'offres",
      active: true } as never,
    { ...CONFIG_DEFAUT, collecterExpirees: true, maxParSource: 40 },
    async (_url, requete) => {
      corps.push(String(requete?.corps ?? ""));
      // La meme page trois fois : la deduplication doit arreter la boucle.
      return { code: 200, texte: lire("ungm-cedeao.html") };
    });

  assert.ok(corps.length >= 2, "au moins deux pages demandees");
  assert.equal(JSON.parse(corps[0]).PageIndex, 0);
  assert.equal(JSON.parse(corps[1]).PageIndex, 1, "la page 2 suit la page 1");
  assert.equal(annonces.length, 15, "et rien n'entre deux fois");
});
