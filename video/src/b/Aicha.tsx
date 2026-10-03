import { B } from "./themeB";

/**
 * Aicha, chargee de projets. Un personnage, pas une personne : elle incarne
 * le client type, elle ne temoigne de rien.
 *
 * Dessinee en buste, derriere un bureau : les jambes ne servent a rien dans
 * cette histoire, et un personnage a plat qui marche mal fait amateur. Tout
 * est articule - deux segments par bras, la tete, le regard, les paupieres,
 * la bouche - pour que chaque pose se calcule, et s'anime, image par image.
 *
 * Repere : viewBox 400 x 520, epaules a y = 345.
 */
export type Humeur = "neutre" | "sourire" | "joie" | "triste" | "stress" | "surprise";

export type Pose = {
  /** epaule gauche, coude gauche, epaule droite, coude droit (degres). 0 = bras le long du corps ; l'epaule positive ecarte le bras vers l'exterieur. */
  bras: [number, number, number, number];
  tete: number; // inclinaison (degres)
  baisse: number; // la tete qui tombe (px)
  regardX: number; // -1 a 1
  regardY: number; // -1 a 1
  cligne: number; // 0 ouvert, 1 ferme
  humeur: Humeur;
  sourcils: number; // -1 fronces/tristes, 0, 1 leves
};

export const REPOS: Pose = {
  bras: [14, -100, 14, -100],
  tete: 0,
  baisse: 0,
  regardX: 0,
  regardY: 0,
  cligne: 0,
  humeur: "neutre",
  sourcils: 0,
};

const HAUT = 105; // bras
const AVANT = 92; // avant-bras
const EP_G = { x: 98, y: 350 };
const EP_D = { x: 302, y: 350 };
const rad = (d: number) => (d * Math.PI) / 180;

const bras = (cote: -1 | 1, epaule: number, coude: number) => {
  const o = cote === -1 ? EP_G : EP_D;
  const c = { x: o.x + cote * Math.sin(rad(epaule)) * HAUT, y: o.y + Math.cos(rad(epaule)) * HAUT };
  const m = { x: c.x + cote * Math.sin(rad(epaule + coude)) * AVANT, y: c.y + Math.cos(rad(epaule + coude)) * AVANT };
  return { o, c, m };
};

const Bouche: React.FC<{ humeur: Humeur }> = ({ humeur }) => {
  const trait = { fill: "none", stroke: "#2A0F08", strokeWidth: 5, strokeLinecap: "round" as const };
  switch (humeur) {
    case "sourire":
      return <path d="M 180 250 Q 200 268 220 250" {...trait} />;
    case "joie":
      return (
        <g>
          <path d="M 176 246 Q 200 290 224 246 Z" fill="#5B1A12" />
          <path d="M 182 248 L 218 248 L 214 256 L 186 256 Z" fill="#fff" />
        </g>
      );
    case "triste":
      return <path d="M 184 262 Q 200 248 216 262" {...trait} />;
    case "stress":
      return <path d="M 182 256 q 6 -6 12 0 t 12 0 t 12 0" {...trait} />;
    case "surprise":
      return <ellipse cx={200} cy={256} rx={10} ry={13} fill="#5B1A12" />;
    default:
      return <path d="M 186 254 Q 200 258 214 254" {...trait} />;
  }
};

export const Aicha: React.FC<{
  pose: Pose;
  largeur?: number;
  haut?: string;
  retard?: number;
  /** Ce qu'elle tient, dans le repere du personnage : dessine devant le buste, derriere les mains. */
  tenu?: React.ReactNode;
}> = ({ pose, largeur = 520, haut = B.marque, retard = 0, tenu }) => {
  const g = bras(-1, pose.bras[0], pose.bras[1]);
  const d = bras(1, pose.bras[2], pose.bras[3]);
  const ferme = Math.min(1, Math.max(0, pose.cligne));
  const leve = Math.max(0, pose.sourcils) * 9;
  const triste = Math.max(0, -pose.sourcils) * 9;
  const Bras = ({ b }: { b: ReturnType<typeof bras> }) => (
    <g>
      <path d={`M ${b.o.x} ${b.o.y} L ${b.c.x} ${b.c.y}`} stroke={haut} strokeWidth={46} strokeLinecap="round" />
      <path d={`M ${b.c.x} ${b.c.y} L ${b.m.x} ${b.m.y}`} stroke={B.peau} strokeWidth={34} strokeLinecap="round" />
      <circle cx={b.m.x} cy={b.m.y} r={21} fill={B.peau} />
    </g>
  );
  return (
    <svg width={largeur} height={(largeur * 520) / 400} viewBox="0 0 400 520" style={{ overflow: "visible" }}>
      {/* Le buste. */}
      <path d="M 52 530 L 66 392 Q 78 330 150 318 L 250 318 Q 322 330 334 392 L 348 530 Z" fill={haut} />
      <path d="M 170 318 L 200 356 L 230 318 Z" fill={B.peauOmbre} />
      <rect x={178} y={272} width={44} height={56} rx={16} fill={B.peauOmbre} />

      {/* La tete tourne autour du cou. */}
      <g transform={`translate(0 ${pose.baisse}) rotate(${pose.tete} 200 300)`}>
        <circle cx={130} cy={214} r={15} fill={B.peau} />
        <circle cx={270} cy={214} r={15} fill={B.peau} />
        <ellipse cx={200} cy={206} rx={72} ry={84} fill={B.peau} />
        <circle cx={130} cy={240} r={9} fill={B.soleil} />
        <circle cx={270} cy={240} r={9} fill={B.soleil} />

        {/* Le foulard, et son noeud qui suit la tete avec un temps de retard. */}
        <path d="M 122 200 C 106 118 158 74 206 76 C 262 78 302 118 280 200 C 256 166 150 166 122 200 Z" fill={B.corail} />
        <g transform={`rotate(${-12 + retard * 0.6} 232 96)`}>
          <ellipse cx={236} cy={84} rx={62} ry={40} fill={B.corail} />
          <path d="M 196 84 Q 236 58 278 84" fill="none" stroke={B.soleil} strokeWidth={9} strokeLinecap="round" />
          <path d="M 202 102 Q 238 82 274 104" fill="none" stroke={B.soleil} strokeWidth={6} strokeLinecap="round" opacity={0.7} />
        </g>
        <path d="M 132 170 Q 200 142 272 170" fill="none" stroke={B.soleil} strokeWidth={9} strokeLinecap="round" />

        {/* Le visage. */}
        <circle cx={160} cy={238} r={13} fill={B.corail} opacity={0.3} />
        <circle cx={240} cy={238} r={13} fill={B.corail} opacity={0.3} />
        {/* Les sourcils : leves quand elle est contente, remontes au centre quand elle s'inquiete. */}
        <path d={`M 160 ${194 - leve + triste * 0.3} L 186 ${192 - leve - triste}`} stroke="#1B0C06" strokeWidth={5} strokeLinecap="round" />
        <path d={`M 214 ${192 - leve - triste} L 240 ${194 - leve + triste * 0.3}`} stroke="#1B0C06" strokeWidth={5} strokeLinecap="round" />
        {[176, 224].map((x) => (
          <g key={x}>
            <ellipse cx={x} cy={214} rx={11} ry={13 * (1 - ferme) + 0.5} fill="#fff" />
            <ellipse cx={x + pose.regardX * 4} cy={215 + pose.regardY * 4} rx={6.5} ry={8 * (1 - ferme) + 0.5} fill="#1B0C06" />
          </g>
        ))}
        <path d="M 199 222 q -7 14 3 16" fill="none" stroke={B.peauOmbre} strokeWidth={4} strokeLinecap="round" />
        <Bouche humeur={pose.humeur} />
      </g>

      {tenu}
      <Bras b={g} />
      <Bras b={d} />
    </svg>
  );
};

/** Position d'une main, dans le repere du personnage : pour y poser un objet. */
export const main = (pose: Pose, cote: -1 | 1) =>
  cote === -1 ? bras(-1, pose.bras[0], pose.bras[1]).m : bras(1, pose.bras[2], pose.bras[3]).m;

/** Interpole deux poses. L'humeur bascule a mi-chemin, elle ne s'interpole pas. */
export const melange = (a: Pose, b: Pose, t: number): Pose => {
  const l = (x: number, y: number) => x + (y - x) * t;
  return {
    bras: [l(a.bras[0], b.bras[0]), l(a.bras[1], b.bras[1]), l(a.bras[2], b.bras[2]), l(a.bras[3], b.bras[3])],
    tete: l(a.tete, b.tete),
    baisse: l(a.baisse, b.baisse),
    regardX: l(a.regardX, b.regardX),
    regardY: l(a.regardY, b.regardY),
    cligne: l(a.cligne, b.cligne),
    humeur: t < 0.5 ? a.humeur : b.humeur,
    sourcils: l(a.sourcils, b.sourcils),
  };
};

/**
 * Cinematique inverse : les angles qui posent la main en (x, y), coude vers
 * l'exterieur. On place les mains la ou l'histoire en a besoin - sur le
 * journal, la tasse, le bureau - au lieu de chercher des angles a la main.
 */
export const vise = (cote: -1 | 1, x: number, y: number): [number, number] => {
  const o = cote === -1 ? EP_G : EP_D;
  const dx = cote * (x - o.x);
  const dy = y - o.y;
  const brute = Math.hypot(dx, dy) || 1;
  const d = Math.min(HAUT + AVANT - 1, Math.max(Math.abs(HAUT - AVANT) + 1, brute));
  const a0 = Math.atan2(dx, dy);
  const k = Math.acos((HAUT * HAUT + d * d - AVANT * AVANT) / (2 * HAUT * d));
  const ep = a0 + k;
  const cx = Math.sin(ep) * HAUT;
  const cy = Math.cos(ep) * HAUT;
  const tx = (dx / brute) * d;
  const ty = (dy / brute) * d;
  const total = Math.atan2(tx - cx, ty - cy);
  const deg = (r: number) => (r * 180) / Math.PI;
  return [deg(ep), deg(total - ep)];
};

/** Les quatre angles des bras a partir des deux mains. */
export const mains = (gx: number, gy: number, dx: number, dy: number): Pose["bras"] => [
  ...vise(-1, gx, gy),
  ...vise(1, dx, dy),
] as Pose["bras"];
