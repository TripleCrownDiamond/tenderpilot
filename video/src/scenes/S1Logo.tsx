import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { LogoAnime } from "../ui/Logo";
import { Onde } from "../ui/Fond";
import { C } from "../theme";
import { MESURE, TEMPS } from "../tempo";
import { POLICE } from "../polices";

/**
 * Mesures 1-2. Le noir, une ligne de lumiere qui s'ouvre, le logo qui
 * s'ecrit, puis un zoom a travers lui pile sur le drop (image 120).
 */
export const S1Logo: React.FC = () => {
  const f = useCurrentFrame();

  const ligne = interpolate(f, [4, 34], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.65, 0, 0.35, 1),
  });
  const ligneOpacite = interpolate(f, [34, 52], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Sortie : le logo grossit et s'efface, on "traverse" vers la suite.
  const traversee = interpolate(f, [MESURE * 2 - 18, MESURE * 2], [1, 7], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.exp),
  });
  const disparition = interpolate(f, [MESURE * 2 - 12, MESURE * 2], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          position: "absolute",
          top: 958,
          left: 540 - 520 * ligne,
          width: 1040 * ligne,
          height: 3,
          borderRadius: 3,
          background: `linear-gradient(90deg, transparent, ${C.lavande}, ${C.eclat}, ${C.lavande}, transparent)`,
          boxShadow: `0 0 30px ${C.bleu}, 0 0 80px ${C.indigo}`,
          opacity: ligneOpacite,
        }}
      />
      <Onde x={540} y={960} debut={TEMPS * 2} taille={1300} couleur={C.bleu} />
      <Onde x={540} y={960} debut={TEMPS * 3} taille={900} />
      <div
        style={{
          transform: `scale(${traversee})`,
          opacity: disparition,
          filter: `blur(${(traversee - 1) * 3}px)`,
        }}
      >
        <LogoAnime debut={TEMPS * 2} largeur={780} clair={!C.clair} />
        <div
          style={{
            marginTop: 34,
            textAlign: "center",
            fontFamily: POLICE,
            fontWeight: 600,
            fontSize: 38,
            letterSpacing: "0.18em",
            color: C.lavande,
            opacity: interpolate(f, [72, 86], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            transform: `translateY(${interpolate(f, [72, 86], [18, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
          }}
        >
          VEILLE DES APPELS D'OFFRES
        </div>
      </div>
    </AbsoluteFill>
  );
};
