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
  'unicef.org/supply': analyserPageUnicefSupply,
  'giz.de': analyserPageGiz,
  'expertise-france.gestmax.fr': analyserPageExpertiseFrance,
  'plan-international.org': analyserPagePlanInternational,
  'jobrelais.com': analyserPageJobrelais,
  'ungm.org': analyserPageUngm
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
 * Lien propre a un avis SBEE.
 *
 * Mesure du 2026-09-02 : le lien etait code en dur sur la page de liste,
 * identique pour les sept avis. Or la cle de deduplication est fabriquee a
 * partir de l URL : les sept partageaient la meme cle, le premier
 * s inscrivait, les six autres etaient jetes comme doublons. La source
 * beninoise la plus complete livrait UN marche sur SEPT, sans message.
 *
 * Le site expose pourtant un lien par avis - /demande-dossier/appel-doffre/113,
 * /118, /122 - et un PDF en repli.
 */
function lienAvisSbee_(bloc) {
  var m = /href="([^"]*\/demande-dossier\/appel-doffre\/[0-9]+)"/i.exec(bloc);
  if (m) return nettoyerLien(m[1]);
  m = /href="([^"]*\/uploads\/[^"]+)"/i.exec(bloc);
  if (m) return nettoyerLien(m[1]);
  return 'https:\/\/marches-publics.sbee.bj\/';
}

/**
 * Analyseur du portail de marches de la SBEE (electricite, Benin).
 *
 * La source beninoise la plus complete : chaque avis porte sa reference
 * officielle, son type de marche, sa date de publication ET sa date limite
 * de depot, en clair dans la page.
 *
 * Chaque avis a bien une adresse propre : /demande-dossier/appel-doffre/<id>.
 * Le contraire fut longtemps ecrit ici, et ce commentaire a coute six
 * marches sur sept - voir lienAvisSbee_.
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
      url: lienAvisSbee_(bloc),
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
    //
    // MESURE DU 2026-09-02 : la limite de longueur ne suffisait pas. Deux
    // cartes portaient une REFERENCE dans leur bandeau - 45 caracteres -
    // qui atterrissait dans la colonne Type et rendait le filtre
    // inutilisable. Un type de marche ne porte ni numero ni suite de
    // chiffres.
    const ressembleAUneReference = /N\s*[°o]|\d{3}/i.test(type);
    const typeCourt = (type && type.length <= 60 && !ressembleAUneReference)
      ? type : '';

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

    // LE LIEN DE LA FICHE, PAS CELUI DE LA LISTE. Chaque carte porte le
    // bouton "Details" vers /tenderforapplicationbis/<uuid> : sans lui, les
    // 98 avis renvoyaient tous a la meme page et il fallait y rechercher
    // l'annonce a la main. On retombe sur la liste seulement si le bouton
    // manque - mieux vaut un lien large qu'aucun lien.
    const lienFiche = /href="(https:\/\/eprocurement\.dedras\.org\/tenderforapplication[^"]*)"/i
      .exec(carte);

    return normalizeOpportunity({
      title: titre,
      url: nettoyerLien(lienFiche ? lienFiche[1]
        : 'https://eprocurement.dedras.org/toutvoir'),
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
    // LE LIEN QUI REPOND. Mesure du 2026-09-02, sur les trois defis
    // ouverts : "www.grandchallenges.org" + le slug rend 404 pour les
    // TROIS - c'etait donc un lien systematiquement mort. Le champ
    // apply_link, lui, repond 200 pour les trois et mene la ou l'on
    // candidate. La fiche descriptive vit sur un autre hote,
    // gcgh.grandchallenges.org, qui rend 200 pour deux defis sur trois :
    // elle sert de repli, jamais de premier choix.
    var candidature = String(g.apply_link || '').trim();
    var lien = nettoyerLien(candidature
      || (slug ? 'https://gcgh.grandchallenges.org' + slug : ''));
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

/**
 * Analyseur du Vergabemarktplatz de la GIZ, la cooperation allemande.
 *
 * Jumeau de analyserGiz() dans web/src/lib/domain/html.ts.
 *
 * La page welcome.do sert un tableau, cote serveur, sans authentification.
 * Une ligne = un avis, six cellules dans cet ordre :
 *
 *   0  Veroffentlicht              date de publication, JJ.MM.AAAA
 *   1  Angebots-/Teilnahmefrist    echeance, JJ.MM.AAAA - ou "nv"
 *   2  Bezeichnung                 l'objet du marche
 *   3  Vergabeordnung + type       "UVgO Ausschreibung", "VgV TNW"...
 *   4  Ausschreibende Stelle       le pouvoir adjudicateur
 *   5  lien vers projectForwarding.do?pid=NNNNN
 *
 * DEUX TRIS, mesures le 2026-09-02 sur les 224 avis des douze pages.
 *
 * 1. On ecarte les "Vergebener Auftrag" - des marches DEJA ATTRIBUES, 131
 *    des 224 avis - et les "Bekanntmachung uber Auftragsanderung", des
 *    avenants. Meme decision que pour les "Contract Award" de la Banque
 *    mondiale : TenderPilot sert a candidater. Restent 91 avis, et tous
 *    portent une echeance - les 133 lignes sans date etaient exactement
 *    celles qu'on ecarte.
 *
 * 2. Le type allemand est traduit dans le vocabulaire ferme :
 *    "Ausschreibung" est un appel d'offres, "TNW" (Teilnahmewettbewerb) est
 *    un appel a candidatures, donc un AMI.
 *
 * LA DATE EST CONVERTIE ICI, ET SUREMENT. "02.09.2026" passe par
 * parseFeedDate vaut le 9 FEVRIER : new Date() lit le point a l'americaine.
 * On decoupe donc les trois nombres a la main. Une echeance fausse d'un
 * jour fait rater un depot ; une echeance fausse de sept mois aussi.
 */
var GIZ_RACINE = 'https://ausschreibungen.giz.de';

/** "24.09.2026" -> "2026-09-24". Rien d'autre n'est accepte. */
function dateAllemande(valeur) {
  var m = /^\s*(\d{1,2})\.(\d{1,2})\.(\d{4})\s*$/.exec(String(valeur || ''));
  if (!m) return null;
  var jour = ('0' + m[1]).slice(-2);
  var mois = ('0' + m[2]).slice(-2);
  if (Number(mois) < 1 || Number(mois) > 12) return null;
  if (Number(jour) < 1 || Number(jour) > 31) return null;
  return m[3] + '-' + mois + '-' + jour;
}

function analyserPageGiz(html, source) {
  if (!html) return [];
  var lignes = String(html).match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) || [];
  var sortie = [];

  lignes.forEach(function (ligne) {
    var lien = /href="([^"]*projectForwarding\.do\?pid=\d+)"/i.exec(ligne);
    if (!lien) return;

    // Le tableau de la GIZ ne ferme pas toujours ses <td> : on decoupe sur
    // le debut de la cellule suivante plutot que sur la balise fermante.
    var cellules = (ligne.match(/<td\b[^>]*>[\s\S]*?(?=<td\b|<\/tr>)/gi) || [])
      .map(function (c) { return nettoyerHtml(c); });
    if (cellules.length < 4) return;

    var nature = cellules[3];
    // Marche attribue ou avenant : rien a soumissionner.
    if (/vergebener auftrag/i.test(nature)) return;
    if (/auftrags.nderung/i.test(nature)) return;

    var titre = cellules[2];
    if (!titre) return;

    var morceaux = ['Procedure GIZ : ' + nature];
    if (cellules[4]) morceaux.push('Pouvoir adjudicateur : ' + cellules[4]);

    sortie.push(normalizeOpportunity({
      title: titre,
      url: nettoyerLien(GIZ_RACINE + lien[1].replace(GIZ_RACINE, '')),
      summary: morceaux.join(' - '),
      published: dateAllemande(cellules[0]),
      deadline: dateAllemande(cellules[1]),
      org: cellules[4] || '',
      type: /\bTNW\b|teilnahmewettbewerb/i.test(nature) ? 'AMI' : "Appel d'offres"
    }, source));
  });

  return sortie.filter(function (o) { return o.title; });
}

/**
 * Analyseur des offres d'Expertise France, sur sa plateforme Gestmax.
 *
 * Jumeau de analyserExpertiseFrance() dans web/src/lib/domain/html.ts.
 *
 * MESURE DU 2026-09-04 : 144 offres, dix par page, quinze pages, rendues
 * cote serveur. Chaque carte porte ce que TenderPilot cherche et que peu de
 * sources donnent d'un coup : le titre, la zone ET le pays, le type de
 * contrat, le secteur declare, et une vraie "Date limite de candidature".
 *
 * CE N'EST PAS QU'UN SITE D'EMPLOI. Expertise France y publie aussi ses
 * marches de prestation - "Recrutement d'une agence de communication pour
 * la realisation d'outils de communication, Benin" est une consultation,
 * pas un poste. Le type de contrat le dit, et normaliserType s'en sert.
 *
 * La pagination passe par {page} dans l'URL du registre : rien de special
 * a ecrire ici, le moteur s'en charge.
 */
var EF_RACINE = 'https://expertise-france.gestmax.fr';

/**
 * Le type de contrat d'Expertise France, ramene au vocabulaire ferme.
 *
 * "CDD", "CDDU", "CDI", "Stage" sont des POSTES : Recrutement. Tout le
 * reste - "Contrat de prestation de services", huit offres sur dix - reste
 * volontairement NON traduit : le defaut de la source s'applique alors.
 *
 * Pourquoi ne pas le traduire ? Parce qu'il couvre les deux natures a la
 * fois : un expert individuel comme une agence de communication. Le ranger
 * d'office dans "Recrutement" ferait disparaitre les marches d'agence pour
 * qui filtre les postes ; le ranger dans "Appel d'offres" ferait l'inverse.
 * Un libelle qui recouvre deux notions ne se tranche pas a l'aveugle, et le
 * detail exact reste dans le resume.
 */
function typeExpertiseFrance_(contrat) {
  return /\b(CDD|CDDU|CDI|stage|alternance|apprentissage)\b/i.test(contrat)
    ? 'Recrutement' : '';
}

function analyserPageExpertiseFrance(html, source) {
  if (!html) return [];
  var cartes = String(html).match(
    /<div class="list-group-item[\s\S]*?(?=<div class="list-group-item|<div class="pager|$)/gi) || [];
  var resultats = [];

  cartes.forEach(function (carte) {
    var lien = /<a href="([^"]*gestmax\.fr\/\d+\/\d+\/[^"]*)"/i.exec(carte);
    if (!lien) return;

    var titreBrut = /<h2[^>]*>([\s\S]*?)<\/h2>/i.exec(carte);
    // Le gabarit ajoute un avertissement pour les lecteurs d'ecran : il
    // n'a rien a faire dans l'intitule d'un marche.
    var titre = nettoyerHtml(titreBrut ? titreBrut[1] : '')
      .replace(/\(Nouvelle fen[eê]tre\)\s*$/i, '').trim();
    if (!titre) return;

    // Deux <span class="country"> : la zone d'abord, le pays ensuite. On
    // garde le PAYS quand il existe - "TANZANIE" situe une annonce,
    // "AFRIQUE SUBSAHARIENNE" beaucoup moins.
    var lieux = [];
    var motif = /<span class="country">[\s\S]*?<strong>([\s\S]*?)<\/strong>/gi;
    var trouve;
    while ((trouve = motif.exec(carte)) !== null) {
      var lieu = nettoyerHtml(trouve[1]);
      if (lieu) lieux.push(lieu);
    }
    var pays = lieux.length > 1 ? lieux[lieux.length - 1] : (lieux[0] || '');

    function champ(expression) {
      var m = expression.exec(carte);
      return nettoyerHtml(m ? m[1] : '');
    }
    var contrat = champ(/<div class="text-blue-light listdiv-value">([\s\S]*?)<\/div>/i);
    var secteur = champ(/listdiv-vac_thematique[\s\S]*?<span class="listdiv-value">([\s\S]*?)<\/span>/i);
    // "Date limite de candidature : 24/09/2026 17:00" - extractDeadline
    // reconnait deja l'annonce et la forme.
    var limite = champ(/<div class="text-grey listdiv-value">([\s\S]*?)<\/div>/i);

    var morceaux = [];
    if (lieux.length > 1) morceaux.push('Zone : ' + lieux[0]);
    if (contrat) morceaux.push('Contrat : ' + contrat);
    if (secteur) morceaux.push('Secteur declare : ' + secteur);

    resultats.push(normalizeOpportunity({
      title: titre,
      url: nettoyerLien(lien[1].split('?')[0]),
      summary: morceaux.join(' - '),
      deadline: extractDeadline(limite),
      org: 'Expertise France',
      country: pays,
      sector: secteur,
      type: typeExpertiseFrance_(contrat)
    }, source));
  });

  return resultats.filter(function (o) { return o.title; });
}

/**
 * Analyseur des appels d'offres de Plan International.
 *
 * Jumeau de analyserPlanInternational() dans web/src/lib/domain/html.ts.
 *
 * MESURE DU 2026-09-04 : huit appels actifs, tous sur UNE seule page, en
 * clair. Chacun est un titre de niveau 3 suivi de ses paragraphes, puis
 * d'un bloc de telechargement.
 *
 * DEUX PARTICULARITES.
 *
 * 1. Il n'y a pas de page par appel : les huit vivent sur celle-ci. Le lien
 *    mene donc a la liste - mais le DOSSIER, lui, est propre a chaque appel,
 *    et il part dans la colonne PDF. C'est le contraire de la DNCMP, ou ni
 *    l'un ni l'autre n'existait.
 *
 * 2. L'echeance est en prose anglaise : "no later than Friday, 28th August
 *    2026". Ni la tournure ni le rang ordinal n'etaient reconnus le
 *    2026-09-04 - les deux ont ete ajoutes a extractDeadline, ce qui profite
 *    a toutes les sources.
 *
 * Le titre peut etre vide : la page en pose plusieurs comme separateurs.
 */
var PLAN_PAGE = 'https://plan-international.org/calls-tender/';

function analyserPagePlanInternational(html, source) {
  if (!html) return [];
  // Chaque appel court d'un <h3> au suivant.
  var blocs = String(html).split(/<h3 class="wp-block-heading">/i).slice(1);
  var resultats = [];

  blocs.forEach(function (bloc) {
    var fin = bloc.indexOf('</h3>');
    if (fin === -1) return;
    var titre = nettoyerHtml(bloc.slice(0, fin));
    // La page pose des <h3> vides en guise de separateurs.
    if (!titre) return;

    var corps = bloc.slice(fin);
    var texte = nettoyerHtml(corps);
    // Le dossier complet : un ZIP ou un PDF, propre a cet appel.
    var dossier = /href=['"]([^'"]*plan-international\.org\/uploads\/[^'"]+)['"]/i
      .exec(corps);

    resultats.push(normalizeOpportunity({
      title: titre,
      url: PLAN_PAGE,
      summary: texte.slice(0, 400),
      deadline: extractDeadline(texte),
      org: 'Plan International',
      pdf: dossier ? nettoyerLien(dossier[1]) : ''
    }, source));
  });

  return resultats.filter(function (o) { return o.title; });
}

/**
 * COLLECTE EN DEUX TEMPS : la liste, puis les fiches.
 *
 * Jumeau de ANALYSEURS_FICHE dans web/src/lib/domain/html.ts.
 *
 * Certains sites listent leurs avis sans jamais ecrire l'echeance dans la
 * liste - elle n'existe que sur la fiche. JobRelais est le cas type : sa
 * liste rend 12 avis par page avec, pour toute date, "il y a 3 mois" ; la
 * fiche, elle, porte un JSON-LD propre avec validThrough. Sans second
 * temps, ces sources arrivent SANS DATE, le filtre des echues ne peut pas
 * jouer, et le tableau du client se remplit d'avis morts.
 *
 * TROIS BORNES, parce que ce n'est pas gratuit.
 *
 * 1. Une fiche n'est lue que si l'echeance MANQUE.
 * 2. Une annonce deja au classeur n'est jamais relue : chaque passage
 *    enrichit du NOUVEAU, et le rattrapage avance au lieu de tourner en
 *    rond.
 * 3. Un plafond par passage (MAX_FICHES_PAR_PASSAGE). Ce qui depasse
 *    revient au passage suivant.
 *
 * ET ON NE GARDE PAS CE QU'ON N'A PAS PU DATER : pour une source qui
 * declare un analyseur de fiche, l'absence de date veut dire "fiche non
 * lue", pas "avis sans echeance".
 */
var ANALYSEURS_FICHE = {
  'jobrelais.com': analyserFicheJobrelais
};

/** Retourne l'analyseur de fiche d'une methode, ou null. */
function analyseurFiche_(methode) {
  var m = /^HTML:(.+)$/i.exec(String(methode || '').trim());
  return m ? (ANALYSEURS_FICHE[m[1].trim()] || null) : null;
}

/** Complete une annonce avec ce que sa fiche apporte, sans rien ecraser. */
function fusionnerFiche_(annonce, fiche) {
  Object.keys(fiche || {}).forEach(function (cle) {
    var valeur = fiche[cle];
    var actuelle = annonce[cle];
    var vide = actuelle === undefined || actuelle === null || actuelle === '';
    if (vide && valeur !== undefined && valeur !== null && valeur !== '') {
      annonce[cle] = valeur;
    }
  });
  return annonce;
}

/**
 * Analyseur d'une FICHE JobRelais.
 *
 * La fiche porte un JSON-LD de type JobPosting, correctement balise :
 * datePosted, validThrough, description. On lit le balisage plutot que la
 * page : c'est un contrat, la mise en page n'en est pas un.
 *
 * hiringOrganization est volontairement IGNORE : il vaut "JobRelais Sarl",
 * le site lui-meme, jamais l'acheteur reel.
 */
function analyserFicheJobrelais(html) {
  if (!html) return {};
  var motif = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
  var trouve;
  while ((trouve = motif.exec(String(html))) !== null) {
    var donnees;
    try {
      donnees = JSON.parse(trouve[1]);
    } catch (e) {
      // La page en sert plusieurs, dont un qui laisse fuir du PHP brut.
      continue;
    }
    if (!donnees || donnees['@type'] !== 'JobPosting') continue;

    var description = stripTags(reparerCaracteres(
      String(donnees.description || '')));
    return {
      deadline: isoFiche_(donnees.validThrough),
      published: isoFiche_(donnees.datePosted),
      summary: description.slice(0, 400)
    };
  }
  return {};
}

/** "2026-11-26T11:16" ou "2026-08-26" -> "2026-11-26". Rien d'autre. */
function isoFiche_(valeur) {
  var m = /^(\d{4}-\d{2}-\d{2})/.exec(String(valeur === null
    || valeur === undefined ? '' : valeur).trim());
  return m ? m[1] : null;
}

/**
 * Analyseur de la LISTE de JobRelais, l'agregateur beninois.
 *
 * Jumeau de analyserJobrelais() dans web/src/lib/domain/html.ts.
 *
 * La liste ne porte AUCUNE echeance, et n'est pas triee par date : la page
 * 1 melange "il y a 2 jours" et "il y a 3 mois". C'est la fiche qui date.
 */
function analyserPageJobrelais(html, source) {
  if (!html) return [];
  var motif = /<h3[^>]*class="[^"]*line-clamp-2[^"]*"[^>]*>\s*<a\s+href="([^"]*\/opportunities\/call-for-tenders\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  var resultats = [];
  var vus = {};
  var trouve;

  while ((trouve = motif.exec(String(html))) !== null) {
    var lien = nettoyerLien(trouve[1]);
    var titre = nettoyerHtml(trouve[2]);
    // La meme carte apparait deux fois : l'image et le titre pointent
    // toutes deux vers la fiche.
    if (!titre || vus[lien]) continue;
    vus[lien] = true;
    resultats.push(normalizeOpportunity({
      title: titre,
      url: lien,
      summary: '',
      // La liste ne date rien : la fiche s'en charge.
      deadline: null
    }, source));
  }
  return resultats;
}

/**
 * Analyseur de la liste UNGM - le marche public des agences des Nations
 * unies.
 *
 * Jumeau de analyserUngm() dans web/src/lib/domain/html.ts.
 *
 * CE N'EST PAS UNE PAGE, C'EST UNE REPONSE DE RECHERCHE. UNGM ne rend aucun
 * avis dans le HTML de /Public/Notice : la liste arrive d'un POST sur
 * /Public/Notice/Search, qui repond par des RANGEES HTML - pas du JSON.
 * D'ou une methode HTML servie par un POST : voir requeteUngm_ dans Json.gs.
 *
 * Les cellules qui portent une classe se reconnaissent a elle ; les autres
 * se reperent a leur VOISINE - la publication suit l'echeance, le type suit
 * l'agence, et le pays est la derniere. Se fier au rang absolu casserait a
 * la premiere colonne ajoutee.
 */
var MOIS_UNGM = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
};

/** "15-Sep-2026 13:00" -> "2026-09-15". L'heure est ecartee. */
function dateUngm_(valeur) {
  var m = /(\d{1,2})-([A-Za-z]{3})-(\d{4})/.exec(String(valeur || ''));
  if (!m) return null;
  var mois = MOIS_UNGM[m[2].toLowerCase()];
  if (!mois) return null;
  var jour = m[1].length < 2 ? '0' + m[1] : m[1];
  if (Number(jour) < 1 || Number(jour) > 31) return null;
  return m[3] + '-' + mois + '-' + jour;
}

/**
 * Les cellules d'une rangee, dans l'ordre, avec leur classe.
 *
 * On decoupe sur l'ouverture des cellules plutot que d'apparier les
 * balises : la premiere cellule contient des div imbriques - boutons,
 * infobulles - qu'aucune expression non gourmande ne refermerait au bon
 * endroit. Ces div-la n'ont pas role="cell" : le decoupage les ignore.
 */
function cellulesUngm_(rangee) {
  var morceaux = String(rangee).split(/<div role="cell" class="tableCell/i);
  var cellules = [];
  for (var i = 1; i < morceaux.length; i++) {
    var finClasse = morceaux[i].indexOf('"');
    // Le contenu commence apres la balise ouvrante, pas apres la classe :
    // il reste sinon la fin du tag (data-description, et le chevron).
    var ouvert = morceaux[i].indexOf('>');
    // ET IL S'ARRETE AU PREMIER </div>. La derniere cellule d'une rangee
    // est suivie du <script> qui colore les echeances proches : sans cette
    // borne, le pays du dernier avis vaut trente lignes de JavaScript.
    var ferme = morceaux[i].indexOf('</div>', ouvert);
    cellules.push({
      classe: finClasse === -1 ? ''
        : morceaux[i].slice(0, finClasse).replace(/^\s+|\s+$/g, ''),
      texte: nettoyerHtml(ouvert === -1 ? ''
        : morceaux[i].slice(ouvert + 1, ferme === -1 ? undefined : ferme))
    });
  }
  return cellules;
}

/** "Multiple destinations" designe un avis regional, pas un pays. */
function paysUngm_(valeur) {
  var net = String(valeur || '').replace(/^\s+|\s+$/g, '');
  if (!net || /multiple/i.test(net)) return '';
  return net;
}

function analyserPageUngm(html, source) {
  if (!html) return [];
  var rangees = String(html).split(/<div role="row"[^>]*data-noticeid="/i);
  var resultats = [];
  var vus = {};

  for (var i = 1; i < rangees.length; i++) {
    var rangee = rangees[i];
    var id = /^(\d+)/.exec(rangee);
    // La meme rangee revient dans le fragment : une fois pour la liste,
    // une fois pour le gabarit mobile.
    if (!id || vus[id[1]]) continue;

    // Le titre vit dans son propre span, jamais dans la cellule brute : la
    // cellule porte aussi le libelle du lien "Open in a new window".
    var titreBrut = /<span class="ungm-title[^"]*"[^>]*>([\s\S]*?)<\/span>/i
      .exec(rangee);
    var titre = nettoyerHtml(titreBrut ? titreBrut[1] : '');
    if (!titre) continue;
    vus[id[1]] = true;

    var cellules = cellulesUngm_(rangee);
    var iEcheance = -1;
    var iAgence = -1;
    var nues = [];
    var reference = '';
    for (var c = 0; c < cellules.length; c++) {
      var classe = cellules[c].classe;
      if (iEcheance === -1 && classe.indexOf('deadline') !== -1) iEcheance = c;
      if (iAgence === -1 && classe === 'resultAgency') iAgence = c;
      if (!reference && classe === 'resultInfo1') reference = cellules[c].texte;
      if (!classe) nues.push(cellules[c]);
    }
    function nue_(rang) {
      var cel = cellules[rang];
      return (cel && !cel.classe) ? cel.texte : '';
    }

    resultats.push(normalizeOpportunity({
      title: titre,
      url: 'https://www.ungm.org/Public/Notice/' + id[1],
      summary: reference,
      deadline: iEcheance >= 0 ? dateUngm_(cellules[iEcheance].texte) : null,
      published: dateUngm_(nue_(iEcheance + 1)),
      org: iAgence >= 0 ? cellules[iAgence].texte : '',
      type: nue_(iAgence + 1),
      country: paysUngm_(nues.length ? nues[nues.length - 1].texte : '')
    }, source));
  }
  return resultats;
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
    analyserPageUngm: analyserPageUngm,
    dateUngm_: dateUngm_,
    ANALYSEURS_HTML: ANALYSEURS_HTML
  };
}
