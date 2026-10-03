import { interpolate } from "remotion";
import { C } from "../theme";
import { SORTIE, entre } from "../ui/anim";

/**
 * Les primitives SVG du film F. Tout ce qui bouge ici est un trace
 * vectoriel : on ne fait jamais apparaitre un bloc, on le DESSINE.
 * Le procede : pathLength = 1, strokeDasharray = 1, et un offset qui
 * descend de 1 a 0 — le trace "se court" tout seul, quelle que soit
 * la longueur reelle du chemin.
 */

/** Un chemin qui se trace entre `debut` et `fin`, avec sa pointe lumineuse. */
export const Trace: React.FC<{
  d: string;
  debut: number;
  duree: number;
  f: number;
  couleur?: string;
  epaisseur?: number;
  lueur?: number;
  pointe?: { x: number; y: number } | null;
  rayonPointe?: number;
}> = ({
  d,
  debut,
  duree,
  f,
  couleur = C.lavande,
  epaisseur = 6,
  lueur = 0.9,
  pointe = null,
  rayonPointe = 9,
}) => {
  const p = entre(f, debut, debut + duree, 0, 1, SORTIE);
  if (p <= 0) return null;
  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={couleur}
        strokeWidth={epaisseur}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - p}
        style={{ filter: `drop-shadow(0 0 ${12 * lueur}px ${couleur})` }}
      />
      {pointe && p < 1 && (
        <circle cx={pointe.x} cy={pointe.y} r={rayonPointe} fill="#fff" opacity={0.9 * lueur} style={{ filter: `drop-shadow(0 0 16px ${couleur})` }} />
      )}
    </g>
  );
};

/** Un cercle qui se trace (anneaux du radar, cadres). */
export const TraceCercle: React.FC<{
  cx: number;
  cy: number;
  r: number;
  debut: number;
  duree: number;
  f: number;
  couleur?: string;
  epaisseur?: number;
  opacite?: number;
}> = ({ cx, cy, r, debut, duree, f, couleur = C.lavande, epaisseur = 3, opacite = 1 }) => {
  const p = entre(f, debut, debut + duree, 0, 1, SORTIE);
  if (p <= 0) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill="none"
      stroke={couleur}
      strokeWidth={epaisseur}
      opacity={opacite}
      pathLength={1}
      strokeDasharray={1}
      strokeDashoffset={1 - p}
    />
  );
};

/** Une onde circulaire qui part d'un point et s'evanouit. */
export const OndeSvg: React.FC<{
  cx: number;
  cy: number;
  debut: number;
  f: number;
  rMax?: number;
  couleur?: string;
  duree?: number;
  epaisseur?: number;
}> = ({ cx, cy, debut, f, rMax = 500, couleur = C.lavande, duree = 36, epaisseur = 4 }) => {
  const p = interpolate(f, [debut, debut + duree], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (f < debut || p >= 1) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={rMax * (1 - Math.pow(1 - p, 3))}
      fill="none"
      stroke={couleur}
      strokeWidth={epaisseur * (1 - p) + 1}
      opacity={(1 - p) * 0.8}
    />
  );
};

/** Un point qui emerge quand le faisceau du radar passe sur lui. */
export const Blip: React.FC<{
  x: number;
  y: number;
  eclat: number;
  couleur?: string;
  r?: number;
}> = ({ x, y, eclat, couleur = C.lavande, r = 8 }) => {
  if (eclat <= 0.01) return null;
  return (
    <g opacity={Math.min(1, eclat)}>
      <circle cx={x} cy={y} r={r + 14 * eclat} fill={couleur} opacity={0.25 * eclat} />
      <circle cx={x} cy={y} r={r} fill="#fff" style={{ filter: `drop-shadow(0 0 ${14 * eclat}px ${couleur})` }} />
    </g>
  );
};

/** La cloche du rappel, qui s'agite. */
export const Cloche: React.FC<{ x: number; y: number; taille: number; secousse: number; couleur: string }> = ({
  x,
  y,
  taille,
  secousse,
  couleur,
}) => (
  <g transform={`translate(${x} ${y})`}>
    <g style={{ transformOrigin: "center", transformBox: "fill-box" }} transform={`rotate(${secousse})`}>
      <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke={couleur} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
    </g>
  </g>
);
