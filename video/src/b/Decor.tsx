import { random } from "remotion";
import { POLICE } from "../polices";
import { AFFICHE, B } from "./themeB";

/**
 * Les accessoires de l'histoire. Dessines a plat, dans la meme palette que
 * le personnage : un objet photographique au milieu d'une illustration
 * casse l'univers.
 */

/** Un journal ouvert, vu de face : c'est ce qu'Aicha lit chaque matin. */
export const Journal: React.FC<{ l: number; h: number; page?: number }> = ({ l, h, page = 0 }) => (
  <div
    style={{
      width: l,
      height: h,
      background: "#FBFBF8",
      borderRadius: 6,
      boxShadow: "0 10px 30px rgba(11,27,63,0.18)",
      padding: 14,
      boxSizing: "border-box",
      fontFamily: AFFICHE,
      color: B.encre,
      display: "flex",
      flexDirection: "column",
      gap: 8,
      overflow: "hidden",
    }}
  >
    <div style={{ fontSize: l * 0.085, fontWeight: 800, letterSpacing: "-0.02em", borderBottom: `3px solid ${B.encre}`, paddingBottom: 4 }}>
      {["LE QUOTIDIEN", "MARCHÉS PUBLICS", "L'OFFICIEL"][page % 3]}
    </div>
    <div style={{ display: "flex", gap: 10, flex: 1 }}>
      {[0, 1, 2].map((c) => (
        <div key={c} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          {c === 0 && <div style={{ height: h * 0.22, background: "#D7DCE8", borderRadius: 3 }} />}
          {Array.from({ length: 9 }, (_, k) => (
            <div key={k} style={{ height: 5, borderRadius: 3, background: "#C4C9D6", width: `${70 + random(`j${page}${c}${k}`) * 30}%` }} />
          ))}
        </div>
      ))}
    </div>
  </div>
);

/** Une fenetre de navigateur : un des soixante sites a ouvrir. */
export const Fenetre: React.FC<{ nom: string; teinte: string }> = ({ nom, teinte }) => (
  <div
    style={{
      width: 270,
      height: 170,
      borderRadius: 18,
      background: B.papier,
      boxShadow: "0 18px 40px rgba(11,27,63,0.18)",
      overflow: "hidden",
      fontFamily: POLICE,
    }}
  >
    <div style={{ height: 34, background: "#EEF0F5", display: "flex", alignItems: "center", gap: 6, padding: "0 12px" }}>
      {["#FF6A4D", "#FFC53D", "#1FB57A"].map((c) => (
        <div key={c} style={{ width: 10, height: 10, borderRadius: 5, background: c }} />
      ))}
      <div style={{ marginLeft: 8, height: 16, flex: 1, borderRadius: 8, background: "#fff" }} />
    </div>
    <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 18, height: 18, borderRadius: 5, background: teinte }} />
        <div style={{ fontSize: 19, fontWeight: 800, color: B.encre, whiteSpace: "nowrap" }}>{nom}</div>
      </div>
      {[92, 76, 84].map((w, k) => (
        <div key={k} style={{ height: 8, borderRadius: 4, background: "#E1E5EE", width: `${w}%` }} />
      ))}
    </div>
  </div>
);

/** L'horloge du bureau. `tours` = rotation de la grande aiguille. */
export const Horloge: React.FC<{ taille: number; tours: number }> = ({ taille, tours }) => (
  <svg width={taille} height={taille} viewBox="0 0 200 200">
    <circle cx={100} cy={100} r={92} fill={B.papier} stroke={B.encre} strokeWidth={10} />
    {Array.from({ length: 12 }, (_, i) => (
      <line key={i} x1={100} y1={22} x2={100} y2={i % 3 ? 32 : 40} stroke={B.encre} strokeWidth={i % 3 ? 4 : 7} strokeLinecap="round" transform={`rotate(${i * 30} 100 100)`} />
    ))}
    <line x1={100} y1={100} x2={100} y2={58} stroke={B.encre} strokeWidth={9} strokeLinecap="round" transform={`rotate(${tours * 30} 100 100)`} />
    <line x1={100} y1={100} x2={100} y2={36} stroke={B.corail} strokeWidth={6} strokeLinecap="round" transform={`rotate(${tours * 360} 100 100)`} />
    <circle cx={100} cy={100} r={9} fill={B.encre} />
  </svg>
);

/** L'avion en papier du logo. Pointe vers la droite ; on le tourne. */
export const Avion: React.FC<{ taille: number }> = ({ taille }) => (
  <svg width={taille} height={taille * 0.8} viewBox="0 0 100 80" style={{ overflow: "visible" }}>
    <path d="M 2 34 L 98 2 L 40 50 Z" fill={B.marque} />
    <path d="M 40 50 L 98 2 L 58 76 Z" fill="#3D7BFF" />
    <path d="M 40 50 L 46 70 L 58 76 Z" fill={B.marqueFonce} />
  </svg>
);

/** Un tampon encreur : CLOTURE en rouge, DEPOSE en vert. */
export const Tampon: React.FC<{ texte: string; couleur: string; taille?: number }> = ({ texte, couleur, taille = 84 }) => (
  <div
    style={{
      display: "inline-block",
      fontFamily: AFFICHE,
      fontWeight: 800,
      fontSize: taille,
      letterSpacing: "0.04em",
      color: couleur,
      border: `${taille * 0.09}px solid ${couleur}`,
      borderRadius: taille * 0.22,
      padding: `${taille * 0.04}px ${taille * 0.26}px`,
      background: "rgba(255,255,255,0.35)",
      mixBlendMode: "multiply",
    }}
  >
    {texte}
  </div>
);

/** Le petit nuage de pluie au-dessus de la tete : le mauvais jour. */
export const Nuage: React.FC<{ t: number }> = ({ t }) => (
  <svg width={260} height={220} viewBox="0 0 260 220" style={{ overflow: "visible" }}>
    {Array.from({ length: 6 }, (_, i) => {
      const y = ((t * 7 + i * 37) % 110) + 96;
      return <line key={i} x1={50 + i * 32} y1={y} x2={46 + i * 32} y2={y + 20} stroke="#7C8AA8" strokeWidth={6} strokeLinecap="round" opacity={1 - (y - 96) / 110} />;
    })}
    <path d="M 40 100 Q 10 100 14 72 Q 20 46 50 50 Q 60 16 100 18 Q 140 18 150 48 Q 186 38 200 66 Q 236 70 228 98 Q 224 108 206 108 L 52 108 Q 42 108 40 100 Z" fill="#9AA5BD" />
  </svg>
);

/** L'ordinateur portable, vu de dos. Le sticker apparait avec TenderPilot. */
export const Ordi: React.FC<{ sticker: number }> = ({ sticker }) => (
  <svg width={290} height={210} viewBox="0 0 290 210">
    <rect x={10} y={0} width={270} height={184} rx={18} fill="#C9CFDC" />
    <rect x={0} y={184} width={290} height={20} rx={8} fill="#AEB6C7" />
    <g transform={`translate(145 92) scale(${sticker}) rotate(${(1 - sticker) * -40})`}>
      <circle r={40} fill={B.papier} />
      <path d="M -22 0 L 24 -16 L -4 8 Z" fill={B.marque} />
      <path d="M -4 8 L 24 -16 L 6 20 Z" fill="#3D7BFF" />
    </g>
  </svg>
);

/** La tasse, et sa vapeur qui ondule. */
export const Tasse: React.FC<{ t: number }> = ({ t }) => (
  <svg width={120} height={150} viewBox="0 0 120 150" style={{ overflow: "visible" }}>
    {[0, 1].map((k) => (
      <path
        key={k}
        d={`M ${42 + k * 22} 44 q ${8 * Math.sin(t / 6 + k)} -14 0 -24 q ${-8 * Math.sin(t / 6 + k)} -12 0 -22`}
        fill="none"
        stroke="#fff"
        strokeWidth={6}
        strokeLinecap="round"
        opacity={0.85}
      />
    ))}
    <path d="M 94 70 q 26 0 22 22 q -4 20 -26 18" fill="none" stroke={B.menthe} strokeWidth={10} />
    <path d="M 14 52 L 100 52 L 92 138 Q 90 146 82 146 L 32 146 Q 24 146 22 138 Z" fill={B.menthe} />
    <path d="M 30 72 L 84 72" stroke="#fff" strokeWidth={6} strokeLinecap="round" opacity={0.5} />
  </svg>
);

/** Confettis : des formes simples, dans la palette, lancees depuis (x, y). */
export const Confettis: React.FC<{ t: number; x: number; y: number; n?: number }> = ({ t, x, y, n = 70 }) => {
  if (t < 0) return null;
  const couleurs = [B.soleil, B.corail, B.menthe, "#fff", B.lilas];
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const a = random(`ca${i}`) * Math.PI * 2;
        const v = 18 + random(`cv${i}`) * 26;
        const px = x + Math.cos(a) * v * t * 0.9;
        const py = y + Math.sin(a) * v * t * 0.9 - 14 * t + 0.55 * t * t;
        const forme = i % 3;
        const taille = 16 + random(`ct${i}`) * 18;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: px,
              top: py,
              width: forme === 1 ? taille * 0.5 : taille,
              height: taille,
              borderRadius: forme === 0 ? "50%" : forme === 1 ? 3 : 0,
              clipPath: forme === 2 ? "polygon(50% 0, 100% 100%, 0 100%)" : undefined,
              background: couleurs[i % couleurs.length],
              transform: `rotate(${t * (8 + i * 3)}deg)`,
              opacity: Math.max(0, 1 - t / 70),
            }}
          />
        );
      })}
    </>
  );
};
