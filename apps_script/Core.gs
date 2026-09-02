/**
 * TenderPilot - logique pure.
 *
 * Aucune fonction ici n'appelle SpreadsheetApp, MailApp ou UrlFetchApp.
 * C'est ce qui permet de la tester hors de Google (tests/test_logic.js).
 * Tout ce qui touche au classeur vit dans Sheet.gs.
 */

/** Texte normalise pour comparaison : accents, casse, ponctuation. */
function normalizeText(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function estVide(v) {
  return v === null || v === undefined || String(v).trim() === '';
}

/** Date -> "aaaa-mm-jj". Accepte deja une chaine au bon format. */
function jour(valeur) {
  if (estVide(valeur)) return '';
  if (valeur instanceof Date) {
    return valeur.getFullYear() + '-'
      + ('0' + (valeur.getMonth() + 1)).slice(-2) + '-'
      + ('0' + valeur.getDate()).slice(-2);
  }
  var m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(valeur).trim());
  if (!m) return '';
  return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
}

/**
 * Jours restants avant une deadline.
 *
 * Le calcul se fait sur des dates sans heure : un changement d'heure
 * saisonnier ne doit pas produire 6,96 jours au lieu de 7.
 */
function joursRestants(deadline, aujourdhui) {
  var d = jour(deadline);
  var t = jour(aujourdhui);
  if (!d || !t) return null;
  var a = d.split('-').map(Number);
  var b = t.split('-').map(Number);
  return Math.round((new Date(a[0], a[1] - 1, a[2])
    - new Date(b[0], b[1] - 1, b[2])) / 86400000);
}

/** Statut de delai - section 9 du cahier des charges. */
function statutDelai(jours) {
  if (jours === null || jours === undefined || jours === '') {
    return SCHEMA.STATUT_INCONNU;
  }
  if (jours < 0) return SCHEMA.STATUT_EXPIRE;
  for (var i = 0; i < SCHEMA.DELAI_SEUILS.length; i++) {
    if (jours <= SCHEMA.DELAI_SEUILS[i][1]) return SCHEMA.DELAI_SEUILS[i][0];
  }
  return SCHEMA.STATUT_OUVERT;
}

function couleurStatut(statut) {
  return SCHEMA.COULEURS[statut] || SCHEMA.COULEURS[SCHEMA.STATUT_INCONNU];
}

// ------------------------------------------------------------- SECTEURS

/**
 * Ce qu on affiche quand aucune tentative n a abouti.
 *
 * Une cellule vide est ambigue : le client ne sait pas si l information
 * manque a la source ou si le produit a un defaut. Une valeur explicite
 * repond, et devient une entree de filtre utilisable.
 *
 * A DISTINGUER D "Autre" : classe, mais aucune categorie ne convient. Ici,
 * on n a pas su.
 */
var SECTEUR_INCONNU = 'Non precise';

var SECTEURS_ANNONCE = [
  "Agriculture et agroalimentaire",
  "Eau et assainissement",
  "Education et formation",
  "Energie",
  "Environnement et climat",
  "Entrepreneuriat et PME",
  "Finance",
  "Genre et inclusion",
  "Gouvernance et institutions",
  "Humanitaire, paix et securite",
  "Infrastructures et BTP",
  "Numerique et technologie",
  "Sante",
  "Transport et logistique",
  "Culture et arts",
  "Autre",
];

/**
 * Mots qui designent un secteur sans ambiguite.
 *
 * MESURE DU 2026-09-02 : 390 opportunites sur 449 n avaient AUCUN secteur,
 * soit 87 %. Un client sans classement intelligent n avait donc pas de
 * filtre secteur du tout.
 *
 * Les termes sont choisis pour etre SPECIFIQUES. "Projet", "programme" ou
 * "appui" ne figurent nulle part : ils designent tout et donc rien. Mieux
 * vaut une colonne vide qu un secteur faux - une annonce mal rangee est une
 * annonce que le client ne trouvera pas.
 *
 * Francais et anglais melanges : les sources sont bilingues.
 */
var MOTS_SECTEUR = [
  ["Sante", ["sante", "health", "medical", "medicaux", "hopital", "hospital",
    "clinique", "clinical", "medicament", "pharmaceutic", "vaccin", "vaccine",
    "nutrition", "epidemi", "maladie", "disease", "patient", "soins",
    "medico", "chirurg", "dispensaire", "infirmerie", "maternite",
    "centre de sante", "sanitaire"]],
  ["Eau et assainissement", ["assainissement", "sanitation", "eau potable",
    "drinking water", "forage", "borehole", "adduction", "hydraulique",
    "latrine", "hygiene", "wash"]],
  ["Energie", ["energie", "energy", "electri", "solaire", "solar",
    "photovoltai", "reseau electrique", "grid", "renouvelable", "renewable",
    "centrale", "power plant", "compteur", "eclairage"]],
  ["Agriculture et agroalimentaire", ["agricole", "agriculture", "agro",
    "elevage", "livestock", "semence", "seed", "irrigation", "peche",
    "fisheries", "recolte", "harvest", "farmer", "agriculteur", "betail"]],
  ["Education et formation", ["education", "scolaire", "school", "enseign",
    "universit", "student", "etudiant", "formation professionnelle",
    "curriculum", "pedagog", "alphabetisation", "literacy",
    "salle de classe", "salles de classe", "ecole", "lycee", "college",
    "apprenant", "eleve", "eleves", "classroom"]],
  ["Numerique et technologie", ["numerique", "digital", "informatique",
    "logiciel", "software", "internet", "cybersecur", "donnees", "data",
    "intelligence artificielle", "artificial intelligence", "serveur",
    "ordinateur", "computer", "telecom", "connectivite"]],
  ["Infrastructures et BTP", ["construction", "travaux de rehabilitation",
    "batiment", "building", "genie civil", "civil works", "voirie",
    "amenagement", "refection", "pistes rurales", "pont", "bridge"]],
  ["Transport et logistique", ["transport", "logistique", "logistics",
    "vehicule", "vehicle", "fret", "freight", "portuaire", "aeroport",
    "airport", "route nationale", "ferroviaire", "railway"]],
  ["Environnement et climat", ["environnement", "environmental", "climat",
    "climate", "biodiversit", "foret", "forest", "dechets", "waste",
    "pollution", "carbone", "carbon", "adaptation", "resilience"]],
  ["Finance", ["microfinance", "bancaire", "banking", "microcredit", "assurance",
    "insurance", "fiscal", "budgetaire", "audit financier", "tresorerie"]],
  ["Genre et inclusion", ["genre", "gender", "femme", "women", "handicap",
    "disabilit", "inclusion", "egalite", "equality", "jeunes filles"]],
  ["Humanitaire, paix et securite", ["humanitaire", "humanitarian",
    "refugie", "refugee", "deplace", "displaced", "urgence", "emergency",
    "paix", "peace", "securite civile", "conflit", "conflict", "deminage"]],
  ["Gouvernance et institutions", ["gouvernance", "governance",
    "etat de droit", "rule of law", "justice", "judiciaire", "election",
    "parlement", "decentralisation", "societe civile", "civil society",
    "transparence", "anticorruption", "corruption"]],
  ["Culture et arts", ["culturel", "artistique", "artist",
    "patrimoine", "heritage", "musee", "museum", "cinema", "audiovisuel",
    "musique", "music", "theatre"]],
  ["Entrepreneuriat et PME", ["entrepreneur", "startup", "start-up", "pme",
    "sme", "incubat", "accelerat", "petites et moyennes entreprises",
    "business plan", "artisan"]],
];

/**
 * Deduit un secteur du titre et du resume, sans modele.
 *
 * TROIS PRECAUTIONS.
 *
 * On ne devine pas. Sans correspondance nette, la colonne reste VIDE - une
 * annonce mal rangee est une annonce que le client ne trouvera pas.
 *
 * Le titre pese plus que le resume : un resume mentionne souvent le contexte
 * du bailleur plutot que l objet du marche. On cherche donc d abord dans le
 * titre seul, et seulement ensuite dans l ensemble.
 *
 * Un secteur deja renseigne - par la source ou par le modele - n est jamais
 * ecrase.
 */
function deduireSecteur(titre, _resume) {
  function nettoyer(v) {
    var sansAccents = String(v === null || v === undefined ? '' : v)
      .normalize('NFD').split('')
      .filter(function (ch) {
        var n = ch.charCodeAt(0);
        return n < 0x300 || n > 0x36f;
      })
      .join('').toLowerCase();
    var out = '';
    for (var i = 0; i < sansAccents.length; i++) {
      var ch = sansAccents.charAt(i);
      out += ((ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9')) ? ch : ' ';
    }
    return ' ' + out.split(' ').filter(function (x) { return x; }).join(' ') + ' ';
  };

  // UNE SEULE PASSE, SUR LE TITRE. La seconde passe sur le resume a ete
  // retiree apres mesure : elle produisait l essentiel des erreurs, parce
  // qu un resume parle du contexte du bailleur plutot que de l objet du
  // marche. Un secteur faux est PIRE qu un secteur vide - le client ne
  // trouvera pas l annonce.
  const t = nettoyer(titre);
  var jetons = {};
  t.split(' ').filter(function (x) { return x; })
    .forEach(function (x) { jetons[x] = true; });

  // UN TERME D UN SEUL MOT DOIT CORRESPONDRE A UN MOT ENTIER.
  //
  // Mesure du 2026-09-02 : cherche en sous-chaine, "election" se trouvait a
  // l interieur de "selection" et rangeait "Cabinet pour la selection de 20
  // campements" en Gouvernance. Les expressions de plusieurs mots, elles,
  // restent cherchees en sous-chaine : elles sont assez specifiques.
  function correspond(m) {
    if (m.indexOf(' ') !== -1) return t.indexOf(m) !== -1;
    if (jetons[m]) return true;
    // Une racine volontairement tronquee - "electri", "biodiversit" - vise
    // les mots qui COMMENCENT par elle.
    var cles = Object.keys(jetons);
    for (var k = 0; k < cles.length; k++) {
      if (cles[k].indexOf(m) === 0) return true;
    }
    return false;
  }

  for (var s = 0; s < MOTS_SECTEUR.length; s++) {
    if (MOTS_SECTEUR[s][1].some(correspond)) return MOTS_SECTEUR[s][0];
  }
  return '';
}

// -------------------------------------------------------- TYPES D ANNONCE

/**
 * Vocabulaire des types, partage par tout le produit.
 *
 * Jumeau de TYPES_ANNONCE dans web/src/lib/domain/regles.ts.
 *
 * MESURE DU 2026-09-02, sur 449 opportunites reellement collectees : la
 * colonne Type portait QUATORZE libelles pour huit notions. "Appel d offres"
 * 90 fois et "Appel d Offre" 43 fois - deux ecritures de la meme chose, donc
 * deux entrees de filtre, donc un filtre inutilisable.
 *
 * La normalisation est DETERMINISTE et n a besoin d aucune cle : un client
 * sans classement intelligent doit pouvoir filtrer par type.
 */
var TYPES_ANNONCE = ["Appel d'offres", 'AMI', 'Demande de cotation',
  'Appel a projets', 'Subvention', 'Bourse', 'Investissement',
  'Recrutement', 'Evenement', 'Autre'];

/** Libelles rencontres en production, et ce qu ils veulent dire. */
var TYPES_CONNUS = {
  'appel d offre': "Appel d'offres",
  'appel d offres': "Appel d'offres",
  'appel doffre': "Appel d'offres",
  'appel doffres': "Appel d'offres",
  'avis d appel d offres': "Appel d'offres",
  'marche de fournitures': "Appel d'offres",
  'marche de travaux': "Appel d'offres",
  'marche de services': "Appel d'offres",
  'invitation for bids': "Appel d'offres",
  'invitation to bid': "Appel d'offres",
  'request for bids': "Appel d'offres",
  'invitation for prequalification': "Appel d'offres",
  'ami': 'AMI',
  'avis a manifestation d interet': 'AMI',
  'manifestation d interet': 'AMI',
  'request for expression of interest': 'AMI',
  'expression of interest': 'AMI',
  'general procurement notice': 'AMI',
  'consultant qualification selection': 'AMI',
  'demande de cotation': 'Demande de cotation',
  'demande de prix': 'Demande de cotation',
  'request for quotation': 'Demande de cotation',
  'request for proposal': 'Demande de cotation',
  'request for proposals': 'Demande de cotation',
  'appel a projet': 'Appel a projets',
  'appel a projets': 'Appel a projets',
  'appel a propositions': 'Appel a projets',
  'call for proposals': 'Appel a projets',
  'subvention': 'Subvention',
  'subventions': 'Subvention',
  'grant': 'Subvention',
  'grants': 'Subvention',
  'bourse': 'Bourse',
  'bourses': 'Bourse',
  'fellowship': 'Bourse',
  'scholarship': 'Bourse',
  'investissement': 'Investissement',
  'investment': 'Investissement',
  'recrutement': 'Recrutement',
  'individual consultant': 'Recrutement',
  'evenement': 'Evenement',
  'formation': 'Evenement',
  'conference': 'Evenement',
  'actualites': 'Autre'
};

/** Minuscules, sans accents, sans ponctuation : la cle de comparaison. */
function cleType_(brut) {
  var sansAccents = String(brut).normalize('NFD').split('')
    .filter(function (ch) {
      var n = ch.charCodeAt(0);
      return n < 0x300 || n > 0x36f;
    }).join('').toLowerCase();
  var sortie = '';
  for (var i = 0; i < sansAccents.length; i++) {
    var ch = sansAccents.charAt(i);
    sortie += ((ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9')) ? ch : ' ';
  }
  return sortie.split(' ').filter(function (x) { return x; }).join(' ');
}

/**
 * Ramene un type au vocabulaire commun.
 *
 * TROIS PRECAUTIONS, apprises en production.
 *
 * Un libelle inconnu est CONSERVE tel quel plutot que range dans "Autre" :
 * une source peut employer un terme juste que nous n avons pas encore
 * rencontre, et l ecraser ferait perdre de l information.
 *
 * En revanche, ce qui ne ressemble pas a un type est ecarte. L analyseur de
 * l ABE deversait des references entieres dans la colonne - une reference
 * complete y figurait comme TYPE. Au-dela de 40 caracteres ou en presence
 * de chiffres longs, ce n est pas un type.
 *
 * Une valeur vide reste vide : on n invente pas un type par defaut.
 */
function normaliserType(brut) {
  var texte = String(brut === null || brut === undefined ? '' : brut).trim();
  if (!texte) return '';

  var connu = TYPES_CONNUS[cleType_(texte)];
  if (connu) return connu;

  if (texte.length > 40) return '';
  if (/\d{3}/.test(texte)) return '';

  return texte;
}

/**
 * Cles de deduplication, dans l'ordre de fiabilite - section 7 :
 * 1. lien officiel + titre, 2. reference officielle, 3. titre + organisation
 * + deadline. Une seule correspondance suffit a reconnaitre un doublon.
 *
 * MESURE DU 2026-09-02. Le lien seul faisait office d identite, et c etait
 * faux. Beaucoup de portails pointent chaque avis vers la meme page de
 * liste : trouverDoublon s arretant a la premiere cle qui correspond, la
 * cle URL suffisait a confondre des avis differents.
 *
 * Degats constates en production, sur des sources actives :
 *   DNCMP Benin ..... 43 avis publies, 1 seul enregistre
 *   SBEE ............  7 avis,          1 seul
 *   DEDRAS ..........  2 avis,          1 seul
 *
 * La cle URL porte donc aussi le titre. Deux avis distincts sur une meme
 * page restent distincts ; un meme avis recollecte reste reconnu. Le
 * compromis est assume : si une source reecrit le titre d un avis, il peut
 * creer une seconde ligne. Une ligne en double se voit et se supprime ;
 * quarante-deux marches jamais enregistres ne se voient pas.
 */
function clesDedup(opp) {
  var cles = [];
  // Voir la note ci-dessus : le lien seul confondait des avis distincts.
  if (!estVide(opp.url)) {
    cles.push('url:' + normalizeText(opp.url) + '|' + normalizeText(opp.title));
  }
  if (!estVide(opp.ref)) cles.push('ref:' + normalizeText(opp.ref));
  if (!estVide(opp.title)) {
    cles.push('t:' + [normalizeText(opp.title), normalizeText(opp.org),
                      jour(opp.deadline)].join('|'));
  }
  return cles;
}

/** Index de deduplication construit une seule fois par execution. */
function construireIndex(lignes) {
  var index = {};
  (lignes || []).forEach(function (ligne) {
    clesDedup(ligne).forEach(function (cle) {
      if (index[cle] === undefined) index[cle] = ligne;
    });
  });
  return index;
}

function trouverDoublon(opp, index) {
  var cles = clesDedup(opp);
  for (var i = 0; i < cles.length; i++) {
    if (index[cles[i]]) return index[cles[i]];
  }
  return null;
}

/**
 * Champs a mettre a jour sur une opportunite deja connue - section 8.
 *
 * On ne remplace jamais une valeur existante par du vide : une source qui
 * cesse temporairement de publier un champ ne doit pas effacer le classeur.
 */
function champsModifies(existant, entrant) {
  var diff = {};
  SCHEMA.UPDATABLE.forEach(function (cle) {
    var neuf = entrant[cle];
    if (estVide(neuf)) return;
    var ancien = existant[cle];
    if (cle === 'deadline' || cle === 'published') {
      if (jour(neuf) !== jour(ancien)) diff[cle] = jour(neuf);
      return;
    }
    var avant = ancien === undefined || ancien === null ? '' : String(ancien).trim();
    if (String(neuf).trim() !== avant) diff[cle] = String(neuf).trim();
  });
  return diff;
}

function estVrai(valeur) {
  if (valeur === true) return true;
  var t = String(valeur === null || valeur === undefined ? '' : valeur)
    .trim().toLowerCase();
  return t === 'true' || t === 'vrai' || t === 'oui' || t === 'yes' || t === '1';
}

/**
 * Notifications a declencher pour une ligne - sections 12 a 17.
 * Retourne { envoyer: [...], marquer: [...] }.
 *
 * Deux precisions au-dela du texte du cahier des charges, pour tenir la
 * promesse "ne pas spammer" :
 *
 * - les rappels J-7 / J-3 / J-1 ne concernent que les deadlines a venir.
 *   Sans cela une opportunite expiree depuis un mois satisferait aussi
 *   "jours restants <= 7" et recevrait quatre emails d'un coup.
 * - une opportunite ajoutee alors qu'il reste 2 jours declenche J-7, J-3 et
 *   J-1 en meme temps. On envoie alors le plus urgent seulement, et on
 *   marque les autres comme envoyes : ils n'ont plus lieu d'etre.
 */
function notificationsAEnvoyer(ligne, config) {
  var envoyer = [];
  var candidats = [];
  var jours = ligne.days;
  if (jours === '' || jours === undefined) jours = null;

  SCHEMA.NOTIFICATIONS.forEach(function (notif) {
    if (!estVrai(config[notif.config])) return;
    if (estVrai(ligne[notif.column])) return;

    if (notif.key === 'new') { envoyer.push('new'); return; }
    if (jours === null) return;
    if (notif.key === 'expired') {
      if (jours < 0) candidats.push('expired');
      return;
    }
    if (jours >= 0 && jours <= notif.threshold) candidats.push(notif.key);
  });

  // Parmi les rappels d'echeance, un seul part : le plus urgent.
  var ordre = ['expired', 'j1', 'j3', 'j7'];
  for (var i = 0; i < ordre.length; i++) {
    if (candidats.indexOf(ordre[i]) !== -1) { envoyer.push(ordre[i]); break; }
  }

  // Tous les candidats sont marques : les moins urgents sont sans objet.
  var marquer = candidats.slice();
  if (envoyer.indexOf('new') !== -1) marquer.push('new');
  return { envoyer: envoyer, marquer: marquer };
}

/** Identifiant stable TP-000001. */
function prochainId(lignes) {
  var max = 0;
  var motif = new RegExp('^' + SCHEMA.ID_PREFIX + '-(\\d+)$');
  (lignes || []).forEach(function (l) {
    var m = motif.exec(String(l.id || '').trim());
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  var n = String(max + 1);
  while (n.length < 6) n = '0' + n;
  return SCHEMA.ID_PREFIX + '-' + n;
}

/**
 * Seuil au-dela duquel une source qui ne publie plus est jugee silencieuse.
 * Un flux qui n'a rien sorti depuis six mois est presque toujours abandonne.
 */
var JOURS_SOURCE_SILENCIEUSE = 180;

/**
 * Statut de fraicheur d'une source, d'apres la date de publication la plus
 * recente de ses annonces.
 *
 * Une source techniquement joignable mais qui ne publie plus donne un faux
 * sentiment de securite : l'utilisateur croit surveiller un canal officiel
 * qui, en realite, est mort. On le signale dans le statut de la source.
 *
 * `dates` : tableau d'objets Date (ou valeurs vides). `aujourdhui` : Date.
 */
function fraicheurSource_(dates, aujourdhui) {
  // Accepte des objets Date comme des chaines "aaaa-mm-jj" : les annonces
  // normalisees stockent la date de publication en texte.
  var temps = (dates || []).map(function (d) {
    if (d instanceof Date) return d.getTime();
    var j = jour(d);
    if (!j) return null;
    var p = j.split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]).getTime();
  }).filter(function (t) { return t !== null && !isNaN(t); });

  if (!temps.length) return { silencieuse: false, jours: null };

  var plusRecente = Math.max.apply(null, temps);
  var jours = Math.floor((aujourdhui.getTime() - plusRecente) / 86400000);
  return { silencieuse: jours > JOURS_SOURCE_SILENCIEUSE, jours: jours };
}

/** Resume tronque proprement - section 28. Pas d'IA. */
function tronquer(texte, maximum) {
  var t = String(texte === null || texte === undefined ? '' : texte)
    .replace(/\s+/g, ' ').trim();
  var max = maximum || SCHEMA.SUMMARY_MAX;
  if (t.length <= max) return t;
  var coupe = t.slice(0, max);
  var espace = coupe.lastIndexOf(' ');
  if (espace > max * 0.6) coupe = coupe.slice(0, espace);
  return coupe + '...';
}

/**
 * Normalisation minimale d'une annonce - section 26.
 *
 * Les valeurs par defaut de la source comblent ce que le flux ne fournit
 * pas. Ce qui reste inconnu reste VIDE : on ne devine rien (section 27).
 */
function normalizeOpportunity(brut, source) {
  return {
    title: String(brut.title || '').trim(),
    org: String(brut.org || source.name || '').trim(),
    country: String(brut.country || source.country || '').trim(),
    // Normalise sans LLM : un client sans cle doit pouvoir filtrer.
    // Meme raison que pour le secteur : une cellule vide est ambigue.
    type: normaliserType(brut.type || source.type) || SECTEUR_INCONNU,
    // Deduit du titre quand ni la source ni le modele ne le disent :
    // 87 % des annonces n avaient aucun secteur. Sans correspondance
    // nette, la colonne reste vide - on ne devine pas.
    sector: String(brut.sector || source.sector || '').trim()
      || deduireSecteur(brut.title) || SECTEUR_INCONNU,
    source: String(source.id || '').trim(),
    url: String(brut.url || '').trim(),
    pdf: String(brut.pdf || '').trim(),
    published: jour(brut.published),
    deadline: jour(brut.deadline),
    summary: tronquer(brut.summary),
    ref: String(brut.ref || '').trim()
  };
}

// Export pour les tests Node. Apps Script n'a pas de module.
if (typeof module !== 'undefined') {
  module.exports = {
    normalizeText: normalizeText, estVide: estVide, jour: jour,
    joursRestants: joursRestants, statutDelai: statutDelai,
    couleurStatut: couleurStatut, clesDedup: clesDedup,
    construireIndex: construireIndex, trouverDoublon: trouverDoublon,
    champsModifies: champsModifies, estVrai: estVrai,
    notificationsAEnvoyer: notificationsAEnvoyer, prochainId: prochainId,
    tronquer: tronquer,
    fraicheurSource_: fraicheurSource_,
    JOURS_SOURCE_SILENCIEUSE: JOURS_SOURCE_SILENCIEUSE,
    normalizeOpportunity: normalizeOpportunity,
    normaliserType: normaliserType, TYPES_ANNONCE: TYPES_ANNONCE,
    deduireSecteur: deduireSecteur, SECTEURS_ANNONCE: SECTEURS_ANNONCE,
    SECTEUR_INCONNU: SECTEUR_INCONNU
  };
}
