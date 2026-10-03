import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Fond } from "../ui/Fond";
import { utiliserTheme } from "../theme";
import { chargerPolices } from "../polices";
import { DUREE, MESURE, SCENES, TEMPS } from "../tempo";
import { S1Ecriture } from "./scenes-a";
import { S2Radar, S3Capture } from "./scenes-a";
import { S4Anneau, S5CarteF, S6Jauges, S7Signature } from "./scenes-b";

chargerPolices();

// Chevauchement entre deux scenes : un demi-temps, comme le film A.
const RACCORD = Math.round(TEMPS / 2);

/** Une scene posee a son debut, avec un fondu croise d'entree et de sortie. */
const Plan: React.FC<{
  debut: number;
  duree: number;
  children: React.ReactNode;
}> = ({ debut, duree, children }) => {
  const f = useCurrentFrame();
  const local = f - debut;
  const entree = interpolate(local, [0, RACCORD], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const sortie = interpolate(local, [duree, duree + RACCORD], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <Sequence from={debut} durationInFrames={duree + RACCORD}>
      <AbsoluteFill style={{ opacity: Math.min(entree, sortie) }}>{children}</AbsoluteFill>
    </Sequence>
  );
};

/**
 * FILM F — « La balise ». Sept scenes, sept metaphores SVG : l'ecriture, le
 * radar, la capture, l'anneau, la carte, les jauges, la signature. Meme
 * squelette que le film A (fond commun, plans fondus, meme grille musicale
 * et meme piste) — mais tout ce qui bouge est un trace vectoriel.
 */
export const FilmF: React.FC = () => {
  // Le film F garde la nuit indigo.
  utiliserTheme("sombre");
  const f = useCurrentFrame();
  const energie = interpolate(
    f,
    [0, MESURE * 2, MESURE * 2 + 6, MESURE * 10, MESURE * 10 + 30, MESURE * 12, MESURE * 12 + 6, DUREE],
    [0.25, 0.45, 1, 1, 0.5, 0.6, 1, 0.9],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return (
    <AbsoluteFill>
      <Fond energie={energie} />
      <Plan debut={SCENES.logo} duree={MESURE * 2}>
        <S1Ecriture />
      </Plan>
      <Plan debut={SCENES.sources} duree={MESURE * 2}>
        <S2Radar />
      </Plan>
      <Plan debut={SCENES.tableau} duree={MESURE * 3}>
        <S3Capture />
      </Plan>
      <Plan debut={SCENES.alerte} duree={MESURE * 3}>
        <S4Anneau />
      </Plan>
      <Plan debut={SCENES.carte} duree={MESURE * 2}>
        <S5CarteF />
      </Plan>
      <Plan debut={SCENES.compte} duree={MESURE * 2}>
        <S6Jauges />
      </Plan>
      <Plan debut={SCENES.final} duree={MESURE * 2}>
        <S7Signature />
      </Plan>
      <Audio src={staticFile("musique.wav")} />
    </AbsoluteFill>
  );
};
