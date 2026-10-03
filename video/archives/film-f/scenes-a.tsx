import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "../theme";
import { POLICE } from "../polices";
import { DOUX, SORTIE, entre, ressort } from "../ui/anim";
import { TEMPS } from "../tempo";
import { Titre } from "../ui/Titre";
import { Blip, OndeSvg, Trace, TraceCercle } from "./svg";

/**
 * FILM F — les scenes. Tout ce qui bouge est un SVG : trace qui se court,
 * anneau qui se vide, faisceau qui balaie, ondes qui s'etendent.
 * La grille musicale (1 temps = 15 images) gouverne chaque arrivee.
 */

/* ============================================================ S1 — L'ECRITURE */

export const S1Ecriture: React.FC = () => {
  const f = useCurrentFrame();
  // Le soulignement "stylo" : une courbe sous le titre, tracee a la main.
  const pointe = { x: 540 - 190 * (1 - entre(f, 10, 52, 0, 1, SORTIE)), y: 690 };
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <Trace d="M 250 700 Q 540 668 830 700" debut={10} duree={42} f={f} couleur={C.lavande} epaisseur={7} pointe={pointe} />
      </svg>
      <Titre lignes={["Vous ratez des", "*appels d'offres*."]} debut={4} fin={62} y={430} taille={96} />      <Titre lignes={[
"Pas avec", "*TenderPilot*."]} debut={66} fin={1e9} y={430} taille={96} />
    </AbsoluteFill>
  );
};

/* ============================================================ S2 — LE RADAR */

// Les huit pays, projetes autour du centre Cotonou (meme repere que la carte).
const BLIPS = [
  { x: 540, y: 620, n: "Bénin" },
  { x: 470, y: 680, n: "Togo" },
  { x: 700, y: 470, n: "Niger" },
  { x: 790, y: 760, n: "Cameroun" },
  { x: 330, y: 440, n: "Burkina" },
  { x: 280, y: 700, n: "C. d'Ivoire" },
  { x: 250, y: 300, n: "Sénégal" },
  { x: 350, y: 260, n: "Mali" },
];
const CENTRE = { x: 540, y: 640 };

export const S2Radar: React.FC = () => {
  const f = useCurrentFrame();

  // Le faisceau : une rotation continue, un tour par deux temps.
  const angle = f * (360 / (TEMPS * 2));
  const balayage = angle % 360;

  const nSources = Math.round(entre(f, 80, 108, 0, 61, DOUX));

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <svg width={1080} height={1000} style={{ position: "absolute", top: 200 }}>
        {/* Les anneaux se tracent en cascade. */}
        {[140, 260, 380].map((r, i) => (
          <TraceCercle key={r} cx={540} cy={440} r={r} debut={2 + i * 8} duree={22} f={f} couleur={C.lavande} epaisseur={2.5} opacite={0.55 - i * 0.12} />
        ))}
        {/* Croix centrale. */}
        <Trace d="M 540 80 V 800" debut={6} duree={30} f={f} couleur={C.lavande} epaisseur={1.5} lueur={0.3} />
        <Trace d="M 160 440 H 920" debut={10} duree={30} f={f} couleur={C.lavande} epaisseur={1.5} lueur={0.3} />

        {/* Le faisceau : secteur qui tourne, gradient radial le long du balayage. */}
        <g transform={`rotate(${balayage} 540 440)`}>
          <path
            d={`M 540 440 L 540 60 A 380 380 0 0 1 ${540 + 380 * Math.sin((Math.PI / 180) * 42)} ${440 - 380 * Math.cos((Math.PI / 180) * 42)} Z`}
            fill={`url(#balaye)`}
            opacity={0.85}
          />
        </g>
        <defs>
          <radialGradient id="balaye" cx="100%" cy="100%" r="100%">
            <stop offset="0%" stopColor={C.lavande} stopOpacity={0.5} />
            <stop offset="100%" stopColor={C.lavande} stopOpacity={0} />
        </radialGradient>
        </defs>

        {/* Les blips : eclat = cosinus de l'ecart entre l'angle du blip et celui du balayage. */}
        {BLIPS.map((b, i) => {
          const bx = b.x - 540;
          const by = b.y - 440; // repere du radar, centre (540,440), y vers le bas
          const angleBlip = (Math.atan2(bx, -by) * 180) / Math.PI;
          let ecart = (angleBlip - balayage) % 360;
          if (ecart < 0) ecart += 360;
          const eclat = Math.max(0, Math.cos((Math.PI / 180) * ecart)) ** 8;
          return <Blip key={i} x={b.x} y={b.y} eclat={eclat} r={7} />;
        })}

        {/* Noms des pays : apparaissent une fois, puis suivent l'eclat du blip. */}
        {BLIPS.map((b, i) => {
          const nom = entre(f, 30 + i * 6, 40 + i * 6, 0, 1);
          if (nom <= 0) return null;
          return (
            <text
              key={i}
              x={b.x}
              y={b.y - 26}
              textAnchor="middle"
              fontFamily={POLICE}
              fontWeight={700}
              fontSize={26}
              fill={C.blanc}
              opacity={nom}
            >
              {b.n}
            </text>
          );
        })}
      </svg>

      {/* Le compteur de sources, cale sur la fin du balayage. */}
      <div
        style={{
          position: "absolute",
          top: 1180,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: POLICE,
          fontWeight: 900,
          fontSize: 130,
          color: C.blanc,
          letterSpacing: "-0.03em",
          opacity: entre(f, 76, 88, 0, 1),
          transform: `scale(${0.8 + 0.2 * entre(f, 76, 92, 0, 1)})`,
          textShadow: `0 0 60px ${C.indigo}`,
        }}
      >
        {nSources}
      </div>
      <div
        style={{
          position: "absolute",
          top: 1330,
          left: 100,
          right: 100,
          textAlign: "center",
          fontFamily: POLICE,
          fontWeight: 700,
          fontSize: 40,
          color: C.lavande,
          opacity: entre(f, 86, 100, 0, 1),
        }}
      >
        sources officielles, scannées pour vous
      </div>

      {/* Une onde par temps, depuis le centre. */}
      <OndeSvg cx={540} cy={640} debut={60} f={f} rMax={700} duree={50} couleur={C.indigo} />
    </AbsoluteFill>
  );
};

/* ============================================================ S3 — LA CAPTURE */

// 7 lignes reelles du classeur, comme le film A. Chaque luciole devient une ligne.
const LIGNES = [
  { titre: "Construction d'un centre de santé", pays: "Bénin", jours: 20, st: 0 },
  { titre: "Fourniture de matériel informatique", pays: "Togo", jours: 27, st: 0 },
  { titre: "Réhabilitation de forages", pays: "Niger", jours: 33, st: 0 },
  { titre: "Étude de faisabilité d'un barrage", pays: "Cameroun", jours: 12, st: 1 },
  { titre: "Travaux d'assainissement", pays: "Bénin", jours: 6, st: 2 },
  { titre: "Acquisition de véhicules", pays: "Niger", jours: 7, st: 2 },
  { titre: "Fourniture de médicaments", pays: "Togo", jours: 2, st: 3 },
];
const ST_VIF = ["#34D399", "#FBBF24", "#FB923C", "#F87171"];
const ST_NOM = ["OUVERT", "À SURVEILLER", "BIENTÔT", "URGENT"];

export const S3Capture: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>      <Titre lignes={[
"Tout arrive dans", "*un seul tableau*."]} debut={4} fin={1e9} y={210} taille={80} />

      {/* Le fil qui relie le radar (haut, disparu) au tableau : se trace a la volee. */}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <Trace d="M 540 80 C 540 200, 340 300, 400 420" debut={2} duree={26} f={f} couleur={C.indigo} epaisseur={5} lueur={0.6} />
      </svg>

      {LIGNES.map((l, i) => {
        const arrivee = 14 + i * (TEMPS / 2);
        const p = ressort(f, arrivee, fps, 150, 14);
        const teinte = entre(f, arrivee + 12, arrivee + 30, 0, 1);
        const st = l.st;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 90,
              right: 90,
              top: 500 + i * 148,
              height: 128,
              borderRadius: 22,
              background: "rgba(255,255,255,0.06)",
              border: `1.5px solid ${C.bordVerre}`,
              overflow: "hidden",
              opacity: p,
              transform: `translateY(${(1 - p) * 80}px) scale(${0.92 + 0.08 * p})`,
              filter: `blur(${(1 - p) * 6}px)`,
            }}
          >
            {/* La couleur arrive en balayage, comme le film A. */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                width: `${teinte * 100}%`,
                background: `linear-gradient(90deg, ${ST_VIF[st]}30, transparent)`,
              }}
            />
            <div style={{ position: "absolute", left: 30, top: 24, fontFamily: POLICE, fontWeight: 600, fontSize: 28, color: C.blanc, whiteSpace: "nowrap" }}>
              {l.titre}
            </div>
            <div style={{ position: "absolute", left: 30, top: 68, fontFamily: POLICE, fontWeight: 500, fontSize: 22, color: C.lavande }}>
              {l.pays} · {l.jours} jours
            </div>
            <div
              style={{
                position: "absolute",
                right: 24,
                top: 42,
                height: 44,
                padding: "0 18px",
                borderRadius: 22,
                background: ST_VIF[st],
                color: C.navy,
                fontFamily: POLICE,
                fontWeight: 800,
                fontSize: 19,
                display: "flex",
                alignItems: "center",
                letterSpacing: "0.04em",
                opacity: 0.25 + 0.75 * teinte,
                transform: `scale(${0.8 + 0.2 * teinte})`,
                boxShadow: `0 0 ${26 * teinte}px ${ST_VIF[st]}`,
              }}
            >
              {ST_NOM[st]}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
