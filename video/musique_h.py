"""La musique du film H « Combien coute un avis rate ? ».

    .venv/bin/python musique_h.py        # ecrit public/musique-h.wav

120 BPM (un temps = 15 images), 26 s. Le ticket s'imprime en rythme : chaque
ligne qui sort fait crepiter l'imprimante, le total sonne comme une caisse,
le marche rate tombe sur un coup sourd.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np

from musique import SR, Piste, basse, charleston, clap, ecrire, impact, kick, montee, nappe, passe_bande, passe_haut, pluck, t_
from musique_c import piano

DUREE = 26.0
N = int(DUREE * SR)
TEMPS = 0.5
MESURE = 2.0
rng = np.random.default_rng(26)
ACCORDS = [(45, [57, 60, 64]), (41, [57, 60, 65]), (48, [55, 60, 64]), (43, [55, 59, 62])]
LIGNES = [120, 180, 270, 360, 410, 460, 560, 600]  # images ou une ligne sort (FilmH.tsx)


def imprimante(duree=0.55):
    """Une imprimante thermique : des impulsions rapides, filtrees."""
    t = t_(duree)
    x = np.zeros_like(t)
    for k in range(int(duree * 60)):
        a = int(k / 60 * SR)
        n = int(0.006 * SR)
        x[a:a + n] += rng.normal(0, 1, min(n, len(x) - a)) * np.exp(-np.arange(min(n, len(x) - a)) / (0.0015 * SR))
    return passe_bande(x, 1800, 7000) * 0.35


def caisse():
    """Le « ding » de la caisse enregistreuse."""
    t = t_(1.4)
    return sum(np.sin(2 * np.pi * fr * t) * np.exp(-t * d) for fr, d in ((1568, 3.5), (2093, 4.5), (3136, 6))) * 0.18


def froisse(duree=0.8):
    t = t_(duree)
    x = passe_bande(rng.normal(0, 1, len(t)), 1200, 9000)
    craque = (rng.random(len(t)) < 0.002) * rng.normal(0, 3, len(t))
    return (x * 0.3 + craque) * np.sin(np.pi * t / duree) * 0.5


def composer() -> np.ndarray:
    import musique
    musique.N = N
    bat, bas, harm, eff = Piste(), Piste(), Piste(), Piste()
    for m in range(13):
        debut = m * MESURE
        racine, notes = ACCORDS[m % 4]
        suspens = m in (11, 12)  # la question : on retient tout
        harm.poser(nappe(notes, MESURE + 0.3, 900 if m == 0 else 1400 if suspens else 2000), debut, 1.0)
        if not suspens:
            for k in range(8):
                note = [notes[0] + 12, notes[2] + 12, notes[1] + 12, notes[2] + 24][k % 4]
                harm.poser(pluck(note, brillance=2600), debut + k * TEMPS / 2, 0.6, pan=0.35 if k % 2 else -0.35)
        if 2 <= m <= 10:
            for b in range(4):
                s = debut + b * TEMPS
                bat.poser(kick(), s, 0.8)
                if b in (1, 3):
                    bat.poser(clap(), s, 0.4)
                bat.poser(charleston(), s + TEMPS / 2, 0.4, pan=0.3)
                bas.poser(basse(racine - 12, TEMPS - 0.02), s, 0.6)
    for d in LIGNES:
        eff.poser(imprimante(), d / 30, 0.9, pan=0.15)
    eff.poser(impact(), 460 / 30 + 0.15, 0.5)                 # « un marche rate »
    eff.poser(caisse(), 600 / 30 + 0.1, 1.0)                  # le total
    eff.poser(froisse(), 640 / 30, 0.9)                       # le ticket a la corbeille
    for k, n in enumerate([60, 64, 67, 72]):                  # la question, au piano
        harm.poser(piano(n, 3.0, 0.7), 664 / 30 + k * 0.12, 0.9)
    eff.poser(montee(2.6), DUREE - 2.6, 0.5)                  # vers la fin commune
    mix = bat.stereo() * 0.8 + bas.stereo() * 0.8 + harm.stereo() + eff.stereo()
    mix = np.vstack([passe_haut(mix[0], 30), passe_haut(mix[1], 30)])
    mix = np.tanh(mix * 1.1) / np.tanh(1.1)
    return mix / np.max(np.abs(mix)) * 10 ** (-1 / 20)


if __name__ == "__main__":
    sortie = Path(__file__).parent / "public" / "musique-h.wav"
    ecrire(sortie, composer())
    print(f"{sortie.name} : {DUREE:.0f} s, 120 BPM")
