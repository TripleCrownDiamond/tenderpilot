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
  'grants.gov': analyserApiGrantsGov
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

    var devise = String(a.currency || '').trim();
    // Un minimum a zero n est pas une information : l API le pose par
    // defaut sur la moitie des annonces.
    var brutMin = a.amount_min ? String(a.amount_min) : '';
    var min = Number(brutMin) > 0 ? brutMin : '';
    var max = a.amount_max ? String(a.amount_max) : '';
    var montant = (min && max) ? (min + ' - ' + max + ' ' + devise).trim()
      : max ? ('jusqu a ' + max + ' ' + devise).trim()
      : min ? ('a partir de ' + min + ' ' + devise).trim() : '';

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
    if (montant) morceaux.push('Budget : ' + montant);

    var typeBrut = String(a.funding_type || '').trim();

    sortie.push(normalizeOpportunity({
      title: titre,
      url: lien,
      summary: morceaux.join(' - ').slice(0, 500),
      published: null,
      deadline: isoDepuis_(a.deadline),
      org: String(a.sponsor_name || '').trim(),
      type: TYPE_MAP[typeBrut] || typeBrut
    }, source));
  });

  return sortie.filter(function (o) { return o.title; });
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
  resultats.forEach(function (x) {
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
      type: prem('type') === '2' ? 'Appel a projets' : ''
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

var REQUETES_JSON = {
  'ec.europa.eu': requeteEuropa_,
  'grants.gov': requeteGrantsGov_
};

/**
 * Forme de requete d une methode "JSON:<nom>", ou null pour un GET.
 *
 * Les 104 autres sources n en declarent aucune et restent en GET, sans
 * changement de comportement.
 */
function requeteJson_(methode) {
  var m = /^JSON:(.+)$/i.exec(String(methode || '').trim());
  if (!m) return null;
  var fabrique = REQUETES_JSON[m[1].trim()];
  return fabrique ? fabrique() : null;
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
    requeteJson_: requeteJson_,
    FRONTIERE_MULTIPART: FRONTIERE_MULTIPART,
    ANALYSEURS_JSON: ANALYSEURS_JSON
  };
}
