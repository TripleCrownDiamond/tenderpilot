/**
 * TenderPilot - lecture des flux RSS et Atom.
 *
 * Port de apps_script/Rss.gs. Le parsing est fait a la main plutot qu'avec
 * une bibliotheque XML stricte : les flux d'appels d'offres sont souvent
 * mal formes et feraient echouer un parseur exigeant, alors qu'on veut
 * simplement recuperer ce qui est lisible.
 *
 * Aucune requete reseau ici : la recuperation vit dans lib/run.ts.
 */

import { normaliser, tronquer } from "./regles";

export interface EntreeFlux {
  titre: string;
  lien: string;
  publie: string | null;
  resume: string;
  deadline: string | null;
  /**
   * Champs que seules certaines sources savent renseigner.
   *
   * Un flux RSS ne porte que du texte libre : l'acheteur, le type d'avis et
   * la reference viennent alors des valeurs par defaut de la source. Mais une
   * API structuree - la Banque mondiale par exemple - donne l'acheteur reel
   * ("Seme City Development Agency") et non le nom de la source. Quand
   * l'annonce sait, elle l'emporte sur le defaut de la source.
   */
  organisation?: string | null;
  type?: string | null;
  /**
   * Le pays de l'annonce, quand la source le donne annonce par annonce.
   *
   * Expertise France couvre cinquante pays depuis une seule page : sans ce
   * champ, ses 144 offres porteraient toutes le defaut de la source, et la
   * colonne Pertinence les jugerait toutes sur le meme pays. Apps Script
   * lit deja brut.country dans normalizeOpportunity - c'est le moteur web
   * qui ecrasait l'information.
   */
  pays?: string | null;
  /**
   * Le dossier de l'appel, quand la source y mene directement.
   *
   * La colonne PDF existe depuis le premier jour et restait vide : aucune
   * source ne donnait de fichier par annonce. Plan International, si.
   */
  pdf?: string | null;
  /**
   * Montant annonce par la source, en texte. Deux sources seulement en
   * publient un : voir formaterMontant dans domain/json.ts.
   */
  budget?: string | null;

  /**
   * Champs poses par le LLM quand il est actif, absents sinon.
   *
   * Le registre ne porte qu'un secteur par source - et 82 sources sur 99
   * n'en portent aucun. Classer annonce par annonce est donc le premier
   * apport du modele, pas un raffinement.
   */
  secteur?: string | null;
  pertinent?: boolean;
  /** false = article, FAQ, communique : rien a quoi repondre. */
  opportunite?: boolean;
}

/**
 * Repare les caracteres perdus au decodage.
 *
 * Certains flux - celui du PNUD par exemple - melangent de l'UTF-8 et des
 * octets Windows-1252 isoles (l'apostrophe courbe de Word). Le decodeur les
 * remplace par U+FFFD, et "D'AMENAGEMENT" devient "D?AMENAGEMENT". Entre
 * deux lettres, ce caractere est presque toujours une apostrophe : on la
 * retablit. Ailleurs, on le retire plutot que de laisser un losange.
 */
export function reparerCaracteres(texte: string): string {
  if (!texte) return "";
  return texte
    .replace(/([A-Za-zÀ-ÿ])�([A-Za-zÀ-ÿ])/g, "$1'$2")
    .replace(/�/g, "");
}

/**
 * Entites nommees des pages francaises.
 *
 * MESURE DU 2026-09-04, sur Expertise France : ses titres arrivaient en
 * "Consultant charg&eacute; d&rsquo;une &eacute;tude". Seules les entites
 * du HTML de base etaient decodees - &amp; &lt; &quot; - et pas une seule
 * lettre accentuee. Un titre illisible se voit tout de suite dans la
 * feuille du client, et personne ne peut le corriger a la main sur trois
 * cents lignes.
 *
 * La liste est volontairement close : les accents francais, les
 * apostrophes et guillemets typographiques, les tirets et quelques signes.
 * Un decodeur generique demanderait une table de deux mille entrees pour
 * des caracteres qu'aucune de nos sources n'emet.
 */
const ENTITES_NOMMEES: Record<string, string> = {
  eacute: "é", egrave: "è", ecirc: "ê", euml: "ë",
  agrave: "à", acirc: "â", auml: "ä", aelig: "æ",
  ccedil: "ç", icirc: "î", iuml: "ï", ocirc: "ô",
  ouml: "ö", oelig: "œ", ugrave: "ù", ucirc: "û",
  uuml: "ü", Eacute: "É", Egrave: "È", Ecirc: "Ê",
  Agrave: "À", Acirc: "Â", Ccedil: "Ç", Icirc: "Î",
  Ocirc: "Ô", Ugrave: "Ù", Ucirc: "Û", rsquo: "’",
  lsquo: "‘", ldquo: "“", rdquo: "”", laquo: "«",
  raquo: "»", hellip: "…", ndash: "–", mdash: "—",
  deg: "°", euro: "€", times: "×", middot: "·",
  bull: "•",
};

/** Remplace les entites HTML courantes par leur caractere. */
export function decoderEntites(texte: unknown): string {
  if (!texte) return "";
  return String(texte)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_m, c) => String.fromCharCode(parseInt(c, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, c) => String.fromCharCode(parseInt(c, 16)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    // Les entites nommees AVANT &amp; : "&amp;eacute;" existe dans des
    // pages mal echappees, et le faire dans l'autre sens produirait un
    // "&eacute;" litteral que plus rien ne decoderait.
    .replace(/&([a-zA-Z]+);/g,
             (entier, nom) => ENTITES_NOMMEES[nom] ?? entier)
    .replace(/&amp;/g, "&");
}

/** Supprime les balises HTML d'un resume de flux. */
export function retirerBalises(texte: unknown): string {
  if (!texte) return "";
  return reparerCaracteres(decoderEntites(String(texte).replace(/<[^>]*>/g, " ")))
    .replace(/\s+/g, " ")
    .trim();
}

function contenuBalise(xml: string, balise: string): string {
  const m = new RegExp(
    `<${balise}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${balise}>`, "i").exec(xml);
  return m ? decoderEntites(m[1]).trim() : "";
}

/**
 * Retire les parametres de tracage d'un lien.
 *
 * Les marqueurs publicitaires (utm_source, fbclid, gclid...) n'ont rien a
 * voir avec la ressource : ils allongent le lien et faussent la
 * deduplication, la meme annonce avec et sans "?utm_source=..." passant pour
 * deux opportunites differentes.
 */
/**
 * Domaines qu'une source ecrit faux dans ses propres liens.
 *
 * MESURE DU 2026-09-02, sur la DNCMP : son flux publie
 * "www.marches-public.bj" - SANS le s. Ce domaine ne resout pas du tout, et
 * les 40 annonces beninoises portaient donc chacune un lien mort. Le
 * portail est "www.marches-publics.bj", il sert la meme page en 200, et
 * c'est aussi le domaine de son API. La faute de frappe est chez eux.
 *
 * REGLE POUR EN AJOUTER UNE. Il faut avoir verifie les DEUX cotes : que le
 * domaine ecrit ne repond pas, et que le domaine corrige sert bien la meme
 * ressource. Reecrire le lien d'une source est une correction, pas une
 * preference - sans ces deux mesures, on renverrait l'utilisateur ailleurs
 * que la ou la source voulait l'envoyer.
 */
const DOMAINES_CORRIGES: [RegExp, string][] = [
  [/^https?:\/\/(www\.)?marches-public\.bj(?=[/?#]|$)/i,
   "https://www.marches-publics.bj"],
];

export function nettoyerLien(url: string): string {
  if (!url) return "";
  let brut = url.trim();
  for (const [motif, bon] of DOMAINES_CORRIGES) brut = brut.replace(motif, bon);
  const sep = brut.indexOf("?");
  if (sep === -1) return brut;

  const base = brut.slice(0, sep);
  const reste = brut.slice(sep + 1).split("#")[0];
  const indesirables = /^(utm_|fbclid$|gclid$|mc_|ref$|ref_src$|source$|spm$|igshid$|_ga$)/i;

  const gardes = reste.split("&").filter((paire) => {
    const cle = paire.split("=")[0];
    return cle && !indesirables.test(cle);
  });
  return gardes.length ? `${base}?${gardes.join("&")}` : base;
}

/** Lien d'une entree, en gerant la forme RSS et la forme Atom. */
function lienEntree(xml: string): string {
  const rss = contenuBalise(xml, "link");
  if (rss && /^https?:\/\//.test(rss)) return rss;

  // Atom : on ignore les liens d'edition ou d'auto-reference.
  const motif = /<link\b[^>]*href=["']([^"']+)["'][^>]*>/gi;
  let secours = "";
  let m: RegExpExecArray | null;
  while ((m = motif.exec(xml)) !== null) {
    if (/rel=["'](self|edit)["']/i.test(m[0])) continue;
    if (/rel=["']alternate["']/i.test(m[0])) return m[1];
    if (!secours) secours = m[1];
  }
  return secours || rss;
}

/**
 * Date de publication d'une entree, ou null si illisible.
 *
 * Deux formes coexistent dans les sources et n'appellent pas la meme lecture.
 *
 * Un pubDate RSS porte son fuseau ("Tue, 26 Aug 2026 09:00:00 +0100") : on le
 * ramene en UTC, c'est le sens voulu.
 *
 * Une date nue ("02 March 2026", affichee sur une vignette ARMP) n'en porte
 * aucun. JavaScript la place alors a minuit LOCAL ; la relire en UTC depuis
 * un fuseau positif la fait reculer d'un jour, et l'avis parait publie la
 * veille. Sans indication de fuseau, on lit donc les composantes locales :
 * la date affichee est celle qu'on garde.
 */
export function lireDateFlux(texte: unknown): string | null {
  if (!texte) return null;
  const brut = String(texte).trim();
  const d = new Date(brut);
  if (isNaN(d.getTime())) return null;

  // "+01:00", "Z", "GMT", "UTC" ou un horaire ISO complet valent indication.
  const avecFuseau = /(Z|GMT|UTC|[+-]\d{2}:?\d{2})\s*$/i.test(brut);
  const [annee, mois, jour] = avecFuseau
    ? [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()]
    : [d.getFullYear(), d.getMonth(), d.getDate()];

  return [annee, String(mois + 1).padStart(2, "0"),
          String(jour).padStart(2, "0")].join("-");
}

/** Mois francais et anglais, entiers ou abreges. */
const MOIS: Record<string, number> = {
  janvier: 0, janv: 0, jan: 0, january: 0,
  fevrier: 1, fevr: 1, feb: 1, february: 1,
  mars: 2, mar: 2, march: 2,
  avril: 3, avr: 3, apr: 3, april: 3,
  mai: 4, may: 4,
  juin: 5, jun: 5, june: 5,
  juillet: 6, juil: 6, jul: 6, july: 6,
  aout: 7, aou: 7, aug: 7, august: 7,
  septembre: 8, sept: 8, sep: 8, september: 8,
  octobre: 9, oct: 9, october: 9,
  novembre: 10, nov: 10, november: 10,
  decembre: 11, dec: 11, december: 11,
};

/** "26" designe 2026, pas l'an 26. */
function anneeComplete(valeur: string): number {
  const n = parseInt(valeur, 10);
  return n < 100 ? 2000 + n : n;
}

/** Refuse les dates impossibles (32/13, 29 fevrier hors annee bissextile). */
function construireDate(annee: number, mois: number, jour: number): string | null {
  if (mois < 0 || mois > 11 || jour < 1 || jour > 31) return null;
  const d = new Date(Date.UTC(annee, mois, jour));
  if (d.getUTCFullYear() !== annee || d.getUTCMonth() !== mois
      || d.getUTCDate() !== jour) return null;
  return [annee, String(mois + 1).padStart(2, "0"),
          String(jour).padStart(2, "0")].join("-");
}

const ANNONCEURS = [
  "date limite", "date de cloture", "cloture", "deadline", "limite de depot",
  "closing date", "submission deadline", "a soumettre avant", "avant le",
  // Mesure du 2026-09-04, sur Plan International : ses huit appels
  // annoncent leur echeance par "Responses should be submitted no later
  // than ...". Sans ces tournures, huit avis sur huit arrivaient sans date.
  "no later than", "submitted by", "due by", "closes on", "closing on",
  "bids must be received", "date de remise",
];

/**
 * Cherche une date d'echeance dans un texte libre.
 *
 * Une date n'est retenue QUE si elle suit un mot annonciateur. Sans cette
 * regle on renverrait la premiere date venue - souvent la date de
 * publication - et l'utilisateur se fierait a une echeance inventee. Mieux
 * vaut ne rien renvoyer et le lui faire saisir.
 */
export function extraireDeadline(texte: unknown): string | null {
  if (!texte) return null;
  const normalise = normaliser(texte);

  let debut = -1;
  for (const mot of ANNONCEURS) {
    const pos = normalise.indexOf(mot);
    if (pos !== -1 && (debut === -1 || pos < debut)) debut = pos;
  }
  if (debut === -1) return null;

  // normaliser() a deja remplace les separateurs par des espaces.
  // Les rangs anglais collent au quantieme - "28th August", "2nd September" -
  // et empechent le motif de reconnaitre le nombre. On les retire : ils
  // n'apportent rien qu'une lettre.
  const fenetre = normalise.slice(debut, debut + 90)
    .replace(/(\d+)(st|nd|rd|th)\b/g, "$1");

  // Chaque motif est ESSAYE, pas impose : un motif qui accroche une date
  // impossible ne doit pas interrompre la recherche. Sans cela, une heure
  // collee a la date ("02 September 2026 12:00" -> "2026 12 00") passerait
  // pour une date ISO, serait rejetee comme invalide, et l'echeance pourtant
  // ecrite juste a cote serait perdue.
  const essais: (string | null)[] = [];

  const numerique = /(\d{1,2}) (\d{1,2}) (\d{4})/.exec(fenetre);
  if (numerique) {
    essais.push(construireDate(+numerique[3], +numerique[2] - 1, +numerique[1]));
  }
  const iso = /(\d{4}) (\d{1,2}) (\d{1,2})/.exec(fenetre);
  if (iso) essais.push(construireDate(+iso[1], +iso[2] - 1, +iso[3]));

  // 31 aug 26, 15 septembre 2026, 5 Jan 2027...
  const lettres = /(\d{1,2}) ([a-z]+) (\d{2,4})/.exec(fenetre);
  if (lettres && lettres[2] in MOIS) {
    essais.push(construireDate(anneeComplete(lettres[3]), MOIS[lettres[2]], +lettres[1]));
  }
  // Aug 31 2026 : forme anglaise, mois en premier.
  const moisDabord = /([a-z]+) (\d{1,2}) (\d{2,4})/.exec(fenetre);
  if (moisDabord && moisDabord[1] in MOIS) {
    essais.push(construireDate(
      anneeComplete(moisDabord[3]), MOIS[moisDabord[1]], +moisDabord[2]));
  }
  return essais.find((d) => d !== null) ?? null;
}

/**
 * L'auteur d'une entree, quand c'est l'acheteur.
 *
 * MESURE DU 2026-09-02, sur la DNCMP : le flux des marches publics du Benin
 * met le pouvoir adjudicateur dans <author> - "Agence Territoriale de
 * Developpement Agricole Pole 5", "Societe Beninoise d'Energie Electrique",
 * "Agence des Systemes d'Information et du Numerique". On l'ignorait, et
 * les 46 annonces portaient toutes le nom de la SOURCE a la place de leur
 * acheteur reel.
 *
 * DEUX GARDE-FOUS, parce que la specification RSS dit que <author> est une
 * ADRESSE EMAIL, pas un nom :
 *
 *   "redaction@site.org (Agence X)"  ->  Agence X, le nom derriere l adresse
 *   "redaction@site.org"             ->  rien : une adresse ne nomme personne
 *   "Agence ... du Numerique (ASIN)"  ->  inchange, sigle compris
 *
 * Sans nom exploitable on rend une chaine vide, et le defaut de la source
 * reprend la main - c'est normalizeOpportunity qui arbitre.
 */
export function auteurFlux(bloc: string): string {
  let t = retirerBalises(contenuBalise(bloc, "author")
                         || contenuBalise(bloc, "dc:creator"));
  if (!t) return "";
  // La parenthese ne prime QUE derriere une adresse : "Agence des Systemes
  // d Information et du Numerique (ASIN)" doit rester entier, sinon on
  // reduirait un acheteur a son sigle.
  const apresAdresse = /^[^\s@]+@[^\s@]+\s*\(([^)]+)\)$/.exec(t);
  if (apresAdresse) return apresAdresse[1].trim();
  if (/^[^\s@]+@[^\s@]+$/.test(t)) return "";
  return t;
}

/**
 * Repare les flux dont chaque element porte le meme titre.
 *
 * MESURE DU 2026-09-02 sur le flux de la DNCMP, la direction beninoise des
 * marches publics : ses 43 elements portent tous le titre "Appel d'Offre" -
 * un libelle de categorie, pas un intitule - et tous le meme lien. L objet
 * reel du marche est dans <description>, l acheteur dans <author>.
 *
 * Deux consequences, toutes deux graves. Les cles de deduplication devenant
 * identiques, 42 marches sur 43 n etaient jamais enregistres. Et les rares
 * lignes ecrites s intitulaient "Appel d'Offre", ce qui n apprend rien.
 *
 * La regle est deliberement etroite : il faut que TOUS les elements
 * partagent le meme titre et que les descriptions, elles, different. Un flux
 * normal n est jamais touche.
 */
function reparerTitresIdentiques(entrees: EntreeFlux[]): EntreeFlux[] {
  if (entrees.length < 2) return entrees;

  const titres = new Set(entrees.map((e) => e.titre.trim().toLowerCase()));
  if (titres.size !== 1) return entrees;

  const resumes = new Set(entrees.map((e) => (e.resume ?? "").trim().toLowerCase()));
  if (resumes.size < entrees.length) return entrees;

  const categorie = entrees[0].titre.trim();
  return entrees.map((e) => ({
    ...e,
    titre: tronquer(e.resume) || e.titre,
    // Le libelle de categorie reste utile : il dit la nature de l avis.
    resume: categorie,
    type: e.type ?? categorie,
  }));
}

/**
 * La reponse est-elle bien un flux, meme s'il est vide ?
 *
 * MESURE DU 2026-09-02 : les bureaux PNUD du Cap-Vert et du Togo servent un
 * flux parfaitement valide dont la liste d'annonces est vide. La collecte
 * les signalait comme "la page a peut-etre change de structure" a chaque
 * execution - une fausse alerte, repetee, sur des sources qui vont tres
 * bien. Un flux annonce sa nature des sa balise racine : rss, feed (Atom)
 * ou rdf:RDF (RSS 1.0, la forme du PNUD).
 *
 * Une page HTML, une page d'erreur ou un ecran anti-robot n'en portent
 * aucune : le doute sur la mise en page reste alors entier.
 *
 * Jumeau de estFluxXml() dans apps_script/Rss.gs.
 */
export function estFluxXml(corps: unknown): boolean {
  if (!corps) return false;
  // La racine est cherchee dans le debut du document seulement : plus loin,
  // un lien vers un flux dans une page HTML donnerait un faux positif.
  return /<(rss|feed|rdf:RDF)\b/i.test(String(corps).slice(0, 4000));
}

/**
 * Transforme le XML d'un flux RSS ou Atom en liste d'entrees.
 *
 * Retourne [] plutot que de lever une erreur sur un flux illisible : une
 * source cassee ne doit pas interrompre la collecte des autres.
 */
export function analyserFlux(xml: unknown): EntreeFlux[] {
  if (!xml) return [];
  const blocs = String(xml).match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) ?? [];

  const entrees: EntreeFlux[] = blocs.map((bloc) => {
    const titre = retirerBalises(contenuBalise(bloc, "title"));
    const resume = retirerBalises(
      contenuBalise(bloc, "description")
      || contenuBalise(bloc, "summary")
      || contenuBalise(bloc, "content"));
    return {
      titre,
      // L'acheteur reel quand le flux le donne : voir auteurFlux.
      organisation: auteurFlux(bloc) || null,
      lien: nettoyerLien(lienEntree(bloc)),
      publie: lireDateFlux(
        contenuBalise(bloc, "pubDate")
        || contenuBalise(bloc, "published")
        || contenuBalise(bloc, "updated")
        || contenuBalise(bloc, "dc:date")),
      resume: tronquer(resume),
      deadline: extraireDeadline(`${titre} ${resume}`),
    };
  }).filter((e) => e.titre);

  return reparerTitresIdentiques(entrees);
}
