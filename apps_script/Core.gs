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
  // "building" seul a ete RETIRE le 2026-09-02 : en anglais du
  // developpement, "capacity building" est partout, et il rangeait
  // "TRAINING MODULE & CAPACITY BUILDING ON HUMAN RIGHTS" dans le BTP.
  // Les vrais travaux restent couverts par construction, civil works,
  // batiment et genie civil.
  ["Infrastructures et BTP", ["construction", "travaux de rehabilitation",
    "batiment", "building works", "building construction", "genie civil",
    "civil works", "voirie", "amenagement", "refection", "pistes rurales",
    "pont", "bridge"]],
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
  // UNGM abrege : "Request for EOI".
  'request for eoi': 'AMI',
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
 * Notifications a declencher pour une ligne, SUR UN CANAL donne.
 * Retourne { envoyer: [...], marquer: [...] }.
 *
 * Le canal compte : l email et Telegram ont chacun leur plafond, donc
 * chacun sa memoire. Voir canauxNotifies_ juste au-dessus.
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
/**
 * Cette ligne est-elle suivie par le client ?
 *
 * La colonne Suivi est la SEULE que le client remplit. Elle vit ici, dans
 * la logique pure, parce que deux mecanismes s'en servent : l'agenda, qui
 * ne pose que les echeances suivies, et les rappels, quand le client a
 * demande qu'ils s'y limitent.
 */
function estSuivie_(ligne) {
  return estVrai(ligne.suivi);
}

var CANAUX = ['email', 'telegram', 'ntfy'];

/**
 * LA MEMOIRE D UNE ALERTE EST PAR CANAL, PAS PAR LIGNE.
 *
 * Une case Notif_* portait un booleen : "cette alerte est partie". Cela
 * suffisait tant que les deux canaux partaient ensemble. Des l instant ou
 * l email et Telegram ont leur propre plafond, ils n avancent plus au meme
 * rythme : Telegram peut avoir servi une ligne que l email doit encore
 * envoyer au passage suivant. Un seul booleen ne sait pas dire cela - il
 * ferait soit un doublon sur Telegram, soit un email perdu.
 *
 * La case porte donc la LISTE DES CANAUX deja servis : '', 'email',
 * 'telegram' ou 'email,telegram'.
 *
 * RETROCOMPATIBILITE. Une case ecrite par une version precedente vaut
 * TRUE : elle est lue comme "tous canaux servis". C est le seul choix sur
 * pour un classeur deja en service - l inverse renverrait a l utilisateur
 * des alertes qu il a deja recues.
 */
function canauxNotifies_(valeur) {
  if (estVrai(valeur)) return CANAUX.slice();
  return String(valeur === null || valeur === undefined ? '' : valeur)
    .toLowerCase().split(',')
    .map(function (c) { return c.trim(); })
    .filter(function (c) { return CANAUX.indexOf(c) !== -1; });
}

/** Cette alerte est-elle deja partie SUR CE CANAL ? */
function dejaNotifie_(valeur, canal) {
  return canauxNotifies_(valeur).indexOf(canal) !== -1;
}

/** Ajoute un canal a une case, sans perdre ceux qui y sont deja. */
function ajouterCanal_(valeur, canal) {
  var canaux = canauxNotifies_(valeur);
  if (canaux.indexOf(canal) === -1) canaux.push(canal);
  // Toujours dans l ordre de CANAUX : deux passages doivent produire la
  // meme chaine, sinon la cellule change sans que rien n ait change.
  return CANAUX.filter(function (c) { return canaux.indexOf(c) !== -1; })
    .join(',');
}

function notificationsAEnvoyer(ligne, config, canal) {
  var voie = canal || 'email';
  var envoyer = [];
  var candidats = [];
  var jours = ligne.days;
  if (jours === '' || jours === undefined) jours = null;

  // LES RAPPELS PEUVENT ETRE RESERVES AUX OFFRES SUIVIES, PAS L'ANNONCE
  // D'UNE NOUVEAUTE. Une opportunite qui vient d'entrer ne peut pas encore
  // etre suivie - le client ne l'a pas vue. La restreindre reviendrait a ne
  // plus rien annoncer, et le produit ne servirait plus a rien.
  var rappelsReserves = estVrai(config.RAPPELS_SUIVIS_SEULEMENT)
    && !estSuivie_(ligne);

  SCHEMA.NOTIFICATIONS.forEach(function (notif) {
    if (!estVrai(config[notif.config])) return;
    if (dejaNotifie_(ligne[notif.column], voie)) return;
    // NI ENVOYE, NI MARQUE : le client peut cocher Suivi demain, et le
    // rappel doit alors partir. Marquer ici le lui interdirait - meme
    // raison que pour NOTIFIER_PERTINENCE.
    if (notif.key !== 'new' && rappelsReserves) return;

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

/**
 * Une source dont une annonce est encore ouverte n'est pas abandonnee.
 *
 * MESURE DU 2026-09-02 sur Grants.gov : le portail federal americain
 * publiait 1034 subventions ouvertes, et etait pourtant signale comme
 * "rien de neuf depuis 442 jours : source peut-etre abandonnee". La
 * date de publication qu'il expose est celle de l'OUVERTURE du programme -
 * des programmes ouverts en 2024 recoivent des dossiers jusqu'en 2028.
 *
 * La fraicheur des publications ne suffit donc pas a juger une source. Une
 * echeance a venir, elle, prouve qu'il y a quelque chose a deposer : c'est
 * la seule chose que l'utilisateur ait besoin de savoir, et elle prime.
 */
function aUneEcheanceOuverte_(annonces, jourCourant) {
  return (annonces || []).some(function (a) {
    var reste = joursRestants(a.deadline, jourCourant);
    return reste !== null && reste >= 0;
  });
}

/**
 * Une cellule de la colonne Source_ID est-elle un identifiant de source ?
 *
 * L'onglet SOURCES se termine par une note d'aide en clair. Tant qu'elle a
 * occupe la colonne A, le script la lisait comme une source de plus :
 * chaque execution du 2026-09-02 journalisait "Methode : RSS ou JSON:<site>
 * ... Source desactivee." La note est desormais en colonne B, mais les
 * classeurs deja installes gardent la leur en colonne A - d'ou ce filtre,
 * qui les repare sans qu'on ait a y toucher.
 *
 * Un identifiant est un code : sans espace, court. Aucune phrase n'en est
 * un, et aucun des identifiants livres n'en contient.
 */
function estIdSource(valeur) {
  var t = String(valeur === null || valeur === undefined ? '' : valeur).trim();
  return t.length > 0 && t.length <= 40 && !/\s/.test(t);
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
    // Ce que la source ANNONCE, ou rien : on ne devine jamais un montant.
    budget: String(brut.budget || '').trim(),
    url: String(brut.url || '').trim(),
    pdf: String(brut.pdf || '').trim(),
    published: jour(brut.published),
    deadline: jour(brut.deadline),
    summary: tronquer(brut.summary),
    ref: String(brut.ref || '').trim()
  };
}

// Export pour les tests Node. Apps Script n'a pas de module.
// ---------------------------------------------------------- PERTINENCE

/**
 * Une liste "Benin, Togo, Niger" en tableau de mots comparables.
 * Une case vide rend un tableau vide : le client n'a rien dit.
 */
function listeConfig_(valeur) {
  return String(valeur === null || valeur === undefined ? '' : valeur)
    .split(/[;,]/)
    .map(function (m) { return normalizeText(m); })
    .filter(function (m) { return m.length > 0; });
}

/** Un des elements de la liste apparait-il dans le texte ? */
function correspond_(texte, liste) {
  var t = normalizeText(texte);
  if (!t) return false;
  for (var i = 0; i < liste.length; i++) {
    if (t.indexOf(liste[i]) !== -1 || liste[i].indexOf(t) !== -1) return true;
  }
  return false;
}

/**
 * Ce que l'annonce vaut POUR CE CLIENT-LA - deux axes, deux points chacun.
 *
 * PAYS. Deux points si l'annonce est dans un pays suivi. UN point si elle
 * n'exclut personne - "International", "Afrique (multi-pays)", pays vide :
 * une structure beninoise peut candidater a un appel mondial, et le lui
 * cacher couterait un marche. Zero point pour un pays qui n'est pas le sien.
 *
 * SECTEUR. Deux points si le secteur est suivi, mais AUSSI deux points si le
 * client n'a declare aucun secteur : ne rien dire n'est pas se restreindre.
 * Un point quand le secteur est inconnu - on ne sait pas, on ne tranche pas.
 * Zero point pour un secteur qui n'est pas le sien.
 *
 * Le total, de 0 a 4, donne le libelle. Aucune cle, aucun reseau : c'est la
 * meme exigence que pour les types et les secteurs, un client sans
 * classement intelligent doit pouvoir trier.
 */
function pertinence(annonce, config) {
  var paysSuivis = listeConfig_((config || {}).PAYS_SUIVIS);
  var secteursSuivis = listeConfig_((config || {}).SECTEURS_SUIVIS);

  var pays = String((annonce || {}).country || '');
  var points = 0;
  if (paysSuivis.length && correspond_(pays, paysSuivis)) {
    points += 2;
  } else if (!paysSuivis.length || estVide(pays)
             || correspond_(pays, SCHEMA.PAYS_OUVERTS)) {
    points += 1;
  }

  var secteur = String((annonce || {}).sector || '');
  if (!secteursSuivis.length || correspond_(secteur, secteursSuivis)) {
    points += 2;
  } else if (estVide(secteur) || secteur === SECTEUR_INCONNU) {
    points += 1;
  }

  var seuils = SCHEMA.PERTINENCE_SEUILS;
  for (var i = 0; i < seuils.length; i++) {
    if (points >= seuils[i][1]) return seuils[i][0];
  }
  return SCHEMA.PERTINENCE_HORS_PROFIL;
}

/**
 * Trie du plus pertinent au moins pertinent, puis du plus urgent au moins
 * urgent. Sert aux emails et au recapitulatif : ce qui vous concerne se lit
 * en premier, sans avoir a faire defiler.
 *
 * Ne modifie pas le tableau recu.
 */
function parPertinence_(lignes) {
  return (lignes || []).slice().sort(function (a, b) {
    var pa = String(a.pertinence || '');
    var pb = String(b.pertinence || '');
    if (pa !== pb) return pa < pb ? 1 : -1;
    var ja = a.days === null || a.days === undefined || a.days === '' ? 9999 : a.days;
    var jb = b.days === null || b.days === undefined || b.days === '' ? 9999 : b.days;
    return ja - jb;
  });
}

/**
 * L'ordre du tableau : le plus de temps devant en haut.
 *
 * Trois rangs, dans cet ordre :
 *
 *   1. les opportunites ENCORE OUVERTES, de la plus lointaine a la plus
 *      proche - on voit d'abord celles qu'on a le temps de preparer ;
 *   2. les EXPIREES, jours restants negatifs, du plus recemment echu ;
 *   3. les SANS ECHEANCE, tout en bas. Elles ne sont pas moins bonnes -
 *      la DNCMP n'en publie aucune - mais elles ne se rangent nulle part
 *      sur un axe de temps, et les laisser au milieu casserait la lecture.
 *
 * A egalite de delai, le plus pertinent passe devant : c'est la seule
 * information qui departage deux echeances identiques.
 *
 * Ne modifie pas le tableau recu. Jumeau de parDelai() dans regles.ts.
 */
function parDelai_(lignes) {
  function jours(l) {
    var j = l.days;
    if (j === null || j === undefined || j === '') return null;
    var n = Number(j);
    return isFinite(n) ? n : null;
  }
  return (lignes || []).slice().sort(function (a, b) {
    var ja = jours(a);
    var jb = jours(b);
    // Sans echeance : toujours en bas, quel que soit le reste.
    if (ja === null && jb === null) return 0;
    if (ja === null) return 1;
    if (jb === null) return -1;
    if (ja !== jb) return jb - ja;
    var pa = String(a.pertinence || '');
    var pb = String(b.pertinence || '');
    if (pa !== pb) return pa < pb ? 1 : -1;
    return String(a.id || '').localeCompare(String(b.id || ''));
  });
}

// ------------------------------------------------- INVENTAIRE DU PROFIL

/**
 * Ce qui a REELLEMENT ete collecte : pays et secteurs, avec leur compte.
 *
 * A QUOI CA SERT. PAYS_SUIVIS et SECTEURS_SUIVIS se remplissent a la main.
 * Une valeur inventee - un pays qu'aucune source ne publie, un secteur
 * ecrit autrement que dans le tableau - ne correspond a rien, ne remonte
 * rien, et NE SE VOIT PAS : la colonne Pertinence baisse sans que personne
 * comprenne pourquoi. Le client lit donc ici ce qui existe vraiment, et
 * recopie.
 *
 * La colonne Suivi dit ce que la configuration retient AUJOURD'HUI : on
 * voit d'un coup d'oeil ce qu'on a coche et ce qu'on a laisse de cote.
 *
 * Trie par nombre d'annonces decroissant, puis par ordre alphabetique : ce
 * qui pese le plus se lit en premier, et deux valeurs a egalite ne dansent
 * pas d'un passage a l'autre.
 *
 * Jumeau de inventaireProfil() dans web/src/lib/domain/regles.ts.
 */
function inventaireProfil(lignes, config) {
  var paysSuivis = listeConfig_((config || {}).PAYS_SUIVIS);
  var secteursSuivis = listeConfig_((config || {}).SECTEURS_SUIVIS);

  function compter(champ) {
    var comptes = {};
    (lignes || []).forEach(function (l) {
      var valeur = String(l[champ] === null || l[champ] === undefined
                          ? '' : l[champ]).trim();
      if (!valeur) return;
      comptes[valeur] = (comptes[valeur] || 0) + 1;
    });
    return comptes;
  }

  function rangs(comptes, type, suivis) {
    return Object.keys(comptes).sort(function (a, b) {
      if (comptes[b] !== comptes[a]) return comptes[b] - comptes[a];
      return a.localeCompare(b);
    }).map(function (valeur) {
      // Aucune liste declaree = rien n'est ecarte : tout est suivi.
      var suivi = !suivis.length || correspond_(valeur, suivis);
      return [type, valeur, comptes[valeur], suivi ? 'OUI' : 'NON'];
    });
  }

  return rangs(compter('country'), SCHEMA.PROFIL_TYPE_PAYS, paysSuivis)
    .concat(rangs(compter('sector'), SCHEMA.PROFIL_TYPE_SECTEUR,
                  secteursSuivis));
}

/**
 * Ce niveau de pertinence doit-il declencher une notification ?
 *
 * NOTIFIER_PERTINENCE vide = tout est notifie. C'est le defaut, et c'est le
 * bon : un client qui n'a rien regle ne doit rien rater.
 *
 * La comparaison est TOLERANTE parce que le libelle est long et se recopie
 * a la main : "3 - PRIORITAIRE", "PRIORITAIRE" et "3" designent le meme
 * niveau. Un reglage qui ne marche que si l'on a recopie le tiret et les
 * espaces au bon endroit est un reglage qui ne marche pas.
 *
 * Une annonce sans pertinence calculee passe : le doute profite a
 * l'annonce, comme partout ailleurs.
 */
function pertinenceNotifiable(pertinence, config) {
  var voulus = listeConfig_((config || {}).NOTIFIER_PERTINENCE);
  if (!voulus.length) return true;

  var brut = String(pertinence === null || pertinence === undefined
                    ? '' : pertinence).trim();
  if (!brut) return true;

  var normalise = normalizeText(brut);
  var rang = (/^(\d)/.exec(brut) || [])[1];
  for (var i = 0; i < voulus.length; i++) {
    var voulu = voulus[i];
    if (!voulu) continue;
    if (normalise.indexOf(voulu) !== -1 || voulu.indexOf(normalise) !== -1) {
      return true;
    }
    if (rang && voulu === rang) return true;
  }
  return false;
}

if (typeof module !== 'undefined') {
  module.exports = {
    normalizeText: normalizeText, estVide: estVide, jour: jour,
    joursRestants: joursRestants, statutDelai: statutDelai,
    couleurStatut: couleurStatut, clesDedup: clesDedup,
    construireIndex: construireIndex, trouverDoublon: trouverDoublon,
    champsModifies: champsModifies, estVrai: estVrai,
    notificationsAEnvoyer: notificationsAEnvoyer, prochainId: prochainId,
    canauxNotifies_: canauxNotifies_, dejaNotifie_: dejaNotifie_,
    estSuivie_: estSuivie_,
    ajouterCanal_: ajouterCanal_, CANAUX: CANAUX,
    tronquer: tronquer,
    fraicheurSource_: fraicheurSource_,
    JOURS_SOURCE_SILENCIEUSE: JOURS_SOURCE_SILENCIEUSE,
    normalizeOpportunity: normalizeOpportunity,
    normaliserType: normaliserType, TYPES_ANNONCE: TYPES_ANNONCE,
    deduireSecteur: deduireSecteur, SECTEURS_ANNONCE: SECTEURS_ANNONCE,
    SECTEUR_INCONNU: SECTEUR_INCONNU,
    pertinence: pertinence, parPertinence_: parPertinence_,
    parDelai_: parDelai_,
    inventaireProfil: inventaireProfil,
    pertinenceNotifiable: pertinenceNotifiable,
    aUneEcheanceOuverte_: aUneEcheanceOuverte_,
    estIdSource: estIdSource
  };
}
