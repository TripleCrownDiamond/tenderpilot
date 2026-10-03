import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { chargerPolices, POLICE } from "../polices";
import { STATUTS } from "../theme";
import { ACCELERE, DOUX, SORTIE, entre, ressort } from "../ui/anim";
import { LIGNES, NOMS_STATUT } from "../scenes/S3Tableau";
import { AFRIQUE, PAYS, dedans } from "../scenes/S5Carte";
import { EcranAgenda, EcranEmail, EcranTelegram } from "../ui/Ecrans";
import { SCENES } from "../tempo";

chargerPolices();

/**
 * FILM E - « Le site en mouvement ». Meme script, meme voix, meme musique et
 * meme minutage que le film A : seule l'image change. Le test A/E dit donc
 * une seule chose - si une pub fidele au site convertit mieux qu'une pub qui
 * s'en ecarte.
 *
 * Tout vient de site/ : les tokens de commun.php (navy, primary, light-blue,
 * light-gray), Inter, les annotations manuscrites en Caveat, le tableur
 * incline du hero, la bande des logos de sources, la ligne pointillee de
 * « Comment ça marche », la carte de prix indigo. Le film se regarde comme on
 * fait defiler la page : une barre de navigation fixe, des sections qui
 * montent l'une apres l'autre.
 */

const T = {
  navy: "#0B1225",
  primary: "#4F46FF",
  vif: "#4338CA",
  lightBlue: "#EEF0FF",
  lightGray: "#F6F7FA",
  g500: "#6B7280",
  g400: "#9CA3AF",
  g200: "#E5E7EB",
  g100: "#F3F4F6",
  g50: "#F9FAFB",
  i200: "#C7D2FE",
};
const MAIN = "CaveatTP, Caveat, cursive";

// Les sections, dans l'ordre de la page. Leurs debuts sont ceux du film A.
const DEBUTS = [SCENES.logo, SCENES.sources, SCENES.tableau, SCENES.alerte, SCENES.carte, SCENES.compte, SCENES.final];
const defilement = (f: number) => DEBUTS.slice(1).reduce((s, b) => s + entre(f, b - 9, b + 7, 0, 1, DOUX), 0);

// ------------------------------------------------------------ PRIMITIVES

const Icone: React.FC<{ nom: "check" | "fleche" | "cloche" | "mail" | "envoi" | "agenda" | "bouclier"; taille?: number; couleur?: string }> = ({
  nom,
  taille = 36,
  couleur = "currentColor",
}) => (
  <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke={couleur} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    {nom === "check" && <path d="M20 6 9 17l-5-5" />}
    {nom === "fleche" && <path d="M5 12h14M12 5l7 7-7 7" />}
    {nom === "cloche" && <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />}
    {nom === "mail" && <path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3 7l9 6 9-6" />}
    {nom === "envoi" && <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />}
    {nom === "agenda" && <path d="M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM3 10h18M8 2v4M16 2v4" />}
    {nom === "bouclier" && <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4" />}
  </svg>
);

/** L'etiquette en pilule qui coiffe chaque section du site. */
const Pilule: React.FC<{ t: number; children: React.ReactNode; y: number }> = ({ t, children, y }) => (
  <div style={{ position: "absolute", top: y, left: 72, opacity: entre(t, 0, 10, 0, 1), transform: `translateY(${entre(t, 0, 14, 24, 0)}px)` }}>
    <span style={{ display: "inline-block", background: T.lightBlue, color: T.primary, fontFamily: POLICE, fontWeight: 700, fontSize: 24, letterSpacing: "0.14em", textTransform: "uppercase", padding: "10px 22px", borderRadius: 999 }}>
      {children}
    </span>
  </div>
);

/** Le titre de section : chaque ligne monte comme les .reveler du site. Le texte *entre etoiles* passe en primary. */
const Titre: React.FC<{ t: number; lignes: string[]; debut: number; fin?: number; y: number; taille?: number; centre?: boolean }> = ({
  t,
  lignes,
  debut,
  fin = 1e9,
  y,
  taille = 86,
  centre,
}) => (
  <div style={{ position: "absolute", top: y, left: 72, right: 72, fontFamily: POLICE, fontWeight: 800, fontSize: taille, lineHeight: 1.08, letterSpacing: "-0.025em", color: T.navy, textAlign: centre ? "center" : "left" }}>
    {lignes.map((l, i) => {
      const d = debut + i * 4;
      const p = entre(t, d, d + 16, 0, 1, SORTIE);
      const s = entre(t, fin - 8, fin, 0, 1, ACCELERE);
      return (
        <div key={i} style={{ opacity: p * (1 - s), transform: `translateY(${(1 - p) * 40 - s * 30}px)` }}>
          {l.split(/(\*[^*]+\*)/).filter(Boolean).map((m, j) =>
            m.startsWith("*") ? (
              <span key={j} style={{ color: T.primary }}>
                {m.slice(1, -1)}
              </span>
            ) : (
              <span key={j}>{m}</span>
            ),
          )}
        </div>
      );
    })}
  </div>
);

const Bouton: React.FC<{ children: React.ReactNode; taille?: number; plein?: boolean; inverse?: boolean; style?: React.CSSProperties }> = ({ children, taille = 34, plein = true, inverse, style }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 14,
      fontFamily: POLICE,
      fontWeight: 800,
      fontSize: taille,
      padding: `${taille * 0.62}px ${taille * 1.1}px`,
      borderRadius: taille * 0.6,
      background: inverse ? "#fff" : plein ? T.primary : "transparent",
      color: inverse ? T.primary : plein ? "#fff" : T.navy,
      border: plein ? "none" : `2px solid ${T.g200}`,
      boxShadow: plein ? `0 14px 30px ${inverse ? "rgba(0,0,0,0.18)" : "rgba(79,70,255,0.28)"}` : "none",
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </div>
);

// ------------------------------------------------------------ LE TABLEUR

/** Le classeur du hero : fenetre, barre de Google Sheets, lignes colorees selon le temps qui reste. */
const Tableur: React.FC<{ t: number; largeur?: number; tri?: number; nLignes?: number }> = ({ t, largeur = 940, tri = 0, nLignes = 7 }) => {
  const lignes = LIGNES.slice(0, nLignes);
  // L'ordre du produit : le plus de temps devant en haut (AGENTS.md).
  const ordre = [...lignes].sort((a, b) => b.jours - a.jours);
  const H = 86;
  return (
    <div style={{ width: largeur, background: "#fff", borderRadius: 30, overflow: "hidden", boxShadow: "0 50px 100px rgba(11,18,37,0.18), 0 0 0 1px rgba(0,0,0,0.04)", fontFamily: POLICE }}>
      <div style={{ background: T.g50, borderBottom: `2px solid ${T.g100}`, padding: "20px 26px", display: "flex", alignItems: "center", gap: 12 }}>
        {["#F87171", "#FBBF24", "#34D399"].map((c) => (
          <span key={c} style={{ width: 18, height: 18, borderRadius: 9, background: c }} />
        ))}
        <span style={{ marginLeft: 14, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 20, color: T.g400 }}>Votre classeur TenderPilot · Google Sheets</span>
      </div>
      <div style={{ display: "flex", padding: "16px 26px", fontSize: 19, fontWeight: 800, color: T.g500, letterSpacing: "0.08em", borderBottom: `2px solid ${T.g100}` }}>
        <span style={{ flex: 1 }}>OPPORTUNITÉ</span>
        <span style={{ width: 150 }}>PAYS</span>
        <span style={{ width: 210, textAlign: "right" }}>JOURS RESTANTS</span>
      </div>
      <div style={{ position: "relative", height: lignes.length * H }}>
        {lignes.map((l, i) => {
          const st = STATUTS[l.st];
          const rang = i + (ordre.indexOf(l) - i) * tri;
          const p = entre(t, 4 + i * 5, 16 + i * 5, 0, 1, SORTIE);
          return (
            <div
              key={l.titre}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: rang * H,
                height: H,
                display: "flex",
                alignItems: "center",
                padding: "0 26px",
                background: st.fond,
                borderBottom: "2px solid #fff",
                opacity: p,
                transform: `translateX(${(1 - p) * 60}px)`,
              }}
            >
              <span style={{ flex: 1, fontSize: 25, fontWeight: 700, color: T.navy, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: 12 }}>{l.titre}</span>
              <span style={{ width: 150, fontSize: 23, color: "#374151" }}>{l.pays}</span>
              <span style={{ width: 210, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 26, fontWeight: 800, color: st.encre, fontVariantNumeric: "tabular-nums" }}>{l.jours} j</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: st.encre, border: `2px solid ${st.encre}`, borderRadius: 999, padding: "3px 10px", letterSpacing: "0.06em" }}>{NOMS_STATUT[l.st]}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ================================================================ SECTIONS

const S1Hero: React.FC<{ t: number }> = ({ t }) => (
  <AbsoluteFill style={{ background: `radial-gradient(700px 520px at 90% 12%, ${T.lightBlue}, transparent 70%), radial-gradient(600px 500px at 0% 70%, ${T.lightBlue}, transparent 70%), #fff` }}>
    <Pilule t={t - 2} y={230}>Veille des appels d'offres</Pilule>
    <Titre t={t} lignes={["Vous ratez encore", "des *appels d'offres* ?"]} debut={6} fin={60} y={320} taille={98} />
    <Titre t={t} lignes={["Trouvez les bons", "appels d'offres.", "*Avant la deadline.*"]} debut={62} y={320} taille={98} />
    <div style={{ position: "absolute", top: 680, left: 72, right: 100, fontFamily: POLICE, fontSize: 36, lineHeight: 1.4, color: T.g500, opacity: entre(t, 74, 88, 0, 1), transform: `translateY(${entre(t, 74, 90, 24, 0)}px)` }}>
      TenderPilot surveille les sources officielles et vous alerte avant les échéances.
    </div>
    <div style={{ position: "absolute", top: 850, left: 72, display: "flex", gap: 20, opacity: entre(t, 82, 94, 0, 1), transform: `translateY(${entre(t, 82, 96, 24, 0)}px)` }}>
      <Bouton>
        Obtenir TenderPilot <Icone nom="fleche" taille={34} />
      </Bouton>
    </div>
    <div style={{ position: "absolute", top: 1010, left: 72, display: "flex", flexDirection: "column", gap: 16, fontFamily: POLICE, fontSize: 32, fontWeight: 600, color: T.navy }}>
      {["Paiement unique", "Sans abonnement", "Satisfait ou remboursé 30 jours"].map((x, i) => (
        <div key={x} style={{ display: "flex", alignItems: "center", gap: 14, opacity: entre(t, 90 + i * 4, 100 + i * 4, 0, 1) }}>
          <Icone nom="check" taille={34} couleur={T.primary} /> {x}
        </div>
      ))}
    </div>
    {/* Le tableur du hero, qui monte en bas de page : la suite arrive. */}
    <div
      style={{
        position: "absolute",
        left: 120,
        top: 1290 + (1 - ressort(t, 66, 30, 120, 16)) * 700,
        transform: "perspective(1600px) rotateY(-16deg) rotateX(6deg) rotateZ(2deg)",
        transformOrigin: "50% 0%",
      }}
    >
      <Tableur t={t - 70} largeur={900} />
    </div>
  </AbsoluteFill>
);

const LOGOS = ["banque-mondiale.svg", "afd.svg", "union-europeenne.svg", "pnud.svg", "unicef.svg", "giz.svg", "enabel.webp", "bceao.svg", "fondation-gates.svg", "wellcome.svg", "plan-international.svg", "agra.svg"];

const S2Sources: React.FC<{ t: number }> = ({ t }) => {
  const { fps } = useVideoConfig();
  const n = Math.round(entre(t, 60, 100, 0, 61, DOUX));
  return (
    <AbsoluteFill style={{ background: "#fff" }}>
      <Pilule t={t} y={230}>Les sources</Pilule>
      <Titre t={t} lignes={["Les appels d'offres", "sont *partout*."]} debut={4} fin={56} y={320} />
      <Titre t={t} lignes={["*61 sources* officielles,", "lues pour vous."]} debut={60} y={320} />
      <div style={{ position: "absolute", top: 580, left: 72, right: 72, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22 }}>
        {LOGOS.map((l, i) => {
          const p = ressort(t, 6 + i * 2, fps, 200, 14);
          const lu = entre(t, 64 + i * 3, 72 + i * 3, 0, 1);
          return (
            <div key={l} style={{ position: "relative", height: 150, borderRadius: 26, background: T.g50, border: `2px solid ${lu > 0.5 ? T.i200 : T.g100}`, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${p})` }}>
              <Img src={staticFile(`logos-sources/${l}`)} style={{ maxHeight: 70, maxWidth: 220, objectFit: "contain", filter: `grayscale(${1 - lu})`, opacity: 0.65 + 0.35 * lu }} />
              <div style={{ position: "absolute", top: -12, right: -12, width: 44, height: 44, borderRadius: 22, background: T.primary, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${ressort(t, 66 + i * 3, fps, 260, 12)})`, boxShadow: "0 6px 14px rgba(79,70,255,0.35)" }}>
                <Icone nom="check" taille={26} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", top: 1330, left: 72, right: 72, display: "flex", alignItems: "baseline", gap: 24, fontFamily: POLICE, opacity: entre(t, 58, 70, 0, 1) }}>
        <span style={{ fontSize: 190, fontWeight: 900, color: T.primary, letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{n}</span>
        <span style={{ fontSize: 36, fontWeight: 700, color: T.navy, lineHeight: 1.3 }}>
          sources officielles,
          <br />
          <span style={{ color: T.g500, fontWeight: 600 }}>lues trois fois par jour</span>
        </span>
      </div>
      <div style={{ position: "absolute", top: 1600, left: 72, right: 72, textAlign: "center", fontFamily: POLICE, fontSize: 22, lineHeight: 1.45, color: T.g400 }}>
        Sources publiques officielles. TenderPilot n'est affilié à aucun de ces organismes ; les logos appartiennent à leurs propriétaires.
      </div>
    </AbsoluteFill>
  );
};

const S3Tableau: React.FC<{ t: number }> = ({ t }) => {
  const redresse = entre(t, 96, 128, 0, 1, DOUX);
  const trace = entre(t, 30, 56, 0, 1, DOUX);
  return (
    <AbsoluteFill style={{ background: T.lightGray }}>
      <Pilule t={t} y={230}>Le tableau</Pilule>
      <Titre t={t} lignes={["Tout arrive dans", "*un seul tableau*."]} debut={4} fin={90} y={320} />
      <Titre t={t} lignes={["Rangé selon", "*le temps qui reste*."]} debut={94} y={320} />
      {/* L'annotation manuscrite du hero, et sa fleche tracee a la main. */}
      <div style={{ position: "absolute", top: 600, right: 70, width: 560, display: "flex", alignItems: "flex-start", gap: 6, transform: "rotate(-3deg)", opacity: entre(t, 28, 36, 0, 1) * (1 - entre(t, 88, 96, 0, 1)) }}>
        <svg width={110} height={92} viewBox="0 0 70 56" fill="none" stroke={T.primary} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 18 }}>
          <path d="M66 8 C 46 4, 20 12, 12 46" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - trace} />
          <path d="M4 37 L12 48 L22 40" opacity={trace > 0.95 ? 1 : 0} />
        </svg>
        <span style={{ fontFamily: MAIN, fontWeight: 600, fontSize: 52, lineHeight: 1.05, color: T.primary }}>Toutes vos opportunités, dans un seul tableau</span>
      </div>
      <div
        style={{
          position: "absolute",
          left: 70,
          top: 820,
          transform: `perspective(1600px) rotateY(${-16 + 10 * redresse}deg) rotateX(${6 - 4 * redresse}deg) rotateZ(${2 - 2 * redresse}deg) translateY(${(1 - ressort(t, 6, 30, 140, 16)) * 600}px)`,
          transformOrigin: "50% 30%",
        }}
      >
        <Tableur t={t - 8} tri={entre(t, 104, 128, 0, 1, DOUX)} />
      </div>
    </AbsoluteFill>
  );
};

const ECRANS = [EcranEmail, EcranTelegram, EcranAgenda];
const CANAUX: { nom: string; icone: "mail" | "envoi" | "agenda" }[] = [
  { nom: "Email", icone: "mail" },
  { nom: "Telegram", icone: "envoi" },
  { nom: "Google Agenda", icone: "agenda" },
];

const S4Alertes: React.FC<{ t: number }> = ({ t }) => {
  const { fps } = useVideoConfig();
  const tel = ressort(t, 10, fps, 110, 15);
  const glisse = (k: number) => entre(t, 20 + k * 52, 36 + k * 52, 1, 0);
  const actif = t < 72 ? 0 : t < 124 ? 1 : 2;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(800px 600px at 50% 70%, ${T.lightBlue}, transparent 70%), #fff` }}>
      <Pilule t={t} y={230}>Les alertes</Pilule>
      <Titre t={t} lignes={["Vous êtes prévenu", "*avant la date limite*."]} debut={4} y={320} taille={80} />
      <div
        style={{
          position: "absolute",
          left: 270,
          top: 560 + (1 - tel) * 900,
          width: 540,
          height: 1060,
          borderRadius: 78,
          background: "#fff",
          border: `2px solid ${T.g200}`,
          boxShadow: "0 60px 120px rgba(79,70,255,0.22), 0 0 0 10px #F3F4F6",
          overflow: "hidden",
          transform: `scale(0.86) rotate(${(1 - tel) * 6}deg)`,
          transformOrigin: "50% 0%",
        }}
      >
        <div style={{ position: "absolute", inset: 16, borderRadius: 62, overflow: "hidden", background: "#fff" }}>
          {ECRANS.map((Ecran, k) => (
            <div key={k} style={{ position: "absolute", inset: 0, transform: `translateY(${glisse(k) * 105}%)`, opacity: k === 0 || t >= 19 + k * 52 ? 1 : 0, zIndex: k }}>
              <Ecran t={t - (20 + k * 52)} fps={fps} />
            </div>
          ))}
        </div>
        <div style={{ position: "absolute", left: 200, top: 30, width: 140, height: 36, borderRadius: 18, background: T.navy, zIndex: 10 }} />
      </div>
      {/* Les trois canaux, dans le style des cartes « atouts » du site. */}
      <div style={{ position: "absolute", top: 1520, left: 72, right: 72, display: "flex", justifyContent: "space-between" }}>
        {CANAUX.map((c, i) => (
          <div key={c.nom} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 22px", borderRadius: 24, background: i === actif ? "#fff" : T.g50, border: `2px solid ${i === actif ? T.primary : T.g100}`, boxShadow: i === actif ? "0 14px 30px rgba(79,70,255,0.18)" : "none", opacity: entre(t, 14 + i * 4, 24 + i * 4, 0, 1) }}>
            <div style={{ width: 58, height: 58, borderRadius: 16, background: i === actif ? T.primary : T.i200, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icone nom={c.icone} taille={32} />
            </div>
            <span style={{ fontFamily: POLICE, fontWeight: 700, fontSize: 28, color: T.navy }}>{c.nom}</span>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// La carte : le continent en points, comme dans le film A, aux couleurs du site.
const ECH = 12;
const cx = (lon: number) => 560 + (lon - 17) * ECH;
const cy = (lat: number) => 1050 - (lat - 1) * ECH;
const POINTS = (() => {
  const pts: { x: number; y: number; d: number }[] = [];
  for (let lat = 38; lat > -36; lat -= 1.6) {
    for (let lon = -18; lon < 52; lon += 1.6) {
      if (dedans(lon, lat)) pts.push({ x: cx(lon), y: cy(lat), d: Math.hypot(lon - 2.3, lat - 9.5) });
    }
  }
  return pts;
})();
void AFRIQUE;

const S5Carte: React.FC<{ t: number }> = ({ t }) => {
  const { fps } = useVideoConfig();
  const front = entre(t, 4, 50, 0, 70);
  return (
    <AbsoluteFill style={{ background: T.lightGray }}>
      <Pilule t={t} y={230}>La couverture</Pilule>
      <Titre t={t} lignes={["*8 pays* suivis,", "et l'international."]} debut={4} y={320} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {POINTS.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={6.5} fill={T.i200} opacity={p.d < front ? 1 : 0} />
        ))}
        {PAYS.map((p, i) => {
          const s = ressort(t, 30 + i * 4, fps, 240, 12);
          const pulse = ((t - 30 - i * 4) % 30) / 30;
          return (
            <g key={p.code}>
              <circle cx={cx(p.lon)} cy={cy(p.lat)} r={30 * pulse + 10} fill="none" stroke={T.primary} strokeWidth={3} opacity={t > 30 + i * 4 ? (1 - pulse) * 0.6 : 0} />
              <circle cx={cx(p.lon)} cy={cy(p.lat)} r={14 * s} fill={T.primary} />
            </g>
          );
        })}
      </svg>
      <div style={{ position: "absolute", top: 1540, left: 72, right: 72, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {PAYS.map((p, i) => (
          <div key={p.code} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", borderRadius: 18, padding: "12px 12px", boxShadow: "0 8px 20px rgba(11,18,37,0.06)", border: `2px solid ${T.g100}`, transform: `scale(${ressort(t, 34 + i * 4, fps, 240, 13)})` }}>
            <Img src={staticFile(`drapeaux/${p.code}.svg`)} style={{ width: 44, height: 30, objectFit: "cover", borderRadius: 5 }} />
            <span style={{ fontFamily: POLICE, fontWeight: 700, fontSize: 20, color: T.navy, whiteSpace: "nowrap" }}>{p.nom}</span>
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", top: 1770, left: 72, right: 72, display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
        {["Union européenne", "Banque mondiale", "PNUD", "AFD"].map((b, i) => (
          <span key={b} style={{ fontFamily: POLICE, fontWeight: 700, fontSize: 22, color: T.primary, background: T.lightBlue, padding: "8px 18px", borderRadius: 999, opacity: entre(t, 70 + i * 4, 80 + i * 4, 0, 1) }}>
            + {b}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const S6Rappels: React.FC<{ t: number }> = ({ t }) => {
  const { fps } = useVideoConfig();
  const ligne = entre(t, 16, 84, 0, 1, (x) => x);
  const ETAPES = [
    { j: "J-7", titre: "Une semaine avant", texte: "Le temps de préparer votre offre." },
    { j: "J-3", titre: "Trois jours avant", texte: "Le dossier se boucle." },
    { j: "J-1", titre: "La veille", texte: "Le dernier rappel." },
  ];
  const haut = 640;
  const pas = 260;
  return (
    <AbsoluteFill style={{ background: "#fff" }}>
      <Pilule t={t} y={230}>Les rappels</Pilule>
      <Titre t={t} lignes={["Des rappels avant", "*chaque échéance*."]} debut={4} y={320} />
      {/* La ligne de progression du site : des tirets indigo qui se remplissent. */}
      <div style={{ position: "absolute", left: 72 + 52, top: haut + 52, width: 4, height: pas * 2, backgroundImage: `repeating-linear-gradient(180deg, ${T.i200} 0 14px, transparent 14px 28px)` }} />
      <div style={{ position: "absolute", left: 72 + 52, top: haut + 52, width: 4, height: pas * 2 * ligne, backgroundImage: `repeating-linear-gradient(180deg, ${T.primary} 0 14px, transparent 14px 28px)` }} />
      {ETAPES.map((e, i) => {
        const atteinte = ligne >= i / 2 - 0.001;
        const d = 16 + (i / 2) * 68;
        const p = ressort(t, d, fps, 260, 11);
        return (
          <div key={e.j} style={{ position: "absolute", left: 72, top: haut + i * pas, display: "flex", gap: 36, alignItems: "flex-start" }}>
            <div
              style={{
                width: 108,
                height: 108,
                borderRadius: 54,
                flexShrink: 0,
                background: atteinte ? T.primary : "#fff",
                border: atteinte ? "none" : `4px solid ${T.i200}`,
                color: atteinte ? "#fff" : T.primary,
                fontFamily: POLICE,
                fontWeight: 800,
                fontSize: 34,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 0 16px #fff",
                transform: `scale(${0.3 + 0.7 * p})`,
                boxSizing: "border-box",
              }}
            >
              {e.j}
            </div>
            <div style={{ paddingTop: 10, opacity: entre(t, d, d + 10, 0, 1), transform: `translateY(${entre(t, d, d + 14, 20, 0)}px)` }}>
              <div style={{ fontFamily: POLICE, fontWeight: 800, fontSize: 48, color: T.navy }}>{e.titre}</div>
              <div style={{ fontFamily: POLICE, fontWeight: 500, fontSize: 32, color: T.g500, marginTop: 6 }}>{e.texte}</div>
            </div>
          </div>
        );
      })}
      <div style={{ position: "absolute", top: 1450, left: 72, right: 72, display: "flex", gap: 18, alignItems: "center", fontFamily: POLICE, fontWeight: 700, fontSize: 30, color: T.navy, opacity: entre(t, 86, 96, 0, 1) }}>
        {CANAUX.map((c) => (
          <span key={c.nom} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 52, height: 52, borderRadius: 14, background: T.primary, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icone nom={c.icone} taille={28} />
            </span>
            {c.nom}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const S7Offre: React.FC<{ t: number }> = ({ t }) => {
  const { fps } = useVideoConfig();
  const carte = ressort(t, 8, fps, 130, 16);
  const clic = t >= 86 && t < 96 ? 0.95 : 1;
  const curseur = { x: 960 - entre(t, 60, 84, 0, 380, DOUX), y: 1700 - entre(t, 60, 84, 0, 650, DOUX) };
  const onde = entre(t, 86, 106, 0, 1);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(900px 700px at 50% 55%, ${T.lightBlue}, transparent 70%), #fff` }}>
      <Pilule t={t} y={230}>L'offre</Pilule>
      <Titre t={t} lignes={["Tout TenderPilot,", "*payé une seule fois.*"]} debut={4} y={320} taille={80} />
      <div
        style={{
          position: "absolute",
          left: 90,
          top: 580,
          width: 900,
          borderRadius: 48,
          overflow: "hidden",
          background: T.primary,
          color: "#fff",
          padding: "52px 56px",
          boxSizing: "border-box",
          boxShadow: "0 50px 110px rgba(79,70,255,0.35)",
          fontFamily: POLICE,
          transform: `translateY(${(1 - carte) * 500}px)`,
          opacity: carte,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
          <Img src={staticFile("boite-tenderpilot.webp")} style={{ width: 150, height: 150, objectFit: "contain", filter: "drop-shadow(0 12px 20px rgba(0,0,0,0.25))" }} />
          <div>
            <span style={{ display: "inline-block", background: "rgba(255,255,255,0.2)", padding: "8px 18px", borderRadius: 999, fontSize: 20, fontWeight: 900, letterSpacing: "0.14em" }}>TOUT INCLUS</span>
            <div style={{ fontSize: 50, fontWeight: 800, marginTop: 10 }}>TenderPilot</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginTop: 34 }}>
          <span style={{ fontSize: 86, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, whiteSpace: "nowrap" }}>Paiement unique</span>
        </div>
        <div style={{ fontSize: 28, marginTop: 12, color: "rgba(255,255,255,0.85)" }}>
          Sans abonnement · 61 sources · 8 pays
        </div>
        <div style={{ position: "relative", marginTop: 40 }}>
          <Bouton inverse taille={40} style={{ width: "100%", justifyContent: "center", boxSizing: "border-box", transform: `scale(${clic})` }}>
            Obtenir TenderPilot <Icone nom="fleche" taille={38} />
          </Bouton>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 28, fontSize: 28, color: "rgba(255,255,255,0.92)" }}>
          <Icone nom="bouclier" taille={34} /> <strong>Satisfait ou remboursé 30 jours</strong>
        </div>
      </div>
      <div style={{ position: "absolute", top: 1400, left: 0, right: 0, textAlign: "center", fontFamily: POLICE, opacity: entre(t, 40, 52, 0, 1) }}>
        <div style={{ fontSize: 64, fontWeight: 800, color: T.navy, letterSpacing: "-0.02em" }}>tenderpilot.store</div>
        <div style={{ fontSize: 26, fontWeight: 600, color: T.g500, marginTop: 8 }}>Sources officielles · Email, Telegram, Google Agenda</div>
      </div>
      {/* Le curseur : il va au bouton et clique ; l'onde part de sa pointe. */}
      {onde > 0 && onde < 1 && (
        <div style={{ position: "absolute", left: curseur.x + 6 - 90 * onde, top: curseur.y + 4 - 90 * onde, width: 180 * onde, height: 180 * onde, borderRadius: "50%", border: `4px solid ${T.primary}`, opacity: 1 - onde }} />
      )}
      <svg width={60} height={60} viewBox="0 0 24 24" style={{ position: "absolute", left: curseur.x, top: curseur.y, opacity: entre(t, 56, 62, 0, 1), transform: `scale(${clic})` }}>
        <path d="M4 2 L4 20 L9 15 L12 22 L15 21 L12 14 L19 14 Z" fill={T.navy} stroke="#fff" strokeWidth={1.4} strokeLinejoin="round" />
      </svg>
    </AbsoluteFill>
  );
};

const SECTIONS = [S1Hero, S2Sources, S3Tableau, S4Alertes, S5Carte, S6Rappels, S7Offre];

// ================================================================ FILM

export const FilmE: React.FC = () => {
  const f = useCurrentFrame();
  const d = defilement(f);
  const nav = entre(f, 0, 12, 0, 1);
  return (
    <AbsoluteFill style={{ background: "#fff", overflow: "hidden" }}>
      {SECTIONS.map((Section, i) => {
        const y = (i - d) * 1920;
        if (Math.abs(i - d) >= 1) return null;
        return (
          <AbsoluteFill key={i} style={{ transform: `translateY(${y}px)` }}>
            <Section t={f - DEBUTS[i]} />
          </AbsoluteFill>
        );
      })}
      {/* La barre de navigation du site, fixe pendant tout le defilement. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 150,
          background: "rgba(255,255,255,0.92)",
          borderBottom: `2px solid ${T.g100}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "28px 56px 0",
          boxSizing: "border-box",
          opacity: nav,
          transform: `translateY(${(1 - nav) * -40}px)`,
          zIndex: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Img src={staticFile("icone-fonce.png")} style={{ height: 60 }} />
          <Img src={staticFile("mot-fonce.png")} style={{ height: 60 }} />
        </div>
        <Bouton taille={26}>Obtenir TenderPilot</Bouton>
      </div>
      <Audio src={staticFile("musique.wav")} />
    </AbsoluteFill>
  );
};
