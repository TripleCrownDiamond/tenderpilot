import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "../theme";
import { POLICE } from "../polices";
import { DOUX, SORTIE, entre, ressort } from "../ui/anim";
import { TEMPS } from "../tempo";
import { Titre } from "../ui/Titre";
import { OndeSvg, Trace } from "./svg";
import { PAYS, dedans } from "../scenes/S5Carte";

/**
 * FILM F — scenes S4 a S7. Anneau de deadline, carte en points, jauges de
 * rappel, signature. Meme regle : tout est trace SVG qui se dessine.
 */

/* ============================================================ S4 — L'ANNEAU */

export const S4Anneau: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();

  // L'anneau se vide : 14 jours -> 3 jours. Circonference : pathLength=100.
  const jours = Math.round(interpolate(f, [6, 96], [14, 3], { extrapolateRight: "clamp" }));
  const remplissage = jours / 14;
  const urgent = f >= 102;
  const vif = urgent ? "#F87171" : C.lavande;

  const pulse = urgent ? ressort(f, 102, fps, 220, 12) : 0;
  const echelleAnneau = 1 + (pulse > 0 ? Math.sin(pulse * Math.PI) * 0.06 : 0);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>      <Titre lignes={[
"L'échéance,", "*avant* qu'elle ne tombe."]} debut={4} fin={1e9} y={230} taille={74} />

      <div style={{ position: "absolute", top: 470, transform: `scale(${echelleAnneau})` }}>
        <svg width={700} height={700}>
          {/* Le fond de l'anneau. */}
          <circle cx={350} cy={350} r={280} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={34} />
          {/* L'arc qui se vide, rond, avec sa lueur. */}
          <circle
            cx={350}
            cy={350}
            r={280}
            fill="none"
            stroke={vif}
            strokeWidth={34}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={100 * remplissage}
            strokeDashoffset={0}
            transform={`rotate(-90 350 350)`}
            style={{ filter: `drop-shadow(0 0 ${30 + 40 * (urgent ? pulse : 0)}px ${vif})` }}
          />
          {/* Le compteur de jours, floute a chaque changement. */}
          <text x={350} y={385} textAnchor="middle" fontFamily={POLICE} fontWeight={900} fontSize={170} fill={C.blanc}>
            {jours}
          </text>
          <text x={350} y={470} textAnchor="middle" fontFamily={POLICE} fontWeight={700} fontSize={34} fill={C.lavande} letterSpacing="0.1em">
            JOURS
          </text>
        </svg>
        {urgent && <OndeSvg cx={350} cy={350} debut={0} f={f - 102} rMax={600} couleur="#F87171" duree={40} />}
      </div>

      {/* La notification qui tombe sur l'anneau. */}
      {f >= 116 && (
        <div
          style={{
            position: "absolute",
            top: 1100,
            left: 90,
            right: 90,
            padding: "30px 36px",
            borderRadius: 26,
            background: "rgba(255,255,255,0.96)",
            color: C.navy,
            display: "flex",
            alignItems: "center",
            gap: 24,
            transform: `translateY(${(1 - ressort(f, 116, fps, 170, 14)) * -500}px)`,
            boxShadow: "0 40px 90px rgba(0,0,0,0.5), 0 0 80px rgba(79,70,255,0.35)",
            fontFamily: POLICE,
          }}
        >
          <svg width={56} height={56} viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          <div>
            <div style={{ fontWeight: 800, fontSize: 32 }}>Rappel J-3 envoyé</div>
            <div style={{ fontSize: 24, color: "#6B7280", marginTop: 4 }}>« Fourniture de médicaments » — il reste 3 jours.</div>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

/* ============================================================ S5 — LA CARTE */

const ECH = 12;
const cx = (lon: number) => 560 + (lon - 17) * ECH;
const cy = (lat: number) => 1050 - (lat - 1) * ECH;
const POINTS = (() => {
  const pts: { x: number; y: number; d: number }[] = [];
  for (let lat = 20; lat > -2; lat -= 1.5) {
    for (let lon = -18; lon < 18; lon += 1.5) {
      if (dedans(lon, lat)) pts.push({ x: cx(lon), y: cy(lat), d: Math.hypot(lon - 2.3, lat - 9.5) });
    }
  }
  return pts;
})();

export const S5CarteF: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const front = entre(f, 4, 40, 0, 26);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <Titre lignes={[
"D'un pays à", "*huit pays*."]} debut={4} fin={1e9} y={230} taille={84} />

      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {POINTS.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={6} fill={C.lavande} opacity={p.d < front ? 0.7 : 0} />
        ))}

        {/* L'onde part du Benin, chaque pays s'allume a son tour. */}
        <OndeSvg cx={cx(2.3)} cy={cy(9.5)} debut={8} f={f} rMax={520} couleur={C.indigo} duree={44} epaisseur={5} />
        {PAYS.map((p, i) => {
          const s = ressort(f, 20 + i * 5, fps, 230, 13);
          const pulse = ((f - 20 - i * 5) % 40) / 40;
          return (
            <g key={p.code}>
              <circle cx={cx(p.lon)} cy={cy(p.lat)} r={26 * pulse + 8} fill="none" stroke={C.indigo} strokeWidth={3} opacity={f > 20 + i * 5 ? (1 - pulse) * 0.55 : 0} />
              <circle cx={cx(p.lon)} cy={cy(p.lat)} r={12 * s} fill={C.indigo} />
              <text x={cx(p.lon)} y={cy(p.lat) - 26} textAnchor="middle" fontFamily={POLICE} fontWeight={700} fontSize={24} fill={C.blanc} opacity={entre(f, 22 + i * 5, 32 + i * 5, 0, 1)}>
                {p.nom}
              </text>
            </g>
          );
        })}
      </svg>

      <div
        style={{
          position: "absolute",
          top: 1500,
          left: 100,
          right: 100,
          textAlign: "center",
          fontFamily: POLICE,
          fontWeight: 800,
          fontSize: 44,
          color: C.blanc,
          opacity: entre(f, 84, 98, 0, 1),
        }}
      >
        8 pays suivis — et l'international.
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================ S6 — LES JAUGES */

const ETAPES = [
  { j: "J-7", texte: "Une semaine avant — le temps de préparer.", vif: "#34D399" },
  { j: "J-3", texte: "Trois jours avant — le dossier se boucle.", vif: "#FBBF24" },
  { j: "J-1", texte: "La veille — le dernier rappel.", vif: "#F87171" },
];

export const S6Jauges: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fusion = entre(f, 92, 120, 0, 1, DOUX);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>      <Titre lignes={[
"Rappels avant", "*chaque échéance*."]} debut={4} fin={1e9} y={280} taille={80} />

      {ETAPES.map((e, i) => {
        const debut = 10 + i * (TEMPS / 2);
        const remplissage = entre(f, debut, debut + 34, 0, 1, SORTIE);
        return (
          <div
            key={e.j}
            style={{
              position: "absolute",
              left: 90,
              right: 90,
              top: 560 + i * 230,
              transform: `translateY(${fusion * (230 * (1 - i) - 60)}px) scale(${1 - fusion * 0.18})`,
              opacity: 1 - fusion * 0.4,
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginBottom: 14, opacity: entre(f, debut, debut + 8, 0, 1) }}>
              <span style={{ fontFamily: POLICE, fontWeight: 900, fontSize: 52, color: e.vif }}>{e.j}</span>
              <span style={{ fontFamily: POLICE, fontWeight: 600, fontSize: 28, color: C.lavande }}>{e.texte}</span>
            </div>
            {/* La jauge : un rect SVG qui se remplit. */}
            <svg width={900} height={22}>
              <rect x={0} y={0} width={900} height={22} rx={11} fill="rgba(255,255,255,0.09)" />
              <rect x={0} y={0} width={900 * remplissage} height={22} rx={11} fill={e.vif} style={{ filter: `drop-shadow(0 0 14px ${e.vif})` }} />
            </svg>
          </div>
        );
      })}

      {/* La fusion : trois jauges deviennent la ligne des trois canaux. */}
      <div
        style={{
          position: "absolute",
          top: 560 + 460 + 60,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: POLICE,
          fontWeight: 800,
          fontSize: 46,
          color: C.blanc,
          opacity: fusion,
          transform: `scale(${0.8 + 0.2 * fusion})`,
        }}
      >
        Email · Telegram · Agenda
      </div>
      <div
        style={{
          position: "absolute",
          top: 1330,
          left: 100,
          right: 100,
          textAlign: "center",
          fontFamily: POLICE,
          fontWeight: 600,
          fontSize: 30,
          color: C.lavande,
          opacity: fusion,
        }}
      >
        Trois canaux, une seule alerte à la fois.
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================ S7 — LA SIGNATURE */

export const S7Signature: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();

  const prix = ressort(f, 50, fps, 160, 14);
  const urlP = entre(f, 84, 122, 0, 1, SORTIE);
  const pointeUrl = { x: 540 - 180 * (1 - urlP), y: 1465 };

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      {/* Le logo, reprise de la brique existante. */}
      <div style={{ position: "absolute", top: 430, display: "flex", justifyContent: "center", width: "100%" }}>
        <LogoF />
      </div>

      {/* Le prix. */}
      <div
        style={{
          position: "absolute",
          top: 800,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: POLICE,
          fontWeight: 900,
          fontSize: 112,
          color: C.blanc,
          letterSpacing: "-0.03em",
          opacity: prix,
          transform: `translateY(${(1 - prix) * 60}px)`,
          textShadow: `0 0 80px ${C.indigo}`,
        }}
      >
        Paiement unique
      </div>
      <div
        style={{
          position: "absolute",
          top: 1000,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: POLICE,
          fontWeight: 600,
          fontSize: 36,
          color: C.lavande,
          opacity: entre(f, 66, 80, 0, 1),
        }}
      >
        sans abonnement — tout inclus
      </div>
      {/* Le soulignement du prix, trace au stylo. */}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <Trace d="M 320 990 Q 540 962 760 990" debut={62} duree={26} f={f} couleur={C.lavande} epaisseur={6} pointe={null} />
        {/* L'URL s'ecrit, pointe lumineuse. */}
        <Trace d="M 360 1465 Q 540 1444 720 1465" debut={86} duree={36} f={f} couleur={C.bleu} epaisseur={6} pointe={pointeUrl} />
      </svg>

      {/* L'URL elle-meme, revelee derriere un masque qui s'ouvre. */}
      <div
        style={{
          position: "absolute",
          top: 1380,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: POLICE,
          fontWeight: 800,
          fontSize: 84,
          color: C.blanc,
          letterSpacing: "-0.01em",
          clipPath: `inset(0 ${(1 - urlP) * 50}% 0 ${(1 - urlP) * 50}%)`,
        }}
      >
        tenderpilot.store
      </div>
      <div
        style={{
          position: "absolute",
          top: 1560,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: POLICE,
          fontWeight: 700,
          fontSize: 30,
          color: C.lavande,
          opacity: entre(f, 108, 122, 0, 1),
        }}
      >
        Satisfait ou remboursé 30 jours
      </div>
    </AbsoluteFill>
  );
};

/** Le logo pose, sans l'animation d'entree du film A (plus sobre ici). */
const LogoF: React.FC = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <Img src={staticFile("icone-clair.png")} style={{ height: 130 }} />
    <Img src={staticFile("mot-clair.png")} style={{ height: 130 }} />
  </div>
);
