/**
 * TenderPilot - intelligence optionnelle.
 *
 * Jumeau de web/src/lib/domain/llm.ts et web/src/lib/llm.ts. Apps Script n a
 * pas de modules : la logique et l appel reseau vivent donc dans le meme
 * fichier, exactement comme Telegram.gs.
 *
 * TOUTE DIVERGENCE AVEC LE MOTEUR WEB EST UN BUG. Les deux produits doivent
 * juger la meme annonce de la meme facon ; sinon le client qui passe du
 * classeur a l application voit son tableau changer sans raison.
 *
 * Trois emplois et une interdiction.
 *
 *   Il classe    - secteur et type, annonce par annonce, la ou le registre
 *                  n a qu un defaut par source, absent pour 82 sources
 *                  sur 104.
 *   Il trie      - ce qui n est pas une opportunite ne rentre pas : un
 *                  article, une FAQ, un communique n ont rien a repondre.
 *   Il resume    - un titre administratif de trois lignes devient lisible.
 *
 *   Il ne lit JAMAIS une date. Un modele produit toujours une echeance
 *   plausible plutot que rien, et une echeance inventee fait rater un
 *   depot. extractDeadline reste seul juge.
 *
 * SANS CLE, TOUT CE FICHIER EST INERTE et la collecte se comporte
 * exactement comme avant qu il existe.
 */

// ------------------------------------------------------------- DIALECTES

/**
 * Les fournisseurs ne parlent pas tous la meme langue. Trois dialectes
 * couvrent le marche :
 *   openai    - Mistral, Groq, DeepSeek, OpenRouter, vLLM local. Le client
 *               change une URL, pas notre code.
 *   anthropic - en-tete x-api-key, corps et reponse differents.
 *   gemini    - la cle en parametre d URL, le modele dans le chemin.
 */
var LLM_ENDPOINTS = {
  openai: 'https://api.mistral.ai/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/models'
};

var LLM_DEFAUTS = {
  dialecte: 'openai',
  modele: 'mistral-small-latest',
  maxAppelsJour: 100,
  tailleLot: 30,
  maxCaracteresPage: 40000
};

/** Zone selectionnee par defaut : le Benin seul. Rien de ferme. */
var LLM_PAYS_DEFAUT = ['Benin'];

/**
 * Vocabulaire ferme.
 *
 * Laisse libre, un modele ecrit "Tech", "IT" et "Numerique" pour une seule
 * chose, et les filtres du classeur deviennent inutilisables. Toute valeur
 * hors liste est rejetee, pas rangee dans "Autre" en douce.
 */
var LLM_SECTEURS = [
  'Agriculture et agroalimentaire', 'Eau et assainissement',
  'Education et formation', 'Energie', 'Environnement et climat',
  'Entrepreneuriat et PME', 'Finance', 'Genre et inclusion',
  'Gouvernance et institutions', 'Humanitaire, paix et securite',
  'Infrastructures et BTP', 'Numerique et technologie', 'Sante',
  'Transport et logistique', 'Culture et arts', 'Autre'
];

var LLM_TYPES = [
  'Appel d offres', 'AMI', 'Demande de cotation', 'Appel a projets',
  'Subvention', 'Bourse', 'Investissement', 'Recrutement', 'Evenement',
  'Autre'
];

// ------------------------------------------------------------- REGLAGES

/** Lit les reglages du LLM depuis l onglet CONFIG. */
function configLlm_(config) {
  var dialecte = String(config.LLM_DIALECTE || LLM_DEFAUTS.dialecte)
    .trim().toLowerCase();
  if (!LLM_ENDPOINTS[dialecte]) dialecte = LLM_DEFAUTS.dialecte;

  var pays = String(config.PAYS_SUIVIS || '').trim();
  return {
    actif: estVrai(config.USE_LLM),
    dialecte: dialecte,
    endpoint: String(config.LLM_ENDPOINT || LLM_ENDPOINTS[dialecte]).trim(),
    cle: String(config.LLM_CLE || '').trim(),
    modele: String(config.LLM_MODELE || LLM_DEFAUTS.modele).trim(),
    maxAppelsJour: Number(config.LLM_MAX_APPELS_JOUR) > 0
      ? Number(config.LLM_MAX_APPELS_JOUR) : LLM_DEFAUTS.maxAppelsJour,
    tailleLot: Number(config.LLM_TAILLE_LOT) > 0
      ? Number(config.LLM_TAILLE_LOT) : LLM_DEFAUTS.tailleLot,
    paysCibles: pays
      ? pays.split(',').map(function (p) { return p.trim(); })
            .filter(function (p) { return p; })
      : LLM_PAYS_DEFAUT,
    accepterMondial: estVide(config.LLM_APPELS_MONDIAUX)
      ? true : estVrai(config.LLM_APPELS_MONDIAUX),
    filtrerParZone: estVrai(config.LLM_FILTRER_ZONE),
    inclureEvenements: estVrai(config.LLM_INCLURE_EVENEMENTS)
  };
}

/**
 * Le LLM est-il utilisable ?
 *
 * L absence d une seule condition desactive tout, en silence. C est voulu :
 * un client sans cle doit avoir un produit qui marche, pas un produit qui
 * se plaint.
 */
function llmActif_(c) {
  return Boolean(c && c.actif && c.cle && c.modele && c.endpoint);
}

// ------------------------------------------------------------- EMPREINTE

/**
 * Texte visible d une page, balisage retire.
 *
 * Mesure du 2026-09-01 sur six sources reelles, deux lectures a trois
 * secondes d intervalle : l empreinte du HTML brut est stable sur 2 sources
 * sur 6, celle du texte visible sur 5 sur 5. ENABEL donne la raison en
 * clair - son seul element volatil est un compteur anti-spam loge dans un
 * attribut. D ou la regle : on hache le texte, jamais le balisage.
 */
function texteVisible_(html) {
  if (!html) return '';
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\s ]+/g, ' ')
    .trim();
}

/**
 * Hachage FNV-1a sur deux registres.
 *
 * Ecrit a la main plutot qu emprunte a Utilities.computeDigest : le meme
 * code doit rendre la meme empreinte dans les deux moteurs. Ce n est pas du
 * hachage cryptographique et ca n a pas a l etre - on compare une page a sa
 * propre version precedente, on ne cherche pas une collision.
 */
function empreinteContenu_(html) {
  var texte = texteVisible_(html);
  if (!texte) return '';
  var a = 0x811c9dc5;
  var b = 0x01000193;
  for (var i = 0; i < texte.length; i++) {
    var c = texte.charCodeAt(i);
    a ^= c;
    a = Math.imul(a, 0x01000193) >>> 0;
    b = (b + c) >>> 0;
    b = Math.imul(b, 0x85ebca6b) >>> 0;
  }
  function hex(n) {
    var s = (n >>> 0).toString(16);
    while (s.length < 8) s = '0' + s;
    return s;
  }
  return hex(a) + hex(b);
}

/** Une page inchangee n a rien de nouveau : on ne reveille pas le modele. */
function pageAChange_(avant, actuelle) {
  var a = String(avant === null || avant === undefined ? '' : avant).trim();
  if (!a) return true;
  return a !== actuelle;
}

// -------------------------------------------------------------- REQUETES

/** URL a appeler. Gemini range le modele dans le chemin et la cle en query. */
function urlRequeteLlm_(c) {
  var base = String(c.endpoint).trim().replace(/\/+$/, '');
  if (c.dialecte === 'gemini') {
    return base + '/' + encodeURIComponent(c.modele) + ':generateContent'
      + '?key=' + encodeURIComponent(String(c.cle).trim());
  }
  return base;
}

/**
 * En-tetes.
 *
 * La cle ne figure que la, ou dans l URL pour Gemini. Elle n apparait
 * jamais dans un journal ni dans un message d erreur - meme regle que le
 * jeton Telegram, et pour la meme raison : c est le compte du client qui
 * paie.
 */
function entetesRequeteLlm_(c) {
  var cle = String(c.cle).trim();
  if (c.dialecte === 'anthropic') {
    return { 'x-api-key': cle, 'anthropic-version': '2023-06-01' };
  }
  if (c.dialecte === 'gemini') return {};
  return { Authorization: 'Bearer ' + cle };
}

/** Corps de la requete, dans le dialecte du fournisseur. */
function corpsRequeteLlm_(c, invite) {
  if (c.dialecte === 'anthropic') {
    return {
      model: c.modele, max_tokens: 4096,
      messages: [{ role: 'user', content: invite }]
    };
  }
  if (c.dialecte === 'gemini') {
    return {
      contents: [{ parts: [{ text: invite }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 4096 }
    };
  }
  return {
    model: c.modele, temperature: 0, max_tokens: 4096,
    messages: [{ role: 'user', content: invite }]
  };
}

/** Extrait le texte de la reponse, quel que soit le dialecte. */
function lireReponseLlm_(dialecte, corps) {
  var d;
  try {
    d = JSON.parse(corps);
  } catch (e) {
    return '';
  }
  if (dialecte === 'anthropic') {
    return (d && d.content && d.content[0] && d.content[0].text) || '';
  }
  if (dialecte === 'gemini') {
    var cand = d && d.candidates && d.candidates[0];
    var part = cand && cand.content && cand.content.parts
      && cand.content.parts[0];
    return (part && part.text) || '';
  }
  var ch = d && d.choices && d.choices[0];
  return (ch && ch.message && ch.message.content) || '';
}

/**
 * Un modele encadre volontiers son JSON de balises Markdown, meme quand on
 * le lui interdit. On recupere le premier tableau plutot que de rejeter la
 * reponse entiere.
 */
function extraireJsonLlm_(texte) {
  var t = String(texte === null || texte === undefined ? '' : texte).trim();
  if (!t) return null;
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  try {
    return JSON.parse(t);
  } catch (e) {
    // On tente le repli ci-dessous.
  }
  var i = t.indexOf('[');
  var j = t.lastIndexOf(']');
  if (i >= 0 && j > i) {
    try {
      return JSON.parse(t.slice(i, j + 1));
    } catch (e2) {
      return null;
    }
  }
  return null;
}

/** Decoupe en lots, pour tenir dans les six minutes d Apps Script. */
function enLots_(elements, taille) {
  var n = Math.max(1, Math.floor(taille) || 1);
  var lots = [];
  for (var i = 0; i < elements.length; i += n) {
    lots.push(elements.slice(i, i + n));
  }
  return lots;
}

// ----------------------------------------------------------- VOCABULAIRE

/** Ne retient une valeur que si elle figure au vocabulaire. */
function choisirDansListe_(valeur, liste) {
  var v = String(valeur === null || valeur === undefined ? '' : valeur).trim();
  if (!v) return null;
  for (var i = 0; i < liste.length; i++) {
    if (liste[i].toLowerCase() === v.toLowerCase()) return liste[i];
  }
  return null;
}

/**
 * Met la zone en phrase pour l invite.
 *
 * Ecrit pour etre lu par un modele : une enumeration naturelle donne de
 * meilleurs jugements qu une liste de codes pays.
 */
function phraseZone_(pays, accepterMondial) {
  var liste = (pays || []).map(function (p) { return String(p).trim(); })
    .filter(function (p) { return p; });
  if (!liste.length) {
    return accepterMondial ? 'n importe quel pays' : 'aucun pays';
  }
  var e = liste.length === 1
    ? liste[0]
    : liste.slice(0, -1).join(', ') + ' ou ' + liste[liste.length - 1];
  return accepterMondial
    ? e + ' (les appels mondiaux ou ouverts a tous les pays comptent aussi)'
    : e + ' uniquement';
}

// ------------------------------------------------------------ CLASSEMENT

/**
 * Invite de classement.
 *
 * Deux precautions y pesent plus que le reste.
 *
 * L interdiction des dates est explicite, et le format de sortie n a aucun
 * champ pour en accueillir une.
 *
 * L index est renvoye par le modele. Se fier a l ordre du tableau serait
 * fragile : il en oublie un, et tout le lot est decale d un cran.
 */
function invitePourClassement_(lot, zone) {
  var annonces = lot.map(function (e, i) {
    var r = String(e.summary === null || e.summary === undefined
      ? '' : e.summary).replace(/\s+/g, ' ').slice(0, 300);
    var t = String(e.title === null || e.title === undefined
      ? '' : e.title).slice(0, 250);
    return i + '. ' + t + (r ? ' | ' + r : '');
  }).join('\n');

  return [
    'Tu tries des annonces relevees sur des sites de bailleurs et d acheteurs',
    'publics. Certaines sont de vraies opportunites, d autres sont des',
    'articles, des FAQ, des communiques ou des annonces de partenariat.',
    '',
    'Pour CHAQUE annonce, renvoie un objet JSON avec exactement ces cles :',
    '  i           - le numero de l annonce, entier',
    '  opportunite - true s il y a QUELQUE CHOSE A FAIRE avant une date :',
    '                deposer une offre, candidater, soumettre un projet,',
    '                s inscrire a un salon, un atelier, une formation, une',
    '                conference. false pour un article, une FAQ, un',
    '                communique, un portrait, un compte rendu ou une simple',
    '                page de presentation - rien a quoi repondre.',
    '  secteur     - une valeur EXACTE de : ' + LLM_SECTEURS.join(' | '),
    '  type        - une valeur EXACTE de : ' + LLM_TYPES.join(' | '),
    '                Un salon, un atelier, une conference : Evenement.',
    '  resume      - une phrase de 20 mots maximum, en francais',
    '  pertinent   - true si une organisation ou une entreprise de ' + zone,
    '                PEUT CANDIDATER. Un appel mondial ou ouvert a tous les',
    '                pays est pertinent : reponds true. Ne mets false que si',
    '                l annonce est reservee a un autre pays ou une autre',
    '                region.',
    '',
    'REGLES ABSOLUES :',
    '- Ne renvoie AUCUNE date, sous aucune forme. Pas de deadline, pas',
    '  d echeance, pas de date de publication. Elles sont lues ailleurs.',
    '- N invente pas de libelle : si aucun secteur ne convient, mets Autre.',
    '- Une FAQ ou une page d explication SUR un appel n est pas l appel :',
    '  opportunite = false.',
    '- Reponds UNIQUEMENT par un tableau JSON, sans texte avant ni apres.',
    '',
    'Annonces :',
    annonces
  ].join('\n');
}

/**
 * Fusionne le jugement du modele dans les annonces.
 *
 * L etancheite aux dates ne tient pas a une liste de champs proteges, elle
 * tient a la forme : le jugement n est JAMAIS etale dans la fiche. Seuls les
 * champs nommes un par un ci-dessous sont repris. Une echeance renvoyee
 * malgre l interdiction, sous n importe quel nom, n a aucun chemin pour
 * arriver.
 */
function appliquerClassement_(lot, brut) {
  var parIndex = {};
  if (Object.prototype.toString.call(brut) === '[object Array]') {
    brut.forEach(function (o) {
      var i = Number(o && o.i);
      if (i === Math.floor(i) && i >= 0 && i < lot.length) parIndex[i] = o;
    });
  }

  return lot.map(function (o, i) {
    var v = parIndex[i];
    if (!v) return o;

    var resume = String(v.resume === null || v.resume === undefined
      ? '' : v.resume).trim();
    var secteur = choisirDansListe_(v.secteur, LLM_SECTEURS);
    var type = choisirDansListe_(v.type, LLM_TYPES);

    var sortie = {};
    Object.keys(o).forEach(function (k) { sortie[k] = o[k]; });
    sortie.sector = secteur || o.sector || '';
    sortie.type = type || o.type || '';
    sortie.summary = resume || o.summary || '';
    if (typeof v.pertinent === 'boolean') sortie.pertinent = v.pertinent;
    if (typeof v.opportunite === 'boolean') sortie.opportunite = v.opportunite;
    // Seconde barriere : les dates d origine sont recopiees explicitement.
    sortie.deadline = o.deadline;
    sortie.published = o.published;
    return sortie;
  });
}

/**
 * Applique les preferences du client.
 *
 * Une seule regle est absolue et ne se regle pas : ce qui n est pas une
 * opportunite ne rentre pas. Le reste est un choix, et les defauts sont
 * prudents - la zone ETIQUETTE, elle ne supprime pas.
 *
 * Une annonce que le modele n a pas jugee reste. Le doute profite toujours
 * a l annonce : mieux vaut une ligne de trop qu un marche manque.
 */
function appliquerPreferences_(annonces, c) {
  return annonces.filter(function (o) {
    if (o.opportunite === false) return false;
    if (!c.inclureEvenements && o.type === 'Evenement') return false;
    if (c.filtrerParZone && o.pertinent === false) return false;
    return true;
  });
}

// ---------------------------------------------------------------- RESEAU

/** Cle du compteur quotidien, dans les proprietes du script. */
var LLM_COMPTEUR = 'LLM_APPELS';

/**
 * Compte les appels du jour.
 *
 * Contrairement au moteur web - sans memoire d une invocation a l autre -
 * Apps Script tient un vrai compteur quotidien. C est la seule difference
 * assumee entre les deux moteurs, et elle joue en faveur du classeur.
 */
function appelsDuJour_() {
  var brut = PropertiesService.getScriptProperties().getProperty(LLM_COMPTEUR);
  var jour = Utilities.formatDate(new Date(), 'Etc/UTC', 'yyyy-MM-dd');
  if (!brut) return { jour: jour, n: 0 };
  var parts = String(brut).split('|');
  if (parts[0] !== jour) return { jour: jour, n: 0 };
  return { jour: jour, n: Number(parts[1]) || 0 };
}

function noterAppel_(etat) {
  etat.n += 1;
  PropertiesService.getScriptProperties()
    .setProperty(LLM_COMPTEUR, etat.jour + '|' + etat.n);
}

/**
 * Un appel au modele.
 *
 * muteHttpExceptions : une erreur du fournisseur ne doit pas interrompre la
 * collecte. Le corps de la reponse porte la cause utile ; il ne contient pas
 * la cle, qui voyage en en-tete.
 */
function appelerLlm_(c, invite) {
  var reponse = UrlFetchApp.fetch(urlRequeteLlm_(c), {
    method: 'post',
    contentType: 'application/json',
    headers: entetesRequeteLlm_(c),
    muteHttpExceptions: true,
    payload: JSON.stringify(corpsRequeteLlm_(c, invite))
  });
  var code = reponse.getResponseCode();
  if (code !== 200) {
    throw new Error('LLM HTTP ' + code + ' - '
      + String(reponse.getContentText()).slice(0, 200));
  }
  return extraireJsonLlm_(
    lireReponseLlm_(c.dialecte, reponse.getContentText()));
}

/**
 * Fait juger les annonces par le modele, quand il est configure.
 *
 * LE MODELE NE CASSE JAMAIS LA COLLECTE. Cle absente, plafond atteint, API
 * en panne, reponse illisible : les annonces traversent sans classement et
 * le produit se comporte comme avant que cette fonctionnalite existe. Un
 * client dont le fournisseur est en panne doit recevoir ses appels d offres,
 * pas une erreur.
 */
function classerAnnonces_(annonces, config) {
  var c = configLlm_(config);
  if (!llmActif_(c) || !annonces.length) {
    return { annonces: annonces, appels: 0, ecartees: 0, actif: false };
  }

  var zone = phraseZone_(c.paysCibles, c.accepterMondial);
  var etat = appelsDuJour_();
  var depart = etat.n;
  var jugees = [];

  enLots_(annonces, c.tailleLot).forEach(function (lot) {
    if (etat.n >= c.maxAppelsJour) {
      // Plafond atteint : le reste passe sans classement plutot que de
      // faire exploser la facture du client.
      jugees = jugees.concat(lot);
      return;
    }
    try {
      noterAppel_(etat);
      jugees = jugees.concat(appliquerClassement_(
        lot, appelerLlm_(c, invitePourClassement_(lot, zone))));
    } catch (e) {
      // Un lot perdu ne fait perdre aucune annonce : elles sortent telles
      // quelles, sans jugement.
      jugees = jugees.concat(lot);
    }
  });

  var gardees = appliquerPreferences_(jugees, c);
  return {
    annonces: gardees,
    appels: etat.n - depart,
    ecartees: jugees.length - gardees.length,
    actif: true
  };
}

// ------------------------------------------------------------------ MENU

/**
 * Envoie une annonce d essai au modele.
 *
 * A appeler au moment du reglage, pas a chaque collecte : c est la que le
 * client peut encore corriger une faute de frappe.
 */
function testerLlm() {
  var config = lireConfig();
  var c = configLlm_(config);
  var ui = SpreadsheetApp.getUi();

  if (!llmActif_(c)) {
    ui.alert(MENU,
      'Le classement intelligent n est pas configure.\n\n'
      + 'Dans l onglet CONFIG, renseignez :\n'
      + '  USE_LLM = true\n'
      + '  LLM_CLE = votre cle chez le fournisseur\n'
      + '  LLM_MODELE = ' + LLM_DEFAUTS.modele + '\n\n'
      + 'La cle est celle de VOTRE compte : c est vous qui payez les appels,'
      + ' et vous seul y avez acces.',
      ui.ButtonSet.OK);
    return;
  }

  var essai = [{
    title: 'Avis d appel d offres pour la fourniture de materiel informatique',
    summary: '', deadline: '', published: ''
  }];
  try {
    var r = classerAnnonces_(essai, config);
    var o = r.annonces[0];
    if (!o || (!o.type && !o.sector)) {
      ui.alert(MENU,
        'Le modele a repondu, mais sans classement lisible.\n'
        + 'Verifiez le nom du modele dans LLM_MODELE.', ui.ButtonSet.OK);
      return;
    }
    ui.alert(MENU,
      'Le classement fonctionne.\n\n'
      + 'Annonce d essai :\n  ' + essai[0].title + '\n\n'
      + 'Type : ' + (o.type || '-') + '\n'
      + 'Secteur : ' + (o.sector || '-') + '\n'
      + 'Resume : ' + (o.summary || '-'),
      ui.ButtonSet.OK);
  } catch (e) {
    ui.alert(MENU, 'Echec de l appel :\n\n' + e.message, ui.ButtonSet.OK);
  }
}

if (typeof module !== 'undefined') {
  module.exports = {
    LLM_ENDPOINTS: LLM_ENDPOINTS,
    LLM_DEFAUTS: LLM_DEFAUTS,
    LLM_PAYS_DEFAUT: LLM_PAYS_DEFAUT,
    LLM_SECTEURS: LLM_SECTEURS,
    LLM_TYPES: LLM_TYPES,
    llmActif_: llmActif_,
    texteVisible_: texteVisible_,
    empreinteContenu_: empreinteContenu_,
    pageAChange_: pageAChange_,
    urlRequeteLlm_: urlRequeteLlm_,
    entetesRequeteLlm_: entetesRequeteLlm_,
    corpsRequeteLlm_: corpsRequeteLlm_,
    lireReponseLlm_: lireReponseLlm_,
    extraireJsonLlm_: extraireJsonLlm_,
    enLots_: enLots_,
    choisirDansListe_: choisirDansListe_,
    phraseZone_: phraseZone_,
    invitePourClassement_: invitePourClassement_,
    appliquerClassement_: appliquerClassement_,
    appliquerPreferences_: appliquerPreferences_
  };
}
