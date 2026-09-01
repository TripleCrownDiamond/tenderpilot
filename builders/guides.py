"""TenderPilot - guides PDF livres au client.

Les PDF sont GENERES depuis les fichiers Markdown, jamais rediges a part.
C'est la meme regle que partout ailleurs dans ce depot : une seule source de
verite. Un guide PDF ecrit a la main aurait vieilli des la premiere version
du produit, et le client aurait suivi des etapes qui n'existent plus.

    python builders/guides.py

Le rendu Markdown est volontairement partiel : titres, paragraphes, listes,
tableaux, blocs de code et citations. C'est tout ce que les guides utilisent.
Un convertisseur generique serait plus long a ecrire, plus long a corriger,
et ne servirait a rien de plus.
"""

import csv
import pathlib
import re
import sys

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    KeepTogether, ListFlowable, ListItem, Paragraph, SimpleDocTemplate,
    Spacer, Table, TableStyle,
)

RACINE = pathlib.Path(__file__).resolve().parent.parent
# Deux jeux de guides, deux dossiers.
#
# Le client et l'operateur ne lisent pas les memes documents, et chaque jeu
# se numerote a partir de 1 dans son propre dossier : un client qui recoit un
# "guide 3" se demande ou sont les deux premiers.
SORTIE = RACINE / "dist" / "TenderPilot" / "guides"
SORTIE_CLIENT = SORTIE / "client"
SORTIE_OPERATEUR = SORTIE / "operateur"

# Les memes couleurs que l'application, pour que le PDF et l'ecran se
# ressemblent : le client passe de l'un a l'autre.
MARINE = colors.HexColor("#1F3A5F")
ENCRE = colors.HexColor("#16202D")
ENCRE_DOUX = colors.HexColor("#4A5665")
TRAIT = colors.HexColor("#D5DBE3")
SURFACE = colors.HexColor("#F1F4F8")


# ------------------------------------------------------------------ styles --
def styles():
    base = getSampleStyleSheet()
    s = {}
    s["titre"] = ParagraphStyle(
        "titre", parent=base["Title"], fontName="Helvetica-Bold",
        fontSize=26, leading=31, textColor=MARINE, alignment=TA_LEFT,
        spaceAfter=4)
    s["sous_titre"] = ParagraphStyle(
        "sous_titre", parent=base["Normal"], fontSize=11, leading=15,
        textColor=ENCRE_DOUX, spaceAfter=22)
    s["h1"] = ParagraphStyle(
        "h1", parent=base["Heading1"], fontName="Helvetica-Bold",
        fontSize=16, leading=20, textColor=MARINE,
        spaceBefore=20, spaceAfter=7)
    s["h2"] = ParagraphStyle(
        "h2", parent=base["Heading2"], fontName="Helvetica-Bold",
        fontSize=12.5, leading=16, textColor=ENCRE,
        spaceBefore=14, spaceAfter=5)
    s["h3"] = ParagraphStyle(
        "h3", parent=base["Heading3"], fontName="Helvetica-Bold",
        fontSize=11, leading=14, textColor=ENCRE,
        spaceBefore=11, spaceAfter=4)
    s["corps"] = ParagraphStyle(
        "corps", parent=base["Normal"], fontName="Helvetica",
        fontSize=9.6, leading=14.5, textColor=ENCRE, spaceAfter=7)
    s["puce"] = ParagraphStyle("puce", parent=s["corps"], spaceAfter=3)
    s["code"] = ParagraphStyle(
        "code", parent=base["Code"], fontName="Courier", fontSize=8.4,
        leading=12, textColor=ENCRE, backColor=SURFACE,
        borderPadding=7, leftIndent=4, spaceBefore=5, spaceAfter=9)
    s["citation"] = ParagraphStyle(
        "citation", parent=s["corps"], leftIndent=12, textColor=ENCRE_DOUX)
    s["cellule"] = ParagraphStyle(
        "cellule", parent=s["corps"], fontSize=8.6, leading=12, spaceAfter=0)
    s["cellule_titre"] = ParagraphStyle(
        "cellule_titre", parent=s["cellule"], fontName="Helvetica-Bold",
        textColor=colors.white)
    return s


# ------------------------------------------------------- Markdown en ligne --
def enrichir(texte):
    """Gras, code et liens, convertis en balises comprises par ReportLab."""
    t = texte.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    # `code` avant **gras** : un extrait de code peut contenir des etoiles.
    t = re.sub(r"`([^`]+)`", r'<font face="Courier" size="8.6">\1</font>', t)
    t = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", t)
    t = re.sub(r"\*([^*]+)\*", r"<i>\1</i>", t)
    t = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<link href="\2"><u>\1</u></link>', t)
    return t


# ------------------------------------------------------ Markdown en blocs --
def convertir(markdown, s):
    """Markdown -> liste d'elements ReportLab.

    Le document est parcouru ligne a ligne : chaque construction se reconnait
    a son premier caractere, et aucune ne s'imbrique dans une autre. Les
    guides sont ecrits ainsi, et cela evite un analyseur recursif.
    """
    elements = []
    lignes = markdown.split("\n")
    i = 0

    while i < len(lignes):
        nu = lignes[i].strip()

        if not nu:
            i += 1
            continue

        # Bloc de code delimite par ```
        if nu.startswith("```"):
            corps = []
            i += 1
            while i < len(lignes) and not lignes[i].strip().startswith("```"):
                corps.append(lignes[i])
                i += 1
            i += 1
            texte = "\n".join(corps).replace("&", "&amp;")
            texte = texte.replace("<", "&lt;").replace(">", "&gt;")
            elements.append(Paragraph(texte.replace("\n", "<br/>"), s["code"]))
            continue

        # Tableau : une ligne de |, suivie d'une ligne de tirets
        if nu.startswith("|") and i + 1 < len(lignes) \
                and set(lignes[i + 1].strip()) <= set("|-: "):
            lignes_table = []
            while i < len(lignes) and lignes[i].strip().startswith("|"):
                lignes_table.append(lignes[i].strip())
                i += 1
            elements.append(tableau(lignes_table, s))
            continue

        # Titres
        for prefixe, style in (("### ", "h3"), ("## ", "h2"), ("# ", "h1")):
            if nu.startswith(prefixe):
                elements.append(Paragraph(enrichir(nu[len(prefixe):]), s[style]))
                i += 1
                break
        else:
            # Citation
            if nu.startswith(">"):
                corps = []
                while i < len(lignes) and lignes[i].strip().startswith(">"):
                    corps.append(lignes[i].strip().lstrip(">").strip())
                    i += 1
                elements.append(Paragraph(enrichir(" ".join(corps)),
                                          s["citation"]))
                continue

            # Listes, a puces ou numerotees
            puce = re.match(r"^[-*]\s+(.*)", nu)
            numero = re.match(r"^(\d+)\.\s+(.*)", nu)
            if puce or numero:
                numerotee = bool(numero)
                motif = (r"^(\d+)\.\s+(.*)" if numerotee
                         else r"^([-*])\s+(.*)")
                # Le numero de depart vient du Markdown, pas d'un compteur
                # qui repart a zero.
                #
                # Une etape suivie d'un bloc de code ou d'un tableau coupe la
                # liste en deux. Redemarrer chaque morceau a 1 donnait des
                # guides ou l'on lisait "1, 2, 3, 1, 1, 1" - le lecteur ne
                # sait plus ou il en est au milieu d'une installation.
                depart = int(numero.group(1)) if numerotee else 1
                items = []
                while i < len(lignes):
                    m = re.match(motif, lignes[i].strip())
                    if not m:
                        break
                    items.append(ListItem(
                        Paragraph(enrichir(m.group(2)), s["puce"]),
                        leftIndent=14))
                    i += 1
                elements.append(ListFlowable(
                    items, bulletType="1" if numerotee else "bullet",
                    start=depart if numerotee else None,
                    leftIndent=16, bulletFontSize=9))
                elements.append(Spacer(1, 6))
                continue

            # Paragraphe : tout ce qui suit jusqu'a une ligne vide
            corps = []
            while i < len(lignes) and lignes[i].strip() \
                    and not re.match(r"^([#>|`]|[-*]\s|\d+\.\s)",
                                     lignes[i].strip()):
                corps.append(lignes[i].strip())
                i += 1
            if corps:
                elements.append(Paragraph(enrichir(" ".join(corps)), s["corps"]))
            else:
                i += 1

    return elements


def tableau(lignes_md, s):
    """Tableau Markdown -> Table ReportLab, colonnes reparties sur la largeur."""
    def cellules(ligne):
        return [c.strip() for c in ligne.strip().strip("|").split("|")]

    entete = cellules(lignes_md[0])
    corps = [cellules(l) for l in lignes_md[2:]]

    donnees = [[Paragraph(enrichir(c), s["cellule_titre"]) for c in entete]]
    for ligne in corps:
        # Une ligne plus courte que l'entete ne doit pas faire tomber le rendu.
        ligne = (ligne + [""] * len(entete))[:len(entete)]
        donnees.append([Paragraph(enrichir(c), s["cellule"]) for c in ligne])

    largeur = 170 * mm
    t = Table(donnees, colWidths=[largeur / len(entete)] * len(entete),
              repeatRows=1, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), MARINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.4, TRAIT),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, SURFACE]),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return KeepTogether([t, Spacer(1, 10)])


# -------------------------------------------------------------- rendu PDF --
def rendre(markdown, chemin, titre, sous_titre, version):
    s = styles()
    chemin.parent.mkdir(parents=True, exist_ok=True)

    def decor(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 7.6)
        canvas.setFillColor(ENCRE_DOUX)
        canvas.drawString(20 * mm, 12 * mm, "TenderPilot " + version
                          + " - " + titre)
        canvas.drawRightString(190 * mm, 12 * mm, "page " + str(doc.page))
        canvas.setStrokeColor(TRAIT)
        canvas.line(20 * mm, 15 * mm, 190 * mm, 15 * mm)
        canvas.restoreState()

    doc = SimpleDocTemplate(
        str(chemin), pagesize=A4,
        leftMargin=20 * mm, rightMargin=20 * mm,
        topMargin=18 * mm, bottomMargin=22 * mm,
        title="TenderPilot - " + titre, author="TenderPilot",
        subject=sous_titre)

    histoire = [Paragraph(titre, s["titre"]),
                Paragraph(sous_titre, s["sous_titre"])]
    histoire += convertir(markdown, s)
    doc.build(histoire, onFirstPage=decor, onLaterPages=decor)
    return chemin


# ------------------------------------------------ catalogue pour le client --
def catalogue_markdown():
    """Le catalogue de sources, redige pour un acheteur.

    SOURCES.md s'adresse a un developpeur : il parle d'analyseurs, de
    fixtures et d'expressions regulieres. Le client, lui, veut savoir ce qui
    est surveille pour lui, et jusqu'ou il peut s'y fier.
    """
    with (RACINE / "data" / "sources.csv").open(encoding="utf-8", newline="") as f:
        sources = [r for r in csv.DictReader(f) if (r["Source_ID"] or "").strip()]

    actives = [s for s in sources if s["Active"].strip().upper() == "OUI"]
    pays = sorted({s["Pays_Defaut"].strip() for s in sources
                   if s["Pays_Defaut"].strip()})

    def par(champ, defaut):
        groupes = {}
        for s in sources:
            groupes.setdefault(s[champ].strip() or defaut, []).append(s)
        return dict(sorted(groupes.items(), key=lambda kv: -len(kv[1])))

    EXPLICATIONS = {
        "Appel d'offres": "un marche public : vous vendez une prestation",
        "AMI": "manifestation d'interet, souvent en amont du marche",
        "Appel a projets": "un financement : vous candidatez",
        "Subvention": "un financement, sans mise en concurrence marchande",
        "Bourse": "destine a une personne, pas a une structure",
        "(donne par la source)": "la source publie le type de chaque avis",
    }

    lignes = [
        "# Ce que TenderPilot surveille pour vous",
        "",
        "**" + str(len(sources)) + " sources**, dont **" + str(len(actives))
        + " actives** des la livraison, couvrant **" + str(len(pays))
        + " pays**.",
        "",
        "Chaque source de cette liste a ete ouverte et verifiee avant "
        "d'entrer dans le produit. La colonne Verification dit ce qui a ete "
        "trouve ce jour-la : c'est une mesure, pas une promesse.",
        "",
        "## Par type d'opportunite",
        "",
        "| Type | Sources | Ce que c'est |",
        "|------|---------|--------------|",
    ]
    for type_, liste in par("Type_Defaut", "(donne par la source)").items():
        lignes.append("| " + type_ + " | " + str(len(liste)) + " | "
                      + EXPLICATIONS.get(type_, "") + " |")

    lignes += ["", "## Par secteur", "",
               "| Secteur | Sources |", "|---------|---------|"]
    for secteur, liste in par("Secteur_Defaut", "Tous secteurs").items():
        lignes.append("| " + secteur + " | " + str(len(liste)) + " |")

    lignes += [
        "", "## Les sources qui comptent pour le Benin", "",
        "Le reste du catalogue couvre l'Afrique de l'Ouest et Centrale via "
        "les flux du PNUD, un par pays. Les sources ci-dessous sont celles "
        "qui publient des marches beninois ou regionaux, avec le detail le "
        "plus riche.",
        "",
        "| Source | Lecture | Verification |",
        "|--------|---------|--------------|",
    ]
    for s in sources:
        methode = s["Methode"].strip()
        if methode.upper() == "RSS" and not s["Source_ID"].startswith("BJ-"):
            continue
        lecture = ("API" if methode.upper().startswith("JSON:")
                   else "Page web" if methode.upper().startswith("HTML:")
                   else "Flux RSS")
        etat = "" if s["Active"].strip().upper() == "OUI" else " *(en veille)*"
        lignes.append("| " + s["Nom"].strip() + etat + " | " + lecture + " | "
                      + s["Statut"].strip() + " |")

    lignes += [
        "", "## Ce que cette liste ne promet pas", "",
        "**Les sources lues comme des pages web peuvent cesser de repondre.** "
        "Elles lisent la mise en page d'un site, pas un contrat. Le jour ou "
        "le site est refait, la source se tait jusqu'a ce que nous "
        "l'adaptions. C'est visible dans l'onglet des journaux.",
        "",
        "**Une echeance n'est affichee que si la source l'ecrit.** Nous ne "
        "devinons jamais une date limite : une date inventee vous ferait "
        "manquer un depot. Quand la colonne est vide, ouvrez l'avis officiel.",
        "",
        "**Verifiez toujours l'avis officiel avant de candidater.** "
        "TenderPilot vous fait gagner la recherche, pas la lecture du dossier.",
    ]
    return "\n".join(lignes)


# --------------------------------------------------- configuration livraison --
def livraison():
    """Lien de vente et contact, renseignes dans data/livraison.json.

    Les guides du client portent le lien et votre contact. Les ecrire en dur
    obligerait a les corriger dans trois fichiers a chaque changement ; ici
    ils sont a un seul endroit.
    """
    import json
    chemin = RACINE / "data" / "livraison.json"
    defauts = {"lien_copie": "[LIEN A RENSEIGNER]",
               "contact": "[CONTACT A RENSEIGNER]",
               "nom_vendeur": ""}
    if not chemin.exists():
        return defauts
    defauts.update(json.loads(chemin.read_text(encoding="utf-8")))
    return defauts


def remplir(markdown, conf):
    """Remplace les jetons {lien}, {contact} et {nb_sources}."""
    import csv
    with (RACINE / "data" / "sources.csv").open(encoding="utf-8", newline="") as f:
        nb = sum(1 for r in csv.DictReader(f) if (r["Source_ID"] or "").strip())
    return (markdown
            .replace("{lien}", conf["lien_copie"])
            .replace("{contact}", conf["contact"])
            .replace("{nb_sources}", str(nb)))


# ------------------------------------------------------------------ main --
def main():
    from builders.toolkit import VERSION

    readme = RACINE / "dist" / "TenderPilot" / "README.md"
    if not readme.exists():
        print("Le livrable n'existe pas. Lancer d'abord : python build.py")
        return 1

    conf = livraison()

    def lire(nom):
        return (RACINE / "docs" / nom).read_text(encoding="utf-8")

    faits = []

    # --- ce que le client recoit : un lien, et de quoi s'en servir ---
    faits.append(rendre(
        remplir(lire("guide-client-demarrage.md"), conf),
        SORTIE_CLIENT / "1_Guide_Demarrage.pdf",
        "Demarrer avec TenderPilot",
        "Cinq minutes, depuis le lien jusqu'a la premiere collecte.",
        VERSION))

    faits.append(rendre(
        catalogue_markdown(),
        SORTIE_CLIENT / "2_Catalogue_des_Sources.pdf",
        "Catalogue des sources",
        "Ce qui est surveille pour vous, et ce que cela ne promet pas.",
        VERSION))

    # --- ce que l'operateur garde : jamais livre a un client ---
    faits.append(rendre(
        remplir(lire("guide-operateur.md"), conf),
        SORTIE_OPERATEUR / "1_Guide_Operateur.pdf",
        "Preparer et vendre TenderPilot",
        "Fabriquer le classeur maitre, en tirer un lien, livrer.",
        VERSION))

    # L'installation manuelle sert a fabriquer le maitre, et a depanner un
    # client dont la copie a echoue. Elle ne part jamais chez lui : sans les
    # fichiers, le produit ne peut etre ni revendu ni redistribue.
    faits.append(rendre(
        readme.read_text(encoding="utf-8"),
        SORTIE_OPERATEUR / "2_Installation_Manuelle.pdf",
        "Installation manuelle",
        "Coller les fichiers de script un par un, pour fabriquer le maitre.",
        VERSION))

    # --- l'autre produit ---
    guide_web = RACINE / "docs" / "guide-web.md"
    if guide_web.exists():
        faits.append(rendre(
            guide_web.read_text(encoding="utf-8"),
            SORTIE_OPERATEUR / "3_Guide_Application_Web.pdf",
            "Guide de l'application web",
            "Mise en ligne, configuration et utilisation.",
            VERSION))

    for f in sorted(faits):
        print("  " + str(f.relative_to(RACINE)) + "  ("
              + str(f.stat().st_size // 1024) + " ko)")
    return 0


if __name__ == "__main__":
    sys.path.insert(0, str(RACINE))
    sys.exit(main())
