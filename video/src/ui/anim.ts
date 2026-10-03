import { Easing, interpolate, spring } from "remotion";

// Les courbes du film. Trois, pas davantage : un motion design se reconnait
// a la coherence de ses mouvements, pas a leur variete.
export const SORTIE = Easing.bezier(0.16, 1, 0.3, 1); // arrive vite, se pose
export const DOUX = Easing.bezier(0.65, 0, 0.35, 1); // aller-retour pose
export const ACCELERE = Easing.in(Easing.exp); // part en trombe

/** interpolate() borne des deux cotes, avec une courbe. */
export const entre = (
  f: number,
  de: number,
  a: number,
  v0: number,
  v1: number,
  courbe = SORTIE,
) =>
  interpolate(f, [de, a], [v0, v1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: courbe,
  });

/** Un ressort qui demarre a l'image `debut`. */
export const ressort = (
  f: number,
  debut: number,
  fps: number,
  raideur = 140,
  amorti = 13,
) =>
  spring({
    frame: f - debut,
    fps,
    config: { stiffness: raideur, damping: amorti, mass: 0.9 },
  });
