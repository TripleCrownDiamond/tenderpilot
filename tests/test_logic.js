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
 * Reproduit le refus de Google : getRange(null, colonne) leve
 * "Les parametres (null,number) ne correspondent pas a la signature de la
 * methode SpreadsheetApp.Sheet.getRange".
 */
function exigeNumeroDeLigne(ligne, appelant) {
  if (!ligne || !ligne._row) {
    throw new Error(appelant + ' : ligne sans _row (getRange(null, n) '
      + 'echouerait dans Google Sheets)');
  }
}

/**
 * Construit un environnement complet : feuille en memoire, boite aux
 * lettres factice, reseau simule. Chaque test repart d'un monde neuf.
 */
function monde(options) {
  const opt = options || {};
  const salon = [];
  const pousses = [];
  const agenda = [];
  const feuille = {
    // Opportunites deja presentes avant la collecte : indispensable pour
    // tester ce qui expire APRES etre entre en base.
    opps: (opt.opps || []).map((o, i) => Object.assign({ _row: i + 2 }, o)),
    logs: [],
    profil: [],
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
  const statutsEnAttente = [];
  const proprietes = {};

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
    // Le vrai Sheet.gs tamponne : majSource_ note en memoire, et
    // ecrireStatutsSources_ ecrit les deux colonnes en un appel. Le banc
    // d essai reproduit les deux temps, sinon il ne testerait pas ce qui
    // est deploye.
    majSource_: (source, statut) => { statutsEnAttente.push([source, statut]); },
    ecrireStatutsSources_: () => {
      statutsEnAttente.forEach(([source, statut]) => { source.status = statut; });
      const n = statutsEnAttente.length;
      statutsEnAttente.length = 0;
      return n;
    },
    ecrireJournal_: () => 0,
    // Le vrai Sheet.gs reecrit l onglet PAYS_ET_SECTEURS en un appel ;
    // le banc d essai garde l inventaire en memoire pour le verifier.
    ecrireProfil_: (lignes, config) => {
      feuille.profil = ctx.inventaireProfil(lignes, config);
      return feuille.profil.length;
    },
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
      // Le vrai Sheet.gs ecrit avec getRange(ligne._row, colonne). Une
      // ligne sans numero y fait echouer TOUTE l'execution : le banc
      // d'essai doit echouer pareil, sinon il laisse passer le defaut du
      // 2026-09-02.
      exigeNumeroDeLigne(ligne, 'majLigne_');
      Object.keys(champs).forEach(c => { ligne[c] = champs[c]; });
      ligne.updatedAt = ctx.maintenant_();
      return Object.keys(champs).length;
    },
    ecrireDelais_: () => {},
    // Le vrai Sheet.gs reecrit le bloc de lignes dans l ordre rendu par
    // parDelai_ et renumerote. Le banc d essai fait pareil, sur le tableau
    // en memoire : sans cela, l ordre du tableau ne serait jamais teste.
    trierOpportunites_: function (lignes) {
      const triees = ctx.parDelai_(lignes || []);
      const places = triees.map(l => l._row).sort((a, b) => a - b);
      places.forEach((rang, i) => { triees[i]._row = rang; });
      feuille.opps.sort((a, b) => a._row - b._row);
      return triees.length;
    },
    viderOpportunites_: function () {
      const n = feuille.opps.length;
      feuille.opps.length = 0;
      return n;
    },
    viderJournal_: function () {
      const n = feuille.logs.length;
      feuille.logs.length = 0;
      return n;
    },
    peindreLignes_: function (lignes) {
      lignes.forEach(l => { l._couleur = ctx.couleurStatut(l.status); });
    },
    // Le faux marque COMME LE VRAI : par canal, en cumulant. Un stub qui
    // ecrirait `true` dirait "tous canaux servis" et masquerait exactement
    // ce qu'on cherche a empecher - une alerte renvoyee sur un canal qui
    // l'a deja recue, ou un email perdu parce que Telegram est passe.
    marquerNotifications_: function (ligne, cles, canal) {
      exigeNumeroDeLigne(ligne, 'marquerNotifications_');
      cles.forEach(cle => {
        const n = ctx.SCHEMA.NOTIFICATIONS.filter(x => x.key === cle)[0];
        if (n) ligne[n.column] = ctx.ajouterCanal_(ligne[n.column],
                                                   canal || 'email');
      });
    },

    // --- services Google simules ---------------------------------------
    MailApp: {
      sendEmail: (to, sujet, corps) => boite.push({ to, sujet, corps })
    },
    UrlFetchApp: {
      fetch: function (url, options) {
        // Telegram passe par le meme UrlFetchApp que les sources : le banc
        // le detourne pour compter ce que le salon a recu.
        // ntfy : le corps EST le message, le titre est dans un en-tete.
        if (String(url).indexOf('ntfy.') !== -1
            || String(url).indexOf('/tp-') !== -1) {
          pousses.push({ titre: options.headers.Title,
                         corps: options.payload,
                         lien: options.headers.Click || '' });
          return { getResponseCode: () => 200, getContentText: () => '{}' };
        }
        if (String(url).indexOf('api.telegram.org') !== -1) {
          salon.push(JSON.parse(options.payload).text);
          return { getResponseCode: () => 200,
                   getContentText: () => '{"ok":true}' };
        }
        if (flux[url] === undefined) throw new Error('reseau injoignable');
        const reponse = flux[url];
        if (typeof reponse === 'number') {
          return { getResponseCode: () => reponse, getContentText: () => '' };
        }
        return { getResponseCode: () => 200, getContentText: () => reponse };
      }
    },
    SpreadsheetApp: { getActive: () => ({ toast: () => {} }) },
    // Agenda simule. Le vrai CalendarApp rend un evenement porteur d un
    // identifiant : sans lui, la colonne Agenda resterait vide et la meme
    // echeance serait reposee a chaque passage.
    CalendarApp: {
      getDefaultCalendar: () => ({
        getName: () => 'Agenda de test',
        createAllDayEvent: function (titre, date, options) {
          const e = { titre, date, description: (options || {}).description,
                      rappels: [], id: 'evt-' + (agenda.length + 1) };
          agenda.push(e);
          return {
            getId: () => e.id,
            addPopupReminder: (m) => { e.rappels.push(m); }
          };
        }
      }),
      getCalendarById: function (id) {
        if (!id || id === 'inconnu') return null;
        return this.getDefaultCalendar();
      }
    },
    Utilities: { formatDate: () => AUJOURDHUI },
    ScriptApp: { getProjectTriggers: () => [] },
    // La reprise apres budget depasse s ecrit dans les proprietes du
    // script : le banc d essai les tient en memoire.
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => proprietes[k],
        setProperty: (k, v) => { proprietes[k] = v; }
      })
    }
  };

  vm.createContext(ctx);
  ['Schema.gs', 'Core.gs', 'Rss.gs', 'Html.gs', 'Json.gs', 'Telegram.gs',
   'Ntfy.gs', 'Agenda.gs',
   'Llm.gs', 'Run.gs'].forEach(f => {
    vm.runInContext(fs.readFileSync(path.join(SCRIPT, f), 'utf8'), ctx, f);
  });
  return { ctx, feuille, boite, salon, pousses, agenda };
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
  check('la ligne est marquee, sur le canal qui l a servie',
        m.ctx.dejaNotifie_(m.feuille.opps[0].notifJ7, 'email'));
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
        m.ctx.dejaNotifie_(m.feuille.opps[0].notifJ7, 'email')
        && m.boite.length === 1,
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
        ['notifJ7', 'notifJ3', 'notifJ1'].every(
          c => m.ctx.dejaNotifie_(m.feuille.opps[0][c], 'email')));

  m.ctx.executerTenderPilot();
  check('la relance ne renvoie rien', m.boite.length === 1);
}

// ==========================================================================
console.log('\n[Test 6a] Une annonce deja echue n entre pas');
{
  // Les portails laissent des annees d archives en ligne. Sans ce filtre,
  // la grande majorite des lignes collectees seraient grises des le premier
  // passage, et l utilisateur devrait chercher les rares qui comptent.
  const url = 'https://example.org/flux-6a';
  const xml = fluxRss([
    { titre: 'Mission passee', lien: 'https://example.org/a6-vieux',
      description: 'Date limite : ' + enFrancais(jourRelatif(-5)) },
    { titre: 'Mission ouverte', lien: 'https://example.org/a6-neuf',
      description: 'Date limite : ' + enFrancais(jourRelatif(20)) },
    { titre: 'Mission sans date', lien: 'https://example.org/a6-sansdate',
      description: 'Consultez l avis officiel.' }
  ]);
  const m = monde({ sources: [source('SRC-001', url)], flux: { [url]: xml } });
  m.ctx.executerTenderPilot();

  const titres = m.feuille.opps.map(o => o.title).sort();
  check('l annonce echue est ecartee',
        !titres.includes('Mission passee'), titres.join(' | '));
  check('l annonce ouverte est gardee', titres.includes('Mission ouverte'));
  // Sans echeance lue, on garde : c est a l utilisateur d aller voir.
  check('l annonce sans echeance est gardee',
        titres.includes('Mission sans date'));
}

// ==========================================================================
console.log('\n[Test 6b] Une opportunite suivie qui expire : EXPIRE et grise');
{
  // Le filtre agit a l ENTREE seulement. Ce qui est deja suivi reste suivi :
  // effacer l historique ferait perdre la trace des dossiers deposes.
  const url = 'https://example.org/flux-6b';
  const m = monde({
    sources: [source('SRC-001', url)],
    flux: { [url]: fluxRss([]) },
    opps: [{
      id: 'TP-000001', title: 'Mission deja suivie',
      url: 'https://example.org/a6b', deadline: jourRelatif(-5),
      source: 'SRC-001', org: 'Ministere', country: 'Benin'
    }],
    config: { SEND_NEW_OPPORTUNITY: 'false' }
  });

  m.ctx.executerTenderPilot();
  const ligne = m.feuille.opps[0];
  check('la ligne est conservee', Boolean(ligne),
        m.feuille.opps.length + ' lignes');
  check('le statut est EXPIRE', ligne.status === 'EXPIRE', ligne.status);
  check('la couleur est le gris du schema',
        ligne._couleur === m.ctx.SCHEMA.COULEURS.EXPIRE, ligne._couleur);
  check('aucun rappel J-7, J-3 ou J-1 sur une deadline passee',
        m.boite.length === 0, m.boite.length + ' emails');
}

// ==========================================================================
console.log('\n[Test 6c] COLLECT_EXPIRED ramene les archives si on le demande');
{
  const url = 'https://example.org/flux-6c';
  const xml = fluxRss([{ titre: 'Mission passee',
    lien: 'https://example.org/a6c',
    description: 'Date limite : ' + enFrancais(jourRelatif(-5)) }]);
  const m = monde({
    sources: [source('SRC-001', url)], flux: { [url]: xml },
    config: { COLLECT_EXPIRED: 'true', SEND_NEW_OPPORTUNITY: 'false' }
  });

  m.ctx.executerTenderPilot();
  check('l annonce echue entre quand on l autorise',
        m.feuille.opps.length === 1, m.feuille.opps.length + ' lignes');
  check('et elle est bien marquee EXPIRE',
        m.feuille.opps[0] && m.feuille.opps[0].status === 'EXPIRE');
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
console.log('\n[Doublon interne] Deux copies d une meme annonce dans une '
            + 'seule collecte');
{
  // MESURE DU 2026-09-02, sur la BCEAO : la meme page listait deux fois le
  // meme avis, avec des descriptions differentes. Le second exemplaire
  // etait reconnu comme doublon du PREMIER - une annonce qui n'a ni ligne
  // ni identifiant tant qu'elle n'est pas ecrite - et partait quand meme
  // en mise a jour de feuille. getRange(null, colonne) arretait alors
  // l'execution entiere : ni deadlines, ni couleurs, ni emails.
  const url = 'https://example.org/flux-doublon-interne';
  const lien = 'https://example.org/meme-avis';
  const m = monde({
    sources: [source('SRC-001', url)],
    flux: { [url]: fluxRss([
      // Meme titre, meme lien : le meme avis. Mais le premier exemplaire
      // ne porte pas d'echeance, et le second oui.
      { titre: 'Fourniture de materiel', lien: lien,
        description: 'Avis de la banque centrale' },
      { titre: 'Fourniture de materiel', lien: lien,
        description: 'Date limite : ' + enFrancais(jourRelatif(25)) },
      // Un troisieme avis, distinct : sans lui les titres seraient tous
      // identiques et le flux passerait par la reparation DNCMP, qui
      // rebatit les titres depuis les descriptions.
      { titre: 'Etude hydraulique', lien: 'https://example.org/autre',
        description: 'Date limite : ' + enFrancais(jourRelatif(40)) }
    ]) },
    config: { SEND_NEW_OPPORTUNITY: 'false' }
  });

  let plantage = null;
  try {
    m.ctx.executerTenderPilot();
  } catch (e) {
    plantage = e.message;
  }

  check('l execution va jusqu au bout', plantage === null, plantage);
  check('l avis en double ne cree qu une ligne', m.feuille.opps.length === 2,
        m.feuille.opps.length + ' lignes');
  // Le tableau est desormais trie par delai : on cherche la ligne par son
  // titre plutot que par sa position.
  const fusionnee = m.feuille.opps.filter(
    o => o.title === 'Fourniture de materiel')[0];
  check('l echeance lue sur le second exemplaire complete le premier',
        fusionnee && fusionnee.deadline === jourRelatif(25),
        fusionnee ? fusionnee.deadline : 'ligne introuvable');
  check('aucune erreur d execution journalisee',
        !m.feuille.logs.some(l => l.action === 'Execution'
                                  && l.statut === 'ERROR'),
        (m.feuille.logs.filter(l => l.statut === 'ERROR')[0] || {}).message);

  const doublons = m.feuille.logs.filter(l => l.statut === 'DUPLICATE');
  check('le doublon interne est journalise', doublons.length === 1,
        doublons.length + ' lignes DUPLICATE');
  check('le journal nomme l annonce plutot que undefined',
        doublons.length === 1
        && doublons[0].message.indexOf('undefined') === -1
        && doublons[0].message.indexOf('Fourniture de materiel') === 0,
        doublons.length ? doublons[0].message : '');
}

// ==========================================================================
console.log('\n[Doublon interne] Une valeur deja lue n est jamais remplacee');
{
  // Deux exemplaires lus dans la MEME execution : aucun n'est plus recent
  // que l'autre. On complete ce qui manque, on n'arbitre pas entre deux
  // echeances - c'est la regle 2 du depot, ne jamais inventer une date.
  const C = monde({}).ctx;
  const attendue = { title: 'Avis', deadline: '2026-10-01', summary: '' };
  C.completerAnnonce_(attendue, { title: 'Avis', deadline: '2026-12-31',
                                  summary: 'Complement lu ailleurs' });
  check('l echeance deja lue est conservee',
        attendue.deadline === '2026-10-01', attendue.deadline);
  check('le champ vide est complete',
        attendue.summary === 'Complement lu ailleurs', attendue.summary);
}

// ==========================================================================
console.log('\n[Flux vide] Un flux valide sans annonce n est pas une panne');
{
  // MESURE DU 2026-09-02 : les bureaux PNUD du Cap-Vert et du Togo servent
  // un flux RSS 1.0 parfaitement valide, dont la liste est vide. Ils
  // etaient signales comme "la page a peut-etre change de structure" a
  // chaque execution.
  const vide = 'https://example.org/flux-vide';
  const casse = 'https://example.org/page-cassee';
  const m = monde({
    sources: [
      Object.assign(source('SRC-VIDE', vide), { _row: 2 }),
      Object.assign(source('SRC-CASSE', casse), { _row: 3 })
    ],
    flux: {
      // La forme exacte du PNUD : RSS 1.0, donc <rdf:RDF>, sans aucun item.
      [vide]: '<?xml version="1.0" encoding="ISO-8859-1" ?><rdf:RDF '
        + 'xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" '
        + 'xmlns="http://purl.org/rss/1.0/"><channel><title>UNDP - TOGO'
        + '</title><items><rdf:Seq></rdf:Seq></items></channel></rdf:RDF>',
      // Une page qui n'est pas un flux : le doute reste entier.
      [casse]: '<!DOCTYPE html><html><body><h1>Page introuvable</h1></body></html>'
    },
    config: { SEND_NEW_OPPORTUNITY: 'false' }
  });

  m.ctx.executerTenderPilot();

  const vidJ = m.feuille.logs.filter(l => l.source === 'SRC-VIDE');
  const casJ = m.feuille.logs.filter(l => l.source === 'SRC-CASSE');
  check('le flux vide n est pas accuse d avoir change de structure',
        vidJ.length === 1 && vidJ[0].message.indexOf('structure') === -1,
        vidJ.length ? vidJ[0].message : 'aucun journal');
  check('le flux vide est dit vide',
        vidJ.length === 1 && vidJ[0].message.indexOf('vide') !== -1,
        vidJ.length ? vidJ[0].message : '');
  check('la source vide est marquee FLUX VIDE',
        m.feuille.sources[0].status === 'FLUX VIDE',
        m.feuille.sources[0].status);
  check('une page qui n est pas un flux garde l avertissement',
        casJ.length === 1 && casJ[0].message.indexOf('structure') !== -1,
        casJ.length ? casJ[0].message : 'aucun journal');
  check('la source illisible reste marquee RIEN LU',
        m.feuille.sources[1].status === 'RIEN LU',
        m.feuille.sources[1].status);

  const C = m.ctx;
  check('un flux Atom est reconnu',
        C.estFluxXml('<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"></feed>'));
  check('une page HTML qui pointe vers un flux n est pas un flux',
        C.estFluxXml('<!DOCTYPE html><html><body>'
          + Array(500).join('texte ') + '<a href="x">rss</a></body></html>') === false);
  check('une reponse vide n est pas un flux', C.estFluxXml('') === false);
}

// ==========================================================================
console.log('\n[GIZ] Le tableau allemand, lu comme le fait le moteur web');
{
  const html = fs.readFileSync(
    path.join(path.resolve(__dirname), 'fixtures', 'giz-ausschreibungen.html'),
    'utf8');
  const C = monde({}).ctx;
  const src = source('GIZ', 'https://ausschreibungen.giz.de/');
  const lus = C.analyserPageGiz(html, src);

  const lignes = (html.match(/projectForwarding\.do\?pid=/g) || []).length;
  const attribues = (html.match(/Vergebener Auftrag/g) || []).length;
  check('les marches deja attribues sont ecartes',
        lus.length === lignes - attribues,
        lus.length + ' retenus sur ' + lignes + ' lignes, ' + attribues
        + ' attribues');
  check('toute annonce retenue porte une echeance',
        lus.every(o => /^\d{4}-\d{2}-\d{2}$/.test(String(o.deadline))),
        String((lus.find(o => !o.deadline) || {}).title));
  check('les liens pointent vers la fiche du projet',
        lus.every(o => /^https:\/\/ausschreibungen\.giz\.de\/.*pid=\d+$/
          .test(o.url)), lus[0] && lus[0].url);
  check('TNW devient AMI', lus.some(o => o.type === 'AMI'));
  check('Ausschreibung devient Appel d offres',
        lus.some(o => o.type === "Appel d'offres"));
  check('tous les types sont dans le vocabulaire ferme',
        lus.every(o => C.TYPES_ANNONCE.indexOf(o.type) !== -1),
        String((lus.find(o => C.TYPES_ANNONCE.indexOf(o.type) === -1) || {}).type));
  check('les umlauts survivent au decodage',
        lus.map(o => o.title).join(' ').indexOf('�') === -1);

  // 02.09.2026 est le 2 SEPTEMBRE. new Date() lit le point a l americaine
  // et rend le 9 fevrier : d ou la conversion a la main.
  check('une date allemande est lue jour-mois-annee',
        C.dateAllemande('02.09.2026') === '2026-09-02',
        C.dateAllemande('02.09.2026'));
  check('un jour et un mois courts sont acceptes',
        C.dateAllemande('1.3.2027') === '2027-03-01');
  check('ce qui n est pas une date allemande est refuse, pas devine',
        C.dateAllemande('nv') === null && C.dateAllemande('') === null
        && C.dateAllemande('24.13.2026') === null
        && C.dateAllemande('2026-09-24') === null);
  check('les deux moteurs lisent la meme chose sur la meme page',
        lus.length === 13, lus.length + ' annonces');
}

// ==========================================================================
console.log('\n[Liens] Chaque annonce pointe sur SA fiche');
{
  const C = monde({}).ctx;

  // DEDRAS : mesure du 2026-09-02, les 98 avis renvoyaient tous a la page
  // de liste, et il fallait y rechercher l annonce a la main.
  const html = fs.readFileSync(
    path.join(path.resolve(__dirname), 'fixtures', 'dedras-toutvoir.html'),
    'utf8');
  const lus = C.analyserPageDedras(html, source('BJ-DEDRAS',
    'https://eprocurement.dedras.org/toutvoir'));
  const liens = {};
  lus.forEach(o => { liens[o.url] = true; });
  check('DEDRAS : autant de liens que d avis',
        Object.keys(liens).length === lus.length,
        Object.keys(liens).length + ' liens pour ' + lus.length + ' avis');
  check('DEDRAS : chaque lien mene a la fiche du marche',
        lus.every(o => /^https:\/\/eprocurement\.dedras\.org\/tenderforapplication/
          .test(o.url)), lus[0] && lus[0].url);

  // DNCMP : le flux publie marches-public.bj, sans le s. Ce domaine ne
  // resout pas ; le portail est marches-publics.bj et sert la meme page.
  check('un domaine que la source ecrit faux est corrige',
        C.nettoyerLien('https://www.marches-public.bj/appels-doffres')
          === 'https://www.marches-publics.bj/appels-doffres',
        C.nettoyerLien('https://www.marches-public.bj/appels-doffres'));
  check('le parametre de la page est conserve',
        C.nettoyerLien('http://marches-public.bj/x?a=1')
          === 'https://www.marches-publics.bj/x?a=1');
  check('une adresse deja correcte n est pas touchee',
        C.nettoyerLien('https://www.marches-publics.bj/appels-doffres')
          === 'https://www.marches-publics.bj/appels-doffres');
  // Sans cette precaution, un domaine qui commence pareil serait redirige.
  check('un domaine sosie n est PAS reecrit',
        C.nettoyerLien('https://www.marches-public.bj.autre.test/x')
          === 'https://www.marches-public.bj.autre.test/x',
        C.nettoyerLien('https://www.marches-public.bj.autre.test/x'));

  // Portail europeen : 100 resultats pour 50 identifiants, chaque appel
  // etant rendu dans toutes ses langues.
  const topic = (id, langue, titre) => ({
    reference: 'topic/' + id + '-' + langue,
    metadata: { title: [titre], identifier: [id], language: [langue],
                deadlineDate: ['2026-12-01T17:00:00+01:00'], type: ['1'] }
  });
  const europe = C.analyserApiEuropa(JSON.stringify({ results: [
    topic('CERV-2026-TEST', 'en', 'Call for proposals'),
    topic('CERV-2026-TEST', 'fr', 'Appel a propositions'),
    topic('HORIZON-2026-SEUL', 'en', 'Only in English')
  ] }), source('EU-PORTAL', 'https://exemple.test/eu'));
  check('le meme appel europeen ne compte qu une fois',
        europe.length === 2, europe.length + ' lignes');
  check('le francais l emporte quand il existe',
        europe[0] && europe[0].title === 'Appel a propositions',
        europe[0] && europe[0].title);
  check('sans version francaise, l appel reste dans sa langue',
        europe[1] && europe[1].title === 'Only in English',
        europe[1] && europe[1].title);
}

// ==========================================================================
console.log('\n[Budget] Le montant vient de la source, jamais du moteur');
{
  const C = monde({}).ctx;

  check('un nombre nu devient un montant lisible',
        C.budgetSimple('120000', 'EUR') === '120 000 EUR',
        C.budgetSimple('120000', 'EUR'));
  check('les decimales de l API sont arrondies',
        C.budgetSimple('42000.00', 'usd') === '42 000 USD',
        C.budgetSimple('42000.00', 'usd'));
  check('rien a annoncer : la colonne reste vide, elle ne dit pas 0',
        C.budgetSimple('0', 'EUR') === '' && C.budgetSimple('', 'EUR') === ''
        && C.budgetSimple(null, 'EUR') === ''
        && C.budgetSimple('a negocier', 'EUR') === '');

  check('une fourchette se lit dans les deux sens',
        C.budgetFourchette('10000', '250000', 'USD') === '10 000 - 250 000 USD',
        C.budgetFourchette('10000', '250000', 'USD'));
  check('un minimum egal au maximum ne se repete pas',
        C.budgetFourchette('730000', '730000', 'USD') === '730 000 USD');
  // Fundpilote pose un minimum a zero sur la moitie de ses annonces : ce
  // n est pas une information, c est un defaut d API.
  check('un minimum a zero est ignore',
        C.budgetFourchette('0.00', '42000.00', 'EUR') === "jusqu'a 42 000 EUR",
        C.budgetFourchette('0.00', '42000.00', 'EUR'));
  check('sans aucun montant, rien n est invente',
        C.budgetFourchette(null, null, 'EUR') === '');

  // Le portail europeen expose son budget dans metadata.budget : 20 avis
  // sur 100 le 2026-09-02.
  const src = source('EU-PORTAL', 'https://exemple.test/eu');
  const corps = JSON.stringify({ results: [
    { reference: 'topic/TEST-01',
      metadata: { title: ['Appel de test'], identifier: ['TEST-01'],
                  deadlineDate: ['2026-12-01T17:00:00+01:00'],
                  budget: ['120000'], type: ['1'] } },
    { reference: 'topic/TEST-02',
      metadata: { title: ['Appel sans budget'], identifier: ['TEST-02'],
                  deadlineDate: ['2026-12-01T17:00:00+01:00'], type: ['1'] } }
  ] });
  const lus = C.analyserApiEuropa(corps, src);
  check('le budget europeen arrive dans sa colonne',
        lus[0] && lus[0].budget === '120 000 EUR',
        lus[0] && lus[0].budget);
  check('une annonce sans budget laisse la colonne vide',
        lus[1] && lus[1].budget === '', JSON.stringify(lus[1] && lus[1].budget));

  // Les deux moteurs doivent ecrire exactement la meme chaine.
  check('la mise en forme est identique cote web',
        C.budgetSimple('1234567', 'EUR') === '1 234 567 EUR',
        C.budgetSimple('1234567', 'EUR'));
}

// ==========================================================================
console.log('\n[Acheteur] L auteur du flux nomme le pouvoir adjudicateur');
{
  // MESURE DU 2026-09-02, sur la DNCMP : le flux des marches publics du
  // Benin met le pouvoir adjudicateur dans <author>. On l ignorait, et les
  // 46 annonces portaient le nom de la SOURCE a la place de leur acheteur.
  const url = 'https://exemple.test/flux-acheteur';
  const xml = '<?xml version="1.0"?><rss version="2.0"><channel>'
    + '<item><title>Appel d Offre</title>'
    + '<link>https://exemple.test/a1</link>'
    + '<description>Acquisition d une infrastructure hyperconvergee</description>'
    + '<author>Societe Beninoise d Energie Electrique</author></item>'
    + '<item><title>Appel d Offre</title>'
    + '<link>https://exemple.test/a2</link>'
    + '<description>Renouvellement des licences bureautiques</description>'
    + '<author>Agence des Systemes d Information et du Numerique (ASIN)</author>'
    + '</item></channel></rss>';
  const m = monde({
    sources: [source('BJ-DNCMP', url)], flux: { [url]: xml },
    config: { SEND_NEW_OPPORTUNITY: 'false' }
  });

  m.ctx.executerTenderPilot();
  const orgs = m.feuille.opps.map(o => o.org).sort();
  check('l acheteur reel remplace le nom de la source',
        orgs.indexOf('Societe Beninoise d Energie Electrique') !== -1,
        orgs.join(' | '));
  // La parenthese ne prime que derriere une adresse : un acheteur ne doit
  // pas etre reduit a son sigle.
  check('un nom suivi de son sigle reste entier',
        orgs.indexOf('Agence des Systemes d Information et du Numerique (ASIN)')
          !== -1, orgs.join(' | '));

  const C = m.ctx;
  const item = (auteur) => '<item><title>Avis</title>'
    + '<link>https://exemple.test/x</link><description>Objet</description>'
    + '<author>' + auteur + '</author></item>';
  check('une adresse email seule ne nomme aucun acheteur',
        C.auteurFlux_(item('redaction@site.org')) === '');
  check('un nom derriere une adresse est retenu',
        C.auteurFlux_(item('redaction@site.org (Agence X)')) === 'Agence X',
        C.auteurFlux_(item('redaction@site.org (Agence X)')));
  check('sans auteur, le defaut de la source reprend la main',
        C.auteurFlux_('<item><title>Avis</title></item>') === '');
}

// ==========================================================================
console.log('\n[Deux temps] La fiche apporte la date que la liste tait');
{
  const C = monde({}).ctx;
  const R = path.join(path.resolve(__dirname), 'fixtures');
  const liste = fs.readFileSync(path.join(R, 'jobrelais-liste.html'), 'utf8');
  const fiche = fs.readFileSync(path.join(R, 'jobrelais-fiche.html'), 'utf8');

  const src = Object.assign(source('JOBRELAIS', 'https://exemple.test/jr'),
                            { country: 'Benin', sector: '', type: "Appel d'offres" });
  const lus = C.analyserPageJobrelais(liste, src);
  check('la liste rend douze avis', lus.length === 12, lus.length + ' avis');
  check('et aucune date : c est tout le probleme',
        lus.every(o => !o.deadline));
  check('la meme carte n est pas comptee deux fois',
        new Set(lus.map(o => o.url)).size === lus.length);

  const detail = C.analyserFicheJobrelais(fiche);
  check('la fiche porte l echeance', detail.deadline === '2026-11-26',
        JSON.stringify(detail.deadline));
  check('et la date de publication', detail.published === '2026-08-26');
  check('et un resume', String(detail.summary).length > 40);

  // La fusion ne remplace jamais ce que la liste a lu.
  const annonce = { title: 'Titre de la liste', deadline: '', summary: 'deja la' };
  C.fusionnerFiche_(annonce, { deadline: '2026-11-26', summary: 'de la fiche',
                               title: 'Titre de la fiche' });
  check('une case vide est comblee', annonce.deadline === '2026-11-26');
  check('une case pleine n est JAMAIS ecrasee',
        annonce.summary === 'deja la' && annonce.title === 'Titre de la liste',
        annonce.summary + ' / ' + annonce.title);

  check('une fiche illisible ne fait rien tomber',
        JSON.stringify(C.analyserFicheJobrelais('<html>pas de balisage</html>'))
          === '{}');
  check('un analyseur de fiche n existe que pour les sources qui en ont un',
        typeof C.analyseurFiche_('HTML:jobrelais.com') === 'function'
        && C.analyseurFiche_('HTML:giz.de') === null
        && C.analyseurFiche_('RSS') === null);
}

// ==========================================================================
console.log('\n[Deux temps] Borne, et sans jamais tourner en rond');
{
  const liste = 'https://exemple.test/jr-liste';
  const fiches = {};
  const pages = [];
  for (let i = 0; i < 5; i++) {
    fiches['https://exemple.test/opportunities/call-for-tenders/avis-' + i] = i;
    pages.push('<h3 class="line-clamp-2"><a href="https://exemple.test/'
      + 'opportunities/call-for-tenders/avis-' + i + '">Avis ' + i + '</a></h3>');
  }
  const corpsListe = '<html>' + pages.join('') + '</html>';
  const ficheDe = (n) => '<script type="application/ld+json">'
    + JSON.stringify({ '@type': 'JobPosting',
        validThrough: jourRelatif(20 + n) + 'T10:00',
        datePosted: jourRelatif(-5), description: 'Detail de l avis ' + n })
    + '</script>';

  const m = monde({
    sources: [Object.assign(source('JOBRELAIS', liste),
                            { method: 'HTML:jobrelais.com' })],
    config: { SEND_NEW_OPPORTUNITY: 'false', MAX_FICHES_PAR_PASSAGE: '2' }
  });
  let requetes = 0;
  m.ctx.UrlFetchApp.fetch = function (url) {
    requetes++;
    const n = /avis-(\d+)/.exec(url);
    return {
      getResponseCode: () => 200,
      getAllHeaders: () => ({ 'Content-Type': 'text/html' }),
      getContentText: () => (n ? ficheDe(Number(n[1])) : corpsListe)
    };
  };

  m.ctx.executerTenderPilot();
  check('le plafond de fiches est respecte',
        m.feuille.opps.length === 2, m.feuille.opps.length + ' annonces');
  check('une liste + deux fiches, pas plus', requetes === 3,
        requetes + ' requetes');
  check('les annonces retenues sont datees',
        m.feuille.opps.every(o => /^\d{4}-\d{2}-\d{2}$/.test(String(o.deadline))));
  check('le report est journalise',
        m.feuille.logs.some(l => l.message.indexOf('MAX_FICHES_PAR_PASSAGE') !== -1),
        JSON.stringify(m.feuille.logs.filter(l => l.action === 'Collecte')
          .map(l => l.message).slice(-2)));

  // Second passage : les deux deja connues ne sont PAS relues, le
  // rattrapage avance.
  requetes = 0;
  m.ctx.executerTenderPilot();
  check('les fiches deja connues ne sont pas relues', requetes === 3,
        requetes + ' requetes au second passage');
  check('deux annonces de plus sont entrees',
        m.feuille.opps.length === 4, m.feuille.opps.length + ' annonces');

  m.ctx.executerTenderPilot();
  check('au bout de trois passages, les cinq sont la',
        m.feuille.opps.length === 5, m.feuille.opps.length + ' annonces');
  check('aucune n est entree deux fois',
        new Set(m.feuille.opps.map(o => o.title)).size === m.feuille.opps.length);
}

// ==========================================================================
console.log('\n[Deux temps] Une annonce qu on n a pas pu dater n entre pas');
{
  const liste = 'https://exemple.test/jr-muet';
  const m = monde({
    sources: [Object.assign(source('JOBRELAIS', liste),
                            { method: 'HTML:jobrelais.com' })],
    config: { SEND_NEW_OPPORTUNITY: 'false', MAX_FICHES_PAR_PASSAGE: '5' }
  });
  m.ctx.UrlFetchApp.fetch = function (url) {
    const estFiche = url.indexOf('/call-for-tenders/') !== -1;
    return {
      getResponseCode: () => 200,
      getAllHeaders: () => ({ 'Content-Type': 'text/html' }),
      // La fiche existe mais ne porte aucun balisage exploitable.
      getContentText: () => estFiche ? '<html>rien d exploitable</html>'
        : '<h3 class="line-clamp-2"><a href="https://exemple.test/'
          + 'opportunities/call-for-tenders/avis-x">Avis muet</a></h3>'
    };
  };
  m.ctx.executerTenderPilot();
  // Pour une source qui declare un analyseur de fiche, sans date veut dire
  // "fiche non lue", pas "avis sans echeance".
  check('elle n entre pas dans le tableau', m.feuille.opps.length === 0,
        m.feuille.opps.length + ' annonces');
  check('et le passage aboutit quand meme',
        m.feuille.logs.some(l => l.action === 'Execution'
                                 && l.statut === 'SUCCESS'));
}

// ==========================================================================
console.log('\n[Plan International] Huit appels, huit dossiers');
{
  const html = fs.readFileSync(
    path.join(path.resolve(__dirname), 'fixtures',
              'plan-international-tenders.html'), 'utf8');
  const C = monde({}).ctx;
  const lus = C.analyserPagePlanInternational(html,
    Object.assign(source('PLAN-TENDERS', 'https://exemple.test/plan'),
                  { country: 'International', sector: '', type: "Appel d'offres" }));

  check('les huit appels sont lus', lus.length === 8, lus.length + ' appels');
  check('chacun porte une echeance',
        lus.every(o => /^\d{4}-\d{2}-\d{2}$/.test(String(o.deadline))),
        String((lus.find(o => !o.deadline) || {}).title));
  // Pas de page par appel, mais un dossier par appel : c est le contraire
  // de la DNCMP, ou ni l un ni l autre n existait.
  check('chacun porte son dossier dans la colonne PDF',
        lus.every(o => /^https:\/\/plan-international\.org\/uploads\//.test(o.pdf)),
        String((lus.find(o => !o.pdf) || {}).title));
  check('les separateurs vides ne deviennent pas des annonces',
        lus.every(o => o.title.trim().length > 3));
  check('un appel beninois est bien present',
        lus.some(o => /BEN\/CO/.test(o.title)),
        lus.map(o => o.title.slice(0, 24)).join(' | '));

  // La tournure anglaise et le rang ordinal, ajoutes le 2026-09-04.
  check('une echeance en prose anglaise est lue',
        C.jour(C.extractDeadline(
          'Responses should be submitted no later than Friday, 28th August 2026.'))
          === '2026-08-28');
  check('une date sans mot annonciateur reste ignoree',
        C.extractDeadline('Publie le 12 mars 2026, sans autre mention') === null);
}

// ==========================================================================
console.log('\n[Expertise France] Pays, secteur et echeance sur chaque offre');
{
  const html = fs.readFileSync(
    path.join(path.resolve(__dirname), 'fixtures',
              'expertise-france-offres.html'), 'utf8');
  const C = monde({}).ctx;
  const lus = C.analyserPageExpertiseFrance(html,
    Object.assign(source('EF-OFFRES', 'https://exemple.test/ef'),
                  { country: 'International', sector: '', type: "Appel d'offres" }));

  check('dix offres par page', lus.length === 10, lus.length + ' offres');
  check('chacune porte une date limite',
        lus.every(o => /^\d{4}-\d{2}-\d{2}$/.test(String(o.deadline))),
        String((lus.find(o => !o.deadline) || {}).title));
  // Deux <span class="country"> : la zone puis le pays. C est le pays qui
  // situe l annonce, et que la colonne Pertinence compare.
  check('le pays prime sur la zone',
        lus.some(o => o.country === 'TANZANIE')
        && !lus.some(o => o.country === 'AFRIQUE SUBSAHARIENNE'),
        lus.map(o => o.country).join(','));
  check('la zone reste dans le resume',
        lus[0].summary.indexOf('AFRIQUE SUBSAHARIENNE') !== -1);
  check('un CDDU est un poste',
        (lus.find(o => /Responsable Administratif/i.test(o.title)) || {}).type
          === 'Recrutement');
  // "Contrat de prestation de services" recouvre l expert individuel comme
  // l agence : on ne tranche pas, le defaut de la source s applique.
  check('une prestation garde le defaut de la source',
        (lus.find(o => /career guidance/i.test(o.title)) || {}).type
          === "Appel d'offres");
  check('les accents francais sont decodes',
        lus.map(o => o.title).join(' ').indexOf('&eacute;') === -1
        && lus.some(o => /é|è|ô/.test(o.title)),
        lus[2] && lus[2].title.slice(0, 50));
  check('le lien ne garde pas le backlink du site',
        lus.every(o => o.url.indexOf('backlink') === -1), lus[0].url);

  // Les deux moteurs doivent decoder les memes entites.
  check('une entite inconnue reste telle quelle',
        C.decodeEntities('&inconnu; intact') === '&inconnu; intact');
  check('les guillemets et l apostrophe typographique sont rendus',
        C.decodeEntities('&laquo; d&rsquo;accord &raquo;') === '« d’accord »',
        C.decodeEntities('&laquo; d&rsquo;accord &raquo;'));
}

// ==========================================================================
console.log('\n[Niger Marches] L API WordPress, lue comme par le moteur web');
{
  const corps = fs.readFileSync(
    path.join(path.resolve(__dirname), 'fixtures', 'nigermarches-appels.json'),
    'utf8');
  const C = monde({}).ctx;
  const src = Object.assign(source('NE-MARCHES', 'https://exemple.test/api'),
                            { country: 'Niger', sector: '' });
  const lus = C.analyserApiNigerMarches(corps, src);

  check('les vingt avis sont lus', lus.length === 20, lus.length + ' avis');
  check('chacun porte une echeance',
        lus.every(o => /^\d{4}-\d{2}-\d{2}$/.test(String(o.deadline))),
        String((lus.find(o => !o.deadline) || {}).title));
  check('l echeance ne recule pas d un jour',
        lus[0].deadline === '2026-10-05', lus[0].deadline);
  check('l acheteur reel remplace le nom de la source',
        lus.some(o => /Sans Fronti/.test(String(o.org))),
        String(lus[1] && lus[1].org));
  check('une manifestation d interet est reconnue',
        (lus.find(o => /MANIFESTATION/i.test(o.title)) || {}).type === 'AMI');
  check('sans mention explicite, le defaut de la source s applique',
        (lus.find(o => /pompage/i.test(o.title)) || {}).type
          === "Appel d'offres");
  check('une reponse illisible ne casse pas la collecte',
        C.analyserApiNigerMarches('', src).length === 0
        && C.analyserApiNigerMarches('<html>', src).length === 0
        && C.analyserApiNigerMarches('{"code":"rest_no_route"}', src).length === 0);
}

// ==========================================================================
console.log('\n[Pagination] Une source {page} est lue jusqu au bout');
{
  const gabarit = 'https://exemple.test/liste?p={page}';
  const page = (n, entrees) => fluxRss(entrees);
  const m = monde({
    sources: [source('PAGINEE', gabarit)],
    flux: {
      'https://exemple.test/liste?p=1': page(1, [
        { titre: 'Avis un', lien: 'https://exemple.test/1',
          description: 'Date limite : ' + enFrancais(jourRelatif(30)) }]),
      'https://exemple.test/liste?p=2': page(2, [
        { titre: 'Avis deux', lien: 'https://exemple.test/2',
          description: 'Date limite : ' + enFrancais(jourRelatif(31)) }]),
      // Une page entiere sans rien de neuf : ce n est pas la fin.
      'https://exemple.test/liste?p=3': page(3, [
        { titre: 'Avis un', lien: 'https://exemple.test/1',
          description: 'Date limite : ' + enFrancais(jourRelatif(30)) }]),
      'https://exemple.test/liste?p=4': page(4, [
        { titre: 'Avis quatre', lien: 'https://exemple.test/4',
          description: 'Date limite : ' + enFrancais(jourRelatif(32)) }]),
      'https://exemple.test/liste?p=5': fluxRss([]),
      'https://exemple.test/liste?p=6': fluxRss([])
    },
    config: { SEND_NEW_OPPORTUNITY: 'false' }
  });

  m.ctx.executerTenderPilot();
  const titres = m.feuille.opps.map(o => o.title).sort();
  check('les quatre pages utiles sont lues',
        titres.join(' | ') === 'Avis deux | Avis quatre | Avis un',
        titres.join(' | '));
  check('une page sans rien de neuf n arrete pas la pagination',
        titres.indexOf('Avis quatre') !== -1);
}

console.log('\n[Pagination] Deux pages vides d affilee arretent la lecture');
{
  const gabarit = 'https://exemple.test/court?p={page}';
  const demandees = [];
  const m = monde({
    sources: [source('COURTE', gabarit)],
    flux: {},
    config: { SEND_NEW_OPPORTUNITY: 'false' }
  });
  m.ctx.UrlFetchApp.fetch = function (url) {
    demandees.push(url);
    const n = Number(/p=(\d+)/.exec(url)[1]);
    return {
      getResponseCode: () => 200,
      getAllHeaders: () => ({ 'Content-Type': 'application/rss+xml' }),
      getContentText: () => n === 1
        ? fluxRss([{ titre: 'Seule annonce', lien: 'https://exemple.test/x',
                     description: 'Date limite : ' + enFrancais(jourRelatif(20)) }])
        : fluxRss([])
    };
  };

  m.ctx.executerTenderPilot();
  check('la lecture s arrete apres deux pages vides',
        demandees.length === 3, demandees.length + ' pages demandees');
  check('l annonce de la premiere page est bien entree',
        m.feuille.opps.length === 1, m.feuille.opps.length + ' lignes');
}

console.log('\n[Pagination] Une source sans {page} ne demande qu une page');
{
  const url = 'https://exemple.test/simple';
  const demandees = [];
  const m = monde({
    sources: [source('SIMPLE', url)],
    config: { SEND_NEW_OPPORTUNITY: 'false' }
  });
  m.ctx.UrlFetchApp.fetch = function (adresse) {
    demandees.push(adresse);
    return {
      getResponseCode: () => 200,
      getAllHeaders: () => ({ 'Content-Type': 'application/rss+xml' }),
      getContentText: () => fluxRss([
        { titre: 'Annonce simple', lien: 'https://exemple.test/s1',
          description: 'Date limite : ' + enFrancais(jourRelatif(20)) }])
    };
  };

  m.ctx.executerTenderPilot();
  check('une seule requete', demandees.length === 1,
        demandees.length + ' requetes');
  check('l adresse n a pas ete transformee', demandees[0] === url,
        demandees[0]);
}

// ==========================================================================
console.log('\n[Pertinence] Ce que l annonce vaut pour CE client-la');
{
  const C = monde({}).ctx;
  const P = C.SCHEMA;
  const profil = { PAYS_SUIVIS: 'Benin, Togo',
                   SECTEURS_SUIVIS: 'Energie, Eau et assainissement' };
  const avis = (pays, secteur) => ({ country: pays, sector: secteur });

  check('pays suivi et secteur suivi : prioritaire',
        C.pertinence(avis('Benin', 'Energie'), profil)
          === P.PERTINENCE_PRIORITAIRE,
        C.pertinence(avis('Benin', 'Energie'), profil));
  check('pays suivi, secteur inconnu : a voir',
        C.pertinence(avis('Togo', 'Non precise'), profil)
          === P.PERTINENCE_A_VOIR,
        C.pertinence(avis('Togo', 'Non precise'), profil));
  check('pays suivi, autre secteur : possible',
        C.pertinence(avis('Benin', 'Culture et arts'), profil)
          === P.PERTINENCE_POSSIBLE,
        C.pertinence(avis('Benin', 'Culture et arts'), profil));
  check('appel mondial dans votre secteur : a voir, jamais ecarte',
        C.pertinence(avis('International', 'Energie'), profil)
          === P.PERTINENCE_A_VOIR,
        C.pertinence(avis('International', 'Energie'), profil));
  check('autre pays, autre secteur : hors profil',
        C.pertinence(avis('Kenya', 'Culture et arts'), profil)
          === P.PERTINENCE_HORS_PROFIL,
        C.pertinence(avis('Kenya', 'Culture et arts'), profil));

  // Ne rien declarer n est pas se restreindre : le client livre n a aucun
  // secteur suivi, et ses annonces beninoises doivent rester en tete.
  const sansSecteurs = { PAYS_SUIVIS: 'Benin', SECTEURS_SUIVIS: '' };
  check('sans secteurs declares, le pays suffit a etre prioritaire',
        C.pertinence(avis('Benin', 'Culture et arts'), sansSecteurs)
          === P.PERTINENCE_PRIORITAIRE,
        C.pertinence(avis('Benin', 'Culture et arts'), sansSecteurs));
  check('sans secteurs declares, un appel mondial reste a voir',
        C.pertinence(avis('International', 'Culture et arts'), sansSecteurs)
          === P.PERTINENCE_A_VOIR);

  // Une configuration vide ne doit jamais degrader une annonce.
  check('sans aucune configuration, rien n est hors profil',
        C.pertinence(avis('Kenya', 'Culture et arts'), {})
          === P.PERTINENCE_A_VOIR,
        C.pertinence(avis('Kenya', 'Culture et arts'), {}));

  check('la casse et les accents ne changent rien',
        C.pertinence(avis('BENIN', 'ENERGIE'), profil)
          === P.PERTINENCE_PRIORITAIRE);
  check('un libelle plus long contient le pays suivi',
        C.pertinence(avis('Benin (Cotonou)', 'Energie'), profil)
          === P.PERTINENCE_PRIORITAIRE);
  check('les quatre libelles commencent par leur rang',
        P.PERTINENCE_SEUILS.every(s => /^\d - /.test(s[0]))
        && /^\d - /.test(P.PERTINENCE_HORS_PROFIL));
}

// ==========================================================================
console.log('\n[Pertinence] La colonne suit la configuration, sans supprimer');
{
  const url = 'https://exemple.test/flux-pertinence';
  const m = monde({
    sources: [Object.assign(source('SRC-001', url), { country: 'Kenya',
                                                      sector: 'Culture et arts' })],
    flux: { [url]: fluxRss([
      { titre: 'Atelier de peinture a Nairobi',
        lien: 'https://exemple.test/p1',
        description: 'Date limite : ' + enFrancais(jourRelatif(30)) }]) },
    config: { SEND_NEW_OPPORTUNITY: 'false', PAYS_SUIVIS: 'Benin',
              SECTEURS_SUIVIS: 'Energie' }
  });

  m.ctx.executerTenderPilot();
  check('l annonce hors profil est CONSERVEE', m.feuille.opps.length === 1,
        m.feuille.opps.length + ' lignes');
  check('elle est etiquetee hors profil',
        m.feuille.opps[0].pertinence === m.ctx.SCHEMA.PERTINENCE_HORS_PROFIL,
        m.feuille.opps[0].pertinence);

  // Le client elargit son profil : le tableau entier se remet a jour au
  // passage suivant, sans recollecter quoi que ce soit.
  m.feuille.config.PAYS_SUIVIS = 'Benin, Kenya';
  m.feuille.config.SECTEURS_SUIVIS = 'Energie, Culture et arts';
  m.ctx.executerTenderPilot();
  check('la meme ligne devient prioritaire apres changement de profil',
        m.feuille.opps[0].pertinence === m.ctx.SCHEMA.PERTINENCE_PRIORITAIRE,
        m.feuille.opps[0].pertinence);
  check('aucune ligne dupliquee au passage', m.feuille.opps.length === 1,
        m.feuille.opps.length + ' lignes');
}

// ==========================================================================
console.log('\n[Pertinence] Le recapitulatif commence par ce qui vous concerne');
{
  const url = 'https://exemple.test/flux-digest-pertinence';
  const entrees = [];
  // Six annonces hors profil, puis une seule qui concerne le client.
  for (let i = 0; i < 6; i++) {
    entrees.push({ titre: 'Annonce lointaine ' + i,
      lien: 'https://exemple.test/loin' + i,
      description: 'Date limite : ' + enFrancais(jourRelatif(30)) });
  }
  const m = monde({
    sources: [Object.assign(source('SRC-LOIN', url),
                            { country: 'Kenya', sector: 'Culture et arts' })],
    flux: { [url]: fluxRss(entrees) },
    config: { PAYS_SUIVIS: 'Benin', SECTEURS_SUIVIS: 'Energie',
              DIGEST_THRESHOLD: '3' }
  });
  m.ctx.executerTenderPilot();

  const lignes = m.feuille.opps.slice();
  lignes[0].pertinence = m.ctx.SCHEMA.PERTINENCE_PRIORITAIRE;
  lignes[0].title = 'Celle qui compte';
  const digest = m.ctx.messageDigest(lignes);
  const premiere = digest.corps.split('\n')[2];
  check('la plus pertinente est en tete du recapitulatif',
        premiere.indexOf('Celle qui compte') !== -1, premiere);
  check('le libelle de pertinence apparait dans le recapitulatif',
        digest.corps.indexOf('PRIORITAIRE') !== -1);
}

// ==========================================================================
console.log('\n[Ordre du tableau] Le plus de temps devant en haut');
{
  const C = monde({}).ctx;
  const l = (id, jours, pert) => ({ id: id, days: jours, pertinence: pert });

  const ordre = C.parDelai_([
    l('C', 3), l('A', 60), l('SANS', null), l('B', 12), l('EXPIRE', -5),
    l('VIDE', '')
  ]).map(o => o.id);
  check('la plus lointaine echeance passe en tete',
        ordre[0] === 'A', ordre.join(' > '));
  check('puis les suivantes, du plus loin au plus proche',
        ordre.slice(0, 4).join(' ') === 'A B C EXPIRE', ordre.join(' > '));
  check('les expirees passent sous les ouvertes',
        ordre.indexOf('EXPIRE') < ordre.indexOf('SANS')
        && ordre.indexOf('EXPIRE') > ordre.indexOf('C'), ordre.join(' > '));
  check('celles sans echeance sont tout en bas',
        ordre.slice(-2).sort().join(' ') === 'SANS VIDE', ordre.join(' > '));

  // A delai egal, c est la pertinence qui departage.
  const P = C.SCHEMA;
  const egalite = C.parDelai_([
    l('BANAL', 10, P.PERTINENCE_HORS_PROFIL),
    l('POUR-MOI', 10, P.PERTINENCE_PRIORITAIRE)
  ]).map(o => o.id);
  check('a delai egal, le plus pertinent passe devant',
        egalite[0] === 'POUR-MOI', egalite.join(' > '));

  check('le tableau recu n est pas modifie', (function () {
    const source = [l('X', 1), l('Y', 9)];
    C.parDelai_(source);
    return source[0].id === 'X';
  })());
}

// ==========================================================================
console.log('\n[Ordre du tableau] Le classeur est range apres chaque passage');
{
  const url = 'https://exemple.test/flux-ordre-feuille';
  const m = monde({
    sources: [source('SRC-001', url)],
    flux: { [url]: fluxRss([
      { titre: 'Dans une semaine', lien: 'https://exemple.test/o1',
        description: 'Date limite : ' + enFrancais(jourRelatif(7)) },
      { titre: 'Dans deux mois', lien: 'https://exemple.test/o2',
        description: 'Date limite : ' + enFrancais(jourRelatif(60)) },
      { titre: 'Sans echeance connue', lien: 'https://exemple.test/o3',
        description: 'Aucune date dans cette annonce' },
      { titre: 'Dans un mois', lien: 'https://exemple.test/o4',
        description: 'Date limite : ' + enFrancais(jourRelatif(30)) }
    ]) },
    config: { SEND_NEW_OPPORTUNITY: 'false' }
  });

  m.ctx.executerTenderPilot();
  const titres = m.feuille.opps.map(o => o.title);
  check('le tableau est range du plus lointain au plus proche',
        titres.join(' | ')
          === 'Dans deux mois | Dans un mois | Dans une semaine | Sans echeance connue',
        titres.join(' | '));
  check('les numeros de ligne suivent le nouvel ordre',
        m.feuille.opps.every((o, i) => o._row === i + 2),
        m.feuille.opps.map(o => o._row).join(','));

  // Le passage suivant relit la feuille rangee : rien ne doit bouger ni se
  // dupliquer.
  m.ctx.executerTenderPilot();
  check('un second passage ne cree aucun doublon',
        m.feuille.opps.length === 4, m.feuille.opps.length + ' lignes');
  check('et garde le meme ordre',
        m.feuille.opps.map(o => o.title).join(' | ') === titres.join(' | '),
        m.feuille.opps.map(o => o.title).join(' | '));
}

// ==========================================================================
console.log('\n[Declencheur] Une fenetre resserree, jamais une alarme');
{
  // MESURE DU 2026-09-03 : l execution de 8h est passee a 8h55. C est le
  // comportement documente d Apps Script - atHour(8) veut dire "entre 8h et
  // 9h" - mais c est deroutant. nearMinute(0) ramene la fenetre a plus ou
  // moins quinze minutes.
  const m = monde({});
  const poses = [];
  const constructeur = (h) => ({
    atHour: function (heure) { this.heure = heure; return this; },
    nearMinute: function (minute) { this.minute = minute; return this; },
    everyDays: function (n) { this.jours = n; return this; },
    create: function () {
      poses.push({ heure: this.heure, minute: this.minute, jours: this.jours });
    }
  });
  m.ctx.ScriptApp = {
    getProjectTriggers: () => [],
    newTrigger: () => ({ timeBased: () => constructeur() })
  };
  m.ctx.SpreadsheetApp = { getActive: () => ({ toast: () => {} }) };

  m.ctx.installerDeclencheur();

  check('trois declencheurs quotidiens sont poses', poses.length === 3,
        poses.length + ' declencheurs');
  check('aux heures annoncees',
        poses.map(p => p.heure).join(',') === '8,13,18',
        poses.map(p => p.heure).join(','));
  check('chacun resserre sa fenetre a la minute zero',
        poses.every(p => p.minute === 0),
        JSON.stringify(poses.map(p => p.minute)));
  check('et se repete tous les jours',
        poses.every(p => p.jours === 1));
  check('le journal previent que ce n est pas a la minute pres',
        m.feuille.logs.some(l => l.action === 'Declencheur'
          && l.message.indexOf('quinze minutes') !== -1),
        JSON.stringify(m.feuille.logs.filter(l => l.action === 'Declencheur')
          .map(l => l.message)));
}

// ==========================================================================
console.log('\n[Duree] La collecte s arrete avant les six minutes, et reprend');
{
  // MESURE DU 2026-09-03 : l execution a depasse la limite d Apps Script.
  // Le passage entier etait perdu - ni deadlines, ni couleurs, ni emails.
  // Desormais la collecte rend la main, et le passage suivant reprend la
  // ou celui-ci s est arrete.
  const flux = {};
  const sources = [];
  for (let i = 0; i < 6; i++) {
    const url = 'https://exemple.test/lent' + i;
    sources.push(Object.assign(source('SRC-' + i, url), { _row: i + 2 }));
    flux[url] = fluxRss([{ titre: 'Annonce ' + i,
      lien: 'https://exemple.test/a' + i,
      description: 'Date limite : ' + enFrancais(jourRelatif(30)) }]);
  }

  // Chaque source coute une seconde de fausse horloge ; le budget en
  // autorise deux.
  const m = monde({ sources: sources, flux: flux,
                    config: { SEND_NEW_OPPORTUNITY: 'false',
                              BUDGET_COLLECTE_SECONDES: '2' } });
  let faux = 0;
  const vraiFetch = m.ctx.UrlFetchApp.fetch;
  m.ctx.UrlFetchApp.fetch = function (url) { faux += 1000; return vraiFetch(url); };
  const VraieDate = m.ctx.Date || Date;
  m.ctx.Date = function () { return new VraieDate(VraieDate.now() + faux); };
  m.ctx.Date.now = () => VraieDate.now() + faux;

  m.ctx.executerTenderPilot();
  const lues1 = m.feuille.opps.length;
  check('la collecte s arrete au budget, sans tout lire',
        lues1 > 0 && lues1 < 6, lues1 + ' sources lues sur 6');
  check('le report est journalise',
        m.feuille.logs.some(l => l.message.indexOf('reportee') !== -1),
        JSON.stringify(m.feuille.logs.filter(l => l.action === 'Collecte')
          .map(l => l.message).slice(-2)));
  check('le passage a quand meme abouti',
        m.feuille.logs.some(l => l.action === 'Execution'
                                 && l.statut === 'SUCCESS'));

  // Passages suivants : le tour finit par se faire en entier.
  for (let i = 0; i < 5; i++) { faux = 0; m.ctx.executerTenderPilot(); }
  check('au bout de quelques passages, toutes les sources sont lues',
        m.feuille.opps.length === 6,
        m.feuille.opps.length + ' annonces sur 6');
  check('aucune source n a ete lue deux fois',
        new Set(m.feuille.opps.map(o => o.title)).size
          === m.feuille.opps.length);
}

// ==========================================================================
console.log('\n[Duree] Le journal ne bavarde plus avec la feuille');
{
  const url = 'https://exemple.test/flux-bavard';
  const entrees = [];
  for (let i = 0; i < 4; i++) {
    entrees.push({ titre: 'Annonce ' + i, lien: 'https://exemple.test/b' + i,
      description: 'Date limite : ' + enFrancais(jourRelatif(30)) });
  }
  // Deux sources actives, deux desactivees.
  const m = monde({
    sources: [
      Object.assign(source('ACTIVE-1', url), { _row: 2 }),
      Object.assign(source('DORMANTE-1', 'https://exemple.test/x'),
                    { _row: 3, active: 'NON' }),
      Object.assign(source('DORMANTE-2', 'https://exemple.test/y'),
                    { _row: 4, active: 'NON' })
    ],
    flux: { [url]: fluxRss(entrees) },
    config: { SEND_NEW_OPPORTUNITY: 'false' }
  });

  m.ctx.executerTenderPilot();
  const skipped = m.feuille.logs.filter(l => l.statut === 'SKIPPED');
  check('les sources desactivees tiennent en UNE ligne',
        skipped.length === 1, skipped.length + ' lignes SKIPPED');
  check('cette ligne les compte toutes',
        skipped[0] && skipped[0].message.indexOf('2 source(s)') === 0,
        skipped[0] && skipped[0].message);

  // Second passage : les quatre annonces sont deja connues.
  m.ctx.executerTenderPilot();
  const doublons = m.feuille.logs.filter(l => l.statut === 'DUPLICATE');
  check('les annonces deja connues tiennent en UNE ligne',
        doublons.length === 1, doublons.length + ' lignes DUPLICATE');
  check('cette ligne les compte toutes',
        doublons[0] && doublons[0].message.indexOf('4 annonce(s)') === 0,
        doublons[0] && doublons[0].message);
}

// ==========================================================================
console.log('\n[Vidage] Le tableau se vide sans toucher au reste');
{
  const url = 'https://exemple.test/flux-vidage';
  const m = monde({
    sources: [source('SRC-001', url)],
    flux: { [url]: fluxRss([
      { titre: 'Une annonce', lien: 'https://exemple.test/v1',
        description: 'Date limite : ' + enFrancais(jourRelatif(20)) }]) },
    config: { SEND_NEW_OPPORTUNITY: 'false' }
  });
  m.ctx.executerTenderPilot();
  check('une ligne a bien ete collectee', m.feuille.opps.length === 1);

  const sourcesAvant = m.feuille.sources.length;
  check('le journal s est rempli pendant la collecte',
        m.feuille.logs.length > 0, m.feuille.logs.length + ' lignes');

  const efface = m.ctx.viderOpportunites_();
  const journalEfface = m.ctx.viderJournal_();

  check('toutes les lignes sont effacees',
        efface === 1 && m.feuille.opps.length === 0,
        m.feuille.opps.length + ' lignes restantes');
  // Le journal part avec : melanger les lignes de l essai precedent avec
  // celles du nouveau rendrait le journal illisible.
  check('le journal est efface lui aussi',
        journalEfface > 0 && m.feuille.logs.length === 0,
        m.feuille.logs.length + ' lignes de journal restantes');
  check('les sources ne sont PAS touchees',
        m.feuille.sources.length === sourcesAvant);
  check('la configuration reste en place',
        m.feuille.config.TIMEZONE === 'Africa/Porto-Novo');

  // Apres vidage, la collecte suivante repart de zero et renumerote.
  m.ctx.executerTenderPilot();
  check('la collecte suivante repeuple le tableau',
        m.feuille.opps.length === 1, m.feuille.opps.length + ' lignes');
  check('l identifiant repart a TP-000001',
        m.feuille.opps[0].id === 'TP-000001', m.feuille.opps[0].id);
}

// ==========================================================================
console.log('\n[Profil] L inventaire ne montre que ce qui existe vraiment');
{
  const C = monde({}).ctx;
  const a = (pays, secteur) => ({ country: pays, sector: secteur });
  const lignes = [
    a('Benin', 'Energie'), a('Benin', 'Energie'), a('Benin', 'Sante'),
    a('Niger', 'Energie'), a('Togo', ''), a('', 'Eau et assainissement')
  ];
  const rangees = C.inventaireProfil(lignes,
    { PAYS_SUIVIS: 'Benin', SECTEURS_SUIVIS: 'Energie' });

  const pays = rangees.filter(r => r[0] === 'Pays');
  const secteurs = rangees.filter(r => r[0] === 'Secteur');

  check('les pays collectes sont inventories',
        pays.map(r => r[1]).join(',') === 'Benin,Niger,Togo',
        pays.map(r => r[1]).join(','));
  check('le plus present passe en tete',
        pays[0][1] === 'Benin' && pays[0][2] === 3,
        JSON.stringify(pays[0]));
  check('une case vide n invente pas une valeur',
        rangees.every(r => String(r[1]).trim().length > 0));
  check('la colonne Suivi dit ce que la config retient',
        pays[0][3] === 'OUI' && pays[1][3] === 'NON',
        pays.map(r => r[1] + '=' + r[3]).join(' '));
  check('les secteurs sont inventories a leur tour',
        secteurs.map(r => r[1]).join(',')
          === 'Energie,Eau et assainissement,Sante',
        secteurs.map(r => r[1]).join(','));
  check('les comptes sont justes',
        secteurs.filter(r => r[1] === 'Energie')[0][2] === 3);

  // Sans liste declaree, rien n est ecarte : tout est suivi.
  const tout = C.inventaireProfil(lignes, {});
  check('sans configuration, tout est marque suivi',
        tout.every(r => r[3] === 'OUI'));

  // A egalite, l ordre alphabetique fige le classement : deux passages de
  // suite ne doivent pas intervertir deux lignes.
  const stable1 = C.inventaireProfil([a('Zimbabwe', 'X'), a('Angola', 'X')], {});
  const stable2 = C.inventaireProfil([a('Angola', 'X'), a('Zimbabwe', 'X')], {});
  check('a egalite, l ordre ne bouge pas d un passage a l autre',
        JSON.stringify(stable1) === JSON.stringify(stable2),
        JSON.stringify(stable1.map(r => r[1])));
}

// ==========================================================================
console.log('\n[Profil] Le client choisit les niveaux qui le previennent');
{
  const C = monde({}).ctx;
  const P = C.SCHEMA;

  check('sans reglage, tout est notifie',
        C.pertinenceNotifiable(P.PERTINENCE_HORS_PROFIL, {}) === true
        && C.pertinenceNotifiable(P.PERTINENCE_PRIORITAIRE, {}) === true);

  const seulPrioritaire = { NOTIFIER_PERTINENCE: '3 - PRIORITAIRE' };
  check('un seul niveau retenu',
        C.pertinenceNotifiable(P.PERTINENCE_PRIORITAIRE, seulPrioritaire) === true
        && C.pertinenceNotifiable(P.PERTINENCE_A_VOIR, seulPrioritaire) === false);

  const deux = { NOTIFIER_PERTINENCE: '3 - PRIORITAIRE, 2 - A VOIR' };
  check('deux niveaux retenus',
        C.pertinenceNotifiable(P.PERTINENCE_PRIORITAIRE, deux) === true
        && C.pertinenceNotifiable(P.PERTINENCE_A_VOIR, deux) === true
        && C.pertinenceNotifiable(P.PERTINENCE_POSSIBLE, deux) === false);

  // Le libelle est long et se recopie a la main : la comparaison tolere
  // les trois ecritures.
  check('le libelle abrege suffit',
        C.pertinenceNotifiable(P.PERTINENCE_PRIORITAIRE,
                               { NOTIFIER_PERTINENCE: 'PRIORITAIRE' }) === true);
  check('le rang seul suffit',
        C.pertinenceNotifiable(P.PERTINENCE_PRIORITAIRE,
                               { NOTIFIER_PERTINENCE: '3' }) === true
        && C.pertinenceNotifiable(P.PERTINENCE_A_VOIR,
                               { NOTIFIER_PERTINENCE: '3' }) === false);
  check('la casse et les accents ne changent rien',
        C.pertinenceNotifiable(P.PERTINENCE_PRIORITAIRE,
                               { NOTIFIER_PERTINENCE: 'prioritaire' }) === true);
  check('une annonce sans pertinence passe : le doute lui profite',
        C.pertinenceNotifiable('', seulPrioritaire) === true
        && C.pertinenceNotifiable(null, seulPrioritaire) === true);
}

// ==========================================================================
console.log('\n[Profil] Le filtre coupe les emails, jamais le tableau');
{
  const url = 'https://exemple.test/flux-pertinence-notif';
  const m = monde({
    sources: [Object.assign(source('SRC-LOIN', url),
                            { country: 'Kenya', sector: 'Culture et arts' })],
    flux: { [url]: fluxRss([
      { titre: 'Atelier lointain', lien: 'https://exemple.test/n1',
        description: 'Date limite : ' + enFrancais(jourRelatif(20)) }]) },
    config: { PAYS_SUIVIS: 'Benin', SECTEURS_SUIVIS: 'Energie',
              NOTIFIER_PERTINENCE: '3 - PRIORITAIRE' }
  });

  m.ctx.executerTenderPilot();
  check('l annonce entre quand meme dans le tableau',
        m.feuille.opps.length === 1, m.feuille.opps.length + ' lignes');
  check('aucun email n est parti', m.boite.length === 0,
        m.boite.length + ' emails');
  check('le journal dit pourquoi',
        m.feuille.logs.some(l => l.message.indexOf('NOTIFIER_PERTINENCE') !== -1),
        JSON.stringify(m.feuille.logs.filter(l => l.action === 'Notifications')
          .map(l => l.message)));
  check('rien n est marque comme notifie',
        m.feuille.opps[0].notifNew !== true);

  // Le client elargit son profil : l alerte part alors, sans qu on ait eu
  // besoin de recollecter.
  m.feuille.config.PAYS_SUIVIS = 'Benin, Kenya';
  m.feuille.config.SECTEURS_SUIVIS = 'Energie, Culture et arts';
  m.ctx.executerTenderPilot();
  check('elargir le profil libere l alerte', m.boite.length === 1,
        m.boite.length + ' emails');

  // L inventaire suit, lui aussi.
  const kenya = m.feuille.profil.filter(r => r[1] === 'Kenya')[0];
  check('l inventaire montre le pays reellement collecte',
        kenya && kenya[0] === 'Pays' && kenya[2] === 1, JSON.stringify(kenya));
  check('et le marque suivi apres le changement', kenya && kenya[3] === 'OUI',
        JSON.stringify(kenya));
}

// ==========================================================================
console.log('\n[Etalement] Les alertes en trop sont reportees, jamais perdues');
{
  // MESURE DU 2026-09-02 : sur une feuille vierge, 28 opportunites se
  // retrouvaient d un coup a moins de sept jours. Le digest ramene les
  // nouveautes a un email, mais les rappels partaient un par un.
  const url = 'https://exemple.test/flux-etalement';
  const entrees = [];
  for (let i = 0; i < 8; i++) {
    entrees.push({ titre: 'Echeance proche ' + i,
      lien: 'https://exemple.test/e' + i,
      description: 'Date limite : ' + enFrancais(jourRelatif(5)) });
  }
  const m = monde({
    sources: [source('SRC-001', url)], flux: { [url]: fluxRss(entrees) },
    config: { SEND_NEW_OPPORTUNITY: 'false', MAX_EMAILS_PAR_EXECUTION: '3' }
  });

  m.ctx.executerTenderPilot();
  check('le plafond est respecte', m.boite.length === 3,
        m.boite.length + ' emails');
  check('le report est journalise',
        m.feuille.logs.some(l => l.action === 'Notifications'
          && l.message.indexOf('reportee') !== -1),
        JSON.stringify(m.feuille.logs.filter(l => l.action === 'Notifications')));

  const marquees = m.feuille.opps.filter(
    o => m.ctx.dejaNotifie_(o.notifJ7, 'email')).length;
  check('seules les lignes servies sont marquees', marquees === 3,
        marquees + ' lignes marquees');

  // Passage suivant : la suite part, sans jamais renvoyer les premieres.
  m.ctx.executerTenderPilot();
  check('le passage suivant envoie les trois suivantes',
        m.boite.length === 6, m.boite.length + ' emails au total');
  const sujets = m.boite.map(e => e.sujet);
  check('aucune alerte n est partie deux fois',
        new Set(sujets).size === sujets.length, sujets.join(' | '));

  m.ctx.executerTenderPilot();
  m.ctx.executerTenderPilot();
  check('au bout du compte les huit sont parties',
        m.boite.length === 8, m.boite.length + ' emails');
  check('et plus rien ne part ensuite',
        m.feuille.opps.every(o => m.ctx.dejaNotifie_(o.notifJ7, 'email')));
}

// ==========================================================================
console.log('\n[Etalement] Le plus pertinent part en premier');
{
  const url = 'https://exemple.test/flux-ordre';
  const m = monde({
    sources: [
      Object.assign(source('SRC-LOIN', url),
                    { country: 'Kenya', sector: 'Culture et arts' })
    ],
    flux: { [url]: fluxRss([
      { titre: 'Annonce lointaine', lien: 'https://exemple.test/loin',
        description: 'Date limite : ' + enFrancais(jourRelatif(5)) },
      { titre: 'Annonce lointaine deux', lien: 'https://exemple.test/loin2',
        description: 'Date limite : ' + enFrancais(jourRelatif(5)) }
    ]) },
    config: { SEND_NEW_OPPORTUNITY: 'false', MAX_EMAILS_PAR_EXECUTION: '1',
              PAYS_SUIVIS: 'Benin', SECTEURS_SUIVIS: 'Energie' }
  });

  // Une opportunite prioritaire, deja suivie, entre en scene avec la meme
  // echeance : c est elle qui doit partir la premiere.
  m.feuille.opps.push({
    _row: 2, id: 'TP-000900', title: 'Celle qui vous concerne',
    country: 'Benin', sector: 'Energie', source: 'SRC-PROCHE',
    deadline: jourRelatif(5), url: 'https://exemple.test/proche'
  });

  m.ctx.executerTenderPilot();
  check('un seul email est parti', m.boite.length === 1,
        m.boite.length + ' emails');
  check('c est l opportunite prioritaire qui est partie',
        m.boite[0].sujet.indexOf('Celle qui vous concerne') !== -1,
        m.boite[0].sujet);
}

// ==========================================================================
console.log('\n[Etalement] Sans plafond, le comportement ne change pas');
{
  const url = 'https://exemple.test/flux-sans-plafond';
  const entrees = [];
  for (let i = 0; i < 4; i++) {
    entrees.push({ titre: 'Echeance ' + i, lien: 'https://exemple.test/s' + i,
      description: 'Date limite : ' + enFrancais(jourRelatif(5)) });
  }
  const m = monde({
    sources: [source('SRC-001', url)], flux: { [url]: fluxRss(entrees) },
    config: { SEND_NEW_OPPORTUNITY: 'false', MAX_EMAILS_PAR_EXECUTION: '0' }
  });
  m.ctx.executerTenderPilot();
  check('les quatre alertes partent en une fois', m.boite.length === 4,
        m.boite.length + ' emails');
  check('aucun report n est journalise',
        !m.feuille.logs.some(l => l.message.indexOf('reportee') !== -1));
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
        m.feuille.opps.every(o => m.ctx.dejaNotifie_(o.notifNew, 'email')));
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

  // MESURE DU 2026-09-02 : Grants.gov, 1034 subventions ouvertes, etait
  // annonce "peut-etre abandonnee" parce qu'il expose la date d'OUVERTURE
  // du programme, souvent vieille de deux ans, pour des dossiers recevables
  // jusqu'en 2028.
  check('une echeance a venir prouve que la source vit',
        C.aUneEcheanceOuverte_([{ deadline: jr(-3) }, { deadline: jr(90) }],
                               jr(0)) === true);
  check('des annonces toutes echues ne prouvent rien',
        C.aUneEcheanceOuverte_([{ deadline: jr(-3) }], jr(0)) === false);
  check('des annonces sans echeance ne prouvent rien',
        C.aUneEcheanceOuverte_([{ deadline: '' }, {}], jr(0)) === false);
}

// ==========================================================================
console.log('\n[Fraicheur] Une source ouverte n est jamais dite abandonnee');
{
  const url = 'https://example.org/flux-vieux-mais-ouvert';
  const jr = (n) => { const d = new Date(); d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10); };
  const m = monde({
    sources: [source('GRANTS', url)],
    flux: { [url]: '<?xml version="1.0"?><rss version="2.0"><channel>'
      + '<item><title>Programme pluriannuel</title>'
      + '<link>https://example.org/g1</link>'
      + '<pubDate>Mon, 21 Oct 2024 09:00:00 +0000</pubDate>'
      + '<description>Date limite : ' + enFrancais(jr(300)) + '</description>'
      + '</item></channel></rss>' },
    config: { SEND_NEW_OPPORTUNITY: 'false' }
  });

  m.ctx.executerTenderPilot();
  const journal = m.feuille.logs.filter(l => l.source === 'GRANTS');
  check('publiee il y a deux ans, mais ouverte : aucune alerte d abandon',
        journal.length === 1 && journal[0].message.indexOf('abandonnee') === -1,
        journal.length ? journal[0].message : 'aucun journal');
  check('la source est simplement marquee OK',
        m.feuille.sources[0].status === 'OK', m.feuille.sources[0].status);
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
    // Le vrai Sheet.gs tamponne le journal ; la synchronisation le vide
    // elle-meme, personne d autre ne le ferait hors execution.
    ecrireJournal_: () => 0,
    SpreadsheetApp: {
      getUi: () => ({ alert: () => {}, ButtonSet: { OK: 'OK' } }),
      getActiveSpreadsheet: () => ({ toast: () => {} })
    }
  };
  vm.createContext(ctx);
  // Core.gs vient avec : la synchronisation partage estIdSource avec la
  // collecte, pour que les deux ecartent la meme note de bas de tableau.
  ['Schema.gs', 'Core.gs', 'Sources.gs'].forEach(f => {
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

console.log('\n[Sync 4b] La note de bas de tableau n est pas une source');
{
  // MESURE DU 2026-09-02 : la note d'aide livree sous le tableau occupait
  // la colonne A, celle du Source_ID. Le moteur la lisait comme une source
  // et journalisait "Methode : RSS ou JSON:<site>... Source desactivee." a
  // chaque execution. Les classeurs deja installes la gardent : le filtre
  // doit les reparer sans qu'on y touche.
  const amorce = mondeSync([['x']]);
  const entete = enteteSources(amorce.ctx);
  const note = ['Methode : RSS ou JSON:<site> et HTML:<site> (collecte '
    + 'automatique), MANUAL (saisie a la main).', '', '', '', '', '', '',
    '', '', ''];

  const m = mondeSync([entete, note]);
  const bilan = m.ctx.appliquerCatalogue_();
  check('la note n est pas comptee comme une source a vous',
        bilan.propres === 0, bilan.propres + ' source(s) propre(s)');

  // Le meme filtre, du cote de la collecte.
  const C = amorce.ctx;
  check('un identifiant de source est accepte', C.estIdSource('UNDP-BEN'));
  check('une phrase n est pas un identifiant', C.estIdSource(note[0]) === false);
  check('une cellule vide n est pas un identifiant',
        C.estIdSource('') === false && C.estIdSource(null) === false);
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
console.log("\n[Test LLM] Le modele propose, le code dispose");
{
  const L = require(path.join(SCRIPT, 'Llm.gs'));

  // --- L INTERDICTION ---------------------------------------------------
  // Meme jeu d essai que web/tests/llm.test.ts. Si les deux moteurs
  // n aboutissent pas au meme resultat, l un des deux est faux.
  const lot = [{
    title: 'Fourniture de materiel informatique', summary: 'Avis initial',
    deadline: '2026-09-25', published: '2026-08-20'
  }];
  const fautive = [{
    i: 0, secteur: 'Numerique et technologie', type: 'Appel d offres',
    resume: 'Achat de postes de travail', pertinent: true,
    deadline: '2030-01-01', published: '2030-01-01', echeance: '2030-01-01'
  }];
  const sortie = L.appliquerClassement_(lot, fautive)[0];

  check('le modele ne peut pas ecrire une deadline',
        sortie.deadline === '2026-09-25', String(sortie.deadline));
  check('le modele ne peut pas ecrire une date de publication',
        sortie.published === '2026-08-20', String(sortie.published));
  check('le classement du modele est repris',
        sortie.sector === 'Numerique et technologie', String(sortie.sector));
  check('le resume du modele est repris',
        sortie.summary === 'Achat de postes de travail');

  // --- LE VOCABULAIRE FERME ---------------------------------------------
  check('un libelle hors vocabulaire est rejete',
        L.choisirDansListe_('Tech', L.LLM_SECTEURS) === null);
  check('la casse ne fait pas perdre une valeur juste',
        L.choisirDansListe_('sante', L.LLM_SECTEURS) === 'Sante');
  check('Evenement fait partie du vocabulaire',
        L.choisirDansListe_('evenement', L.LLM_TYPES) === 'Evenement');
}

// ==========================================================================
console.log("\n[Test LLM] Empreinte de page et dialectes");
{
  const L = require(path.join(SCRIPT, 'Llm.gs'));

  // Rejoue la mesure du 2026-09-01 sur enabel.be : entre deux lectures a
  // trois secondes d intervalle, seul un compteur anti-spam loge dans un
  // attribut change. Si l empreinte bougeait pour si peu, le modele serait
  // rappele a chaque collecte et l economie serait nulle.
  const page = j => '<html><head><style>.a{color:red}</style></head><body>'
    + '<p>2204BEN-10373 - Marche de fournitures</p>'
    + '<input type="hidden" name="ak_js" value="' + j + '" />'
    + '<script>var t=' + j + ';</script></body></html>';
  check('un compteur dans un attribut ne change pas l empreinte',
        L.empreinteContenu_(page('159')) === L.empreinteContenu_(page('1')));
  check('une annonce ajoutee change l empreinte',
        L.empreinteContenu_('<p>A</p>') !== L.empreinteContenu_('<p>A</p><p>B</p>'));
  check('une page jamais lue est toujours a lire', L.pageAChange_('', 'abc'));
  check('une page inchangee ne reveille pas le modele',
        L.pageAChange_('abc', 'abc') === false);

  const cfg = (x) => Object.assign({
    dialecte: 'openai', endpoint: L.LLM_ENDPOINTS.openai,
    cle: 'cle-de-test', modele: 'mistral-small-latest' }, x || {});
  check('openai : cle en Bearer',
        L.entetesRequeteLlm_(cfg()).Authorization === 'Bearer cle-de-test');
  check('anthropic : cle en x-api-key, jamais en Bearer',
        L.entetesRequeteLlm_(cfg({ dialecte: 'anthropic' }))['x-api-key'] === 'cle-de-test'
        && !L.entetesRequeteLlm_(cfg({ dialecte: 'anthropic' })).Authorization);
  check('gemini : modele dans le chemin, cle en parametre',
        L.urlRequeteLlm_(cfg({ dialecte: 'gemini', modele: 'gemini-2.0-flash',
          endpoint: L.LLM_ENDPOINTS.gemini }))
          .indexOf('/gemini-2.0-flash:generateContent?key=cle-de-test') > 0);
  check('chaque dialecte relit sa propre reponse',
        L.lireReponseLlm_('openai', JSON.stringify({ choices: [{ message: { content: 'A' } }] })) === 'A'
        && L.lireReponseLlm_('anthropic', JSON.stringify({ content: [{ text: 'B' }] })) === 'B'
        && L.lireReponseLlm_('gemini', JSON.stringify({ candidates: [{ content: { parts: [{ text: 'C' }] } }] })) === 'C');
  check('une reponse illisible ne fait pas tomber la collecte',
        L.lireReponseLlm_('openai', 'pas du json') === '');
}

// ==========================================================================
console.log("\n[Test LLM] Robustesse, zone et preferences du client");
{
  const L = require(path.join(SCRIPT, 'Llm.gs'));
  const F = String.fromCharCode(96).repeat(3);
  const NL = String.fromCharCode(10);

  check('le JSON entoure de balises Markdown est recupere',
        JSON.stringify(L.extraireJsonLlm_(F + 'json' + NL + '[{"i":0}]' + NL + F))
          === '[{"i":0}]');
  check('le JSON precede d un bavardage est recupere',
        JSON.stringify(L.extraireJsonLlm_('Voici :' + NL + '[{"i":0}]')) === '[{"i":0}]');
  check('une reponse sans JSON rend null',
        L.extraireJsonLlm_('je ne sais pas') === null);

  const trois = [
    { title: 'A', deadline: '2026-09-01' },
    { title: 'B', deadline: '2026-09-02' },
    { title: 'C', deadline: '2026-09-03' }
  ];
  const decale = L.appliquerClassement_(trois, [{ i: 0, secteur: 'Sante' },
                                                { i: 2, secteur: 'Energie' }]);
  check('un jugement manquant ne decale pas le lot',
        decale[0].sector === 'Sante' && decale[1].title === 'B'
        && decale[2].sector === 'Energie' && decale[2].deadline === '2026-09-03');
  check('un index hors bornes est ignore',
        L.appliquerClassement_([trois[0]], [{ i: 99, secteur: 'Sante' }]).length === 1);
  check('une reponse qui n est pas un tableau laisse le lot intact',
        L.appliquerClassement_(trois, null)[0].title === 'A');

  check('un seul pays coche au depart',
        L.LLM_PAYS_DEFAUT.length === 1 && L.LLM_PAYS_DEFAUT[0] === 'Benin');
  check('les appels mondiaux comptent par defaut',
        L.phraseZone_(['Benin'], true).indexOf('appels mondiaux') > 0);
  check('le client peut les refuser',
        L.phraseZone_(['Benin'], false).indexOf('uniquement') > 0);
  check('une zone vide ne produit pas une invite absurde',
        L.phraseZone_([], true) === 'n importe quel pays');

  const prefs = (x) => Object.assign({ filtrerParZone: false,
                                       inclureEvenements: false }, x || {});
  const melange = [
    { title: 'marche au Benin', opportunite: true, pertinent: true },
    { title: 'marche au Kenya', opportunite: true, pertinent: false },
    { title: 'article', opportunite: false, pertinent: true },
    { title: 'salon', opportunite: true, type: 'Evenement' },
    { title: 'jamais vue' }
  ];
  const parDefaut = L.appliquerPreferences_(melange, prefs()).map(o => o.title);
  check('la zone etiquette, elle ne supprime pas',
        parDefaut.indexOf('marche au Kenya') !== -1, parDefaut.join(','));
  check('ce qui n est pas une opportunite ne rentre jamais',
        parDefaut.indexOf('article') === -1, parDefaut.join(','));
  check('les evenements sont ecartes par defaut',
        parDefaut.indexOf('salon') === -1, parDefaut.join(','));
  check('une annonce non jugee traverse toutes les preferences',
        parDefaut.indexOf('jamais vue') !== -1, parDefaut.join(','));
  check('le client peut couper par zone s il le demande',
        L.appliquerPreferences_(melange, prefs({ filtrerParZone: true }))
          .map(o => o.title).indexOf('marche au Kenya') === -1);
  check('le client peut garder les salons',
        L.appliquerPreferences_(melange, prefs({ inclureEvenements: true }))
          .map(o => o.title).indexOf('salon') !== -1);

  const invite = L.invitePourClassement_([{ title: 'Un avis' }], 'le Benin');
  check('l invite interdit explicitement les dates',
        invite.indexOf('AUCUNE date') > 0);
  check('l invite ne nomme aucun champ de date',
        invite.indexOf('"deadline"') === -1);
  check('l invite demande si l on PEUT CANDIDATER',
        invite.indexOf('PEUT CANDIDATER') > 0);
  check('l invite distingue une FAQ d un appel', invite.indexOf('FAQ') > 0);

  const actif = (x) => L.llmActif_(Object.assign({
    actif: true, cle: 'k', modele: 'm', endpoint: 'e' }, x || {}));
  check('sans cle, le modele reste eteint', !actif({ cle: '' }));
  check('sans modele, le modele reste eteint', !actif({ modele: '' }));
  check('sans adresse, le modele reste eteint', !actif({ endpoint: '' }));
  check('desactive, le modele reste eteint', !actif({ actif: false }));
  check('tout renseigne, le modele est actif', actif());
}

// ==========================================================================
console.log("\n[Test classement sans modele] Types et secteurs, sans aucune cle");
{
  const C = require(path.join(SCRIPT, 'Core.gs'));

  // --- LES TYPES ----------------------------------------------------------
  // Meme jeu d essai que web/tests/moteur.test.ts. Une divergence entre les
  // deux moteurs ferait voir deux tableaux differents au meme client.
  ['Appel d\'Offre', 'APPEL D OFFRES', 'appel doffres', 'Invitation for Bids',
   'Marche de Fournitures'].forEach(brut => {
    check('type normalise : ' + brut,
          C.normaliserType(brut) === 'Appel d\'offres', C.normaliserType(brut));
  });
  check('Request for Expression of Interest devient AMI',
        C.normaliserType('Request for Expression of Interest') === 'AMI');
  check('une reference n est pas un type',
        C.normaliserType('AVIS N° 001/2026/PRMP-ABE/APM du 19 Janvier 2026') === '');
  check('un libelle inconnu est conserve',
        C.normaliserType('Concession de service') === 'Concession de service');

  // --- LES SECTEURS -------------------------------------------------------
  check('secteur deduit : centre de sante',
        C.deduireSecteur("Rehabilitation du Centre de Sante d'Ayomi") === 'Sante');
  check('secteur deduit : electrification',
        C.deduireSecteur("Travaux d'electrification solaire a Kampti") === 'Energie');
  check('secteur deduit : eau potable',
        C.deduireSecteur("Systemes d'Approvisionnement en Eau Potable")
          === 'Eau et assainissement');

  // Les trois erreurs mesurees le 2026-09-02, chacune d une cause differente.
  check('un mot manquant : medico-social est de la sante',
        C.deduireSecteur('Construction du Centre medico-social chirurgical de GBADA')
          === 'Sante');
  check('un mot manquant : salles de classe est de l education',
        C.deduireSecteur("Construction d'un module de trois salles de classe")
          === 'Education et formation');
  check('election ne doit pas se trouver dans selection',
        C.deduireSecteur('Cabinet international pour la selection de 20 campements') === '');
  // Mesure du 2026-09-02, sur la GIZ : "building" seul rangeait
  // "CAPACITY BUILDING ON HUMAN RIGHTS" dans le BTP. En anglais du
  // developpement, "capacity building" est partout.
  check('capacity building n est pas du BTP',
        C.deduireSecteur('TRAINING MODULE & CAPACITY BUILDING ON HUMAN RIGHTS')
          !== 'Infrastructures et BTP',
        C.deduireSecteur('TRAINING MODULE & CAPACITY BUILDING ON HUMAN RIGHTS'));
  check('les vrais travaux restent du BTP',
        C.deduireSecteur('Building works for the new warehouse')
          === 'Infrastructures et BTP'
        && C.deduireSecteur('Civil works for the bridge')
          === 'Infrastructures et BTP'
        && C.deduireSecteur('Construction d un batiment administratif')
          === 'Infrastructures et BTP');

  check('sans correspondance nette, on ne devine pas',
        C.deduireSecteur('Un titre parfaitement neutre sans aucun mot cle') === ''
        && C.deduireSecteur('') === '' && C.deduireSecteur(null) === '');
  check('une racine tronquee vise les mots qui commencent par elle',
        C.deduireSecteur("Travaux d'electrification") === 'Energie'
        && C.deduireSecteur('Biodiversity review') === 'Environnement et climat');

  check('Non precise plutot qu une cellule vide',
        C.SECTEUR_INCONNU === 'Non precise' && C.SECTEUR_INCONNU !== 'Autre');
  check('les deux moteurs partagent le meme vocabulaire de secteurs',
        C.SECTEURS_ANNONCE.length === 16
        && C.SECTEURS_ANNONCE[0] === 'Agriculture et agroalimentaire'
        && C.SECTEURS_ANNONCE[15] === 'Autre', String(C.SECTEURS_ANNONCE.length));
}

// ==========================================================================
console.log('\n[UNGM] Une reponse de recherche, pas une page');
{
  const C = monde({}).ctx;
  const R = path.join(path.resolve(__dirname), 'fixtures');
  // La reponse REELLE du POST /Public/Notice/Search filtre sur les quinze
  // pays de la CEDEAO, capturee le 2026-09-04.
  const corps = fs.readFileSync(path.join(R, 'ungm-cedeao.html'), 'utf8');
  const src = Object.assign(source('UNGM-CEDEAO', 'https://exemple.test/ungm'),
                            { method: 'HTML:ungm.org',
                              country: "Afrique de l'Ouest", sector: '' });
  const avis = C.analyserPageUngm(corps, src);

  check('quinze avis par page, plafond du serveur', avis.length === 15,
        avis.length + ' avis');
  check('tous dates - c est ce qui rend la source utilisable',
        avis.every(o => /^\d{4}-\d{2}-\d{2}$/.test(String(o.deadline))));
  check('chacun mene a sa fiche publique',
        avis.every(o => /^https:\/\/www\.ungm\.org\/Public\/Notice\/\d+$/
          .test(String(o.url))));
  check('la meme rangee ne compte pas deux fois',
        new Set(avis.map(o => o.url)).size === avis.length);

  const unops = avis.filter(o => String(o.url).indexOf('/313464') !== -1)[0];
  check('chaque cellule va dans la bonne colonne',
        unops && unops.deadline === '2026-09-22'
        && unops.published === '2026-09-04'
        && unops.org === 'UNOPS' && unops.country === 'Guinea-Bissau',
        JSON.stringify(unops && [unops.deadline, unops.published, unops.org,
                                 unops.country]));
  check("l'acheteur reel est l'agence, jamais UNGM",
        avis.every(o => o.org && String(o.org).indexOf('UNGM') === -1));
  check('le type anglais entre dans le vocabulaire ferme',
        avis.some(o => o.type === "Appel d'offres")
        && avis.some(o => o.type === 'Demande de cotation')
        && avis.some(o => o.type === 'AMI'),
        JSON.stringify(Array.from(new Set(avis.map(o => o.type)))));

  // La rangee est suivie du <script> qui colore les echeances proches.
  check('la derniere cellule s arrete avant le script',
        avis.every(o => String(o.country || '').length < 40),
        JSON.stringify(avis.map(o => String(o.country).slice(0, 20)).slice(-2)));
  // "Multiple destinations" n'est pas un pays : on laisse le defaut de la
  // source s'appliquer plutot que d'ecrire une valeur illisible.
  check('un avis regional retombe sur le pays de la source',
        avis.some(o => o.country === "Afrique de l'Ouest")
        && avis.every(o => !/multiple/i.test(String(o.country))));

  check('la date se lit, ou ne se lit pas - jamais a peu pres',
        C.dateUngm_('15-Sep-2026 13:00') === '2026-09-15'
        && C.dateUngm_('4-Jan-2027') === '2027-01-04'
        && C.dateUngm_('15-Xyz-2026') === null
        && C.dateUngm_('2026-09-15') === null
        && C.dateUngm_('') === null);
}

// ==========================================================================
console.log('\n[UNGM] Le POST pagine par le corps, pas par l adresse');
{
  const C = monde({}).ctx;
  const p1 = C.formeRequete_('HTML:ungm.org', 1);
  const p3 = C.formeRequete_('HTML:ungm.org', 3);
  check('la forme est un POST JSON, declare paginee',
        p1.methode === 'post' && p1.contentType === 'application/json'
        && p1.paginee === true);
  check('PageIndex commence a 0 la ou le moteur compte a partir de 1',
        JSON.parse(p1.corps).PageIndex === 0
        && JSON.parse(p3.corps).PageIndex === 2);
  check('PageSize reste a 15 : le serveur n en rend pas plus',
        JSON.parse(p1.corps).PageSize === 15);
  check('les quinze pays de la CEDEAO sont demandes',
        JSON.parse(p1.corps).Countries.length === 15);
  check('une source ordinaire reste un GET',
        C.formeRequete_('HTML:giz.de') === null
        && C.formeRequete_('RSS') === null
        && C.formeRequete_('') === null);
  check('les deux formes JSON existantes sont intactes',
        /^multipart\/form-data/.test(C.formeRequete_('JSON:ec.europa.eu').contentType)
        && C.formeRequete_('JSON:grants.gov').contentType === 'application/json');
}

// ==========================================================================
console.log('\n[UNGM] Le moteur enchaine les pages d un POST');
{
  const R = path.join(path.resolve(__dirname), 'fixtures');
  const corps = fs.readFileSync(path.join(R, 'ungm-cedeao.html'), 'utf8');
  const m = monde({
    sources: [Object.assign(source('UNGM-CEDEAO',
                                   'https://www.ungm.org/Public/Notice/Search'),
                            { method: 'HTML:ungm.org',
                              country: "Afrique de l'Ouest", sector: '' })],
    config: { SEND_NEW_OPPORTUNITY: 'false', COLLECT_EXPIRED: 'true',
              MAX_ITEMS_PER_SOURCE: '40' }
  });
  const envoyes = [];
  m.ctx.UrlFetchApp.fetch = function (url, options) {
    envoyes.push(JSON.parse(options.payload));
    return {
      getResponseCode: () => 200,
      getAllHeaders: () => ({ 'Content-Type': 'text/html' }),
      // La meme page a chaque fois : la deduplication doit arreter la boucle.
      getContentText: () => corps
    };
  };
  m.ctx.executerTenderPilot();

  check('sans {page} dans l adresse, le moteur pagine quand meme',
        envoyes.length >= 2, envoyes.length + ' requetes');
  check('et il avance : page 1, puis page 2',
        envoyes[0].PageIndex === 0 && envoyes[1].PageIndex === 1,
        JSON.stringify(envoyes.map(e => e.PageIndex)));
  check('le POST porte bien le corps de recherche',
        envoyes[0].Countries.length === 15 && envoyes[0].PageSize === 15);
  check('et rien n entre deux fois', m.feuille.opps.length === 15,
        m.feuille.opps.length + ' annonces');
}

// ==========================================================================
console.log('\n[Deux canaux] Chacun son plafond, chacun sa memoire');
{
  // L email est contraint par le quota Google et par une boite qu on noie
  // vite ; un salon Telegram, non. Tant que les deux partageaient un seul
  // plafond et un seul temoin, regler l email a 3 imposait 3 a Telegram -
  // et l inverse aurait fait des doublons.
  const url = 'https://exemple.test/flux-deux-canaux';
  const entrees = [];
  for (let i = 0; i < 8; i++) {
    entrees.push({ titre: 'Echeance proche ' + i,
      lien: 'https://exemple.test/dc' + i,
      description: 'Date limite : ' + enFrancais(jourRelatif(5)) });
  }
  const m = monde({
    sources: [source('SRC-001', url)], flux: { [url]: fluxRss(entrees) },
    config: { SEND_NEW_OPPORTUNITY: 'false', MAX_EMAILS_PAR_EXECUTION: '3',
              MAX_TELEGRAM_PAR_EXECUTION: '0',
              SEND_TELEGRAM: 'true', TELEGRAM_TOKEN: 'jeton',
              TELEGRAM_CHAT_ID: 'salon' }
  });

  m.ctx.executerTenderPilot();
  check('l email s arrete a son plafond', m.boite.length === 3,
        m.boite.length + ' emails');
  check('Telegram n est plus retenu par le plafond de l email',
        m.salon.length === 8, m.salon.length + ' messages');

  const parCanal = (canal) => m.feuille.opps.filter(
    o => m.ctx.dejaNotifie_(o.notifJ7, canal)).length;
  check('huit lignes servies sur Telegram', parCanal('telegram') === 8,
        parCanal('telegram') + ' lignes');
  check('trois seulement par email', parCanal('email') === 3,
        parCanal('email') + ' lignes');

  // Passage suivant : l email rattrape, Telegram ne renvoie RIEN.
  m.boite.length = 0;
  m.salon.length = 0;
  m.ctx.executerTenderPilot();
  check('l email reprend ou il s etait arrete', m.boite.length === 3,
        m.boite.length + ' emails');
  check('Telegram a deja tout envoye : il ne redit rien',
        m.salon.length === 0, m.salon.length + ' messages');
  check('six lignes servies par email', parCanal('email') === 6,
        parCanal('email') + ' lignes');

  m.ctx.executerTenderPilot();
  check('au troisieme passage tout est parti', parCanal('email') === 8,
        parCanal('email') + ' lignes');
  check('et Telegram est reste muet', m.salon.length === 0);
}

// ==========================================================================
console.log('\n[Deux canaux] Telegram plafonne sans retenir l email');
{
  const url = 'https://exemple.test/flux-plafond-telegram';
  const entrees = [];
  for (let i = 0; i < 6; i++) {
    entrees.push({ titre: 'Avis ' + i, lien: 'https://exemple.test/pt' + i,
      description: 'Date limite : ' + enFrancais(jourRelatif(5)) });
  }
  const m = monde({
    sources: [source('SRC-001', url)], flux: { [url]: fluxRss(entrees) },
    config: { SEND_NEW_OPPORTUNITY: 'false', MAX_EMAILS_PAR_EXECUTION: '0',
              MAX_TELEGRAM_PAR_EXECUTION: '2',
              SEND_TELEGRAM: 'true', TELEGRAM_TOKEN: 'jeton',
              TELEGRAM_CHAT_ID: 'salon' }
  });

  m.ctx.executerTenderPilot();
  check('l email n est pas retenu par Telegram', m.boite.length === 6,
        m.boite.length + ' emails');
  check('Telegram tient son propre plafond', m.salon.length === 2,
        m.salon.length + ' messages');
  check('le report est journalise, canal nomme',
        m.feuille.logs.some(l => l.action === 'Notifications'
          && l.message.indexOf('telegram par execution') !== -1),
        JSON.stringify(m.feuille.logs.filter(l => l.action === 'Notifications')
          .map(l => l.message)));
}

// ==========================================================================
console.log('\n[Deux canaux] Un temoin d une version precedente vaut tout');
{
  const C = monde({}).ctx;
  // Une feuille en service porte des TRUE. Les relire comme "aucun canal"
  // renverrait au client des alertes deja recues : c est la seule erreur
  // qu on ne peut pas rattraper.
  check('true se lit tous canaux servis',
        C.canauxNotifies_(true).join(',') === 'email,telegram,ntfy',
        C.canauxNotifies_(true).join(','));
  check('et VRAI aussi, comme partout ailleurs',
        C.dejaNotifie_('VRAI', 'telegram') === true);
  check('une case vide n a servi personne',
        C.dejaNotifie_('', 'email') === false);
  check('un canal ne repond pas pour l autre',
        C.dejaNotifie_('telegram', 'email') === false
        && C.dejaNotifie_('telegram', 'telegram') === true);

  check('ajouter conserve ce qui est deja la',
        C.ajouterCanal_('telegram', 'email') === 'email,telegram');
  check('et l ordre ne depend pas de celui des envois',
        C.ajouterCanal_('email', 'telegram') === 'email,telegram');
  check('ajouter deux fois le meme canal ne change rien',
        C.ajouterCanal_('email,telegram', 'email') === 'email,telegram');
  check('une valeur illisible ne bloque pas un envoi legitime',
        C.ajouterCanal_('n importe quoi', 'email') === 'email');
}

// ==========================================================================
console.log('\n[ntfy] Un troisieme canal, avec ses propres regles');
{
  const url = 'https://exemple.test/flux-ntfy';
  const entrees = [];
  for (let i = 0; i < 5; i++) {
    entrees.push({ titre: 'Avis push ' + i,
      lien: 'https://exemple.test/np' + i,
      description: 'Date limite : ' + enFrancais(jourRelatif(5)) });
  }
  const m = monde({
    sources: [source('SRC-001', url)], flux: { [url]: fluxRss(entrees) },
    config: { SEND_NEW_OPPORTUNITY: 'false', MAX_EMAILS_PAR_EXECUTION: '2',
              MAX_NTFY_PAR_EXECUTION: '0',
              SEND_NTFY: 'true', NTFY_SUJET: 'tp-essai-9f2a' }
  });

  m.ctx.executerTenderPilot();
  check('les cinq notifications push sont parties', m.pousses.length === 5,
        m.pousses.length + ' notifications');
  check('l email garde son propre plafond', m.boite.length === 2,
        m.boite.length + ' emails');
  check('la notification porte un titre lisible',
        m.pousses[0].titre === 'Echeance dans 7 jours', m.pousses[0].titre);
  check('et le lien de l avis, pour l ouvrir d un appui',
        /^https:\/\/exemple\.test\/np/.test(m.pousses[0].lien),
        m.pousses[0].lien);
  check('le corps est du texte simple, sans balisage',
        m.pousses[0].corps.indexOf('<') === -1, m.pousses[0].corps);

  // La memoire vaut pour ntfy comme pour les autres.
  m.pousses.length = 0;
  m.ctx.executerTenderPilot();
  check('rien n est pousse deux fois', m.pousses.length === 0,
        m.pousses.length + ' notifications au second passage');
}

// ==========================================================================
console.log('\n[ntfy] L adresse se compose sans surprise');
{
  const C = monde({}).ctx;
  check('serveur par defaut',
        C.adresseNtfy_({ NTFY_SUJET: 'sujet' }) === 'https://ntfy.sh/sujet');
  check('serveur personnel, barre finale en trop',
        C.adresseNtfy_({ NTFY_SERVEUR: 'https://push.moi.test/',
                         NTFY_SUJET: 'sujet' })
          === 'https://push.moi.test/sujet');
  check('sans sujet, le canal n est pas actif',
        C.ntfyActif_({ SEND_NTFY: 'true', NTFY_SUJET: '' }) === false);
  check('et sans SEND_NTFY non plus',
        C.ntfyActif_({ SEND_NTFY: 'false', NTFY_SUJET: 'sujet' }) === false);
}

// ==========================================================================
console.log('\n[Agenda] Seules les echeances SUIVIES sont posees');
{
  // Le classeur ramene des centaines d avis. Les verser tous dans l agenda
  // du client le rendrait inutilisable : seules entrent les lignes ou il a
  // ecrit OUI dans la colonne Suivi.
  const url = 'https://exemple.test/flux-agenda';
  const m = monde({
    sources: [source('SRC-001', url)],
    flux: { [url]: fluxRss([
      { titre: 'Avis suivi', lien: 'https://exemple.test/ag1',
        description: 'Date limite : ' + enFrancais(jourRelatif(20)) },
      { titre: 'Avis ignore', lien: 'https://exemple.test/ag2',
        description: 'Date limite : ' + enFrancais(jourRelatif(20)) }
    ]) },
    config: { SEND_NEW_OPPORTUNITY: 'false', SEND_J7: 'false',
              SEND_AGENDA: 'true', AGENDA_RAPPELS_JOURS: '7, 1' }
  });

  m.ctx.executerTenderPilot();
  check('sans decision du client, l agenda reste vide',
        m.agenda.length === 0, m.agenda.length + ' evenements');

  // Le client coche UNE ligne.
  const suivie = m.feuille.opps.filter(o => o.title === 'Avis suivi')[0];
  suivie.suivi = 'OUI';

  m.ctx.executerTenderPilot();
  check('une seule echeance est posee', m.agenda.length === 1,
        m.agenda.length + ' evenements');
  check('c est bien celle que le client suit',
        m.agenda[0].titre === 'Echeance : Avis suivi', m.agenda[0].titre);
  check('les rappels demandes sont poses, en minutes',
        m.agenda[0].rappels.join(',') === '10080,1440',
        m.agenda[0].rappels.join(','));
  check('la description porte le lien de l avis',
        m.agenda[0].description.indexOf('https://exemple.test/ag1') !== -1,
        m.agenda[0].description);
  check('la ligne garde l identifiant de l evenement',
        String(suivie.agenda).indexOf('evt-') === 0, String(suivie.agenda));

  // Troisieme passage : rien ne doit etre repose.
  m.ctx.executerTenderPilot();
  check('une echeance posee ne l est jamais deux fois',
        m.agenda.length === 1, m.agenda.length + ' evenements');

  // Vider la colonne Agenda fait reposer l evenement : c est la porte de
  // sortie quand le client a supprime l evenement a la main.
  suivie.agenda = '';
  m.ctx.executerTenderPilot();
  check('vider la colonne Agenda repose l evenement',
        m.agenda.length === 2, m.agenda.length + ' evenements');
}

// ==========================================================================
console.log('\n[Agenda] Ce qui l empeche de poser, et qui ne casse rien');
{
  const C = monde({}).ctx;
  check('rappels illisibles ignores, pas fatals',
        C.rappelsAgenda_({ AGENDA_RAPPELS_JOURS: '7, abc, 1, 900' })
          .join(',') === '7,1');
  check('aucun rappel demande est une reponse valable',
        C.rappelsAgenda_({ AGENDA_RAPPELS_JOURS: '' }).length === 0);
  check('le canal est inerte tant que SEND_AGENDA est faux',
        C.agendaActif_({ SEND_AGENDA: 'false' }) === false);

  const url = 'https://exemple.test/flux-agenda-sansdate';
  const m = monde({
    sources: [source('SRC-001', url)],
    flux: { [url]: fluxRss([
      { titre: 'Avis sans echeance', lien: 'https://exemple.test/sd1',
        description: 'Pas de date ici.' }
    ]) },
    config: { SEND_NEW_OPPORTUNITY: 'false', SEND_AGENDA: 'true' }
  });
  m.ctx.executerTenderPilot();
  m.feuille.opps.forEach(o => { o.suivi = 'OUI'; });
  m.ctx.executerTenderPilot();
  check('une annonce suivie mais sans date n entre pas dans l agenda',
        m.agenda.length === 0, m.agenda.length + ' evenements');
  check('et le passage aboutit quand meme',
        m.feuille.logs.some(l => l.action === 'Execution'
                                 && l.statut === 'SUCCESS'));
}

// ==========================================================================
console.log('\n[Suivi] Les rappels peuvent se limiter aux offres suivies');
{
  const url = 'https://exemple.test/flux-suivi';
  const m = monde({
    sources: [source('SRC-001', url)],
    flux: { [url]: fluxRss([
      { titre: 'Avis suivi', lien: 'https://exemple.test/s1',
        description: 'Date limite : ' + enFrancais(jourRelatif(5)) },
      { titre: 'Avis ignore', lien: 'https://exemple.test/s2',
        description: 'Date limite : ' + enFrancais(jourRelatif(5)) }
    ]) },
    config: { RAPPELS_SUIVIS_SEULEMENT: 'true' }
  });

  // Premier passage : les NOUVEAUTES partent quand meme. C est le point
  // qui compte - une annonce qui vient d entrer ne peut pas etre suivie.
  m.ctx.executerTenderPilot();
  const nouveautes = m.boite.filter(
    e => e.sujet.indexOf('Nouvelle opportunite') !== -1);
  check('les nouveautes partent, suivies ou non', nouveautes.length === 2,
        nouveautes.length + ' annonces de nouveaute');
  check('mais aucun rappel d echeance',
        m.boite.filter(e => e.sujet.indexOf('J-7') !== -1
                         || e.sujet.indexOf('7 jours') !== -1).length === 0,
        m.boite.map(e => e.sujet).join(' | '));

  // Rien n a ete marque : le client doit pouvoir cocher plus tard.
  const ignoree = m.feuille.opps.filter(o => o.title === 'Avis ignore')[0];
  check('un rappel non envoye n est pas marque',
        m.ctx.dejaNotifie_(ignoree.notifJ7, 'email') === false,
        String(ignoree.notifJ7));

  // Le client coche une ligne : son rappel part au passage suivant.
  const suivie = m.feuille.opps.filter(o => o.title === 'Avis suivi')[0];
  suivie.suivi = 'OUI';
  m.boite.length = 0;
  m.ctx.executerTenderPilot();
  check('cocher Suivi libere le rappel', m.boite.length === 1,
        m.boite.map(e => e.sujet).join(' | '));
  check('et c est bien celle qui est suivie',
        m.boite[0].sujet.indexOf('Avis suivi') !== -1, m.boite[0].sujet);

  // L autre reste muette, indefiniment.
  m.boite.length = 0;
  m.ctx.executerTenderPilot();
  check('celle qui n est pas suivie ne rappelle jamais',
        m.boite.length === 0, m.boite.length + ' emails');
}

// ==========================================================================
console.log('\n[Suivi] Sans le reglage, rien ne change');
{
  const url = 'https://exemple.test/flux-suivi-defaut';
  const m = monde({
    sources: [source('SRC-001', url)],
    flux: { [url]: fluxRss([
      { titre: 'Avis non suivi', lien: 'https://exemple.test/d1',
        description: 'Date limite : ' + enFrancais(jourRelatif(5)) }
    ]) },
    config: { SEND_NEW_OPPORTUNITY: 'false' }
  });
  m.ctx.executerTenderPilot();
  check('le rappel part sans qu on ait rien coche', m.boite.length === 1,
        m.boite.map(e => e.sujet).join(' | '));

  const C = m.ctx;
  check('OUI, true, VRAI et 1 se valent tous',
        ['OUI', 'true', 'VRAI', '1', 'yes'].every(
          v => C.estSuivie_({ suivi: v })));
  check('une case vide ne suit rien',
        C.estSuivie_({ suivi: '' }) === false
        && C.estSuivie_({}) === false);
}

// ==========================================================================
console.log('\n' + '-'.repeat(58));
if (echecs.length) {
  console.log('ECHEC : ' + echecs.length + ' verification(s) en echec');
  echecs.forEach(e => console.log('  - ' + e));
  process.exit(1);
}
console.log('SUCCES : ' + reussites + '/' + reussites + ' verifications passees');
