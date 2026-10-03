import { AbsoluteFill, interpolate, random, useCurrentFrame } from "remotion";
import { C } from "../theme";

/**
 * Le fond de tout le film : une nuit indigo ou trois halos derivent sans
 * jamais repasser au meme endroit, un grain de pellicule qui change a chaque
 * image, et un vignettage. C'est ce qui separe un rendu "premium" d'un aplat.
 *
 * `energie` (0 a 1) pilote l'intensite des halos : calme dans l'intro et la
 * respiration, pleine pendant le groove.
 */
export const Fond: React.FC<{ energie?: number; teinte?: string }> = ({
  energie = 1,
  teinte = C.indigo,
}) => {
  const f = useCurrentFrame();
  const halos = [
    { c: teinte, vx: 0.011, vy: 0.008, r: 1300, x0: 0.25, y0: 0.3, o: 0.55 },
    { c: C.bleu, vx: 0.007, vy: 0.012, r: 1100, x0: 0.8, y0: 0.6, o: 0.4 },
    { c: "#7C5CFF", vx: 0.009, vy: 0.006, r: 900, x0: 0.5, y0: 0.9, o: 0.3 },
  ];
  return (
    <AbsoluteFill style={{ backgroundColor: C.nuit, overflow: "hidden" }}>
      {halos.map((h, i) => {
        const x = (h.x0 + 0.28 * Math.sin(f * h.vx + i * 2.1)) * 1080;
        const y = (h.y0 + 0.2 * Math.cos(f * h.vy + i * 1.7)) * 1920;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - h.r / 2,
              top: y - h.r / 2,
              width: h.r,
              height: h.r,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${h.c} 0%, transparent 62%)`,
              opacity: h.o * energie * C.halos,
              filter: "blur(40px)",
            }}
          />
        );
      })}
      <Grille />
      <Poussiere />
      {/* Vignettage : ramene l'oeil au centre, comme un objectif. */}
      <AbsoluteFill
        style={{
          background:
            `radial-gradient(ellipse at center, transparent 45%, ${C.vignette} 100%)`,
        }}
      />
      <Grain />
    </AbsoluteFill>
  );
};

/** Une grille en perspective, qui avance doucement vers le spectateur. */
const Grille: React.FC = () => {
  const f = useCurrentFrame();
  const decalage = (f * 1.4) % 90;
  return (
    <AbsoluteFill
      style={{
        perspective: 900,
        perspectiveOrigin: "50% 30%",
        opacity: 0.35,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: -1080,
          top: 1100,
          width: 3240,
          height: 2000,
          transform: "rotateX(72deg)",
          transformOrigin: "50% 0%",
          backgroundImage:
            `linear-gradient(${C.grille} 1px, transparent 1px), linear-gradient(90deg, ${C.grille} 1px, transparent 1px)`,
          backgroundSize: "90px 90px",
          backgroundPosition: `0 ${decalage}px`,
          maskImage: "linear-gradient(to bottom, black 0%, transparent 70%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 70%)",
        }}
      />
    </AbsoluteFill>
  );
};

/** Des particules qui montent lentement, a trois profondeurs. */
const Poussiere: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      {new Array(40).fill(0).map((_, i) => {
        const prof = 0.4 + random(`p${i}`) * 0.9;
        const x = random(`x${i}`) * 1080 + Math.sin(f / 60 + i) * 18;
        const y =
          ((random(`y${i}`) * 2200 - f * 1.6 * prof) % 2200 + 2200) % 2200 - 140;
        const taille = 2 + prof * 4;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: taille,
              height: taille,
              borderRadius: "50%",
              background: C.lavande,
              opacity: (0.18 + prof * 0.35) * (C.clair ? 0.5 : 1),
              filter: prof < 0.7 ? "blur(1.5px)" : undefined,
              boxShadow: `0 0 ${taille * 3}px ${C.lavande}`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Le grain : du bruit qui change a chaque image, tres leger. */
const Grain: React.FC = () => {
  const f = useCurrentFrame();
  const graine = Math.floor(f % 8);
  return (
    <AbsoluteFill style={{ opacity: C.clair ? 0.04 : 0.09, mixBlendMode: C.clair ? "multiply" : "overlay" }}>
      <svg width="1080" height="1920">
        <filter id={`g${graine}`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="2"
            seed={graine}
          />
        </filter>
        <rect width="1080" height="1920" filter={`url(#g${graine})`} />
      </svg>
    </AbsoluteFill>
  );
};

/** Une onde qui part d'un point, calee sur un temps musical. */
export const Onde: React.FC<{
  x: number;
  y: number;
  debut: number;
  couleur?: string;
  duree?: number;
  taille?: number;
}> = ({ x, y, debut, couleur = C.lavande, duree = 36, taille = 900 }) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [debut, debut + duree], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (f < debut || p >= 1) return null;
  const r = taille * (1 - Math.pow(1 - p, 3));
  return (
    <div
      style={{
        position: "absolute",
        left: x - r / 2,
        top: y - r / 2,
        width: r,
        height: r,
        borderRadius: "50%",
        border: `${3 * (1 - p) + 1}px solid ${couleur}`,
        opacity: (1 - p) * 0.8,
        boxShadow: `0 0 40px ${couleur}`,
      }}
    />
  );
};
