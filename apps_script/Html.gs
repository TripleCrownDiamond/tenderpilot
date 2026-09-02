/**
 * TenderPilot - collecte HTML.
 *
 * Certaines sources n'ont pas de flux RSS mais affichent leurs annonces
 * directement dans la page (contenu servi par le serveur, pas par du
 * JavaScript). On les lit par extraction de motif.
 *
 * Contrairement au RSS, ce type de collecte est FRAGILE : le jour ou le
 * site refait sa mise en page, l'extraction ne trouve plus rien. Chaque
 * site a donc son propre analyseur, nomme dans la colonne Methode de la
 * source (par exemple HTML:gouv.bj). On n'ecrit un analyseur que pour un
 * site qui en vaut la peine, jamais un extracteur generique.
 *
 * Comme Core.gs et Rss.gs, ce fichier ne touche a aucune API Google : il
 * est testable hors de Google.
 */

/** Repertoire des analyseurs disponibles, par nom de methode. */
var ANALYSEURS_HTML = {
  'gouv.bj': analyserPageGouvBj,
  'afdb.org': analyserPageAfdb,
  'enabel.be': analyserPageEnabel,
  'armp.bj': analyserPageArmp,
  'sbee.bj': analyserPageSbee,
  'soneb.bj': analyserPageSoneb,
  'araa.org': analyserPageAraa,
  'bceao.int': analyserPageBceao,
  'abe.bj': analyserPageAbe,
  'dedras.org': analyserPageDedras,
  'afd.fr': analyserPageAfd,
  'wellcome.org': analyserPageWellcome,
  'grandchallenges.org': analyserPageGrandChallenges,
  'unicef.org/supply': analyserPageUnicefSupply
};

/** Retourne l'analyseur correspondant a une methode HTML:<nom>, ou null. */
function analyseurHtml_(methode) {
  var m = /^HTML:(.+)$/i.exec(String(methode || '').trim());
  return m ? (ANALYSEURS_HTML[m[1].trim()] || null) : null;
}

/** Nettoie un fragment HTML en texte lisible. */
function nettoyerHtml(fragment) {
  if (!fragment) return '';
  return reparerCaracteres(decodeEntities(String(fragment).replace(/<[^>]*>/g, ' ')))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Analyseur du portail national beninois gouv.bj.
 *
 * Chaque annonce est un bloc <article> contenant son type, son objet, sa
 * date de cloture ("Cloture : 14 Jul 2026") et un lien vers /opportunite/.
 */
function analyserPageGouvBj(html, source) {
  if (!html) return [];
  var blocs = String(html).match(/<article\b[\s\S]*?<\/article>/gi) || [];
  var resultats = [];

  blocs.forEach(function (bloc) {
    var lienMatch = /href="(https:\/\/www\.gouv\.bj\/opportunite\/[^"]+)"/i.exec(bloc);
    if (!lienMatch) return;

    var texte = nettoyerHtml(bloc);

    // Le titre est tout ce qui precede la mention de cloture ou "En savoir".
    var titre = texte.split(/Cl[oô]ture|En savoir/i)[0].trim();
    // Chaque bloc commence par la rubrique et le type ("Marches publics
    // Manifestion d'interet ...") : on retire ce prefixe commun pour ne
    // garder que l'objet reel de l'annonce.
    titre = titre.replace(
      /^March[eé]s publics\s+/i, '')
      .replace(/^(Manifest[a-z]*\s+d[' ]?int[eé]r[eê]t|Avis g[eé]n[eé]ral|DRP|Appel d[' ]?offres?|Avis)\s+/i, '')
      .trim();
    if (!titre) titre = texte.slice(0, 80);

    // "Cloture : 14 Jul 2026" - extractDeadline sait deja lire "14 Jul 2026".
    var deadline = extractDeadline(texte);

    resultats.push(normalizeOpportunity({
      title: titre,
      url: nettoyerLien(lienMatch[1]),
      summary: texte,
      deadline: deadline
    }, source));
  });

  return resultats.filter(function (o) { return o.title; });
}

/**
 * Analyseur des avis de marches de la Banque africaine de developpement.
 *
 * La page project-related-procurement est un listing Drupal. Chaque avis est
 * un lien /en/documents/<slug> dont le libelle porte un prefixe de type :
 * EOI et AMI (manifestation d'interet), SPN (avis specifique), GPN (avis
 * general), IFB (appel d'offres). Les liens sans ce prefixe sont des
 * rubriques du site, qu'on ignore.
 *
 * La date affichee juste avant le titre (28-Aug-2026) est la date de
 * publication, pas une deadline : on ne la prend donc pas pour une echeance.
 */
function analyserPageAfdb(html, source) {
  if (!html) return [];
  var lien = /<a\s[^>]*href="(\/en\/documents\/[a-z0-9-]{20,})"[^>]*>([^<]{10,200})<\/a>/gi;
  var prefixe = /^\s*(EOI|AMI|SPN|GPN|IFB|RFP|RFQ)\b/i;
  var resultats = [];
  var vus = {};
  var m;

  while ((m = lien.exec(html)) !== null) {
    var titre = nettoyerHtml(m[2]);
    if (!prefixe.test(titre)) continue;
    var url = 'https://www.afdb.org' + m[1];
    if (vus[url]) continue;
    vus[url] = true;

    resultats.push(normalizeOpportunity({
      title: titre,
      url: url,
      summary: titre,
      deadline: extractDeadline(titre)
    }, source));
  }
  return resultats.filter(function (o) { return o.title; });
}

/**
 * Analyseur des marches publics de l'agence belge Enabel.
 *
 * Chaque annonce est une carte <div class="card--news card--tenders ...">
 * qui porte, en clair, la reference et l'objet dans un <p class="h5">, puis
 * des paires "<strong>Cle : </strong> valeur" pour le pays, la date de
 * cloture et le statut.
 *
 * Enabel est la seule source qui publie un statut explicite (Open / Close).
 * On s'en sert pour ne pas remonter des marches deja clos : sans cela la
 * page melangerait les deux et l'utilisateur perdrait du temps sur des
 * annonces mortes.
 */
function analyserPageEnabel(html, source) {
  if (!html) return [];
  var cartes = String(html).match(/<div\b[^>]*class="[^"]*card--tenders[^"]*"[\s\S]*?(?=<div\b[^>]*class="[^"]*card--tenders|<footer|$)/gi) || [];
  var resultats = [];

  cartes.forEach(function (carte) {
    var titreBrut = /<p class="h5">([\s\S]*?)<\/p>/i.exec(carte);
    var titre = nettoyerHtml(titreBrut ? titreBrut[1] : '');
    if (!titre) return;

    function champ(cle) {
      var m = new RegExp('<strong[^>]*>\\s*' + cle + '\\s*:?\\s*<\\/strong>([^<]*)', 'i')
        .exec(carte);
      return nettoyerHtml(m ? m[1] : '');
    }

    // "Close" signale un marche dont la remise est passee : on l'ecarte.
    if (/^clos/i.test(champ('Status'))) return;

    var cloture = champ('Closing date');
    var pays = champ('Country');
    var lienMatch = /href="(https:\/\/www\.enabel\.be\/[^"#]*(?:publication|procurement)[^"#]*)"/i
      .exec(carte);

    var morceaux = [];
    if (pays) morceaux.push('Pays : ' + pays);
    if (cloture) morceaux.push('Closing date : ' + cloture);
    morceaux.push(nettoyerHtml(carte).slice(0, 300));

    resultats.push(normalizeOpportunity({
      title: titre,
      url: nettoyerLien(lienMatch ? lienMatch[1]
        : 'https://www.enabel.be/public-procurement/'),
      summary: morceaux.join(' - '),
      // extractDeadline sait deja lire "Closing date : 02 September 2026".
      deadline: cloture ? extractDeadline('closing date ' + cloture) : null
    }, source));
  });

  return resultats.filter(function (o) { return o.title; });
}

/**
 * Analyseur des appels d'offres de l'ARMP, le regulateur beninois.
 *
 * Chaque avis est une vignette WordPress : une date dans un
 * <div class="timer ..."> suivie du lien <a class="title_cat" href title>.
 * Le titre complet est dans l'attribut title, alors que le texte du lien
 * est tronque par le theme : c'est donc l'attribut qu'on lit.
 *
 * L'ARMP publie un a deux avis par an. La source est donc livree INACTIVE :
 * elle n'apporte presque rien au quotidien, mais quand elle publie, il
 * s'agit de marches importants (audits, assurances, solutions numeriques).
 */
function analyserPageArmp(html, source) {
  if (!html) return [];
  var motif = /<div class="timer[^"]*">\s*<i>\s*<\/i>\s*([^<]{6,40}?)\s*<\/div>[\s\S]{0,200}?<a class="title_cat" href="(https:\/\/armp\.bj\/[^"]+)"\s+title="([^"]{10,300})"/gi;
  var resultats = [];
  var vus = {};
  var m;

  while ((m = motif.exec(html)) !== null) {
    var lien = nettoyerLien(m[2]);
    if (vus[lien]) continue;
    vus[lien] = true;

    var titre = nettoyerHtml(m[3]);
    if (!titre) continue;

    resultats.push(normalizeOpportunity({
      title: titre,
      url: lien,
      summary: titre,
      // "02 March 2026" : la vignette porte la date de parution.
      published: parseFeedDate(nettoyerHtml(m[1])),
      // La vignette n'affiche aucune echeance : la lire exigerait d'ouvrir
      // chaque avis. On prefere ne rien annoncer plutot qu'une fausse date.
      deadline: null,
      type: /manifestation/i.test(titre) ? 'AMI' : "Appel d'offres"
    }, source));
  }
  return resultats.filter(function (o) { return o.title; });
}

/**
 * Analyseur du portail de marches de la SBEE (electricite, Benin).
 *
 * La source beninoise la plus complete : chaque avis porte sa reference
 * officielle, son type de marche, sa date de publication ET sa date limite
 * de depot, en clair dans la page.
 *
 * Les avis n'ont pas d'adresse propre - le portail affiche tout sur une
 * seule page et le bouton "Telecharger l'avis" pointe vers un PDF. On
 * renvoie donc vers le portail lui-meme.
 */
function analyserPageSbee(html, source) {
  if (!html) return [];
  const blocs = String(html).match(/<div class="blog-item-wrapper[\s\S]*?(?=<div class="blog-item-wrapper|<footer|$)/gi) || [];

  return blocs.map(function (bloc) {
    const titreMatch = /<h3>([\s\S]*?)<\/h3>/i.exec(bloc);
    const titre = nettoyerHtml(titreMatch ? titreMatch[1] : '');
    if (!titre) return null;

    // Chaque champ est un libelle en gras suivi de sa valeur apres un <br>.
    function champ(cle) {
      const m = new RegExp('<strong>\\s*' + cle + '\\s*</strong>(?:\\s*</span>)?\\s*<br\\s*/?>([^<]*)', 'i').exec(bloc);
      return nettoyerHtml(m ? m[1] : '');
    }

    const refMatch = /<p class="job-details[^"]*">([\s\S]*?)<\/p>/i.exec(bloc);
    const reference = nettoyerHtml(refMatch ? refMatch[1] : '');
    const type = champ('Type de march[e\u00e9]');
    const limite = champ('Date limite de d[e\u00e9]p[o\u00f4]t');
    const publie = champ('Date de publication');

    const morceaux = [];
    if (type) morceaux.push('Type : ' + type);
    if (reference) morceaux.push(reference);

    return normalizeOpportunity({
      title: titre,
      url: 'https://marches-publics.sbee.bj/',
      summary: morceaux.join(' - '),
      // "27-08-2026 07:00:00" : on ne garde que la date.
      published: publie ? extractDeadline('date limite ' + jourSeul_(publie)) : null,
      // "06-10-2026 10:00:00" est en jour-mois-annee.
      deadline: limite ? extractDeadline('date limite ' + limite) : null,
      org: "SBEE - Societe beninoise d'energie electrique",
      type: type
    }, source);
  }).filter(function (o) { return o && o.title; });
}

/**
 * Analyseur des marches publics de la SONEB (eau, Benin).
 *
 * Table Drupal : une ligne par avis, avec la date de parution dans un
 * attribut <time datetime>, le titre porte par un lien /marche-public/, et
 * la date de cloture dans sa propre colonne.
 */
function analyserPageSoneb(html, source) {
  if (!html) return [];
  const lignes = String(html).match(/<tr>[\s\S]*?<\/tr>/gi) || [];

  return lignes.map(function (ligne) {
    const lienMatch = /<a href="(\/marche-public\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(ligne);
    if (!lienMatch) return null;
    const titre = nettoyerHtml(lienMatch[2]);
    if (!titre) return null;

    // L'attribut datetime est machine-lisible : on le prefere au texte.
    const pubMatch = /views-field-created[^>]*>[\s\S]*?datetime="([^"]+)"/i.exec(ligne);
    const clotureMatch = /views-field-field-date-de-cloture[^>]*>([^<]*)/i.exec(ligne);
    const cloture = nettoyerHtml(clotureMatch ? clotureMatch[1] : '');

    return normalizeOpportunity({
      title: titre,
      url: nettoyerLien('https://web.soneb.bj' + lienMatch[1]),
      summary: cloture ? 'Cloture : ' + cloture : titre,
      published: pubMatch ? parseFeedDate(pubMatch[1]) : null,
      deadline: cloture ? extractDeadline('date limite ' + cloture) : null,
      org: 'SONEB - Societe nationale des eaux du Benin'
    }, source);
  }).filter(function (o) { return o && o.title; });
}

/**
 * Analyseur des appels d'offres de l'ARAA (agence agricole de la CEDEAO).
 *
 * Le plus propre des cinq : chaque avis est un <div class="item-offre"> et
 * la date limite est donnee en ISO dans un attribut datetime.
 */
function analyserPageAraa(html, source) {
  if (!html) return [];
  const blocs = String(html).match(/<div class="item-offre">[\s\S]*?(?=<div class="item-offre">|$)/gi) || [];

  return blocs.map(function (bloc) {
    const lienMatch = /<h2 class="title"><a href="(\/fr\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(bloc);
    if (!lienMatch) return null;
    const titre = nettoyerHtml(lienMatch[2]);
    if (!titre) return null;

    const limiteMatch = /datetime="([^"]+)"/i.exec(bloc);

    return normalizeOpportunity({
      title: titre,
      url: nettoyerLien('https://www.araa.org' + lienMatch[1]),
      summary: titre,
      deadline: limiteMatch ? parseFeedDate(limiteMatch[1]) : null,
      org: "ARAA - Agence regionale pour l'agriculture et l'alimentation (CEDEAO)"
    }, source);
  }).filter(function (o) { return o && o.title; });
}

/**
 * Analyseur des marches publics de la BCEAO.
 *
 * Couvre les huit pays de l'UMOA, pas seulement le Benin : c'est voulu, un
 * soumissionnaire beninois peut repondre a un marche de la sous-region.
 */
function analyserPageBceao(html, source) {
  if (!html) return [];
  const blocs = String(html).match(/<div class="itemDoc views-row">[\s\S]*?(?=<div class="itemDoc views-row">|$)/gi) || [];

  return blocs.map(function (bloc) {
    const lienMatch = /<a href="(https:\/\/www\.bceao\.int\/fr\/appels-offres\/[^"]+)"/i.exec(bloc);
    const titreMatch = /<span class="ttr">([\s\S]*?)<\/span>/i.exec(bloc);
    const titre = nettoyerHtml(titreMatch ? titreMatch[1] : '');
    if (!lienMatch || !titre) return null;

    const pubMatch = /<span class="infoFile">[\s\S]*?<time[^>]*>([^<]*)<\/time>/i.exec(bloc);
    const publie = nettoyerHtml(pubMatch ? pubMatch[1] : '');
    const sousMatch = /<span class="subTtr">([\s\S]*?)<\/span>/i.exec(bloc);
    const sousTitre = nettoyerHtml(sousMatch ? sousMatch[1] : '');

    return normalizeOpportunity({
      title: titre,
      url: nettoyerLien(lienMatch[1]),
      summary: sousTitre || titre,
      // "24 Aout 2026" : mois francais, illisible par new Date().
      published: publie ? extractDeadline('date limite ' + publie) : null,
      // Le sous-titre porte "AC/K00/... Date limite le 08 Septembre 2026".
      deadline: extractDeadline(sousTitre),
      org: "BCEAO - Banque centrale des Etats de l'Afrique de l'Ouest"
    }, source);
  }).filter(function (o) { return o && o.title; });
}

/**
 * Analyseur des appels d'offres de l'ABE (environnement, Benin).
 *
 * Contrairement a Enabel, on ne filtre PAS les avis expires : l'ABE ne
 * propose aucun filtre d'URL, et les ecarter viderait la source. Le moteur
 * calcule deja le statut de delai et n'alerte pas sur un avis echu.
 */
function analyserPageAbe(html, source) {
  if (!html) return [];
  const cartes = String(html).match(/<div class="[^"]*marche-item[^"]*"[\s\S]*?(?=<div class="[^"]*marche-item[^"]*"|<footer|$)/gi) || [];

  return cartes.map(function (carte) {
    // Le bloc OBJET porte l'intitule reel ; le bandeau ne donne que le type.
    const objetMatch = /<p[^>]*>OBJET<\/p>\s*<p[^>]*>([\s\S]*?)<\/p>/i.exec(carte);
    const objet = nettoyerHtml(objetMatch ? objetMatch[1] : '');
    const typeMatch = /py-3 header[^"]*">[\s\S]*?<p class="white[^"]*">([^<]*)<\/p>/i.exec(carte);
    const type = nettoyerHtml(typeMatch ? typeMatch[1] : '');
    const titre = objet || type;
    if (!titre) return null;

    // Quelques cartes ont leur bandeau en commentaire : la lecture retombe
    // alors sur l'objet. Un libelle long n'est pas un type de marche.
    const typeCourt = type && type.length <= 60 ? type : '';

    const limiteMatch = /DE SOUMISSION<\/p>\s*<p[^>]*>([^<]*)<\/p>/i.exec(carte);
    const limite = nettoyerHtml(limiteMatch ? limiteMatch[1] : '');
    const lienMatch = /<a[^>]+href="(https:\/\/www\.abe\.bj\/[^"]+)"[^>]*>\s*CONSULTER/i.exec(carte);

    const morceaux = [];
    if (typeCourt) morceaux.push('Type : ' + typeCourt);
    if (limite) morceaux.push('Delai : ' + limite);

    return normalizeOpportunity({
      title: titre,
      url: nettoyerLien(lienMatch ? lienMatch[1] : 'https://www.abe.bj/appels-doffres/'),
      summary: morceaux.join(' - ') || titre,
      // "28 Aout 2026 a 05h00"
      deadline: limite ? extractDeadline('date limite ' + limite) : null,
      org: "ABE - Agence beninoise pour l'environnement",
      type: typeCourt
    }, source);
  }).filter(function (o) { return o && o.title; });
}

/** "27-08-2026 07:00:00" -> "27-08-2026". */
function jourSeul_(valeur) {
  return String(valeur).trim().split(/\s+/)[0];
}

/**
 * Analyseur du portail e-procurement de DEDRAS-ONG (Benin).
 *
 * Une ONG beninoise qui publie ses propres consultations : demandes de
 * cotation, AMI, appels a concurrence. Ce genre de source locale echappe
 * aux grands agregateurs, et elle achete beaucoup.
 *
 * Attention : le titre apparait DEUX fois, d'abord dans un <h5> mis en
 * commentaire, puis dans un div en gras. On retire donc les commentaires.
 */
function analyserPageDedras(html, source) {
  if (!html) return [];
  const propre = String(html).replace(/<!--[\s\S]*?-->/g, ' ');
  const cartes = propre.match(/<div class="card"[\s\S]*?(?=<div class="card"|<footer|$)/gi) || [];

  return cartes.map(function (carte) {
    const titreMatch = /<div class="" style="font-weight:bold;">([\s\S]*?)<\/div>/i.exec(carte);
    const titre = nettoyerHtml(titreMatch ? titreMatch[1] : '');
    if (!titre) return null;

    // "<span>Libelle</span></div> <div class="row"><span ...>valeur</span>"
    function champ(cle) {
      const m = new RegExp('<span>\\s*' + cle + '\\s*</span>\\s*</div>\\s*'
        + '<div class="row"><span[^>]*>([^<]*)</span>', 'i').exec(carte);
      return nettoyerHtml(m ? m[1] : '');
    }

    const type = champ('Type[^<]*');
    const limite = champ('Limite de d[eé]pot');
    const publie = champ('Date de publication');
    const refMatch = /R[eé]f\s*:\s*([^<]+)/i.exec(carte);
    const reference = nettoyerHtml(refMatch ? refMatch[1] : '');

    const morceaux = [];
    if (type) morceaux.push('Type : ' + type);
    if (reference) morceaux.push('Reference : ' + reference);

    return normalizeOpportunity({
      title: titre,
      url: 'https://eprocurement.dedras.org/toutvoir',
      summary: morceaux.join(' - ') || titre,
      // "2026-08-19 16:26:03" : deja en annee-mois-jour.
      published: publie ? publie.slice(0, 10) : null,
      deadline: limite ? limite.slice(0, 10) : null,
      org: 'DEDRAS-ONG',
      type: type
    }, source);
  }).filter(function (o) { return o && o.title; });
}

/**
 * Analyseur des appels a projets de l'AFD.
 *
 * Ce ne sont pas des marches publics mais des financements : l'AFD met des
 * fonds a disposition, des organisations candidatent. La difference est
 * portee par le type "Appel a projets".
 *
 * Le detail porte les deux dates d'un coup : "29 juillet 2026 - 9 octobre
 * 2026". Le badge, lui, affiche une duree relative ("Cloture dans 1 mois")
 * inutilisable comme date : on ne le lit pas.
 */
function analyserPageAfd(html, source) {
  if (!html) return [];
  const cartes = String(html).match(/<div class="views-row fr-col-12">[\s\S]*?(?=<div class="views-row fr-col-12">|<footer|$)/gi) || [];

  return cartes.map(function (carte) {
    const lienMatch = /<a href="(\/fr\/appels-a-projets\/[^"?]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(carte);
    if (!lienMatch) return null;
    const titre = nettoyerHtml(lienMatch[2]);
    if (!titre) return null;

    const detailMatch = /<p class="fr-card__detail">([^<]*)<\/p>/i.exec(carte);
    const detail = nettoyerHtml(detailMatch ? detailMatch[1] : '');
    const bornes = detail.split(/\s+-\s+/);
    const ouverture = bornes.length > 1 ? bornes[0] : '';
    const cloture = bornes.length > 1 ? bornes[1] : detail;

    return normalizeOpportunity({
      title: titre,
      url: nettoyerLien('https://www.afd.fr' + lienMatch[1]),
      summary: detail ? 'Periode : ' + detail : titre,
      published: ouverture ? extractDeadline('date limite ' + ouverture) : null,
      deadline: cloture ? extractDeadline('date limite ' + cloture) : null,
      org: 'AFD - Agence francaise de developpement',
      type: 'Appel a projets'
    }, source);
  }).filter(function (o) { return o && o.title; });
}

/**
 * Analyseur des programmes de financement de Wellcome Trust.
 *
 * La page /research-funding/schemes embarque un JSON dans __NEXT_DATA__
 * contenant initialListings : un tableau de programmes avec titre, statut
 * (Open/Closed), date de cloture, montant, duree et pays eligible.
 */
function analyserPageWellcome(html, source) {
  if (!html) return [];
  var match = /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i.exec(String(html));
  if (!match) return [];

  var data;
  try {
    data = JSON.parse(match[1]);
  } catch (e) {
    return [];
  }

  var listings = data && data.props && data.props.pageProps && data.props.pageProps.initialListings;
  if (!listings || !listings.length) return [];

  var resultats = [];
  listings.forEach(function (l) {
    if (l.scheme_status !== 'Open') return;

    var titre = String(l.title || '').trim();
    if (!titre) return;

    var url = String(l.url || '').trim();
    var lien = url ? nettoyerLien('https://wellcome.org' + url) : '';
    var resume = nettoyerHtml(String(l.listing_summary || ''));
    var duree = nettoyerHtml(String(l.duration_of_funding || ''));
    var montant = nettoyerHtml(String(l.level_of_funding || ''));
    var cloture = String(l.scheme_closes_for_applications || '').trim();
    var freq = String(l.frequency || '').trim();

    var zones = [];
    if (Array.isArray(l.location_ref)) {
      l.location_ref.forEach(function (z) {
        var n = String(z.name || '').trim();
        if (n) zones.push(n);
      });
    }

    var morceaux = [];
    if (resume) morceaux.push(resume);
    if (montant) morceaux.push('Budget : ' + montant);
    if (duree) morceaux.push('Duree : ' + duree);
    if (zones.length) morceaux.push('Zones : ' + zones.join(', '));
    if (freq) morceaux.push('Frequence : ' + freq);

    resultats.push(normalizeOpportunity({
      title: titre,
      url: lien,
      summary: morceaux.join(' - ').slice(0, 500),
      deadline: cloture ? extractDeadline('closing date ' + cloture) : null,
      org: 'Wellcome Trust',
      type: 'Subvention'
    }, source));
  });

  return resultats.filter(function (o) { return o.title; });
}

/**
 * Analyseur des opportunites de financement de Grand Challenges (Gates Foundation).
 *
 * La page /grant-opportunities embarque un JSON dans __NEXT_DATA__
 * contenant initialData.listing.data : un tableau de defis avec titre,
 * dates, domaine, lien de candidature et description.
 */
function analyserPageGrandChallenges(html, source) {
  if (!html) return [];
  var jsonMatch = /__NEXT_DATA__[^{]*(\{[\s\S]*?\})\s*;?\s*<\/script>/i.exec(String(html));
  if (!jsonMatch) return [];

  var data;
  try {
    data = JSON.parse(jsonMatch[1]);
  } catch (e) {
    return [];
  }

  var listing = data && data.props && data.props.pageProps && data.props.pageProps.initialData
    && data.props.pageProps.initialData.listing && data.props.pageProps.initialData.listing.data;
  if (!listing || !listing.length) return [];

  var maintenant = Date.now();
  var resultats = [];

  listing.forEach(function (g) {
    if (g.hidden) return;
    var dateEnd = typeof g.date_end === 'number' ? g.date_end * 1000 : 0;
    if (dateEnd <= maintenant) return;

    var titre = String(g.title || '').trim();
    if (!titre) return;

    var slug = String(g.url || '').trim();
    var lien = slug ? nettoyerLien('https://www.grandchallenges.org' + slug) : String(g.apply_link || '');
    var challenge = String(g.challenge_goal || '').trim();
    var initiative = String(g.initiative_title || '').trim();
    var description = nettoyerHtml(String(g.opportunity_description_summary || g.opportunity_description || ''));
    var dateEndObj = typeof g.date_end === 'number' ? new Date(g.date_end * 1000) : null;

    var morceaux = [];
    if (description) morceaux.push(description);
    if (challenge) morceaux.push('Domaine : ' + challenge);
    if (initiative) morceaux.push('Initiative : ' + initiative);
    if (dateEndObj) morceaux.push('Cloture : ' + dateEndObj.toLocaleDateString('fr-FR'));

    resultats.push(normalizeOpportunity({
      title: titre,
      url: lien,
      summary: morceaux.join(' - ').slice(0, 500),
      deadline: dateEndObj ? dateEndObj.toISOString().slice(0, 10) : null,
      org: 'Grand Challenges / Gates Foundation',
      type: 'Subvention'
    }, source));
  });

  return resultats.filter(function (o) { return o && o.title; });
}

/**
 * Analyseur des tender calendars de UNICEF Supply Division.
 *
 * La page /supply/tender-calendars liste les categories de marches avec des
 * liens vers des sous-pages HTML et des PDFs de calendrier.
 */
function analyserPageUnicefSupply(html, source) {
  if (!html) return [];
  var resultats = [];
  var vus = {};

  // Extraire les liens vers les sous-pages de tender calendars
  var subPages = String(html).match(/href="(\/supply\/(?:documents\/)?[a-z-]+tender-calendar[^"]*)"/gi) || [];
  subPages.forEach(function (m) {
    var lien = m.match(/href="([^"]+)"/i);
    if (!lien) return;
    var slug = lien[1];
    if (vus[slug]) return;
    vus[slug] = true;

    var slugClean = slug.replace(/.*\//, '');
    var nomCategorie = slugClean
      .replace(/-tender-calendar.*$/i, '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, function(c) { return c.toUpperCase(); });

    resultats.push(normalizeOpportunity({
      title: 'UNICEF Supply - ' + nomCategorie + ' tender calendar',
      url: nettoyerLien('https://www.unicef.org' + slug),
      summary: 'Calendrier des marches UNICEF pour ' + nomCategorie + '. Consultez la page pour les dates de soumission.',
      deadline: null,
      org: 'UNICEF Supply Division',
      type: "Appel d'offres"
    }, source));
  });

  // Extraire les liens PDF
  var pdfLinks = String(html).match(/href="(\/supply\/media\/[^"']+\.pdf)"/gi) || [];
  pdfLinks.forEach(function (m) {
    var lien = m.match(/href="([^"]+)"/i);
    if (!lien) return;
    var pdfUrl = lien[1];
    if (vus[pdfUrl]) return;
    vus[pdfUrl] = true;

    var nomFichier = pdfUrl.split('/').pop().replace(/\.pdf$/i, '');
    var titre = nomFichier
      .replace(/-/g, ' ')
      .replace(/UNICEF\s*/i, '')
      .replace(/file\s*/i, '')
      .trim();

    resultats.push(normalizeOpportunity({
      title: 'UNICEF Supply - ' + titre,
      url: nettoyerLien('https://www.unicef.org' + pdfUrl),
      summary: 'Calendrier des marches UNICEF. PDF a consulter pour les dates de soumission.',
      deadline: null,
      org: 'UNICEF Supply Division',
      type: "Appel d'offres"
    }, source));
  });

  // Autres pages (SIE, Vaccines, WASH)
  var otherPages = String(html).match(/href="(\/supply\/(?:safe-injection|tentative-vaccine|water-sanitation)[^"]*)"/gi) || [];
  otherPages.forEach(function (m) {
    var lien = m.match(/href="([^"]+)"/i);
    if (!lien) return;
    var slug = lien[1];
    if (vus[slug]) return;
    vus[slug] = true;

    var slugClean = slug.replace(/.*\//, '');
    var nomCategorie = slugClean
      .replace(/-/g, ' ')
      .replace(/\b\w/g, function(c) { return c.toUpperCase(); })
      .replace(/Tender Calendar.*$/i, 'tender calendar')
      .replace(/Tender Issuance Dates$/i, 'tender issuance dates');

    resultats.push(normalizeOpportunity({
      title: 'UNICEF Supply - ' + nomCategorie,
      url: nettoyerLien('https://www.unicef.org' + slug),
      summary: 'Calendrier des marches UNICEF. Consultez la page pour les dates de soumission.',
      deadline: null,
      org: 'UNICEF Supply Division',
      type: "Appel d'offres"
    }, source));
  });

  return resultats.filter(function (o) { return o && o.title; });
}

if (typeof module !== 'undefined') {
  module.exports = {
    analyseurHtml_: analyseurHtml_,
    nettoyerHtml: nettoyerHtml,
    analyserPageGouvBj: analyserPageGouvBj,
    analyserPageAfdb: analyserPageAfdb,
    analyserPageEnabel: analyserPageEnabel,
    analyserPageArmp: analyserPageArmp,
    analyserPageSbee: analyserPageSbee,
    analyserPageSoneb: analyserPageSoneb,
    analyserPageAraa: analyserPageAraa,
    analyserPageBceao: analyserPageBceao,
    analyserPageAbe: analyserPageAbe,
    analyserPageDedras: analyserPageDedras,
    analyserPageAfd: analyserPageAfd,
    analyserPageWellcome: analyserPageWellcome,
    analyserPageGrandChallenges: analyserPageGrandChallenges,
    analyserPageUnicefSupply: analyserPageUnicefSupply,
    ANALYSEURS_HTML: ANALYSEURS_HTML
  };
}
