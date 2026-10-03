import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { chargerPolices, POLICE } from "../polices";
import { STATUTS } from "../theme";
import { ACCELERE, DOUX, SORTIE, entre, ressort } from "../ui/anim";
import { Aicha, mains, melange, Pose, REPOS } from "../b/Aicha";
import { Fenetre, Horloge, Journal, Nuage, Tampon, Tasse } from "../b/Decor";

chargerPolices();

/**
 * FILM G - « Sans / Avec ». Deux matinees de la meme personne, l'une au-dessus
 * de l'autre, sur la meme horloge. En haut, sans TenderPilot : un bureau gris,
 * des journaux, des onglets, une date ratee. En bas, avec : le blanc et
 * l'indigo du site, un cafe, un tableau deja trie, un dossier depose.
 *
 * Le film doit se comprendre SANS LE SON - la plupart des gens regardent ces
 * videos en muet. Chaque bande porte donc sa legende, et l'horloge du milieu
 * dit l'heure pour les deux.
 *
 * 28 s ; la fin commune (src/fin) se colle derriere.
 */
export const DUREE_G = 840;

const T = { navy: "#0B1225", primary: "#4F46FF", lightBlue: "#EEF0FF", g500: "#6B7280" };
const H = 900; // hauteur d'une bande
const MILIEU = 120; // la bande de l'horloge
const BAS = H + MILIEU; // haut de la bande « avec »
const BUREAU = 752; // le plan du bureau, dans une bande

// Les scenes, sur l'horloge commune.
const SC = [0, 120, 270, 420, 600];
const HEURES = ["07:00", "08:00", "10:30", "LA DATE LIMITE"];

// ------------------------------------------------------------ LES POSES

const P = (p: Partial<Pose>): Pose => ({ ...REPOS, ...p });
const LIT = P({ bras: mains(92, 404, 308, 404), tete: -4, regardY: 1 });
const AG_G = P({ bras: mains(138, 432, 264, 438), tete: -12, regardX: -1, humeur: "stress", sourcils: -1 });
const AG_D = P({ bras: mains(136, 438, 262, 432), tete: 12, regardX: 1, humeur: "stress", sourcils: -1 });
const LASSE = P({ bras: mains(140, 440, 262, 300), tete: 9, baisse: 10, humeur: "triste", sourcils: -1, cligne: 0.3 });
const ABATTUE = P({ bras: mains(150, 444, 250, 444), tete: -7, baisse: 26, humeur: "triste", sourcils: -1, cligne: 0.45, regardY: 1 });
const SIROTE = P({ bras: mains(174, 404, 226, 404), humeur: "sourire", cligne: 0.8, tete: 5, sourcils: 0.3 });
const REGARDE = P({ bras: mains(140, 436, 260, 436), humeur: "sourire", sourcils: 0.5, regardX: 1, regardY: -0.4, tete: 6 });
const ECRIT = P({ bras: mains(150, 440, 250, 446), humeur: "neutre", regardY: 1, tete: -5, regardX: 0.6 });
const JOIE = P({ bras: mains(40, 150, 360, 150), humeur: "joie", sourcils: 1 });

type Cle = [number, Pose];
const poseA = (cles: Cle[], f: number): Pose => {
  if (f <= cles[0][0]) return cles[0][1];
  for (let i = 0; i < cles.length - 1; i++) {
    const [a, pa] = cles[i];
    const [b, pb] = cles[i + 1];
    if (f <= b) return melange(pa, pb, entre(f, a, b, 0, 1, DOUX));
  }
  return cles[cles.length - 1][1];
};
const SANS: Cle[] = [
  [0, LIT], [110, LIT], [126, AG_G], [150, AG_D], [175, AG_G], [200, AG_D], [225, AG_G], [250, AG_D],
  [284, LASSE], [410, LASSE], [440, ABATTUE],
];
const AVEC: Cle[] = [[0, SIROTE], [112, SIROTE], [132, REGARDE], [262, REGARDE], [286, ECRIT], [410, ECRIT], [436, JOIE]];
const CLIGNE = [40, 150, 230, 350, 480, 560];
const cligne = (f: number, d: number) => Math.max(0, ...CLIGNE.map((c) => 1 - Math.abs(f - c - d) / 3));

// ------------------------------------------------------------ PRIMITIVES

const Legende: React.FC<{ f: number; avec: boolean; textes: string[] }> = ({ f, avec, textes }) => {
  const rang = SC.filter((d) => f >= d).length - 1;
  const texte = textes[Math.min(rang, textes.length - 1)];
  const p = entre(f, SC[rang], SC[rang] + 12, 0, 1, SORTIE);
  return (
    <div style={{ position: "absolute", left: 50, top: 50, right: 50, fontFamily: POLICE }}>
      <span
        style={{
          display: "inline-block",
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: "0.14em",
          padding: "10px 20px",
          borderRadius: 999,
          background: avec ? T.primary : "#9CA3AF",
          color: "#fff",
        }}
      >
        {avec ? "AVEC TENDERPILOT" : "SANS TENDERPILOT"}
      </span>
      <div style={{ marginTop: 18, fontSize: 52, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.08, color: avec ? T.navy : "#374151", opacity: p, transform: `translateY(${(1 - p) * 24}px)`, maxWidth: 720 }}>
        {texte}
      </div>
    </div>
  );
};

const Bureau: React.FC<{ couleur: string }> = ({ couleur }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: BUREAU, height: H - BUREAU, background: couleur }}>
    <div style={{ height: 16, background: "rgba(255,255,255,0.18)" }} />
  </div>
);

/** La petite carte d'un avis, avec son tampon. */
const Avis: React.FC<{ f: number; debut: number; tampon: string; couleur: string; ligne: string; fps: number }> = ({ f, debut, tampon, couleur, ligne, fps }) => {
  const p = ressort(f, debut, fps, 160, 15);
  return (
    <div style={{ position: "absolute", left: 470, top: 250, width: 560, background: "#fff", borderRadius: 26, padding: "26px 30px", boxSizing: "border-box", boxShadow: "0 24px 50px rgba(11,18,37,0.16)", fontFamily: POLICE, transform: `translateY(${(1 - p) * 500}px) rotate(-2deg)`, opacity: p }}>
      <div style={{ display: "inline-block", fontSize: 18, fontWeight: 800, letterSpacing: "0.12em", color: T.primary, background: T.lightBlue, padding: "5px 12px", borderRadius: 999 }}>APPEL D'OFFRES</div>
      <div style={{ fontSize: 34, fontWeight: 800, color: T.navy, marginTop: 12, lineHeight: 1.1 }}>Étude de faisabilité d'un barrage</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: couleur, marginTop: 10 }}>{ligne}</div>
      <div style={{ position: "absolute", right: 20, bottom: -30, transform: `scale(${1 + 2 * (1 - ressort(f, debut + 18, fps, 380, 20))}) rotate(-12deg)`, opacity: entre(f, debut + 18, debut + 21, 0, 1) }}>
        <Tampon texte={tampon} couleur={couleur} taille={56} />
      </div>
    </div>
  );
};

// ------------------------------------------------------------ LES DEUX BANDES

const BandeSans: React.FC<{ f: number; fps: number }> = ({ f, fps }) => {
  const pose = poseA(SANS, f);
  const nJournaux = Math.min(6, Math.floor(f / 16) + 1);
  const lache = entre(f, 112, 124, 0, 1, ACCELERE);
  const tenu =
    lache < 1 ? (
      <foreignObject x={80} y={296} width={240} height={160} style={{ transform: `translateY(${lache * 200}px)`, opacity: 1 - lache }}>
        <Journal l={240} h={160} page={Math.floor(f / 40)} />
      </foreignObject>
    ) : null;
  const fenetres = [
    [470, 150, -5], [760, 190, 4], [560, 330, 3], [820, 420, -6], [480, 500, 5], [700, 560, -3], [600, 120, 6],
  ];
  const SITES = ["Marchés publics", "PNUD", "Banque mondiale", "ARMP", "Journal officiel", "BAD", "UNGM"];
  const nSites = Math.round(entre(f, 126, 262, 1, 37, (x) => x));
  return (
    <AbsoluteFill style={{ height: H, background: "#E5E7EB", filter: "saturate(0.35)", overflow: "hidden" }}>
      {/* L'horloge du mur : elle file. */}
      <div style={{ position: "absolute", left: 880, top: 40, opacity: f < SC[3] ? 1 : 0.4 }}>
        <Horloge taille={130} tours={f / 10} />
      </div>
      {/* La pile de journaux, qui monte. */}
      {Array.from({ length: nJournaux }, (_, i) => (
        <div key={i} style={{ position: "absolute", left: 470 + (i % 2) * 8, top: BUREAU - 20 - i * 18, width: 220, height: 20, borderRadius: 3, background: i % 2 ? "#F4F4EF" : "#E2E2DA", boxShadow: "inset 0 -3px 0 rgba(0,0,0,0.12)" }} />
      ))}
      {f < SC[1] + 10 && (
        <div style={{ position: "absolute", left: 720, top: BUREAU - 150, transform: `scale(${ressort(f, 30, fps, 200, 12)}) rotate(-5deg)`, fontFamily: POLICE, fontWeight: 800, fontSize: 32, color: "#fff", background: "#EF4444", padding: "10px 20px", borderRadius: 999 }}>
          ≈ 500 F / jour
        </div>
      )}
      {/* Les onglets, qui s'empilent. */}
      {f >= SC[1] && f < SC[3] + 20 &&
        fenetres.map(([x, y, r], i) => {
          const d = SC[1] + 8 + i * 16;
          if (f < d) return null;
          const chute = Math.max(0, f - SC[3] - i);
          return (
            <div key={i} style={{ position: "absolute", left: x, top: y + chute * chute * 0.8, transform: `scale(${ressort(f, d, fps, 230, 12) * 0.85}) rotate(${r}deg)`, transformOrigin: "0 0" }}>
              <Fenetre nom={SITES[i]} teinte="#6B7280" />
            </div>
          );
        })}
      {f >= SC[1] && f < SC[3] && (
        <div style={{ position: "absolute", left: 470, top: BUREAU - 110, fontFamily: POLICE, fontWeight: 800, fontSize: 34, color: "#fff", background: "#374151", padding: "10px 20px", borderRadius: 16 }}>
          {nSites} sites ouverts
        </div>
      )}
      {/* Les dates notees a la main, sur des post-it. */}
      {f >= SC[2] &&
        ["Ech. 07/10 ?", "Rappeler ARMP", "Date ??"].map((t, i) => (
          <div key={t} style={{ position: "absolute", left: 500 + i * 170, top: 640 - (i % 2) * 40, width: 150, height: 110, background: "#FDE68A", padding: 10, boxSizing: "border-box", transform: `rotate(${(i - 1) * 6}deg) scale(${ressort(f, SC[2] + 10 + i * 10, fps, 220, 12)})`, fontFamily: "CaveatTP, cursive", fontSize: 30, color: "#374151", boxShadow: "0 6px 12px rgba(0,0,0,0.12)", opacity: f < SC[3] ? 1 : 0 }}>
            {t}
          </div>
        ))}
      {f >= SC[3] && <Avis f={f} debut={SC[3] + 6} tampon="CLÔTURÉ" couleur="#DC2626" ligne="Date limite : hier, 17 h 00" fps={fps} />}
      {f >= SC[3] + 40 && (
        <div style={{ position: "absolute", left: 120, top: 210, transform: `scale(${ressort(f, SC[3] + 40, fps, 160, 12) * 0.8})`, transformOrigin: "50% 100%" }}>
          <Nuage t={f} />
        </div>
      )}
      <Bureau couleur="#6B7280" />
      <div style={{ position: "absolute", left: 30, top: 300 + Math.sin(f / 22) * 3 }}>
        <Aicha pose={{ ...pose, cligne: Math.max(pose.cligne, cligne(f, 0)) }} largeur={400} tenu={tenu} />
      </div>
      <Legende f={f} avec={false} textes={["Elle achète les journaux.", "Elle ouvre site après site.", "Elle note les dates à la main.", "L'avis parfait… clôturé hier."]} />
    </AbsoluteFill>
  );
};

const BandeAvec: React.FC<{ f: number; fps: number }> = ({ f, fps }) => {
  const pose = poseA(AVEC, f);
  const tasse = 1 - entre(f, 112, 122, 0, 1);
  const tenu =
    tasse > 0.01 ? (
      <foreignObject x={146} y={310} width={110} height={130}>
        <div style={{ transform: `scale(${tasse * 0.9})`, transformOrigin: "50% 100%" }}>
          <Tasse t={f} />
        </div>
      </foreignObject>
    ) : null;
  const RANGEES = [
    { t: "Construction d'un centre de santé", j: 20, st: 0 },
    { t: "Appui à la digitalisation", j: 14, st: 1 },
    { t: "Étude de faisabilité d'un barrage", j: 12, st: 1 },
    { t: "Travaux d'assainissement", j: 6, st: 2 },
    { t: "Fourniture de médicaments", j: 2, st: 3 },
  ];
  const tableau = ressort(f, SC[1] + 6, fps, 150, 15) * (1 - entre(f, SC[2], SC[2] + 10, 0, 1));
  return (
    <AbsoluteFill style={{ height: H, background: `radial-gradient(700px 500px at 80% 40%, ${T.lightBlue}, transparent 70%), #fff`, overflow: "hidden" }}>
      {/* Le telephone, sur le bureau : il annonce les avis. */}
      {f < SC[1] + 10 && (
        <div style={{ position: "absolute", left: 600, top: 300, transform: `scale(${ressort(f, 24, fps, 220, 13)})`, transformOrigin: "0% 100%", fontFamily: POLICE, background: "#fff", borderRadius: 24, padding: "18px 22px", boxShadow: "0 16px 40px rgba(79,70,255,0.18)", display: "flex", gap: 14, alignItems: "center" }}>
          <Img src={staticFile("icone-fonce.png")} style={{ height: 44 }} />
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.g500 }}>TenderPilot · 07:00</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: T.navy }}>3 nouveaux avis pour vous</div>
          </div>
        </div>
      )}
      {/* Le tableau, deja trie et colore. */}
      {tableau > 0.01 && (
        <div style={{ position: "absolute", left: 440, top: 230, width: 600, background: "#fff", borderRadius: 26, padding: "20px 22px 10px", boxSizing: "border-box", boxShadow: "0 30px 70px rgba(79,70,255,0.22)", fontFamily: POLICE, transform: `translateY(${(1 - tableau) * 500}px)`, opacity: tableau }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <Img src={staticFile("icone-fonce.png")} style={{ height: 34 }} />
            <div style={{ fontSize: 24, fontWeight: 800, color: T.navy, flex: 1 }}>Mes appels d'offres</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#16A34A" }}>● à jour</div>
          </div>
          {RANGEES.map((r, i) => {
            const st = STATUTS[r.st];
            const p = entre(f, SC[1] + 20 + i * 6, SC[1] + 32 + i * 6, 0, 1);
            const suivi = r.st === 1 && i === 2 && f > SC[1] + 90;
            return (
              <div key={r.t} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 4px", borderTop: "2px solid #EEF1F7", opacity: p, transform: `translateX(${(1 - p) * 60}px)`, background: suivi ? T.lightBlue : undefined, borderRadius: 10 }}>
                <div style={{ width: 8, height: 34, borderRadius: 4, background: st.vif }} />
                <div style={{ flex: 1, fontSize: 21, fontWeight: 700, color: T.navy, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.t}</div>
                {suivi && <div style={{ fontSize: 15, fontWeight: 800, color: T.primary }}>SUIVI ✓</div>}
                <div style={{ fontSize: 19, fontWeight: 800, color: st.encre, background: st.fond, padding: "5px 12px", borderRadius: 999 }}>J-{r.j}</div>
              </div>
            );
          })}
        </div>
      )}
      {/* Le rappel, et l'echeance qui entre dans l'agenda. */}
      {f >= SC[2] && f < SC[3] + 10 &&
        [
          { d: SC[2] + 10, titre: "Rappel J-7", texte: "Étude de faisabilité d'un barrage", y: 160 },
          { d: SC[2] + 50, titre: "Google Agenda", texte: "Échéance ajoutée · 7 octobre", y: 300 },
        ].map((n) => (
          <div key={n.titre} style={{ position: "absolute", left: 520, top: n.y + 120, width: 500, fontFamily: POLICE, background: "#fff", borderRadius: 22, padding: "16px 20px", boxShadow: "0 16px 40px rgba(79,70,255,0.18)", border: `2px solid ${T.lightBlue}`, transform: `scale(${ressort(f, n.d, fps, 220, 13)})`, transformOrigin: "100% 50%", opacity: 1 - entre(f, SC[3], SC[3] + 8, 0, 1) }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.primary }}>{n.titre}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: T.navy, marginTop: 2 }}>{n.texte}</div>
          </div>
        ))}
      {f >= SC[3] && <Avis f={f} debut={SC[3] + 6} tampon="DÉPOSÉ ✓" couleur="#16A34A" ligne="Déposé à J-3, sans courir" fps={fps} />}
      <Bureau couleur="#1F2B5E" />
      <div style={{ position: "absolute", left: 30, top: 300 + Math.sin(f / 22 + 1) * 3 }}>
        <Aicha pose={{ ...pose, cligne: Math.max(pose.cligne, cligne(f, 12)) }} largeur={400} tenu={tenu} />
      </div>
      <Legende f={f} avec textes={["Elle boit son café.", "Tout est déjà trié pour elle.", "Elle prépare son offre.", "Déposé à temps."]} />
    </AbsoluteFill>
  );
};

// ================================================================ FILM

export const FilmG: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rang = Math.min(3, SC.filter((d) => f >= d).length - 1);
  const fusion = entre(f, SC[4], SC[4] + 30, 0, 1, DOUX);
  const bascule = entre(f, SC[rang], SC[rang] + 10, 0, 1, SORTIE);
  return (
    <AbsoluteFill style={{ background: "#fff", overflow: "hidden" }}>
      {/* SANS : la bande du haut, qui s'efface quand les deux matinees se rejoignent. */}
      <div style={{ position: "absolute", left: 0, top: -fusion * H, width: 1080, height: H, opacity: 1 - fusion * 0.6 }}>
        <BandeSans f={Math.min(f, SC[4] + 30)} fps={fps} />
      </div>

      {/* L'horloge commune, au milieu. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: H,
          height: MILIEU,
          background: T.navy,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
          fontFamily: POLICE,
          color: "#fff",
          opacity: 1 - fusion,
          transform: `translateY(${-fusion * 300}px)`,
          zIndex: 5,
        }}
      >
        <svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke="#A5B4FC" strokeWidth={2.4} strokeLinecap="round">
          <circle cx={12} cy={12} r={9} />
          <path d={`M12 12 L12 ${7}`} transform={`rotate(${f * 3} 12 12)`} />
          <path d="M12 12 L15 14" />
        </svg>
        <div style={{ overflow: "hidden", height: 70 }}>
          <div style={{ fontSize: rang === 3 ? 46 : 62, fontWeight: 900, letterSpacing: rang === 3 ? "0.12em" : "0.02em", lineHeight: "70px", transform: `translateY(${(1 - bascule) * 70}px)`, fontVariantNumeric: "tabular-nums" }}>{HEURES[rang]}</div>
        </div>
      </div>

      {/* AVEC : la bande du bas, qui prend toute la place a la fin. */}
      <div style={{ position: "absolute", left: 0, top: BAS - fusion * (BAS - 470), width: 1080, height: H }}>
        <BandeAvec f={f} fps={fps} />
      </div>

      {/* La morale, quand il ne reste que la bonne matinee. */}
      {f >= SC[4] && (
        <>
          <div style={{ position: "absolute", top: 150, left: 60, right: 60, textAlign: "center", fontFamily: POLICE, fontWeight: 800, fontSize: 84, lineHeight: 1.08, letterSpacing: "-0.025em", color: T.navy }}>
            <div style={{ opacity: entre(f, SC[4] + 20, SC[4] + 34, 0, 1), transform: `translateY(${entre(f, SC[4] + 20, SC[4] + 36, 30, 0)}px)` }}>Même matinée.</div>
            <div style={{ color: T.primary, opacity: entre(f, SC[4] + 28, SC[4] + 42, 0, 1), transform: `translateY(${entre(f, SC[4] + 28, SC[4] + 44, 30, 0)}px)` }}>Pas le même résultat.</div>
          </div>
          <div style={{ position: "absolute", top: 1450, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 8, opacity: entre(f, SC[4] + 60, SC[4] + 74, 0, 1), transform: `scale(${0.9 + 0.1 * ressort(f, SC[4] + 60, fps, 160, 12)})` }}>
            <Img src={staticFile("icone-fonce.png")} style={{ height: 110 }} />
            <Img src={staticFile("mot-fonce.png")} style={{ height: 110 }} />
          </div>
          <div style={{ position: "absolute", top: 1600, left: 0, right: 0, textAlign: "center", fontFamily: POLICE, fontWeight: 700, fontSize: 34, color: T.g500, opacity: entre(f, SC[4] + 80, SC[4] + 94, 0, 1) }}>
            La veille des appels d'offres, automatique.
          </div>
        </>
      )}
      <Audio src={staticFile("musique-g.wav")} />
    </AbsoluteFill>
  );
};

