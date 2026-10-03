import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Fond } from "./ui/Fond";
import { utiliserTheme } from "./theme";
import { chargerPolices } from "./polices";

chargerPolices();
import { DUREE, MESURE, SCENES, TEMPS } from "./tempo";
import { S1Logo } from "./scenes/S1Logo";
import { S2Sources } from "./scenes/S2Sources";
import { S3Tableau } from "./scenes/S3Tableau";
import { S4Alerte } from "./scenes/S4Alerte";
import { S5Carte } from "./scenes/S5Carte";
import { S6Compte } from "./scenes/S6Compte";
import { S7Final } from "./scenes/S7Final";

// Chevauchement entre deux scenes : un demi-temps. Assez pour lier, trop
// court pour qu'on voie deux plans a la fois.
const RACCORD = Math.round(TEMPS / 2);

/** Une scene posee a son debut, avec un fondu croise d'entree et de sortie. */
const Plan: React.FC<{
  debut: number;
  duree: number;
  children: React.ReactNode;
  sansEntree?: boolean;
}> = ({ debut, duree, children, sansEntree }) => {
  const f = useCurrentFrame();
  const local = f - debut;
  const entree = sansEntree
    ? 1
    : interpolate(local, [0, RACCORD], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
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
 * Le film : un fond commun qui ne s'interrompt jamais, et les scenes posees
 * dessus a leur mesure. L'energie du fond suit la musique.
 */
export const Film: React.FC = () => {
  // Le film A passe sur le blanc du site, comme les autres films.
  utiliserTheme("clair");
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
      <Plan debut={SCENES.logo} duree={MESURE * 2} sansEntree>
        <S1Logo />
      </Plan>
      <Plan debut={SCENES.sources} duree={MESURE * 2}>
        <S2Sources />
      </Plan>
      <Plan debut={SCENES.tableau} duree={MESURE * 3}>
        <S3Tableau />
      </Plan>
      <Plan debut={SCENES.alerte} duree={MESURE * 3}>
        <S4Alerte />
      </Plan>
      <Plan debut={SCENES.carte} duree={MESURE * 2}>
        <S5Carte />
      </Plan>
      <Plan debut={SCENES.compte} duree={MESURE * 2}>
        <S6Compte />
      </Plan>
      <Plan debut={SCENES.final} duree={MESURE * 2}>
        <S7Final />
      </Plan>
      <Audio src={staticFile("musique.wav")} />
    </AbsoluteFill>
  );
};
