/**
 * Koffi, consultant. Un personnage, pas une personne : il incarne le client
 * type, il ne temoigne de rien.
 *
 * Vu de profil, en pied, tourne vers la droite : c'est un film ou l'on
 * MARCHE, et un personnage de profil est le seul dont le cycle de marche se
 * lit sans ambiguite. Tout le squelette est calcule (pas de dessin par pose) :
 * les pieds touchent toujours le sol, quelle que soit la posture, parce que
 * la hanche est placee APRES les jambes, a la hauteur qui pose le pied le plus
 * bas sur la ligne.
 *
 * Repere : l'origine est au sol, sous la hanche ; y negatif vers le haut.
 */

export const ENCRE = "#1B1B2F";
export const BLEU = "#2F4FD8";
export const ORANGE = "#FF6A2B";
export const PAPIER = "#EEEAE0";
const PEAU = "#7A4A30";
const PANTALON = "#1F2B5E";
const MANCHE_AR = "#22399E";

export type Humeur = "neutre" | "sourire" | "joie" | "triste" | "surprise" | "effort";

export type PoseK = {
  phase: number; // phase de marche (radians) : un pas = pi
  amp: number; // amplitude des cuisses (degres) : 0 immobile, 15 marche, 34 course
  assis: number; // 0 debout, 1 assis
  brasAv?: [number, number]; // epaule, coude du bras avant (degres ; 0 = le long du corps, + vers l'avant)
  brasAr?: [number, number];
  tete: number; // inclinaison de la tete (+ vers le bas)
  penche: number; // inclinaison du buste (+ vers l'avant)
  saut: number; // hauteur du saut (px)
  humeur: Humeur;
  cligne: number;
};

export const DEBOUT: PoseK = { phase: 0, amp: 0, assis: 0, tete: 0, penche: 0, saut: 0, humeur: "neutre", cligne: 0 };

const CUISSE = 135;
const TIBIA = 130;
const HAUT_BRAS = 108;
const AVANT_BRAS = 98;
const rad = (d: number) => (d * Math.PI) / 180;
const dir = (d: number) => ({ x: Math.sin(rad(d)), y: Math.cos(rad(d)) });
type Pt = { x: number; y: number };
const plus = (a: Pt, b: Pt, k = 1): Pt => ({ x: a.x + b.x * k, y: a.y + b.y * k });
const tourne = (p: Pt, d: number): Pt => {
  // Rotation dans le sens "penche vers l'avant" : le haut du buste part vers +x.
  const c = Math.cos(rad(d));
  const s = Math.sin(rad(d));
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
};

/** Le squelette complet, en coordonnees locales. */
export const squelette = (p: PoseK) => {
  const jambe = (ph: number) => {
    const marche = p.amp * Math.sin(ph);
    const plie = 6 + 46 * Math.max(0, Math.cos(ph)) * Math.min(1, p.amp / 18);
    const cuisse = marche * (1 - p.assis) + 90 * p.assis;
    const genou = plie * (1 - p.assis) + 90 * p.assis;
    const g = { x: Math.sin(rad(cuisse)) * CUISSE, y: Math.cos(rad(cuisse)) * CUISSE };
    const c = plus(g, dir(cuisse - genou), TIBIA);
    return { genou: g, cheville: c };
  };
  const av = jambe(p.phase);
  const ar = jambe(p.phase + Math.PI);
  // La hanche se place pour que le pied le plus bas touche le sol (le pied
  // fait 16 px d'epaisseur).
  const bas = Math.max(av.cheville.y, ar.cheville.y);
  const hanche: Pt = { x: 0, y: -bas - 16 - p.saut };
  const abs = (q: Pt) => plus(hanche, q);
  const cou = plus(hanche, tourne({ x: 8, y: -205 }, p.penche));
  const epaule = plus(hanche, tourne({ x: 6, y: -182 }, p.penche));
  const bras = (reglage: [number, number] | undefined, signe: number) => {
    const [e, c] = reglage ?? [signe * p.amp * 1.15 * Math.sin(p.phase), 18 + Math.abs(p.amp * 0.8 * Math.sin(p.phase))];
    const coude = plus(epaule, dir(e + p.penche), HAUT_BRAS);
    const main = plus(coude, dir(e + c + p.penche), AVANT_BRAS);
    return { coude, main };
  };
  return {
    hanche,
    av: { genou: abs(av.genou), cheville: abs(av.cheville) },
    ar: { genou: abs(ar.genou), cheville: abs(ar.cheville) },
    cou,
    epaule,
    bAv: bras(p.brasAv, -1),
    bAr: bras(p.brasAr, 1),
  };
};

const Bouche: React.FC<{ h: Humeur }> = ({ h }) => {
  const t = { fill: "none", stroke: ENCRE, strokeWidth: 5, strokeLinecap: "round" as const };
  if (h === "sourire") return <path d="M 40 -36 Q 50 -28 60 -34" {...t} />;
  if (h === "joie") return <path d="M 38 -38 Q 50 -18 62 -36 Z" fill={ENCRE} />;
  if (h === "triste") return <path d="M 40 -28 Q 50 -36 60 -30" {...t} />;
  if (h === "surprise") return <ellipse cx={52} cy={-32} rx={7} ry={9} fill={ENCRE} />;
  if (h === "effort") return <path d="M 40 -32 L 60 -32" {...t} strokeWidth={6} />;
  return <path d="M 42 -33 Q 50 -30 58 -33" {...t} />;
};

export const Koffi: React.FC<{ pose: PoseK; id: string; avant?: React.ReactNode }> = ({ pose: p, id, avant }) => {
  const s = squelette(p);
  const trame = `trame-${id}`;
  const jambe = (j: { genou: Pt; cheville: Pt }, couleur: string) => (
    <g>
      <path d={`M ${s.hanche.x} ${s.hanche.y} L ${j.genou.x} ${j.genou.y} L ${j.cheville.x} ${j.cheville.y}`} fill="none" stroke={couleur} strokeWidth={46} strokeLinecap="round" strokeLinejoin="round" />
      {/* La chaussure : a plat, la pointe vers l'avant. */}
      <path d={`M ${j.cheville.x - 22} ${j.cheville.y - 4} L ${j.cheville.x + 44} ${j.cheville.y - 4} Q ${j.cheville.x + 62} ${j.cheville.y + 2} ${j.cheville.x + 56} ${j.cheville.y + 14} L ${j.cheville.x - 24} ${j.cheville.y + 14} Z`} fill={ENCRE} />
    </g>
  );
  const bras = (b: { coude: Pt; main: Pt }, manche: string) => (
    <g>
      <path d={`M ${s.epaule.x} ${s.epaule.y} L ${b.coude.x} ${b.coude.y}`} stroke={manche} strokeWidth={40} strokeLinecap="round" />
      <path d={`M ${b.coude.x} ${b.coude.y} L ${b.main.x} ${b.main.y}`} stroke={PEAU} strokeWidth={30} strokeLinecap="round" />
      <circle cx={b.main.x} cy={b.main.y} r={18} fill={PEAU} />
    </g>
  );
  // Le buste et la tete, dessines dans le repere du buste.
  const angleTete = p.penche + p.tete;
  return (
    <svg width={520} height={760} viewBox="-230 -720 520 760" style={{ overflow: "visible" }}>
      <defs>
        <pattern id={trame} width={9} height={9} patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
          <circle cx={4.5} cy={4.5} r={2.1} fill={ENCRE} opacity={0.55} />
        </pattern>
      </defs>
      {bras(s.bAr, MANCHE_AR)}
      {jambe(s.ar, "#16204A")}
      {jambe(s.av, PANTALON)}

      <g transform={`translate(${s.hanche.x} ${s.hanche.y}) rotate(${p.penche})`}>
        {/* La chemise, et son ombre tramee sur le dos. */}
        <path d="M -48 10 L -50 -150 Q -48 -206 4 -210 Q 50 -206 52 -150 L 50 10 Z" fill={BLEU} />
        <path d="M -48 10 L -50 -150 Q -48 -206 4 -210 L -6 -210 Q -30 -150 -22 10 Z" fill={`url(#${trame})`} />
        {/* La cravate, et la sacoche en bandouliere. */}
        <path d="M 38 -196 L 50 -186 L 46 -96 L 36 -84 L 30 -96 L 32 -186 Z" fill={ORANGE} />
        <path d="M -44 -200 L 50 -20" stroke={ENCRE} strokeWidth={9} />
        <rect x={-6} y={-48} width={86} height={64} rx={10} fill={ORANGE} />
        <rect x={-6} y={-48} width={86} height={22} rx={8} fill="#E2541A" />
        <rect x={-50} y={0} width={102} height={14} fill={ENCRE} />
      </g>

      <g transform={`translate(${s.cou.x} ${s.cou.y}) rotate(${angleTete})`}>
        <rect x={-6} y={-30} width={30} height={40} rx={10} fill={PEAU} />
        <circle cx={10} cy={-66} r={58} fill={PEAU} />
        {/* La barbe courte, en trame. */}
        <path d="M -30 -44 Q -10 6 50 -14 Q 64 -22 64 -40 Q 40 -24 10 -30 Q -16 -34 -30 -44 Z" fill={`url(#${trame})`} />
        {/* Les cheveux ras. */}
        <path d="M -48 -60 Q -52 -126 12 -126 Q 66 -124 66 -84 Q 40 -100 10 -92 Q -14 -84 -22 -56 Z" fill={ENCRE} />
        <circle cx={-6} cy={-60} r={12} fill="#5E3722" />
        {/* Les lunettes du consultant. */}
        <path d="M 6 -70 L 28 -70" stroke={ENCRE} strokeWidth={4} />
        <circle cx={42} cy={-68} r={15} fill="#fff" fillOpacity={0.25} stroke={ENCRE} strokeWidth={5} />
        <ellipse cx={45} cy={-68} rx={5} ry={6 * (1 - p.cligne) + 0.6} fill={ENCRE} />
        <path d={`M 30 ${-92 - (p.humeur === "surprise" || p.humeur === "joie" ? 6 : 0)} L 56 ${-90 - (p.humeur === "triste" ? -4 : 0) - (p.humeur === "surprise" || p.humeur === "joie" ? 6 : 0)}`} stroke={ENCRE} strokeWidth={5} strokeLinecap="round" />
        <path d="M 62 -62 Q 74 -48 62 -44" fill={PEAU} stroke="#5E3722" strokeWidth={3} />
        <Bouche h={p.humeur} />
      </g>

      {avant}
      {bras(s.bAv, BLEU)}
    </svg>
  );
};

/** La main avant, dans le repere de l'image (pour y poser un objet). */
export const mainAvant = (p: PoseK) => squelette(p).bAv.main;
