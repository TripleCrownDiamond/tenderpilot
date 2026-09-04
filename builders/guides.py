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
from reportlab.pdfgen import canvas
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Image, KeepTogether, ListFlowable, ListItem, Paragraph, SimpleDocTemplate,
    Spacer, Table, TableStyle,
)
from reportlab.platypus.flowables import HRFlowable

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
        textColor=ENCRE_DOUX, spaceAfter=10)

    # keepWithNext COLLE CHAQUE TITRE A CE QUI LE SUIT.
    #
    # MESURE DU 2026-09-03 : "Par secteur" se retrouvait seul en bas de la
    # premiere page du catalogue, son tableau rejete a la page suivante, et
    # vingt centimetres de blanc entre les deux. Un titre orphelin n'est pas
    # qu'inelegant : il fait croire que la section est vide.
    s["h1"] = ParagraphStyle(
        "h1", parent=base["Heading1"], fontName="Helvetica-Bold",
        fontSize=16, leading=20, textColor=MARINE,
        spaceBefore=20, spaceAfter=7, keepWithNext=1)
    s["h2"] = ParagraphStyle(
        "h2", parent=base["Heading2"], fontName="Helvetica-Bold",
        fontSize=12.5, leading=16, textColor=ENCRE,
        spaceBefore=15, spaceAfter=5, keepWithNext=1)
    s["h3"] = ParagraphStyle(
        "h3", parent=base["Heading3"], fontName="Helvetica-Bold",
        fontSize=11, leading=14, textColor=ENCRE,
        spaceBefore=11, spaceAfter=4, keepWithNext=1)

    # allowWidows=0 : jamais une derniere ligne seule en haut d'une page.
    # allowOrphans=0 : jamais une premiere ligne seule en bas.
    # Les memes titres, sans keepWithNext : voir grand_tableau_apres.
    for niveau in ("h1", "h2", "h3"):
        s[niveau + "_libre"] = ParagraphStyle(
            niveau + "_libre", parent=s[niveau], keepWithNext=0)

    s["corps"] = ParagraphStyle(
        "corps", parent=base["Normal"], fontName="Helvetica",
        fontSize=9.6, leading=15, textColor=ENCRE, spaceAfter=8,
        allowWidows=0, allowOrphans=0)
    s["puce"] = ParagraphStyle("puce", parent=s["corps"], spaceAfter=3)
    s["code"] = ParagraphStyle(
        "code", parent=base["Code"], fontName="Courier", fontSize=8.4,
        leading=12.5, textColor=ENCRE, backColor=SURFACE,
        borderPadding=8, borderWidth=0.5, borderColor=TRAIT,
        leftIndent=4, spaceBefore=6, spaceAfter=10)
    s["citation"] = ParagraphStyle(
        "citation", parent=s["corps"], fontSize=9.4, leading=14,
        textColor=ENCRE_DOUX, spaceAfter=0)
    s["cellule"] = ParagraphStyle(
        "cellule", parent=s["corps"], fontSize=8.6, leading=12, spaceAfter=0,
        allowWidows=1, allowOrphans=1)
    s["cellule_titre"] = ParagraphStyle(
        "cellule_titre", parent=s["cellule"], fontName="Helvetica-Bold",
        textColor=colors.white)
    return s


# ------------------------------------------------------- Markdown en ligne --
#
# Le bleu des liens est CELUI DU LOGO, releve sur l'image : #0050F0 est la
# teinte dominante de l'avion et du mot "Pilot". Un lien d'une autre couleur
# se verrait comme une piece rapportee sur un document a en-tete.
LIEN = colors.HexColor("#0050F0")

# Une adresse s'arrete avant la ponctuation de la phrase. Sans cela, le
# point final d'une phrase entrerait dans l'URL et le lien serait mort.
MOTIF_URL = re.compile(r"https?://[^\s<>\"')\]]+[^\s<>\"')\].,;:!?]")
MOTIF_EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+[\w]")
# Un numero n'est cliquable que s'il est ANNONCE comme WhatsApp : sans cette
# condition, une reference d'avis ou un montant deviendrait un lien.
MOTIF_WHATSAPP = re.compile(r"(WhatsApp\s+)(\+[\d\s().-]{8,}\d)", re.I)


def lien_html(adresse, texte):
    """Un lien ReportLab colore et souligne."""
    return ('<link href="' + adresse + '" color="#'
            + LIEN.hexval()[2:] + '"><u>' + texte + "</u></link>")


def enrichir(texte):
    """Gras, code et liens, convertis en balises comprises par ReportLab.

    LES LIENS ECRITS EN TOUTES LETTRES SONT CLIQUABLES EUX AUSSI. Les guides
    portent le lien de copie, le groupe WhatsApp, une adresse email et un
    numero : les laisser en texte mort obligerait le lecteur d'un PDF a les
    recopier a la main, sur un telephone, sans se tromper d'un caractere.

    Les liens Markdown sont mis de cote AVANT le reste, sous un jeton que
    rien d'autre ne peut produire : sinon on transformerait aussi l'adresse
    qui vit a l'interieur de leur parenthese, et le lien porterait un lien.
    """
    t = texte.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    # `code` avant **gras** : un extrait de code peut contenir des etoiles.
    t = re.sub(r"`([^`]+)`", r'<font face="Courier" size="8.6">\1</font>', t)
    t = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", t)
    t = re.sub(r"\*([^*]+)\*", r"<i>\1</i>", t)

    garde = []

    def mettre_de_cote(html):
        garde.append(html)
        return "\x00" + str(len(garde) - 1) + "\x00"

    t = re.sub(r"\[([^\]]+)\]\(([^)]+)\)",
               lambda m: mettre_de_cote(lien_html(m.group(2), m.group(1))), t)
    t = MOTIF_URL.sub(
        lambda m: mettre_de_cote(lien_html(m.group(0), m.group(0))), t)
    t = MOTIF_EMAIL.sub(
        lambda m: mettre_de_cote(
            lien_html("mailto:" + m.group(0), m.group(0))), t)
    # wa.me n'accepte que les chiffres : +229 01 67 65 97 17 devient
    # 2290167659717, mais le lecteur continue de lire le numero espace.
    t = MOTIF_WHATSAPP.sub(
        lambda m: m.group(1) + mettre_de_cote(lien_html(
            "https://wa.me/" + re.sub(r"\D", "", m.group(2)), m.group(2))), t)

    for i, html in enumerate(garde):
        t = t.replace("\x00" + str(i) + "\x00", html)
    return t


# ------------------------------------------------------ Markdown en blocs --
def grand_tableau_apres(lignes, i, seuil=8):
    """Le bloc qui suit ce titre est-il un tableau trop grand pour tenir ?

    On saute les lignes vides, puis on compte les rangees. Le seuil est le
    meme que celui de tableau() : au-dela, le tableau se coupe plutot que
    de basculer entier.
    """
    j = i + 1
    while j < len(lignes) and not lignes[j].strip():
        j += 1
    if j >= len(lignes) or not lignes[j].strip().startswith("|"):
        return False
    rangees = 0
    while j < len(lignes) and lignes[j].strip().startswith("|"):
        rangees += 1
        j += 1
    return rangees > seuil



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

        # Filet horizontal. Sans ce cas, le "---" du Markdown s'imprimait
        # tel quel au milieu d'un guide livre au client - trois tirets qui
        # ressemblent a une coquille.
        if set(nu) <= set("-") and len(nu) >= 3:
            elements.append(Spacer(1, 6))
            elements.append(HRFlowable(width="100%", thickness=0.6,
                                       color=TRAIT, spaceAfter=8))
            i += 1
            continue

        # Tableau : une ligne de |, suivie d'une ligne de tirets
        if nu.startswith("|") and i + 1 < len(lignes) \
                and set(lignes[i + 1].strip()) <= set("|-: "):
            lignes_table = []
            while i < len(lignes) and lignes[i].strip().startswith("|"):
                lignes_table.append(lignes[i].strip())
                i += 1
            elements.extend(tableau(lignes_table, s))
            continue

        # Titres
        for prefixe, style in (("### ", "h3"), ("## ", "h2"), ("# ", "h1")):
            if nu.startswith(prefixe):
                # UN TITRE SE COLLE A CE QUI LE SUIT, SAUF DEVANT UN GRAND
                # TABLEAU. keepWithNext force le titre ET tout l'element
                # suivant sur la meme page : devant un tableau de quatorze
                # lignes, les deux basculent a la page suivante et laissent
                # un tiers de page blanc. Sans keepWithNext, le tableau
                # commence sous le titre et se coupe proprement, entete
                # repetee. Un titre suivi de trois rangees n'est pas
                # orphelin.
                elements.append(Paragraph(
                    enrichir(nu[len(prefixe):]),
                    s[style + "_libre"] if grand_tableau_apres(lignes, i)
                    else s[style]))
                i += 1
                break
        else:
            # Citation
            if nu.startswith(">"):
                corps = []
                while i < len(lignes) and lignes[i].strip().startswith(">"):
                    corps.append(lignes[i].strip().lstrip(">").strip())
                    i += 1
                elements.extend(citation(enrichir(" ".join(corps)), s))
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
                    # "1." et non "1" : c'est ainsi que le Markdown source
                    # l'ecrit, et une etape numerotee se lit mieux avec son
                    # point.
                    bulletFormat="%s." if numerotee else None,
                    leftIndent=16, bulletFontSize=9.6,
                    bulletColor=MARINE if numerotee else ENCRE_DOUX))
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


def largeurs_colonnes(entete, corps, totale):
    """Repartit la largeur d'apres ce que les colonnes contiennent.

    MESURE DU 2026-09-03, sur le catalogue : trois colonnes egales donnaient
    autant de place a "Sources" - un nombre a deux chiffres - qu'a "Ce que
    c'est", qui porte une phrase. La phrase se cassait en trois lignes pendant
    que le nombre flottait au milieu du vide.

    On mesure donc le texte le plus long de chaque colonne, en bornant : une
    colonne ne descend pas sous 12 % de la largeur - sinon son titre se casse -
    et ne depasse pas 55 %, pour qu'une colonne bavarde n'ecrase pas les
    autres.
    """
    lignes = [entete] + corps
    poids = []
    for i in range(len(entete)):
        # La racine carree amortit les ecarts : une cellule dix fois plus
        # longue merite plus de place, pas dix fois plus.
        long_max = max((len(l[i]) for l in lignes if i < len(l)), default=1)
        poids.append(max(long_max, 1) ** 0.5)

    somme = sum(poids)
    parts = [p / somme for p in poids]
    parts = [min(max(p, 0.12), 0.55) for p in parts]
    somme = sum(parts)
    return [totale * p / somme for p in parts]


def tableau(lignes_md, s):
    """Tableau Markdown -> Table ReportLab, colonnes reparties par contenu."""
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
    t = Table(donnees, colWidths=largeurs_colonnes(entete, corps, largeur),
              repeatRows=1, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), MARINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        # Pas de grille complete : seulement des filets horizontaux. Un
        # quadrillage enferme chaque mot dans une case et fatigue la lecture ;
        # les lignes suffisent a suivre une rangee.
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, TRAIT),
        ("LINEBELOW", (0, 0), (-1, 0), 0.8, MARINE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, SURFACE]),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, 0), 7),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 7),
        ("TOPPADDING", (0, 1), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 6),
    ]))
    # Un tableau qui ne tient pas dans la place restante et qu'on force d'un
    # bloc est rejete ENTIER a la page suivante, en laissant un grand vide
    # derriere lui. Seuls les petits tableaux - une poignee de lignes - sont
    # gardes d'un tenant : au-dela, la coupure est preferable au trou, et
    # repeatRows=1 fait suivre l'entete sur la page suivante.
    #
    # Mesure du 2026-09-03 : le catalogue a des tableaux de 11, 14 et 41
    # lignes. Le seuil est sous le plus petit des trois.
    if len(donnees) > 8:
        return [t, Spacer(1, 10)]
    return [KeepTogether([t, Spacer(1, 10)])]


def citation(texte, s):
    """Une citation, barree a gauche d'un filet bleu.

    Un simple retrait ne se distinguait pas d'un paragraphe indente : le
    lecteur ne voyait pas qu'il changeait de voix.
    """
    interieur = Paragraph(texte, s["citation"])
    t = Table([[interieur]], colWidths=[166 * mm], hAlign="LEFT")
    t.setStyle(TableStyle([
        ("LINEBEFORE", (0, 0), (0, -1), 2.2, LIEN),
        ("BACKGROUND", (0, 0), (-1, -1), SURFACE),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return [t, Spacer(1, 9)]


# -------------------------------------------------------------- rendu PDF --
# ---------------------------------------------------------------- marque --
LOGO_GUIDES = RACINE / "data" / "marque" / "rendu" / "tenderpilot-logo-600.png"
LOGO_SOURCE = RACINE / "data" / "marque" / "tenderpilot-logo.png"

def logo_guides(hauteur_mm=13):
    """Le logo horizontal en tete des guides, ou rien.

    On prend le rendu redimensionne s'il existe, l'original sinon : le
    guide s'imprime meme quand personne n'a lance builders/marque.py. Et
    sans aucune des deux images, il s'imprime encore - un livrable ne
    dependra jamais d'un fichier de marque.
    """
    fichier = LOGO_GUIDES if LOGO_GUIDES.exists() else LOGO_SOURCE
    if not fichier.exists():
        return None
    try:
        from PIL import Image as PilImage
        with PilImage.open(fichier) as im:
            ratio = im.width / im.height
    except Exception:
        return None
    hauteur = hauteur_mm * mm
    return Image(str(fichier), width=hauteur * ratio, height=hauteur,
                 hAlign="LEFT")


class CanevasNumerote(canvas.Canvas):
    """Un canevas qui connait le nombre total de pages.

    "page 3" ne dit pas au lecteur s'il en reste dix ou une. Le total ne
    peut se savoir qu'une fois tout le document mis en page : on garde donc
    l'etat de chaque page, et on ne les ecrit qu'a la fin, quand le compte
    est connu.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._pages = []

    def showPage(self):
        self._pages.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        total = len(self._pages)
        for etat in self._pages:
            self.__dict__.update(etat)
            self.pied(total)
            super().showPage()
        super().save()

    def pied(self, total):
        self.saveState()
        self.setFont("Helvetica", 7.6)
        self.setFillColor(ENCRE_DOUX)
        self.drawString(20 * mm, 12 * mm, self._legende)
        self.drawRightString(190 * mm, 12 * mm,
                             "page %d / %d" % (self._pageNumber, total))
        self.setStrokeColor(TRAIT)
        self.line(20 * mm, 15 * mm, 190 * mm, 15 * mm)
        self.restoreState()


def rendre(markdown, chemin, titre, sous_titre, version):
    s = styles()
    chemin.parent.mkdir(parents=True, exist_ok=True)

    doc = SimpleDocTemplate(
        str(chemin), pagesize=A4,
        leftMargin=20 * mm, rightMargin=20 * mm,
        topMargin=18 * mm, bottomMargin=22 * mm,
        title="TenderPilot - " + titre, author="TenderPilot",
        subject=sous_titre)

    histoire = []
    # Le logo n'est pas obligatoire : sans le fichier, le guide s'imprime
    # avec son titre seul. Un build ne doit jamais dependre d'une image.
    logo = logo_guides()
    if logo:
        histoire.append(logo)
        histoire.append(Spacer(1, 8))
    histoire += [Paragraph(titre, s["titre"]),
                 Paragraph(sous_titre, s["sous_titre"]),
                 # Un filet ferme le bloc de titre : sans lui, le premier
                 # paragraphe semblait appartenir au sous-titre.
                 HRFlowable(width="100%", thickness=1, color=MARINE,
                            spaceAfter=16)]
    # Le titre du PDF et le premier "# " du Markdown disent la meme chose :
    # l'imprimer deux fois de suite, sous le logo, faisait trois fois la
    # marque en tete de page. On retire le doublon, jamais un titre
    # different - un guide dont le fichier source a son propre titre le
    # garde.
    corps = markdown.lstrip()
    premiere = corps.split("\n", 1)[0].strip()
    if premiere.lower() == ("# " + titre).lower():
        corps = corps.split("\n", 1)[1] if "\n" in corps else ""
    histoire += convertir(corps, s)
    CanevasNumerote._legende = "TenderPilot " + version + " - " + titre
    doc.build(histoire, canvasmaker=CanevasNumerote)
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
        "", "## Les sources qui demandent un compte", "",
        "Deux portails majeurs publient leurs avis librement, mais ne se "
        "laissent pas lire par un programme. TenderPilot ne les collecte "
        "donc pas - et il vaut mieux le savoir que de croire qu'ils "
        "n'existent pas.",
        "",
        "**L'AFD publie ses marches sur dgMarket** : "
        "https://afd.dgmarket.com. La liste y est complete et gratuite - "
        "pays, intitule, date de publication et date limite pour chaque "
        "avis. Mais le portail ouvre une session avant d'afficher quoi que "
        "ce soit, et les dossiers d'appel d'offres eux-memes demandent une "
        "adhesion dgMarket.",
        "",
        "**Consultez-le a la main, c'est gratuit.** L'AFD publie son propre "
        "mode d'emploi : "
        "https://www.afd.fr/sites/afd/files/2018-03-11-28-10/AFD_dgmarket_Guide_VF.pdf"
        " - il explique la creation du compte et la recherche d'avis. Leur "
        "page d'entree est https://www.afd.fr/fr/repondre-un-appel-doffres",
        "",
        "**Ce que TenderPilot surveille quand meme chez l'AFD** : ses "
        "appels a projets, qui sont publies en clair sur afd.fr et qui, eux, "
        "arrivent dans votre tableau.",
        "",
        "**La Banque africaine de developpement**, elle, est passee derriere "
        "un controle anti-robot : son site entier repond 403 a tout client "
        "sans navigateur, y compris son propre fichier robots.txt. Elle "
        "reste dans le catalogue, en veille, prete a etre reactivee le jour "
        "ou elle rouvrira.",
    ]

    lignes += [
        "", "## Pourquoi certains liens ouvrent une liste, et pas l'avis",
        "",
        "La plupart des sources donnent une adresse par avis : le lien vous "
        "amene directement dessus. Trois cas font exception, et ils "
        "s'expliquent.",
        "",
        "**Le portail des marches publics du Benin ne publie pas de page par "
        "avis.** Meme dans votre navigateur, un avis n'a pas d'adresse a lui : "
        "la liste affiche tout, et le seul lien de chaque ligne est celui de "
        "son PDF. Le lien vous amene donc sur la liste, ou l'avis se retrouve "
        "par son objet ou par son autorite contractante.",
        "",
        "**Et son PDF ne peut pas etre recupere automatiquement.** Le fichier "
        "existe et se telecharge librement depuis le portail, mais son "
        "adresse n'est publiee nulle part : elle n'est connue que du "
        "navigateur, apres affichage de la page. Le flux officiel du portail, "
        "lui, ne la donne pas. Il faudrait un acces developpeur accorde par "
        "la DNCMP pour l'obtenir.",
        "",
        "**Quelques sites refusent les visites automatiques.** L'UNICEF, par "
        "exemple, ouvre normalement ses pages dans un navigateur mais les "
        "refuse a un programme. Le lien est bon : il s'ouvrira chez vous.",
        "",
        "## Pourquoi la colonne Deadline est parfois vide",
        "",
        "Parce que la source ne l'a pas ecrite. C'est frequent sur le portail "
        "beninois, dont le flux ne porte aucune echeance : la date limite est "
        "dans le PDF de l'avis, pas dans ce qui est publie. La ligne reste "
        "donc en DATE A VERIFIER, et le lien vous mene la ou la trouver.",
        "",
        "Une case vide veut dire *la source ne l'a pas dit*. Elle ne veut "
        "jamais dire *il n'y a pas de date* - et c'est pour cela que nous "
        "n'en inventons aucune.",
        "",
        "## Pourquoi la colonne Budget est presque toujours vide",
        "",
        "Parce que deux sources seulement publient un montant : le portail "
        "europeen et Fundpilote. Les autres - Banque mondiale, portail "
        "beninois, GIZ, PNUD, Niger Marches - n'en donnent aucun. Quand le "
        "montant figure en toutes lettres dans une page, nous ne le lisons "
        "pas non plus : \"3.5\" pour trois millions et demi serait faux d'un "
        "facteur mille, et un budget faux vaut moins qu'une case vide.",
    ]

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
               "groupe_whatsapp": "",
               "nom_vendeur": ""}
    if not chemin.exists():
        return defauts
    defauts.update(json.loads(chemin.read_text(encoding="utf-8")))
    return defauts


def remplir(markdown, conf):
    """Remplace les jetons {lien}, {contact}, {groupe} et {nb_sources}.

    Un jeton absent de la configuration devient une chaine vide, jamais un
    "{groupe}" imprime tel quel dans un PDF livre au client.
    """
    import csv
    with (RACINE / "data" / "sources.csv").open(encoding="utf-8", newline="") as f:
        nb = sum(1 for r in csv.DictReader(f) if (r["Source_ID"] or "").strip())
    return (markdown
            .replace("{lien}", conf["lien_copie"])
            .replace("{contact}", conf["contact"])
            .replace("{groupe}", conf.get("groupe_whatsapp") or "")
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
