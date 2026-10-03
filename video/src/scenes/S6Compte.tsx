import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, STATUTS } from "../theme";
import { Onde } from "../ui/Fond";
import { ACCELERE, DOUX, entre, ressort } from "../ui/anim";
import { TEMPS } from "../tempo";
import { POLICE } from "../polices";
import { Titre } from "../ui/Titre";

const CX = 540;
const CY = 930;

/**
 * Mesures 13-14, la relance. Trois anneaux se referment l'un apres l'autre,
 * comme une echeance qui approche : J-7, J-3, J-1, sans un mot. Au dernier,
 * la coche se trace et le calme revient - l'alerte est arrivee a temps.
 */
export const S6Compte: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();

  const anneaux = [
    { r: 330, couleur: STATUTS[1].vif, fin: TEMPS * 2 },
    { r: 250, couleur: STATUTS[2].vif, fin: TEMPS * 4 },
    { r: 170, couleur: STATUTS[3].vif, fin: TEMPS * 6 },
  ];
  const entree = ressort(f, 0, fps, 120, 14);
  const coche = entre(f, TEMPS * 6, TEMPS * 6 + 14, 0, 1);
  const sortie = entre(f, 100, 120, 0, 1, ACCELERE);
  const rotation = f * 0.6;

  return (
    <AbsoluteFill>
      <svg
        width={1080}
        height={1920}
        style={{
          position: "absolute",
          transform: `scale(${(0.6 + 0.4 * entree) * (1 - 0.4 * sortie)}) rotate(${sortie * 90}deg)`,
          transformOrigin: `${CX}px ${CY}px`,
          opacity: 1 - sortie,
        }}
      >
        {/* Les graduations d'un cadran, qui tournent lentement. */}
        {new Array(48).fill(0).map((_, i) => {
          const a = ((i * 7.5 + rotation) * Math.PI) / 180;
          const long = i % 4 === 0 ? 26 : 12;
          return (
            <line
              key={i}
              x1={CX + Math.cos(a) * 400}
              y1={CY + Math.sin(a) * 400}
              x2={CX + Math.cos(a) * (400 + long)}
              y2={CY + Math.sin(a) * (400 + long)}
              stroke={C.lavande}
              strokeWidth={i % 4 === 0 ? 3 : 2}
              opacity={0.35 * entree}
            />
          );
        })}

        {anneaux.map((a, i) => {
          const circonference = 2 * Math.PI * a.r;
          const p = entre(f, a.fin - TEMPS * 2 + 4, a.fin, 0, 1, DOUX);
          return (
            <g key={i}>
              <circle cx={CX} cy={CY} r={a.r} fill="none" stroke={C.piste} strokeWidth={44} />
              <circle
                cx={CX}
                cy={CY}
                r={a.r}
                fill="none"
                stroke={a.couleur}
                strokeWidth={44}
                strokeLinecap="round"
                strokeDasharray={circonference}
                strokeDashoffset={circonference * (1 - p)}
                transform={`rotate(-90 ${CX} ${CY})`}
                style={{ filter: `drop-shadow(0 0 ${18 + 20 * p}px ${a.couleur})` }}
              />
            </g>
          );
        })}

        {/* Le centre se remplit, la coche se trace. */}
        <circle cx={CX} cy={CY} r={112 * coche} fill={C.indigo}
          style={{ filter: `drop-shadow(0 0 40px ${C.indigo})` }} />
        <path
          d={`M ${CX - 46} ${CY + 2} L ${CX - 12} ${CY + 36} L ${CX + 50} ${CY - 34}`}
          fill="none"
          stroke={C.blanc}
          strokeWidth={18}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={200}
          strokeDashoffset={200 * (1 - entre(f, TEMPS * 6 + 6, TEMPS * 6 + 20, 0, 1))}
        />
      </svg>

      <Titre lignes={["Des rappels avant", "*chaque échéance*"]} debut={2} fin={112} y={150} taille={76} />

      {/* Au centre, l'echeance qui approche : J-7, puis J-3, puis J-1. */}
      {["J-7", "J-3", "J-1"].map((j, i) => {
        const a = anneaux[i];
        const debut = a.fin - TEMPS * 2 + 4;
        const fin = a.fin + (i === 2 ? 2 : TEMPS * 2 - 4);
        const p = entre(f, debut, debut + 10, 0, 1);
        const s = entre(f, fin - 6, fin, 0, 1);
        return (
          <div
            key={j}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: CY - 70,
              textAlign: "center",
              fontFamily: POLICE,
              fontWeight: 900,
              fontSize: 120,
              letterSpacing: "-0.03em",
              color: a.couleur,
              textShadow: `0 0 40px ${a.couleur}`,
              opacity: p * (1 - s) * (1 - sortie),
              transform: `scale(${0.7 + 0.3 * p + 0.2 * s})`,
            }}
          >
            {j}
          </div>
        );
      })}

      {/* Chaque anneau qui se ferme envoie une onde. */}
      {anneaux.map((a, i) => (
        <Onde key={i} x={CX} y={CY} debut={a.fin} taille={a.r * 2 + 500} couleur={a.couleur} duree={24} />
      ))}
      {/* L'eclat final, en rayons. */}
      <svg width={1080} height={1920} style={{ position: "absolute", opacity: 1 - sortie }}>
        {new Array(14).fill(0).map((_, i) => {
          const a = (i / 14) * Math.PI * 2;
          const p = entre(f, TEMPS * 6 + 4, TEMPS * 6 + 30, 0, 1);
          const r1 = 150 + p * 260;
          const r2 = r1 + 60 * (1 - p);
          return (
            <line key={i} x1={CX + Math.cos(a) * r1} y1={CY + Math.sin(a) * r1}
              x2={CX + Math.cos(a) * r2} y2={CY + Math.sin(a) * r2}
              stroke={C.eclat} strokeWidth={5} strokeLinecap="round" opacity={p > 0 ? 1 - p : 0} />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
