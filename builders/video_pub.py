"""Rend une video publicitaire TenderPilot, image par image, sans outil externe
autre que ffmpeg pour l'encodage final.

    python3 builders/video_pub.py prix        # "Ce que coute l'information"
    python3 builders/video_pub.py tableau     # "Le tableau se remplit tout seul"
    python3 builders/video_pub.py compte      # "Le compte a rebours"

POURQUOI UN RENDU MAISON. Un montage video se refait a chaque changement de
prix, de chiffre ou de source. Ici, tout vient du meme endroit que le site :
les couleurs de la marque, les statuts du classeur, les captures reelles. Un
prix qui change, c'est une constante a modifier, pas un projet a rouvrir.

Sortie : dist/videos/<nom>.mp4, 1080x1920, 30 images par seconde, muet
(les reseaux lisent sans le son ; la voix off se pose au montage si besoin).
"""

from __future__ import annotations

import math
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

RACINE = Path(__file__).resolve().parent.parent
SITE = RACINE / "site"
SORTIE = RACINE / "dist" / "videos"
POLICES = Path("/Library/Fonts")

L, H = 1080, 1920
FPS = 30

# La charte du site, au pixel pres (site/commun.php).
NAVY = (11, 18, 37)
INDIGO = (79, 70, 255)
INDIGO_CLAIR = (165, 180, 252)
CREME = (246, 247, 250)
BLANC = (255, 255, 255)
GRIS = (107, 114, 128)
FILET = (229, 231, 235)
# Les couleurs de statut du classeur (schema/columns.py).
STATUTS = [
    ("OUVERT", (216, 243, 220), (27, 94, 43)),
    ("À SURVEILLER", (255, 243, 191), (122, 90, 0)),
    ("BIENTÔT", (255, 224, 194), (138, 62, 0)),
    ("URGENT", (255, 214, 214), (155, 28, 28)),
    ("EXPIRÉ", (236, 236, 236), (75, 85, 99)),
]

# Zone sure des reseaux : rien d'important au-dessus ni en dessous.
MARGE_HAUT, MARGE_BAS = 260, 420


def police(nom: str, taille: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(POLICES / nom), taille)


def adoucir(t: float) -> float:
    """Acceleration puis freinage : un mouvement qui demarre sec fatigue."""
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def rebond(t: float) -> float:
    """Arrivee avec un leger depassement, comme un objet qui se pose."""
    t = max(0.0, min(1.0, t))
    return 1 - math.cos(t * math.pi * 1.2) * math.exp(-3 * t)


def texte_centre(d: ImageDraw.ImageDraw, y: int, txt: str, fnt, couleur,
                 alpha: int = 255) -> int:
    bb = d.textbbox((0, 0), txt, font=fnt)
    x = (L - (bb[2] - bb[0])) // 2 - bb[0]
    d.text((x, y - bb[1]), txt, font=fnt, fill=couleur + (alpha,))
    return bb[3] - bb[1]


def fond(grain: Image.Image | None = None) -> Image.Image:
    im = Image.new("RGB", (L, H), CREME)
    d = ImageDraw.Draw(im)
    for x in range(0, L, 60):
        d.line([(x, 0), (x, H)], fill=(239, 240, 245))
    for y in range(0, H, 60):
        d.line([(0, y), (L, y)], fill=(239, 240, 245))
    return im


def calque():
    im = Image.new("RGBA", (L, H), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


def logo(hauteur: int = 90) -> Image.Image:
    src = RACINE / "data" / "marque" / "rendu" / "tenderpilot-logo-600.png"
    im = Image.open(src).convert("RGBA")
    return im.resize((round(im.width * hauteur / im.height), hauteur),
                     Image.LANCZOS)


def encoder(dossier: Path, nom: str) -> Path:
    SORTIE.mkdir(parents=True, exist_ok=True)
    chemin = SORTIE / f"{nom}.mp4"
    subprocess.run([
        "ffmpeg", "-y", "-loglevel", "error",
        "-framerate", str(FPS), "-i", str(dossier / "%05d.png"),
        "-c:v", "libx264", "-preset", "slow", "-crf", "18",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        str(chemin),
    ], check=True)
    return chemin


def rendre(nom: str, images) -> Path:
    dossier = Path(tempfile.mkdtemp(prefix=f"tp-video-{nom}-"))
    try:
        for i, im in enumerate(images):
            im.convert("RGB").save(dossier / f"{i:05d}.png")
        chemin = encoder(dossier, nom)
    finally:
        shutil.rmtree(dossier, ignore_errors=True)
    return chemin


# ---------------------------------------------------------------- video PRIX

def video_prix():
    """Les trois montants, du plus lourd au plus leger. 25 s."""
    f_etiq = police("Inter-Bold.ttf", 34)
    f_montant = police("Inter-Black.ttf", 150)
    f_unite = police("Inter-Bold.ttf", 54)
    f_source = police("Inter-Regular.ttf", 30)
    f_final = police("Inter-Black.ttf", 190)
    f_phrase = police("Inter-SemiBold.ttf", 46)
    marque = logo(78)

    blocs = [
        ("LE JOURNAL", "83 200 F", "par an", "abonnement annuel, Bénin, 2026",
         "et personne n'a le temps de le lire"),
        ("LES PLATEFORMES", "32 000 F", "par mois", "à partir de 49 € par mois",
         "× 12 mois  ≈  385 000 F par an"),
    ]
    images = []

    def poser_logo(im):
        im.paste(marque, ((L - marque.width) // 2, H - MARGE_BAS + 120), marque)

    # 1. Deux blocs de 6 s : etiquette, montant, unite, source.
    for idx, (etiq, montant, unite, source, calcul) in enumerate(blocs):
        for f in range(6 * FPS):
            t = f / FPS
            im = fond()
            c, d = calque()
            texte_centre(d, MARGE_HAUT + 20, "CE QUE COÛTE", f_etiq, GRIS)
            texte_centre(d, MARGE_HAUT + 70, "L'INFORMATION", f_etiq, GRIS)
            a_etiq = int(255 * adoucir(t / 0.4))
            d.rounded_rectangle((L // 2 - 240, 480, L // 2 + 240, 550), 35,
                                fill=INDIGO + (min(a_etiq, 255),))
            texte_centre(d, 498, etiq, f_etiq, BLANC, min(a_etiq, 255))

            if t > 0.5:
                p = rebond((t - 0.5) / 0.8)
                taille = max(1, int(150 * min(1.0, 0.7 + 0.3 * p)))
                fm = police("Inter-Black.ttf", taille)
                a = int(255 * adoucir((t - 0.5) / 0.5))
                texte_centre(d, 720, montant, fm, NAVY, min(a, 255))
                texte_centre(d, 900, unite, f_unite, GRIS, min(a, 255))

            if t > 1.4:
                a = int(255 * adoucir((t - 1.4) / 0.6))
                texte_centre(d, 1010, source, f_source, GRIS, min(a, 255))

            # La consequence, ecrite : ce que le montant devient sur l'annee.
            if t > 2.4:
                a = int(255 * adoucir((t - 2.4) / 0.6))
                d.rounded_rectangle((110, 1160, L - 110, 1280), 26,
                                    fill=(238, 240, 255) + (a,))
                texte_centre(d, 1195, calcul, f_unite, INDIGO, a)
            im = Image.alpha_composite(im.convert("RGBA"), c)
            poser_logo(im)
            images.append(im)

    # 2. La bascule : 20 000 F, une seule fois.
    for f in range(9 * FPS):
        t = f / FPS
        im = fond()
        c, d = calque()
        if t > 1.0:
            texte_centre(d, MARGE_HAUT + 20, "TENDERPILOT", f_etiq, GRIS,
                         int(255 * adoucir((t - 1.0) / 0.6)))
        # Les deux montants precedents remontent et s'effacent.
        if t < 1.2:
            a = int(255 * (1 - adoucir(t / 1.2)))
            dy = int(160 * adoucir(t / 1.2))
            texte_centre(d, 600 - dy, "83 200 F / an", f_unite, GRIS, a)
            texte_centre(d, 680 - dy, "32 000 F / mois", f_unite, GRIS, a)

        if t > 0.8:
            p = rebond((t - 0.8) / 1.0)
            taille = max(1, int(190 * min(1.0, 0.55 + 0.45 * p)))
            fm = police("Inter-Black.ttf", taille)
            texte_centre(d, 760, "20 000 F", fm, INDIGO, 255)
        if t > 1.6:
            a = int(255 * adoucir((t - 1.6) / 0.6))
            texte_centre(d, 990, "une seule fois", f_phrase, NAVY, a)
        if t > 2.6:
            a = int(255 * adoucir((t - 2.6) / 0.6))
            texte_centre(d, 1090, "Pas par mois. Pas par an.", f_source, GRIS, a)
        if t > 3.6:
            a = int(255 * adoucir((t - 3.6) / 0.6))
            d.rounded_rectangle((140, 1250, L - 140, 1250 + 130), 30,
                                fill=INDIGO + (a,))
            texte_centre(d, 1292, "tenderpilot.store", f_phrase, BLANC, a)
        if t > 4.6:
            a = int(255 * adoucir((t - 4.6) / 0.6))
            texte_centre(d, 1430, "61 sources officielles, 3× par jour",
                         f_source, GRIS, a)
            texte_centre(d, 1480, "Satisfait ou remboursé 30 jours",
                         f_source, GRIS, a)
        im = Image.alpha_composite(im.convert("RGBA"), c)
        poser_logo(im)
        images.append(im)

    return rendre("tenderpilot-prix", images)


# ------------------------------------------------------------- video TABLEAU

def video_tableau():
    """Le classeur se remplit, ligne par ligne, et l'alerte part. 20 s."""
    f_titre = police("Inter-ExtraBold.ttf", 76)
    f_sous = police("Inter-SemiBold.ttf", 40)
    f_ligne = police("Inter-SemiBold.ttf", 30)
    f_pastille = police("Inter-Bold.ttf", 24)
    f_compteur = police("Inter-Black.ttf", 120)
    marque = logo(70)

    lignes = [
        ("Construction d'un centre de santé", "Bénin", 20, 0),
        ("Fourniture de matériel informatique", "Togo", 27, 0),
        ("Réhabilitation de forages", "Niger", 33, 0),
        ("Étude de faisabilité — barrage", "Cameroun", 12, 1),
        ("Travaux d'assainissement urbain", "Bénin", 6, 2),
        ("Acquisition de véhicules", "Niger", 7, 2),
        ("Fourniture de médicaments", "Togo", 2, 3),
    ]
    images = []
    x0, x1 = 70, L - 70
    haut_ligne = 104
    y_table = 500

    for f in range(20 * FPS):
        t = f / FPS
        im = fond()
        c, d = calque()

        texte_centre(d, MARGE_HAUT + 40, "Vos appels d'offres", f_titre, NAVY)
        texte_centre(d, MARGE_HAUT + 150, "dans un seul tableau", f_titre, INDIGO)

        # Le compteur de sources monte de 0 a 61 en deux secondes.
        if 0.6 < t < 3.2:
            n = min(61, int(61 * adoucir((t - 0.6) / 1.6)))
            a = int(255 * (1 - adoucir(max(0.0, (t - 2.6) / 0.6))))
            texte_centre(d, 470, f"{n}", f_compteur, NAVY, a)
            texte_centre(d, 620, "sources officielles, lues 3× par jour",
                         f_sous, GRIS, a)

        # En-tete du tableau.
        if t > 3.1:
            a = int(255 * adoucir((t - 3.1) / 0.5))
            d.rounded_rectangle((x0, y_table, x1, y_table + 70), 16,
                                fill=NAVY + (a,))
            d.text((x0 + 30, y_table + 22), "Opportunité", font=f_ligne,
                   fill=BLANC + (a,))
            d.text((x1 - 250, y_table + 22), "Statut", font=f_ligne,
                   fill=BLANC + (a,))

        # Les lignes tombent une par une, puis se colorent.
        for i, (titre, pays, jours, st) in enumerate(lignes):
            depart = 3.4 + i * 0.34
            if t < depart:
                continue
            p = adoucir(min(1.0, (t - depart) / 0.45))
            y = y_table + 80 + i * haut_ligne
            dy = int((1 - p) * 60)
            a = int(255 * p)
            nom, fond_st, encre = STATUTS[st]
            # La couleur arrive apres la ligne : on voit le classeur juger.
            pc = adoucir(min(1.0, (t - depart - 0.5) / 0.5)) if t > depart + 0.5 else 0
            couleur = tuple(round(BLANC[k] + (fond_st[k] - BLANC[k]) * pc)
                            for k in range(3))
            d.rounded_rectangle((x0, y + dy, x1, y + dy + 88), 14,
                                fill=couleur + (a,), outline=FILET + (a,))
            # On coupe a la LARGEUR REELLE, pas a un nombre de caracteres :
            # "informatiqu" coupe net est le genre de detail qui fait douter
            # du serieux du produit dans une publicite.
            libelle = titre
            largeur_max = (x1 - 40) - (x0 + 30) - 190
            while libelle and d.textlength(libelle, font=f_ligne) > largeur_max:
                libelle = libelle[:-1]
            if libelle != titre:
                libelle = libelle.rstrip(" ,-—") + "…"
            d.text((x0 + 30, y + dy + 16), libelle, font=f_ligne,
                   fill=NAVY + (a,))
            d.text((x0 + 30, y + dy + 52), f"{pays} · {jours} jours",
                   font=f_pastille, fill=GRIS + (a,))
            if pc > 0.2:
                ap = int(255 * pc)
                bb = d.textbbox((0, 0), nom, font=f_pastille)
                larg = bb[2] - bb[0] + 32
                d.rounded_rectangle((x1 - larg - 24, y + dy + 28,
                                     x1 - 24, y + dy + 68), 20,
                                    fill=encre + (ap,))
                d.text((x1 - larg - 8, y + dy + 36), nom, font=f_pastille,
                       fill=BLANC + (ap,))

        # L'alerte : une carte qui glisse par-dessus la ligne urgente.
        if t > 12.0:
            p = rebond(min(1.0, (t - 12.0) / 0.8))
            y = int(H - MARGE_BAS - 260 + (1 - p) * 200)
            a = int(255 * adoucir(min(1.0, (t - 12.0) / 0.5)))
            d.rounded_rectangle((90, y, L - 90, y + 200), 28,
                                fill=NAVY + (a,))
            d.text((140, y + 40), "URGENT · 2 jours restants",
                   font=f_sous, fill=(255, 214, 214) + (a,))
            d.text((140, y + 105), "Fourniture de médicaments",
                   font=f_ligne, fill=BLANC + (a,))
            d.text((140, y + 145), "Email · Telegram · Agenda",
                   font=f_pastille, fill=INDIGO_CLAIR + (a,))

        if t > 16.5:
            a = int(255 * adoucir((t - 16.5) / 0.6))
            d.rectangle((0, 0, L, H), fill=CREME + (a,))
        if t > 17.0:
            a = int(255 * adoucir((t - 17.0) / 0.6))
            texte_centre(d, 780, "20 000 F", police("Inter-Black.ttf", 170),
                         INDIGO, a)
            texte_centre(d, 990, "une seule fois", f_sous, NAVY, a)
            d.rounded_rectangle((140, 1120, L - 140, 1250), 30,
                                fill=INDIGO + (a,))
            texte_centre(d, 1160, "tenderpilot.store", f_sous, BLANC, a)

        im = Image.alpha_composite(im.convert("RGBA"), c)
        im.paste(marque, ((L - marque.width) // 2, H - MARGE_BAS + 130), marque)
        images.append(im)

    return rendre("tenderpilot-tableau", images)


# -------------------------------------------------------------- video COMPTE

def video_compte():
    """Le compte a rebours, et l'alerte qui arrive. 12 s, sans un mot de trop."""
    f_geant = police("Inter-Black.ttf", 300)
    f_sous = police("Inter-SemiBold.ttf", 46)
    f_petit = police("Inter-Bold.ttf", 34)
    marque = logo(70)
    etapes = [("J-7", "vous êtes prévenu", 1), ("J-3", "on vous le rappelle", 2),
              ("J-1", "dernière chance", 3)]
    images = []

    for f in range(12 * FPS):
        t = f / FPS
        im = fond()
        c, d = calque()
        idx = min(2, int(t // 2.4))
        debut = idx * 2.4
        libelle, phrase, st = etapes[idx]
        _, fond_st, encre = STATUTS[st]

        if t < 7.2:
            p = rebond(min(1.0, (t - debut) / 0.5))
            taille = max(1, int(300 * min(1.0, 0.6 + 0.4 * p)))
            d.rounded_rectangle((0, 600, L, 1150), 0, fill=fond_st + (255,))
            texte_centre(d, 700, libelle, police("Inter-Black.ttf", taille),
                         encre)
            a = int(255 * adoucir(max(0.0, (t - debut - 0.4) / 0.5)))
            texte_centre(d, 1000, phrase, f_sous, encre, a)
        else:
            # L'alerte arrive, l'ecran se calme.
            p = adoucir(min(1.0, (t - 7.2) / 0.8))
            couleur = tuple(round(STATUTS[3][1][k] + (BLANC[k] - STATUTS[3][1][k]) * p)
                            for k in range(3))
            d.rounded_rectangle((0, 600, L, 1150), 0, fill=couleur + (255,))
            if t > 7.6:
                pc = rebond(min(1.0, (t - 7.6) / 0.6))
                y = int(700 + (1 - pc) * 120)
                a = int(255 * adoucir(min(1.0, (t - 7.6) / 0.4)))
                d.rounded_rectangle((80, y, L - 80, y + 250), 30,
                                    fill=NAVY + (a,))
                d.text((130, y + 45), "TenderPilot", font=f_petit,
                       fill=INDIGO_CLAIR + (a,))
                d.text((130, y + 105), "Échéance dans 1 jour", font=f_sous,
                       fill=BLANC + (a,))
                d.text((130, y + 175), "Ouvrir l'avis officiel", font=f_petit,
                       fill=INDIGO_CLAIR + (a,))
            if t > 9.2:
                a = int(255 * adoucir((t - 9.2) / 0.6))
                texte_centre(d, 1250, "Vous ne ratez plus une date limite.",
                             f_sous, NAVY, a)
            if t > 10.2:
                a = int(255 * adoucir((t - 10.2) / 0.5))
                d.rounded_rectangle((140, 1380, L - 140, 1510), 30,
                                    fill=INDIGO + (a,))
                texte_centre(d, 1420, "tenderpilot.store", f_sous, BLANC, a)

        im = Image.alpha_composite(im.convert("RGBA"), c)
        im.paste(marque, ((L - marque.width) // 2, H - MARGE_BAS + 150), marque)
        images.append(im)

    return rendre("tenderpilot-compte", images)


VIDEOS = {"prix": video_prix, "tableau": video_tableau, "compte": video_compte}


def main() -> int:
    noms = sys.argv[1:] or list(VIDEOS)
    for nom in noms:
        if nom not in VIDEOS:
            print(f"Video inconnue : {nom}. Au choix : {', '.join(VIDEOS)}")
            return 1
        chemin = VIDEOS[nom]()
        taille = chemin.stat().st_size / 1024 / 1024
        print(f"{chemin.relative_to(RACINE)}  ({taille:.1f} Mo)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
