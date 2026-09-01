/**
 * Tests de la logique metier Apps Script (module 12).
 *
 * Core.gs ne touche a aucune API Google : il est donc executable ici. Ces
 * tests verifient les regles qui, si elles cassaient, feraient rater une
 * deadline a un client.
 *
 *     node tests/test_12_apps_script.js
 */

'use strict';

const path = require('path');
const ROOT = path.resolve(__dirname, '..');

// Schema.gs definit `var SCHEMA` que Core.gs utilise comme globale.
global.SCHEMA = require(path.join(ROOT, 'apps_script', 'Schema.gs')).SCHEMA;
const core = require(path.join(ROOT, 'apps_script', 'Core.gs'));
// Rss.gs utilise normalizeText de Core.gs comme globale.
global.normalizeText = core.normalizeText;
const rss = require(path.join(ROOT, 'apps_script', 'Rss.gs'));

let checks = 0;
const failures = [];

function check(label, condition, detail) {
  checks++;
  if (condition) {
    console.log('  ok   ' + label);
  } else {
    console.log('  FAIL ' + label + (detail ? '  ' + detail : ''));
    failures.push(label);
  }
}

function equal(label, actual, expected) {
  check(label, JSON.stringify(actual) === JSON.stringify(expected),
        'obtenu ' + JSON.stringify(actual));
}

function daysFromNow(n) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}

const today = new Date();

// -------------------------------------------------------------------------
console.log('\n[1] Jours restants');
equal('deadline dans 10 jours', core.daysRemaining(daysFromNow(10), today), 10);
equal('deadline aujourd hui', core.daysRemaining(daysFromNow(0), today), 0);
equal('deadline passee', core.daysRemaining(daysFromNow(-5), today), -5);
equal('deadline absente', core.daysRemaining(null, today), null);

// Le passage a l'heure d'ete decale les journees de 23 ou 25 heures : un
// calcul naif en millisecondes renvoie alors 9.04 ou 10.04 jours.
const dst = new Date(2026, 2, 29, 12, 0, 0);
const beforeDst = new Date(2026, 2, 22, 12, 0, 0);
equal('un changement d heure ne decale pas le compte',
      core.daysRemaining(dst, beforeDst), 7);

// -------------------------------------------------------------------------
console.log('\n[2] Paliers de deadline');
equal('plus de 15 jours', core.deadlineBucket(30, 'Nouveau'), 'ok');
equal('8 a 15 jours', core.deadlineBucket(12, 'Nouveau'), 'j7');
equal('3 a 7 jours', core.deadlineBucket(5, 'A preparer'), 'j3');
equal('0 a 2 jours', core.deadlineBucket(1, 'Pret a soumettre'), 'j1');
equal('deadline depassee', core.deadlineBucket(-3, 'Nouveau'), 'expired');
equal('sans deadline', core.deadlineBucket(null, 'Nouveau'), 'none');

console.log('\n  la regle produit : un dossier clos n est jamais urgent');
SCHEMA.STATUSES_CLOSED.forEach(function (status) {
  equal('statut ' + status + ' a J-1', core.deadlineBucket(1, status), 'closed');
});
equal('un dossier soumis a J-1 n est pas rouge',
      core.deadlineBucket(1, 'Soumis'), 'closed');

// -------------------------------------------------------------------------
console.log('\n[3] Rappels');
equal('lecture des paliers', core.parseReminderDays('14;7;3;1'), [14, 7, 3, 1]);
equal('separateur virgule et espaces',
      core.parseReminderDays(' 7 , 3 '), [7, 3]);
equal('valeur vide', core.parseReminderDays(''), []);
equal('valeurs non numeriques ignorees',
      core.parseReminderDays('7;abc;3'), [7, 3]);

const days = [14, 7, 3, 1];
check('rappel le jour exact du palier',
      core.shouldRemind(7, 'Nouveau', days) === true);
check('pas de rappel entre deux paliers',
      core.shouldRemind(6, 'Nouveau', days) === false);
check('pas de rappel pour un dossier soumis',
      core.shouldRemind(7, 'Soumis', days) === false);
check('pas de rappel pour un NO-GO',
      core.shouldRemind(3, 'NO-GO', days) === false);
check('pas de rappel sans deadline',
      core.shouldRemind(null, 'Nouveau', days) === false);
check('pas de rappel apres la deadline',
      core.shouldRemind(-2, 'Nouveau', days) === false);

// -------------------------------------------------------------------------
console.log('\n[4] Deduplication');
const d1 = new Date(2026, 8, 15);
const d2 = new Date(2026, 8, 15);
equal('meme annonce, casse et accents differents',
      core.dedupKey('Développement  PLATEFORME', 'UNICEF', d1),
      core.dedupKey('developpement plateforme', 'unicef', d2));
check('deadline differente = opportunite differente',
      core.dedupKey('Plateforme', 'X', new Date(2026, 8, 15)) !==
      core.dedupKey('Plateforme', 'X', new Date(2026, 8, 16)));
check('organisation differente = opportunite differente',
      core.dedupKey('Plateforme', 'A', d1) !== core.dedupKey('Plateforme', 'B', d1));
equal('une date texte donne la meme cle qu un objet Date',
      core.dedupKey('Titre', 'Org', '2026-09-15'),
      core.dedupKey('Titre', 'Org', new Date(2026, 8, 15)));

// -------------------------------------------------------------------------
console.log('\n[5] Identifiants');
equal('premier identifiant', core.nextOpportunityId([]), 'OPP-0001');
equal('increment', core.nextOpportunityId(['OPP-0001', 'OPP-0002']), 'OPP-0003');
equal('reprend apres le plus grand, pas apres le dernier',
      core.nextOpportunityId(['OPP-0009', 'OPP-0003']), 'OPP-0010');
equal('ignore les identifiants DEMO',
      core.nextOpportunityId(['DEMO-001', 'DEMO-010']), 'OPP-0001');
equal('passe au-dela de 9999 sans tronquer',
      core.nextOpportunityId(['OPP-9999']), 'OPP-10000');

// -------------------------------------------------------------------------
console.log('\n[6] Extraction de lien');
equal('lien dans un texte',
      core.firstUrl('Voir https://example.org/appel-2026 pour le detail'),
      'https://example.org/appel-2026');
equal('aucun lien', core.firstUrl('Pas de lien ici'), '');
equal('parenthese fermante exclue',
      core.firstUrl('(https://example.org/a)'), 'https://example.org/a');

// -------------------------------------------------------------------------
console.log('\n[7] Score de pertinence');
const watchlist = {
  countries: ['Benin', 'Togo'],
  sectors: ['Digital'],
  types: ["Appel d'offres"],
  positiveKeywords: ['plateforme'],
  negativeKeywords: ['genie civil'],
  minBudget: 5000000,
  maxBudget: '',
  minDays: 7
};

const parfait = core.relevanceScore({
  title: 'Developpement d une plateforme de suivi',
  organization: 'Org',
  country: 'Benin',
  sector: 'Digital',
  type: "Appel d'offres",
  budget: 45000000,
  daysRemaining: 28
}, watchlist);
equal('correspondance complete = 100', parfait.score, 100);
check('le detail explique le score', parfait.detail.length >= 5);

const horsCible = core.relevanceScore({
  title: 'Fourniture de mobilier',
  country: 'Kenya',
  sector: 'Logistique',
  type: 'Fourniture',
  budget: 1000,
  daysRemaining: 30
}, watchlist);
// Le bareme de la documentation accorde 10 points pour un delai suffisant,
// independamment du ciblage : une opportunite hors cible ne tombe donc pas a
// zero, mais reste tres en dessous du seuil d interet.
equal('hors cible : seuls les points de delai', horsCible.score, 10);
equal('et l interpretation dit de l ignorer',
      core.relevanceLabel(horsCible.score), 'Ignorer');

const negatif = core.relevanceScore({
  title: 'Travaux de genie civil a Cotonou',
  country: 'Benin',
  sector: 'Digital',
  type: "Appel d'offres",
  daysRemaining: 30
}, watchlist);
equal('un mot-cle negatif ecarte, meme avec pays et secteur cibles',
      negatif.score, 0);
check('et le dit explicitement', negatif.excluded === true);

const expiree = core.relevanceScore({
  title: 'Plateforme', country: 'Benin', sector: 'Digital', daysRemaining: -1
}, watchlist);
equal('une deadline depassee ecarte', expiree.score, 0);
check('exclusion signalee', expiree.excluded === true);

const troisCourt = core.relevanceScore({
  title: 'Plateforme', country: 'Benin', sector: 'Digital',
  type: "Appel d'offres", daysRemaining: 3
}, watchlist);
check('un delai trop court coute les 10 points de delai',
      troisCourt.score === 85, 'obtenu ' + troisCourt.score);
check('sans exclure l opportunite', troisCourt.excluded === false);

const accents = core.relevanceScore({
  title: 'PLATEFORME numerique', country: 'BENIN', sector: 'digital',
  daysRemaining: 30
}, watchlist);
check('la comparaison ignore casse et accents', accents.score >= 50,
      'obtenu ' + accents.score);

const sansWatchlist = core.relevanceScore(
  { title: 'Quoi que ce soit', daysRemaining: 30 },
  { countries: [], sectors: [], types: [], positiveKeywords: [],
    negativeKeywords: [] });
check('une watchlist vide ne fait pas planter le score',
      typeof sansWatchlist.score === 'number');

console.log('\n  interpretation du score');
equal('80 et plus', core.relevanceLabel(88), 'Tres pertinent');
equal('60 a 79', core.relevanceLabel(65), 'A analyser');
equal('40 a 59', core.relevanceLabel(45), 'Faible priorite');
equal('moins de 40', core.relevanceLabel(20), 'Ignorer');

// -------------------------------------------------------------------------
console.log('\n[8] Validation du formulaire');
equal('saisie valide',
      core.validateOpportunity({ title: 'Un titre', deadline: '2026-09-15',
                                 sourceUrl: '', budget: '' }), []);
check('titre manquant refuse',
      core.validateOpportunity({ title: '', deadline: '2026-09-15' }).length === 1);
check('titre fait d espaces refuse',
      core.validateOpportunity({ title: '   ', deadline: '2026-09-15' }).length === 1);
check('deadline manquante refusee',
      core.validateOpportunity({ title: 'X', deadline: '' }).length === 1);
check('date invalide refusee',
      core.validateOpportunity({ title: 'X', deadline: 'pas une date' }).length === 1);
check('lien sans protocole refuse',
      core.validateOpportunity({ title: 'X', deadline: '2026-09-15',
                                 sourceUrl: 'example.org' }).length === 1);
check('budget non numerique refuse',
      core.validateOpportunity({ title: 'X', deadline: '2026-09-15',
                                 budget: 'beaucoup' }).length === 1);
check('plusieurs erreurs remontent ensemble',
      core.validateOpportunity({ title: '', deadline: '' }).length === 2);

// -------------------------------------------------------------------------
console.log('\n[9] Lecture des flux RSS et Atom');

const RSS_SAMPLE = [
  '<?xml version="1.0"?>',
  '<rss version="2.0"><channel>',
  '  <item>',
  '    <title><![CDATA[Recrutement d&apos;un consultant]]></title>',
  '    <link>https://example.org/appel-1</link>',
  '    <pubDate>Tue, 01 Sep 2026 08:00:00 GMT</pubDate>',
  '    <description>Mission de 3 mois. Date limite : 15/09/2026.</description>',
  '  </item>',
  '  <item>',
  '    <title>Fourniture &amp; installation</title>',
  '    <link>https://example.org/appel-2</link>',
  '    <description>&lt;p&gt;Sans echeance annoncee&lt;/p&gt;</description>',
  '  </item>',
  '</channel></rss>'
].join('\n');

const items = rss.parseFeedXml(RSS_SAMPLE);
equal('deux entrees lues', items.length, 2);
equal('titre decode depuis CDATA et entites',
      items[0].title, "Recrutement d'un consultant");
equal('lien extrait', items[0].link, 'https://example.org/appel-1');
check('date de publication lue', items[0].published instanceof Date);
equal('esperluette decodee dans le titre',
      items[1].title, 'Fourniture & installation');
equal('balises HTML retirees du resume',
      items[1].summary, 'Sans echeance annoncee');

const ATOM_SAMPLE = [
  '<feed xmlns="http://www.w3.org/2005/Atom">',
  '  <entry>',
  '    <title>Consultation nationale</title>',
  '    <link rel="self" href="https://example.org/self"/>',
  '    <link rel="alternate" href="https://example.org/annonce"/>',
  '    <updated>2026-09-01T08:00:00Z</updated>',
  '    <summary>Cloture le 20 septembre 2026.</summary>',
  '  </entry>',
  '</feed>'
].join('\n');

const atom = rss.parseFeedXml(ATOM_SAMPLE);
equal('une entree Atom lue', atom.length, 1);
equal('le lien alternate est prefere au lien self',
      atom[0].link, 'https://example.org/annonce');
check('date Atom lue', atom[0].published instanceof Date);

equal('flux vide', rss.parseFeedXml(''), []);
equal('flux illisible ne fait pas echouer la collecte',
      rss.parseFeedXml('<html>page d erreur</html>'), []);
check('une entree sans titre est ignoree',
      rss.parseFeedXml('<item><link>https://x.org</link></item>').length === 0);

console.log('\n  extraction de la date limite');
function ymd(date) {
  return date === null ? null
    : [date.getFullYear(), date.getMonth() + 1, date.getDate()].join('-');
}
equal('date limite en jj/mm/aaaa',
      ymd(rss.extractDeadline('Date limite : 15/09/2026')), '2026-9-15');
equal('date de cloture en aaaa-mm-jj',
      ymd(rss.extractDeadline('Date de cloture: 2026-09-20')), '2026-9-20');
equal('date en toutes lettres',
      ymd(rss.extractDeadline('Cloture le 20 septembre 2026')), '2026-9-20');
equal('mot-cle anglais',
      ymd(rss.extractDeadline('Closing date: 05/10/2026')), '2026-10-5');
equal('accents et majuscules',
      ymd(rss.extractDeadline('DATE LIMITE : 15 septembre 2026')), '2026-9-15');

// La regle qui compte : sans mot annonciateur, on ne devine pas. Renvoyer la
// date de publication comme echeance ferait rater des marches.
equal('une date sans mot annonciateur n est pas retenue',
      rss.extractDeadline('Publie le 15/09/2026'), null);
equal('aucune date du tout', rss.extractDeadline('Pas de date ici'), null);
equal('texte vide', rss.extractDeadline(''), null);
equal('date impossible refusee',
      rss.extractDeadline('Date limite : 32/13/2026'), null);
equal('le 29 fevrier hors annee bissextile est refuse',
      rss.extractDeadline('Date limite : 29/02/2026'), null);
equal('le 29 fevrier d une annee bissextile est accepte',
      ymd(rss.extractDeadline('Date limite : 29/02/2028')), '2028-2-29');

console.log('\n  entites et balises');
equal('entites nommees', rss.decodeEntities('a &amp; b &lt;c&gt;'), 'a & b <c>');
equal('CDATA', rss.decodeEntities('<![CDATA[brut]]>'), 'brut');
equal('balises retirees et espaces normalises',
      rss.stripTags('<p>Un   texte</p> <br>ici'), 'Un texte ici');
check('date RFC822 lue',
      rss.parseFeedDate('Tue, 01 Sep 2026 08:00:00 GMT') instanceof Date);
check('date ISO lue',
      rss.parseFeedDate('2026-09-01T08:00:00Z') instanceof Date);
equal('date illisible', rss.parseFeedDate('la semaine prochaine'), null);
equal('date absente', rss.parseFeedDate(''), null);

// -------------------------------------------------------------------------
console.log('\n' + '-'.repeat(62));
if (failures.length) {
  console.log('ECHEC : ' + failures.length + '/' + checks + ' verifications en echec');
  failures.forEach(function (f) { console.log('  - ' + f); });
  process.exit(1);
}
console.log('SUCCES : ' + checks + '/' + checks + ' verifications passees');
