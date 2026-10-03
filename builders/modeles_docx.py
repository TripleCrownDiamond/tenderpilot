"""TenderPilot - les modeles de lettres en Word, depuis le Markdown du PDF.

    python builders/modeles_docx.py

Un modele de lettre sert a etre MODIFIE, et un PDF ne se modifie pas. Le
client recoit donc aussi un .docx, qui s'ouvre dans Word, LibreOffice et
Google Docs.

Le fichier est ecrit a la main : un .docx n'est qu'une archive de quatre
fichiers XML, et l'ecrire soi-meme evite une dependance de plus que
ReportLab. La source est unique - docs/bonus/bonus-4-modeles-lettres.md -
pour que le PDF et le Word ne puissent pas diverger.

Ce qui est compris du Markdown, et rien d'autre : "## " (un modele, sur une
nouvelle page), "**gras**", les listes "- " et "1. ", les notes "> " (en
italique, a supprimer par le client), les liens [texte](adresse).
"""

import pathlib
import re
import sys
import zipfile
from xml.sax.saxutils import escape

RACINE = pathlib.Path(__file__).resolve().parent.parent

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"

TYPES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>"""

RELATIONS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"""

RELATIONS_DOCUMENT = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>"""

# Les couleurs sont celles des guides : marine #1F3A5F pour les titres,
# encre douce #4A5665 pour les notes.
STYLES = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="{W}">
<w:docDefaults>
<w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:lang w:val="fr-FR"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault>
</w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="Titre1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="120" w:after="240"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:color w:val="1F3A5F"/><w:sz w:val="32"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Note"><w:name w:val="Note"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="284"/></w:pPr><w:rPr><w:i/><w:color w:val="4A5665"/><w:sz w:val="20"/></w:rPr></w:style>
</w:styles>"""


def morceaux(texte):
    """Un paragraphe en runs Word : le gras est le seul style en ligne."""
    texte = re.sub(r"\[([^\]]+)\]\((https?://[^)]+)\)", r"\1 (\2)", texte)
    sortie = []
    for bout in re.split(r"(\*\*[^*]+\*\*)", texte):
        if not bout:
            continue
        gras = bout.startswith("**") and bout.endswith("**") and len(bout) > 4
        contenu = bout[2:-2] if gras else bout
        sortie.append("<w:r>" + ("<w:rPr><w:b/></w:rPr>" if gras else "")
                      + '<w:t xml:space="preserve">' + escape(contenu)
                      + "</w:t></w:r>")
    return "".join(sortie)


def paragraphe(texte, style=None, nouvelle_page=False):
    proprietes = ""
    if style or nouvelle_page:
        proprietes = ("<w:pPr>"
                      + (f'<w:pStyle w:val="{style}"/>' if style else "")
                      + ("<w:pageBreakBefore/>" if nouvelle_page else "")
                      + "</w:pPr>")
    return "<w:p>" + proprietes + morceaux(texte) + "</w:p>"


def blocs(markdown):
    """Le Markdown en (nature, texte), un bloc par paragraphe ou element."""
    courant = []

    def vider():
        if courant:
            yield ("texte", " ".join(courant))
            courant.clear()

    for ligne in markdown.splitlines():
        brute = ligne.strip()
        if not brute or brute == "---":
            yield from vider()
        elif brute.startswith("## "):
            yield from vider()
            yield ("titre", brute[3:].strip())
        elif brute.startswith("> "):
            yield from vider()
            yield ("note", brute[2:].strip())
        elif re.match(r"^(- |\d+\. )", brute):
            yield from vider()
            yield ("puce", re.sub(r"^- ", "• ", brute))
        else:
            courant.append(brute)
    yield from vider()


def generer(markdown, chemin):
    chemin = pathlib.Path(chemin)
    chemin.parent.mkdir(parents=True, exist_ok=True)

    corps = []
    premier_titre = True
    for nature, texte in blocs(markdown):
        if nature == "titre":
            # Un modele par page : le client imprime celui qu'il utilise.
            corps.append(paragraphe(texte, "Titre1",
                                    nouvelle_page=not premier_titre))
            premier_titre = False
        elif nature == "note":
            corps.append(paragraphe(texte, "Note"))
        else:
            corps.append(paragraphe(texte))

    document = (f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                f'<w:document xmlns:w="{W}"><w:body>' + "".join(corps)
                + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>'
                '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" '
                'w:left="1134" w:header="708" w:footer="708" w:gutter="0"/>'
                "</w:sectPr></w:body></w:document>")

    with zipfile.ZipFile(chemin, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", TYPES)
        z.writestr("_rels/.rels", RELATIONS)
        z.writestr("word/_rels/document.xml.rels", RELATIONS_DOCUMENT)
        z.writestr("word/styles.xml", STYLES)
        z.writestr("word/document.xml", document)
    return chemin


if __name__ == "__main__":
    source = RACINE / "docs" / "bonus" / "bonus-4-modeles-lettres.md"
    sortie = generer(source.read_text(encoding="utf-8"),
                     RACINE / "dist" / "TenderPilot" / "guides" / "bonus"
                     / "Bonus_4_Modeles_de_lettres.docx")
    print(sortie)
    sys.exit(0)
