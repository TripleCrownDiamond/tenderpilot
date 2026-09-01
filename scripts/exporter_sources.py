"""
TenderPilot - export du registre de sources vers l'application web.

    python scripts/exporter_sources.py

data/sources.csv est la reference : c'est le fichier qu'on edite a la main,
lisible et diffable. web/src/data/sources-defaut.ts en est la traduction
pour l'application, regeneree par ce script et jamais editee directement.

Sans ce script les deux fichiers divergent en silence - c'est exactement ce
qui est arrive a la source BAD, presente dans le CSV et absente du TypeScript,
donc jamais collectee par l'application web.
"""

import csv
import json
import pathlib
import sys

RACINE = pathlib.Path(__file__).resolve().parent.parent
CSV = RACINE / "data" / "sources.csv"
CIBLE = RACINE / "web" / "src" / "data" / "sources-defaut.ts"


def lire_sources():
    """Le CSV, converti en dictionnaires prets pour le TypeScript."""
    with CSV.open(encoding="utf-8", newline="") as f:
        lignes = list(csv.DictReader(f))

    sources = []
    for l in lignes:
        code = (l["Source_ID"] or "").strip()
        if not code:
            continue
        sources.append({
            "code": code,
            "nom": (l["Nom"] or "").strip(),
            "methode": (l["Methode"] or "").strip(),
            "url": (l["URL"] or "").strip(),
            "paysDefaut": (l["Pays_Defaut"] or "").strip() or None,
            "secteurDefaut": (l["Secteur_Defaut"] or "").strip() or None,
            "typeDefaut": (l["Type_Defaut"] or "").strip() or None,
            "active": (l["Active"] or "").strip().upper() == "OUI",
            "statut": (l["Statut"] or "").strip() or None,
        })
    return sources


def verifier(sources):
    """Refuse d'ecrire un registre incoherent."""
    erreurs = []
    vus = set()
    for s in sources:
        if s["code"] in vus:
            erreurs.append("code en double : " + s["code"])
        vus.add(s["code"])
        if not s["url"] and s["methode"].upper() != "MANUAL":
            erreurs.append(s["code"] + " : aucune URL")
        m = s["methode"].upper()
        if not (m in ("RSS", "MANUAL") or m.startswith(("HTML:", "JSON:"))):
            erreurs.append(s["code"] + " : methode inconnue " + s["methode"])
    return erreurs


def compter(sources):
    rss = sum(1 for s in sources if s["methode"].upper() == "RSS")
    html = sum(1 for s in sources if s["methode"].upper().startswith("HTML:"))
    api = sum(1 for s in sources if s["methode"].upper().startswith("JSON:"))
    manuel = sum(1 for s in sources if s["methode"].upper() == "MANUAL")
    actives = sum(1 for s in sources if s["active"])
    return rss, html, api, manuel, actives


ENTETE = """/**
 * TenderPilot - sources livrees par defaut.
 *
 * FICHIER GENERE depuis data/sources.csv a la racine du depot.
 * Relancer `python scripts/exporter_sources.py` apres modification du CSV.
 * Toute retouche faite ici sera perdue a la prochaine generation.
 *
 * @@TOTAL@@ sources : @@RSS@@ flux RSS, @@API@@ API JSON,
 * @@HTML@@ collectes HTML, @@MANUEL@@ manuelle(s).
 * @@ACTIVES@@ actives par defaut. Chaque source a ete recuperee et verifiee :
 * la propriete `statut` porte la date du controle et ce qui a ete trouve
 * ce jour-la.
 *
 * Les trois methodes, de la plus solide a la plus fragile :
 *
 *   JSON:<nom>  une API publique. Contrat stable, champs structures.
 *   RSS         un flux standard. Stable, mais texte libre et pauvre.
 *   HTML:<nom>  une extraction de page. A n'utiliser qu'a defaut.
 */

export type MethodeSource =
  | "RSS"
  | "MANUAL"
  | `HTML:@@DOLLAR@@{string}`
  | `JSON:@@DOLLAR@@{string}`;

export interface SourceDefaut {
  code: string;
  nom: string;
  methode: MethodeSource;
  url: string;
  paysDefaut: string | null;
  secteurDefaut: string | null;
  typeDefaut: string | null;
  active: boolean;
  statut: string | null;
}

export const SOURCES_DEFAUT: SourceDefaut[] = """


def main():
    sources = lire_sources()
    erreurs = verifier(sources)
    if erreurs:
        print("Registre incoherent, rien n'a ete ecrit :")
        for e in erreurs:
            print("  - " + e)
        return 1

    rss, html, api, manuel, actives = compter(sources)
    entete = ENTETE
    for jeton, valeur in (("TOTAL", len(sources)), ("RSS", rss), ("API", api),
                          ("HTML", html), ("MANUEL", manuel),
                          ("ACTIVES", actives), ("DOLLAR", chr(36))):
        entete = entete.replace("@@" + jeton + "@@", str(valeur))
    corps = json.dumps(sources, indent=2, ensure_ascii=False)
    CIBLE.write_text(entete + corps + ";" + chr(10), encoding="utf-8",
                     newline=chr(10))

    print("Ecrit " + str(CIBLE.relative_to(RACINE)))
    print("  " + str(len(sources)) + " sources : " + str(rss) + " RSS, "
          + str(api) + " API JSON, " + str(html) + " HTML, "
          + str(manuel) + " manuelle(s)")
    print("  " + str(actives) + " actives par defaut")
    return 0


if __name__ == "__main__":
    sys.exit(main())
