"""La musique du film C : cinematique, retenue, « institutionnelle ».
Synthetisee comme les deux autres, sans aucun echantillon.

    .venv/bin/python musique_c.py        # ecrit public/musique-c.wav

90 BPM : un temps = 20 images, une mesure = 80 (src/c/tempoC.ts). Do mineur
qui s'ouvre sur mi bemol majeur. Deux mesures par scene :

    mesures  1-2   l'enjeu     pouls grave, tic d'horloge, piano seul
    mesures  3-4   le cout     les cordes entrent, la tension monte
    mesure   5     IMPACT      braam : TenderPilot
    mesures  5-6   la marque   piano ouvert, cordes pleines
    mesures  7-8   la methode  percussions cinematiques, croches
    mesures  9-10  les rappels meme energie, roulement de toms a la fin
    mesure  11     IMPACT      le prix
    mesures 11-12  la fin      accord de mi bemol tenu, fondu
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from scipy import signal

from musique import N, SR, Piste, cymbale_inverse, dent, ecrire, f, montee, passe_bande, passe_bas, passe_haut, t_

BPM = 90
TEMPS = 60 / BPM
MESURE = 4 * TEMPS
DUREE = 32.0
rng = np.random.default_rng(90)

# (basse, accord) par mesure. Do mineur, la bemol, mi bemol, si bemol...
# puis la fin se pose sur mi bemol majeur : la tension se resout.
GRILLE = [
    (36, [60, 63, 67]),  # 1  do m
    (32, [60, 63, 68]),  # 2  la b
    (39, [58, 63, 67]),  # 3  mi b
    (34, [58, 62, 65]),  # 4  si b
    (32, [60, 63, 67, 70]),  # 5  la b maj7 (sur l'impact)
    (34, [58, 62, 65, 70]),  # 6  si b
    (36, [60, 63, 67, 70]),  # 7  do m7
    (32, [60, 63, 68, 72]),  # 8  la b
    (39, [58, 63, 67, 70]),  # 9  mi b
    (34, [58, 62, 65, 69]),  # 10 si b
    (32, [60, 63, 67, 72]),  # 11 la b maj7
    (39, [58, 63, 67, 70, 74]),  # 12 mi b add9
]


def m_(m: int) -> float:
    return (m - 1) * MESURE


def piano(midi, duree=1.6, force=1.0):
    """Corde frappee : partiels legerement inharmoniques, les aigus meurent vite."""
    t = t_(duree)
    fr = f(midi)
    x = np.zeros_like(t)
    for n in range(1, 9):
        fn = n * fr * np.sqrt(1 + 0.00035 * n * n)
        if fn > SR / 2 - 500:
            break
        x += np.sin(2 * np.pi * fn * t + rng.uniform(0, 6.28)) * np.exp(-t * (1.6 + n * 1.1)) / n ** 1.25
    marteau = passe_bande(rng.normal(0, 1, len(t)), 1800, 7000) * np.exp(-t * 180) * 0.08
    env = np.minimum(1, t / 0.003) * np.clip((duree - t) / 0.08, 0, 1)
    return (x + marteau) * env * 0.22 * force


def cordes(notes, duree, ouverture=2200, attaque=0.9):
    t = t_(duree)
    g = np.zeros_like(t)
    d = np.zeros_like(t)
    for n in notes:
        for dec in (-11, -4, 4, 11):
            v = dent(f(n), duree, dec)
            if dec < 0:
                g += v
            else:
                d += v
    # Un leger vibrato d'ensemble, et un archet qui arrive lentement.
    trem = 1 + 0.04 * np.sin(2 * np.pi * 5.2 * t)
    env = np.minimum(1, t / attaque) ** 1.5 * np.clip((duree - t) / 0.6, 0, 1) * trem
    return np.vstack([passe_bas(g, ouverture), passe_bas(d, ouverture)]) * env * 0.045


def pouls():
    """Le battement grave des premieres mesures : un coeur, ou une horloge."""
    t = t_(0.5)
    fr = 55 + 40 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 9) * 0.9


def tic():
    t = t_(0.05)
    return passe_haut(rng.normal(0, 1, len(t)), 6000) * np.exp(-t * 140) * 0.35


def braam(racine, duree=3.4):
    """L'impact de bande-annonce : cuivres graves desaccordes, filtre qui s'ouvre puis se referme."""
    t = t_(duree)
    x = np.zeros_like(t)
    for n in (racine - 12, racine, racine + 7):
        for dec in (-14, 0, 14):
            x += dent(f(n), duree, dec)
    tranches = 24
    y = np.zeros_like(x)
    for i in range(tranches):
        a, b = i * len(t) // tranches, (i + 1) * len(t) // tranches
        u = i / tranches
        fc = 300 + 2600 * np.exp(-((u - 0.12) ** 2) / 0.02) + 300 * (1 - u)
        y[a:b] = passe_bas(x, fc)[a:b]
    sub = np.sin(2 * np.pi * np.cumsum(f(racine - 12) * (1 + 0.5 * np.exp(-t * 8))) / SR)
    env = np.minimum(1, t / 0.02) * np.exp(-t * 0.9)
    return np.tanh((y * 0.35 + sub * 0.8) * env * 1.4) * 0.7


def grosse_caisse():
    t = t_(0.8)
    fr = 42 + 90 * np.exp(-t * 25)
    corps = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 4.5)
    peau = passe_bande(rng.normal(0, 1, len(t)), 200, 1200) * np.exp(-t * 40) * 0.3
    return np.tanh((corps + peau) * 1.5) * 0.85


def caisse_claire():
    t = t_(0.5)
    ton = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 20)
    timbre = passe_bande(rng.normal(0, 1, len(t)), 1500, 8000) * np.exp(-t * 14)
    return (ton * 0.5 + timbre * 0.7) * 0.6


def tom(midi):
    t = t_(0.6)
    fr = f(midi) * (1 + 0.4 * np.exp(-t * 20))
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 7) * 0.7


def charley():
    t = t_(0.05)
    return passe_haut(rng.normal(0, 1, len(t)), 8000, 4) * np.exp(-t * 90) * 0.3


def composer():
    pi, co, bat, eff = Piste(), Piste(), Piste(), Piste()
    for m in range(1, 13):
        racine, notes = GRILLE[m - 1]
        debut = m_(m)

        # LE PIANO : l'ostinato en croches, la note grave a chaque mesure.
        motif = [notes[0], notes[1], notes[2], notes[1]] * 2
        if m <= 10:
            for k, n in enumerate(motif):
                force = 0.55 if m <= 2 else 0.8
                if m <= 2 and k % 2:
                    force = 0.35
                pi.poser(piano(n + 12, 1.4, force), debut + k * TEMPS / 2, 1.0, pan=0.25 if k % 2 else -0.25)
            pi.poser(piano(racine + 12, 2.6, 0.9), debut, 1.0)

        # LES CORDES, a partir de la mesure 3, de plus en plus ouvertes.
        if 3 <= m <= 11:
            ouv = 1200 + 300 * min(m, 8)
            co.poser(cordes(notes, MESURE + 0.8, ouv, 0.9 if m < 5 else 0.3), debut, 1.0)
            co.poser(cordes([racine + 12], MESURE + 0.8, 900, 0.5), debut, 1.2)

        # LE POULS ET L'HORLOGE du debut.
        if m <= 4:
            for b in range(4):
                eff.poser(pouls(), debut + b * TEMPS, 0.6 + 0.1 * (m - 1))
                for q in range(2):
                    bat.poser(tic(), debut + b * TEMPS + q * TEMPS / 2, 0.5 if q == 0 else 0.3, pan=0.4)

        # LES PERCUSSIONS de la methode et des rappels.
        if 5 <= m <= 10:
            if m >= 7:
                for b in (0, 2.5):
                    bat.poser(grosse_caisse(), debut + b * TEMPS, 0.9)
                bat.poser(caisse_claire(), debut + 2 * TEMPS, 0.7)
                for k in range(8):
                    bat.poser(charley(), debut + k * TEMPS / 2, 0.6 if k % 2 else 0.35, pan=-0.3)
            else:
                bat.poser(grosse_caisse(), debut, 0.7)
            if m == 10:
                for k in range(8):
                    bat.poser(tom(45 - (k // 2) * 3), debut + 2 * TEMPS + k * TEMPS / 4, 0.5 + k * 0.05, pan=(k % 2 - 0.5) * 0.6)

    # LES IMPACTS : la marque, puis le prix.
    eff.poser(montee(2.6), m_(5) - 2.6, 0.55)
    eff.poser(cymbale_inverse(1.8), m_(5) - 1.8, 0.9)
    eff.poser(braam(32), m_(5), 1.0)
    eff.poser(montee(2.2), m_(11) - 2.2, 0.5)
    eff.poser(cymbale_inverse(1.6), m_(11) - 1.6, 0.9)
    eff.poser(braam(39), m_(11), 0.9)
    # La fin : mi bemol majeur, au piano et aux cordes, et on laisse sonner.
    for k, n in enumerate([63, 67, 70, 74, 79]):
        pi.poser(piano(n + 12, 4.0, 0.8), m_(11) + 0.1 + k * TEMPS / 2, 1.0, pan=(k - 2) * 0.2)
    pi.poser(piano(51, 5.0, 1.0), m_(11), 1.0)
    co.poser(cordes([63, 67, 70, 74], 5.3, 2600, 0.6), m_(11), 1.1)

    # Une salle de concert : reverberation longue, surtout sur le piano.
    ir_t = t_(3.2)
    ir = np.vstack([rng.normal(0, 1, len(ir_t)), rng.normal(0, 1, len(ir_t))]) * np.exp(-ir_t * 2.1)
    ir = np.vstack([passe_bas(ir[0], 5000), passe_bas(ir[1], 5000)]) * 0.011
    envoi = pi.stereo() * 0.7 + co.stereo() * 0.5 + eff.stereo() * 0.3 + bat.stereo() * 0.12
    rev = np.vstack([signal.fftconvolve(envoi[0], ir[0])[:N], signal.fftconvolve(envoi[1], ir[1])[:N]])

    mix = pi.stereo() + co.stereo() * 0.9 + bat.stereo() * 0.8 + eff.stereo() * 0.85 + rev
    mix = np.vstack([passe_haut(mix[0], 28), passe_haut(mix[1], 28)])
    mix = np.tanh(mix * 1.1) / np.tanh(1.1)
    mix = mix / np.max(np.abs(mix)) * 10 ** (-1 / 20)
    mix *= np.clip((DUREE - t_(DUREE)) / 2.0, 0, 1)
    return mix


if __name__ == "__main__":
    sortie = Path(__file__).parent / "public" / "musique-c.wav"
    ecrire(sortie, composer())
    print(f"{sortie.name} : {DUREE:.0f} s, {BPM} BPM")
