"""La musique du film G « Sans / Avec ». Synthetisee comme les autres.

    .venv/bin/python musique_g.py        # ecrit public/musique-g.wav

120 BPM (un temps = 15 images, comme le film A), 28 s. Les deux matinees
partagent la meme horloge, la musique aussi :

    0-4 s     7 h 00     nappe, arpege, tic de l'horloge
    4-14 s    la matinee le groove entre, l'horloge continue
    14,8 s    LES TAMPONS  coup sourd : « CLOTURE » en haut, « DEPOSE » en bas
    15-20 s   la montee  la batterie sort, souffle qui monte
    20 s      LA MORALE  impact, l'accord passe en majeur, groove plein
"""

from __future__ import annotations

from pathlib import Path

import numpy as np

from musique import (SR, Piste, basse, charleston, clap, cymbale_inverse, ecrire, impact, kick, montee,
                     nappe, passe_haut, pluck, stab, t_)
from musique_b import tic

DUREE = 28.0
N = int(DUREE * SR)
TEMPS = 0.5
MESURE = 2.0

# La mineur pendant les deux matinees, puis le majeur de la morale.
MATIN = [(45, [57, 60, 64]), (41, [57, 60, 65]), (48, [55, 60, 64]), (43, [55, 59, 62])]
MORALE = [(41, [57, 60, 65]), (43, [55, 59, 62]), (48, [55, 60, 64]), (48, [60, 64, 67])]


def composer() -> np.ndarray:
    import musique
    musique.N = N  # les pistes du module suivent la duree de ce film
    bat, bas, harm, eff = Piste(), Piste(), Piste(), Piste()
    kicks = []
    for m in range(14):
        debut = m * MESURE
        racine, notes = (MORALE[(m - 10) % 4] if m >= 10 else MATIN[m % 4])
        calme = m in (7, 8, 9)  # apres les tampons : on retient son souffle
        harm.poser(nappe(notes, MESURE + 0.3, 900 if m < 2 else 1500 if calme else 2300), debut, 1.0)
        for k in range(8):
            if m < 2 and k % 2:
                continue
            note = [notes[0] + 12, notes[1] + 12, notes[2] + 12, notes[1] + 24][k % 4]
            harm.poser(pluck(note, brillance=1800 if (m < 2 or calme) else 3400), debut + k * TEMPS / 2, 0.75, pan=0.4 if k % 2 else -0.4)
        # L'horloge des deux matinees, jusqu'a la date limite.
        if m < 7:
            for k in range(8):
                bat.poser(tic(), debut + k * TEMPS / 2, 0.55 if k % 2 == 0 else 0.3, pan=0.5)
        if 2 <= m < 7 or m >= 10:
            for b in range(4):
                s = debut + b * TEMPS
                bat.poser(kick(), s, 0.9)
                kicks.append(s)
                if b in (1, 3):
                    bat.poser(clap(), s, 0.5)
                bat.poser(charleston(ouvert=m >= 10 and b % 2 == 1), s + TEMPS / 2, 0.45, pan=0.3)
                for c in range(2):
                    bas.poser(basse(racine - 12 + (12 if (b == 3 and c == 1) else 0), TEMPS / 2 - 0.01), s + c * TEMPS / 2, 0.7)
                if m >= 10 and b in (1, 3):
                    harm.poser(stab(notes), s + TEMPS * 0.75, 1.0, pan=-0.2 if b == 1 else 0.2)
    eff.poser(impact(), 14.8, 0.7)                          # les deux tampons
    eff.poser(montee(4.0), 16.0, 0.7)
    eff.poser(cymbale_inverse(1.6), 20.0 - 1.6, 1.0)
    eff.poser(impact(), 20.0, 1.0)                          # la morale

    pompe = np.ones(N)
    creux = 1 - 0.55 * np.exp(-t_(0.3) * 11)
    for s in kicks:
        a = int(s * SR)
        b = min(N, a + len(creux))
        pompe[a:b] = np.minimum(pompe[a:b], creux[:b - a])
    mix = bat.stereo() * 0.85 + bas.stereo() * pompe * 0.85 + harm.stereo() * pompe + eff.stereo() * 0.8
    mix = np.vstack([passe_haut(mix[0], 30), passe_haut(mix[1], 30)])
    mix = np.tanh(mix * 1.15) / np.tanh(1.15)
    return mix / np.max(np.abs(mix)) * 10 ** (-1 / 20)


if __name__ == "__main__":
    sortie = Path(__file__).parent / "public" / "musique-g.wav"
    ecrire(sortie, composer())
    print(f"{sortie.name} : {DUREE:.0f} s, 120 BPM")
