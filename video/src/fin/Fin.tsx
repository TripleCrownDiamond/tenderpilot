import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { chargerPolices, POLICE } from "../polices";
import { DOUX, SORTIE, entre, ressort } from "../ui/anim";
import { OFFRE } from "./offre";

chargerPolices();

/**
 * LA FIN COMMUNE. Six secondes, collees derriere chaque film par assembler.py :
 * c'est le seul endroit ou un prix apparait. Le style est celui du site - la
 * carte de prix indigo de la page de vente - parce que c'est la page sur
 * laquelle le spectateur arrive en cliquant.
 *
 * Tout le texte vient de offre.ts : on ne touche pas a ce fichier pour changer
 * un prix.
 */
// 7,5 s : l'annonce du prix (public/fin-voix.mp3) dure environ 6,2 s une fois
// ses pauses resserrees, et commence a 0,5 s.
export const DUREE_FIN = 225;

const T = {
  navy: "#0B1225",
  primary: "#4F46FF",
  lightBlue: "#EEF0FF",
  g500: "#6B7280",
};

const Fleche: React.FC<{ taille: number }> = ({ taille }) => (
  <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const Bouclier: React.FC = () => (
  <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4" />
  </svg>
);

export const Fin: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const monte = (d: number) => ({ opacity: entre(f, d, d + 10, 0, 1), transform: `translateY(${entre(f, d, d + 16, 30, 0, SORTIE)}px)` });
  const carte = ressort(f, 4, fps, 120, 15);
  // Cale sur la voix : « vingt mille » a 1,5 s, « cinquante mille » a 2,8 s,
  // « tenderpilot point store » a partir de 3,7 s.
  const prix = ressort(f, 42, fps, 180, 12);
  const barre = entre(f, 80, 92, 0, 100, DOUX);
  const clic = f >= 138 && f < 146 ? 0.95 : 1;
  const curseur = { x: 1000 - entre(f, 112, 136, 0, 420, DOUX), y: 1800 - entre(f, 112, 136, 0, 620, DOUX) };
  const onde = entre(f, 138, 160, 0, 1);
  const reflet = entre(f, 150, 180, -30, 130, DOUX);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(900px 700px at 50% 55%, ${T.lightBlue}, transparent 70%), #fff`, fontFamily: POLICE }}>
      {/* L'entree : un voile indigo qui se retire, pour raccorder avec n'importe quel film. */}
      <AbsoluteFill style={{ background: T.primary, transform: `translateY(${-entre(f, 0, 12, 0, 100, DOUX)}%)` }} />

      <div style={{ position: "absolute", top: 300, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 8, ...monte(8) }}>
        <Img src={staticFile("icone-fonce.png")} style={{ height: 110 }} />
        <Img src={staticFile("mot-fonce.png")} style={{ height: 110 }} />
      </div>

      <div
        style={{
          position: "absolute",
          left: 90,
          top: 520,
          width: 900,
          borderRadius: 52,
          background: T.primary,
          color: "#fff",
          padding: "54px 58px 50px",
          boxSizing: "border-box",
          boxShadow: "0 50px 110px rgba(79,70,255,0.35)",
          transform: `translateY(${(1 - carte) * 700}px)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
          <Img src={staticFile("boite-tenderpilot.webp")} style={{ width: 150, height: 150, objectFit: "contain", filter: "drop-shadow(0 12px 20px rgba(0,0,0,0.25))" }} />
          <div style={{ ...monte(16) }}>
            {OFFRE.etiquette && (
              <span style={{ display: "inline-block", background: "rgba(255,255,255,0.2)", padding: "8px 18px", borderRadius: 999, fontSize: 20, fontWeight: 900, letterSpacing: "0.14em" }}>{OFFRE.etiquette}</span>
            )}
            {OFFRE.places && <div style={{ fontSize: 30, fontWeight: 700, marginTop: 10, color: "rgba(255,255,255,0.9)" }}>{OFFRE.places}</div>}
          </div>
        </div>

        {OFFRE.prixBarre && (
          <div style={{ position: "relative", display: "inline-block", marginTop: 40, fontSize: 46, fontWeight: 700, color: "rgba(255,255,255,0.72)", ...monte(22) }}>
            {OFFRE.prixBarre}
            {/* Le trait qui barre l'ancien prix, trace sous les yeux. */}
            <div style={{ position: "absolute", left: -4, top: "52%", height: 5, width: `calc(${barre}% + 8px)`, background: "#fff", borderRadius: 3, transform: "rotate(-4deg)" }} />
          </div>
        )}
        <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 6, transform: `scale(${0.6 + 0.4 * prix})`, transformOrigin: "0% 80%", opacity: entre(f, 42, 48, 0, 1) }}>
          <span style={{ fontSize: 168, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{OFFRE.prix}</span>
          <span style={{ fontSize: 52, fontWeight: 800, whiteSpace: "nowrap" }}>{OFFRE.devise}</span>
        </div>
        <div style={{ fontSize: 32, fontWeight: 600, marginTop: 14, color: "rgba(255,255,255,0.88)", ...monte(40) }}>{OFFRE.mention}</div>

        <div style={{ marginTop: 44, ...monte(48) }}>
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              background: "#fff",
              color: T.primary,
              fontSize: 50,
              fontWeight: 800,
              padding: "28px 0",
              borderRadius: 26,
              boxShadow: "0 16px 34px rgba(0,0,0,0.18)",
              transform: `scale(${clic})`,
            }}
          >
            {OFFRE.url} <Fleche taille={46} />
            <div style={{ position: "absolute", top: 0, bottom: 0, left: `${reflet}%`, width: "16%", background: "linear-gradient(90deg, transparent, rgba(79,70,255,0.18), transparent)", transform: "skewX(-20deg)" }} />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 30, fontSize: 30, fontWeight: 700, color: "rgba(255,255,255,0.94)", ...monte(56) }}>
          <Bouclier /> {OFFRE.garantie}
        </div>
      </div>

      <div style={{ position: "absolute", top: 1420, left: 0, right: 0, textAlign: "center", fontSize: 28, fontWeight: 600, color: T.g500, ...monte(64) }}>{OFFRE.pied}</div>

      {/* Le curseur va au bouton et clique ; l'onde part de sa pointe. */}
      {onde > 0 && onde < 1 && (
        <div style={{ position: "absolute", left: curseur.x + 6 - 90 * onde, top: curseur.y + 4 - 90 * onde, width: 180 * onde, height: 180 * onde, borderRadius: "50%", border: `4px solid ${T.primary}`, opacity: 1 - onde }} />
      )}
      <svg width={64} height={64} viewBox="0 0 24 24" style={{ position: "absolute", left: curseur.x, top: curseur.y, opacity: entre(f, 106, 112, 0, 1), transform: `scale(${clic})` }}>
        <path d="M4 2 L4 20 L9 15 L12 22 L15 21 L12 14 L19 14 Z" fill={T.navy} stroke="#fff" strokeWidth={1.4} strokeLinejoin="round" />
      </svg>

      <Audio src={staticFile("fin-son.wav")} />
    </AbsoluteFill>
  );
};
