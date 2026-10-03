"""La musique du film, synthetisee de bout en bout. Aucun echantillon externe :
pas de droits a verifier, et la piste se regenere avec le film.

    .venv/bin/python musique.py        # ecrit public/musique.wav

120 BPM, la mineur, 32 secondes. La STRUCTURE EST CELLE DU FILM, mesure par
mesure (une mesure = 2 s = 60 images) :

    mesures  1-2   intro      nappe qui s'ouvre, arpege, montee
    mesure   3     IMPACT     le groove entre (4 s)
    mesures  3-10  groove     kick, clap, charlestons, basse, stabs
    mesures 11-12  respiration la batterie sort, le filtre se referme
    mesures 13-14  relance    tout revient, plus dense
    mesure  15     IMPACT     le logo se pose (28 s)
    mesures 15-16  fin        accord tenu, reverberation, fondu

Les constantes BPM et DUREE sont reprises telles quelles dans src/tempo.ts :
une animation calee sur le temps 17 tombe sur le temps 17 de la musique.
"""

from __future__ import annotations

import wave
from pathlib import Path

import numpy as np
from scipy import signal

SR = 44100
BPM = 120
TEMPS = 60 / BPM            # 0,5 s
MESURE = 4 * TEMPS          # 2 s
DUREE = 32.0
N = int(DUREE * SR)
rng = np.random.default_rng(2026)

# La mineur : i - VI - III - VII, une mesure chacun.
ACCORDS = [
    (45, [57, 60, 64]),     # la mineur
    (41, [57, 60, 65]),     # fa
    (48, [55, 60, 64]),     # do
    (43, [55, 59, 62]),     # sol
]


def f(midi: float) -> float:
    return 440.0 * 2 ** ((midi - 69) / 12)


def t_(duree: float) -> np.ndarray:
    return np.arange(int(duree * SR)) / SR


def passe_bas(x, fc, ordre=2):
    sos = signal.butter(ordre, min(fc, SR / 2 - 100), "low", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def passe_haut(x, fc, ordre=2):
    sos = signal.butter(ordre, fc, "high", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def passe_bande(x, bas, haut, ordre=2):
    sos = signal.butter(ordre, [bas, min(haut, SR / 2 - 100)], "band", fs=SR,
                        output="sos")
    return signal.sosfilt(sos, x)


def dent(freq, duree, desaccord=0.0):
    """Dent de scie a bande limitee (somme d'harmoniques) : sans repliement,
    donc sans le grain sale d'une dent de scie naive."""
    t = t_(duree)
    fr = freq * 2 ** (desaccord / 1200)
    n_harm = max(1, int((SR / 2 - 200) / fr))
    n_harm = min(n_harm, 40)
    x = np.zeros_like(t)
    phase = rng.uniform(0, 2 * np.pi)
    for k in range(1, n_harm + 1):
        x += np.sin(2 * np.pi * fr * k * t + phase * k) / k
    return x * 0.6


class Piste:
    def __init__(self):
        self.g = np.zeros(N)
        self.d = np.zeros(N)

    def poser(self, son, seconde, gain=1.0, pan=0.0):
        """pan de -1 (gauche) a 1 (droite), loi a puissance constante."""
        if son.ndim == 2:
            sg, sd = son[0], son[1]
        else:
            ang = (pan + 1) * np.pi / 4
            sg, sd = son * np.cos(ang), son * np.sin(ang)
        debut = int(seconde * SR)
        if debut >= N:
            return
        fin = min(N, debut + len(sg))
        self.g[debut:fin] += sg[:fin - debut] * gain
        self.d[debut:fin] += sd[:fin - debut] * gain

    def stereo(self):
        return np.vstack([self.g, self.d])


# ------------------------------------------------------------ INSTRUMENTS

def kick():
    t = t_(0.45)
    hauteur = 48 + 110 * np.exp(-t * 38)
    phase = 2 * np.pi * np.cumsum(hauteur) / SR
    corps = np.sin(phase) * np.exp(-t * 7.5)
    clic = passe_haut(rng.normal(0, 1, len(t)), 3000) * np.exp(-t * 400) * 0.3
    return np.tanh((corps + clic) * 1.6)


def clap():
    t = t_(0.35)
    bruit = rng.normal(0, 1, len(t))
    env = np.zeros_like(t)
    for d in (0.0, 0.011, 0.022):
        env += np.where(t >= d, np.exp(-(t - d) * 90), 0)
    env += np.exp(-t * 14) * 0.5
    return passe_bande(bruit, 900, 3800) * env * 0.9


def charleston(ouvert=False):
    t = t_(0.28 if ouvert else 0.06)
    x = passe_haut(rng.normal(0, 1, len(t)), 7500, 4)
    return x * np.exp(-t * (11 if ouvert else 75)) * 0.55


def basse(midi, duree):
    t = t_(duree)
    fr = f(midi)
    x = np.sin(2 * np.pi * fr * t) + 0.35 * passe_bas(dent(fr, duree), 420)
    env = np.minimum(1, t / 0.008) * np.exp(-t * 2.2)
    env *= np.clip((duree - t) / 0.02, 0, 1)
    return np.tanh(x * env * 1.4) * 0.8


def nappe(notes, duree, ouverture=1900):
    t = t_(duree)
    g = np.zeros_like(t)
    d = np.zeros_like(t)
    for n in notes:
        for dec, cote in ((-9, g), (0, None), (9, d)):
            v = dent(f(n), duree, dec)
            if cote is None:
                g += v * 0.7
                d += v * 0.7
            else:
                cote += v
    env = np.minimum(1, t / 0.45) * np.clip((duree - t) / 0.5, 0, 1)
    g, d = passe_bas(g, ouverture), passe_bas(d, ouverture)
    return np.vstack([g * env, d * env]) * 0.12


def pluck(midi, duree=0.22, brillance=3200):
    t = t_(duree)
    x = dent(f(midi), duree) + 0.4 * np.sign(np.sin(2 * np.pi * f(midi) * t))
    x = passe_bas(x, brillance)
    return x * np.exp(-t * 16) * np.minimum(1, t / 0.002) * 0.34


def stab(notes, duree=0.18):
    t = t_(duree)
    x = sum(dent(f(n + 12), duree, dc) for n in notes for dc in (-6, 6))
    x = passe_bas(x, 2600)
    return x * np.exp(-t * 14) * np.minimum(1, t / 0.003) * 0.14


def montee(duree):
    """Souffle filtre qui monte : l'energie avant l'impact."""
    t = t_(duree)
    bruit = rng.normal(0, 1, len(t))
    x = np.zeros_like(t)
    tranches = 16
    for i in range(tranches):
        a, b = i * len(t) // tranches, (i + 1) * len(t) // tranches
        centre = 400 * (20 ** (i / (tranches - 1)))
        x[a:b] = passe_bande(bruit, centre * 0.7, centre * 1.4)[a:b]
    ton = np.sin(2 * np.pi * np.cumsum(220 + 660 * (t / duree) ** 2) / SR) * 0.25
    env = (t / duree) ** 2.2
    return (x * 0.7 + ton) * env * 0.5


def impact():
    t = t_(3.2)
    grave = np.sin(2 * np.pi * np.cumsum(62 * np.exp(-t * 0.6) + 32) / SR)
    grave *= np.exp(-t * 1.3)
    crash = passe_haut(rng.normal(0, 1, len(t)), 5200) * np.exp(-t * 1.9) * 0.3
    return np.tanh((grave * 1.2 + crash) * 1.3)


def cymbale_inverse(duree=1.6):
    t = t_(duree)
    x = passe_haut(rng.normal(0, 1, len(t)), 4800) * np.exp(-t * 2.4)
    return x[::-1] * 0.35


# -------------------------------------------------------------- ARRANGEMENT

def composer():
    batterie, basses, harmonie, effets = Piste(), Piste(), Piste(), Piste()

    def mesure(m):          # m commence a 1
        return (m - 1) * MESURE

    groove = list(range(3, 11)) + [13, 14]
    kicks = []

    for m in range(1, 17):
        racine, notes = ACCORDS[(m - 1) % 4]
        debut = mesure(m)
        # La nappe : fermee dans l'intro et la respiration, ouverte ailleurs.
        if m in (1, 2):
            ouv = 700 + 900 * (m - 1)
        elif m in (11, 12):
            ouv = 1500 - 500 * (m - 11)
        elif m >= 15:
            ouv = 2200
        else:
            ouv = 2400
        if m <= 14 or m == 15:
            duree = MESURE * (2 if m == 15 else 1) + 0.3
            harmonie.poser(nappe(notes, duree, ouv), debut, 1.0)

        # L'arpege, en doubles-croches, du debut a la respiration comprise.
        if m <= 14:
            motif = [notes[0] + 12, notes[1] + 12, notes[2] + 12, notes[1] + 24]
            for k in range(16):
                if m in (1, 2) and k % 2:
                    continue
                note = motif[k % 4]
                brill = 1600 if m in (1, 2, 11, 12) else 3600
                harmonie.poser(pluck(note, brillance=brill),
                               debut + k * TEMPS / 4, 0.8,
                               pan=0.45 if k % 2 else -0.45)

        if m in groove:
            for b in range(4):
                s = debut + b * TEMPS
                batterie.poser(kick(), s, 1.0)
                kicks.append(s)
                if b in (1, 3):
                    batterie.poser(clap(), s, 0.62, pan=0.05)
                batterie.poser(charleston(ouvert=m >= 13 and b % 2 == 1),
                               s + TEMPS / 2, 0.5, pan=0.3)
                for q in (1, 3):
                    batterie.poser(charleston(), s + q * TEMPS / 4, 0.18,
                                   pan=-0.3)
                # Basse en croches sur la fondamentale, octave sur le dernier.
                for c in range(2):
                    oct_ = 12 if (b == 3 and c == 1) else 0
                    basses.poser(basse(racine + oct_ - 12, TEMPS / 2 - 0.01),
                                 s + c * TEMPS / 2, 0.75)
                # Stabs sur les contretemps.
                if b in (1, 3):
                    harmonie.poser(stab(notes), s + TEMPS * 0.75, 1.0,
                                   pan=-0.2 if b == 1 else 0.2)
            # Roulement de clap sur la derniere mesure avant les impacts.
            if m in (10, 14):
                for k in range(8):
                    batterie.poser(clap(), debut + 3 * TEMPS + k * TEMPS / 8,
                                   0.18 + 0.05 * k)

    # Montees et impacts : les deux moments du logo et le retour du groove.
    effets.poser(montee(3.8), 0.2, 0.9)
    effets.poser(cymbale_inverse(1.6), mesure(3) - 1.6, 1.0, pan=-0.1)
    effets.poser(impact(), mesure(3), 0.9)
    effets.poser(montee(3.6), mesure(11) + 0.4, 0.8)
    effets.poser(impact(), mesure(13), 0.55)
    effets.poser(cymbale_inverse(1.8), mesure(15) - 1.8, 1.1, pan=0.1)
    effets.poser(impact(), mesure(15), 1.0)
    # Une note finale, tenue, qui laisse le logo respirer.
    racine, notes = ACCORDS[0]
    harmonie.poser(nappe([n + 12 for n in notes] + [notes[0] + 24], 4.0, 2600),
                   mesure(15), 0.9)

    # Pompe (sidechain) : la nappe et la basse s'effacent sous chaque kick.
    pompe = np.ones(N)
    rel = t_(0.32)
    creux = 1 - 0.62 * np.exp(-rel * 11)
    for s in kicks:
        a = int(s * SR)
        b = min(N, a + len(creux))
        pompe[a:b] = np.minimum(pompe[a:b], creux[:b - a])
    h, b_ = harmonie.stereo() * pompe, basses.stereo() * pompe

    # Reverberation d'ambiance, envoyee depuis la nappe, l'arpege et les effets.
    ir_t = t_(2.2)
    ir = np.vstack([rng.normal(0, 1, len(ir_t)), rng.normal(0, 1, len(ir_t))])
    ir *= np.exp(-ir_t * 3.1)
    ir = np.vstack([passe_bas(ir[0], 5200), passe_bas(ir[1], 5200)]) * 0.012
    envoi = h * 0.55 + effets.stereo() * 0.35
    rev = np.vstack([signal.fftconvolve(envoi[0], ir[0])[:N],
                     signal.fftconvolve(envoi[1], ir[1])[:N]])

    mix = batterie.stereo() * 0.9 + b_ * 0.85 + h + effets.stereo() * 0.8 + rev
    mix = np.vstack([passe_haut(mix[0], 28), passe_haut(mix[1], 28)])
    # Mastering leger : compression douce puis limite a -1 dBFS.
    mix = np.tanh(mix * 1.15) / np.tanh(1.15)
    crete = np.max(np.abs(mix))
    mix = mix / crete * 10 ** (-1 / 20)
    fondu = np.clip((DUREE - t_(DUREE)) / 1.4, 0, 1)
    mix *= fondu
    return mix


def ecrire(chemin: Path, mix: np.ndarray):
    stereo = (np.clip(mix.T, -1, 1) * 32767).astype(np.int16)
    with wave.open(str(chemin), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(stereo.tobytes())


if __name__ == "__main__":
    sortie = Path(__file__).parent / "public" / "musique.wav"
    ecrire(sortie, composer())
    print(f"{sortie.name} : {DUREE:.0f} s, {BPM} BPM, "
          f"{sortie.stat().st_size / 1024 / 1024:.1f} Mo")
