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

import { EntreeFlux, extraireDeadline, lireDateFlux, reparerCaracteres, decoderEntites, nettoyerLien } from "./rss";

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
    const typeCourt = type && type.length <= 60 ? type : "";

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

    return {
      titre,
      lien: "https://eprocurement.dedras.org/toutvoir",
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

      const slug = String(g.url ?? "").trim();
      const lien = slug
        ? nettoyerLien("https://www.grandchallenges.org" + slug)
        : String(g.apply_link ?? "");
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
};

/** Retourne l'analyseur d'une methode "HTML:<nom>", ou null. */
export function analyseurHtml(methode: string): ((html: string) => EntreeFlux[]) | null {
  const m = /^HTML:(.+)$/i.exec(methode.trim());
  return m ? (ANALYSEURS_HTML[m[1].trim()] ?? null) : null;
}
