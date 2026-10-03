import { useCurrentFrame } from "remotion";
import { C } from "../theme";
import { POLICE } from "../polices";
import { ACCELERE, SORTIE, entre } from "./anim";

/**
 * Un titre en typographie animee : chaque mot monte, sort du flou et se
 * pose, l'un apres l'autre. Les mots entre *asterisques* prennent le
 * degrade de la marque. Il sort vers le haut a l'image `fin`.
 *
 * Deux lignes au plus, quatre a six mots : au-dela, on ne lit plus, on
 * dechiffre - et une publicite qu'on dechiffre est une publicite ratee.
 */
export const Titre: React.FC<{
  lignes: string[];
  debut: number;
  fin: number;
  y?: number;
  taille?: number;
  couleur?: string;
}> = ({ lignes, debut, fin, y = 300, taille = 84, couleur = C.texte }) => {
  const f = useCurrentFrame();
  const sortie = entre(f, fin - 10, fin, 0, 1, ACCELERE);
  let rang = 0;
  // L'accent peut couvrir plusieurs mots : "*61 sources*". On suit donc un
  // etat ouvert/ferme d'un mot a l'autre, au lieu de tester chaque mot seul
  // - sinon les asterisques s'affichent tels quels.
  let enAccent = false;
  const decouper = (ligne: string) =>
    ligne.split(" ").map((mot) => {
      let propre = mot;
      if (propre.startsWith("*")) {
        enAccent = true;
        propre = propre.slice(1);
      }
      const accent = enAccent;
      if (propre.endsWith("*")) {
        enAccent = false;
        propre = propre.slice(0, -1);
      }
      return { propre, accent };
    });
  return (
    <div
      style={{
        position: "absolute",
        top: y,
        left: 60,
        right: 60,
        textAlign: "center",
        fontFamily: POLICE,
        fontWeight: 800,
        fontSize: taille,
        lineHeight: 1.08,
        letterSpacing: "-0.02em",
        color: couleur,
        transform: `translateY(${-40 * sortie}px)`,
        opacity: 1 - sortie,
      }}
    >
      {lignes.map((ligne, i) => (
        <div key={i}>
          {decouper(ligne).map(({ propre, accent }, j) => {
            const depart = debut + rang++ * 3;
            const p = entre(f, depart, depart + 14, 0, 1, SORTIE);
            return (
              <span
                key={j}
                style={{
                  display: "inline-block",
                  marginRight: "0.26em",
                  transform: `translateY(${(1 - p) * 46}px)`,
                  opacity: p,
                  filter: `blur(${(1 - p) * 12}px)`,
                  ...(accent
                    ? {
                        background: `linear-gradient(90deg, ${C.lavande}, ${C.bleu})`,
                        WebkitBackgroundClip: "text",
                        backgroundClip: "text",
                        color: "transparent",
                      }
                    : {}),
                }}
              >
                {propre}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/** Une petite etiquette en pilule, au-dessus d'un titre. */
export const Etiquette: React.FC<{ texte: string; debut: number; fin: number; y?: number }> = ({
  texte,
  debut,
  fin,
  y = 220,
}) => {
  const f = useCurrentFrame();
  const p = entre(f, debut, debut + 12, 0, 1);
  const s = entre(f, fin - 10, fin, 0, 1, ACCELERE);
  return (
    <div style={{ position: "absolute", top: y, left: 0, right: 0, textAlign: "center" }}>
      <span
        style={{
          display: "inline-block",
          fontFamily: POLICE,
          fontWeight: 700,
          fontSize: 28,
          letterSpacing: "0.14em",
          color: C.lavande,
          padding: "12px 26px",
          borderRadius: 999,
          border: `1px solid ${C.bordVerre}`,
          background: C.verre,
          opacity: p * (1 - s),
          transform: `translateY(${(1 - p) * 20 - s * 30}px) scale(${0.9 + 0.1 * p})`,
        }}
      >
        {texte}
      </span>
    </div>
  );
};
