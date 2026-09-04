/**
 * TenderPilot - collecte HTML.
 *
 * Certaines sources n'ont pas de flux RSS mais affichent leurs annonces
 * directement dans la page (contenu servi par le serveur, pas par du
 * JavaScript). On les lit par extraction de motif.
 *
 * Cette collecte est FRAGILE : le jour ou le site refait sa mise en page,
 * l'extraction ne trouve plus rien. Chaque site a donc son analyseur dedie,
 * nomme dans la methode de la source (par exemple "HTML:gouv.bj"). On n'ecrit
 * un analyseur que pour un site qui le merite, jamais un extracteur generique.
 */

import { EntreeFlux, extraireDeadline, lireDateFlux, reparerCaracteres, decoderEntites, nettoyerLien, retirerBalises } from "./rss";

/** Nettoie un fragment HTML en texte lisible. */
export function nettoyerHtml(fragment: string): string {
  if (!fragment) return "";
  return reparerCaracteres(decoderEntites(fragment.replace(/<[^>]*>/g, " ")))
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Analyseur du portail national beninois gouv.bj.
 *
 * Chaque annonce est un bloc <article> contenant son type, son objet, sa
 * date de cloture ("Cloture : 14 Jul 2026") et un lien vers /opportunite/.
 */
export function analyserGouvBj(html: string): EntreeFlux[] {
  if (!html) return [];
  const blocs = html.match(/<article\b[\s\S]*?<\/article>/gi) ?? [];

  return blocs.map((bloc): EntreeFlux | null => {
    const lien = /href="(https:\/\/www\.gouv\.bj\/opportunite\/[^"]+)"/i.exec(bloc);
    if (!lien) return null;

    const texte = nettoyerHtml(bloc);
    let titre = texte.split(/Cl[oô]ture|En savoir/i)[0].trim();
    // Retirer le prefixe rubrique + type, identique sur chaque annonce.
    titre = titre
      .replace(/^March[eé]s publics\s+/i, "")
      .replace(/^(Manifest[a-z]*\s+d['\s]?int[eé]r[eê]t|Avis g[eé]n[eé]ral|DRP|Appel d['\s]?offres?|Avis)\s+/i, "")
      .trim();
    if (!titre) titre = texte.slice(0, 80);

    return {
      titre,
      lien: nettoyerLien(lien[1]),
      publie: null,
      resume: texte.slice(0, 400),
      deadline: extraireDeadline(texte),
    };
  }).filter((e): e is EntreeFlux => e !== null && Boolean(e.titre));
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
 * publication, pas une echeance : on ne la prend donc pas pour une deadline.
 */
export function analyserAfdb(html: string): EntreeFlux[] {
  if (!html) return [];
  const motif = /<a\s[^>]*href="(\/en\/documents\/[a-z0-9-]{20,})"[^>]*>([^<]{10,200})<\/a>/gi;
  const prefixe = /^\s*(EOI|AMI|SPN|GPN|IFB|RFP|RFQ)\b/i;
  const entrees: EntreeFlux[] = [];
  const vus = new Set<string>();
  let m: RegExpExecArray | null;

  while ((m = motif.exec(html)) !== null) {
    const titre = nettoyerHtml(m[2]);
    if (!prefixe.test(titre)) continue;
    const lien = "https://www.afdb.org" + m[1];
    if (vus.has(lien)) continue;
    vus.add(lien);

    entrees.push({
      titre,
      lien,
      publie: null,
      resume: titre,
      deadline: extraireDeadline(titre),
    });
  }
  return entrees.filter((e) => e.titre);
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
export function analyserEnabel(html: string): EntreeFlux[] {
  if (!html) return [];
  const cartes = html.match(/<div\b[^>]*class="[^"]*card--tenders[^"]*"[\s\S]*?(?=<div\b[^>]*class="[^"]*card--tenders|<footer|$)/gi) ?? [];

  return cartes.map((carte): EntreeFlux | null => {
    const titre = nettoyerHtml(/<p class="h5">([\s\S]*?)<\/p>/i.exec(carte)?.[1] ?? "");
    if (!titre) return null;

    const champ = (cle: string): string => nettoyerHtml(
      new RegExp(`<strong[^>]*>\\s*${cle}\\s*:?\\s*</strong>([^<]*)`, "i")
        .exec(carte)?.[1] ?? "");

    // "Close" signale un marche dont la remise est passee : on l'ecarte.
    if (/^clos/i.test(champ("Status"))) return null;

    const cloture = champ("Closing date");
    const pays = champ("Country");
    const lien = nettoyerLien(
      /href="(https:\/\/www\.enabel\.be\/[^"#]*(?:publication|procurement)[^"#]*)"/i
        .exec(carte)?.[1] ?? "https://www.enabel.be/public-procurement/");

    return {
      titre,
      lien,
      publie: null,
      resume: [pays && `Pays : ${pays}`, cloture && `Closing date : ${cloture}`,
               nettoyerHtml(carte).slice(0, 300)].filter(Boolean).join(" - "),
      // extraireDeadline sait deja lire "Closing date : 02 September 2026".
      deadline: cloture ? extraireDeadline(`closing date ${cloture}`) : null,
    };
  }).filter((e): e is EntreeFlux => e !== null);
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
export function analyserArmp(html: string): EntreeFlux[] {
  if (!html) return [];
  const motif = /<div class="timer[^"]*">\s*<i>\s*<\/i>\s*([^<]{6,40}?)\s*<\/div>[\s\S]{0,200}?<a class="title_cat" href="(https:\/\/armp\.bj\/[^"]+)"\s+title="([^"]{10,300})"/gi;

  const entrees: EntreeFlux[] = [];
  const vus = new Set<string>();
  let m: RegExpExecArray | null;

  while ((m = motif.exec(html)) !== null) {
    const lien = nettoyerLien(m[2]);
    if (vus.has(lien)) continue;
    vus.add(lien);

    const titre = nettoyerHtml(m[3]);
    if (!titre) continue;

    entrees.push({
      titre,
      lien,
      // "02 March 2026" : la vignette porte la date de parution.
      publie: lireDateFlux(nettoyerHtml(m[1])),
      resume: titre,
      // La vignette n'affiche aucune echeance : la lire exigerait d'ouvrir
      // chaque avis. On prefere ne rien annoncer plutot qu'une fausse date.
      deadline: null,
      type: /manifestation/i.test(titre) ? "AMI" : "Appel d'offres",
    });
  }
  return entrees;
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
export function analyserSbee(html: string): EntreeFlux[] {
  if (!html) return [];
  const blocs = html.match(/<div class="blog-item-wrapper[\s\S]*?(?=<div class="blog-item-wrapper|<footer|$)/gi) ?? [];

  return blocs.map((bloc): EntreeFlux | null => {
    const titre = nettoyerHtml(/<h3>([\s\S]*?)<\/h3>/i.exec(bloc)?.[1] ?? "");
    if (!titre) return null;

    // Chaque champ est un libelle en gras suivi de sa valeur apres un <br>.
    const champ = (cle: string): string => nettoyerHtml(
      new RegExp("<strong>\\s*" + cle + "\\s*</strong>(?:\\s*</span>)?\\s*<br\\s*/?>([^<]*)", "i")
        .exec(bloc)?.[1] ?? "");

    const reference = nettoyerHtml(
      /<p class="job-details[^"]*">([\s\S]*?)<\/p>/i.exec(bloc)?.[1] ?? "");
    const type = champ("Type de march[e\u00e9]");
    const limite = champ("Date limite de d[e\u00e9]p[o\u00f4]t");
    const publie = champ("Date de publication");

    // MESURE DU 2026-09-02 : ce lien etait code en dur sur la page de
    // liste, identique pour les sept avis. Or clesDedup fabrique une cle a
    // partir de l URL : les sept avis partageaient donc la meme cle, le
    // premier s inscrivait et les six autres etaient pris pour des
    // doublons. La source beninoise la plus complete livrait UN marche sur
    // SEPT, sans le moindre message. Le site expose pourtant un lien par
    // avis - /demande-dossier/appel-doffre/113, /118, /122 - et un PDF.
    const lienAvis = nettoyerLien(
      /href="([^"]*\/demande-dossier\/appel-doffre\/[0-9]+)"/i.exec(bloc)?.[1]
      || /href="([^"]*\/uploads\/[^"]+)"/i.exec(bloc)?.[1]
      || "https:\/\/marches-publics.sbee.bj\/");

    return {
      titre,
      lien: lienAvis,
      // "27-08-2026 07:00:00" : on ne garde que la date.
      publie: publie ? extraireDeadline("date limite " + jourSeul(publie)) : null,
      resume: [type && ("Type : " + type), reference].filter(Boolean).join(" - "),
      // "06-10-2026 10:00:00" est en jour-mois-annee.
      deadline: limite ? extraireDeadline("date limite " + limite) : null,
      organisation: "SBEE - Societe beninoise d'energie electrique",
      type: type || null,
    };
  }).filter((e): e is EntreeFlux => e !== null);
}

/**
 * Analyseur des marches publics de la SONEB (eau, Benin).
 *
 * Table Drupal : une ligne par avis, avec la date de parution dans un
 * attribut <time datetime>, le titre porte par un lien /marche-public/, et
 * la date de cloture dans sa propre colonne.
 */
export function analyserSoneb(html: string): EntreeFlux[] {
  if (!html) return [];
  const lignes = html.match(/<tr>[\s\S]*?<\/tr>/gi) ?? [];

  return lignes.map((ligne): EntreeFlux | null => {
    const lienMatch = /<a href="(\/marche-public\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(ligne);
    if (!lienMatch) return null;
    const titre = nettoyerHtml(lienMatch[2]);
    if (!titre) return null;

    // L'attribut datetime est machine-lisible : on le prefere au texte.
    const publie = /views-field-created[^>]*>[\s\S]*?datetime="([^"]+)"/i.exec(ligne)?.[1];
    const cloture = nettoyerHtml(
      /views-field-field-date-de-cloture[^>]*>([^<]*)/i.exec(ligne)?.[1] ?? "");

    return {
      titre,
      lien: nettoyerLien("https://web.soneb.bj" + lienMatch[1]),
      publie: publie ? lireDateFlux(publie) : null,
      resume: cloture ? ("Cloture : " + cloture) : titre,
      deadline: cloture ? extraireDeadline("date limite " + cloture) : null,
      organisation: "SONEB - Societe nationale des eaux du Benin",
    };
  }).filter((e): e is EntreeFlux => e !== null);
}

/**
 * Analyseur des appels d'offres de l'ARAA (agence agricole de la CEDEAO).
 *
 * Le plus propre des cinq : chaque avis est un <div class="item-offre"> et
 * la date limite est donnee en ISO dans un attribut datetime. Aucune
 * interpretation de texte n'est necessaire.
 */
export function analyserAraa(html: string): EntreeFlux[] {
  if (!html) return [];
  const blocs = html.match(/<div class="item-offre">[\s\S]*?(?=<div class="item-offre">|$)/gi) ?? [];

  return blocs.map((bloc): EntreeFlux | null => {
    const lienMatch = /<h2 class="title"><a href="(\/fr\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(bloc);
    if (!lienMatch) return null;
    const titre = nettoyerHtml(lienMatch[2]);
    if (!titre) return null;

    const limite = /datetime="([^"]+)"/i.exec(bloc)?.[1] ?? null;

    return {
      titre,
      lien: nettoyerLien("https://www.araa.org" + lienMatch[1]),
      publie: null,
      resume: titre,
      deadline: limite ? lireDateFlux(limite) : null,
      organisation: "ARAA - Agence regionale pour l'agriculture et l'alimentation (CEDEAO)",
    };
  }).filter((e): e is EntreeFlux => e !== null);
}

/**
 * Analyseur des marches publics de la BCEAO.
 *
 * Couvre les huit pays de l'UMOA, pas seulement le Benin : c'est voulu, un
 * soumissionnaire beninois peut repondre a un marche de la sous-region.
 *
 * Chaque avis est un <div class="itemDoc views-row"> ou la reference et la
 * date limite partagent le meme <span class="subTtr">, le titre etant dans
 * un <span class="ttr"> voisin.
 */
export function analyserBceao(html: string): EntreeFlux[] {
  if (!html) return [];
  const blocs = html.match(/<div class="itemDoc views-row">[\s\S]*?(?=<div class="itemDoc views-row">|$)/gi) ?? [];

  return blocs.map((bloc): EntreeFlux | null => {
    const lien = /<a href="(https:\/\/www\.bceao\.int\/fr\/appels-offres\/[^"]+)"/i.exec(bloc)?.[1];
    const titre = nettoyerHtml(/<span class="ttr">([\s\S]*?)<\/span>/i.exec(bloc)?.[1] ?? "");
    if (!lien || !titre) return null;

    const publie = nettoyerHtml(
      /<span class="infoFile">[\s\S]*?<time[^>]*>([^<]*)<\/time>/i.exec(bloc)?.[1] ?? "");
    const sousTitre = nettoyerHtml(
      /<span class="subTtr">([\s\S]*?)<\/span>/i.exec(bloc)?.[1] ?? "");

    return {
      titre,
      lien: nettoyerLien(lien),
      // "24 Aout 2026" : mois francais, illisible par new Date().
      publie: publie ? extraireDeadline("date limite " + publie) : null,
      resume: sousTitre || titre,
      // Le sous-titre porte "AC/K00/APD/012/2026  Date limite le 08 Septembre 2026".
      deadline: extraireDeadline(sousTitre),
      organisation: "BCEAO - Banque centrale des Etats de l'Afrique de l'Ouest",
    };
  }).filter((e): e is EntreeFlux => e !== null);
}

/**
 * Analyseur des appels d'offres de l'ABE (environnement, Benin).
 *
 * Chaque avis est une carte : un bandeau donnant le type, un bloc "DELAI DE
 * SOUMISSION" avec la date, et un bloc "OBJET" avec l'intitule reel.
 *
 * Contrairement a Enabel, on ne filtre PAS les avis expires : l'ABE ne
 * propose aucun filtre d'URL, et les ecarter viderait la source. Le moteur
 * calcule deja le statut de delai et n'envoie pas d'alerte sur un avis echu.
 */
export function analyserAbe(html: string): EntreeFlux[] {
  if (!html) return [];
  const cartes = html.match(/<div class="[^"]*marche-item[^"]*"[\s\S]*?(?=<div class="[^"]*marche-item[^"]*"|<footer|$)/gi) ?? [];

  return cartes.map((carte): EntreeFlux | null => {
    // Le bloc OBJET porte l'intitule reel ; le bandeau ne donne que le type.
    const objet = nettoyerHtml(
      /<p[^>]*>OBJET<\/p>\s*<p[^>]*>([\s\S]*?)<\/p>/i.exec(carte)?.[1] ?? "");
    const type = nettoyerHtml(
      /py-3 header[^"]*">[\s\S]*?<p class="white[^"]*">([^<]*)<\/p>/i.exec(carte)?.[1] ?? "");
    const titre = objet || type;
    if (!titre) return null;
    // Quelques cartes ont leur bandeau en commentaire : la lecture retombe
    // alors sur l'objet. Un libelle long n'est pas un type de marche.
    //
    // MESURE DU 2026-09-02 : la limite de longueur ne suffisait pas. Deux
    // cartes portaient une REFERENCE dans leur bandeau - "AVIS N°
    // 001/2026/PRMP-ABE/APM du 19 Janvier 2026", 45 caracteres - qui
    // atterrissait dans la colonne Type et rendait le filtre inutilisable.
    // Un type de marche ne porte ni numero ni suite de chiffres.
    const ressembleAUneReference = /N\s*[°o]|\d{3}/i.test(type);
    const typeCourt = type && type.length <= 60 && !ressembleAUneReference
      ? type : "";

    const limite = nettoyerHtml(
      /DE SOUMISSION<\/p>\s*<p[^>]*>([^<]*)<\/p>/i.exec(carte)?.[1] ?? "");
    const lien = /<a[^>]+href="(https:\/\/www\.abe\.bj\/[^"]+)"[^>]*>\s*CONSULTER/i.exec(carte)?.[1];

    return {
      titre,
      lien: nettoyerLien(lien ?? "https://www.abe.bj/appels-doffres/"),
      publie: null,
      resume: [typeCourt && ("Type : " + typeCourt), limite && ("Delai : " + limite)]
        .filter(Boolean).join(" - ") || titre,
      // "28 Aout 2026 a 05h00"
      deadline: limite ? extraireDeadline("date limite " + limite) : null,
      organisation: "ABE - Agence beninoise pour l'environnement",
      type: typeCourt || null,
    };
  }).filter((e): e is EntreeFlux => e !== null);
}

/** "27-08-2026 07:00:00" -> "27-08-2026". */
function jourSeul(valeur: string): string {
  return valeur.trim().split(/\s+/)[0];
}

/**
 * Analyseur du portail e-procurement de DEDRAS-ONG (Benin).
 *
 * Une ONG beninoise qui publie ses propres consultations : demandes de
 * cotation, AMI, appels a concurrence. Ce genre de source locale echappe
 * aux grands agregateurs, et elle achete beaucoup - vehicules, informatique,
 * etudes, equipements medicaux, formation.
 *
 * Chaque avis est une carte Bootstrap ou les champs suivent tous le meme
 * motif : un libelle dans un <span>, puis la valeur dans le <span> du
 * <div class="row"> suivant.
 *
 * Attention : le titre apparait DEUX fois, d'abord dans un <h5> mis en
 * commentaire, puis dans un div en gras. On lit le second - le commentaire
 * n'est pas ce que voit le visiteur.
 */
export function analyserDedras(html: string): EntreeFlux[] {
  if (!html) return [];
  // Les commentaires HTML portent une copie du titre : on les retire d'abord.
  const propre = html.replace(/<!--[\s\S]*?-->/g, " ");
  const cartes = propre.match(/<div class="card"[\s\S]*?(?=<div class="card"|<footer|$)/gi) ?? [];

  return cartes.map((carte): EntreeFlux | null => {
    const titre = nettoyerHtml(
      /<div class="" style="font-weight:bold;">([\s\S]*?)<\/div>/i.exec(carte)?.[1] ?? "");
    if (!titre) return null;

    // "<span>Libelle</span></div> <div class="row"><span ...>valeur</span>"
    const champ = (cle: string): string => nettoyerHtml(
      new RegExp(`<span>\\s*${cle}\\s*</span>\\s*</div>\\s*<div class="row">`
        + `<span[^>]*>([^<]*)</span>`, "i").exec(carte)?.[1] ?? "");

    const type = champ("Type[^<]*");
    const limite = champ("Limite de d[eé]pot");
    const publie = champ("Date de publication");
    const reference = nettoyerHtml(
      /R[eé]f\s*:\s*([^<]+)/i.exec(carte)?.[1] ?? "");

    // LE LIEN DE LA FICHE, PAS CELUI DE LA LISTE. Chaque carte porte le
    // bouton "Details" vers /tenderforapplicationbis/<uuid> : sans lui, les
    // 98 avis renvoyaient tous a la meme page et il fallait y rechercher
    // l'annonce a la main. On retombe sur la liste seulement si le bouton
    // manque - mieux vaut un lien large qu'aucun lien.
    const fiche = /href="(https:\/\/eprocurement\.dedras\.org\/tenderforapplication[^"]*)"/i
      .exec(carte)?.[1];

    return {
      titre,
      lien: nettoyerLien(fiche ?? "https://eprocurement.dedras.org/toutvoir"),
      // "2026-08-19 16:26:03" : deja en annee-mois-jour.
      publie: publie ? lireDateFlux(publie.slice(0, 10)) : null,
      resume: [type && `Type : ${type}`, reference && `Reference : ${reference}`]
        .filter(Boolean).join(" - ") || titre,
      deadline: limite ? lireDateFlux(limite.slice(0, 10)) : null,
      organisation: "DEDRAS-ONG",
      type: type || null,
    };
  }).filter((e): e is EntreeFlux => e !== null);
}

/**
 * Analyseur des appels a projets de l'AFD.
 *
 * Ce ne sont pas des marches publics mais des financements : l'AFD met des
 * fonds a disposition, des organisations candidatent. La difference compte
 * pour l'utilisateur, elle est portee par le type "Appel a projets".
 *
 * Chaque appel est une carte DSFR. Le detail porte les deux dates d'un coup,
 * separees par un tiret : "29 juillet 2026 - 9 octobre 2026". La premiere
 * est l'ouverture, la seconde la cloture.
 *
 * Le badge affiche "Cloture dans 1 mois et 9 jours" : une duree relative,
 * inutilisable comme date. On lit le detail, jamais le badge.
 */
export function analyserAfd(html: string): EntreeFlux[] {
  if (!html) return [];
  const cartes = html.match(/<div class="views-row fr-col-12">[\s\S]*?(?=<div class="views-row fr-col-12">|<footer|$)/gi) ?? [];

  return cartes.map((carte): EntreeFlux | null => {
    const lienMatch = /<a href="(\/fr\/appels-a-projets\/[^"?]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(carte);
    if (!lienMatch) return null;
    const titre = nettoyerHtml(lienMatch[2]);
    if (!titre) return null;

    const detail = nettoyerHtml(
      /<p class="fr-card__detail">([^<]*)<\/p>/i.exec(carte)?.[1] ?? "");
    // "29 juillet 2026 - 9 octobre 2026" : ouverture puis cloture.
    const bornes = detail.split(/\s+-\s+/);
    const ouverture = bornes.length > 1 ? bornes[0] : "";
    const cloture = bornes.length > 1 ? bornes[1] : detail;

    return {
      titre,
      lien: nettoyerLien("https://www.afd.fr" + lienMatch[1]),
      publie: ouverture ? extraireDeadline("date limite " + ouverture) : null,
      resume: detail ? "Periode : " + detail : titre,
      deadline: cloture ? extraireDeadline("date limite " + cloture) : null,
      organisation: "AFD - Agence francaise de developpement",
      type: "Appel a projets",
    };
  }).filter((e): e is EntreeFlux => e !== null);
}

/**
 * Analyseur des programmes de financement de Wellcome Trust.
 *
 * La page /research-funding/schemes embarque un JSON dans __NEXT_DATA__
 * contenant initialListings : un tableau de programmes avec titre, statut
 * (Open/Closed), date de cloture, montant, duree et pays eligible.
 *
 * Seuls les programmes ouverts (scheme_status === "Open") sont remontes :
 * les programmes clos ne representent rien a soumissionner.
 */
export function analyserWellcome(html: string): EntreeFlux[] {
  if (!html) return [];
  // Le JSON est dans un script __NEXT_DATA__
  const match = /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i.exec(html);
  if (!match) return [];

  let data: unknown;
  try {
    data = JSON.parse(match[1]);
  } catch {
    return [];
  }

  // Le cast doit decrire toute la chaine : un simple Record<string, unknown>
  // rend .props inconnu, et .pageProps ne compile plus.
  const listings = (data as {
    props?: { pageProps?: { initialListings?: unknown } };
  })?.props?.pageProps?.initialListings;
  if (!Array.isArray(listings)) return [];

  return listings
    .filter((l: Record<string, unknown>) => l.scheme_status === "Open")
    .map((l): EntreeFlux | null => {
      const titre = String(l.title ?? "").trim();
      if (!titre) return null;

      const url = String(l.url ?? "").trim();
      const lien = url ? nettoyerLien("https://wellcome.org" + url) : "";
      const resume = nettoyerHtml(String(l.listing_summary ?? ""));
      const duree = nettoyerHtml(String(l.duration_of_funding ?? ""));
      const montant = nettoyerHtml(String(l.level_of_funding ?? ""));
      const cloture = String(l.scheme_closes_for_applications ?? "").trim();
      const freq = String(l.frequency ?? "").trim();

      const zones = Array.isArray(l.location_ref)
        ? (l.location_ref as Record<string, unknown>[])
            .map((z) => String(z.name ?? "").trim())
            .filter(Boolean)
        : [];

      const resumeComplet = [
        resume,
        montant && `Budget : ${montant}`,
        duree && `Duree : ${duree}`,
        zones.length && `Zones : ${zones.join(", ")}`,
        freq && `Frequence : ${freq}`,
      ].filter(Boolean).join(" - ").slice(0, 500);

      return {
        titre,
        lien,
        publie: null,
        resume: resumeComplet,
        deadline: cloture ? extraireDeadline(`closing date ${cloture}`) : null,
        organisation: "Wellcome Trust",
        type: "Subvention",
      };
    })
    .filter((e): e is EntreeFlux => e !== null);
}

/**
 * Analyseur des tender calendars de UNICEF Supply Division.
 *
 * La page /supply/tender-calendars liste les categories de marches (Education,
 * Medical Devices, Medicines, Nutrition, SIE, Vaccines, WASH) avec des liens
 * vers des sous-pages HTML et des PDFs de calendrier.
 *
 * Chaque categorie est remontee comme une entree. Les dates extraites des
 * sous-pages HTML (quand disponibles) sont incluses dans le resume. Les PDFs
 * sont references comme lien secondaire.
 */
export function analyserUnicefSupply(html: string): EntreeFlux[] {
  if (!html) return [];
  const entrees: EntreeFlux[] = [];
  const vus = new Set<string>();

  // Extraire les liens vers les sous-pages de tender calendars
  const subPages = [...html.matchAll(/href="(\/supply\/(?:documents\/)?[a-z-]+tender-calendar[^"]*)"/gi)];
  for (const m of subPages) {
    const slug = m[1];
    if (vus.has(slug)) continue;
    vus.add(slug);

    // Titre depuis le slug : "education-tender-calendar" -> "Education"
    const slugClean = slug.replace(/.*\//, "");
    const nomCategorie = slugClean
      .replace(/-tender-calendar.*$/i, "")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const lien = nettoyerLien("https://www.unicef.org" + slug);

    entrees.push({
      titre: `UNICEF Supply - ${nomCategorie} tender calendar`,
      lien,
      publie: null,
      resume: `Calendrier des marches UNICEF pour ${nomCategorie}. Consultez la page pour les dates de soumission.`,
      deadline: null,
      organisation: "UNICEF Supply Division",
      type: "Appel d'offres",
    });
  }

  // Extraire les liens PDF de calendriers
  const pdfLinks = [...html.matchAll(/href="(\/supply\/media\/[^"']+\.pdf)"/gi)];
  for (const m of pdfLinks) {
    const pdfUrl = m[1];
    if (vus.has(pdfUrl)) continue;
    vus.add(pdfUrl);

    // Titre depuis le nom du fichier
    const nomFichier = pdfUrl.split("/").pop()?.replace(/\.pdf$/i, "") ?? "";
    const titre = nomFichier
      .replace(/-/g, " ")
      .replace(/UNICEF\s*/i, "")
      .replace(/file\s*/i, "")
      .trim();

    entrees.push({
      titre: `UNICEF Supply - ${titre}`,
      lien: nettoyerLien("https://www.unicef.org" + pdfUrl),
      publie: null,
      resume: `Calendrier des marches UNICEF. PDF a consulter pour les dates de soumission.`,
      deadline: null,
      organisation: "UNICEF Supply Division",
      type: "Appel d'offres",
    });
  }

  // Extraire les liens vers d'autres pages de calendars (SIE, Vaccines, WASH)
  const otherPages = [...html.matchAll(/href="(\/supply\/(?:safe-injection|tentative-vaccine|water-sanitation)[^"]*)"/gi)];
  for (const m of otherPages) {
    const slug = m[1];
    if (vus.has(slug)) continue;
    vus.add(slug);

    const slugClean = slug.replace(/.*\//, "");
    const nomCategorie = slugClean
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .replace(/Tender Calendar.*$/i, "tender calendar")
      .replace(/Tender Issuance Dates$/i, "tender issuance dates");

    entrees.push({
      titre: `UNICEF Supply - ${nomCategorie}`,
      lien: nettoyerLien("https://www.unicef.org" + slug),
      publie: null,
      resume: `Calendrier des marches UNICEF. Consultez la page pour les dates de soumission.`,
      deadline: null,
      organisation: "UNICEF Supply Division",
      type: "Appel d'offres",
    });
  }

  return entrees;
}

/**
 * Analyseur des opportunites de financement de Grand Challenges (Gates Foundation).
 *
 * La page /grant-opportunities embarque un JSON dans __NEXT_DATA__
 * contenant initialData.listing.data : un tableau de defis avec titre,
 * dates, domaine, lien de candidature et description.
 *
 * Seuls les defis dont la date de fin est dans le futur sont remontes :
 * les defis expires ne representent rien a soumissionner.
 */
export function analyserGrandChallenges(html: string): EntreeFlux[] {
  if (!html) return [];
  // Le JSON est dans un script avec ou sans id="__NEXT_DATA__"
  const match = /<script[^>]*>([\s\S]*?)window\.process\s*=\s*\{env:/i.exec(html)
    ?? /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i.exec(html);
  if (!match) return [];

  // Chercher le JSON complet dans la page
  const jsonMatch = /__NEXT_DATA__[^{]*(\{[\s\S]*?\})\s*;?\s*<\/script>/i.exec(html);
  if (!jsonMatch) return [];

  let data: unknown;
  try {
    data = JSON.parse(jsonMatch[1]);
  } catch {
    return [];
  }

  const listing = (data as {
    props?: { pageProps?: { initialData?: { listing?: { data?: unknown } } } };
  })?.props?.pageProps?.initialData?.listing?.data;
  if (!Array.isArray(listing)) return [];

  const maintenant = Date.now();

  return listing
    .filter((g: Record<string, unknown>) => {
      // Filtrer les defis expires
      const dateEnd = typeof g.date_end === "number" ? g.date_end * 1000 : 0;
      return !g.hidden && dateEnd > maintenant;
    })
    .map((g): EntreeFlux | null => {
      const titre = String(g.title ?? "").trim();
      if (!titre) return null;

      // LE LIEN QUI REPOND. Mesure du 2026-09-02, sur les trois defis
      // ouverts : "www.grandchallenges.org" + le slug rend 404 pour les
      // TROIS - c'etait donc un lien systematiquement mort. Le champ
      // apply_link, lui, repond 200 pour les trois et mene la ou l'on
      // candidate. La fiche descriptive vit sur un autre hote,
      // gcgh.grandchallenges.org, qui rend 200 pour deux defis sur trois :
      // elle sert de repli, jamais de premier choix.
      const slug = String(g.url ?? "").trim();
      const candidature = String(g.apply_link ?? "").trim();
      const lien = nettoyerLien(candidature
        || (slug ? "https://gcgh.grandchallenges.org" + slug : ""));
      const challenge = String(g.challenge_goal ?? "").trim();
      const initiative = String(g.initiative_title ?? "").trim();
      const description = nettoyerHtml(String(g.opportunity_description_summary ?? g.opportunity_description ?? ""));
      const dateEnd = typeof g.date_end === "number" ? new Date(g.date_end * 1000) : null;

      const resumeComplet = [
        description,
        challenge && `Domaine : ${challenge}`,
        initiative && `Initiative : ${initiative}`,
        dateEnd && `Cloture : ${dateEnd.toLocaleDateString("fr-FR")}`,
      ].filter(Boolean).join(" - ").slice(0, 500);

      return {
        titre,
        lien,
        publie: null,
        resume: resumeComplet,
        deadline: dateEnd ? dateEnd.toISOString().slice(0, 10) : null,
        organisation: "Grand Challenges / Gates Foundation",
        type: "Subvention",
      };
    })
    .filter((e): e is EntreeFlux => e !== null);
}

/** Analyseurs disponibles, par nom de methode "HTML:<nom>". */
/**
 * Analyseur du Vergabemarktplatz de la GIZ, la cooperation allemande.
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
 * lireDateFlux vaut le 9 FEVRIER : new Date() lit le point a l'americaine.
 * On decoupe donc les trois nombres a la main. Une echeance fausse d'un
 * jour fait rater un depot ; une echeance fausse de sept mois aussi.
 */
const GIZ_RACINE = "https://ausschreibungen.giz.de";

/** "24.09.2026" -> "2026-09-24". Rien d'autre n'est accepte. */
export function dateAllemande(valeur: string): string | null {
  const m = /^\s*(\d{1,2})\.(\d{1,2})\.(\d{4})\s*$/.exec(valeur || "");
  if (!m) return null;
  const jour = m[1].padStart(2, "0");
  const mois = m[2].padStart(2, "0");
  if (Number(mois) < 1 || Number(mois) > 12) return null;
  if (Number(jour) < 1 || Number(jour) > 31) return null;
  return `${m[3]}-${mois}-${jour}`;
}

export function analyserGiz(html: string): EntreeFlux[] {
  if (!html) return [];
  const lignes = html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  const sortie: EntreeFlux[] = [];

  for (const ligne of lignes) {
    const lien = /href="([^"]*projectForwarding\.do\?pid=\d+)"/i.exec(ligne);
    if (!lien) continue;

    // Le tableau de la GIZ ne ferme pas toujours ses <td> : on decoupe sur
    // le debut de la cellule suivante plutot que sur la balise fermante.
    const cellules = (ligne.match(/<td\b[^>]*>[\s\S]*?(?=<td\b|<\/tr>)/gi) ?? [])
      .map((c) => nettoyerHtml(c));
    if (cellules.length < 4) continue;

    const nature = cellules[3];
    // Marche attribue ou avenant : rien a soumissionner.
    if (/vergebener auftrag/i.test(nature)) continue;
    if (/auftrags.nderung/i.test(nature)) continue;

    const titre = cellules[2];
    if (!titre) continue;

    const type = /\bTNW\b|teilnahmewettbewerb/i.test(nature)
      ? "AMI"
      : "Appel d'offres";

    const morceaux = [`Procedure GIZ : ${nature}`];
    if (cellules[4]) morceaux.push(`Pouvoir adjudicateur : ${cellules[4]}`);

    sortie.push({
      titre,
      lien: nettoyerLien(GIZ_RACINE + lien[1].replace(GIZ_RACINE, "")),
      publie: dateAllemande(cellules[0]),
      resume: morceaux.join(" - "),
      deadline: dateAllemande(cellules[1]),
      organisation: cellules[4] || null,
      type,
    });
  }

  return sortie;
}

/**
 * Analyseur des offres d'Expertise France, sur sa plateforme Gestmax.
 *
 * MESURE DU 2026-09-04 : 144 offres, dix par page, quinze pages, rendues
 * cote serveur. Chaque carte porte ce que TenderPilot cherche et que peu de
 * sources donnent d'un coup :
 *
 *   le titre                          dans le <h2> du lien
 *   la zone et le PAYS                deux <span class="country">
 *   le type de contrat                "Contrat de prestation de services"
 *   le secteur declare                listdiv-vac_thematique
 *   "Date limite de candidature"      une vraie echeance, JJ/MM/AAAA
 *
 * CE N'EST PAS QU'UN SITE D'EMPLOI. Expertise France y publie aussi ses
 * marches de prestation - "Recrutement d'une agence de communication pour
 * la realisation d'outils de communication, Benin" est une consultation,
 * pas un poste. Le type de contrat le dit, et normaliserType s'en sert.
 *
 * La pagination passe par {page} dans l'URL du registre : /search/index/
 * page/N. Rien de special a ecrire ici, le moteur s'en charge.
 */
const EF_RACINE = "https://expertise-france.gestmax.fr";

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
function typeExpertiseFrance(contrat: string): string | null {
  if (/\b(CDD|CDDU|CDI|stage|alternance|apprentissage)\b/i.test(contrat)) {
    return "Recrutement";
  }
  return null;
}

export function analyserExpertiseFrance(html: string): EntreeFlux[] {
  if (!html) return [];
  const cartes = html.match(
    /<div class="list-group-item[\s\S]*?(?=<div class="list-group-item|<div class="pager|$)/gi) ?? [];

  const sortie: EntreeFlux[] = [];
  for (const carte of cartes) {
    const lien = /<a href="([^"]*gestmax\.fr\/\d+\/\d+\/[^"]*)"/i.exec(carte);
    if (!lien) continue;

    const titre = nettoyerHtml(
      /<h2[^>]*>([\s\S]*?)<\/h2>/i.exec(carte)?.[1] ?? "")
      // Le gabarit ajoute un avertissement pour les lecteurs d'ecran :
      // il n'a rien a faire dans l'intitule d'un marche.
      .replace(/\(Nouvelle fen[eê]tre\)\s*$/i, "").trim();
    if (!titre) continue;

    // Deux <span class="country"> : la zone d'abord, le pays ensuite. On
    // garde le PAYS quand il existe - "TANZANIE" situe une annonce,
    // "AFRIQUE SUBSAHARIENNE" beaucoup moins.
    const lieux = [...carte.matchAll(
      /<span class="country">[\s\S]*?<strong>([\s\S]*?)<\/strong>/gi)]
      .map((m) => nettoyerHtml(m[1])).filter(Boolean);
    const pays = lieux.length > 1 ? lieux[lieux.length - 1] : lieux[0] ?? "";

    const contrat = nettoyerHtml(
      /<div class="text-blue-light listdiv-value">([\s\S]*?)<\/div>/i
        .exec(carte)?.[1] ?? "");
    const secteur = nettoyerHtml(
      /listdiv-vac_thematique[\s\S]*?<span class="listdiv-value">([\s\S]*?)<\/span>/i
        .exec(carte)?.[1] ?? "");
    // "Date limite de candidature : 24/09/2026 17:00" - extraireDeadline
    // reconnait deja l'annonce et la forme.
    const limite = nettoyerHtml(
      /<div class="text-grey listdiv-value">([\s\S]*?)<\/div>/i
        .exec(carte)?.[1] ?? "");

    const morceaux = [
      lieux.length > 1 ? `Zone : ${lieux[0]}` : "",
      contrat && `Contrat : ${contrat}`,
      secteur && `Secteur declare : ${secteur}`,
    ].filter(Boolean);

    sortie.push({
      titre,
      lien: nettoyerLien(lien[1].split("?")[0]),
      publie: null,
      resume: morceaux.join(" - "),
      deadline: extraireDeadline(limite),
      organisation: "Expertise France",
      type: typeExpertiseFrance(contrat),
      secteur: secteur || null,
      pays: pays || null,
    });
  }
  return sortie;
}

/**
 * Analyseur des appels d'offres de Plan International.
 *
 * MESURE DU 2026-09-04 : huit appels actifs, tous sur UNE seule page, en
 * clair. Chacun est un titre de niveau 3 suivi de ses paragraphes, puis
 * d'un bloc de telechargement :
 *
 *   <h3 class="wp-block-heading">ITT FY27-225 Fleet Management...</h3>
 *   <p>Plan Limited is inviting interested parties...</p>
 *   <p>Responses should be submitted no later than Friday, 28th August 2026.</p>
 *   <a href='.../ITT-FY27-225-...zip' class="wp-block-button__link">Download</a>
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
 *    2026-09-04 - les deux ont ete ajoutes a extraireDeadline, ce qui
 *    profite a toutes les sources.
 *
 * Le titre peut etre vide : la page en pose plusieurs comme separateurs.
 */
const PLAN_PAGE = "https://plan-international.org/calls-tender/";

export function analyserPlanInternational(html: string): EntreeFlux[] {
  if (!html) return [];
  // Chaque appel court d'un <h3> au suivant.
  const blocs = html.split(/<h3 class="wp-block-heading">/i).slice(1);
  const sortie: EntreeFlux[] = [];

  for (const bloc of blocs) {
    const fin = bloc.indexOf("</h3>");
    if (fin === -1) continue;
    const titre = nettoyerHtml(bloc.slice(0, fin));
    // La page pose des <h3> vides en guise de separateurs.
    if (!titre) continue;

    const corps = bloc.slice(fin);
    const texte = nettoyerHtml(corps);

    // Le dossier complet : un ZIP ou un PDF, propre a cet appel.
    const dossier = /href=['"]([^'"]*plan-international\.org\/uploads\/[^'"]+)['"]/i
      .exec(corps)?.[1] ?? "";

    sortie.push({
      titre,
      lien: PLAN_PAGE,
      publie: null,
      resume: texte.slice(0, 400),
      deadline: extraireDeadline(texte),
      organisation: "Plan International",
      pdf: dossier ? nettoyerLien(dossier) : null,
    });
  }
  return sortie;
}

/**
 * Analyseur de la liste UNGM - le marche public des agences des Nations
 * unies.
 *
 * CE N'EST PAS UNE PAGE, C'EST UNE REPONSE DE RECHERCHE. UNGM ne rend
 * aucun avis dans le HTML de /Public/Notice : la liste arrive d'un POST sur
 * /Public/Notice/Search, qui renvoie des RANGEES HTML - pas du JSON. C'est
 * pourquoi cette source est une methode HTML servie par un POST : voir
 * requeteUngm dans json.ts pour le corps, et le champ paginee pour la
 * pagination, qui se fait par PageIndex dans ce corps et non par l'URL.
 *
 * MESURE DU 2026-09-04, filtre sur les quinze pays de la CEDEAO : 15 avis
 * par page, au moins 15 pages, tous dates. Les acheteurs sont les agences
 * elles-memes - FAO, UNICEF, IOM, ILO, UNDP, UNFPA, UNHCR, UNOPS, WFP,
 * WHO, UNIDO, Secretariat de l'ONU. Neuf de ces dix acheteurs ne sont
 * couverts par AUCUNE autre source du registre.
 *
 * CE QUE CHAQUE RANGEE DONNE, ET DANS CET ORDRE : boutons, titre, echeance,
 * date de publication, agence, type d'avis, reference, pays. Les cellules
 * qui portent une classe se reconnaissent a elle ; les quatre autres se
 * reperent a leur VOISINE - la publication suit l'echeance, le type suit
 * l'agence, et le pays est la derniere. Se fier au rang absolu casserait a
 * la premiere colonne ajoutee.
 *
 * "Multiple destinations" n'est pas un pays : c'est un avis regional. On
 * laisse alors le champ vide pour que le defaut de la source s'applique,
 * plutot que d'ecrire dans la colonne Pays une valeur qu'aucun filtre ne
 * saurait lire.
 */
const UNGM_RACINE = "https://www.ungm.org";

/** "15-Sep-2026 13:00" -> "2026-09-15". L'heure est ecartee. */
export function dateUngm(valeur: string): string | null {
  const m = /(\d{1,2})-([A-Za-z]{3})-(\d{4})/.exec(valeur || "");
  if (!m) return null;
  const mois = MOIS_UNGM[m[2].toLowerCase()];
  if (!mois) return null;
  const jour = m[1].padStart(2, "0");
  if (Number(jour) < 1 || Number(jour) > 31) return null;
  return `${m[3]}-${mois}-${jour}`;
}

const MOIS_UNGM: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

export function analyserUngm(html: string): EntreeFlux[] {
  if (!html) return [];
  const rangees = html.split(/<div role="row"[^>]*data-noticeid="/i).slice(1);
  const sortie: EntreeFlux[] = [];
  const vus = new Set<string>();

  for (const rangee of rangees) {
    const identifiant = /^(\d+)/.exec(rangee)?.[1];
    // La meme rangee revient dans le fragment : une fois pour la liste,
    // une fois pour le gabarit mobile.
    if (!identifiant || vus.has(identifiant)) continue;

    // Le titre vit dans son propre span, jamais dans une cellule brute :
    // la cellule porte aussi le libelle du lien "Open in a new window".
    const titre = nettoyerHtml(
      /<span class="ungm-title[^"]*"[^>]*>([\s\S]*?)<\/span>/i
        .exec(rangee)?.[1] ?? "");
    if (!titre) continue;
    vus.add(identifiant);

    const cellules = cellulesUngm(rangee);
    const rang = (predicat: (classe: string) => boolean) =>
      cellules.findIndex((c) => predicat(c.classe));
    const nue = (i: number) =>
      (i >= 0 && cellules[i] && !cellules[i].classe) ? cellules[i].texte : "";

    const iEcheance = rang((c) => c.indexOf("deadline") !== -1);
    const iAgence = rang((c) => c === "resultAgency");
    const nues = cellules.filter((c) => !c.classe);

    sortie.push({
      titre,
      lien: `${UNGM_RACINE}/Public/Notice/${identifiant}`,
      publie: dateUngm(nue(iEcheance + 1)),
      resume: cellules.find((c) => c.classe === "resultInfo1")?.texte ?? "",
      deadline: iEcheance >= 0 ? dateUngm(cellules[iEcheance].texte) : null,
      organisation: iAgence >= 0 ? cellules[iAgence].texte : null,
      type: nue(iAgence + 1) || null,
      pays: paysUngm(nues.length ? nues[nues.length - 1].texte : ""),
    });
  }
  return sortie;
}

/**
 * Les cellules d'une rangee, dans l'ordre, avec leur classe.
 *
 * On decoupe sur l'ouverture des cellules plutot que d'apparier les
 * balises : la premiere cellule contient des div imbriques - boutons,
 * infobulles - qu'aucune expression non gourmande ne refermerait au bon
 * endroit. Ces div-la n'ont pas role="cell" : le decoupage les ignore.
 */
function cellulesUngm(rangee: string): { classe: string; texte: string }[] {
  const morceaux = rangee.split(/<div role="cell" class="tableCell/i).slice(1);
  return morceaux.map((morceau) => {
    const finClasse = morceau.indexOf('"');
    // Le contenu commence apres la balise ouvrante, pas apres la classe :
    // il reste sinon la fin du tag (data-description, et le chevron).
    const ouvert = morceau.indexOf(">");
    // ET IL S'ARRETE AU PREMIER </div>. La derniere cellule d'une rangee
    // est suivie du <script> qui colore les echeances proches : sans cette
    // borne, le pays du dernier avis vaut trente lignes de JavaScript.
    const ferme = morceau.indexOf("</div>", ouvert);
    return {
      classe: finClasse === -1 ? "" : morceau.slice(0, finClasse).trim(),
      texte: nettoyerHtml(ouvert === -1 ? ""
        : morceau.slice(ouvert + 1, ferme === -1 ? undefined : ferme)),
    };
  });
}

/** "Multiple destinations" designe un avis regional, pas un pays. */
function paysUngm(valeur: string): string | null {
  const net = valeur.trim();
  if (!net || /multiple/i.test(net)) return null;
  return net;
}

/**
 * Analyseur de la LISTE de JobRelais, l'agregateur beninois.
 *
 * MESURE DU 2026-09-04 : 12 avis par page, 27 pages, rendus cote serveur.
 * De vrais avis ouest-africains - BCEAO, GIZ Cote d'Ivoire, GIZ Togo, Plan
 * International Benin, LuxDev, Amnesty Togo.
 *
 * La liste ne porte AUCUNE echeance : pour toute date, "il y a 3 mois".
 * C'est la fiche qui la porte - voir analyserFicheJobrelais - et c'est
 * pourquoi cette source declare un analyseur de fiche.
 *
 * Elle n'est pas triee par date non plus : la page 1 melange "il y a 2
 * jours" et "il y a 3 mois". On ne peut donc pas se contenter des premieres.
 */
export function analyserJobrelais(html: string): EntreeFlux[] {
  if (!html) return [];
  const motif = /<h3[^>]*class="[^"]*line-clamp-2[^"]*"[^>]*>\s*<a\s+href="([^"]*\/opportunities\/call-for-tenders\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

  const sortie: EntreeFlux[] = [];
  const vus = new Set<string>();
  for (const m of html.matchAll(motif)) {
    const lien = nettoyerLien(m[1]);
    const titre = nettoyerHtml(m[2]);
    // La meme carte apparait deux fois : l'image et le titre pointent
    // toutes deux vers la fiche.
    if (!titre || vus.has(lien)) continue;
    vus.add(lien);
    sortie.push({
      titre,
      lien,
      publie: null,
      resume: "",
      // La liste ne date rien : la fiche s'en charge.
      deadline: null,
    });
  }
  return sortie;
}

/**
 * Analyseur d'une FICHE JobRelais.
 *
 * La fiche porte un JSON-LD de type JobPosting, correctement balise :
 *
 *   "datePosted":   "2026-08-26"
 *   "validThrough": "2026-11-26T11:16"
 *   "description":  le texte de l'avis
 *
 * On lit le balisage plutot que la page : c'est un contrat, la mise en page
 * n'en est pas un. hiringOrganization est volontairement IGNORE - il vaut
 * "JobRelais Sarl", le site lui-meme, jamais l'acheteur reel.
 */
export function analyserFicheJobrelais(html: string): Partial<EntreeFlux> {
  if (!html) return {};
  for (const m of html.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) {
    let donnees: Record<string, unknown>;
    try {
      donnees = JSON.parse(m[1]);
    } catch {
      // La page en sert plusieurs, dont un qui laisse fuir du PHP brut.
      // Un bloc illisible ne doit pas empecher de lire les suivants.
      continue;
    }
    if (donnees["@type"] !== "JobPosting") continue;

    const description = retirerBalises(
      reparerCaracteres(String(donnees.description ?? "")));
    return {
      deadline: enIsoFiche(donnees.validThrough),
      publie: enIsoFiche(donnees.datePosted),
      resume: description.slice(0, 400),
    };
  }
  return {};
}

/** "2026-11-26T11:16" ou "2026-08-26" -> "2026-11-26". Rien d'autre. */
function enIsoFiche(valeur: unknown): string | null {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(String(valeur ?? "").trim());
  return m ? m[1] : null;
}

export const ANALYSEURS_HTML: Record<string, (html: string) => EntreeFlux[]> = {
  "gouv.bj": analyserGouvBj,
  "afdb.org": analyserAfdb,
  "enabel.be": analyserEnabel,
  "armp.bj": analyserArmp,
  "sbee.bj": analyserSbee,
  "soneb.bj": analyserSoneb,
  "araa.org": analyserAraa,
  "bceao.int": analyserBceao,
  "abe.bj": analyserAbe,
  "dedras.org": analyserDedras,
  "afd.fr": analyserAfd,
  "wellcome.org": analyserWellcome,
  "grandchallenges.org": analyserGrandChallenges,
  "unicef.org/supply": analyserUnicefSupply,
  "giz.de": analyserGiz,
  "expertise-france.gestmax.fr": analyserExpertiseFrance,
  "plan-international.org": analyserPlanInternational,
  "jobrelais.com": analyserJobrelais,
  "ungm.org": analyserUngm,
};

/** Retourne l'analyseur d'une methode "HTML:<nom>", ou null. */
export function analyseurHtml(methode: string): ((html: string) => EntreeFlux[]) | null {
  const m = /^HTML:(.+)$/i.exec(methode.trim());
  return m ? (ANALYSEURS_HTML[m[1].trim()] ?? null) : null;
}

/**
 * COLLECTE EN DEUX TEMPS : la liste, puis les fiches.
 *
 * A QUOI CA SERT. Certains sites listent leurs avis sans jamais ecrire
 * l'echeance dans la liste - elle n'existe que sur la fiche de chaque avis.
 * JobRelais est le cas type : sa liste rend 12 avis par page avec, pour
 * toute date, "il y a 3 mois" ; la fiche, elle, porte un JSON-LD propre
 * avec validThrough. Sans second temps, ces sources arrivent SANS DATE, le
 * filtre des echues ne peut pas jouer, et le tableau du client se remplit
 * d'avis morts. C'est pour cela que JobRelais etait reste inactif.
 *
 * CE N'EST PAS GRATUIT, ET C'EST BORNE PAR TROIS REGLES.
 *
 * 1. **Une fiche n'est lue que si elle manque.** Une annonce dont la liste
 *    donne deja l'echeance ne coute aucune requete.
 * 2. **Une fiche deja connue n'est jamais relue.** Le moteur passe les
 *    liens deja presents dans le classeur : chaque passage enrichit des
 *    annonces NOUVELLES, et le rattrapage avance au lieu de tourner en
 *    rond.
 * 3. **Un plafond par passage** (MAX_FICHES_PAR_PASSAGE, 12 par defaut).
 *    Ce qui depasse n'est pas perdu : ces annonces reviendront au passage
 *    suivant, ou elles seront encore inconnues.
 *
 * ET ON NE GARDE PAS CE QU'ON N'A PAS PU DATER. Pour une source qui declare
 * un analyseur de fiche, l'absence de date signifie "fiche non lue", pas
 * "avis sans echeance" : la retenir quand meme ferait entrer exactement les
 * lignes mortes qu'on cherche a eviter.
 *
 * La fusion ne REMPLACE jamais : elle ne comble que les cases vides. Ce que
 * la liste a lu fait foi.
 */
export type AnalyseurFiche = (html: string) => Partial<EntreeFlux>;

export const ANALYSEURS_FICHE: Record<string, AnalyseurFiche> = {
  "jobrelais.com": analyserFicheJobrelais,
};

/** Retourne l'analyseur de fiche d'une methode, ou null. */
export function analyseurFiche(methode: string): AnalyseurFiche | null {
  const m = /^HTML:(.+)$/i.exec(methode.trim());
  return m ? (ANALYSEURS_FICHE[m[1].trim()] ?? null) : null;
}

/** Complete une entree avec ce que sa fiche apporte, sans rien ecraser. */
export function fusionnerFiche(
  entree: EntreeFlux, fiche: Partial<EntreeFlux>,
): EntreeFlux {
  const complete = { ...entree };
  for (const cle of Object.keys(fiche) as (keyof EntreeFlux)[]) {
    const valeur = fiche[cle];
    const actuelle = complete[cle];
    const vide = actuelle === undefined || actuelle === null || actuelle === "";
    if (vide && valeur !== undefined && valeur !== null && valeur !== "") {
      (complete as Record<string, unknown>)[cle] = valeur;
    }
  }
  return complete;
}

