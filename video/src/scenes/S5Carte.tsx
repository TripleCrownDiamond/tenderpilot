import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { useMemo } from "react";
import { C } from "../theme";
import { POLICE } from "../polices";
import { DOUX, entre } from "../ui/anim";
import { Titre } from "../ui/Titre";
import { TEMPS } from "../tempo";

// Le contour de l'Afrique, simplifie (longitude, latitude).
export const AFRIQUE: [number, number][] = [
  [-5.9, 35.8], [-2, 35.1], [10, 37.2], [11.1, 33.2], [20, 31], [25, 31.7],
  [32.3, 31.3], [34.2, 27.8], [37.5, 18.6], [43.3, 12.6], [51.2, 11.8],
  [47.5, 4], [40, -3], [39.3, -8], [40.5, -15.8], [35.5, -24], [32.6, -26],
  [27, -33.8], [20, -34.8], [18.4, -34], [17, -29], [15, -26.5], [11.8, -17.3],
  [13.5, -11], [12.2, -6], [9, -1], [9.5, 3.7], [8.5, 4.5], [6, 4.3],
  [2.4, 6.3], [-2, 4.7], [-7.5, 4.4], [-11.5, 6.9], [-13.3, 9.5], [-15, 10.9],
  [-17.2, 14.7], [-16.5, 19.5], [-17, 21], [-13, 27.7], [-9.8, 29.9],
  [-8.6, 33.3], [-6.4, 34.9],
];

// Les huit pays suivis : centre approximatif, nom, drapeau.
export const PAYS: { lon: number; lat: number; nom: string; code: string }[] = [
  { lon: 2.3, lat: 9.5, nom: "Bénin", code: "bj" },
  { lon: 0.9, lat: 8.6, nom: "Togo", code: "tg" },
  { lon: 8.1, lat: 16.5, nom: "Niger", code: "ne" },
  { lon: 12.4, lat: 5.7, nom: "Cameroun", code: "cm" },
  { lon: -1.6, lat: 12.3, nom: "Burkina Faso", code: "bf" },
  { lon: -5.5, lat: 7.5, nom: "Côte d'Ivoire", code: "ci" },
  { lon: -14.5, lat: 14.5, nom: "Sénégal", code: "sn" },
  { lon: -3.5, lat: 17, nom: "Mali", code: "ml" },
];

// Les bailleurs internationaux, au bout des arcs.
const BAILLEURS = [
  { nom: "Union européenne", x: 170, y: 420 },
  { nom: "Banque mondiale", x: 900, y: 470 },
  { nom: "PNUD", x: 930, y: 1250 },
  { nom: "AFD", x: 150, y: 1180 },
];

const ECH = 13;
const px = (lon: number) => 560 + (lon - 17) * ECH;
const py = (lat: number) => 880 - (lat - 1) * ECH;

export const dedans = (x: number, y: number) => {
  let c = false;
  for (let i = 0, j = AFRIQUE.length - 1; i < AFRIQUE.length; j = i++) {
    const [xi, yi] = AFRIQUE[i];
    const [xj, yj] = AFRIQUE[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};

/**
 * Mesures 11-12, la respiration. Le continent se dessine en points depuis le
 * Benin, les huit pays s'allument et se nomment, puis des arcs partent vers
 * les bailleurs internationaux.
 */
export const S5Carte: React.FC = () => {
  const f = useCurrentFrame();
  const origine = { x: px(2.3), y: py(9.5) };

  const points = useMemo(() => {
    const liste: { x: number; y: number; d: number }[] = [];
    for (let y = 380; y < 1400; y += 13) {
      for (let x = 60; x < 1060; x += 13) {
        const lon = (x - 560) / ECH + 17;
        const lat = 1 - (y - 880) / ECH;
        if (dedans(lon, lat)) liste.push({ x, y, d: Math.hypot(x - origine.x, y - origine.y) });
      }
    }
    return liste;
  }, [origine.x, origine.y]);

  const vague = entre(f, 0, 50, 0, 1200, DOUX);

  return (
    <AbsoluteFill>
      <Titre lignes={["*8 pays* suivis", "et l'international"]} debut={4} fin={120} y={150} taille={76} />

      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        {points.map((p, i) => {
          const a = p.d < vague ? Math.min(1, (vague - p.d) / 160) : 0;
          return <circle key={i} cx={p.x} cy={p.y} r={2.3} fill={C.lavande} opacity={0.14 + 0.36 * a} />;
        })}

        {BAILLEURS.map((b, i) => {
          const debut = 56 + i * (TEMPS / 2);
          const p = entre(f, debut, debut + 26, 0, 1, DOUX);
          const mx = (origine.x + b.x) / 2 + (i % 2 ? 140 : -140);
          const my = Math.min(origine.y, b.y) - 220;
          const bx = (1 - p) ** 2 * origine.x + 2 * (1 - p) * p * mx + p * p * b.x;
          const by = (1 - p) ** 2 * origine.y + 2 * (1 - p) * p * my + p * p * b.y;
          return (
            <g key={i} opacity={p > 0 ? 1 : 0}>
              <path d={`M ${origine.x} ${origine.y} Q ${mx} ${my} ${b.x} ${b.y}`} fill="none" stroke={C.bleu}
                strokeWidth={3} strokeDasharray={1800} strokeDashoffset={1800 * (1 - p)} opacity={0.75}
                style={{ filter: `drop-shadow(0 0 8px ${C.bleu})` }} />
              <circle cx={bx} cy={by} r={9} fill={C.eclat} style={{ filter: `drop-shadow(0 0 14px ${C.eclat})` }} />
            </g>
          );
        })}

        {PAYS.map((pays, i) => {
          const debut = 16 + i * (TEMPS / 3);
          const p = entre(f, debut, debut + 12, 0, 1);
          const onde = entre(f, debut, debut + 36, 0, 1);
          const x = px(pays.lon);
          const y = py(pays.lat);
          return (
            <g key={i} opacity={p}>
              <circle cx={x} cy={y} r={60 * onde} fill="none" stroke={C.lavande} strokeWidth={3 * (1 - onde) + 0.5} opacity={1 - onde} />
              <circle cx={x} cy={y} r={i === 0 ? 11 : 8} fill={i === 0 ? C.eclat : C.bleu}
                style={{ filter: `drop-shadow(0 0 ${i === 0 ? 20 : 12}px ${i === 0 ? C.eclat : C.bleu})` }} />
            </g>
          );
        })}
      </svg>

      {/* Le nom des bailleurs, au bout de leur arc. */}
      {BAILLEURS.map((b, i) => {
        const debut = 56 + i * (TEMPS / 2) + 22;
        const p = entre(f, debut, debut + 12, 0, 1);
        return (
          <div
            key={b.nom}
            style={{
              position: "absolute",
              left: Math.min(Math.max(b.x - 150, 30), 750),
              top: b.y + 22,
              width: 300,
              textAlign: "center",
              fontFamily: POLICE,
              fontWeight: 700,
              fontSize: 26,
              color: C.texte,
              opacity: p,
              transform: `translateY(${(1 - p) * 16}px)`,
              textShadow: C.clair ? undefined : `0 0 18px ${C.indigo}`,
            }}
          >
            {b.nom}
          </div>
        );
      })}

      {/* Les huit pays, en pastilles avec leur drapeau. */}
      <div
        style={{
          position: "absolute",
          left: 60,
          right: 60,
          top: 1430,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 14,
          fontFamily: POLICE,
        }}
      >
        {PAYS.map((pays, i) => {
          const debut = 16 + i * (TEMPS / 3);
          const p = entre(f, debut, debut + 12, 0, 1);
          return (
            <div
              key={pays.code}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 20px 12px 14px",
                borderRadius: 999,
                background: C.clair ? "#FFFFFF" : i === 0 ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.07)",
                boxShadow: C.clair ? `0 8px 20px ${C.ombre}` : undefined,
                border: `1px solid ${C.bordVerre}`,
                opacity: p,
                transform: `translateY(${(1 - p) * 24}px) scale(${0.9 + 0.1 * p})`,
              }}
            >
              <Img src={staticFile(`drapeaux/${pays.code}.svg`)} style={{ width: 38, height: 26, borderRadius: 4, objectFit: "cover" }} />
              <span style={{ fontSize: 27, fontWeight: 700, color: C.texte }}>{pays.nom}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
