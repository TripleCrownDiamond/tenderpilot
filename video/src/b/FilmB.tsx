import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  interpolateColors,
  random,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { chargerPolices, POLICE } from "../polices";
import { STATUTS } from "../theme";
import { ACCELERE, DOUX, SORTIE, entre, ressort } from "../ui/anim";
import { LIGNES } from "../scenes/S3Tableau";
import { Aicha, mains, melange, Pose, REPOS } from "./Aicha";
import { Avion, Confettis, Fenetre, Horloge, Journal, Nuage, Ordi, Tampon, Tasse } from "./Decor";
import { TitreB } from "./TitreB";
import { AFFICHE, B } from "./themeB";
import { SCENES as S, TEMPS } from "./tempoB";

chargerPolices();

/**
 * FILM B - « Aicha ». Le film A montrait le produit ; celui-ci raconte une
 * journee. Un seul plan continu : le bureau d'Aicha, que la camera ne quitte
 * pas, et dont la lumiere change avec l'histoire - brume le matin, gris quand
 * l'avis lui echappe, ciel quand l'avion en papier arrive. Seule la fin sort
 * du bureau, sur le jaune du surligneur.
 */

// Le personnage dans le plan : buste de 640 px, bureau a y = 1580.
const K = 1.6;
const PX = 220;
const PY = 960;
const BUREAU = PY + 452 * K; // juste sous les mains posees
const plan = (x: number, y: number) => ({ x: PX + x * K, y: PY + y * K });

// ---------------------------------------------------------------- POSES

const P = (p: Partial<Pose>): Pose => ({ ...REPOS, ...p });
const LIT = P({ bras: mains(92, 404, 308, 404), tete: -4, regardY: 1 });
const LIT2 = P({ bras: mains(96, 400, 304, 408), tete: 4, regardY: 1, regardX: 0.4 });
const AG_G = P({ bras: mains(138, 432, 264, 438), tete: -12, regardX: -1, regardY: -0.3, humeur: "stress", sourcils: -1 });
const AG_D = P({ bras: mains(136, 438, 262, 432), tete: 12, regardX: 1, regardY: -0.3, humeur: "stress", sourcils: -1 });
const FIGEE = P({ bras: mains(126, 424, 274, 424), humeur: "surprise", sourcils: 1, regardY: -1, regardX: 0.3 });
const ABATTUE = P({ bras: mains(150, 444, 250, 444), tete: -7, baisse: 26, humeur: "triste", sourcils: -1, cligne: 0.45, regardY: 1 });
const EVEIL = P({ bras: mains(116, 412, 284, 412), humeur: "surprise", sourcils: 1, regardY: -1 });
const CONTENTE = P({ bras: mains(140, 436, 260, 436), humeur: "sourire", sourcils: 0.5 });
const SIROTE = P({ bras: mains(174, 404, 226, 404), humeur: "sourire", cligne: 0.85, tete: 5, sourcils: 0.3 });
const REGARDE = P({ bras: mains(140, 436, 260, 436), humeur: "sourire", sourcils: 0.6, regardY: -1, regardX: 0.2 });
const POUCE = P({ bras: mains(140, 436, 356, 226), humeur: "joie", sourcils: 1, tete: -4, regardX: 0.5, regardY: -0.8 });
const FETE = P({ bras: mains(14, 100, 386, 100), humeur: "joie", sourcils: 1 });

// [image, pose] : entre deux cles, la pose glisse avec la courbe SORTIE.
const CLES: [number, Pose][] = [
  [0, LIT], [44, LIT2], [92, LIT], [124, LIT2],
  [136, AG_G], [152, AG_D], [168, AG_G], [184, AG_D], [200, AG_G], [216, AG_D], [232, AG_G], [248, AG_D],
  [258, FIGEE], [284, FIGEE], [304, ABATTUE], [386, ABATTUE],
  [396, EVEIL], [432, CONTENTE], [512, CONTENTE],
  [532, SIROTE], [630, SIROTE], [650, REGARDE], [738, REGARDE], [748, POUCE], [800, POUCE],
];

const poseA = (f: number): Pose => {
  if (f <= CLES[0][0]) return CLES[0][1];
  for (let i = 0; i < CLES.length - 1; i++) {
    const [a, pa] = CLES[i];
    const [b, pb] = CLES[i + 1];
    if (f <= b) return melange(pa, pb, entre(f, a, b, 0, 1, i >= 4 && i < 12 ? DOUX : SORTIE));
  }
  return CLES[CLES.length - 1][1];
};

// Elle cligne des yeux : un personnage qui ne cligne jamais fait poupee.
const CLIGNE = [38, 110, 226, 350, 450, 486, 600, 700, 820, 900];
const cligne = (f: number) => Math.max(0, ...CLIGNE.map((c) => 1 - Math.abs(f - c) / 3));

// -------------------------------------------------------- L'AVION (S4)

// La trajectoire : il entre par la droite, fait le tour d'Aicha, et monte
// se poser la ou le logo va naitre.
const VOL: [number, number][] = [
  [1300, 700], [860, 900], [560, 1000], [250, 1220], [420, 1540], [800, 1460], [880, 1080], [640, 660], [300, 400],
];
const DEBUT_VOL = S.copilote - 2;
const FIN_VOL = S.copilote + 88;
const catmull = (t: number) => {
  const n = VOL.length - 1;
  const u = Math.min(n - 1e-6, Math.max(0, t * n));
  const i = Math.floor(u);
  const k = u - i;
  const p0 = VOL[Math.max(0, i - 1)], p1 = VOL[i], p2 = VOL[i + 1], p3 = VOL[Math.min(n, i + 2)];
  const c = (a: number, b: number, cc: number, d: number) =>
    0.5 * (2 * b + (-a + cc) * k + (2 * a - 5 * b + 4 * cc - d) * k * k + (-a + 3 * b - 3 * cc + d) * k * k * k);
  return { x: c(p0[0], p1[0], p2[0], p3[0]), y: c(p0[1], p1[1], p2[1], p3[1]) };
};
const vol = (f: number) => catmull(entre(f, DEBUT_VOL, FIN_VOL, 0, 1, DOUX));

// ------------------------------------------------------------- DONNEES

const SITES = [
  "Banque mondiale", "PNUD", "AFD", "ARMP Cameroun", "DNCCP Togo", "Enabel", "GIZ", "UNICEF",
  "Marchés publics", "Journal officiel", "TED · UE", "Niger Marchés", "Expertise France", "BAD", "UNGM", "JobRelais",
];
const TEINTES = [B.marque, B.corail, B.soleil, B.menthe, "#7B61FF", "#00A3C4"];
const PLACES_FENETRES: [number, number, number][] = [
  [40, 470, -6], [770, 500, 5], [420, 560, 3], [-60, 760, 4], [830, 770, -7], [600, 800, 6],
  [120, 980, -3], [860, 1030, 4], [300, 700, -5], [700, 1180, -4], [-40, 1180, 6], [500, 1000, 2],
  [180, 560, 7], [880, 620, -3], [60, 1340, -5], [820, 1330, 5],
];
const RANGEES = [LIGNES[0], LIGNES[4], LIGNES[3], LIGNES[5], LIGNES[6], LIGNES[7]];

// ================================================================ FILM

export const FilmB: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pose = poseA(f);
  const avion = vol(f);
  // Pendant le vol, ses yeux suivent l'avion.
  const suit = entre(f, S.copilote, S.copilote + 6, 0, 1) * (1 - entre(f, FIN_VOL - 10, FIN_VOL, 0, 1));
  const visage: Pose = {
    ...pose,
    regardX: pose.regardX * (1 - suit) + Math.max(-1, Math.min(1, (avion.x - 540) / 300)) * suit,
    regardY: pose.regardY * (1 - suit) + Math.max(-1, Math.min(1, (avion.y - 1290) / 300)) * suit,
    cligne: Math.max(pose.cligne, cligne(f)),
    // Des que TenderPilot est la, elle hoche la tete sur le temps.
    baisse: pose.baisse + (f > S.copilote + 40 && f < S.fin ? 5 * Math.abs(Math.sin((Math.PI * f) / TEMPS)) : 0),
  };
  const retard = poseA(f - 4).tete - pose.tete;
  const souffle = Math.sin(f / 22) * 3;

  // --- LUMIERE : brume, puis gris, puis le ciel s'ouvre depuis l'avion.
  const fondProbleme = interpolateColors(f, [0, 252, 270], [B.brume, B.brume, B.gris]);
  const astre = interpolateColors(f, [0, 124, 140, 250, 266], [B.soleil, B.soleil, B.corail, B.corail, "#B7BDCB"]);
  const ciel = entre(f, S.copilote, S.copilote + 26, 0, 2600, SORTIE);
  const battement = 1 + 0.025 * Math.max(0, Math.cos((Math.PI * 2 * f) / TEMPS)) * (f < S.cloture || f > S.copilote ? 1 : 0);

  // --- CAMERA : lente poussee, recul pour le tableau, secousse au tampon.
  const cam = {
    s: interpolate(f, [0, 252, 262, 380, S.copilote, S.copilote + 16, S.tableau, S.tableau + 24, 800], [1, 1.05, 1.0, 1.07, 1.07, 1, 1, 0.8, 0.8], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
    y: interpolate(f, [S.tableau, S.tableau + 24], [0, 230], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: DOUX }),
    x: Math.sin(f * 2.3) * entre(f, 290, 304, 22, 0),
  };

  // --- CE QU'ELLE TIENT : le journal (S1), la tasse (S5).
  const page = f < 48 ? 0 : f < 96 ? 1 : 2;
  const tourne = [44, 92].reduce((acc, c) => (f >= c && f < c + 8 ? Math.cos(((f - c) / 8) * Math.PI) : acc), 1);
  const lache = entre(f, 128, 140, 0, 1, ACCELERE);
  const tasse = ressort(f, S.tableau + 14, fps, 180, 14) * (1 - entre(f, S.rappels, S.rappels + 10, 0, 1));
  const tenu = (
    <>
      {lache < 1 && (
        <foreignObject x={80} y={296} width={240} height={160} style={{ transform: `translateY(${lache * 200}px)`, opacity: 1 - lache }}>
          <div style={{ transform: `scaleX(${tourne})`, transformOrigin: "50% 50%" }}>
            <Journal l={240} h={160} page={page} />
          </div>
        </foreignObject>
      )}
      {tasse > 0.01 && (
        <foreignObject x={146} y={310} width={110} height={130}>
          <div style={{ transform: `scale(${tasse * 0.9})`, transformOrigin: "50% 100%" }}>
            <Tasse t={f} />
          </div>
        </foreignObject>
      )}
    </>
  );

  // --- LA PILE DE JOURNAUX, qui monte a chaque temps puis part avec l'avion.
  const pile = Array.from({ length: 8 }, (_, i) => {
    const arrivee = 6 + i * TEMPS;
    const p = ressort(f, arrivee, fps, 220, 13);
    return { i, p, visible: f >= arrivee };
  });
  const balaye = entre(f, S.copilote + 18, S.copilote + 36, 0, 1, ACCELERE);

  // --- ENTREES ET SORTIES DES ACCESSOIRES
  const horloge = 1 - entre(f, S.copilote + 4, S.copilote + 14, 0, 1);
  const tours = f < S.cloture ? f / 9 : S.cloture / 9;
  const nuage = ressort(f, 300, fps, 160, 12) * (1 - entre(f, S.copilote, S.copilote + 8, 0, 1));
  const goutte = f > S.onglets + 8 && f < S.cloture ? ((f - S.onglets) % 32) / 32 : -1;

  const tete = plan(200, 60);
  const ordi = { x: 772, y: BUREAU - 196 };
  const fin = entre(f, S.fin, S.fin + 22, 0, 2600, SORTIE);

  return (
    <AbsoluteFill style={{ background: fondProbleme, overflow: "hidden" }}>
      {/* ------------------------------------------------ LE DECOR */}
      <div style={{ position: "absolute", left: 540 - 430, top: 1350 - 430, width: 860, height: 860, borderRadius: "50%", background: astre, transform: `scale(${battement})` }} />
      <AbsoluteFill style={{ clipPath: `circle(${ciel}px at 1080px 620px)`, background: B.ciel }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `radial-gradient(${B.lilas} 3px, transparent 3.5px)`,
            backgroundSize: "54px 54px",
            opacity: 0.55,
          }}
        />
        <div style={{ position: "absolute", left: 110, top: 920 - cam.y * 0.4, width: 860, height: 860, borderRadius: "50%", background: B.lilas, transform: `scale(${battement})` }} />
        <div style={{ position: "absolute", left: 820, top: 600 - cam.y * 0.2, width: 190, height: 190, borderRadius: "50%", background: B.soleil, opacity: 1 - entre(f, S.tableau, S.tableau + 16, 0, 1) }} />
      </AbsoluteFill>

      {/* ------------------------------------------------ LA SCENE, SOUS LA CAMERA */}
      <AbsoluteFill style={{ transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.s})`, transformOrigin: "540px 1400px" }}>
        <div style={{ position: "absolute", left: 770, top: 640, opacity: horloge, transform: `scale(${horloge})` }}>
          <Horloge taille={180} tours={tours} />
        </div>

        <div style={{ position: "absolute", left: PX, top: PY + souffle }}>
          <Aicha pose={visage} largeur={400 * K} retard={retard} tenu={tenu} />
        </div>

        {/* Le bureau, plus large que l'image : la camera recule. */}
        <div style={{ position: "absolute", left: -400, top: BUREAU, width: 1880, height: 700, background: B.bois }}>
          <div style={{ height: 26, background: "#2E4887" }} />
        </div>

        <div style={{ position: "absolute", left: ordi.x, top: ordi.y }}>
          <Ordi sticker={ressort(f, S.copilote + 60, fps, 160, 11)} />
        </div>

        {pile.map(({ i, p, visible }) =>
          visible ? (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 64 + (random(`px${i}`) - 0.5) * 20 - balaye * (700 + i * 40),
                top: BUREAU - 26 - i * 24 - (1 - p) * 700,
                transform: `rotate(${(random(`pr${i}`) - 0.5) * 7 - balaye * 60}deg)`,
                opacity: 1 - balaye,
              }}
            >
              <div style={{ width: 240, height: 26, borderRadius: 4, background: i % 2 ? "#F4F4EF" : "#E6E6DE", boxShadow: "inset 0 -4px 0 rgba(11,27,63,0.12)" }} />
            </div>
          ) : null,
        )}

        {goutte >= 0 && (
          <div
            style={{
              position: "absolute",
              left: tete.x + 150,
              top: tete.y + 170 + goutte * 60,
              width: 22,
              height: 30,
              borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
              background: "#7CC4FF",
              opacity: 1 - goutte,
            }}
          />
        )}

        {nuage > 0.01 && (
          <div style={{ position: "absolute", left: 410, top: 870, transform: `scale(${nuage})`, transformOrigin: "50% 100%" }}>
            <Nuage t={f} />
          </div>
        )}
      </AbsoluteFill>

      {/* ------------------------------------------------ S1 : CHAQUE MATIN */}
      <TitreB lignes={["Chaque matin,", "_la même course._"]} debut={4} fin={126} />
      {f < S.onglets + 10 && (
        <div
          style={{
            position: "absolute",
            left: 70,
            top: 1250,
            transform: `scale(${ressort(f, 40, fps, 200, 12)}) rotate(-6deg)`,
            opacity: 1 - entre(f, S.onglets, S.onglets + 8, 0, 1),
            fontFamily: AFFICHE,
            fontWeight: 800,
            fontSize: 40,
            color: "#fff",
            background: B.corail,
            padding: "12px 24px",
            borderRadius: 999,
            boxShadow: "0 12px 30px rgba(255,106,77,0.4)",
          }}
        >
          ≈ 500 F / jour
        </div>
      )}

      {/* ------------------------------------------------ S2 : SOIXANTE SITES */}
      <TitreB lignes={["60 sites à ouvrir.", "_Zéro temps._"]} debut={S.onglets + 4} fin={S.cloture - 4} surligne="#FFB4A6" />
      {f >= S.onglets && f < S.cloture + 50 &&
        PLACES_FENETRES.map(([x, y, r], i) => {
          const d = S.onglets + 8 + i * 6;
          const p = ressort(f, d, fps, 230, 12);
          const chute = Math.max(0, f - S.cloture - i * 0.8);
          if (f < d) return null;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: x,
                top: y + 0.9 * chute * chute + Math.sin((f + i * 9) / 7) * 5,
                transform: `scale(${p}) rotate(${r + chute * (i % 2 ? 3 : -3)}deg)`,
                zIndex: 5,
              }}
            >
              <Fenetre nom={SITES[i]} teinte={TEINTES[i % TEINTES.length]} />
            </div>
          );
        })}
      {f >= S.onglets + 6 && f < S.cloture + 30 && (
        <div
          style={{
            position: "absolute",
            left: 76,
            top: 1330,
            zIndex: 6,
            transform: `scale(${ressort(f, S.onglets + 6, fps, 200, 13)}) translateY(${Math.max(0, f - S.cloture) ** 2 * 0.9}px)`,
            transformOrigin: "0 50%",
            display: "flex",
            alignItems: "center",
            gap: 16,
            background: B.encre,
            color: "#fff",
            borderRadius: 24,
            padding: "14px 26px",
            fontFamily: POLICE,
          }}
        >
          <span style={{ fontFamily: AFFICHE, fontSize: 64, fontWeight: 800, fontVariantNumeric: "tabular-nums", minWidth: 80 }}>
            {Math.round(entre(f, S.onglets + 8, S.cloture - 20, 1, 60, DOUX))}
          </span>
          <span style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.15 }}>
            onglets
            <br />
            ouverts
          </span>
        </div>
      )}

      {/* ------------------------------------------------ S3 : CLOTURE */}
      <TitreB lignes={["L'avis parfait ?", "_Clôturé hier._"]} debut={S.cloture + 6} fin={S.copilote - 2} surligne="#FFB4A6" />
      {f >= S.cloture && f < S.copilote + 20 && (
        <div
          style={{
            position: "absolute",
            left: 150,
            top: 470 - (1 - ressort(f, S.cloture + 8, fps, 150, 14)) * 900 + entre(f, S.copilote, S.copilote + 18, 0, 1400, ACCELERE),
            width: 780,
            transform: `rotate(${-2 + entre(f, S.copilote, S.copilote + 18, 0, 25)}deg)`,
            background: B.papier,
            borderRadius: 30,
            padding: "34px 40px",
            boxSizing: "border-box",
            boxShadow: "0 30px 70px rgba(11,27,63,0.22)",
            fontFamily: POLICE,
            zIndex: 8,
          }}
        >
          <div style={{ display: "inline-block", fontSize: 22, fontWeight: 800, letterSpacing: "0.12em", color: B.marque, background: B.ciel, padding: "6px 14px", borderRadius: 999 }}>
            APPEL D'OFFRES
          </div>
          <div style={{ fontFamily: AFFICHE, fontSize: 54, fontWeight: 800, color: B.encre, lineHeight: 1.05, marginTop: 16, letterSpacing: "-0.02em" }}>
            Construction d'un centre de santé
          </div>
          <div style={{ fontSize: 26, color: "#5B6785", marginTop: 14 }}>Ministère de la Santé</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: B.corail, marginTop: 10 }}>Date limite : hier, 17 h 00</div>
          <div
            style={{
              position: "absolute",
              right: 30,
              bottom: 40,
              transform: `scale(${1 + 2.2 * (1 - ressort(f, 288, fps, 380, 20))}) rotate(-13deg)`,
              opacity: entre(f, 288, 291, 0, 1),
            }}
          >
            <Tampon texte="CLÔTURÉ" couleur="#E23B2E" taille={70} />
          </div>
        </div>
      )}

      {/* ------------------------------------------------ S4 : LE COPILOTE */}
      {f >= DEBUT_VOL && f < FIN_VOL + 2 && (
        <>
          <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, zIndex: 9 }}>
            <path
              d={Array.from({ length: 30 }, (_, k) => {
                const q = vol(f - 29 + k);
                return `${k ? "L" : "M"} ${q.x} ${q.y}`;
              }).join(" ")}
              fill="none"
              stroke={B.marque}
              strokeWidth={6}
              strokeDasharray="4 18"
              strokeLinecap="round"
              opacity={0.55}
            />
          </svg>
          {(() => {
            const a = vol(f - 1);
            const b = vol(f + 1);
            const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
            return (
              <div style={{ position: "absolute", left: avion.x - 60, top: avion.y - 48, transform: `rotate(${angle + 20}deg)`, zIndex: 10 }}>
                <Avion taille={120} />
              </div>
            );
          })()}
        </>
      )}
      {f >= FIN_VOL - 6 && f < S.tableau + 12 && (
        <div style={{ position: "absolute", top: 250, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 26, transform: `translateY(${-entre(f, S.tableau - 6, S.tableau + 8, 0, 500, ACCELERE)}px)` }}>
          <div
            style={{
              fontFamily: POLICE,
              fontWeight: 800,
              fontSize: 30,
              letterSpacing: "0.22em",
              color: B.marque,
              opacity: entre(f, FIN_VOL, FIN_VOL + 10, 0, 1),
              transform: `translateY(${entre(f, FIN_VOL, FIN_VOL + 10, 20, 0)}px)`,
            }}
          >
            SON NOUVEAU COPILOTE
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Img src={staticFile("icone-fonce.png")} style={{ height: 170, transform: `scale(${ressort(f, FIN_VOL - 6, fps, 200, 11)})` }} />
            <div style={{ overflow: "hidden", width: entre(f, FIN_VOL + 2, FIN_VOL + 18, 0, 560), height: 170 }}>
              <Img src={staticFile("mot-fonce.png")} style={{ height: 170 }} />
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------ S5 : UN SEUL TABLEAU */}
      <TitreB lignes={["_61 sources._", "Un seul tableau."]} debut={S.tableau + 8} fin={S.rappels - 2} y={150} />
      {f >= S.tableau && f < S.rappels + 14 && (
        <>
          {SITES.slice(0, 12).map((nom, i) => {
            const ang = (i / 12) * Math.PI * 2;
            const dx = 540 + Math.cos(ang) * 620;
            const dy = 940 + Math.sin(ang) * 400;
            const p = entre(f, S.tableau + 10 + i * 3, S.tableau + 26 + i * 3, 0, 1, ACCELERE);
            if (p >= 1) return null;
            return (
              <div
                key={nom}
                style={{
                  position: "absolute",
                  left: dx + (540 - dx) * p,
                  top: dy + (620 - dy) * p,
                  transform: `translate(-50%, -50%) scale(${1 - p * 0.6})`,
                  opacity: entre(f, S.tableau + i * 2, S.tableau + 6 + i * 2, 0, 1) * (1 - p * 0.5),
                  fontFamily: POLICE,
                  fontWeight: 800,
                  fontSize: 26,
                  color: B.encre,
                  background: B.papier,
                  borderRadius: 999,
                  padding: "12px 22px",
                  whiteSpace: "nowrap",
                  boxShadow: "0 10px 26px rgba(11,27,63,0.14)",
                  zIndex: 12,
                }}
              >
                {nom}
              </div>
            );
          })}
          <div
            style={{
              position: "absolute",
              left: 90,
              top: 520,
              width: 900,
              transform: `translateY(${(1 - ressort(f, S.tableau + 16, fps, 150, 15)) * 1200 + entre(f, S.rappels, S.rappels + 14, 0, -1500, ACCELERE)}px)`,
              background: B.papier,
              borderRadius: 36,
              padding: "28px 30px 18px",
              boxSizing: "border-box",
              boxShadow: "0 40px 90px rgba(0,56,176,0.2)",
              fontFamily: POLICE,
              zIndex: 11,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <Img src={staticFile("icone-fonce.png")} style={{ height: 44 }} />
              <div style={{ fontSize: 30, fontWeight: 800, color: B.encre, flex: 1 }}>Mes appels d'offres</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 20, fontWeight: 700, color: B.menthe }}>
                <span style={{ width: 12, height: 12, borderRadius: 6, background: B.menthe }} /> à jour · 08:00
              </div>
            </div>
            {RANGEES.map((l, i) => {
              const st = STATUTS[l.st];
              const p = entre(f, S.tableau + 30 + i * 6, S.tableau + 44 + i * 6, 0, 1);
              return (
                <div
                  key={l.titre}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 18,
                    padding: "16px 4px",
                    borderTop: "2px solid #EEF1F7",
                    opacity: p,
                    transform: `translateX(${(1 - p) * 80}px)`,
                  }}
                >
                  <div style={{ width: 10, height: 44, borderRadius: 5, background: st.vif }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 27, fontWeight: 700, color: B.encre, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.titre}</div>
                    <div style={{ fontSize: 21, color: "#6B7690" }}>{l.pays}</div>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: st.encre, background: st.fond, padding: "8px 16px", borderRadius: 999, fontVariantNumeric: "tabular-nums" }}>
                    J-{l.jours}
                  </div>
                </div>
              );
            })}
          </div>
          <div
            style={{
              position: "absolute",
              left: 850,
              top: 470,
              width: 170,
              height: 170,
              borderRadius: "50%",
              background: B.marque,
              color: "#fff",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              transform: `scale(${ressort(f, S.tableau + 52, fps, 220, 11) * (1 - entre(f, S.rappels, S.rappels + 8, 0, 1))}) rotate(8deg)`,
              boxShadow: "0 16px 40px rgba(0,80,240,0.4)",
              zIndex: 13,
            }}
          >
            <div style={{ fontFamily: AFFICHE, fontSize: 76, fontWeight: 800, lineHeight: 1 }}>61</div>
            <div style={{ fontFamily: POLICE, fontSize: 22, fontWeight: 700 }}>sources</div>
          </div>
        </>
      )}

      {/* ------------------------------------------------ S6 : LES RAPPELS */}
      <TitreB lignes={["Rappel à J-7,", "_J-3 et la veille._"]} debut={S.rappels + 6} fin={S.fin - 2} y={150} />
      {f >= S.rappels && f < S.fin + 24 && (() => {
        const monte = ressort(f, S.rappels + 4, fps, 130, 15);
        const notifs = [
          { d: S.rappels + 22, quand: "J-7", titre: "Étude de faisabilité d'un barrage", st: STATUTS[1] },
          { d: S.rappels + 22 + TEMPS * 2, quand: "J-3", titre: "Travaux d'assainissement", st: STATUTS[2] },
          { d: S.rappels + 22 + TEMPS * 4, quand: "Demain", titre: "Fourniture de médicaments", st: STATUTS[3] },
        ];
        const vibre = notifs.reduce((a, n) => a + (f >= n.d && f < n.d + 8 ? Math.sin((f - n.d) * 3) * 2.5 : 0), 0);
        const depose = S.rappels + 22 + TEMPS * 6 - 4;
        return (
          <div
            style={{
              position: "absolute",
              left: 290,
              top: 450 + (1 - monte) * 1500,
              width: 500,
              height: 800,
              borderRadius: 70,
              background: B.encre,
              padding: 16,
              boxSizing: "border-box",
              transform: `rotate(${3 + vibre}deg)`,
              boxShadow: "0 50px 100px rgba(11,27,63,0.35)",
              zIndex: 14,
            }}
          >
            <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 56, overflow: "hidden", background: `linear-gradient(170deg, ${B.lilas}, #F4F7FF 70%)`, fontFamily: POLICE }}>
              <div style={{ position: "absolute", left: 180, top: 18, width: 108, height: 30, borderRadius: 15, background: B.encre }} />
              <div style={{ textAlign: "center", marginTop: 74, fontFamily: AFFICHE, fontSize: 104, fontWeight: 700, color: B.encre, lineHeight: 1, letterSpacing: "-0.03em" }}>08:00</div>
              <div style={{ textAlign: "center", fontSize: 22, fontWeight: 600, color: "#4B5877", marginTop: 6 }}>Lundi 28 septembre</div>
              <div style={{ position: "absolute", left: 16, right: 16, top: 240, display: "flex", flexDirection: "column-reverse", gap: 12 }}>
                {notifs.map((n) => {
                  const p = ressort(f, n.d, fps, 200, 14);
                  if (f < n.d) return null;
                  return (
                    <div
                      key={n.quand}
                      style={{
                        background: "rgba(255,255,255,0.96)",
                        borderRadius: 24,
                        padding: "14px 16px",
                        display: "flex",
                        gap: 12,
                        alignItems: "center",
                        boxShadow: "0 8px 20px rgba(11,27,63,0.1)",
                        transform: `translateY(${(1 - p) * -60}px) scale(${0.9 + 0.1 * p})`,
                        opacity: p,
                      }}
                    >
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: B.ciel, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Img src={staticFile("icone-fonce.png")} style={{ height: 30 }} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 16, fontWeight: 800, color: n.st.encre, background: n.st.fond, padding: "2px 10px", borderRadius: 999 }}>{n.quand}</span>
                          <span style={{ fontSize: 16, color: "#7A849C", fontWeight: 600 }}>TenderPilot</span>
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: B.encre, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.titre}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 70,
                  textAlign: "center",
                  transform: `scale(${1 + 1.8 * (1 - ressort(f, depose, fps, 380, 20))}) rotate(-10deg)`,
                  opacity: entre(f, depose, depose + 3, 0, 1),
                }}
              >
                <Tampon texte="DÉPOSÉ ✓" couleur={B.menthe} taille={60} />
              </div>
            </div>
          </div>
        );
      })()}

      {/* ------------------------------------------------ S7 : LA FIN, AU SOLEIL */}
      {f >= S.fin && <Fin f={f} fps={fps} rayon={fin} />}

      {/* Un grain tres leger : le papier, pas l'ecran. */}
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          opacity: 0.05,
          mixBlendMode: "multiply",
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence baseFrequency='0.9' seed='${Math.floor(f / 2) % 8}'/></filter><rect width='240' height='240' filter='url(%23n)'/></svg>")`,
        }}
      />
      <Audio src={staticFile("musique-b.wav")} />
    </AbsoluteFill>
  );
};

const Fin: React.FC<{ f: number; fps: number; rayon: number }> = ({ f, fps, rayon }) => {
  const t = f - S.fin;
  const saut = 26 * Math.abs(Math.sin((Math.PI * t) / TEMPS)) * (1 - entre(t, 90, 150, 0, 1));
  const avion = { x: 540 + Math.cos(t / 14) * 430, y: 1000 + Math.sin(t / 14) * 90 };
  const entreEl = (d: number) => ({
    opacity: entre(t, d, d + 10, 0, 1),
    transform: `translateY(${entre(t, d, d + 14, 40, 0)}px)`,
  });
  return (
    <AbsoluteFill style={{ clipPath: `circle(${rayon}px at 540px 830px)`, background: B.soleil, zIndex: 30 }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.45) 3px, transparent 3.5px)", backgroundSize: "54px 54px" }} />
      <div style={{ position: "absolute", left: 540 - 470, top: 1060, width: 940, height: 940, borderRadius: "50%", background: "#FFD774" }} />

      <div style={{ position: "absolute", top: 150, left: 0, right: 0, display: "flex", justifyContent: "center", ...entreEl(6) }}>
        <Img src={staticFile("icone-fonce.png")} style={{ height: 120 }} />
        <Img src={staticFile("mot-fonce.png")} style={{ height: 120, marginLeft: 8 }} />
      </div>
      <div style={{ position: "absolute", top: 320, left: 0, right: 0, textAlign: "center", fontFamily: AFFICHE, color: B.encre }}>
        <div
          style={{
            fontSize: 150,
            fontWeight: 800,
            letterSpacing: "-0.05em",
            lineHeight: 0.95,
            fontVariationSettings: "'wdth' 85, 'opsz' 96",
            transform: `scale(${ressort(t, 14, fps, 170, 12)})`,
          }}
        >
          Un seul
          <br />
          paiement.
        </div>
        <div style={{ fontSize: 56, fontWeight: 700, marginTop: 10, ...entreEl(24) }}>sans abonnement</div>
        <div style={{ fontFamily: POLICE, fontSize: 30, fontWeight: 600, marginTop: 18, color: "#5A4300", ...entreEl(32) }}>
          Satisfait ou remboursé 30 jours
        </div>
        <div style={{ display: "inline-block", marginTop: 34, ...entreEl(40) }}>
          <div style={{ fontFamily: POLICE, fontSize: 52, fontWeight: 800, color: "#fff", background: B.encre, padding: "20px 44px", borderRadius: 999 }}>
            tenderpilot.store
          </div>
        </div>
      </div>

      <Confettis t={t - 6} x={540} y={1150} />
      <Confettis t={t - 70} x={300} y={1000} n={40} />

      <div style={{ position: "absolute", left: avion.x - 45, top: avion.y - 36, transform: `rotate(${Math.cos(t / 14) > 0 ? 200 : 20}deg) scale(${Math.sin(t / 14) > 0 ? 1 : 0.8})`, opacity: entre(t, 20, 30, 0, 1) }}>
        <Avion taille={90} />
      </div>

      <div style={{ position: "absolute", left: 210, top: 1070 - saut + (1 - ressort(t, 4, fps, 140, 12)) * 500 }}>
        <Aicha pose={{ ...FETE, cligne: cligne(f) }} largeur={660} retard={Math.sin(t / 5) * 10} />
      </div>
    </AbsoluteFill>
  );
};
