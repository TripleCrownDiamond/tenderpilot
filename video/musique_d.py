"""La musique du film D : du swing. Synthetisee comme les autres.

    .venv/bin/python musique_d.py        # ecrit public/musique-d.wav

120 BPM, croches swinguees. LA CONTREBASSE MARCHE AVEC KOFFI : une note par
temps, et Koffi fait un pas par temps (src/d/tempoD.ts). Si bemol majeur.

    mesures  1-2   la une       claquements de doigts, contrebasse seule
    mesures  3-5   la tournee   walking bass, ride, balais, piano
    mesure   6     la course    tout double, les cuivres poussent
    mesure   7     TROP TARD    arret net, trombone qui degringole
    mesures  8-9   rembobinons  la bande a l'envers, puis un celesta (l'avion)
    mesures 10-12  la veille    le swing revient, la trompette chante
    mesures 13-14  le depot     les cuivres claquent, coup sur « DEPOSE »
    mesures 15-16  la fin       final de big band, accord tenu
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from scipy import signal

from musique import N, SR, Piste, dent, ecrire, f, passe_bande, passe_bas, passe_haut, t_
from musique_c import piano

BPM = 120
TEMPS = 60 / BPM
MESURE = 4 * TEMPS
SWING = TEMPS * 2 / 3      # la croche « en l'air » tombe aux deux tiers du temps
DUREE = 32.0
rng = np.random.default_rng(120)

# Un accord par mesure : une grille de standard en si bemol.
GRILLE = {
    1: (46, "6"), 2: (43, "7"), 3: (48, "m7"), 4: (41, "7"), 5: (46, "6"), 6: (43, "7"),
    7: (48, "m7"), 8: (41, "7"), 9: (41, "7"), 10: (46, "6"), 11: (43, "7"), 12: (48, "m7"),
    13: (41, "7"), 14: (46, "6"), 15: (39, "maj7"), 16: (46, "6"),
}
INTERVALLES = {"6": [0, 4, 7, 9], "7": [0, 4, 7, 10], "m7": [0, 3, 7, 10], "maj7": [0, 4, 7, 11]}


def m_(m: int) -> float:
    return (m - 1) * MESURE


# ------------------------------------------------------------ INSTRUMENTS

def contrebasse(midi, duree=0.48):
    t = t_(duree)
    fr = f(midi) * (1 + 0.012 * np.exp(-t * 30))
    x = np.sin(2 * np.pi * fr * t) + 0.45 * np.sin(4 * np.pi * fr * t) * np.exp(-t * 8) + 0.2 * np.sin(6 * np.pi * fr * t) * np.exp(-t * 14)
    doigt = passe_bande(rng.normal(0, 1, len(t)), 200, 900) * np.exp(-t * 90) * 0.4
    env = np.minimum(1, t / 0.004) * np.exp(-t * 3.2) * np.clip((duree - t) / 0.03, 0, 1)
    return np.tanh((x + doigt) * env * 1.3) * 0.7


def ride(fort=1.0):
    t = t_(0.9)
    metal = sum(np.sin(2 * np.pi * fr * t) for fr in (3160, 4270, 5340, 6810, 8170)) / 5
    bruit = passe_bande(rng.normal(0, 1, len(t)), 5000, 13000)
    return (metal * 0.6 + bruit * 0.5) * np.exp(-t * 4.5) * np.minimum(1, t / 0.002) * 0.22 * fort


def charley_pied():
    t = t_(0.06)
    return passe_bande(rng.normal(0, 1, len(t)), 6000, 12000) * np.exp(-t * 80) * 0.25


def balai():
    """Le balai frotte la peau : un souffle, pas un coup."""
    t = t_(0.22)
    x = passe_bande(rng.normal(0, 1, len(t)), 2000, 7000)
    return x * np.sin(np.pi * np.minimum(1, t / 0.22)) ** 2 * 0.3


def caisse(fort=1.0):
    t = t_(0.25)
    return (passe_bande(rng.normal(0, 1, len(t)), 1500, 7000) * np.exp(-t * 22) + np.sin(2 * np.pi * 200 * t) * np.exp(-t * 30) * 0.4) * 0.45 * fort


def grosse():
    t = t_(0.4)
    return np.sin(2 * np.pi * np.cumsum(55 + 50 * np.exp(-t * 30)) / SR) * np.exp(-t * 9) * 0.5


def claquement():
    t = t_(0.08)
    return passe_bande(rng.normal(0, 1, len(t)), 1800, 5000) * np.exp(-t * 120) * 0.7


def cuivres(notes, duree=0.3, ouverture=2600, souffle=1.0):
    """Une section : dents de scie desaccordees, un « bwah » de filtre a l'attaque."""
    t = t_(duree)
    x = np.zeros_like(t)
    for n in notes:
        for dec in (-8, 0, 8):
            x += dent(f(n), duree, dec)
    y = np.zeros_like(x)
    tr = 10
    for i in range(tr):
        a, b = i * len(t) // tr, (i + 1) * len(t) // tr
        y[a:b] = passe_bas(x, ouverture * (0.5 + 0.5 * np.exp(-i / 3)) + 400)[a:b]
    env = np.minimum(1, t / 0.015) * np.clip((duree - t) / 0.05, 0, 1) * (0.7 + 0.3 * np.exp(-t * 6))
    return np.tanh(y * env * 0.5 * souffle) * 0.5


def trompette(midi, duree):
    t = t_(duree)
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5.5 * t) * np.minimum(1, t / 0.25)
    x = dent(f(midi), duree) * 0.8
    x = np.sin(2 * np.pi * np.cumsum(f(midi) * vib) / SR) * 0.5 + passe_bas(x, 3200)
    env = np.minimum(1, t / 0.03) * np.clip((duree - t) / 0.06, 0, 1)
    return np.tanh(x * env * 1.2) * 0.3


def trombone_triste():
    """Le « wah wah wah waaah » du rate."""
    sortie = np.zeros(int(2.2 * SR))
    for k, (n, d) in enumerate([(58, 0.32), (57, 0.32), (56, 0.32), (55, 1.1)]):
        t = t_(d)
        fr = f(n - 12) * (1 - 0.03 * (t / d) * (k == 3))
        wah = 0.5 + 0.5 * np.sin(np.pi * np.minimum(1, t / (d * 0.6)))
        x = passe_bas(dent(f(n - 12), d), 600 + 1400 * wah.mean()) * wah
        x *= np.minimum(1, t / 0.02) * np.clip((d - t) / 0.05, 0, 1)
        a = int(k * 0.36 * SR)
        sortie[a:a + len(x)] += x * 0.5
    return sortie


def celesta(midi, duree=0.9):
    t = t_(duree)
    x = np.sin(2 * np.pi * f(midi) * t) + 0.3 * np.sin(2 * np.pi * f(midi) * 4 * t) * np.exp(-t * 12)
    return x * np.exp(-t * 4) * np.minimum(1, t / 0.002) * 0.22


def accord(racine, qualite, oct_=12):
    return [racine + oct_ + i for i in INTERVALLES[qualite]]


# -------------------------------------------------------------- ARRANGEMENT

MELODIE = [  # (mesure, temps, note, duree en temps) : un petit theme de trompette
    (10, 0, 70, 1), (10, 1.67, 72, 0.33), (10, 2, 74, 1.5), (10, 3.67, 72, 0.33),
    (11, 0, 71, 2), (11, 2.67, 67, 1.33),
    (12, 0, 70, 1), (12, 1, 72, 1), (12, 2, 75, 1.67),
    (13, 0, 74, 1.5), (13, 2, 72, 0.67), (13, 2.67, 69, 1.33),
    (14, 0, 70, 3),
]


def composer():
    bas, bat, pia, cuiv, eff = Piste(), Piste(), Piste(), Piste(), Piste()

    def swing(m, temps, croche=False):
        return m_(m) + temps * TEMPS + (SWING if croche else 0)

    for m in range(1, 17):
        racine, q = GRILLE[m]
        suivante = GRILLE.get(m + 1, GRILLE[16])[0]
        joue = m not in (7, 8) and not (m == 9 and False)
        if m == 7 or m == 8:
            continue
        # LA CONTREBASSE : fondamentale, tierce, quinte, approche chromatique.
        ligne = [racine, racine + INTERVALLES[q][1], racine + 7, suivante + (1 if suivante < racine + 7 else -1)]
        if m == 9:
            ligne = [None, None, racine, racine + 4]   # elle reprend doucement apres l'avion
        for b, n in enumerate(ligne):
            if n is not None and joue:
                bas.poser(contrebasse(n - 12), swing(m, b), 0.95)
                if m == 6:   # la course : des croches
                    bas.poser(contrebasse(n - 12 + 7, 0.22), swing(m, b, True), 0.6)

        if m <= 2:
            for b in (1, 3):
                bat.poser(claquement(), swing(m, b), 0.8, pan=0.3)
            continue

        if m == 9:
            for b in (2, 3):
                bat.poser(balai(), swing(m, b), 0.5)
            continue

        # LA BATTERIE : ride swing, charleston au pied sur 2 et 4, balais.
        for b in range(4):
            bat.poser(ride(1.0 if b % 2 == 0 else 0.8), swing(m, b), 0.9, pan=0.35)
            if b in (1, 3):
                bat.poser(ride(0.6), swing(m, b, True), 0.8, pan=0.35)
                bat.poser(charley_pied(), swing(m, b), 0.8, pan=-0.3)
                bat.poser(balai() if m < 10 else caisse(0.6), swing(m, b), 0.8)
            bat.poser(grosse(), swing(m, b), 0.35)
        if m == 6:
            for k in range(8):
                bat.poser(caisse(0.5 + k * 0.06), swing(m, k / 2), 0.7)

        # LE PIANO : le rythme « charleston » (le 1, et le « et » du 2).
        voix = accord(racine, q)
        for tps, cr in ((0, False), (1, True)):
            for n in voix[1:]:
                pia.poser(piano(n + 12, 0.5, 0.6), swing(m, tps, cr), 0.7)

        # LES CUIVRES : ils poussent dans la course, claquent a la fin.
        if m == 6:
            for b in range(4):
                cuiv.poser(cuivres(accord(racine, q, 12), 0.22), swing(m, b, True), 0.8)
        if m in (13, 14):
            cuiv.poser(cuivres(accord(racine, q, 12), 0.25), swing(m, 1, True), 0.9)
            cuiv.poser(cuivres(accord(racine, q, 12), 0.25), swing(m, 3, True), 0.9)

    for (m, tps, n, d) in MELODIE:
        cuiv.poser(trompette(n, d * TEMPS * 0.95), m_(m) + tps * TEMPS, 1.0, pan=-0.1)

    # LES EVENEMENTS
    eff.poser(cuivres([43, 50, 55, 58, 61], 0.5, 1800, 2.0), m_(7) - 0.04, 1.0)       # le rideau tombe
    eff.poser(trombone_triste(), m_(7) + 0.5, 1.0)
    for k, n in enumerate([84, 88, 91, 96, 91, 88]):                                   # l'avion
        eff.poser(celesta(n), m_(8) + 1.0 + k * TEMPS / 2, 0.9, pan=0.5 - k * 0.15)
    eff.poser(cuivres([58, 62, 65, 70], 0.4, 3000, 1.6), 808 / 30, 1.0)                 # DEPOSE
    # Le final : deux coups, puis l'accord tenu.
    for tps, d in ((0, 0.3), (1.67, 0.3)):
        cuiv.poser(cuivres(accord(39, "maj7", 12) + [70], d, 3000, 1.4), m_(15) + tps * TEMPS, 1.0)
    cuiv.poser(cuivres(accord(46, "6", 12) + [74, 77], 3.2, 2400, 1.2), m_(15) + 3 * TEMPS, 1.0)
    for k in range(16):
        bat.poser(caisse(0.3 + k * 0.03), m_(15) + 3 * TEMPS + k * TEMPS / 4, 0.6)
    bat.poser(ride(1.6), m_(16) + 2 * TEMPS, 1.0)

    mix = bas.stereo() * 0.9 + bat.stereo() * 0.8 + pia.stereo() * 0.75 + cuiv.stereo() * 0.85 + eff.stereo() * 0.9
    # Une petite salle : le swing ne se joue pas dans une cathedrale.
    ir_t = t_(1.1)
    ir = np.vstack([rng.normal(0, 1, len(ir_t)), rng.normal(0, 1, len(ir_t))]) * np.exp(-ir_t * 5)
    ir = np.vstack([passe_bas(ir[0], 6000), passe_bas(ir[1], 6000)]) * 0.012
    envoi = pia.stereo() * 0.5 + cuiv.stereo() * 0.5 + bat.stereo() * 0.15 + eff.stereo() * 0.4
    mix = mix + np.vstack([signal.fftconvolve(envoi[0], ir[0])[:N], signal.fftconvolve(envoi[1], ir[1])[:N]])

    # REMBOBINONS : la tournee (4 s -> 10 s), a l'envers et six fois trop vite,
    # comme une cassette - sur les 32 images du rembobinage.
    a, b = int(4.0 * SR), int(10.0 * SR)
    debut, longueur = int(14.0 * SR), int(32 / 30 * SR)
    for c in range(2):
        source = mix[c, a:b][::-1]
        x = np.interp(np.linspace(0, len(source) - 1, longueur), np.arange(len(source)), source)
        x *= np.minimum(1, np.arange(longueur) / (0.05 * SR)) * np.minimum(1, (longueur - np.arange(longueur)) / (0.08 * SR))
        mix[c, debut:debut + longueur] += passe_haut(x, 200) * 0.7

    mix = np.vstack([passe_haut(mix[0], 35), passe_haut(mix[1], 35)])
    mix = np.tanh(mix * 1.1) / np.tanh(1.1)
    mix = mix / np.max(np.abs(mix)) * 10 ** (-1 / 20)
    mix *= np.clip((DUREE - t_(DUREE)) / 1.2, 0, 1)
    return mix


if __name__ == "__main__":
    sortie = Path(__file__).parent / "public" / "musique-d.wav"
    ecrire(sortie, composer())
    print(f"{sortie.name} : {DUREE:.0f} s, {BPM} BPM swing")
