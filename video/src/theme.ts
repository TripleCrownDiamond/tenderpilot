// La charte, reprise du site (site/commun.php) et du classeur (schema).
//
// Deux versions : SOMBRE (la nuit indigo d'origine du film A) et CLAIRE (le
// blanc du site, que le film A utilise depuis le 2026-10-03). `C` est un objet
// unique que chaque film regle au debut de son rendu avec utiliserTheme() : une
// composition est toujours rendue seule, il n'y a donc jamais deux versions a
// la fois. SOMBRE reste la valeur par defaut.
//
// Les jetons disent un ROLE, pas une couleur : `texte` est le texte courant,
// `blanc` reste du blanc (le texte d'un bouton indigo, une coche), `eclat` est
// la lumiere d'une onde ou d'une particule - blanche la nuit, indigo le jour.
const SOMBRE = {
  clair: false,
  nuit: "#060A18",
  navy: "#0B1225",
  indigo: "#4F46FF",
  bleu: "#5B8CFF",
  lavande: "#A5B4FC",
  blanc: "#FFFFFF",
  texte: "#FFFFFF",
  texteDoux: "rgba(255,255,255,0.75)",
  eclat: "#FFFFFF",
  verre: "rgba(255,255,255,0.07)",
  bordVerre: "rgba(255,255,255,0.14)",
  carte: "linear-gradient(145deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))",
  trait: "rgba(255,255,255,0.26)",
  ombre: "rgba(0,0,0,0.45)",
  piste: "rgba(255,255,255,0.08)",
  grille: "rgba(165,180,252,0.22)",
  vignette: "rgba(0,0,0,0.55)",
  halos: 1,
};

const CLAIRE: typeof SOMBRE = {
  clair: true,
  nuit: "#F6F7FA", // --light-gray du site
  navy: "#0B1225",
  indigo: "#4F46FF",
  bleu: "#5B8CFF",
  lavande: "#6366F1", // lisible sur blanc
  blanc: "#FFFFFF",
  texte: "#0B1225", // --navy
  texteDoux: "#6B7280",
  eclat: "#4F46FF",
  verre: "#FFFFFF",
  bordVerre: "rgba(11,18,37,0.08)",
  carte: "#FFFFFF",
  trait: "rgba(11,18,37,0.14)",
  ombre: "rgba(79,70,255,0.16)",
  piste: "rgba(11,18,37,0.06)",
  grille: "rgba(79,70,255,0.12)",
  vignette: "rgba(79,70,255,0.05)",
  halos: 0.32,
};

export const C = { ...SOMBRE };
export const utiliserTheme = (mode: "sombre" | "clair") => Object.assign(C, mode === "clair" ? CLAIRE : SOMBRE);

// Les statuts du classeur : fond pastel, encre foncee de la meme teinte.
export const STATUTS = [
  { fond: "#D8F3DC", encre: "#1B5E2B", vif: "#34D399" },
  { fond: "#FFF3BF", encre: "#7A5A00", vif: "#FBBF24" },
  { fond: "#FFE0C2", encre: "#8A3E00", vif: "#FB923C" },
  { fond: "#FFD6D6", encre: "#9B1C1C", vif: "#F87171" },
] as const;
