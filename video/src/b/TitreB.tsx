import { useCurrentFrame } from "remotion";
import { ACCELERE, SORTIE, entre } from "../ui/anim";
import { AFFICHE, B } from "./themeB";

/**
 * Le titre du film B : aligne a gauche, chaque ligne monte depuis un masque,
 * et le mot _souligne_ se fait passer un coup de surligneur jaune. C'est le
 * geste d'Aicha qui trie ses avis - et c'est le contraire du film A, centre,
 * mot par mot, flou.
 */
export const TitreB: React.FC<{
  lignes: string[];
  debut: number;
  fin: number;
  y?: number;
  taille?: number;
  couleur?: string;
  surligne?: string;
}> = ({ lignes, debut, fin, y = 170, taille = 108, couleur = B.encre, surligne = B.soleil }) => {
  const f = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        top: y,
        left: 76,
        right: 60,
        fontFamily: AFFICHE,
        fontWeight: 800,
        fontSize: taille,
        lineHeight: 1.02,
        letterSpacing: "-0.035em",
        color: couleur,
        fontVariationSettings: "'wdth' 88, 'opsz' 96",
      }}
    >
      {lignes.map((ligne, i) => {
        const entree = entre(f, debut + i * 5, debut + i * 5 + 16, 1, 0, SORTIE);
        const sortie = entre(f, fin - 12 + i * 2, fin - 2 + i * 2, 0, 1, ACCELERE);
        const morceaux = ligne.split(/(_[^_]+_)/).filter(Boolean);
        return (
          <div key={i} style={{ overflow: "hidden", paddingBottom: taille * 0.08, marginBottom: -taille * 0.08 }}>
            <div style={{ transform: `translateY(${(entree + sortie) * 110}%)` }}>
              {morceaux.map((m, j) => {
                if (!m.startsWith("_")) return <span key={j}>{m}</span>;
                const trait = entre(f, debut + i * 5 + 14, debut + i * 5 + 28, 0, 100, SORTIE);
                return (
                  <span
                    key={j}
                    style={{
                      backgroundImage: `linear-gradient(${surligne}, ${surligne})`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "0 88%",
                      backgroundSize: `${trait}% 38%`,
                      padding: "0 0.06em",
                      margin: "0 -0.06em",
                    }}
                  >
                    {m.slice(1, -1)}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
