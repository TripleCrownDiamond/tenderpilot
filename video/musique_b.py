"""La musique du film B, synthetisee comme celle du film A : aucun echantillon,
aucun droit a verifier.

    .venv/bin/python musique_b.py        # ecrit public/musique-b.wav

Afro-house, 112,5 BPM : un temps = 16 images, une mesure = 64 - la grille de
src/b/tempoB.ts. Fa majeur / re mineur. La musique RACONTE L'HISTOIRE, mesure
par mesure (une mesure = 2,13 s) :

    mesures  1-2   le matin     horloge, nappe fermee, balafon discret
    mesures  3-4   la course    le kick entre, l'horloge double, ca presse
    mesure   5     LE STOP      tout s'arrete : coup sourd, glissando qui tombe
    mesures  5-6   la deception nappe mineure seule, trois notes tristes
    mesure   7     L'AVION      souffle, impact, le groove complet entre
    mesures  7-12  le groove    log drum, balafon, congas, shaker, clave
    mesure  12     un temps de silence avant la fin
    mesures 13-15  la fin       impact, groove, accord tenu, fondu
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from scipy import signal

from musique import (N, SR, Piste, cymbale_inverse, dent, ecrire, f, impact, kick,
                     clap, montee, passe_bande, passe_bas, passe_haut, t_)

BPM = 112.5
TEMPS = 60 / BPM            # 0,533 s
MESURE = 4 * TEMPS
DOUBLE = TEMPS / 4          # une double-croche
DUREE = 32.0
rng = np.random.default_rng(1125)

# vi - IV - I - V en fa : re mineur, si bemol, fa, do. Lumineux, pas naif.
ACCORDS = [
    (38, [62, 65, 69, 72]),   # re mineur 7
    (34, [58, 62, 65, 69]),   # si bemol maj7
    (41, [60, 65, 69, 72]),   # fa
    (36, [60, 64, 67, 70]),   # do 7
]


def m_(m: int) -> float:
    return (m - 1) * MESURE


# ------------------------------------------------------------ INSTRUMENTS

def shaker(accent=False):
    t = t_(0.07)
    x = passe_bande(rng.normal(0, 1, len(t)), 5200, 11000, 3)
    env = np.minimum(1, t / 0.006) * np.exp(-t * (38 if accent else 60))
    return x * env * (0.5 if accent else 0.3)


def rim():
    t = t_(0.09)
    ton = np.sin(2 * np.pi * 1750 * t) * np.exp(-t * 80)
    clic = passe_bande(rng.normal(0, 1, len(t)), 1500, 5000) * np.exp(-t * 160)
    return (ton * 0.6 + clic * 0.5) * 0.7


def tic():
    """L'horloge : un bloc de bois aigu."""
    t = t_(0.06)
    return (np.sin(2 * np.pi * 2400 * t) + 0.5 * np.sin(2 * np.pi * 3700 * t)) * np.exp(-t * 110) * 0.35


def conga(haute=False):
    t = t_(0.3)
    fr = (330 if haute else 220) * (1 + 0.25 * np.exp(-t * 40))
    corps = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * (16 if haute else 11))
    peau = passe_bande(rng.normal(0, 1, len(t)), 800, 3000) * np.exp(-t * 90) * 0.25
    return (corps + peau) * 0.55


def log_drum(midi, duree=0.32):
    """La basse de l'amapiano : un sinus qui plonge d'un demi-ton, sature."""
    t = t_(duree)
    fr = f(midi) * (1 + 0.06 * np.exp(-t * 18)) * (1 - 0.03 * t / duree)
    x = np.sin(2 * np.pi * np.cumsum(fr) / SR)
    x += 0.35 * np.sin(2 * np.pi * np.cumsum(fr * 2) / SR) * np.exp(-t * 9)
    env = np.minimum(1, t / 0.004) * np.exp(-t * 6.5) * np.clip((duree - t) / 0.02, 0, 1)
    return np.tanh(x * env * 2.2) * 0.62


def balafon(midi, duree=0.4, doux=False):
    """Lame de bois : fondamentale, partiel a 3,9x, un souffle de maillet."""
    t = t_(duree)
    fr = f(midi)
    x = np.sin(2 * np.pi * fr * t) * np.exp(-t * 9)
    x += 0.35 * np.sin(2 * np.pi * fr * 3.93 * t) * np.exp(-t * 30)
    x += 0.12 * np.sin(2 * np.pi * fr * 9.2 * t) * np.exp(-t * 60)
    maillet = passe_bande(rng.normal(0, 1, len(t)), 1500, 6000) * np.exp(-t * 300) * 0.2
    # Le bourdonnement des calebasses : une legere modulation.
    x *= 1 + 0.12 * np.sin(2 * np.pi * 28 * t)
    x = x + maillet
    if doux:
        x = passe_bas(x, 1800)
    return x * np.minimum(1, t / 0.002) * 0.3


def nappe_chaude(notes, duree, ouverture=1600):
    t = t_(duree)
    g = np.zeros_like(t)
    d = np.zeros_like(t)
    for n in notes:
        g += dent(f(n), duree, -7)
        d += dent(f(n), duree, 7)
        g += 0.5 * np.sin(2 * np.pi * f(n) * t)
        d += 0.5 * np.sin(2 * np.pi * f(n) * t)
    env = np.minimum(1, t / 0.35) * np.clip((duree - t) / 0.4, 0, 1)
    return np.vstack([passe_bas(g, ouverture), passe_bas(d, ouverture)]) * env * 0.09


def chute():
    """Le stop : un glissando qui tombe, comme un disque qu'on arrete."""
    t = t_(0.9)
    fr = 420 * np.exp(-t * 3.2) + 40
    x = np.sin(2 * np.pi * np.cumsum(fr) / SR) + 0.4 * np.sin(2 * np.pi * np.cumsum(fr * 1.5) / SR)
    return np.tanh(x * 1.5) * np.exp(-t * 2.2) * 0.5


def souffle(duree=0.9):
    """L'avion qui passe : un bruit filtre qui monte puis redescend."""
    t = t_(duree)
    x = rng.normal(0, 1, len(t))
    out = np.zeros_like(t)
    tranches = 14
    for i in range(tranches):
        a, b = i * len(t) // tranches, (i + 1) * len(t) // tranches
        centre = 600 + 5200 * np.sin(np.pi * (i + 0.5) / tranches)
        out[a:b] = passe_bande(x, centre * 0.7, centre * 1.3)[a:b]
    env = np.sin(np.pi * t / duree) ** 2
    return out * env * 0.45


# -------------------------------------------------------------- ARRANGEMENT

RIFF = [72, None, 69, 72, None, 74, 72, None, 69, None, 67, 69, None, 65, None, 67]
REPONSE = [None, None, 77, None, 76, None, 74, None, None, None, 72, None, 74, None, 69, None]
LOG = [(0, 0), (3, 0), (6, 12), (10, 7), (12, 0), (14, 12)]
CLAVE = [0, 3, 6, 10, 12]
CONGAS = [(2, False), (7, True), (11, False), (14, True), (15, True)]


def composer():
    bat, bas, harm, eff = Piste(), Piste(), Piste(), Piste()
    kicks: list[float] = []
    groove = list(range(7, 13)) + [13, 14]

    for m in range(1, 16):
        racine, notes = ACCORDS[(m - 1) % 4]
        debut = m_(m)

        # --- LA NAPPE
        if m <= 4:
            harm.poser(nappe_chaude(notes, MESURE + 0.3, 700 + 250 * m), debut, 0.9)
        elif m in (5, 6):
            triste = [62, 65, 69] if m == 5 else [61, 64, 69]   # re mineur, puis la
            harm.poser(nappe_chaude(triste, MESURE + 0.4, 650), debut, 1.0)
        elif m <= 14:
            harm.poser(nappe_chaude(notes, MESURE + 0.3, 2100), debut, 0.8)

        # --- LE BALAFON
        if m <= 4:
            for k, n in enumerate(RIFF):
                if n is not None and k % 2 == 0:
                    harm.poser(balafon(n, doux=True), debut + k * DOUBLE, 0.7, pan=-0.3)
        elif m in (5, 6):
            for k, n in ((0, 69), (6, 65), (12, 62)) if m == 5 else ((0, 64), (8, 61)):
                harm.poser(balafon(n, 0.9, doux=True), debut + k * DOUBLE, 0.6, pan=0.2)
        elif m <= 14:
            for k, n in enumerate(RIFF):
                if n is not None:
                    harm.poser(balafon(n), debut + k * DOUBLE, 0.8, pan=-0.35)
            if m >= 11:
                for k, n in enumerate(REPONSE):
                    if n is not None:
                        harm.poser(balafon(n + 12, 0.3), debut + k * DOUBLE, 0.4, pan=0.45)

        # --- L'HORLOGE : a la noire le matin, a la croche quand ca presse.
        if m <= 4:
            pas = 1 if m <= 2 else 0.5
            for b in np.arange(0, 4, pas):
                bat.poser(tic(), debut + b * TEMPS, 0.7 if b % 1 == 0 else 0.45, pan=0.5)

        # --- LA MONTEE DU MATIN (mesures 3-4) : kick et shaker, sans basse.
        if m in (3, 4):
            for b in range(4):
                s = debut + b * TEMPS
                bat.poser(kick(), s, 0.75)
                kicks.append(s)
            for k in range(16):
                bat.poser(shaker(accent=k % 4 == 2), debut + k * DOUBLE, 0.6, pan=0.25)
            if m == 4:
                for k, d in LOG[:3]:
                    bas.poser(log_drum(racine + d), debut + k * DOUBLE, 0.7)

        # --- LE GROOVE
        if m in groove:
            silence_fin = m == 12   # un temps de silence avant la fin
            for b in range(4):
                if silence_fin and b == 3:
                    continue
                s = debut + b * TEMPS
                bat.poser(kick(), s, 1.0)
                kicks.append(s)
                if b in (1, 3):
                    bat.poser(clap(), s, 0.45, pan=0.05)
            for k in range(16):
                if silence_fin and k >= 12:
                    continue
                bat.poser(shaker(accent=k % 4 == 2), debut + k * DOUBLE, 0.8, pan=0.25)
            for k in CLAVE:
                if not (silence_fin and k >= 12):
                    bat.poser(rim(), debut + k * DOUBLE, 0.5, pan=-0.2)
            if m >= 9:
                for k, haute in CONGAS:
                    if not (silence_fin and k >= 12):
                        bat.poser(conga(haute), debut + k * DOUBLE, 0.65, pan=0.4 if haute else -0.4)
            for k, d in LOG:
                if not (silence_fin and k >= 12):
                    bas.poser(log_drum(racine + d), debut + k * DOUBLE, 0.95)

    # --- LES EVENEMENTS DE L'HISTOIRE
    eff.poser(montee(1.9), m_(5) - 1.9, 0.5)                   # ca presse...
    eff.poser(impact(), m_(5), 0.55)                           # ...et tout s'arrete
    eff.poser(chute(), m_(5) + 0.02, 0.9)
    eff.poser(cymbale_inverse(1.8), m_(7) - 1.8, 1.0)
    eff.poser(montee(2.6), m_(7) - 2.6, 0.7)
    eff.poser(souffle(1.1), m_(7) - 0.15, 0.9, pan=0.4)        # l'avion
    eff.poser(impact(), m_(7), 1.0)
    eff.poser(souffle(0.7), m_(8) + 0.4, 0.5, pan=-0.4)        # il fait le tour
    eff.poser(cymbale_inverse(1.2), m_(13) - 1.2, 0.9)
    eff.poser(impact(), m_(13), 0.9)
    # Le final : l'accord de fa, tenu, et le riff une derniere fois, lent.
    harm.poser(nappe_chaude([53, 60, 65, 69, 72], 5.2, 2400), m_(15), 1.1)
    for k, n in enumerate([72, 74, 77, 81]):
        harm.poser(balafon(n, 1.2), m_(15) + k * TEMPS / 2, 0.8, pan=(k - 1.5) * 0.3)
    for b in range(2):
        s = m_(15) + b * TEMPS
        bat.poser(kick(), s, 0.9)
        kicks.append(s)

    # Pompe sous chaque kick, comme dans le film A.
    pompe = np.ones(N)
    rel = t_(0.3)
    creux = 1 - 0.55 * np.exp(-rel * 12)
    for s in kicks:
        a = int(s * SR)
        b = min(N, a + len(creux))
        pompe[a:b] = np.minimum(pompe[a:b], creux[:b - a])
    h, b_ = harm.stereo() * pompe, bas.stereo() * pompe

    ir_t = t_(1.8)
    ir = np.vstack([rng.normal(0, 1, len(ir_t)), rng.normal(0, 1, len(ir_t))]) * np.exp(-ir_t * 3.6)
    ir = np.vstack([passe_bas(ir[0], 6000), passe_bas(ir[1], 6000)]) * 0.012
    envoi = h * 0.5 + eff.stereo() * 0.3 + bat.stereo() * 0.06
    rev = np.vstack([signal.fftconvolve(envoi[0], ir[0])[:N], signal.fftconvolve(envoi[1], ir[1])[:N]])

    mix = bat.stereo() * 0.85 + b_ * 0.9 + h + eff.stereo() * 0.75 + rev
    mix = np.vstack([passe_haut(mix[0], 30), passe_haut(mix[1], 30)])
    mix = np.tanh(mix * 1.2) / np.tanh(1.2)
    mix = mix / np.max(np.abs(mix)) * 10 ** (-1 / 20)
    mix *= np.clip((DUREE - t_(DUREE)) / 1.6, 0, 1)
    return mix


if __name__ == "__main__":
    sortie = Path(__file__).parent / "public" / "musique-b.wav"
    ecrire(sortie, composer())
    print(f"{sortie.name} : {DUREE:.0f} s, {BPM} BPM")
