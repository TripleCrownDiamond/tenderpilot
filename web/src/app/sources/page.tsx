"use client";

import { useMemo, useState } from "react";
import { SOURCES_DEFAUT, type SourceDefaut } from "@/data/sources-defaut";

/**
 * Catalogue des sources livrees.
 *
 * Affiche ce que le compte recevra a sa creation. Tant que la base n'est
 * pas branchee, cette page lit directement le catalogue : le client voit
 * donc immediatement ce qu'il achete.
 *
 * Les filtres sont volontairement cote navigateur. Le catalogue tient en
 * quelques dizaines de lignes, chargees avec la page : passer par le serveur
 * pour filtrer ajouterait un aller-retour sans rien apporter.
 */

/**
 * Les trois facons de lire une source, de la plus solide a la plus fragile.
 *
 * La distinction n'est pas cosmetique : elle dit au client ce qui risque de
 * tomber en panne. Une API respecte un contrat et previent en general avant
 * de changer ; une extraction de page casse le jour ou le site refait sa
 * mise en page, sans prevenir personne.
 */
const METHODES = {
  api: {
    libelle: "API",
    pastille: "s-OUVERT",
    resume: "Contrat stable, champs structures. La forme la plus sure.",
  },
  rss: {
    libelle: "RSS",
    pastille: "s-A-SURVEILLER",
    resume: "Flux standard. Stable, mais texte libre : peu de champs exploitables.",
  },
  html: {
    libelle: "HTML",
    pastille: "s-BIENTOT",
    resume: "Extraction de page, faute de mieux. Casse si le site change de mise en page.",
  },
} as const;

function methodeDe(s: SourceDefaut): keyof typeof METHODES {
  const m = s.methode.toUpperCase();
  if (m.startsWith("JSON:")) return "api";
  if (m.startsWith("HTML:")) return "html";
  return "rss";
}

/**
 * Une source qui ne declare pas de type en laisse le soin a l'annonce.
 *
 * La Banque mondiale, DEDRAS ou la SBEE publient chacune leur propre type
 * ("Request for Expression of Interest", "Demande de cotation"...). Leur
 * imposer un defaut ecraserait une information plus juste.
 */
const PORTE_PAR_ANNONCE = "Donne par l'annonce";
const NON_DEFINI = "Non defini";
const TOUS = "Tous";

export default function Sources() {
  const [type, setType] = useState(TOUS);
  const [secteur, setSecteur] = useState(TOUS);
  const [methode, setMethode] = useState(TOUS);

  const typeDe = (s: SourceDefaut) => s.typeDefaut ?? PORTE_PAR_ANNONCE;
  const secteurDe = (s: SourceDefaut) => s.secteurDefaut ?? NON_DEFINI;

  const listes = useMemo(() => ({
    types: [TOUS, ...new Set(SOURCES_DEFAUT.map(
      (s) => s.typeDefaut ?? PORTE_PAR_ANNONCE))].sort(),
    secteurs: [TOUS, ...new Set(SOURCES_DEFAUT.map(
      (s) => s.secteurDefaut ?? NON_DEFINI))].sort(),
  }), []);

  const visibles = SOURCES_DEFAUT.filter((s) =>
    (type === TOUS || typeDe(s) === type)
    && (secteur === TOUS || secteurDe(s) === secteur)
    && (methode === TOUS || METHODES[methodeDe(s)].libelle === methode));

  const pays = new Set(visibles.map((s) => s.paysDefaut).filter(Boolean));
  const actives = visibles.filter((s) => s.active).length;
  const compte = (cle: keyof typeof METHODES) =>
    visibles.filter((s) => methodeDe(s) === cle).length;

  const ligne = (s: SourceDefaut) => {
    const m = METHODES[methodeDe(s)];
    return (
      <tr key={s.code} style={{ opacity: s.active ? 1 : 0.55 }}>
        <td className="mono" style={{ whiteSpace: "nowrap" }}>{s.code}</td>
        <td>
          {s.nom}
          {!s.active && <span className="aide"> — en veille</span>}
        </td>
        <td>{s.typeDefaut ?? <span className="aide">{PORTE_PAR_ANNONCE}</span>}</td>
        <td>{s.secteurDefaut ?? <span className="aide">—</span>}</td>
        <td>{s.paysDefaut ?? "—"}</td>
        <td style={{ whiteSpace: "nowrap" }}>
          <span className={"pastille " + m.pastille} title={m.resume}>{m.libelle}</span>
        </td>
        <td className="aide" style={{ margin: 0 }}>{s.statut ?? ""}</td>
      </tr>
    );
  };

  return (
    <>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>Sources</h1>
      <p className="aide" style={{ marginBottom: 24 }}>
        {SOURCES_DEFAUT.length} sources verifiees. Marches publics, mais aussi
        appels a projets, subventions et bourses : filtrez par type pour ne
        voir que ce qui vous concerne.
      </p>

      <div className="indicateurs">
        <div className="indicateur">
          <div className="valeur">{visibles.length}</div>
          <div className="libelle">
            {visibles.length === SOURCES_DEFAUT.length ? "Sources livrees" : "Sources filtrees"}
          </div>
        </div>
        <div className="indicateur">
          <div className="valeur">{actives}</div>
          <div className="libelle">Actives par defaut</div>
        </div>
        <div className="indicateur">
          <div className="valeur">{pays.size}</div>
          <div className="libelle">Pays couverts</div>
        </div>
        <div className="indicateur">
          <div className="valeur">
            {compte("api")} / {compte("rss")} / {compte("html")}
          </div>
          <div className="libelle">API / RSS / HTML</div>
        </div>
      </div>

      <div style={{
        display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end",
        margin: "28px 0 18px",
      }}>
        <Filtre libelle="Type" valeur={type} options={listes.types} sur={setType} />
        <Filtre libelle="Secteur" valeur={secteur} options={listes.secteurs} sur={setSecteur} />
        <Filtre libelle="Lecture" valeur={methode} sur={setMethode}
                options={[TOUS, "API", "RSS", "HTML"]} />
        {(type !== TOUS || secteur !== TOUS || methode !== TOUS) && (
          <button
            type="button"
            onClick={() => { setType(TOUS); setSecteur(TOUS); setMethode(TOUS); }}
            style={{
              padding: "7px 14px", borderRadius: "var(--rayon)", cursor: "pointer",
              border: "1px solid var(--trait)", background: "var(--surface)",
              color: "var(--encre)", font: "inherit", fontSize: 13,
            }}
          >
            Tout afficher
          </button>
        )}
      </div>

      {visibles.length === 0 ? (
        <div className="vide">
          <p>Aucune source ne correspond a ces filtres.</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid var(--encre)" }}>
                {["Code", "Nom", "Type", "Secteur", "Pays", "Lecture", "Verification"]
                  .map((t) => (
                    <th key={t} style={{ padding: "0 12px 8px 0" }}>{t}</th>
                  ))}
              </tr>
            </thead>
            <tbody>{visibles.map(ligne)}</tbody>
          </table>
        </div>
      )}

      <h2 style={{ fontSize: 20, margin: "36px 0 4px" }}>Comment chaque source est lue</h2>
      <p className="aide" style={{ marginBottom: 14 }}>
        Ce qui suit dit ce qui peut tomber en panne, et ce qu&apos;on saura
        remplir automatiquement.
      </p>
      <div className="indicateurs">
        {(Object.keys(METHODES) as (keyof typeof METHODES)[]).map((cle) => (
          <div className="indicateur" key={cle} style={{ textAlign: "left" }}>
            <span className={"pastille " + METHODES[cle].pastille}>
              {METHODES[cle].libelle}
            </span>
            <p className="aide" style={{ marginTop: 8 }}>{METHODES[cle].resume}</p>
          </div>
        ))}
      </div>
    </>
  );
}

function Filtre({ libelle, valeur, options, sur }: {
  libelle: string;
  valeur: string;
  options: string[];
  sur: (v: string) => void;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span className="aide" style={{ margin: 0 }}>{libelle}</span>
      <select
        value={valeur}
        onChange={(e) => sur(e.target.value)}
        style={{
          padding: "7px 10px", borderRadius: "var(--rayon)", fontSize: 13,
          border: "1px solid var(--trait)", background: "var(--surface)",
          color: "var(--encre)", font: "inherit", minWidth: 190,
        }}
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
