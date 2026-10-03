import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, STATUTS } from "../theme";
import { POLICE } from "../polices";
import { Onde } from "../ui/Fond";
import { DOUX, entre, ressort } from "../ui/anim";
import { Etiquette, Titre } from "../ui/Titre";
import { LIGNES, Ligne, L_TABLEAU } from "./S3Tableau";
import { TEMPS } from "../tempo";
import { EcranAgenda, EcranEmail, EcranTelegram } from "../ui/Ecrans";

// Les ecrans sont dessines, pas captures : ils remplissent tout l'ecran.
const ECRANS = [EcranEmail, EcranTelegram, EcranAgenda];
const CANAUX = ["PAR EMAIL", "SUR TELEGRAM", "DANS GOOGLE AGENDA"];
const L_TEL = 540;
const H_TEL = 1060;
const URGENTE = LIGNES[7];

/**
 * Mesures 8-10. La ligne urgente quitte le tableau, s'illumine, se change en
 * notification et plonge dans un telephone, qui fait defiler les trois
 * canaux reels : l'email, Telegram, l'agenda.
 */
export const S4Alerte: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rouge = STATUTS[3];

  const detache = ressort(f, 0, fps, 120, 12);
  const morph = entre(f, 26, 44, 0, 1, DOUX);
  const envol = entre(f, 40, 58, 0, 1, DOUX);
  const tel = ressort(f, 34, fps, 90, 14);

  const largeurPill = L_TABLEAU - morph * 300;
  const xPill = 540 - largeurPill / 2;
  const yPill = 1000 - envol * 520;
  const echellePill = 1 + detache * 0.1 - envol * 0.22;

  const glisse = (k: number) => entre(f, 60 + k * 40, 76 + k * 40, 1, 0);

  return (
    <AbsoluteFill style={{ perspective: 1800 }}>
      <Titre lignes={["Vous êtes prévenu", "*avant la date limite*"]} debut={4} fin={180} y={150} taille={76} />

      <div
        style={{
          position: "absolute",
          left: 80,
          top: 420,
          opacity: 0.3 * (1 - envol),
          transform: `rotateX(10deg) rotateY(-8deg) scale(${0.9 - envol * 0.1})`,
          filter: `blur(${2 + envol * 6}px)`,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {LIGNES.slice(0, 6).map((l, i) => (
          <Ligne key={i} titre={l.titre} pays={l.pays} jours={l.jours} statut={l.st} couleur={1} />
        ))}
      </div>

      <div
        style={{
          position: "absolute",
          left: 540 - L_TEL / 2 + (1 - tel) * 700,
          top: 440,
          width: L_TEL,
          height: H_TEL,
          borderRadius: 76,
          background: "#0A0F22",
          border: "2px solid rgba(255,255,255,0.18)",
          boxShadow: `0 80px 160px ${C.clair ? "rgba(11,18,37,0.28)" : "rgba(0,0,0,0.7)"}, 0 0 140px ${C.indigo}${C.clair ? "33" : "66"}, inset 0 0 0 10px #050814`,
          transform: `rotateY(${(1 - tel) * -40 - 12}deg) rotateZ(${3 * (1 - tel)}deg)`,
          overflow: "hidden",
          opacity: tel,
        }}
      >
        <div style={{ position: "absolute", inset: 16, borderRadius: 62, overflow: "hidden", background: "#fff" }}>
          {ECRANS.map((Ecran, k) => (
            <div
              key={k}
              style={{
                position: "absolute",
                inset: 0,
                transform: `translateY(${glisse(k) * 105}%)`,
                opacity: (k === 0 || f >= 59 + k * 40) && (k === 2 || f < 76 + (k + 1) * 40) ? 1 : 0,
                zIndex: k,
              }}
            >
              <Ecran t={f - (60 + k * 40)} fps={fps} />
            </div>
          ))}
        </div>
        <div style={{ position: "absolute", left: L_TEL / 2 - 70, top: 30, width: 140, height: 36, borderRadius: 18, background: "#050814", zIndex: 10 }} />
      </div>

      {/* Le canal en cours, sous le telephone. */}
      {CANAUX.map((c, k) => (
        <Etiquette key={c} texte={c} debut={62 + k * 40} fin={k === 2 ? 180 : 100 + k * 40} y={1540} />
      ))}

      {/* La ligne urgente devenue notification. */}
      <div
        style={{
          position: "absolute",
          left: xPill,
          top: yPill,
          transform: `scale(${echellePill})`,
          opacity: 1 - entre(f, 56, 64, 0, 1),
          filter: `drop-shadow(0 0 ${40 * detache}px ${rouge.vif})`,
          zIndex: 50,
        }}
      >
        {morph < 0.05 ? (
          <Ligne titre={URGENTE.titre} pays={URGENTE.pays} jours={URGENTE.jours} statut={3} couleur={1} lueur={detache} />
        ) : (
          <div
            style={{
              width: largeurPill,
              height: 104 + morph * 44,
              borderRadius: 16 + morph * 58,
              background: `linear-gradient(90deg, ${rouge.vif}, #FF9A9A)`,
              boxShadow: `0 20px 60px ${rouge.vif}88`,
              display: "flex",
              alignItems: "center",
              gap: 20,
              paddingLeft: 26,
              boxSizing: "border-box",
              fontFamily: POLICE,
              color: "#3B0A0A",
              overflow: "hidden",
            }}
          >
            <div style={{ width: 64, height: 64, borderRadius: 32, background: "rgba(255,255,255,0.92)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#9B1C1C" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
            </div>
            <div style={{ whiteSpace: "nowrap" }}>
              <div style={{ fontSize: 30, fontWeight: 800 }}>URGENT · 2 jours restants</div>
              <div style={{ fontSize: 22, fontWeight: 600, opacity: 0.85 }}>{URGENTE.titre}</div>
            </div>
          </div>
        )}
      </div>

      {[60, 100, 140].map((d, k) => (
        <Onde key={k} x={540} y={970} debut={d} taille={1200} couleur={k === 0 ? rouge.vif : C.bleu} duree={TEMPS * 2} />
      ))}
    </AbsoluteFill>
  );
};
