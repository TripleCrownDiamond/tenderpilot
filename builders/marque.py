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

    RENDU.mkdir(parents=True, exist_ok=True)
    faits = []

    for largeur in LARGEURS_LOGO:
        faits.append(redimensionner(
            LOGO, RENDU / f"tenderpilot-logo-{largeur}.png", largeur))

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
