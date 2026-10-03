"""La video longue de TenderPilot : fonds animes, captures reelles du produit,
voix off et musique, rendues entierement sur la machine.

    python3 builders/video_film.py            # image + son, 50 s, 1080x1920
    python3 builders/video_film.py --muet     # sans bande son (montage a part)

CE QUI EST FABRIQUE ICI, ET POURQUOI. Une publicite se refait a chaque
changement de prix ou de chiffre. Tout vient donc d'un seul endroit : les
couleurs de la marque, les statuts du classeur, les captures du produit et
le texte des scenes. On change une ligne, on relance, la video est refaite.

LE SON. La musique est synthetisee (accords tenus, souffles, clics), la voix
off est dite par la synthese vocale du systeme (`say`). C'est une maquette
honnete : elle sert a valider le rythme. Pour la diffusion, remplacez la
piste voix par un enregistrement humain - le script est dans SCENES.
"""

from __future__ import annotations

import math
import shutil
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

RACINE = Path(__file__).resolve().parent.parent
SITE = RACINE / "site"
SORTIE = RACINE / "dist" / "videos"
POLICES = Path("/Library/Fonts")

L, H = 1080, 1920
FPS = 30
ECH = 44100                      # frequence d'echantillonnage du son
MARGE_HAUT, MARGE_BAS = 250, 400

NAVY = (11, 18, 37)
INDIGO = (79, 70, 255)
INDIGO_PALE = (165, 180, 252)
CREME = (246, 247, 250)
BLANC = (255, 255, 255)
GRIS = (107, 114, 128)
GRIS_CLAIR = (209, 213, 219)
FILET = (229, 231, 235)
STATUTS = [
    ("OUVERT", (216, 243, 220), (27, 94, 43)),
    ("À SURVEILLER", (255, 243, 191), (122, 90, 0)),
    ("BIENTÔT", (255, 224, 194), (138, 62, 0)),
    ("URGENT", (255, 214, 214), (155, 28, 28)),
]

# Le script : une entree par scene. Le texte dit est aussi le sous-titre,
# pour que l'image et la voix ne puissent pas diverger.
SCENES = [
    dict(nom="probleme", duree=8.0, sombre=True,
         voix="Chaque semaine, des appels d'offres sortent au Bénin, au Togo, "
              "au Niger, au Cameroun. Le problème n'est pas qu'il n'y en a pas. "
              "C'est qu'ils sont partout à la fois.",
         titre=["Ils sont partout.", "Vous, vous avez un métier."]),
    dict(nom="cout", duree=10.0, sombre=False,
         voix="Pour les suivre, un cabinet paie jusqu'à quatre-vingt-trois mille "
              "deux cents francs par an de journal. Une plateforme de veille, "
              "elle, commence autour de trente-deux mille francs par mois.",
         titre=["Ce que coûte l'information"]),
    dict(nom="produit", duree=10.0, sombre=False,
         voix="TenderPilot, c'est un classeur Google. Il lit soixante et une "
              "sources officielles, trois fois par jour, et il remplit votre "
              "tableau avec les opportunités.",
         titre=["61 sources, 3 fois par jour"]),
    dict(nom="alertes", duree=9.0, sombre=True,
         voix="Chaque ligne se colore selon le temps qui reste. Et vous êtes "
              "prévenu avant l'échéance : par email, sur Telegram, et dans "
              "votre agenda.",
         titre=["Vous êtes prévenu", "avant la date limite"]),
    dict(nom="couverture", duree=7.0, sombre=False,
         voix="Portails nationaux et bailleurs internationaux : Banque mondiale, "
              "PNUD, Union européenne. Huit pays suivis.",
         titre=["National et international"]),
    dict(nom="offre", duree=10.0, sombre=True,
         voix="Dix mille francs, une seule fois, pour les cinquante premières "
              "places. Satisfait ou remboursé trente jours. TenderPilot : "
              "trouvez les bons appels d'offres, avant la deadline.",
         titre=["20 000 F une seule fois"]),
]


def police(nom: str, taille: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(POLICES / nom), taille)


def adoucir(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def rebond(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return 1 - math.cos(t * math.pi * 1.2) * math.exp(-3.2 * t)


def calque():
    im = Image.new("RGBA", (L, H), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


def centrer(d, y, txt, fnt, couleur, alpha=255):
    bb = d.textbbox((0, 0), txt, font=fnt)
    d.text(((L - (bb[2] - bb[0])) // 2 - bb[0], y - bb[1]), txt, font=fnt,
           fill=tuple(couleur) + (alpha,))
    return bb[3] - bb[1]


# ------------------------------------------------------------------- FONDS

_GRILLE_X, _GRILLE_Y = np.meshgrid(np.linspace(0, 1, L // 4),
                                   np.linspace(0, 1, H // 4))


def fond_anime(t: float, sombre: bool) -> Image.Image:
    """Deux halos qui derivent lentement. Calcule en quart de resolution :
    un degrade n'a pas besoin de finesse, et le rendu est quatre fois plus
    rapide."""
    base = np.array(NAVY if sombre else CREME, dtype=np.float32)
    halo = np.array(INDIGO if sombre else (223, 226, 255), dtype=np.float32)
    img = np.repeat(np.repeat(base[None, None, :], H // 4, 0), L // 4, 1)

    for i, (vx, vy, rayon, force) in enumerate((
            (0.22, 0.13, 0.55, 0.85), (0.17, 0.21, 0.42, 0.6))):
        cx = 0.5 + 0.34 * math.sin(t * vx + i * 2.1)
        cy = 0.35 + 0.30 * math.cos(t * vy + i * 1.3)
        dist = np.sqrt(((_GRILLE_X - cx) * 1.0) ** 2
                       + ((_GRILLE_Y - cy) * 0.62) ** 2)
        poids = np.clip(1 - dist / rayon, 0, 1) ** 2 * force
        img += (halo - base) * poids[..., None]

    im = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
    im = im.resize((L, H), Image.BILINEAR).filter(ImageFilter.GaussianBlur(6))

    # Une grille discrete par-dessus : elle donne l'echelle et evite le
    # fond "plat" des videos generees a la chaine.
    d = ImageDraw.Draw(im, "RGBA")
    trait = (255, 255, 255, 14) if sombre else (11, 18, 37, 10)
    decalage = int((t * 12) % 64)
    for x in range(-64 + decalage, L, 64):
        d.line([(x, 0), (x, H)], fill=trait)
    for y in range(-64 + decalage, H, 64):
        d.line([(0, y), (L, y)], fill=trait)
    return im.convert("RGBA")


def poussiere(d, t: float, sombre: bool, n: int = 26):
    """Des points qui derivent. Deterministe : la meme seconde donne la meme
    image, sinon un rendu relance ne serait pas reproductible."""
    for i in range(n):
        vitesse = 18 + (i % 7) * 6
        x = (i * 137) % L
        y = (H - (t * vitesse + i * 221) % (H + 200)) - 100
        r = 3 + (i % 3) * 2
        a = 40 + (i % 5) * 18
        coul = (255, 255, 255, a) if sombre else (79, 70, 255, a // 2)
        d.ellipse((x - r, y - r, x + r, y + r), fill=coul)


# ------------------------------------------------------------------ IMAGES

def capture(nom: str, largeur: int) -> Image.Image:
    im = Image.open(SITE / nom).convert("RGBA")
    return im.resize((largeur, round(im.height * largeur / im.width)),
                     Image.LANCZOS)


def telephone(interieur: Image.Image, largeur: int) -> Image.Image:
    """Une capture posee dans un cadre de telephone dessine."""
    bord = max(8, largeur // 26)
    ecran = interieur.resize(
        (largeur - 2 * bord, round(interieur.height * (largeur - 2 * bord)
                                   / interieur.width)), Image.LANCZOS)
    hauteur = ecran.height + 2 * bord
    cadre = Image.new("RGBA", (largeur, hauteur), (0, 0, 0, 0))
    d = ImageDraw.Draw(cadre)
    d.rounded_rectangle((0, 0, largeur, hauteur), bord * 2.4, fill=NAVY + (255,))
    masque = Image.new("L", ecran.size, 0)
    ImageDraw.Draw(masque).rounded_rectangle((0, 0, ecran.width, ecran.height),
                                             bord * 1.6, fill=255)
    cadre.paste(ecran, (bord, bord), masque)
    d.rounded_rectangle((largeur * 0.36, bord * 0.7, largeur * 0.64,
                         bord * 2.1), bord, fill=NAVY + (255,))
    return cadre


def logo(hauteur: int) -> Image.Image:
    im = Image.open(RACINE / "data" / "marque" / "rendu"
                    / "tenderpilot-logo-600.png").convert("RGBA")
    return im.resize((round(im.width * hauteur / im.height), hauteur),
                     Image.LANCZOS)


def logo_clair(hauteur: int) -> Image.Image:
    """Le logo prevu pour les fonds sombres (site/logo-clair.png). Blanchir
    le logo fonce a la main mangeait le mot "Pilot", qui est bleu."""
    im = Image.open(SITE / "logo-clair.png").convert("RGBA")
    return im.resize((round(im.width * hauteur / im.height), hauteur),
                     Image.LANCZOS)


# ------------------------------------------------------------------ SCENES

def scene_probleme(d, t: float, duree: float, polices_: dict):
    f_t = polices_["titre"]
    if t > 0.3:
        centrer(d, 620, "Ils sont partout.", f_t, BLANC,
                int(255 * adoucir((t - 0.3) / 0.6)))
    if t > 1.1:
        centrer(d, 740, "Vous, vous avez", f_t, BLANC,
                int(255 * adoucir((t - 1.1) / 0.6)))
        centrer(d, 860, "un métier.", f_t, INDIGO_PALE,
                int(255 * adoucir((t - 1.3) / 0.6)))
    # Des fenetres de portails qui s'empilent, de plus en plus vite.
    if t > 2.2:
        avance = adoucir((t - 2.2) / 4.2)
        n = int(18 * avance)
        for i in range(n):
            x = 90 + (i % 3) * 320
            y = 1080 + (i // 3) * 118
            a = int(200 * min(1.0, (avance * 18 - i)))
            d.rounded_rectangle((x, y, x + 280, y + 96), 16,
                                fill=(255, 255, 255, max(0, a // 5)),
                                outline=(255, 255, 255, max(0, a // 2)))
            for k in range(3):
                d.rounded_rectangle((x + 24, y + 26 + k * 20,
                                     x + 240 - k * 60, y + 34 + k * 20), 4,
                                    fill=(255, 255, 255, max(0, a // 3)))


def scene_cout(d, t: float, duree: float, p: dict):
    centrer(d, MARGE_HAUT + 30, "CE QUE COÛTE L'INFORMATION", p["sur"], GRIS)
    if t > 0.4:
        a = int(255 * adoucir((t - 0.4) / 0.5))
        centrer(d, 560, "83 200 F", p["montant"], NAVY, a)
        centrer(d, 740, "par an — le journal", p["sous"], GRIS, a)
        centrer(d, 800, "abonnement annuel, Bénin, 2026", p["note"], GRIS_CLAIR, a)
    if t > 3.4:
        a = int(255 * adoucir((t - 3.4) / 0.5))
        centrer(d, 980, "32 000 F", p["montant"], NAVY, a)
        centrer(d, 1160, "par mois — une plateforme", p["sous"], GRIS, a)
        centrer(d, 1220, "à partir de 49 € par mois", p["note"], GRIS_CLAIR, a)
    if t > 6.4:
        a = int(255 * adoucir((t - 6.4) / 0.6))
        d.rounded_rectangle((110, 1380, L - 110, 1510), 28,
                            fill=(238, 240, 255, a))
        centrer(d, 1415, "≈ 385 000 F par an", p["sous"], INDIGO, a)


LIGNES_TABLEAU = [
    ("Construction d'un centre de santé", "Bénin · 20 jours", 0),
    ("Fourniture de matériel informatique", "Togo · 27 jours", 0),
    ("Réhabilitation de forages", "Niger · 33 jours", 0),
    ("Étude de faisabilité — barrage", "Cameroun · 12 jours", 1),
    ("Travaux d'assainissement urbain", "Bénin · 6 jours", 2),
    ("Fourniture de médicaments", "Togo · 2 jours", 3),
]


def scene_produit(d, t: float, duree: float, p: dict):
    centrer(d, MARGE_HAUT + 20, "TENDERPILOT", p["sur"], GRIS)
    if t > 0.3:
        n = min(61, int(61 * adoucir((t - 0.3) / 1.4)))
        a = int(255 * min(1.0, adoucir(t / 0.4)))
        centrer(d, 400, str(n), p["compteur"], NAVY, a)
        centrer(d, 570, "sources officielles, lues 3× par jour", p["sous"],
                GRIS, a)
    x0, x1, y0 = 70, L - 70, 700
    if t > 1.6:
        a = int(255 * adoucir((t - 1.6) / 0.4))
        d.rounded_rectangle((x0, y0, x1, y0 + 68), 16, fill=NAVY + (a,))
        d.text((x0 + 28, y0 + 20), "Opportunité", font=p["ligne"],
               fill=BLANC + (a,))
        d.text((x1 - 210, y0 + 20), "Statut", font=p["ligne"], fill=BLANC + (a,))
    for i, (titre, meta, st) in enumerate(LIGNES_TABLEAU):
        depart = 2.0 + i * 0.5
        if t < depart:
            continue
        pr = adoucir(min(1.0, (t - depart) / 0.4))
        pc = adoucir(min(1.0, (t - depart - 0.35) / 0.45))
        y = y0 + 84 + i * 110
        dy = int((1 - pr) * 50)
        a = int(255 * pr)
        nom, fond_st, encre = STATUTS[st]
        coul = tuple(round(BLANC[k] + (fond_st[k] - BLANC[k]) * pc)
                     for k in range(3))
        d.rounded_rectangle((x0, y + dy, x1, y + dy + 92), 14,
                            fill=coul + (a,), outline=FILET + (a,))
        libelle = titre
        while libelle and d.textlength(libelle, font=p["ligne"]) > x1 - x0 - 250:
            libelle = libelle[:-1]
        if libelle != titre:
            libelle = libelle.rstrip(" ,—-") + "…"
        d.text((x0 + 28, y + dy + 18), libelle, font=p["ligne"], fill=NAVY + (a,))
        d.text((x0 + 28, y + dy + 56), meta, font=p["note"], fill=GRIS + (a,))
        if pc > 0.15:
            ap = int(255 * pc)
            bb = d.textbbox((0, 0), nom, font=p["note"])
            larg = bb[2] - bb[0] + 30
            d.rounded_rectangle((x1 - larg - 22, y + dy + 28, x1 - 22,
                                 y + dy + 68), 20, fill=encre + (ap,))
            d.text((x1 - larg - 6, y + dy + 36), nom, font=p["note"],
                   fill=BLANC + (ap,))


def scene_alertes(im: Image.Image, d, t: float, duree: float, p: dict,
                  telephones: list):
    centrer(d, MARGE_HAUT + 10, "VOS ALERTES", p["sur"], INDIGO_PALE)
    centrer(d, MARGE_HAUT + 90, "Vous êtes prévenu", p["titre"], BLANC)
    centrer(d, MARGE_HAUT + 210, "avant la date limite", p["titre"], INDIGO_PALE)
    noms = ["Email", "Telegram", "Google Agenda"]
    for i, tel in enumerate(telephones):
        depart = 0.8 + i * 1.5
        if t < depart:
            continue
        pr = rebond(min(1.0, (t - depart) / 0.7))
        x = 39 + i * 334
        y = int(700 + (1 - pr) * 240)
        a = int(255 * adoucir(min(1.0, (t - depart) / 0.5)))
        vignette = tel.copy()
        vignette.putalpha(vignette.getchannel("A").point(lambda v: v * a // 255))
        im.alpha_composite(vignette, (x, y))
        bb = d.textbbox((0, 0), noms[i], font=p["note"])
        d.text((x + (tel.width - (bb[2] - bb[0])) // 2, y - 52), noms[i],
               font=p["note"], fill=INDIGO_PALE + (a,))
    if t > 6.0:
        a = int(255 * adoucir((t - 6.0) / 0.6))
        d.rounded_rectangle((150, H - MARGE_BAS - 230, L - 150,
                             H - MARGE_BAS - 100), 30, fill=(255, 255, 255, 26))
        centrer(d, H - MARGE_BAS - 197, "J-7   ·   J-3   ·   J-1", p["sous"],
                BLANC, a)


def scene_couverture(d, t: float, duree: float, p: dict):
    centrer(d, MARGE_HAUT + 20, "COUVERTURE", p["sur"], GRIS)
    centrer(d, MARGE_HAUT + 90, "National", p["titre"], NAVY)
    centrer(d, MARGE_HAUT + 210, "et international", p["titre"], INDIGO)
    pays = ["Bénin", "Togo", "Niger", "Cameroun", "Burkina Faso",
            "Côte d'Ivoire", "Sénégal", "Mali"]
    for i, nom in enumerate(pays):
        depart = 0.5 + i * 0.18
        if t < depart:
            continue
        a = int(255 * adoucir(min(1.0, (t - depart) / 0.4)))
        x = 90 + (i % 2) * 460
        y = 760 + (i // 2) * 110
        d.rounded_rectangle((x, y, x + 400, y + 84), 20,
                            fill=(255, 255, 255, a), outline=FILET + (a,))
        d.ellipse((x + 26, y + 34, x + 42, y + 50), fill=INDIGO + (a,))
        d.text((x + 60, y + 26), nom, font=p["ligne"], fill=NAVY + (a,))
    bailleurs = ["Banque mondiale", "PNUD", "Union européenne", "AFD", "GIZ"]
    for i, nom in enumerate(bailleurs):
        depart = 2.6 + i * 0.22
        if t < depart:
            continue
        a = int(255 * adoucir(min(1.0, (t - depart) / 0.4)))
        y = 1300 + i * 74
        bb = d.textbbox((0, 0), nom, font=p["note"])
        larg = bb[2] - bb[0] + 56
        d.rounded_rectangle(((L - larg) // 2, y, (L + larg) // 2, y + 58), 29,
                            fill=(238, 240, 255, a))
        centrer(d, y + 17, nom, p["note"], INDIGO, a)


def scene_offre(im: Image.Image, d, t: float, duree: float, p: dict,
                coffret: Image.Image):
    if t > 0.2:
        pr = rebond(min(1.0, (t - 0.2) / 0.8))
        a = int(255 * adoucir(min(1.0, (t - 0.2) / 0.5)))
        boite = coffret.copy()
        boite.putalpha(boite.getchannel("A").point(lambda v: v * a // 255))
        im.alpha_composite(boite, ((L - coffret.width) // 2,
                                   int(360 + (1 - pr) * 120)))
    if t > 1.4:
        a = int(255 * adoucir((t - 1.4) / 0.5))
        centrer(d, 920, "20 000 F", p["montant"], BLANC, a)
        centrer(d, 1100, "une seule fois", p["sous"], INDIGO_PALE, a)
    if t > 2.6:
        a = int(255 * adoucir((t - 2.6) / 0.5))
        centrer(d, 1190, "50 premières places · puis 20 000 F", p["note"],
                (255, 255, 255), a)
    if t > 3.6:
        a = int(255 * adoucir((t - 3.6) / 0.5))
        centrer(d, 1260, "Satisfait ou remboursé 30 jours", p["note"],
                INDIGO_PALE, a)
    if t > 4.6:
        a = int(255 * adoucir((t - 4.6) / 0.5))
        d.rounded_rectangle((130, 1330, L - 130, 1460), 32, fill=INDIGO + (a,))
        centrer(d, 1372, "tenderpilot.store", p["sous"], BLANC, a)


# --------------------------------------------------------------------- SON

def pad(duree: float, notes, volume=0.16) -> np.ndarray:
    """Un accord tenu, avec un souffle d'attaque et une extinction douce."""
    n = int(duree * ECH)
    t = np.arange(n) / ECH
    sortie = np.zeros(n)
    for i, f in enumerate(notes):
        for h, amp in ((1, 1.0), (2, 0.28), (3, 0.12)):
            sortie += amp * np.sin(2 * np.pi * f * h * t
                                   + 0.4 * math.sin(0.7 * i)) / (i + 1.6)
    env = np.clip(t / 1.2, 0, 1) * np.clip((duree - t) / 1.6, 0, 1)
    # Un leger vibrato d'ensemble : sans lui, la nappe sonne synthetique.
    env *= 1 + 0.05 * np.sin(2 * np.pi * 0.3 * t)
    return sortie * env * volume / max(1, len(notes) * 0.7)


def souffle(duree=0.5, volume=0.22) -> np.ndarray:
    n = int(duree * ECH)
    t = np.arange(n) / ECH
    bruit = np.random.default_rng(7).normal(0, 1, n)
    # Passe-bas glissant, imite un "whoosh" de transition.
    sortie = np.cumsum(bruit) / 90
    env = np.sin(np.pi * t / duree) ** 2
    return sortie * env * volume


def clic(volume=0.3) -> np.ndarray:
    n = int(0.09 * ECH)
    t = np.arange(n) / ECH
    son = np.sin(2 * np.pi * 1500 * t) * np.exp(-42 * t)
    son += np.sin(2 * np.pi * 900 * t) * np.exp(-30 * t) * 0.5
    return son * volume


def carillon(volume=0.25) -> np.ndarray:
    n = int(1.6 * ECH)
    t = np.arange(n) / ECH
    son = sum(np.sin(2 * np.pi * f * t) * np.exp(-2.2 * t) / (i + 1)
              for i, f in enumerate((880, 1320, 1760)))
    return son * volume


def poser(piste: np.ndarray, son: np.ndarray, seconde: float):
    debut = int(seconde * ECH)
    fin = min(len(piste), debut + len(son))
    if debut >= len(piste):
        return
    piste[debut:fin] += son[:fin - debut]


def musique(duree: float, reperes: list[float]) -> np.ndarray:
    """Nappe qui change d'accord a chaque scene, plus les transitions."""
    piste = np.zeros(int(duree * ECH))
    accords = [(110, 164.81, 220), (98, 146.83, 196), (130.81, 196, 261.63),
               (110, 164.81, 246.94), (123.47, 185, 246.94), (130.81, 196, 329.63)]
    for i, debut in enumerate(reperes[:-1]):
        longueur = reperes[i + 1] - debut
        poser(piste, pad(longueur + 1.2, accords[i % len(accords)]), debut)
        poser(piste, souffle(0.6), max(0.0, debut - 0.25))
    return piste


def voix(textes: list[tuple[float, str]], duree: float, dossier: Path) -> np.ndarray:
    """Voix de synthese du systeme, une piste par scene, posee a l'heure."""
    piste = np.zeros(int(duree * ECH))
    for i, (debut, texte) in enumerate(textes):
        aiff = dossier / f"voix{i}.aiff"
        wav = dossier / f"voix{i}.wav"
        subprocess.run(["say", "-v", "Thomas", "-r", "168", "-o", str(aiff),
                        texte], check=True)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(aiff),
                        "-ar", str(ECH), "-ac", "1", str(wav)], check=True)
        with wave.open(str(wav), "rb") as w:
            brut = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16)
        poser(piste, brut.astype(np.float32) / 32768.0 * 0.92, debut)
    return piste


def ecrire_wav(chemin: Path, piste: np.ndarray):
    crete = np.max(np.abs(piste)) or 1.0
    if crete > 0.98:
        piste = piste / crete * 0.98
    with wave.open(str(chemin), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(ECH)
        w.writeframes((piste * 32767).astype(np.int16).tobytes())


# ------------------------------------------------------------------ RENDU

def rendre(muet: bool = False) -> Path:
    SORTIE.mkdir(parents=True, exist_ok=True)
    p = dict(
        titre=police("Inter-ExtraBold.ttf", 86),
        montant=police("Inter-Black.ttf", 150),
        compteur=police("Inter-Black.ttf", 130),
        sous=police("Inter-SemiBold.ttf", 46),
        ligne=police("Inter-SemiBold.ttf", 30),
        note=police("Inter-Medium.ttf", 30),
        sur=police("Inter-Bold.ttf", 32),
        st=police("Inter-SemiBold.ttf", 34),
    )
    telephones = [telephone(capture(n, 620), 322) for n in
                  ("email-rappel.webp", "telegram-alertes.webp",
                   "agenda-echeance.webp")]
    coffret = capture("boite-tenderpilot.webp", 420)
    marque_claire, marque_sombre = logo_clair(64), logo(64)

    for s in SCENES:
        s["_phrases"] = [x.strip() for x in
                         __import__("re").split(r"(?<=[.!?:])\s+", s["voix"])
                         if x.strip()]
    reperes, h = [], 0.0
    for s in SCENES:
        reperes.append(h)
        h += s["duree"]
    reperes.append(h)
    duree = h

    dossier = Path(tempfile.mkdtemp(prefix="tp-film-"))
    try:
        image_n = 0
        for idx, scene in enumerate(SCENES):
            sombre = scene["sombre"]
            for f in range(int(scene["duree"] * FPS)):
                t = f / FPS
                absolu = reperes[idx] + t
                im = fond_anime(absolu, sombre)
                c, d = calque()
                poussiere(d, absolu, sombre)

                if scene["nom"] == "probleme":
                    scene_probleme(d, t, scene["duree"], p)
                elif scene["nom"] == "cout":
                    scene_cout(d, t, scene["duree"], p)
                elif scene["nom"] == "produit":
                    scene_produit(d, t, scene["duree"], p)
                elif scene["nom"] == "alertes":
                    scene_alertes(c, d, t, scene["duree"], p, telephones)
                elif scene["nom"] == "couverture":
                    scene_couverture(d, t, scene["duree"], p)
                else:
                    scene_offre(c, d, t, scene["duree"], p, coffret)

                # Sous-titre : UNE PHRASE ENTIERE a la fois, le temps qu'il
                # faut pour la dire. Un decoupage par paquets de mots coupait
                # au milieu des phrases - illisible, et ca fait amateur.
                phrases = scene.get("_phrases")
                dits = None
                if phrases:
                    total = sum(len(x) for x in phrases)
                    ecoule = 0.0
                    for phrase in phrases:
                        part = scene["duree"] * len(phrase) / total
                        if t < ecoule + part:
                            dits = phrase.split()
                            break
                        ecoule += part
                    if dits is None:
                        dits = phrases[-1].split()
                if dits:
                    lignes, courant = [], ""
                    for mot in dits:
                        essai = (courant + " " + mot).strip()
                        if d.textlength(essai, font=p["st"]) > L - 200:
                            lignes.append(courant)
                            courant = mot
                        else:
                            courant = essai
                    lignes.append(courant)
                    y = H - MARGE_BAS + 40
                    for ligne in lignes[:2]:
                        bb = d.textbbox((0, 0), ligne, font=p["st"])
                        larg = bb[2] - bb[0]
                        d.rounded_rectangle(((L - larg) // 2 - 22, y - 10,
                                             (L + larg) // 2 + 22, y + 52), 16,
                                            fill=(11, 18, 37, 150) if sombre
                                            else (255, 255, 255, 200))
                        centrer(d, y, ligne, p["st"],
                                BLANC if sombre else NAVY)
                        y += 76

                im = Image.alpha_composite(im, c)
                marque = marque_claire if sombre else marque_sombre
                im.alpha_composite(marque, ((L - marque.width) // 2, 120))
                im.convert("RGB").save(dossier / f"{image_n:05d}.png")
                image_n += 1

        muet_mp4 = dossier / "muet.mp4"
        subprocess.run([
            "ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS),
            "-i", str(dossier / "%05d.png"), "-c:v", "libx264", "-preset",
            "slow", "-crf", "18", "-pix_fmt", "yuv420p", str(muet_mp4),
        ], check=True)

        chemin = SORTIE / ("tenderpilot-film-muet.mp4" if muet
                           else "tenderpilot-film.mp4")
        if muet:
            shutil.copy(muet_mp4, chemin)
            return chemin

        piste = musique(duree, reperes)
        for i, debut in enumerate(reperes[:-1]):
            poser(piste, clic(0.22), debut + 0.05)
        poser(piste, carillon(), reperes[-2] + 4.4)
        piste += voix([(reperes[i] + 0.35, s["voix"])
                       for i, s in enumerate(SCENES)], duree, dossier)
        son = dossier / "son.wav"
        ecrire_wav(son, piste)
        subprocess.run([
            "ffmpeg", "-y", "-loglevel", "error", "-i", str(muet_mp4),
            "-i", str(son), "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
            "-shortest", "-movflags", "+faststart", str(chemin),
        ], check=True)
        return chemin
    finally:
        shutil.rmtree(dossier, ignore_errors=True)


if __name__ == "__main__":
    chemin = rendre(muet="--muet" in sys.argv)
    print(f"{chemin.relative_to(RACINE)}  "
          f"({chemin.stat().st_size / 1024 / 1024:.1f} Mo)")
