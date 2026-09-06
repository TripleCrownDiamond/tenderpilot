"""TenderPilot - redimensionnement du logo et de l'icone.

    python builders/marque.py

Deux images entrent, dans data/marque/ :

    tenderpilot-logo.png   le logo horizontal, pictogramme puis texte
    tenderpilot-icon.png   l'icone carree, coins arrondis

Elles ne sont JAMAIS modifiees : tout ce qui sort va dans
data/marque/rendu/. Un original abime ne se recupere pas, et c'est le genre
de perte qu'un script de build n'a pas le droit de causer.

Les tailles ne sont pas choisies au hasard :

    logo 1200 px   pour le web, une presentation, une banniere
    logo 600 px    l'en-tete des guides PDF : 262 points par pouce a la
                   taille imprimee, deja au-dela de ce qu'un imprimeur
                   restitue. Le 900 px pesait 120 ko dans CHACUN des cinq
                   guides, pour un gain invisible - et ces PDF voyagent par
                   WhatsApp.
    icone 512      Play Store, et la source des tailles inferieures
    icone 256/128  vignettes de bureau
    icone 192      icone Android d'ecran d'accueil
    icone 180      icone iOS (apple-touch-icon)
    icone 64/32/16 favicons de navigateur

L'icone est aussi ecrite en .ico multi-tailles : c'est le seul format que
tous les navigateurs acceptent a la racine d'un site.
"""

import pathlib
import sys

RACINE = pathlib.Path(__file__).resolve().parent.parent
MARQUE = RACINE / "data" / "marque"
RENDU = MARQUE / "rendu"

LOGO = MARQUE / "tenderpilot-logo.png"
ICONE = MARQUE / "tenderpilot-icon.png"

LARGEURS_LOGO = [1200, 600]

# La taille du logo dans un EMAIL. Volontairement petite : elle voyage en
# base64 dans Marque.gs, donc dans chaque message envoye. 320 px suffit a
# une en-tete d'email et tient en quelques kilo-octets, la ou le logo 600
# en pese quarante-sept.
LARGEUR_EMAIL = 320
TAILLES_ICONE = [512, 256, 192, 180, 128, 64, 32, 16]
TAILLES_ICO = [16, 32, 48, 64, 128, 256]


def rogner(im, seuil=10):
    """Retire les marges transparentes autour du dessin.

    MESURE DU 2026-09-03 : le logo livre fait 1536x1024, mais son dessin
    n'occupe qu'une bande de 1432x319 au milieu - 69 % de l'image est du
    vide. Pose tel quel dans un en-tete de 13 mm, le logo n'en aurait
    occupe que 4. On rogne donc avant de redimensionner : a hauteur egale,
    le dessin est trois fois plus grand.

    Le seuil ignore le halo : les pixels a peine visibles ne comptent pas
    comme du dessin, sinon la marge rognee serait celle de la lueur.
    """
    masque = im.getchannel("A").point(lambda a: 255 if a > seuil else 0)
    boite = masque.getbbox()
    return im.crop(boite) if boite else im


def carrer(im):
    """Centre le dessin dans un carre transparent.

    Une icone doit etre carree : la redimensionner en (t, t) sans cela
    l'ecraserait. Le dessin rogne fait 1059x1024 - presque carre, et
    "presque" suffit a deformer visiblement le pictogramme.
    """
    from PIL import Image

    cote = max(im.size)
    fond = Image.new("RGBA", (cote, cote), (0, 0, 0, 0))
    fond.paste(im, ((cote - im.width) // 2, (cote - im.height) // 2))
    return fond


def redimensionner(source, sortie, largeur, hauteur=None, icone=False):
    """Une copie rognee puis redimensionnee, transparence conservee."""
    from PIL import Image

    with Image.open(source) as brut:
        im = rogner(brut.convert("RGBA"))
        if icone:
            im = carrer(im)
        cible = (largeur, hauteur or round(im.height * largeur / im.width))
        im.resize(cible, Image.LANCZOS).save(sortie, "PNG", optimize=True)
    return sortie


GS = RACINE / "apps_script" / "Marque.gs"


def ecrire_marque_gs(logo):
    """Ecrit le logo d'email dans un fichier Apps Script, en base64.

    POURQUOI EMBARQUER PLUTOT QUE POINTER VERS UNE URL. Un `<img src>` vers
    une image hebergee suppose un hebergement a maintenir, et Gmail passe
    les images distantes par son mandataire - beaucoup de messageries les
    bloquent tant que le lecteur n'a pas clique "afficher les images". Une
    image jointe en ligne s'affiche toujours, et le produit ne depend de
    rien.

    Le fichier est GENERE : ne pas l'editer a la main.
    """
    import base64

    donnees = base64.b64encode(logo.read_bytes()).decode("ascii")
    # Des lignes courtes : un fichier .gs d'une seule ligne de 8000
    # caracteres est illisible dans l'editeur Apps Script, et impossible a
    # diffuser proprement.
    lignes = "\n".join("  '" + donnees[i:i + 76] + "',"
                       for i in range(0, len(donnees), 76))
    GS.write_text(
        "/**\n"
        " * Le logo, embarque pour les emails.\n"
        " *\n"
        " * FICHIER GENERE par builders/marque.py depuis\n"
        " * data/marque/tenderpilot-logo.png. Ne pas editer a la main.\n"
        " *\n"
        " * Il voyage en piece jointe INLINE dans chaque alerte : une image\n"
        " * distante serait bloquee par la plupart des messageries tant que\n"
        " * le lecteur n'a pas clique \"afficher les images\", et supposerait\n"
        " * un hebergement a maintenir.\n"
        " */\n"
        "var LOGO_EMAIL_BASE64 = [\n" + lignes + "\n].join('');\n\n"
        "/** Le logo en Blob, ou null hors de Google. */\n"
        "function logoEmail_() {\n"
        "  try {\n"
        "    return Utilities.newBlob(\n"
        "      Utilities.base64Decode(LOGO_EMAIL_BASE64), 'image/png',\n"
        "      'tenderpilot.png').setName('tenderpilot.png');\n"
        "  } catch (e) {\n"
        "    // Utilities n'existe pas hors d'Apps Script : un email sans\n"
        "    // logo reste un email complet.\n"
        "    return null;\n"
        "  }\n"
        "}\n\n"
        "if (typeof module !== 'undefined') {\n"
        "  module.exports = { LOGO_EMAIL_BASE64: LOGO_EMAIL_BASE64,\n"
        "                     logoEmail_: logoEmail_ };\n"
        "}\n", encoding="utf-8")
    return GS


def main():
    try:
        from PIL import Image  # noqa: F401
    except ImportError:
        print("Pillow manquant : pip install Pillow")
        return 1

    manquants = [f.name for f in (LOGO, ICONE) if not f.exists()]
    if manquants:
        print("Images manquantes dans data/marque/ : " + ", ".join(manquants))
        print("Voir data/marque/LISEZ_MOI.md pour les noms attendus.")
        return 1

    from PIL import Image

    RENDU.mkdir(parents=True, exist_ok=True)
    faits = []

    for largeur in LARGEURS_LOGO:
        faits.append(redimensionner(
            LOGO, RENDU / f"tenderpilot-logo-{largeur}.png", largeur))

    logo_email = redimensionner(
        LOGO, RENDU / "tenderpilot-logo-email.png", LARGEUR_EMAIL)
    # QUANTIFIE A 64 COULEURS. Le logo est un aplat : 64 couleurs ne se
    # distinguent pas de 16 millions a l'oeil, et le fichier passe de 19 ko
    # a 4 ko. Comme il voyage dans CHAQUE email, c'est la difference entre
    # une piece jointe qu'on remarque et une qu'on ne remarque pas.
    with Image.open(logo_email) as brut:
        brut.convert("RGBA").quantize(
            colors=64, method=Image.Quantize.FASTOCTREE
        ).save(logo_email, optimize=True)
    faits.append(logo_email)
    faits.append(ecrire_marque_gs(logo_email))

    for taille in TAILLES_ICONE:
        faits.append(redimensionner(
            ICONE, RENDU / f"tenderpilot-icon-{taille}.png", taille, taille,
            icone=True))

    # Le .ico embarque plusieurs tailles dans un seul fichier : c'est ce que
    # demandent les navigateurs a la racine d'un site.
    from PIL import Image

    with Image.open(ICONE) as brut:
        chemin_ico = RENDU / "favicon.ico"
        carrer(rogner(brut.convert("RGBA"))).save(
            chemin_ico, sizes=[(t, t) for t in TAILLES_ICO])
        faits.append(chemin_ico)

    print("Marque rendue :")
    for f in faits:
        print(f"  {f.relative_to(RACINE)}  ({f.stat().st_size // 1024} ko)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
