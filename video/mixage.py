"""Pose la voix off sur la musique du film, phrase par phrase, et baisse la
musique quand la voix parle.

    .venv/bin/python mixage.py chemin/vers/voix.mp3          # film A
    .venv/bin/python mixage.py --b chemin/vers/voix.mp3      # film B
    .venv/bin/python mixage.py --c chemin/vers/voix.mp3      # film C
    .venv/bin/python mixage.py --d chemin/vers/voix.mp3      # film D

Ecrit public/mix-voix.wav (ou mix-voix-b/c/d.wav), a poser sur
le film rendu.

LES PHRASES sont reperees dans le fichier de voix par leurs silences : le
generateur laisse une pause plus longue entre deux paragraphes qu'apres une
virgule. DECOUPE donne, pour chaque phrase, ou la couper dans le fichier
source ; PLACEMENT, a quelle seconde du film la faire entendre - toujours au
debut de la scene qu'elle commente.
"""

from __future__ import annotations

import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np
from scipy import signal

SR = 44100
DUREE_FILM = 32.0
ICI = Path(__file__).parent

# (debut, fin) de chaque phrase dans le fichier de voix, en secondes.
# Voix : Roger (ElevenLabs, 2026-10-03 14:32), texte humanise et sans prix.
# Sert aux films A, E et F, qui ont le meme minutage.
DECOUPE = [
    (0.00, 2.63),    # [soupir] Vous ratez encore des appels d'offres ?
    (3.05, 7.15),    # Ils sont partout... Nous lisons 61 sources...
    (7.60, 11.08),   # Tout arrive dans un seul tableau...
    (11.42, 15.97),  # Et vous etes prevenu avant la date limite...
    (16.38, 19.18),  # Huit pays suivis...
    (19.60, 23.70),  # Un rappel a jour J moins sept...
    (24.06, 27.59),  # Un seul paiement, sans abonnement. Tenderpilot point store.
]
# Seconde du film ou chaque phrase commence (une scene = une phrase).
PLACEMENT = [0.3, 4.15, 8.4, 14.25, 20.25, 23.7, 28.1]

# FILM B. La voix est plus longue que ses scenes : on l'accelere de 6 %
# (hauteur conservee) et on raccourcit les pauses internes. Les coupes sont
# lues sur le fichier d'origine, avant acceleration.
DECOUPE_B = [
    (0.00, 2.54),    # Chaque matin, Aicha fait la meme course.
    (2.87, 7.50),    # [soupir] Les journaux, soixante sites...
    (7.89, 10.82),   # Et l'appel d'offres parfait ? ... Cloture la veille.
    (11.17, 13.90),  # Aujourd'hui, elle a un copilote : TenderPilot.
    (14.22, 18.30),  # Soixante et une sources...
    (18.57, 23.46),  # Un rappel a jour J moins sept... Elle ne rate plus rien.
    (23.79, 28.29),  # TenderPilot. Un seul paiement, sans abonnement...
]
# Voix : Katie (ElevenLabs, 2026-10-03 14:52), texte humanise, sans prix,
# deja rapide (vitesse 1,17) : ni acceleration, ni pause resserree. Calages :
# « Cloture » sur le tampon (9,6 s), « TenderPilot » sur le logo (15,5 s),
# chaque « jour J moins... » sur sa notification, « Elle ne rate plus rien »
# sur le tampon DEPOSE (25,1 s). Memes valeurs que VOIX_B (src/b/tempoB.ts).
PLACEMENT_B = [0.3, 3.2, 8.0, 13.57, 16.9, 21.4, 26.5]
TEMPO_B = 1.0
PAUSE_MAX = 0.16

# FILM C. Voix : Florian (ElevenLabs, 2026-09-30 20:26), 23,6 s pour six
# phrases : elle tient sans acceleration. Une phrase par scene de deux
# mesures (5,33 s), posee un peu apres le debut de la scene.
DECOUPE_C = [
    (0.19, 3.23),    # Un appel d'offres se gagne... avant la date limite.
    (4.31, 10.59),   # [souffle] Pourtant, la veille se fait encore a la main...
    (11.66, 14.35),  # TenderPilot automatise votre veille...
    (14.66, 19.25),  # Soixante et une sources officielles...
    (19.79, 23.86),  # Vous etes alerte a jour J moins sept...
    (24.64, 29.88),  # TenderPilot. En paiement unique, sans abonnement...
]
# Voix : Alex (ElevenLabs, 2026-10-03 14:58), texte humanise et sans prix.
# « TenderPilot » tombe sur l'impact de la marque (10,85 s), chaque « jour J
# moins... » quand le curseur de la frise passe le repere.
PLACEMENT_C = [0.4, 3.9, 10.85, 16.2, 22.5, 26.85]
# Pause interne la plus longue toleree, phrase par phrase (None : intacte).
PAUSES_C = [None, 0.25, None, 0.3, None, 0.2]

# FILM D. Voix : The Master Storyteller (ElevenLabs, 2026-10-01 9:19), texte
# balise. Coupes lues sur la transcription mot a mot (faster-whisper) et sur
# les silences. Les silences dramatiques sont GARDES : celui d'avant « Trop
# tard » fait tomber les deux mots pile sur le rideau (11,85 s). Pour chaque
# phrase, la pause interne la plus longue toleree (None : on ne touche a rien).
DECOUPE_D = [
    (0.00, 3.47),    # Voici Koffi. Chaque matin...
    (3.78, 9.10),    # Soixante sites. Des journaux... [soupir] pour quelques avis.
    (9.55, 12.23),   # Et quand il trouve le bon ? ... Trop tard.
    (12.63, 16.55),  # Rembobinons. Avec TenderPilot...
    (16.89, 23.05),  # Soixante et une sources... jour J moins sept...
    (23.37, 26.21),  # Cette fois... Koffi depose a temps. [petit rire]
    (26.60, 31.80),  # TenderPilot. Un seul paiement, sans abonnement...
]
# Voix : Paul K (ElevenLabs, 2026-10-03 15:06), texte humanise et sans prix.
# Elle dure 32 s, autant que le film : la derniere phrase est accelere de 12 %
# (hauteur conservee) pour finir avant le fondu. « Trop tard » tombe sur le
# rideau (11,9 s).
PLACEMENT_D = [0.25, 4.2, 10.27, 14.05, 18.25, 24.45, 27.45]
PAUSES_D = [None, None, None, None, 0.2, None, 0.15]
VITESSES_D = [1, 1, 1, 1, 1, 1, 1.12]

# Le dosage voix / musique, par film. `baisse` : de combien la musique
# s'efface sous la voix (dB) ; `musique` : son niveau general ; `poche` : le
# creux supplementaire dans la bande de la voix. Le film C a une voix grave
# et calme sur du piano et des cordes : il lui faut les trois.
REGLAGES = {
    "a": {"baisse": 19, "musique": -4, "poche": 6},
    "b": {"baisse": 19, "musique": -4, "poche": 6},
    "c": {"baisse": 14, "musique": -2, "poche": 4},
    "d": {"baisse": 17, "musique": -3, "poche": 5},
}
POCHE = signal.butter(2, [180, 3000], "band", fs=SR, output="sos")


def lire_wav(chemin: Path) -> np.ndarray:
    with wave.open(str(chemin), "rb") as w:
        brut = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16)
        canaux = w.getnchannels()
    son = brut.astype(np.float32) / 32768.0
    return son.reshape(-1, canaux).T if canaux > 1 else son[None, :]


def decoder(chemin: Path, dossier: Path, tempo: float = 1.0) -> np.ndarray:
    sortie = dossier / "voix.wav"
    filtre = ["-af", f"atempo={tempo}"] if tempo != 1.0 else []
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(chemin), *filtre,
                    "-ar", str(SR), "-ac", "1", str(sortie)], check=True)
    return lire_wav(sortie)[0]


def accelerer(morceau: np.ndarray, facteur: float) -> np.ndarray:
    """Accelere une phrase sans changer la hauteur de la voix (atempo)."""
    if facteur == 1:
        return morceau
    sortie = subprocess.run(
        ["ffmpeg", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-",
         "-af", f"atempo={facteur}", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-"],
        input=morceau.astype(np.float32).tobytes(), capture_output=True, check=True,
    ).stdout
    return np.frombuffer(sortie, np.float32).astype(np.float64)


def serrer(morceau: np.ndarray, pause_max: float) -> np.ndarray:
    """Raccourcit a `pause_max` les silences internes d'une phrase."""
    fen = int(0.02 * SR)
    niveau = np.convolve(np.abs(morceau), np.ones(fen) / fen, mode="same")
    calme = niveau < 10 ** (-38 / 20)
    garde = np.ones(len(morceau), dtype=bool)
    i, n, lim = 0, len(morceau), int(pause_max * SR)
    while i < n:
        if calme[i]:
            j = i
            while j < n and calme[j]:
                j += 1
            if j - i > lim and i > 0 and j < n:
                # On garde les deux bords du silence, on retire le milieu.
                garde[i + lim // 2:j - lim // 2] = False
            i = j
        else:
            i += 1
    return morceau[garde]


def mixer(voix_src: Path, film: str = "a") -> Path:
    film_b = film == "b"
    suffixe = "" if film == "a" else f"-{film}"
    musique = lire_wav(ICI / "public" / f"musique{suffixe}.wav")
    n = musique.shape[1]
    tempo = TEMPO_B if film_b else 1.0
    brutes, placement = {"a": (DECOUPE, PLACEMENT), "b": (DECOUPE_B, PLACEMENT_B), "c": (DECOUPE_C, PLACEMENT_C), "d": (DECOUPE_D, PLACEMENT_D)}[film]
    decoupe = [(a / tempo, b / tempo) for a, b in brutes]
    with tempfile.TemporaryDirectory() as tmp:
        brut = decoder(voix_src, Path(tmp), tempo)

    # La voix : un passe-haut enleve les graves inutiles, qui brouilleraient
    # la basse de la musique.
    sos = signal.butter(2, 90, "high", fs=SR, output="sos")
    brut = signal.sosfilt(sos, brut)

    voix = np.zeros(n)
    for rang, ((a, b), t) in enumerate(zip(decoupe, placement)):
        morceau = brut[int(a * SR):int(b * SR)].copy()
        if film == "d":
            if PAUSES_D[rang] is not None:
                morceau = serrer(morceau, PAUSES_D[rang])
            morceau = accelerer(morceau, VITESSES_D[rang])
        elif film == "c":
            if PAUSES_C[rang] is not None:
                morceau = serrer(morceau, PAUSES_C[rang])
        if t + len(morceau) / SR > DUREE_FILM - 0.8:
            print(f"attention : la phrase posee a {t} s finit a {t + len(morceau) / SR:.2f} s")
        # Un fondu de 15 ms a chaque bout : pas de clic a la coupe.
        f = int(0.015 * SR)
        morceau[:f] *= np.linspace(0, 1, f)
        morceau[-f:] *= np.linspace(1, 0, f)
        debut = int(t * SR)
        fin = min(n, debut + len(morceau))
        voix[debut:fin] += morceau[:fin - debut]

    # LA MUSIQUE S'EFFACE SOUS LA VOIX. L'enveloppe de la voix, lissee,
    # commande une baisse de 10 dB ; elle revient entre les phrases. Sur un
    # haut-parleur de telephone, c'est ce qui rend les mots intelligibles.
    niveau = np.abs(voix)
    fenetre = int(0.08 * SR)
    niveau = np.convolve(niveau, np.ones(fenetre) / fenetre, mode="same")
    presence = np.clip(niveau / (np.max(niveau) * 0.12 + 1e-9), 0, 1)
    # Attaque rapide, relachement lent : la musique ne "pompe" pas.
    lisse = np.zeros_like(presence)
    att, rel = 1 - np.exp(-1 / (0.02 * SR)), 1 - np.exp(-1 / (0.35 * SR))
    etat = 0.0
    for i, p in enumerate(presence[::32]):
        etat += (p - etat) * (att * 32 if p > etat else rel * 32)
        lisse[i * 32:(i + 1) * 32] = etat
    r = REGLAGES[film]
    gain_musique = (1 - lisse * (1 - 10 ** (-r["baisse"] / 20))) * 10 ** (r["musique"] / 20)
    # Une poche pour la voix : sous les phrases, on creuse en plus la bande
    # ou elle vit (180 Hz - 3 kHz). Une voix grave et posee y est a egalite
    # avec le piano et les cordes ; baisser tout le reste ne suffit pas.
    if r["poche"]:
        bande = np.vstack([signal.sosfilt(POCHE, musique[0]), signal.sosfilt(POCHE, musique[1])])
        musique = musique - bande * (1 - 10 ** (-r["poche"] / 20)) * lisse

    voix_st = np.vstack([voix, voix]) * 1.35
    mix = musique * gain_musique + voix_st
    # Le rapport voix / musique pendant les phrases, pour regler a la mesure.
    parle = lisse > 0.6
    rms = lambda x: np.sqrt(np.mean(x[:, parle] ** 2)) + 1e-12
    print(f"voix au-dessus de la musique : {20 * np.log10(rms(voix_st) / rms(musique * gain_musique)):+.1f} dB")
    crete = np.max(np.abs(mix))
    mix = mix / crete * 10 ** (-1 / 20)

    sortie = ICI / "public" / f"mix-voix{suffixe}.wav"
    with wave.open(str(sortie), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(mix.T, -1, 1) * 32767).astype(np.int16).tobytes())
    return sortie


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a not in ("--b", "--c", "--d")]
    if not args:
        raise SystemExit("Usage : .venv/bin/python mixage.py [--b|--c|--d] voix.mp3")
    film = next((x[2] for x in ("--b", "--c", "--d") if x in sys.argv), "a")
    chemin = mixer(Path(args[0]), film)
    print(f"{chemin.relative_to(ICI)} ecrit")
