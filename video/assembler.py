"""La fin commune, et les films avec ou sans elle.

    .venv/bin/python assembler.py

Pour changer un prix : modifier src/fin/offre.ts (et regenerer l'annonce
public/fin-voix.mp3 si le prix est dit a voix haute), puis lancer ce script.
Les films ne sont PAS recalcules : on reprend les videos deja montees dans
dist/videos/, on les coupe juste avant leur propre fin, et on colle la fin
commune derriere.

La fin reste DETACHABLE : le script livre aussi chaque morceau a part, pour
qu'on puisse l'ajouter ou la retirer dans n'importe quel logiciel de montage.

    dist/videos/finales/fin-commune/   la fin seule, avec et sans l'annonce du prix
    dist/videos/finales/sans-fin/      chaque film coupe avant sa fin, sans rien derriere
    dist/videos/finales/avec-fin/      chaque film suivi de la fin commune
"""

from __future__ import annotations

import subprocess
from pathlib import Path

ICI = Path(__file__).parent
VIDEOS = ICI.parent / "dist" / "videos"
VOIX_FIN = ICI / "public" / "fin-voix.mp3"

# (nom, video avec voix, video musique seule, seconde de coupe). La coupe
# tombe juste avant la phrase de fin propre au film (mixage.py, PLACEMENT*),
# et au moins FONDU apres la fin de la phrase d'avant : le fondu de sortie ne
# doit jamais manger un mot.
FILMS = [
    ("A-produit", "tenderpilot-motion-voix.mp4", "tenderpilot-motion.mp4", 28.07),
    ("B-aicha", "tenderpilot-motion-b-voix.mp4", "tenderpilot-motion-b.mp4", 26.47),
    ("C-date-limite", "tenderpilot-motion-c-voix.mp4", "tenderpilot-motion-c.mp4", 26.83),
    ("D-koffi", "tenderpilot-motion-d-voix.mp4", "tenderpilot-motion-d.mp4", 27.43),
    ("E-site", "tenderpilot-motion-e-voix.mp4", "tenderpilot-motion-e.mp4", 28.07),
    # G n'a pas de fin propre : il s'arrete a 28 s, la fin commune prend le relais.
    ("G-sans-avec", "tenderpilot-motion-g-voix.mp4", "tenderpilot-motion-g.mp4", 28.0),
    ("H-cout", "tenderpilot-motion-h-voix.mp4", "tenderpilot-motion-h.mp4", 26.0),
]
FONDU = 0.3  # la bande-son du film s'efface sur ses dernieres 0,3 s
VIDEO = ["-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p"]
AUDIO = ["-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-movflags", "+faststart"]


def lancer(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True, cwd=ICI)


def rendre_fin(avec_voix: bool) -> Path:
    """Compose le son de la fin, puis rend la fin. Rend out/fin[-sans-voix].mp4."""
    lancer([str(ICI / ".venv" / "bin" / "python"), "fin_son.py", *([str(VOIX_FIN)] if avec_voix else [])])
    sortie = ICI / "out" / ("fin.mp4" if avec_voix else "fin-sans-voix.mp4")
    lancer(["npx", "remotion", "render", "src/index.ts", "Fin", str(sortie), "--codec", "h264", "--crf", "16", "--log=error"])
    return sortie


def livrer_fin(fin: Path, sortie: Path) -> None:
    """La fin seule, au meme volume que les films (-14 LUFS)."""
    lancer(["ffmpeg", "-v", "error", "-y", "-i", str(fin), "-c:v", "copy",
            "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", *AUDIO, str(sortie)])


def couper(film: Path, coupe: float, sortie: Path) -> None:
    """Le film seul, arrete juste avant sa propre fin, son en fondu."""
    lancer(["ffmpeg", "-v", "error", "-y", "-i", str(film), "-t", str(coupe),
            "-af", f"afade=t=out:st={coupe - FONDU}:d={FONDU}", *VIDEO, *AUDIO, str(sortie)])


def coller(film: Path, fin: Path, coupe: float, sortie: Path) -> None:
    filtre = (
        f"[0:v]trim=0:{coupe},setpts=PTS-STARTPTS,fps=30[v0];"
        f"[0:a]atrim=0:{coupe},asetpts=PTS-STARTPTS,afade=t=out:st={coupe - FONDU}:d={FONDU},aresample=48000[a0];"
        "[1:v]setpts=PTS-STARTPTS,fps=30[v1];"
        "[1:a]asetpts=PTS-STARTPTS,aresample=48000,loudnorm=I=-14:TP=-1.5:LRA=11[a1];"
        "[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]"
    )
    lancer(["ffmpeg", "-v", "error", "-y", "-i", str(film), "-i", str(fin),
            "-filter_complex", filtre, "-map", "[v]", "-map", "[a]", *VIDEO, *AUDIO, str(sortie)])


if __name__ == "__main__":
    # La fin muette d'abord, la fin parlee ensuite : public/fin-son.wav garde
    # ainsi la version complete, celle que montre Remotion Studio.
    fin_muette = rendre_fin(avec_voix=False)
    fin_parlee = rendre_fin(avec_voix=True) if VOIX_FIN.exists() else fin_muette

    # Ecrit directement dans finales/ : un seul exemplaire de chaque video.
    dossiers = {nom: VIDEOS / "finales" / nom for nom in ("fin-commune", "sans-fin", "avec-fin")}
    for d in dossiers.values():
        d.mkdir(parents=True, exist_ok=True)

    livrer_fin(fin_muette, dossiers["fin-commune"] / "fin-commune-sans-voix.mp4")
    if fin_parlee != fin_muette:
        livrer_fin(fin_parlee, dossiers["fin-commune"] / "fin-commune-voix.mp4")
    print("ok : fin-commune/")

    for nom, voix, musique, coupe in FILMS:
        # La version avec voix recoit la fin qui annonce le prix ; la version
        # musique seule, la fin muette.
        for source, suffixe, fin in ((voix, "voix", fin_parlee), (musique, "musique", fin_muette)):
            chemin = VIDEOS / source
            if not chemin.exists():
                print(f"absent, ignore : {source}")
                continue
            couper(chemin, coupe, dossiers["sans-fin"] / f"{nom}-{suffixe}.mp4")
            coller(chemin, fin, coupe, dossiers["avec-fin"] / f"{nom}-{suffixe}.mp4")
        print(f"ok : {nom}")

