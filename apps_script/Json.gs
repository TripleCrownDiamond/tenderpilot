/**
 * TenderPilot - collecte par API JSON.
 *
 * Troisieme methode de collecte, a cote du RSS et de l'extraction HTML.
 * Elle existe parce que certaines institutions n'offrent ni flux ni page
 * lisible : leur portail est une application JavaScript vide cote serveur,
 * mais l'API qui l'alimente, elle, est publique et stable.
 *
 * C'est le cas de la Banque mondiale : la page /projects-operations/procurement
 * ne contient aucun avis dans son HTML, alors que search.worldbank.org/api/v2
 * en renvoie des centaines de milliers en JSON.
 *
 * Une API est un contrat plus solide qu'une extraction HTML : elle ne casse
 * pas quand le site change de mise en page. On la prefere donc a chaque fois
 * qu'elle existe.
 *
 * Comme Core.gs, Rss.gs et Html.gs, ce fichier ne touche a aucune API
 * Google : il est testable hors de Google.
 */

/** Repertoire des analyseurs d'API, par nom de methode. */
var ANALYSEURS_JSON = {
  'worldbank.org': analyserApiWorldBank,
  'fundpilote.com': analyserApiFundpilote,
  'ec.europa.eu': analyserApiEuropa,
  'grants.gov': analyserApiGrantsGov,
  'nigermarches.com': analyserApiNigerMarches
};

/** Retourne l'analyseur correspondant a une methode JSON:<nom>, ou null. */
function analyseurJson_(methode) {
  var m = /^JSON:(.+)$/i.exec(String(methode || '').trim());
  return m ? (ANALYSEURS_JSON[m[1].trim()] || null) : null;
}

/** "28-Aug-2026" ou "2026-09-16T00:00:00Z" -> "2026-09-16". */
function isoDepuis_(valeur) {
  if (!valeur) return null;
  var texte = String(valeur).trim();
  var deja = /^(\d{4}-\d{2}-\d{2})/.exec(texte);
  if (deja) return deja[1];
  var d = new Date(texte);
  if (isNaN(d.getTime())) return null;
  return d.getUTCFullYear() + '-'
    + ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-'
    + ('0' + d.getUTCDate()).slice(-2);
}

/**
 * Met en forme un budget annonce par la source. JAMAIS devine.
 *
 * MESURE DU 2026-09-02 : sur les seize sources structurees du registre,
 * DEUX SEULEMENT publient un montant exploitable - le portail europeen
 * (metadata.budget, 20 avis sur 100) et Fundpilote (amount_min /
 * amount_max / currency, 10 sur 20). La Banque mondiale, Grants.gov, Niger
 * Marches, la GIZ, la DNCMP, le PNUD, la SBEE, la BCEAO et l'UNICEF n'en
 * exposent aucun : leur colonne Budget reste vide, et c'est exact.
 *
 * On ne lit pas les montants ecrits en prose. Wellcome affiche "£3.5" pour
 * trois millions et demi, en toutes lettres plus loin dans la phrase : un
 * chiffre extrait la serait faux d'un facteur mille. Un budget faux vaut
 * moins que pas de budget - c'est la meme regle que pour les dates.
 *
 * Le resultat est du TEXTE, pas un nombre : les devises different d'une
 * source a l'autre, et additionner des euros avec des francs CFA dans une
 * colonne de Google Sheets ne voudrait rien dire.
 */
function formaterMontant(valeur) {
  var brut = String(valeur === null || valeur === undefined ? '' : valeur)
    .replace(/[\s,]/g, '');
  var n = Number(brut);
  if (!isFinite(n) || n <= 0) return '';
  // Espace ordinaire entre les milliers : lisible, et Google Sheets ne
  // prend pas la cellule pour un nombre a additionner. Pas d'espace fine
  // insecable - le depot est en ASCII, et ce caractere voyage mal dans un
  // email ou un export CSV.
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** "120000", "EUR" -> "120 000 EUR". Une valeur absente rend "". */
function budgetSimple(montant, devise) {
  var m = formaterMontant(montant);
  if (!m) return '';
  var d = String(devise === null || devise === undefined ? '' : devise)
    .trim().toUpperCase();
  return d ? m + ' ' + d : m;
}

/**
 * Une fourchette, telle que Fundpilote la publie.
 *
 *   min = max            "730 000 USD"
 *   min absent ou nul    "jusqu'a 42 000 EUR"
 *   les deux             "10 000 - 250 000 USD"
 */
function budgetFourchette(minimum, maximum, devise) {
  var min = formaterMontant(minimum);
  var max = formaterMontant(maximum);
  var d = String(devise === null || devise === undefined ? '' : devise)
    .trim().toUpperCase();
  var suffixe = d ? ' ' + d : '';
  if (min && max) {
    return min === max ? max + suffixe : min + ' - ' + max + suffixe;
  }
  if (max) return 'jusqu\'a ' + max + suffixe;
  if (min) return 'a partir de ' + min + suffixe;
  return '';
}

/**
 * Avis de marches des projets finances par la Banque mondiale.
 *
 * Reponse : { total, procnotices: [ { id, notice_type, noticedate,
 * submission_deadline_date, bid_description, project_name, project_id,
 * contact_organization, bid_reference_no, notice_text }, ... ] }
 *
 * Deux choix explicites :
 *
 * 1. On ecarte les "Contract Award". Ce sont des marches DEJA attribues :
 *    ils representent les trois quarts du flux Benin et n'offrent rien a
 *    soumissionner. TenderPilot sert a candidater, pas a lire un palmares.
 *
 * 2. On ignore notice_text, qui contient l'avis integral en HTML - jusqu'a
 *    65 ko pour un seul avis. Le resume est construit a partir des champs
 *    courts ; le texte complet reste a un clic, sur la page officielle.
 */
function analyserApiWorldBank(corps, source) {
  var donnees;
  try {
    donnees = JSON.parse(corps);
  } catch (e) {
    // Une reponse illisible ne doit pas interrompre les autres sources.
    return [];
  }
  var avis = donnees && donnees.procnotices;
  if (!avis || !avis.length) return [];

  var resultats = [];
  avis.forEach(function (a) {
    var type = String(a.notice_type || '').trim();
    if (/contract award/i.test(type)) return;

    var titre = reparerCaracteres(stripTags(a.bid_description || ''));
    if (!titre) return;

    var projet = reparerCaracteres(stripTags(a.project_name || ''));
    var acheteur = reparerCaracteres(stripTags(a.contact_organization || ''));
    var reference = String(a.bid_reference_no || '').trim();
    var methode = String(a.procurement_method_name || '').trim();
    var identifiant = String(a.id || '').trim();

    var morceaux = [];
    if (type) morceaux.push('Type : ' + type);
    if (projet) morceaux.push('Projet : ' + projet);
    if (a.project_id) morceaux.push('Identifiant projet : ' + a.project_id);
    if (methode) morceaux.push('Mode de passation : ' + methode);
    if (reference) morceaux.push('Reference : ' + reference);

    resultats.push(normalizeOpportunity({
      title: titre,
      url: identifiant
        ? nettoyerLien('https://projects.worldbank.org/en/projects-operations/'
            + 'procurement-detail/' + identifiant)
        : '',
      summary: morceaux.join(' - '),
      published: isoDepuis_(a.noticedate),
      deadline: isoDepuis_(a.submission_deadline_date),
      // L'acheteur reel figure dans l'avis : il vaut mieux que le nom de la
      // source, qui serait le meme pour les milliers d'avis du bailleur.
      org: acheteur,
      type: type,
      ref: reference
    }, source));
  });

  return resultats.filter(function (o) { return o.title; });
}

/**
 * Opportunites de subventions, bourses et appels a projets via l'API
 * publique de Fundpilote.
 *
 * Mesure du 2026-09-02, sans aucun identifiant :
 *   GET /api/v1/opportunities/  ->  200, count=283, 20 par page.
 *
 * ATTENTION, piege verifie ce jour-la. La reponse ANONYME ne contient PAS
 * application_url, source_url, description, eligibility, how_to_apply ni
 * editorial_note : ces champs n'existent que pour une session connectee.
 * L'analyseur d'origine construisait donc le lien avec deux chaines vides
 * et rendait des annonces SANS LIEN - un defaut muet, du meme genre que
 * l'analyseur AfDB absent cote web pendant des mois.
 *
 * Le lien est donc bati depuis l'id : /opportunities/<id> repond 200 et
 * redirige vers la page publique de l'annonce.
 *
 * Les champs descriptifs anonymes sont des codes opaques (GOU-11, ORG-ONGL,
 * PRO-01) : illisibles pour un lecteur, ils n'ont rien a faire dans un
 * resume. Seul eligible_countries, en ISO3, est exploitable - et il est
 * precieux, c'est lui qui dit si l'annonce concerne le Benin.
 */
function analyserApiFundpilote(corps, source) {
  var donnees;
  try {
    donnees = JSON.parse(corps);
  } catch (e) {
    return [];
  }
  var resultats = donnees && donnees.results;
  if (!resultats || !resultats.length) return [];

  var TYPE_MAP = {
    grant: 'Subvention',
    bourse: 'Bourse',
    aap: 'Appel a projets',
    ami: 'AMI',
    formation: 'Formation',
    fellowship: 'Bourse',
    investment: 'Investissement'
  };

  var sortie = [];
  resultats.forEach(function (a) {
    var titre = String(a.title || '').trim();
    if (!titre) return;

    // Les deux premieres n'existent que pour une session connectee ; l'id
    // est toujours la. On garde les deux au cas ou l'API changerait.
    var lien = nettoyerLien(
      String(a.application_url || '').trim()
      || String(a.source_url || '').trim()
      || (a.id ? 'https://fundpilote.com/opportunities/' + String(a.id) : ''));
    if (!lien) return;

    // Un minimum a zero n est pas une information : l API le pose par
    // defaut sur la moitie des annonces - budgetFourchette l ecarte.
    var montant = budgetFourchette(a.amount_min, a.amount_max, a.currency);

    var pays = [];
    if (Object.prototype.toString.call(a.eligible_countries) === '[object Array]') {
      pays = a.eligible_countries.map(function (c) { return String(c).trim(); })
        .filter(function (c) { return c; }).slice(0, 12);
    }

    var description = String(a.description || '').trim();
    var eligibilite = String(a.eligibility || '').trim();

    var morceaux = [];
    if (description) morceaux.push(description.slice(0, 200));
    if (eligibilite) morceaux.push('Eligibilite : ' + eligibilite.slice(0, 120));
    if (pays.length) morceaux.push('Pays eligibles : ' + pays.join(', '));

    var typeBrut = String(a.funding_type || '').trim();

    sortie.push(normalizeOpportunity({
      title: titre,
      url: lien,
      summary: morceaux.join(' - ').slice(0, 500),
      published: null,
      deadline: isoDepuis_(a.deadline),
      org: String(a.sponsor_name || '').trim(),
      type: TYPE_MAP[typeBrut] || typeBrut,
      budget: montant
    }, source));
  });

  return sortie.filter(function (o) { return o.title; });
}


/**
 * UN APPEL, UNE LIGNE - meme quand le portail le rend quatre fois.
 *
 * MESURE DU 2026-09-02 : les 100 resultats de la page ne portent que 50
 * identifiants. Le portail rend chaque appel dans TOUTES ses langues, et
 * parfois deux fois par langue. Sans ce regroupement, la moitie du tableau
 * europeen etait le meme appel en anglais puis en francais - deux titres
 * differents, donc deux lignes que la deduplication generale ne pouvait pas
 * reunir.
 *
 * On garde le FRANCAIS quand il existe, l'autre langue sinon : le produit
 * est en francais, et un titre traduit se lit mieux qu'un titre anglais.
 * Jamais de perte : un appel sans version francaise reste, dans sa langue.
 */
function groupesParLangue_(resultats) {
  var parIdentifiant = {};
  var sortie = [];

  resultats.forEach(function (brut) {
    var m = (brut && brut.metadata) || {};
    function prem(cle) {
      var v = m[cle];
      if (Object.prototype.toString.call(v) === '[object Array]') {
        return String(v[0] === undefined || v[0] === null ? '' : v[0]).trim();
      }
      return String(v === undefined || v === null ? '' : v).trim();
    }
    var identifiant = prem('identifier');
    // Sans identifiant, on ne peut rien regrouper : l appel passe tel quel.
    if (!identifiant) { sortie.push(brut); return; }

    var dejaVu = parIdentifiant[identifiant];
    if (dejaVu === undefined) {
      parIdentifiant[identifiant] = brut;
      sortie.push(brut);
      return;
    }
    // Le francais remplace ce qui est deja la ; le reste est ignore.
    if (prem('language').toLowerCase() === 'fr') {
      sortie[sortie.indexOf(dejaVu)] = brut;
      parIdentifiant[identifiant] = brut;
    }
  });
  return sortie;
}

/**
 * Appels et marches du portail europeen Funding & Tenders.
 *
 * Jumeau de analyserEuropa() dans web/src/lib/domain/json.ts.
 *
 * MESURE DU 2026-09-02, sans authentification. L API n applique ses filtres
 * qu a UNE condition : un POST multipart dont CHAQUE PARTIE declare son type
 * de contenu. Les autres formes rendent 200 mais IGNORENT le filtre -
 * 4 175 120 resultats au lieu de 1 421 - et le GET rend 405.
 *
 * type=1 Horizon Europe, type=2 EuropeAid (la cooperation au developpement,
 * ou le Benin est pleinement eligible), type=8 EIT et programmes
 * thematiques. type=0 est ecarte : marches internes des institutions.
 */
function analyserApiEuropa(corps, source) {
  var donnees;
  try {
    donnees = JSON.parse(corps);
  } catch (e) {
    return [];
  }
  var resultats = donnees && donnees.results;
  if (!resultats || !resultats.length) return [];

  var sortie = [];
  groupesParLangue_(resultats).forEach(function (x) {
    var m = (x && x.metadata) || {};
    function prem(cle) {
      var v = m[cle];
      if (Object.prototype.toString.call(v) === '[object Array]') {
        return String(v[0] === undefined || v[0] === null ? '' : v[0]).trim();
      }
      return String(v === undefined || v === null ? '' : v).trim();
    }

    var titre = stripTags(reparerCaracteres(prem('title')));
    if (!titre) return;

    var identifiant = prem('identifier');
    var brutUrl = Object.prototype.toString.call(x.url) === '[object Array]'
      ? String(x.url[0] || '') : String(x.url || '');
    var lien = nettoyerLien(brutUrl || (identifiant
      ? 'https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen'
        + '/opportunities/topic-details/' + encodeURIComponent(identifiant)
      : ''));
    if (!lien) return;

    var programme = prem('frameworkProgramme') || prem('programmePeriod');
    var morceaux = [];
    if (identifiant) morceaux.push('Reference : ' + identifiant);
    if (programme) morceaux.push('Programme : ' + programme);
    var description = stripTags(reparerCaracteres(prem('description')));
    if (description) morceaux.push(description);

    sortie.push(normalizeOpportunity({
      title: titre,
      url: lien,
      summary: morceaux.join(' - ').slice(0, 500),
      published: isoDepuis_(prem('startDate')),
      deadline: isoDepuis_(prem('deadlineDate') || prem('closingDate')),
      org: 'Commission europeenne',
      type: prem('type') === '2' ? 'Appel a projets' : '',
      // Un nombre nu, en euros : 20 avis sur 100 en portent un.
      budget: budgetSimple(prem('budget'), 'EUR')
    }, source));
  });

  return sortie.filter(function (o) { return o.title; });
}

/**
 * Subventions federales americaines, via l API publique de Grants.gov.
 *
 * Jumeau de analyserGrantsGov() dans web/src/lib/domain/json.ts.
 *
 * Mesure du 2026-09-02 : POST JSON simple, 1034 subventions ouvertes dont 31
 * mentionnant l Afrique.
 *
 * A DIRE AU CLIENT : la plupart des subventions federales exigent un
 * enregistrement SAM.gov d entite americaine. Certaines - Departement d Etat,
 * USAID - acceptent les organisations etrangeres, mais l eligibilite se
 * verifie AVIS PAR AVIS. Ce n est pas un guichet ouvert.
 *
 * Les dates arrivent en MM/JJ/AAAA, pas en ISO.
 */
function analyserApiGrantsGov(corps, source) {
  var donnees;
  try {
    donnees = JSON.parse(corps);
  } catch (e) {
    return [];
  }
  var avis = donnees && donnees.data && donnees.data.oppHits;
  if (!avis || !avis.length) return [];

  function depuisUs(v) {
    var t = String(v === undefined || v === null ? '' : v).trim();
    var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t);
    return m ? m[3] + '-' + m[1] + '-' + m[2] : isoDepuis_(t);
  }

  var sortie = [];
  avis.forEach(function (o) {
    var titre = stripTags(reparerCaracteres(String(o.title || '').trim()));
    var numero = String(o.number || '').trim();
    if (!titre || !numero) return;

    var morceaux = ['Reference : ' + numero];
    if (o.agencyCode) morceaux.push('Agence : ' + String(o.agencyCode));
    morceaux.push('Eligibilite a verifier sur l avis officiel');

    sortie.push(normalizeOpportunity({
      title: titre,
      url: nettoyerLien('https://www.grants.gov/search-results-detail/'
        + encodeURIComponent(String(o.id || ''))),
      summary: morceaux.join(' - ').slice(0, 500),
      published: depuisUs(o.openDate),
      deadline: depuisUs(o.closeDate),
      org: String(o.agencyCode || '').trim() || 'Gouvernement des Etats-Unis',
      type: 'Subvention'
    }, source));
  });

  return sortie.filter(function (o) { return o.title; });
}


/**
 * Appels d'offres du Niger, via l'API WordPress de Niger Marches.
 *
 * Jumeau de analyserNigerMarches() dans web/src/lib/domain/json.ts.
 *
 * Le site publie ses avis dans un type de contenu "appel_d_offre" expose
 * par l'API standard de WordPress, sans authentification :
 *
 *   /wp-json/wp/v2/appel_d_offre?per_page=100&page=N&_fields=id,link,title,date,acf
 *
 * Mesure du 2026-09-02 : 668 avis, 20 sur 20 avec une date d'expiration.
 * Les champs ACF portent ce qui compte - date_expiration, et
 * nom_de_la_societe qui donne l'acheteur reel ("Medecins Sans Frontieres au
 * Niger", "Projet d'Acceleration de l'Acces a l'Electricite").
 *
 * ON PASSE PAR L'API PLUTOT QUE PAR LA PAGE, et ce n'est pas un detail : la
 * page est construite par Elementor, ses classes changent a chaque
 * changement de theme. L'API, elle, est un contrat de WordPress.
 *
 * _fields n'est pas une coquetterie : sans lui chaque avis traine son HTML
 * complet et ses metadonnees SEO, soit vingt fois le volume utile.
 */
function typeNigerMarches_(titre) {
  if (/manifestation\s+d.?inter[eê]t|\bami\b/i.test(titre)) return 'AMI';
  if (/demande\s+de\s+(cotation|prix)|cotation/i.test(titre)) {
    return 'Demande de cotation';
  }
  if (/recrutement|consultant/i.test(titre)) return 'Recrutement';
  return '';
}

function analyserApiNigerMarches(corps, source) {
  var donnees;
  try {
    donnees = JSON.parse(corps);
  } catch (e) {
    return [];
  }
  if (!donnees || !donnees.length) return [];

  var sortie = [];
  donnees.forEach(function (avis) {
    var titre = stripTags(reparerCaracteres(
      String((avis.title && avis.title.rendered) || '')));
    if (!titre) return;

    var acf = avis.acf || {};
    var acheteur = stripTags(reparerCaracteres(
      String(acf.nom_de_la_societe || '')));

    sortie.push(normalizeOpportunity({
      title: titre,
      url: nettoyerLien(String(avis.link || '')),
      summary: acheteur ? 'Acheteur : ' + acheteur : '',
      published: isoDepuis_(avis.date),
      // "2026-10-05 09:00:00" : isoDepuis_ garde la partie date telle
      // quelle, sans passer par new Date() - donc sans decalage de fuseau.
      deadline: isoDepuis_(acf.date_expiration),
      org: acheteur,
      type: typeNigerMarches_(titre)
    }, source));
  });

  return sortie.filter(function (o) { return o.title; });
}

// ------------------------------------------------------ FORMES DE REQUETE

/** Frontiere fixe : rien dans les donnees envoyees ne peut la contenir. */
var FRONTIERE_MULTIPART = '----TenderPilotFrontiere';

/**
 * Corps multipart, construit a la main.
 *
 * C EST LA LIGNE QUI DEBLOQUE LE PORTAIL EUROPEEN. Son API n applique ses
 * filtres que si CHAQUE PARTIE declare son type de contenu. UrlFetchApp ne
 * sait pas typer les parties quand on lui passe un objet en payload : on
 * ecrit donc le corps nous-memes, ce qui a l avantage de tourner a
 * l identique dans les deux moteurs.
 */
function corpsMultipart_(champs, frontiere) {
  var corps = '';
  champs.forEach(function (paire) {
    corps += '--' + frontiere + '\r\n'
      + 'Content-Disposition: form-data; name="' + paire[0] + '"\r\n'
      + 'Content-Type: application/json\r\n\r\n'
      + paire[1] + '\r\n';
  });
  return corps + '--' + frontiere + '--\r\n';
}

/**
 * Requete du portail europeen.
 *
 * Tri DECROISSANT, et ce n est pas un caprice : un appel en deux etapes
 * porte plusieurs echeances, et le tri croissant retient la plus ancienne,
 * souvent passee. Mesure du 2026-09-02 : croissant rend 0 echeance a venir
 * sur 100, decroissant en rend 92.
 */
function requeteEuropa_() {
  var filtre = { bool: { must: [
    { terms: { type: ['1', '2', '8'] } },
    { terms: { status: ['31094501', '31094502'] } },
    { range: { deadlineDate: { gte: 'now' } } }
  ] } };
  return {
    methode: 'post',
    contentType: 'multipart/form-data; boundary=' + FRONTIERE_MULTIPART,
    corps: corpsMultipart_([
      ['query', JSON.stringify(filtre)],
      ['languages', JSON.stringify(['en', 'fr'])],
      ['sort', JSON.stringify({ field: 'deadlineDate', order: 'DESC' })]
    ], FRONTIERE_MULTIPART)
  };
}

/** Requete de Grants.gov : un corps JSON ordinaire. */
function requeteGrantsGov_() {
  return {
    methode: 'post',
    contentType: 'application/json',
    corps: JSON.stringify({ rows: 100, keyword: '', oppStatuses: 'posted' })
  };
}

/**
 * Requete d UNGM, le marche public des agences des Nations unies.
 *
 * Jumeau de requeteUngm() dans web/src/lib/domain/json.ts.
 *
 * DEUX PARTICULARITES QUI EXPLIQUENT SA PLACE ICI.
 *
 * 1. Elle sert du HTML, pas du JSON. La liste arrive d un POST sur
 *    /Public/Notice/Search, qui repond par des rangees HTML. C est donc une
 *    methode "HTML:ungm.org" avec une forme de requete - le premier cas, et
 *    la raison pour laquelle formeRequete_ ne regarde plus le seul prefixe
 *    JSON.
 *
 * 2. Elle pagine par le CORPS. PageIndex commence a 0 quand le moteur
 *    compte a partir de 1 : d ou le page - 1. PageSize est plafonne A 15
 *    PAR LE SERVEUR - mesure du 2026-09-04, une demande de 100 rend 15.
 *
 * Les quinze pays sont ceux de la CEDEAO, par leur identifiant UNGM. Sans
 * ce filtre la recherche rend le monde entier.
 */
var PAYS_CEDEAO_UNGM = [
  '2314', // Benin
  '2324', // Burkina Faso
  '2329', // Cap-Vert
  '2341', // Cote d Ivoire
  '2367', // Gambie
  '2370', // Ghana
  '2378', // Guinee
  '2379', // Guinee-Bissau
  '2407', // Liberia
  '2418', // Mali
  '2442', // Niger
  '2443', // Nigeria
  '2472', // Senegal
  '2475', // Sierra Leone
  '2494'  // Togo
];

function requeteUngm_(page) {
  return {
    methode: 'post',
    contentType: 'application/json',
    paginee: true,
    corps: JSON.stringify({
      PageIndex: Math.max(0, (Number(page) || 1) - 1),
      PageSize: 15,
      Title: '',
      Description: '',
      Published: '',
      Deadline: '',
      NoticeTypes: [],
      UNSPSCs: [],
      Countries: PAYS_CEDEAO_UNGM,
      Agencies: [],
      // Les plus recemment publies d abord : ce sont ceux dont l echeance
      // a le plus de chances d etre encore ouverte.
      SortField: 'DatePublished',
      SortAscending: false
    })
  };
}

/** Formes de requete, par hote. Les autres sources restent en GET. */
var REQUETES_SOURCES = {
  'ec.europa.eu': requeteEuropa_,
  'grants.gov': requeteGrantsGov_,
  'ungm.org': requeteUngm_
};

/**
 * Forme de requete d une methode "JSON:<nom>" ou "HTML:<nom>", ou null.
 *
 * Le prefixe dit comment LIRE la reponse, pas comment la DEMANDER : UNGM
 * repond en HTML a un POST. Les deux prefixes sont donc acceptes ici. Les
 * autres sources n en declarent aucune et restent en GET, sans changement
 * de comportement.
 */
function formeRequete_(methode, page) {
  var m = /^(?:JSON|HTML):(.+)$/i.exec(String(methode || '').trim());
  if (!m) return null;
  var fabrique = REQUETES_SOURCES[m[1].trim()];
  return fabrique ? fabrique(page || 1) : null;
}

if (typeof module !== 'undefined') {
  module.exports = {
    analyseurJson_: analyseurJson_,
    isoDepuis_: isoDepuis_,
    analyserApiWorldBank: analyserApiWorldBank,
    analyserApiFundpilote: analyserApiFundpilote,
    analyserApiEuropa: analyserApiEuropa,
    analyserApiGrantsGov: analyserApiGrantsGov,
    corpsMultipart_: corpsMultipart_,
    formeRequete_: formeRequete_,
    FRONTIERE_MULTIPART: FRONTIERE_MULTIPART,
    REQUETES_SOURCES: REQUETES_SOURCES,
    ANALYSEURS_JSON: ANALYSEURS_JSON
  };
}
