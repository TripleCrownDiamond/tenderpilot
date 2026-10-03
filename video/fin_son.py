"""Le son de la fin commune (src/fin/Fin.tsx) : six secondes.

    .venv/bin/python fin_son.py                 # signature musicale seule
    .venv/bin/python fin_son.py public/fin-voix.mp3    # avec l'annonce du prix

Ecrit public/fin-son.wav. La fin est collee derriere quatre films aux musiques
differentes (electro, afro-house, cinematique, swing) : la signature tient
donc surtout a un impact et a un accord lumineux, sans melodie qui se battrait
avec celle qu'on vient d'entendre.
"""

from __future__ import annotations

import sys
import tempfile
from pathlib import Path

import numpy as np

from musique import SR, Piste, ecrire, impact, passe_bas, passe_haut, t_
from musique_c import cordes, piano
from mixage import decoder, serrer

DUREE = 7.5
N = int(DUREE * SR)
ICI = Path(__file__).parent


def signature() -> np.ndarray:
    p = Piste()
    p.g, p.d = np.zeros(N), np.zeros(N)
    p.poser(impact()[: N], 0.0, 0.55)
    # Si bemol majeur avec neuvieme : ouvert, rassurant, compatible avec tout.
    for k, n in enumerate([58, 62, 65, 69, 72]):
        p.poser(piano(n, 4.5, 0.8), 0.05 + k * 0.06, 0.9, pan=(k - 2) * 0.2)
    p.poser(piano(46, 5.0, 1.0), 0.0, 0.8)
    accord = cordes([58, 62, 65, 70], 5.5, 2400, 0.4)
    p.poser(accord[:, :N], 0.0, 0.9)
    # Le « clic » sur le bouton (image 138 = 4,6 s) : une petite cloche.
    for k, n in enumerate([82, 89]):
        p.poser(piano(n, 1.5, 0.5), 4.6 + k * 0.09, 0.7, pan=0.3)
    mix = p.stereo()
    mix = np.vstack([passe_haut(mix[0], 30), passe_haut(mix[1], 30)])
    mix *= np.clip((DUREE - t_(DUREE)) / 1.2, 0, 1)
    return mix / (np.max(np.abs(mix)) + 1e-9) * 10 ** (-3 / 20)


def avec_voix(mix: np.ndarray, voix_src: Path) -> np.ndarray:
    with tempfile.TemporaryDirectory() as tmp:
        voix = decoder(voix_src, Path(tmp))
    voix = passe_haut(voix, 90)
    # On retire le silence de tete, puis on resserre les pauses : l'annonce
    # doit tenir avant le fondu de fin.
    actif = np.nonzero(np.abs(voix) > 10 ** (-38 / 20))[0]
    if len(actif):
        voix = voix[max(0, actif[0] - int(0.02 * SR)):actif[-1] + int(0.1 * SR)]
    voix = serrer(voix, 0.3)
    voix[: int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))
    debut = int(0.5 * SR)
    print(f"annonce : {len(voix) / SR:.2f} s, de 0,5 s a {0.5 + len(voix) / SR:.2f} s")
    piste = np.zeros(N)
    fin = min(N, debut + len(voix))
    piste[debut:fin] = voix[: fin - debut]
    # La musique s'efface sous la voix, comme dans les films.
    niveau = np.convolve(np.abs(piste), np.ones(int(0.08 * SR)) / int(0.08 * SR), mode="same")
    lisse = np.clip(niveau / (np.max(niveau) * 0.12 + 1e-9), 0, 1)
    lisse = np.convolve(lisse, np.ones(int(0.3 * SR)) / int(0.3 * SR), mode="same")
    mix = mix * (1 - lisse * (1 - 10 ** (-14 / 20))) + np.vstack([piste, piste]) * 1.3
    return mix / np.max(np.abs(mix)) * 10 ** (-1 / 20)


if __name__ == "__main__":
    mix = signature()
    if len(sys.argv) > 1:
        mix = avec_voix(mix, Path(sys.argv[1]))
    sortie = ICI / "public" / "fin-son.wav"
    ecrire(sortie, mix)
    print(f"{sortie.relative_to(ICI)} ecrit ({'avec' if len(sys.argv) > 1 else 'sans'} voix)")
