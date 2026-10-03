import { AbsoluteFill, random, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "../theme";
import { POLICE } from "../polices";
import { Onde } from "../ui/Fond";
import { ACCELERE, entre, ressort } from "../ui/anim";
import { Titre } from "../ui/Titre";
import { TEMPS } from "../tempo";

// De vraies sources du registre TenderPilot : c'est ce qui fait comprendre
// le probleme - elles sont nombreuses, et chacune a son propre site.
const NOMS = [
  "Banque mondiale", "PNUD", "AFD", "Marchés publics Bénin", "ARMP Cameroun",
  "DNCCP Togo", "Niger Marchés", "Enabel", "GIZ", "UNICEF",
  "Commission européenne", "BCEAO", "Expertise France", "Plan International",
  "CORAF", "AGRA", "Wellcome", "SBEE", "SONEB", "Grants.gov",
  "Fondation Gates", "TED", "PNUD Sénégal", "Banque mondiale Togo",
  "ARAA CEDEAO", "PNUD Mali", "JobRelais", "PNUD Niger",
];
const N = NOMS.length;
const CENTRE = { x: 540, y: 1150 };
const TEINTES = ["#34D399", "#FBBF24", "#FB923C", "#F87171", C.lavande, C.bleu];

const Fiche: React.FC<{ l: number; nom: string; teinte: string }> = ({ l, nom, teinte }) => (
  <div
    style={{
      width: l,
      borderRadius: 18,
      background: C.carte,
      border: `1px solid ${C.bordVerre}`,
      boxShadow: `0 20px 50px ${C.ombre}`,
      padding: "16px 18px",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      gap: 10,
      fontFamily: POLICE,
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 14, height: 14, borderRadius: 7, background: teinte, boxShadow: `0 0 12px ${teinte}`, flexShrink: 0 }} />
      <div style={{ fontSize: 24, fontWeight: 700, color: C.texte, whiteSpace: "nowrap" }}>{nom}</div>
    </div>
    {[0.82, 0.55].map((w, k) => (
      <div key={k} style={{ width: `${w * 100}%`, height: 8, borderRadius: 4, background: C.trait, opacity: 1 - k * 0.3 }} />
    ))}
  </div>
);

/**
 * Mesures 3-4. Le drop : les sources eclatent dans l'espace, chacune avec
 * son nom, flottent en desordre, puis sont aspirees en tourbillon vers un
 * point unique - la ou naitra le tableau.
 */
export const S2Sources: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const aspiration = entre(f, 62, 112, 0, 1, ACCELERE);

  const fiches = NOMS.map((nom, i) => ({
    i,
    nom,
    angle0: random(`a${i}`) * Math.PI * 2,
    rayon0: 200 + random(`r${i}`) * 420,
    prof: 0.55 + random(`z${i}`) * 0.65,
    l: Math.max(230, nom.length * 15 + 80),
    teinte: TEINTES[i % TEINTES.length],
    rot0: (random(`t${i}`) - 0.5) * 36,
    arrivee: Math.floor(i / 2) * (TEMPS / 4),
  }));

  const rendre = (retard: number, trainee: number) =>
    fiches.map((c) => {
      const t = Math.max(0, aspiration - retard);
      const pop = ressort(f, c.arrivee, fps, 170, 12);
      const flotte = Math.sin((f + c.i * 13) / 24) * 18;
      const angle = c.angle0 + f * 0.004 + t * t * 7;
      const rayon = c.rayon0 * (1 - t) * (0.6 + 0.4 * pop);
      const x = CENTRE.x + Math.cos(angle) * rayon * 1.1;
      const y = CENTRE.y + Math.sin(angle) * rayon * 1.05 + flotte * (1 - t);
      return (
        <div
          key={`${c.i}-${retard}`}
          style={{
            position: "absolute",
            left: x - c.l / 2,
            top: y - 55,
            transform: `scale(${c.prof * pop * (1 - 0.85 * t)}) rotate(${c.rot0 * (1 - t) + t * 220}deg)`,
            opacity: pop * trainee * (1 - entre(aspiration, 0.85, 1, 0, 1)),
            filter: `blur(${(1.2 - c.prof) * 5 + t * 10}px)`,
            zIndex: Math.round(c.prof * 100),
          }}
        >
          <Fiche l={c.l} nom={c.nom} teinte={c.teinte} />
        </div>
      );
    });

  const coeur = entre(f, 100, 116, 0, 1);
  return (
    <AbsoluteFill>
      {aspiration > 0.05 && rendre(0.08, 0.16)}
      {aspiration > 0.05 && rendre(0.04, 0.28)}
      {rendre(0, 1)}
      <div style={{ position: "absolute", inset: 0, zIndex: 200 }}>
        <Titre lignes={["Les appels d'offres", "sont *partout*"]} debut={2} fin={58} y={200} />
        <Titre lignes={["*61 sources* officielles", "lues pour vous"]} debut={62} fin={116} y={200} />
      </div>
      <Onde x={540} y={1150} debut={0} taille={1500} couleur={C.bleu} duree={30} />
      <Onde x={540} y={1150} debut={104} taille={1100} couleur={C.eclat} duree={24} />
      <div
        style={{
          position: "absolute",
          left: 540 - 260,
          top: 1150 - 260,
          width: 520,
          height: 520,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${C.eclat} 0%, ${C.bleu} 22%, transparent 65%)`,
          opacity: coeur,
          transform: `scale(${0.3 + coeur * 1.4})`,
          filter: "blur(6px)",
          zIndex: 150,
        }}
      />
    </AbsoluteFill>
  );
};
