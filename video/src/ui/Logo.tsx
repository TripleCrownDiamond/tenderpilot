import {
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { C } from "../theme";

/**
 * Le logo, anime en deux temps et jamais pose d'un bloc :
 *   1. l'icone arrive en ressort, en tournant legerement, floue puis nette ;
 *   2. le nom se revele de gauche a droite, derriere un masque ;
 *   3. un reflet traverse l'ensemble.
 *
 * `debut` decale toute l'animation (image du film ou elle commence).
 */
export const LogoAnime: React.FC<{
  debut?: number;
  largeur?: number;
  clair?: boolean;
}> = ({ debut = 0, largeur = 760, clair = true }) => {
  const f = useCurrentFrame() - debut;
  const { fps } = useVideoConfig();
  const variante = clair ? "clair" : "fonce";

  const ressort = spring({ frame: f, fps, config: { damping: 11, stiffness: 120, mass: 0.9 } });
  const icone = {
    echelle: interpolate(ressort, [0, 1], [0.35, 1]),
    rotation: interpolate(ressort, [0, 1], [-18, 0]),
    flou: interpolate(f, [0, 14], [18, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    opacite: interpolate(f, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  };

  // Le nom se revele apres l'icone, au temps suivant.
  const revele = interpolate(f, [14, 34], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const glisse = interpolate(f, [14, 34], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Le reflet : une bande claire qui traverse le logo une fois pose.
  const reflet = interpolate(f, [38, 62], [-40, 140], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  // Les deux images ont la meme hauteur ; leurs largeurs sont celles des
  // fichiers (icone 346 x 267, nom 850 x 267). On en deduit la hauteur qui
  // fait tenir l'ensemble dans `largeur`, ecart compris - sinon le mot
  // "Pilot" deborde du cadre.
  const hauteur = (largeur * 0.988) / (346 / 267 + 850 / 267);
  const hIcone = hauteur;
  const hMot = hauteur;
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: largeur * 0.012,
        width: largeur,
      }}
    >
      <div
        style={{
          transform: `scale(${icone.echelle}) rotate(${icone.rotation}deg)`,
          filter: `blur(${icone.flou}px) drop-shadow(0 0 ${30 * ressort}px ${C.indigo})`,
          opacity: icone.opacite,
          transformOrigin: "50% 50%",
        }}
      >
        <Img src={staticFile(`icone-${variante}.png`)} style={{ height: hIcone }} />
      </div>
      <div
        style={{
          clipPath: `inset(0 ${100 - revele}% 0 0)`,
          transform: `translateX(${glisse}px)`,
        }}
      >
        <Img src={staticFile(`mot-${variante}.png`)} style={{ height: hMot }} />
      </div>
      {/* Le reflet, masque a la forme du logo par mix-blend-mode. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(105deg, transparent ${reflet - 12}%, rgba(255,255,255,0.75) ${reflet}%, transparent ${reflet + 12}%)`,
          mixBlendMode: "overlay",
          pointerEvents: "none",
        }}
      />
    </div>
  );
};
