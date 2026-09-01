/**
 * TenderPilot - les 8 scenarios du cahier des charges (section 34).
 *
 * Le vrai Run.gs est charge et execute. Seules la couche d'acces au
 * classeur, l'envoi d'email et le reseau sont remplaces : ce sont les
 * seules choses qui exigeraient Google. Toute la logique testee ici est
 * exactement celle qui sera deployee.
 *
 *     node tests/test_logic.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SCRIPT = path.join(path.resolve(__dirname, '..'), 'apps_script');

let reussites = 0;
const echecs = [];

function check(libelle, condition, detail) {
  if (condition) {
    reussites++;
    console.log('  ok   ' + libelle);
  } else {
    echecs.push(libelle);
    console.log('  FAIL ' + libelle + (detail ? '  -> ' + detail : ''));
  }
}

function jourRelatif(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/** "2026-09-15" -> "15/09/2026", la forme qu'on trouve dans les annonces. */
function enFrancais(iso) {
  const p = iso.split('-');
  return p[2] + '/' + p[1] + '/' + p[0];
}

const AUJOURDHUI = jourRelatif(0);

/**
 * Construit un environnement complet : feuille en memoire, boite aux
 * lettres factice, reseau simule. Chaque test repart d'un monde neuf.
 */
function monde(options) {
  const opt = options || {};
  const feuille = {
    opps: [],
    logs: [],
    sources: opt.sources || [],
    config: Object.assign({
      NOTIFICATION_EMAIL: 'veille@example.org',
      SEND_NEW_OPPORTUNITY: 'true',
      SEND_J7: 'true', SEND_J3: 'true', SEND_J1: 'true',
      SEND_EXPIRED: 'false',
      DIGEST_THRESHOLD: '5',
      TIMEZONE: 'Africa/Porto-Novo',
      MAX_ITEMS_PER_SOURCE: '40'
    }, opt.config || {})
  };
  const boite = [];
  const flux = opt.flux || {};

  const ctx = {
    console: console,
    module: { exports: {} },
    feuille: feuille,
    boite: boite,

    // --- couche classeur, en memoire -----------------------------------
    CONFIG_COURANTE: {},
    lireConfig: () => feuille.config,
    lireSources: () => feuille.sources,
    // Le vrai Sheet.gs relit la feuille et construit de nouveaux objets :
    // il ne rend jamais la liste vivante. On copie donc le tableau.
    lireOpportunites: () => feuille.opps.slice(),
    majSource_: (source, statut) => { source.status = statut; },
    logEvent: (s, a, st, m) => feuille.logs.push(
      { source: s, action: a, statut: st, message: String(m || '') }),
    aujourdhui_: () => opt.aujourdhui || AUJOURDHUI,
    maintenant_: () => (opt.aujourdhui || AUJOURDHUI) + ' 08:00',

    ajouterOpportunites_: function (nouvelles, existantes) {
      let ligne = 2;
      existantes.forEach(o => { if (o._row >= ligne) ligne = o._row + 1; });
      const connues = existantes.slice();
      nouvelles.forEach(opp => {
        opp.id = ctx.prochainId(connues);
        opp.addedAt = ctx.maintenant_();
        opp.updatedAt = ctx.maintenant_();
        opp.days = ctx.joursRestants(opp.deadline, ctx.aujourdhui_());
        opp.status = ctx.statutDelai(opp.days);
        opp._row = ligne++;
        connues.push(opp);
        feuille.opps.push(opp);
      });
      return nouvelles;
    },
    majLigne_: function (ligne, champs) {
      Object.keys(champs).forEach(c => { ligne[c] = champs[c]; });
      ligne.updatedAt = ctx.maintenant_();
      return Object.keys(champs).length;
    },
    ecrireDelais_: () => {},
    peindreLignes_: function (lignes) {
      lignes.forEach(l => { l._couleur = ctx.couleurStatut(l.status); });
    },
    marquerNotifications_: function (ligne, cles) {
      cles.forEach(cle => {
        const n = ctx.SCHEMA.NOTIFICATIONS.filter(x => x.key === cle)[0];
        if (n) ligne[n.column] = true;
      });
    },

    // --- services Google simules ---------------------------------------
    MailApp: {
      sendEmail: (to, sujet, corps) => boite.push({ to, sujet, corps })
    },
    UrlFetchApp: {
      fetch: function (url) {
        if (flux[url] === undefined) throw new Error('reseau injoignable');
        const reponse = flux[url];
        if (typeof reponse === 'number') {
          return { getResponseCode: () => reponse, getContentText: () => '' };
        }
        return { getResponseCode: () => 200, getContentText: () => reponse };
      }
    },
    SpreadsheetApp: { getActive: () => ({ toast: () => {} }) },
    Utilities: { formatDate: () => AUJOURDHUI },
    ScriptApp: { getProjectTriggers: () => [] }
  };

  vm.createContext(ctx);
  ['Schema.gs', 'Core.gs', 'Rss.gs', 'Html.gs', 'Json.gs', 'Telegram.gs',
   'Run.gs'].forEach(f => {
    vm.runInContext(fs.readFileSync(path.join(SCRIPT, f), 'utf8'), ctx, f);
  });
  return { ctx, feuille, boite };
}

function source(id, url, extra) {
  return Object.assign({
    _row: 2, id: id, name: 'Source ' + id, method: 'RSS', url: url,
    country: 'Benin', sector: 'Digital', type: "Appel d'offres", active: 'OUI'
  }, extra || {});
}

/** Flux RSS minimal. Aucune source ni annonce reelle. */
function fluxRss(entrees) {
  return '<?xml version="1.0"?><rss version="2.0"><channel>'
    + entrees.map(e =>
        '<item><title>' + e.titre + '</title>'
        + '<link>' + e.lien + '</link>'
        + '<description>' + (e.description || '') + '</description></item>'
      ).join('')
    + '</channel></rss>';
}

// ==========================================================================
console.log('\n[Test 1] Nouvelle opportunite : 1 ligne ajoutee + 1 email');
{
  const url = 'https://example.org/flux-1';
  const m = monde({
    sources: [source('SRC-001', url)],
    flux: { [url]: fluxRss([{ titre: 'Plateforme de suivi',
      lien: 'https://example.org/a1',
      description: 'Date limite : ' + enFrancais(jourRelatif(30)) }]) }
  });
  const r = m.ctx.executerTenderPilot();

  check('une ligne creee', m.feuille.opps.length === 1,
        m.feuille.opps.length + ' lignes');
  check('un identifiant TP- attribue',
        /^TP-\d{6}$/.test(m.feuille.opps[0].id), m.feuille.opps[0].id);
  check('la deadline a ete lue dans l annonce',
        m.feuille.opps[0].deadline === jourRelatif(30),
        m.feuille.opps[0].deadline);
  check('un seul email envoye', m.boite.length === 1, m.boite.length + ' emails');
  check('objet conforme au cahier des charges',
        m.boite[0] && m.boite[0].sujet.indexOf(
          '[TenderPilot] Nouvelle opportunite') === 0,
        m.boite[0] && m.boite[0].sujet);
  check('le corps rappelle de consulter la source officielle',
        m.boite[0].corps.indexOf('source officielle') !== -1);
  check('l execution rend compte', r.nouvelles === 1);
}

// ==========================================================================
console.log('\n[Test 2] Relance : aucun doublon, aucun nouvel email');
{
  const url = 'https://example.org/flux-2';
  const xml = fluxRss([{ titre: 'Etude de faisabilite',
    lien: 'https://example.org/a2',
    description: 'Date limite : ' + enFrancais(jourRelatif(30)) }]);
  const m = monde({ sources: [source('SRC-001', url)], flux: { [url]: xml } });

  m.ctx.executerTenderPilot();
  const lignesApres1 = m.feuille.opps.length;
  const emailsApres1 = m.boite.length;
  m.ctx.executerTenderPilot();

  check('toujours une seule ligne',
        m.feuille.opps.length === lignesApres1 && lignesApres1 === 1,
        m.feuille.opps.length + ' lignes');
  check('aucun email supplementaire', m.boite.length === emailsApres1,
        m.boite.length + ' emails au total');
  check('le doublon est journalise',
        m.feuille.logs.some(l => l.statut === 'DUPLICATE'));
}

// ==========================================================================
console.log('\n[Test 3] Deadline dans 7 jours : J-7 envoye une seule fois');
{
  const url = 'https://example.org/flux-3';
  const xml = fluxRss([{ titre: 'Mission a sept jours',
    lien: 'https://example.org/a3',
    description: 'Date limite : ' + enFrancais(jourRelatif(7)) }]);
  const m = monde({
    sources: [source('SRC-001', url)], flux: { [url]: xml },
    config: { SEND_NEW_OPPORTUNITY: 'false' }
  });

  m.ctx.executerTenderPilot();
  const j7 = m.boite.filter(e => e.sujet.indexOf('Deadline dans 7 jours') !== -1);
  check('un email J-7 part', j7.length === 1, j7.length + ' emails J-7');
  check('la ligne est marquee', m.feuille.opps[0].notifJ7 === true);
  check('le statut est BIENTOT', m.feuille.opps[0].status === 'BIENTOT',
        m.feuille.opps[0].status);

  m.ctx.executerTenderPilot();
  check('la relance ne renvoie rien',
        m.boite.filter(e => e.sujet.indexOf('Deadline dans 7 jours') !== -1)
          .length === 1);
}

// ==========================================================================
console.log('\n[Test 4] Deadline dans 3 jours : J-3 envoye une seule fois');
{
  const url = 'https://example.org/flux-4';
  const xml = fluxRss([{ titre: 'Mission a trois jours',
    lien: 'https://example.org/a4',
    description: 'Date limite : ' + enFrancais(jourRelatif(3)) }]);
  const m = monde({
    sources: [source('SRC-001', url)], flux: { [url]: xml },
    config: { SEND_NEW_OPPORTUNITY: 'false' }
  });

  m.ctx.executerTenderPilot();
  check('un email URGENT part',
        m.boite.filter(e => e.sujet.indexOf('URGENT') !== -1).length === 1);
  check('J-7 est marque sans email supplementaire',
        m.feuille.opps[0].notifJ7 === true && m.boite.length === 1,
        m.boite.length + ' emails au total');
  check('le statut est URGENT', m.feuille.opps[0].status === 'URGENT',
        m.feuille.opps[0].status);

  m.ctx.executerTenderPilot();
  check('la relance ne renvoie rien', m.boite.length === 1,
        m.boite.length + ' emails');
}

// ==========================================================================
console.log('\n[Test 5] Deadline demain : J-1 envoye une seule fois');
{
  const url = 'https://example.org/flux-5';
  const xml = fluxRss([{ titre: 'Mission de demain',
    lien: 'https://example.org/a5',
    description: 'Date limite : ' + enFrancais(jourRelatif(1)) }]);
  const m = monde({
    sources: [source('SRC-001', url)], flux: { [url]: xml },
    config: { SEND_NEW_OPPORTUNITY: 'false' }
  });

  m.ctx.executerTenderPilot();
  check('un email DERNIER RAPPEL part',
        m.boite.filter(e => e.sujet.indexOf('DERNIER RAPPEL') !== -1).length === 1);
  check('un seul email malgre trois paliers atteints',
        m.boite.length === 1, m.boite.length + ' emails');
  check('les trois paliers sont marques',
        m.feuille.opps[0].notifJ7 === true
        && m.feuille.opps[0].notifJ3 === true
        && m.feuille.opps[0].notifJ1 === true);

  m.ctx.executerTenderPilot();
  check('la relance ne renvoie rien', m.boite.length === 1);
}

// ==========================================================================
console.log('\n[Test 6] Deadline expiree : statut EXPIRE et ligne grisee');
{
  const url = 'https://example.org/flux-6';
  const xml = fluxRss([{ titre: 'Mission passee',
    lien: 'https://example.org/a6',
    description: 'Date limite : ' + enFrancais(jourRelatif(-5)) }]);
  const m = monde({
    sources: [source('SRC-001', url)], flux: { [url]: xml },
    config: { SEND_NEW_OPPORTUNITY: 'false' }
  });

  m.ctx.executerTenderPilot();
  const ligne = m.feuille.opps[0];
  check('le statut est EXPIRE', ligne.status === 'EXPIRE', ligne.status);
  check('la couleur est le gris du schema',
        ligne._couleur === m.ctx.SCHEMA.COULEURS.EXPIRE, ligne._couleur);
  check('aucun rappel J-7, J-3 ou J-1 sur une deadline passee',
        m.boite.length === 0, m.boite.length + ' emails');
}

// ==========================================================================
console.log('\n[Test 7] Deadline modifiee a la source : la date est mise a jour');
{
  const url = 'https://example.org/flux-7';
  const lien = 'https://example.org/a7';
  const avant = jourRelatif(30);
  const apres = jourRelatif(45);
  const m = monde({
    sources: [source('SRC-001', url)],
    flux: { [url]: fluxRss([{ titre: 'Mission reportee', lien: lien,
      description: 'Date limite : ' + enFrancais(avant) }]) },
    config: { SEND_NEW_OPPORTUNITY: 'false' }
  });

  m.ctx.executerTenderPilot();
  check('deadline initiale enregistree',
        m.feuille.opps[0].deadline === avant, m.feuille.opps[0].deadline);

  // La source republie la meme annonce avec une nouvelle date.
  const majFlux = fluxRss([{ titre: 'Mission reportee', lien: lien,
    description: 'Date limite : ' + enFrancais(apres) }]);
  m.ctx.UrlFetchApp.fetch = () => ({
    getResponseCode: () => 200, getContentText: () => majFlux });

  m.ctx.executerTenderPilot();
  check('toujours une seule ligne', m.feuille.opps.length === 1,
        m.feuille.opps.length + ' lignes');
  check('la deadline a ete remplacee',
        m.feuille.opps[0].deadline === apres, m.feuille.opps[0].deadline);
  check('la mise a jour est journalisee',
        m.feuille.logs.some(l => l.action === 'Mise a jour'
          && l.message.indexOf('deadline') !== -1));
}

// ==========================================================================
console.log('\n[Test 8] Source en erreur : les autres sources continuent');
{
  const ok = 'https://example.org/flux-ok';
  const casse = 'https://example.org/flux-casse';
  const m = monde({
    sources: [
      Object.assign(source('SRC-KO', casse), { _row: 2 }),
      Object.assign(source('SRC-OK', ok), { _row: 3 })
    ],
    flux: {
      [casse]: 403,
      [ok]: fluxRss([{ titre: 'Annonce valide',
        lien: 'https://example.org/ok',
        description: 'Date limite : ' + enFrancais(jourRelatif(20)) }])
    },
    config: { SEND_NEW_OPPORTUNITY: 'false' }
  });

  const r = m.ctx.executerTenderPilot();
  check('la source valide a bien ete collectee', m.feuille.opps.length === 1,
        m.feuille.opps.length + ' lignes');
  check('l execution ne s est pas interrompue', r.suivies === 1);
  check('l erreur est journalisee en ERROR',
        m.feuille.logs.some(l => l.source === 'SRC-KO' && l.statut === 'ERROR'));
  check('le message nomme le code HTTP',
        m.feuille.logs.some(l => l.message.indexOf('403') !== -1));
  check('la source en panne est marquee ERREUR',
        m.feuille.sources[0].status === 'ERREUR');
}

// ==========================================================================
console.log('\n[Digest] Plus de 5 nouvelles opportunites : un seul email');
{
  const url = 'https://example.org/flux-digest';
  const entrees = [];
  for (let i = 0; i < 8; i++) {
    entrees.push({ titre: 'Annonce numero ' + i,
      lien: 'https://example.org/d' + i,
      description: 'Date limite : ' + enFrancais(jourRelatif(30)) });
  }
  const m = monde({
    sources: [source('SRC-001', url)], flux: { [url]: fluxRss(entrees) }
  });
  m.ctx.executerTenderPilot();

  check('huit lignes creees', m.feuille.opps.length === 8,
        m.feuille.opps.length + ' lignes');
  check('un seul email au lieu de huit', m.boite.length === 1,
        m.boite.length + ' emails');
  check('objet du digest conforme',
        m.boite[0].sujet === '[TenderPilot] 8 nouvelles opportunites detectees',
        m.boite[0].sujet);
  check('toutes les lignes sont marquees comme notifiees',
        m.feuille.opps.every(o => o.notifNew === true));
}

// ==========================================================================
console.log('\n[Fraicheur] Une source qui ne publie plus est signalee');
{
  const C = monde({}).ctx;
  const jr = (n) => { const d = new Date(); d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10); };
  const A = new Date();
  check('flux recent : non silencieux',
        C.fraicheurSource_([jr(-20)], A).silencieuse === false);
  check('flux muet depuis 22 mois : silencieux',
        C.fraicheurSource_(['2024-10-24', '2024-06-20'], A).silencieuse === true);
  check('source sans date : pas de fausse alerte',
        C.fraicheurSource_([], A).silencieuse === false
        && C.fraicheurSource_([], A).jours === null);
  check('c est la date la plus recente qui compte',
        C.fraicheurSource_(['2020-01-01', jr(-5)], A).silencieuse === false);
  check('le seuil est de 180 jours', C.JOURS_SOURCE_SILENCIEUSE === 180);
}

console.log('\n[Complements] Statuts, couleurs, dates, resume');
{
  const C = monde({}).ctx;
  check('plus de 15 jours = OUVERT', C.statutDelai(30) === 'OUVERT');
  check('8 a 15 jours = A SURVEILLER', C.statutDelai(12) === 'A SURVEILLER');
  check('4 a 7 jours = BIENTOT', C.statutDelai(5) === 'BIENTOT');
  check('0 a 3 jours = URGENT', C.statutDelai(0) === 'URGENT');
  check('deadline passee = EXPIRE', C.statutDelai(-1) === 'EXPIRE');
  check('sans deadline = DATE A VERIFIER',
        C.statutDelai(null) === 'DATE A VERIFIER');
  check('les six statuts ont une couleur',
        Object.keys(C.SCHEMA.COULEURS).length === 6);

  check('un changement d heure ne fausse pas le compte',
        C.joursRestants('2026-03-29', '2026-03-22') === 7);
  check('cle de dedup insensible a la casse et aux accents',
        C.clesDedup({ title: 'Développement', org: 'ONU', deadline: '2026-01-01' })[0]
        === C.clesDedup({ title: 'developpement', org: 'onu', deadline: '2026-01-01' })[0]);
  check('le resume est tronque', C.tronquer('mot '.repeat(300)).length <= 404);
  check('un champ vide n ecrase pas une valeur existante',
        Object.keys(C.champsModifies({ title: 'Ancien' }, { title: '' })).length === 0);
  check('identifiant au-dela de 999999',
        C.prochainId([{ id: 'TP-999999' }]) === 'TP-1000000');
  check('une date sans mot annonciateur n est pas prise pour une deadline',
        C.extractDeadline('Publie le 15/09/2026') === null);
}


// ==========================================================================
// Synchronisation du catalogue de sources (Sources.gs)
//
// Cette fonction ECRIT dans la feuille de l'utilisateur. Ses trois regles
// doivent tenir : ne jamais effacer une ligne, ne jamais toucher a Active,
// mettre a jour ce qui est technique.
// ==========================================================================

/**
 * Faux onglet Google Sheets, reduit a ce dont Sources.gs a besoin.
 * `lignes` inclut l'entete : la ligne 1 du classeur est lignes[0].
 */
function fausseFeuille(lignes) {
  let masquee = false;
  return {
    lignes,
    getLastRow: () => lignes.length,
    getLastColumn: () => lignes[0].length,
    isSheetHidden: () => masquee,
    hideSheet() { masquee = true; },
    showSheet() { masquee = false; },
    activate() {},
    getRange(r, c, nbL, nbC) {
      const hauteur = nbL || 1;
      const largeur = nbC || 1;
      return {
        getValue: () => lignes[r - 1][c - 1],
        setValue(v) { lignes[r - 1][c - 1] = v; },
        getValues: () => Array.from({ length: hauteur }, (_, i) =>
          lignes[r - 1 + i].slice(c - 1, c - 1 + largeur)),
        setValues(valeurs) {
          valeurs.forEach((ligne, i) => {
            while (lignes.length < r - 1 + i + 1) lignes.push([]);
            lignes[r - 1 + i] = ligne.slice();
          });
        }
      };
    }
  };
}

/** Contexte minimal pour executer Sources.gs seul. */
function mondeSync(lignesFeuille) {
  const feuille = fausseFeuille(lignesFeuille);
  const journal = [];
  const ctx = {
    console,
    module: { exports: {} },
    MENU: 'TenderPilot',
    getSheet_: () => feuille,
    entetes_: (f) => {
      const carte = {};
      f.getRange(1, 1, 1, f.getLastColumn()).getValues()[0]
        .forEach((nom, i) => { carte[nom] = i + 1; });
      return carte;
    },
    logEvent: (src, action, statut, message) =>
      journal.push({ action, statut, message }),
    SpreadsheetApp: {
      getUi: () => ({ alert: () => {}, ButtonSet: { OK: 'OK' } }),
      getActiveSpreadsheet: () => ({ toast: () => {} })
    }
  };
  vm.createContext(ctx);
  ['Schema.gs', 'Sources.gs'].forEach(f => {
    vm.runInContext(fs.readFileSync(path.join(SCRIPT, f), 'utf8'), ctx, f);
  });
  return { ctx, feuille, journal };
}

/** Entete de l'onglet SOURCES, telle que le schema la definit. */
function enteteSources(ctx) {
  const S = ctx.SCHEMA.SRC;
  return [S.id, S.name, S.method, S.url, S.country, S.sector, S.type,
          S.active, S.lastRun, S.status];
}

console.log('\n[Sync 1] Le catalogue livre garnit une feuille vide');
{
  // On amorce avec un contexte jetable, juste pour connaitre l'entete.
  const amorce = mondeSync([['x']]);
  const entete = enteteSources(amorce.ctx);

  const m = mondeSync([entete]);
  const bilan = m.ctx.appliquerCatalogue_();

  check('le catalogue est embarque dans le script',
        m.ctx.SCHEMA.SOURCES_LIVREES.length > 50,
        (m.ctx.SCHEMA.SOURCES_LIVREES || []).length + ' sources');
  check('toutes les sources du catalogue sont ecrites',
        bilan.ajoutees === bilan.catalogue,
        bilan.ajoutees + ' ajoutees sur ' + bilan.catalogue);
  check('la feuille contient une ligne par source, plus l entete',
        m.feuille.lignes.length === bilan.catalogue + 1,
        m.feuille.lignes.length + ' lignes');
  check('la synchronisation est journalisee',
        m.journal.length === 1 && m.journal[0].statut === 'SUCCESS');
}

console.log('\n[Sync 2] Une adresse changee est corrigee, Active est respectee');
{
  const amorce = mondeSync([['x']]);
  const entete = enteteSources(amorce.ctx);
  const premiere = amorce.ctx.SCHEMA.SOURCES_LIVREES[0].slice();
  const code = premiere[0];

  // L utilisateur a desactive cette source, et son adresse a vieilli.
  const ancienne = premiere.slice();
  ancienne[3] = 'https://ancienne-adresse.example/flux.xml';
  ancienne[7] = 'NON';

  const m = mondeSync([entete, ancienne]);
  m.ctx.appliquerCatalogue_();

  const ligne = m.feuille.lignes.find(l => l[0] === code);
  check('l adresse est remise a jour', ligne[3] === premiere[3], ligne[3]);
  check('le choix NON de l utilisateur est preserve', ligne[7] === 'NON',
        String(ligne[7]));
}

console.log('\n[Sync 3] Une source ajoutee par l utilisateur survit');
{
  const amorce = mondeSync([['x']]);
  const entete = enteteSources(amorce.ctx);
  const mienne = ['MOI-001', 'Ma source a moi', 'RSS',
                  'https://exemple.test/flux.xml', 'Benin', '', '', 'OUI', '', ''];

  const m = mondeSync([entete, mienne]);
  const bilan = m.ctx.appliquerCatalogue_();

  const survivante = m.feuille.lignes.find(l => l[0] === 'MOI-001');
  check('la source de l utilisateur est toujours la', Boolean(survivante));
  check('elle n a pas ete modifiee',
        survivante && survivante[1] === 'Ma source a moi', String(survivante));
  check('elle est comptee comme telle', bilan.propres === 1,
        bilan.propres + ' source(s) propre(s)');
}

console.log('\n[Sync 4] Deux passages de suite ne changent rien la seconde fois');
{
  const amorce = mondeSync([['x']]);
  const entete = enteteSources(amorce.ctx);
  const m = mondeSync([entete]);

  m.ctx.appliquerCatalogue_();
  const avant = m.feuille.lignes.length;
  const second = m.ctx.appliquerCatalogue_();

  check('aucune ligne ajoutee au second passage', second.ajoutees === 0,
        second.ajoutees + ' ajoutees');
  check('aucune mise a jour au second passage', second.majs === 0,
        second.majs + ' mises a jour');
  check('la feuille n a pas grossi', m.feuille.lignes.length === avant,
        m.feuille.lignes.length + ' lignes contre ' + avant);
}

console.log('\n[Sync 5] L onglet SOURCES se masque et se reaffiche');
{
  const amorce = mondeSync([['x']]);
  const m = mondeSync([enteteSources(amorce.ctx)]);

  check('l onglet est visible au depart', !m.feuille.isSheetHidden());
  m.ctx.basculerOngletSources();
  check('un premier appel le masque', m.feuille.isSheetHidden());
  m.ctx.basculerOngletSources();
  check('un second appel le reaffiche', !m.feuille.isSheetHidden());
}

// ==========================================================================
console.log('\n' + '-'.repeat(58));
if (echecs.length) {
  console.log('ECHEC : ' + echecs.length + ' verification(s) en echec');
  echecs.forEach(e => console.log('  - ' + e));
  process.exit(1);
}
console.log('SUCCES : ' + reussites + '/' + reussites + ' verifications passees');
