import { AbsoluteFill, random, useCurrentFrame } from "remotion";
import { C } from "../theme";
import { Onde } from "../ui/Fond";
import { LogoAnime } from "../ui/Logo";
import { DOUX, SORTIE, entre, ressort } from "../ui/anim";
import { POLICE } from "../polices";
import { useVideoConfig } from "remotion";

/**
 * Mesures 15-16. L'impact : un eclair, une onde de choc, des particules qui
 * convergent - et le logo se pose, cette fois pour de bon. Il respire
 * jusqu'a la fin, sous un halo qui tourne.
 */
export const S7Final: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const eclair = entre(f, 0, 10, 0.85, 0);
  const halo = f * 0.8;
  const respire = Math.sin(f / 18) * 6;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      {/* Un halo conique qui tourne derriere le logo. */}
      <div
        style={{
          position: "absolute",
          width: 1300,
          height: 1300,
          borderRadius: "50%",
          background: `conic-gradient(from ${halo}deg, transparent, ${C.indigo}66, transparent 40%, ${C.bleu}55, transparent 75%)`,
          filter: "blur(60px)",
          opacity: entre(f, 4, 30, 0, 1),
        }}
      />

      {/* Des particules qui convergent vers le centre. */}
      {new Array(34).fill(0).map((_, i) => {
        const a = random(`fa${i}`) * Math.PI * 2;
        const d0 = 700 + random(`fd${i}`) * 500;
        const p = entre(f, 0, 22 + random(`ft${i}`) * 10, 0, 1, SORTIE);
        const d = d0 * (1 - p);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 540 + Math.cos(a) * d - 4,
              top: 960 + Math.sin(a) * d - 4,
              width: 8,
              height: 8,
              borderRadius: 4,
              background: C.eclat,
              boxShadow: `0 0 16px ${C.lavande}`,
              opacity: p < 1 ? 0.9 : 0,
            }}
          />
        );
      })}

      <Onde x={540} y={960} debut={0} taille={2000} couleur={C.eclat} duree={34} />
      <Onde x={540} y={960} debut={6} taille={1400} couleur={C.bleu} duree={34} />

      {/* Le logo se pose, puis remonte pour faire place a l'offre. */}
      <div
        style={{
          position: "absolute",
          top: 960 - 100 - entre(f, 34, 52, 0, 300, DOUX),
          transform: `translateY(${respire}px) scale(${1 - entre(f, 34, 52, 0, 0.18, DOUX)})`,
        }}
      >
        <LogoAnime debut={6} largeur={860} clair={!C.clair} />
      </div>

      <div style={{ position: "absolute", top: 820, left: 0, right: 0, textAlign: "center", fontFamily: POLICE }}>
        <div
          style={{
            fontSize: 112,
            fontWeight: 900,
            letterSpacing: "-0.04em",
            background: `linear-gradient(90deg, ${C.texte}, ${C.lavande})`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            opacity: entre(f, 46, 58, 0, 1),
            transform: `scale(${0.6 + 0.4 * ressort(f, 46, fps, 150, 11)})`,
          }}
        >
          Paiement unique
        </div>
        <div style={{ fontSize: 44, fontWeight: 700, color: C.lavande, marginTop: 4, opacity: entre(f, 54, 66, 0, 1) }}>
          sans abonnement · tout inclus
        </div>
        <div
          style={{
            display: "inline-block",
            marginTop: 70,
            padding: "30px 64px",
            borderRadius: 999,
            background: `linear-gradient(90deg, ${C.indigo}, ${C.bleu})`,
            boxShadow: `0 20px 60px ${C.indigo}99`,
            fontSize: 52,
            fontWeight: 800,
            color: C.blanc,
            opacity: entre(f, 62, 74, 0, 1),
            transform: `translateY(${(1 - ressort(f, 62, fps, 140, 13)) * 60}px)`,
          }}
        >
          tenderpilot.store
        </div>
        <div style={{ fontSize: 32, fontWeight: 600, color: C.texteDoux, marginTop: 40, opacity: entre(f, 72, 84, 0, 1) }}>
          Satisfait ou remboursé 30 jours
        </div>
      </div>

      <AbsoluteFill style={{ backgroundColor: C.clair ? C.indigo : C.blanc, opacity: eclair * (C.clair ? 0.18 : 1), mixBlendMode: C.clair ? "normal" : "screen" }} />
    </AbsoluteFill>
  );
};
