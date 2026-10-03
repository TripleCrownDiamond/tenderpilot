import { AbsoluteFill, Audio, Img, random, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { chargerPolices } from "../polices";
import { ACCELERE, DOUX, SORTIE, entre, ressort } from "../ui/anim";
import { BLEU, DEBOUT, ENCRE, Koffi, ORANGE, PAPIER, PoseK, mainAvant } from "./Koffi";
import { DUREE, SCENES as S, TEMPS } from "./tempoD";

chargerPolices();

/**
 * FILM D - « Koffi ». Le film est IMPRIME : papier journal, deux encres de
 * risographie (bleu, orange), trame de points, et une animation « en deux »
 * (15 images par seconde) comme un dessin anime fait main. Le probleme de
 * depart, ce sont les journaux : le film en a la matiere.
 *
 * Un seul decor, une rue qui defile. La camera suit Koffi, et sa vitesse est
 * ecrite une fois (VITESSES) : le decor, la longueur des pas et la position
 * des batiments en decoulent. Un pas par temps : la contrebasse marche avec
 * lui.
 */

const TITRE = "AntonTP, Anton, Impact, sans-serif";
const MACHINE = "PlexTP, 'IBM Plex Mono', monospace";
const SOL = 1560;
const KX = 400; // Koffi, a l'ecran
const trame = (couleur: string, pas = 10, taille = 36) => ({
  backgroundImage: `radial-gradient(${couleur} ${taille}%, transparent ${taille + 3}%)`,
  backgroundSize: `${pas}px ${pas}px`,
});

// ------------------------------------------------------- LE MOUVEMENT

// [image, vitesse en px/image] : la vitesse tient jusqu'a la cle suivante.
const VITESSES: [number, number][] = [
  [0, 0], [106, 9], [240, 6], [300, 0], [312, 20], [364, 10], [368, 0],
  [420, -22], [450, 0], [720, 9], [793, 0],
];
const vitesse = (f: number) => {
  let v = 0;
  for (const [d, x] of VITESSES) if (f >= d) v = x;
  return v;
};
const CAM: number[] = [0];
const PHASE: number[] = [0];
for (let f = 0; f < DUREE + 2; f++) {
  const v = vitesse(f);
  CAM.push(CAM[f] + v);
  PHASE.push(PHASE[f] + (Math.abs(v) > 0.5 ? (Math.sign(v) * Math.PI) / TEMPS : 0));
}
const cam = (f: number) => CAM[Math.max(0, Math.min(CAM.length - 1, f))];
// L'amplitude du pas suit la vitesse, lissee : il ne glisse pas, et il
// ralentit avant de s'arreter.
const amp = (f: number) => {
  let s = 0;
  for (let k = -6; k <= 6; k++) s += Math.abs(vitesse(f + k));
  const v = s / 13;
  return (Math.asin(Math.min(0.62, (v * TEMPS) / 530)) * 180) / Math.PI;
};

// Les lieux, poses la ou Koffi passe aux bons moments.
const KIOSQUES = [
  { f: 140, nom: "DNCMP" },
  { f: 165, nom: "PNUD" },
  { f: 190, nom: "ARMP" },
  { f: 215, nom: "BAD" },
  { f: 250, nom: "UE · TED" },
  { f: 280, nom: "B. MONDIALE" },
].map((k) => ({ ...k, x: cam(k.f) + KX + 70 }));
const HORLOGE_X = cam(205) + KX + 560;
const PANNEAU_X = cam(300) + KX + 170;
const DEPOT_X = cam(368) + KX + 300;
const BANC_X = cam(450) + KX - 20;

// ------------------------------------------------------- LES POSES

const cligne = (f: number) => ([30, 150, 262, 396, 470, 600, 690, 760, 900].some((c) => Math.abs(f - c) < 3) ? 1 : 0);

const poseK = (f: number): { pose: PoseK; tient: "rien" | "pile" | "avis" | "tel" | "dossier" } => {
  const base: PoseK = { ...DEBOUT, phase: PHASE[f], amp: amp(f), cligne: cligne(f) };
  if (f < 100) {
    // Il regarde sa montre, sourit, et part.
    const montre = entre(f, 20, 34, 0, 1) * (1 - entre(f, 84, 98, 0, 1));
    return { pose: { ...base, humeur: "sourire", brasAv: [10 + 60 * montre, 20 + 85 * montre], tete: 8 * montre }, tient: "rien" };
  }
  if (f < S.tard) {
    const fatigue = entre(f, 230, 262, 0, 1);
    return {
      pose: { ...base, brasAv: [52, 58], brasAr: [38, 64], penche: 4 + 10 * fatigue, tete: 10 * fatigue, humeur: fatigue > 0.5 ? "triste" : "neutre" },
      tient: "pile",
    };
  }
  if (f < 312) {
    const prend = entre(f, 300, 308, 0, 1);
    return { pose: { ...base, brasAv: [52 + 70 * prend, 58 - 40 * prend], brasAr: [38, 64], humeur: "surprise", penche: 4 }, tient: f >= 306 ? "avis" : "pile" };
  }
  if (f < 372) {
    return { pose: { ...base, brasAv: [150, 8], penche: 15, humeur: "effort" }, tient: "avis" };
  }
  if (f < S.rembobine) {
    const choc = entre(f, 372, 380, 0, 1);
    return { pose: { ...base, brasAv: [150 - 120 * choc, 8 + 30 * choc], penche: 15 - 22 * choc + 7 * entre(f, 384, 400, 0, 1), tete: 12 * entre(f, 388, 404, 0, 1), humeur: f < 386 ? "surprise" : "triste" }, tient: f < 384 ? "avis" : "rien" };
  }
  if (f < S.veille) {
    // Il recule avec la bande, puis attrape l'avion et le regarde devenir un telephone.
    const attrape = entre(f, 470, 482, 0, 1, SORTIE);
    const baisse = entre(f, 494, 508, 0, 1);
    return {
      pose: { ...base, brasAv: f < 470 ? undefined : [130 - 95 * baisse, 20 + 75 * baisse], humeur: f < 476 ? "surprise" : "sourire", tete: -10 * attrape * (1 - baisse) },
      tient: f >= 494 ? "tel" : "rien",
    };
  }
  if (f < S.depot) {
    const assis = entre(f, S.veille, S.veille + 16, 0, 1, DOUX);
    return { pose: { ...base, assis, brasAv: [34, 98], brasAr: [24, 50], tete: 8, humeur: "sourire" }, tient: "tel" };
  }
  const leve = 1 - entre(f, S.depot, S.depot + 12, 0, 1, DOUX);
  if (f < 796) return { pose: { ...base, assis: leve, brasAv: [22, 70], humeur: "sourire" }, tient: "dossier" };
  if (f < 812) {
    const glisse = entre(f, 796, 806, 0, 1);
    return { pose: { ...base, brasAv: [22 + 60 * glisse, 70 - 60 * glisse], humeur: "sourire" }, tient: f < 806 ? "dossier" : "rien" };
  }
  const t = f - 812;
  return {
    pose: { ...base, brasAv: [168, 4], brasAr: [160, 6], humeur: "joie", saut: 42 * Math.abs(Math.sin((Math.PI * t) / TEMPS)) * (1 - entre(f, 860, 880, 0, 1)) },
    tient: "rien",
  };
};

// ------------------------------------------------------- LE DECOR

const IMMEUBLES = Array.from({ length: 40 }, (_, i) => ({
  x: -1600 + i * 190 + random(`ix${i}`) * 60,
  l: 130 + random(`il${i}`) * 110,
  h: 300 + random(`ih${i}`) * 420,
  orange: random(`io${i}`) < 0.3,
}));

const Kiosque: React.FC<{ nom: string }> = ({ nom }) => (
  <div style={{ position: "relative", width: 280, height: 430 }}>
    <div style={{ position: "absolute", left: 20, top: 0, width: 240, height: 70, background: PAPIER, border: `5px solid ${ENCRE}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: TITRE, fontSize: 40, color: BLEU, letterSpacing: "0.02em" }}>
      {nom}
    </div>
    <div style={{ position: "absolute", left: 0, top: 84, width: 280, height: 64, backgroundImage: `repeating-linear-gradient(90deg, ${ORANGE} 0 35px, ${PAPIER} 35px 70px)`, borderRadius: "0 0 30px 30px", mixBlendMode: "multiply" }} />
    <div style={{ position: "absolute", left: 22, top: 148, width: 10, height: 282, background: ENCRE }} />
    <div style={{ position: "absolute", right: 22, top: 148, width: 10, height: 282, background: ENCRE }} />
    <div style={{ position: "absolute", left: 10, bottom: 0, width: 260, height: 160, background: BLEU, mixBlendMode: "multiply" }}>
      {[0, 1, 2].map((k) => (
        <div key={k} style={{ position: "absolute", left: 20 + k * 78, top: -40, width: 64, height: 46, background: "#fff", border: `3px solid ${ENCRE}`, transform: `rotate(${(k - 1) * 6}deg)` }}>
          <div style={{ margin: 6, height: 6, background: ENCRE }} />
          <div style={{ margin: "0 6px", height: 4, background: "#AAA" }} />
        </div>
      ))}
    </div>
  </div>
);

const Monde: React.FC<{ f: number }> = ({ f }) => {
  const c = cam(f);
  const x = (monde: number, parallaxe = 1) => monde - c * parallaxe;
  const rideau =
    f < 356 ? 0 : f < S.rembobine + 30 ? entre(f, 356, 364, 0, 1, ACCELERE) : 1 - entre(f, S.rembobine + 6, S.rembobine + 26, 0, 1);
  const ouvert = f >= S.rembobine + 26;
  const prisAvis = f >= 306 && f < S.rembobine + 20;
  return (
    <>
      {/* Le soleil, en trame orange : il ne bouge presque pas. */}
      <div style={{ position: "absolute", left: x(780, 0.05), top: 380, width: 340, height: 340, borderRadius: "50%", ...trame(ORANGE, 12, 40), mixBlendMode: "multiply" }} />

      {/* Au loin, la ville : des piles de journaux devenues immeubles. */}
      {IMMEUBLES.map((b, i) => {
        const sx = x(b.x, 0.35);
        if (sx < -300 || sx > 1300) return null;
        return (
          <div key={i} style={{ position: "absolute", left: sx, top: SOL - b.h, width: b.l, height: b.h, ...trame(b.orange ? ORANGE : BLEU, 9, 34), mixBlendMode: "multiply", opacity: 0.8 }}>
            {Array.from({ length: Math.floor(b.h / 60) }, (_, k) => (
              <div key={k} style={{ position: "absolute", left: 0, right: 0, top: 30 + k * 60, height: 6, background: PAPIER }} />
            ))}
          </div>
        );
      })}

      {/* Les reverberes. */}
      {Array.from({ length: 14 }, (_, i) => {
        const sx = x(-900 + i * 820);
        if (sx < -100 || sx > 1180) return null;
        return (
          <div key={i} style={{ position: "absolute", left: sx, top: SOL - 560 }}>
            <div style={{ width: 12, height: 560, background: ENCRE }} />
            <div style={{ position: "absolute", left: -6, top: -6, width: 90, height: 12, background: ENCRE }} />
            <div style={{ position: "absolute", left: 60, top: 4, width: 44, height: 30, background: ORANGE, borderRadius: "0 0 22px 22px", mixBlendMode: "multiply" }} />
          </div>
        );
      })}

      {/* L'horloge de la place : les heures filent. */}
      <div style={{ position: "absolute", left: x(HORLOGE_X) - 110, top: SOL - 1000, width: 220, height: 1000 }}>
        <div style={{ position: "absolute", left: 20, top: 120, width: 180, height: 880, ...trame(BLEU, 10, 38), mixBlendMode: "multiply" }} />
        <div style={{ position: "absolute", left: 0, top: 40, width: 0, height: 0, borderLeft: "110px solid transparent", borderRight: "110px solid transparent", borderBottom: `90px solid ${ENCRE}` }} />
        <div style={{ position: "absolute", left: 20, top: 130, width: 180, height: 180, borderRadius: "50%", background: PAPIER, border: `8px solid ${ENCRE}`, boxSizing: "border-box" }}>
          <div style={{ position: "absolute", left: 79, top: 30, width: 6, height: 52, background: ENCRE, transformOrigin: "50% 100%", transform: `rotate(${f * 4}deg)` }} />
          <div style={{ position: "absolute", left: 80, top: 14, width: 4, height: 68, background: ORANGE, transformOrigin: "50% 100%", transform: `rotate(${f * 24}deg)` }} />
        </div>
      </div>

      {KIOSQUES.map((k) => {
        const sx = x(k.x);
        if (sx < -400 || sx > 1400) return null;
        return (
          <div key={k.nom} style={{ position: "absolute", left: sx - 140, top: SOL - 430 }}>
            <Kiosque nom={k.nom} />
          </div>
        );
      })}

      {/* Le panneau ou l'avis parfait attend. */}
      <div style={{ position: "absolute", left: x(PANNEAU_X) - 130, top: SOL - 620 }}>
        <div style={{ position: "absolute", left: 120, top: 260, width: 14, height: 360, background: ENCRE }} />
        <div style={{ width: 260, height: 280, background: "#C98A4B", border: `6px solid ${ENCRE}`, boxSizing: "border-box", mixBlendMode: "multiply" }} />
        {!prisAvis && (
          <div style={{ position: "absolute", left: 50, top: 36, width: 160, height: 200, background: "#fff", border: `4px solid ${ENCRE}`, boxShadow: `0 0 ${30 + 20 * Math.sin(f / 3)}px ${ORANGE}`, padding: 12, boxSizing: "border-box" }}>
            <div style={{ fontFamily: TITRE, fontSize: 30, color: ORANGE }}>AVIS</div>
            {[90, 70, 84, 60, 76].map((w, k) => (
              <div key={k} style={{ height: 7, width: `${w}%`, background: ENCRE, marginTop: 10, opacity: 0.6 }} />
            ))}
          </div>
        )}
      </div>

      {/* Le banc et son arbre. */}
      <div style={{ position: "absolute", left: x(BANC_X) - 170, top: SOL - 560 }}>
        <div style={{ position: "absolute", left: 250, top: 120, width: 26, height: 440, background: ENCRE }} />
        <div style={{ position: "absolute", left: 120, top: 0, width: 300, height: 300, borderRadius: "50%", ...trame(BLEU, 10, 42), mixBlendMode: "multiply" }} />
        <div style={{ position: "absolute", left: 0, top: 340, width: 320, height: 26, background: ORANGE, mixBlendMode: "multiply" }} />
        <div style={{ position: "absolute", left: 0, top: 410, width: 320, height: 22, background: ORANGE, mixBlendMode: "multiply" }} />
        <div style={{ position: "absolute", left: 20, top: 366, width: 14, height: 194, background: ENCRE }} />
        <div style={{ position: "absolute", left: 286, top: 366, width: 14, height: 194, background: ENCRE }} />
      </div>

      {/* Le depot des offres. */}
      <div style={{ position: "absolute", left: x(DEPOT_X) - 380, top: SOL - 860, width: 760, height: 860 }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 0, height: 0, borderLeft: "380px solid transparent", borderRight: "380px solid transparent", borderBottom: `150px solid ${ENCRE}` }} />
        <div style={{ position: "absolute", left: 30, top: 150, width: 700, height: 90, background: BLEU, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: TITRE, fontSize: 60, color: PAPIER, letterSpacing: "0.04em" }}>
          DÉPÔT DES OFFRES
        </div>
        <div style={{ position: "absolute", left: 30, top: 240, width: 700, height: 620, background: PAPIER, border: `6px solid ${ENCRE}`, boxSizing: "border-box" }} />
        {[60, 170, 530, 640].map((cx) => (
          <div key={cx} style={{ position: "absolute", left: cx, top: 260, width: 60, height: 600, ...trame(BLEU, 8, 40), mixBlendMode: "multiply" }} />
        ))}
        <div style={{ position: "absolute", left: 260, top: 480, width: 240, height: 380, background: ENCRE }} />
        <div style={{ position: "absolute", left: 260, top: 480, width: 240, height: 380 * rideau, backgroundImage: `repeating-linear-gradient(0deg, ${ORANGE} 0 18px, #D4521C 18px 24px)` }} />
        {rideau > 0.95 && (
          <div style={{ position: "absolute", left: 290, top: 620, width: 180, padding: "10px 0", background: PAPIER, border: `5px solid ${ENCRE}`, textAlign: "center", fontFamily: TITRE, fontSize: 46, color: ENCRE, transform: "rotate(-4deg)" }}>FERMÉ</div>
        )}
        {ouvert && (
          <>
            <div style={{ position: "absolute", left: 540, top: 520, width: 170, background: PAPIER, border: `5px solid ${ENCRE}`, padding: "8px 0", textAlign: "center", fontFamily: MACHINE, fontSize: 24, color: BLEU, lineHeight: 1.3 }}>
              OUVERT
              <br />
              <span style={{ color: ENCRE }}>clôture : J-3</span>
            </div>
            <div style={{ position: "absolute", left: 270, top: 410, width: 220, height: 50, background: BLEU, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 160, height: 12, background: ENCRE }} />
            </div>
          </>
        )}
      </div>

      {/* Le sol : un trait d'encre, un trottoir en trame. */}
      <div style={{ position: "absolute", left: 0, top: SOL, width: 1080, height: 8, background: ENCRE }} />
      <div style={{ position: "absolute", left: 0, top: SOL + 8, width: 1080, height: 360, ...trame(BLEU, 11, 30), mixBlendMode: "multiply", opacity: 0.7 }} />
      {Array.from({ length: 12 }, (_, i) => {
        const sx = (((i * 240 - c) % 2880) + 2880) % 2880 - 300;
        return <div key={i} style={{ position: "absolute", left: sx, top: SOL + 8, width: 6, height: 120, background: ENCRE, opacity: 0.5, transform: "skewX(-30deg)" }} />;
      })}
    </>
  );
};

// ------------------------------------------------------- LES TITRES

/** Un titre de quotidien : il tombe sur la page, avec le decalage de calage des deux encres. */
const Gros: React.FC<{ lignes: string[]; debut: number; fin: number; y: number; taille?: number; f: number; ecart?: number }> = ({ lignes, debut, fin, y, taille = 132, f, ecart = 8 }) => (
  <div style={{ position: "absolute", top: y, left: 60, right: 60, fontFamily: TITRE, fontSize: taille, lineHeight: 0.98, color: BLEU, textTransform: "uppercase" }}>
    {lignes.map((l, i) => {
      const d = debut + i * ecart;
      const p = entre(f, d, d + 8, 0, 1, SORTIE);
      const s = entre(f, fin - 6, fin, 0, 1, ACCELERE);
      if (f < d) return null;
      return (
        <div
          key={i}
          style={{
            transform: `scale(${1.5 - 0.5 * p}) translateY(${-s * 60}px)`,
            transformOrigin: "0% 50%",
            opacity: p * (1 - s),
            textShadow: `${6 * p}px ${4 * p}px 0 ${ORANGE}`,
            mixBlendMode: "multiply",
          }}
        >
          {l}
        </div>
      );
    })}
  </div>
);

const Machine: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ fontFamily: MACHINE, fontWeight: 700, fontSize: 30, color: ENCRE, letterSpacing: "0.04em", ...style }}>{children}</div>
);

// ------------------------------------------------------- LA UNE

/** La page du quotidien, ouverte (S1) et refermee (S7). La photo est un trou : le decor passe au travers. */
const PHOTO = { haut: 930, bas: 290, cote: 60 };
const PHOTO_FIN = { haut: 900, bas: 560, cote: 120 };

const Une: React.FC<{ f: number; fin?: boolean }> = ({ f, fin }) => {
  const lignes = (n: number, top: number) =>
    Array.from({ length: n }, (_, k) => (
      <div key={k} style={{ position: "absolute", left: 60 + (k % 2) * 490, top: top + Math.floor(k / 2) * 30, width: 430 * (0.8 + random(`l${k}${top}`) * 0.2), height: 12, background: ENCRE, opacity: 0.25 }} />
    ));
  if (!fin) {
    return (
      <>
        <div style={{ position: "absolute", left: 60, right: 60, top: 70, textAlign: "center", fontFamily: TITRE, fontSize: 92, color: ENCRE, letterSpacing: "0.01em" }}>LE QUOTIDIEN DES MARCHÉS</div>
        <div style={{ position: "absolute", left: 60, right: 60, top: 196, height: 6, background: ENCRE }} />
        <Machine style={{ position: "absolute", left: 60, right: 60, top: 214, display: "flex", justifyContent: "space-between", fontSize: 24 }}>
          <span>CHAQUE MATIN</span>
          <span>N° 4 812</span>
          <span>500 F</span>
        </Machine>
        <div style={{ position: "absolute", left: 60, right: 60, top: 258, height: 2, background: ENCRE }} />
        <Gros f={f} lignes={["Il rate encore", "un appel", "d'offres"]} debut={6} fin={1e9} y={300} taille={170} ecart={6} />
        <Machine style={{ position: "absolute", left: 60, top: 1648, fontSize: 24, color: "#555" }}>Koffi, consultant, ce matin.</Machine>
        {lignes(8, 1700)}
      </>
    );
  }
  const t = f - S.fin;
  const h = 110;
  return (
    <>
      <div style={{ position: "absolute", top: 70, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
        <Img src={staticFile("icone-fonce.png")} style={{ height: h }} />
        <Img src={staticFile("mot-fonce.png")} style={{ height: h }} />
      </div>
      <div style={{ position: "absolute", left: 60, right: 60, top: 206, height: 6, background: ENCRE }} />
      <Machine style={{ position: "absolute", left: 60, right: 60, top: 224, display: "flex", justifyContent: "space-between", fontSize: 24 }}>
        <span>ÉDITION SPÉCIALE</span>
        <span>VEILLE AUTOMATIQUE</span>
      </Machine>
      <div style={{ position: "absolute", left: 60, right: 60, top: 268, height: 2, background: ENCRE }} />
      <Gros f={f} lignes={["Un seul", "paiement."]} debut={S.fin + 14} fin={1e9} y={300} taille={196} ecart={8} />
      {/* Un tampon dans la marge de la une. */}
      <div style={{ position: "absolute", left: 560, top: 720, padding: "6px 22px", border: `5px solid ${ORANGE}`, transform: `rotate(-7deg) scale(${ressort(t, 26, 30, 260, 12)})`, mixBlendMode: "multiply", textAlign: "center" }}>
        <Machine style={{ fontSize: 24, color: ORANGE }}>ET SURTOUT</Machine>
        <div style={{ fontFamily: TITRE, fontSize: 64, color: ORANGE, lineHeight: 1 }}>SANS ABONNEMENT</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1390, display: "flex", justifyContent: "center", transform: `scale(${ressort(t, 40, 30, 200, 12)})` }}>
        <div style={{ background: BLEU, color: PAPIER, fontFamily: TITRE, fontSize: 84, padding: "10px 46px", letterSpacing: "0.02em", boxShadow: `8px 8px 0 ${ORANGE}` }}>TENDERPILOT.STORE</div>
      </div>
      <Machine style={{ position: "absolute", left: 60, right: 60, top: 1560, textAlign: "center", fontSize: 25, opacity: entre(t, 52, 60, 0, 1) }}>
        Sources officielles · 8 pays suivis
        <br />
        Satisfait ou remboursé 30 jours
      </Machine>
      {lignes(6, 1700)}
    </>
  );
};

// ================================================================ FILM

export const FilmD: React.FC = () => {
  const vraie = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Anime en deux : une image sur deux est tenue. C'est le grain du fait main.
  const f = vraie - (vraie % 2);
  const { pose, tient } = poseK(f);
  const main = mainAvant(pose);

  // L'ouverture dans la photo de la une, puis la fermeture sur la derniere.
  const ouvre = entre(f, 80, 110, 0, 1, DOUX);
  const ferme = entre(f, S.fin, S.fin + 26, 0, 1, DOUX);
  const cadre = ferme > 0 ? PHOTO_FIN : PHOTO;
  const k = ferme > 0 ? ferme : 1 - ouvre;
  const echelleMonde = ferme > 0 ? 1 - 0.42 * ferme : 0.78 + 0.22 * ouvre;
  const centre = ferme > 0 ? { x: 540, y: (PHOTO_FIN.haut + 1920 - PHOTO_FIN.bas) / 2 } : { x: 540, y: (PHOTO.haut + 1920 - PHOTO.bas) / 2 };

  // Le gel de « trop tard », et la bande qui rembobine.
  const gel = f >= 376 && f < S.rembobine;
  const zoomGel = gel ? 1 + 0.12 * entre(f, 376, 410, 0, 1, DOUX) : 1;
  const rembobine = f >= S.rembobine && f < S.rembobine + 32;

  // La pile de journaux : un de plus a chaque kiosque.
  const nPile = KIOSQUES.filter((q) => f >= q.f).length;
  const chute = entre(f, 312, 330, 0, 1, ACCELERE);
  const objet = (() => {
    if (tient === "pile")
      return (
        <g>
          {Array.from({ length: nPile }, (_, i) => {
            const arrive = ressort(f, KIOSQUES[i].f, fps, 260, 14);
            return (
              <rect
                key={i}
                x={main.x - 70 + (random(`p${i}`) - 0.5) * 16}
                y={main.y - 30 - i * 15 - (1 - arrive) * 220}
                width={120}
                height={15}
                fill={i % 2 ? "#FFFFFF" : "#E3DED2"}
                stroke={ENCRE}
                strokeWidth={3}
                transform={`rotate(${(random(`r${i}`) - 0.5) * 8 + Math.sin(f / 5 + i) * 1.5} ${main.x} ${main.y})`}
              />
            );
          })}
        </g>
      );
    if (tient === "avis")
      return (
        <g transform={`translate(${main.x - 46} ${main.y - 120}) rotate(-8)`}>
          <rect width={92} height={120} fill="#fff" stroke={ENCRE} strokeWidth={4} style={{ filter: `drop-shadow(0 0 14px ${ORANGE})` }} />
          <rect x={12} y={14} width={50} height={14} fill={ORANGE} />
          <rect x={12} y={40} width={68} height={6} fill={ENCRE} opacity={0.5} />
          <rect x={12} y={56} width={56} height={6} fill={ENCRE} opacity={0.5} />
        </g>
      );
    if (tient === "tel")
      return (
        <g transform={`translate(${main.x - 26} ${main.y - 70}) rotate(-6)`}>
          <rect width={52} height={92} rx={10} fill={ENCRE} />
          <rect x={5} y={8} width={42} height={74} rx={5} fill={BLEU} />
          <path d="M 14 46 L 40 36 L 24 50 Z" fill={PAPIER} />
        </g>
      );
    if (tient === "dossier")
      return (
        <g transform={`translate(${main.x - 60} ${main.y - 70}) rotate(-4)`}>
          <rect width={120} height={86} fill={ORANGE} stroke={ENCRE} strokeWidth={4} />
          <rect x={10} y={-12} width={50} height={16} fill={ORANGE} stroke={ENCRE} strokeWidth={4} />
          <text x={60} y={56} textAnchor="middle" fontFamily={MACHINE} fontSize={18} fill={ENCRE}>OFFRE</text>
        </g>
      );
    return null;
  })();

  // L'avion en papier : il entre, tourne, et se pose dans la main de Koffi.
  const vol = entre(f, 446, 480, 0, 1, DOUX);
  const cible = { x: KX + main.x, y: SOL + main.y - 30 };
  const avion = {
    x: 1180 + (cible.x - 1180) * vol + Math.sin(vol * Math.PI * 2) * 140 * (1 - vol),
    y: 420 + (cible.y - 420) * vol - Math.sin(vol * Math.PI) * 240,
    a: -20 + 200 * vol,
  };

  return (
    <AbsoluteFill style={{ background: PAPIER, overflow: "hidden" }}>
      {/* --- LE MONDE, vu a travers la photo de la une */}
      <AbsoluteFill
        style={{
          clipPath: `inset(${cadre.haut * k}px ${cadre.cote * k}px ${cadre.bas * k}px ${cadre.cote * k}px)`,
          transform: `scale(${echelleMonde * zoomGel}) translateX(${rembobine ? Math.sin(f * 1.7) * 10 : 0}px)`,
          transformOrigin: `${gel ? KX + 200 : centre.x}px ${gel ? SOL - 300 : centre.y}px`,
        }}
      >
        <AbsoluteFill style={{ background: PAPIER }} />
        <Monde f={f} />
        {/* Les journaux lacheS a la course, qui s'envolent derriere lui. */}
        {f >= 312 && f < 360 &&
          Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: KX - 60 - chute * (200 + i * 90),
                top: SOL - 330 + chute * (240 + i * 10) - Math.sin(chute * Math.PI) * 120,
                width: 120,
                height: 15,
                background: i % 2 ? "#fff" : "#E3DED2",
                border: `3px solid ${ENCRE}`,
                transform: `rotate(${chute * (i % 2 ? 160 : -140)}deg)`,
              }}
            />
          ))}
        <div style={{ position: "absolute", left: KX - 230, top: SOL - 720, transform: rembobine ? `skewX(${Math.sin(f) * 4}deg)` : undefined }}>
          <Koffi pose={pose} id="k" avant={objet} />
        </div>
        {/* Les bandes de la cassette qui rembobine. */}
        {rembobine &&
          [0, 1, 2].map((i) => (
            <div key={i} style={{ position: "absolute", left: 0, right: 0, top: ((f * 37 + i * 640) % 1920), height: 26 + i * 10, background: ORANGE, opacity: 0.18, mixBlendMode: "multiply" }} />
          ))}
      </AbsoluteFill>

      {/* --- LES DEUX UNES */}
      {k > 0.001 && ferme === 0 && (
        <AbsoluteFill style={{ opacity: 1 - entre(f, 96, 110, 0, 1), transform: `scale(${1 + 0.35 * ouvre})`, transformOrigin: `540px ${centre.y}px` }}>
          <Une f={f} />
        </AbsoluteFill>
      )}
      {ferme > 0 && (
        <AbsoluteFill style={{ opacity: entre(f, S.fin + 6, S.fin + 20, 0, 1), transform: `scale(${1.3 - 0.3 * ferme})`, transformOrigin: `540px ${centre.y}px` }}>
          <Une f={f} fin />
        </AbsoluteFill>
      )}

      {/* --- S2 : LA TOURNEE */}
      <Gros f={f} lignes={["60 sites.", "Des journaux.", "Des heures."]} debut={S.ville + 6} fin={S.tard - 4} y={150} ecart={TEMPS * 2} />
      {f >= S.ville && f < S.tard && (
        <Machine style={{ position: "absolute", left: 60, top: 1720, fontSize: 32, background: PAPIER, padding: "8px 16px", border: `4px solid ${ENCRE}` }}>
          KIOSQUES : {nPile} · SITES : {Math.round(entre(f, S.ville + 10, S.tard - 10, 1, 60))}
        </Machine>
      )}

      {/* --- S3 : L'AVIS, PUIS TROP TARD */}
      <Gros f={f} lignes={["L'avis parfait !"]} debut={302} fin={364} y={150} />
      <Gros f={f} lignes={["Trop", "tard."]} debut={376} fin={S.rembobine} y={150} taille={260} ecart={6} />

      {/* --- S4 : REMBOBINONS, ET L'AVION */}
      {rembobine && (
        <Machine style={{ position: "absolute", left: 60, top: 170, fontSize: 64, color: ORANGE, opacity: f % 8 < 5 ? 1 : 0.2 }}>◀◀ REMBOBINONS</Machine>
      )}
      {f >= 446 && f < 494 && (
        <div style={{ position: "absolute", left: avion.x - 60, top: avion.y - 40, transform: `rotate(${avion.a}deg)` }}>
          <svg width={120} height={96} viewBox="0 0 100 80">
            <path d="M 2 34 L 98 2 L 40 50 Z" fill={BLEU} style={{ mixBlendMode: "multiply" }} />
            <path d="M 40 50 L 98 2 L 58 76 Z" fill={ORANGE} style={{ mixBlendMode: "multiply" }} />
          </svg>
        </div>
      )}
      {f >= 482 && f < S.veille && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 170, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, transform: `scale(${ressort(f, 482, fps, 220, 12)})` }}>
            <Img src={staticFile("icone-fonce.png")} style={{ height: 120 }} />
            <Img src={staticFile("mot-fonce.png")} style={{ height: 120 }} />
          </div>
        </div>
      )}
      <Gros f={f} lignes={["La veille", "vient à lui."]} debut={494} fin={S.veille} y={340} taille={120} />

      {/* --- S5 : LA VEILLE VIENT A LUI */}
      <Gros f={f} lignes={["61 sources,", "triées pour lui."]} debut={S.veille + 4} fin={S.depot - 2} y={130} taille={112} />
      {f >= S.veille + 10 && f < S.depot + 10 && (() => {
        const deroule = entre(f, S.veille + 12, S.veille + 28, 0, 1, DOUX);
        const RANGS = [
          { t: "Fourniture de médicaments", j: 2, c: ORANGE },
          { t: "Travaux d'assainissement", j: 6, c: ORANGE },
          { t: "Étude de faisabilité", j: 12, c: BLEU },
          { t: "Appui à la digitalisation", j: 14, c: BLEU },
          { t: "Centre de santé", j: 20, c: BLEU },
        ];
        const part = entre(f, S.depot, S.depot + 10, 0, 1, ACCELERE);
        return (
          <div style={{ position: "absolute", left: 60, top: 400 - part * 900, width: 960, height: 620 * deroule, overflow: "hidden", background: "#fff", border: `6px solid ${ENCRE}`, boxSizing: "border-box", boxShadow: `10px 10px 0 ${BLEU}` }}>
            <div style={{ fontFamily: TITRE, fontSize: 52, color: ENCRE, padding: "18px 26px 8px", borderBottom: `4px solid ${ENCRE}` }}>MES APPELS D'OFFRES</div>
            {RANGS.map((r, i) => {
              const d = S.veille + 30 + i * 8;
              const p = entre(f, d, d + 10, 0, 1, SORTIE);
              return (
                <div key={r.t} style={{ display: "flex", alignItems: "center", gap: 18, padding: "14px 26px", borderBottom: `2px dashed ${ENCRE}`, transform: `translateX(${(1 - p) * 1000}px)` }}>
                  <div style={{ width: 22, height: 22, background: r.c, mixBlendMode: "multiply" }} />
                  <div style={{ flex: 1, fontFamily: MACHINE, fontSize: 30, color: ENCRE }}>{r.t}</div>
                  <div style={{ fontFamily: TITRE, fontSize: 44, color: r.c }}>J-{r.j}</div>
                </div>
              );
            })}
          </div>
        );
      })()}
      {f >= S.veille + 80 && f < S.depot + 6 &&
        [
          { d: S.veille + 84, t: "RAPPEL J-7", s: "Étude de faisabilité" },
          { d: S.veille + 84 + TEMPS * 2, t: "RAPPEL J-3", s: "Travaux d'assainissement" },
          { d: S.veille + 84 + TEMPS * 4, t: "DEMAIN !", s: "Fourniture de médicaments" },
        ].map((n, i) => {
          if (f < n.d) return null;
          const p = ressort(f, n.d, fps, 240, 13);
          return (
            <div
              key={n.t}
              style={{
                position: "absolute",
                left: 560,
                top: 1050 + i * 122,
                width: 470,
                background: i === 2 ? ORANGE : PAPIER,
                border: `5px solid ${ENCRE}`,
                padding: "12px 20px",
                boxSizing: "border-box",
                transform: `scale(${p}) rotate(${(i - 1) * 2}deg)`,
                transformOrigin: "0% 50%",
                boxShadow: `6px 6px 0 ${BLEU}`,
              }}
            >
              <div style={{ fontFamily: TITRE, fontSize: 44, color: i === 2 ? PAPIER : BLEU }}>{n.t}</div>
              <Machine style={{ fontSize: 22, color: i === 2 ? PAPIER : ENCRE }}>{n.s}</Machine>
            </div>
          );
        })}

      {/* --- S6 : DEPOSE A TEMPS */}
      <Gros f={f} lignes={["Cette fois,", "à temps."]} debut={S.depot + 6} fin={S.fin} y={150} taille={150} />
      {f >= 808 && f < S.fin + 4 && (
        <div
          style={{
            position: "absolute",
            left: 470,
            top: 470,
            transform: `scale(${1 + 1.6 * (1 - ressort(f, 808, fps, 400, 20))}) rotate(-10deg)`,
            opacity: entre(f, 808, 811, 0, 1),
            fontFamily: TITRE,
            fontSize: 110,
            color: ORANGE,
            border: `12px solid ${ORANGE}`,
            padding: "0 30px",
            mixBlendMode: "multiply",
          }}
        >
          DÉPOSÉ
        </div>
      )}

      {/* Le papier : fibres et grain, renouveles a chaque dessin. */}
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          opacity: 0.1,
          mixBlendMode: "multiply",
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' seed='${(f / 2) % 6}'/></filter><rect width='300' height='300' filter='url(%23n)'/></svg>")`,
        }}
      />
      <Audio src={staticFile("musique-d.wav")} />
    </AbsoluteFill>
  );
};
