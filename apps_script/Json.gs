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
  'worldbank.org': analyserApiWorldBank
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

if (typeof module !== 'undefined') {
  module.exports = {
    analyseurJson_: analyseurJson_,
    isoDepuis_: isoDepuis_,
    analyserApiWorldBank: analyserApiWorldBank,
    ANALYSEURS_JSON: ANALYSEURS_JSON
  };
}
