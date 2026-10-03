import { AbsoluteFill, Audio, Img, random, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { chargerPolices, POLICE } from "../polices";
import { STATUTS } from "../theme";
import { ACCELERE, DOUX, SORTIE, entre, ressort } from "../ui/anim";
import { LIGNES } from "../scenes/S3Tableau";
import { DUREE, SCENES as S, TEMPS } from "./tempoC";

chargerPolices();

/**
 * FILM C - « La date limite ». Ni la nuit du film A, ni l'illustration du
 * film B : une grille suisse, du noir d'encre sur blanc, un seul bleu - celui
 * du logo - et un rouge reserve a la date limite. Le film est construit
 * autour d'une frise J-30 -> J-0 : il l'ouvre, et y revient pour conclure.
 *
 * Tout ce qui ressemble a de l'habillage dit quelque chose de vrai : le
 * compteur 01 / 06 est le numero de la scene, la barre du bas l'avancement du
 * film, les onglets 01-02-03 l'ordre reel du traitement.
 */

const C = {
  papier: "#FFFFFF",
  encre: "#0A0D14",
  gris: "#6B7280",
  pale: "#9CA3AF",
  trait: "#E5E8EE",
  guide: "#F0F2F6",
  bleu: "#0050F0",
  rouge: "#E5372B",
  vert: "#12A150",
};
const TITRE = "ArchTP, Archivo, InterTP, sans-serif";
const G = 80; // marge
const D = 1000; // bord droit

// ----------------------------------------------------------- PRIMITIVES

/** Une ligne de texte qui monte depuis un masque, et y repart. */
const Masque: React.FC<{ debut: number; fin?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  debut,
  fin = 1e9,
  children,
  style,
}) => {
  const f = useCurrentFrame();
  const e = entre(f, debut, debut + 16, 1, 0, SORTIE);
  const s = entre(f, fin - 10, fin, 0, 1, ACCELERE);
  return (
    <div style={{ overflow: "hidden", paddingBottom: "0.08em", marginBottom: "-0.08em", ...style }}>
      <div style={{ transform: `translateY(${(e - s) * 108}%)` }}>{children}</div>
    </div>
  );
};

/** Un grand titre : Archivo serre, lignes empilees. Le texte *entre etoiles* passe au bleu. */
const Titre: React.FC<{ lignes: string[]; debut: number; fin: number; y: number; taille?: number; centre?: boolean }> = ({
  lignes,
  debut,
  fin,
  y,
  taille = 96,
  centre,
}) => (
  <div
    style={{
      position: "absolute",
      top: y,
      left: G,
      right: 1080 - D,
      fontFamily: TITRE,
      fontWeight: 800,
      fontStretch: "96%",
      fontSize: taille,
      lineHeight: 1.0,
      letterSpacing: "-0.035em",
      color: C.encre,
      textAlign: centre ? "center" : "left",
    }}
  >
    {lignes.map((l, i) => (
      <Masque key={i} debut={debut + i * 6} fin={fin + i * 2}>
        {l.split(/(\*[^*]+\*)/).filter(Boolean).map((m, j) =>
          m.startsWith("*") ? (
            <span key={j} style={{ color: C.bleu }}>
              {m.slice(1, -1)}
            </span>
          ) : (
            <span key={j}>{m}</span>
          ),
        )}
      </Masque>
    ))}
  </div>
);

/** Une etiquette en capitales espacees. */
const Etiq: React.FC<{ children: React.ReactNode; couleur?: string; taille?: number; style?: React.CSSProperties }> = ({
  children,
  couleur = C.gris,
  taille = 22,
  style,
}) => (
  <div style={{ fontFamily: POLICE, fontWeight: 700, fontSize: taille, letterSpacing: "0.2em", color: couleur, ...style }}>{children}</div>
);

// ------------------------------------------------------------ L'HABILLAGE

const Habillage: React.FC = () => {
  const f = useCurrentFrame();
  const scenes = Object.values(S);
  const rang = scenes.filter((d) => f >= d).length;
  const guides = entre(f, 0, 26, 0, 1, DOUX);
  return (
    <>
      {/* La grille : six colonnes, tracees au premier temps, jamais retirees. */}
      {[G, 310, 540, 770, D].map((x, i) => (
        <div key={x} style={{ position: "absolute", left: x, top: 0, width: 2, height: 1920 * entre(f, i * 3, 26 + i * 3, 0, 1, DOUX), background: C.guide }} />
      ))}
      {/* Traits de coupe aux quatre coins. */}
      {[
        [40, 40, 1, 1],
        [1040, 40, -1, 1],
        [40, 1880, 1, -1],
        [1040, 1880, -1, -1],
      ].map(([x, y, sx, sy], i) => (
        <div key={i} style={{ position: "absolute", left: x, top: y, opacity: guides }}>
          <div style={{ position: "absolute", width: 28, height: 2, background: C.encre, left: sx > 0 ? 0 : -28, top: 0 }} />
          <div style={{ position: "absolute", width: 2, height: 28, background: C.encre, left: 0, top: sy > 0 ? 0 : -28 }} />
        </div>
      ))}
      <div style={{ position: "absolute", top: 82, left: G, right: 1080 - D, display: "flex", alignItems: "center", gap: 20, opacity: guides }}>
        <Etiq couleur={C.encre}>TENDERPILOT</Etiq>
        <div style={{ flex: 1, height: 2, background: C.trait }} />
        <Etiq couleur={C.encre} style={{ fontVariantNumeric: "tabular-nums" }}>
          <span style={{ display: "inline-block", overflow: "hidden", height: "1.2em", verticalAlign: "bottom" }}>
            <span style={{ display: "block", transform: `translateY(${-(rang - 1 - (rang > 1 ? 1 - entre(f, scenes[rang - 1], scenes[rang - 1] + 10, 0, 1) : 0)) * 1.2}em)` }}>
              {scenes.map((_, i) => (
                <span key={i} style={{ display: "block", height: "1.2em" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
              ))}
            </span>
          </span>{" "}
          / 06
        </Etiq>
      </div>
      {/* L'avancement du film. */}
      <div style={{ position: "absolute", left: G, top: 1836, width: D - G, height: 3, background: C.trait, opacity: guides }}>
        <div style={{ width: `${(f / DUREE) * 100}%`, height: "100%", background: C.bleu }} />
      </div>
    </>
  );
};

// ------------------------------------------------------------ LA FRISE

/**
 * La frise des jours. `de` jours avant l'echeance jusqu'a J-0, entre G et D.
 * Reprise en ouverture (J-30) et aux rappels (J-10) : c'est la colonne
 * vertebrale du film.
 */
const Frise: React.FC<{ f0: number; y: number; de: number; pas: number; curseur: number; sortie: number }> = ({
  f0,
  y,
  de,
  pas,
  curseur,
  sortie,
}) => {
  const f = useCurrentFrame();
  const x = (j: number) => G + ((de - j) / de) * (D - G);
  const trace = entre(f, f0, f0 + 28, 0, 1, DOUX);
  const pastille = ressort(f, f0 + 30, 30, 260, 12);
  const pulse = ((f - f0) % TEMPS) / TEMPS;
  const jour = Math.round(de - ((curseur - G) / (D - G)) * de);
  return (
    <div style={{ position: "absolute", left: 0, top: y, width: 1080, opacity: 1 - sortie, transform: `translateX(${-sortie * 160}px)` }}>
      <div style={{ position: "absolute", left: G, top: 0, width: (D - G) * trace, height: 4, background: C.encre }} />
      {Array.from({ length: de + 1 }, (_, i) => {
        const j = de - i;
        const majeur = j % pas === 0;
        const p = entre(f, f0 + 6 + i * (22 / de), f0 + 14 + i * (22 / de), 0, 1);
        return (
          <div key={j} style={{ position: "absolute", left: x(j) - 1, top: majeur ? -22 : -12, opacity: p }}>
            <div style={{ width: 2, height: majeur ? 22 : 12, background: C.encre }} />
            {majeur && (
              <div style={{ position: "absolute", top: 40, left: -40, width: 80, textAlign: "center", fontFamily: POLICE, fontWeight: 700, fontSize: 22, color: j === 0 ? C.rouge : C.gris, fontVariantNumeric: "tabular-nums" }}>
                J-{j}
              </div>
            )}
          </div>
        );
      })}
      {/* L'echeance, en rouge : le seul rouge du film. */}
      <div style={{ position: "absolute", left: D - 16, top: -14, width: 32, height: 32, borderRadius: 16, background: C.rouge, transform: `scale(${pastille})` }} />
      <div style={{ position: "absolute", left: D - 16, top: -14, width: 32, height: 32, borderRadius: 16, border: `3px solid ${C.rouge}`, transform: `scale(${1 + pulse * 2.4})`, opacity: pastille * (1 - pulse) }} />
      <Etiq couleur={C.rouge} style={{ position: "absolute", right: 1080 - D - 4, top: 84, opacity: pastille }}>
        DATE LIMITE
      </Etiq>
      {/* Le curseur : aujourd'hui. */}
      <div style={{ position: "absolute", left: curseur - 1, top: -120, opacity: entre(f, f0 + 34, f0 + 42, 0, 1) }}>
        <div style={{ width: 3, height: 150, background: C.bleu }} />
        <div
          style={{
            position: "absolute",
            top: -46,
            left: -60,
            width: 120,
            textAlign: "center",
            fontFamily: POLICE,
            fontWeight: 800,
            fontSize: 24,
            color: "#fff",
            background: C.bleu,
            borderRadius: 8,
            padding: "6px 0",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {jour === 0 ? "J-0" : `J-${jour}`}
        </div>
      </div>
    </div>
  );
};

// ================================================================ SCENES

const S1Enjeu: React.FC = () => {
  const f = useCurrentFrame();
  const sortie = entre(f, S.cout - 12, S.cout, 0, 1, ACCELERE);
  const curseur = entre(f, 64, 150, G, G + (18 / 30) * (D - G), DOUX);
  return (
    <>
      <Titre lignes={["Un appel d'offres", "se gagne *avant*", "la date limite."]} debut={14} fin={S.cout - 2} y={380} taille={104} />
      <Frise f0={20} y={1250} de={30} pas={5} curseur={curseur} sortie={sortie} />
      <Masque debut={70} fin={S.cout - 4} style={{ position: "absolute", left: G, top: 1460, width: 700 }}>
        <div style={{ fontFamily: POLICE, fontSize: 32, fontWeight: 500, color: C.gris, lineHeight: 1.35 }}>Chaque jour qui passe réduit le temps pour préparer votre offre.</div>
      </Masque>
    </>
  );
};

const CELLULES = [
  { de: 0, a: 60, suffixe: "+", texte: "sites à surveiller", couleur: C.encre },
  { de: 0, a: 500, suffixe: " F", texte: "de journaux, chaque jour", couleur: C.encre },
  { de: 7, a: 7, suffixe: " j/7", texte: "une veille à refaire chaque matin", couleur: C.encre },
  { de: 1, a: 1, suffixe: "", texte: "avis manqué, un marché perdu", couleur: C.rouge },
];

const S2Cout: React.FC = () => {
  const f = useCurrentFrame();
  const haut = 500;
  const cote = 500;
  const trace = entre(f, S.cout + 4, S.cout + 28, 0, 1, DOUX);
  const repli = entre(f, S.marque - 22, S.marque - 6, 0, 1, DOUX);
  return (
    <>
      <Titre lignes={["La veille manuelle", "*coûte cher.*"]} debut={S.cout + 4} fin={S.marque - 8} y={230} />
      {/* La grille des quatre chiffres. En sortie, elle se replie sur son axe horizontal. */}
      <div style={{ position: "absolute", left: 540 - 1, top: haut + (cote - 0) * repli, width: 2, height: cote * 2 * trace * (1 - repli), background: C.encre }} />
      {[haut, haut + cote, haut + cote * 2].map((y, i) => (
        <div
          key={y}
          style={{
            position: "absolute",
            left: G,
            top: y + (haut + cote - y) * repli,
            width: (D - G) * entre(f, S.cout + 4 + i * 4, S.cout + 26 + i * 4, 0, 1, DOUX),
            height: 2,
            background: C.encre,
            opacity: i === 1 ? 1 : 1 - repli,
          }}
        />
      ))}
      {CELLULES.map((c, i) => {
        const d = S.cout + 20 + i * TEMPS;
        const n = Math.round(entre(f, d, d + 26, c.de, c.a, DOUX));
        const x = i % 2 ? 540 + 40 : G + 10;
        const y = haut + (i < 2 ? 0 : cote) + 44;
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y + (haut + cote - y) * repli, width: 400, opacity: 1 - repli, transform: `scaleY(${1 - repli * 0.6})` }}>
            <Masque debut={d}>
              <div style={{ fontFamily: TITRE, fontWeight: 800, fontStretch: "88%", fontSize: 150, letterSpacing: "-0.04em", lineHeight: 1, color: c.couleur, fontVariantNumeric: "tabular-nums" }}>
                {n.toLocaleString("fr-FR").replace(/ /g, " ")}
                <span style={{ fontSize: 80 }}>{c.suffixe}</span>
              </div>
            </Masque>
            <Masque debut={d + 6}>
              <div style={{ fontFamily: POLICE, fontSize: 30, fontWeight: 600, color: C.gris, marginTop: 18, lineHeight: 1.3 }}>{c.texte}</div>
            </Masque>
          </div>
        );
      })}
    </>
  );
};

const S3Marque: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const monte = entre(f, S.marque - 4, S.marque + 12, 0, 1, SORTIE);
  const plie = entre(f, S.marque + 16, S.marque + 40, 0, 1, DOUX);
  const tuile = { l: 380, t: 520, c: 320, r: 84 };
  const box = {
    left: tuile.l * plie,
    top: 1920 * (1 - monte) + tuile.t * plie,
    width: 1080 + (tuile.c - 1080) * plie,
    height: 1920 + (tuile.c - 1920) * plie,
    r: tuile.r * plie,
  };
  const sortie = entre(f, S.methode - 12, S.methode, 0, 1, ACCELERE);
  const hMot = 230;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - sortie, transform: `scale(${1 + sortie * 0.06})` }}>
      {/* Les ondes qui partent de la tuile quand elle se pose. */}
      {[0, 1, 2].map((k) => {
        const p = entre(f, S.marque + 40 + k * 8, S.marque + 80 + k * 8, 0, 1, SORTIE);
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              left: 540 - 160 - p * 360,
              top: 680 - 160 - p * 360,
              width: 320 + p * 720,
              height: 320 + p * 720,
              borderRadius: "50%",
              border: `2px solid ${C.bleu}`,
              opacity: (1 - p) * 0.5 * (p > 0 ? 1 : 0),
            }}
          />
        );
      })}
      <div style={{ position: "absolute", left: box.left, top: box.top, width: box.width, height: box.height, borderRadius: box.r, background: C.bleu, boxShadow: `0 ${40 * plie}px ${90 * plie}px rgba(0,80,240,${0.35 * plie})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Img src={staticFile("icone-clair.png")} style={{ width: 230, transform: `scale(${ressort(f, S.marque + 38, fps, 200, 12)})` }} />
      </div>
      <div style={{ position: "absolute", top: 930, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div style={{ width: entre(f, S.marque + 48, S.marque + 70, 0, (850 / 267) * hMot, SORTIE), overflow: "hidden" }}>
          <Img src={staticFile("mot-fonce.png")} style={{ height: hMot }} />
        </div>
      </div>
      <div style={{ position: "absolute", top: 1230, left: 0, right: 0, textAlign: "center", fontFamily: TITRE, fontWeight: 700, fontSize: 64, letterSpacing: "-0.025em", color: C.encre, lineHeight: 1.08 }}>
        <Masque debut={S.marque + 70}>La veille automatique</Masque>
        <Masque debut={S.marque + 76}>des appels d'offres.</Masque>
      </div>
      <div style={{ position: "absolute", top: 1440, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <Masque debut={S.marque + 90}>
          <Etiq taille={26}>8 PAYS · 61 SOURCES OFFICIELLES</Etiq>
        </Masque>
      </div>
    </div>
  );
};

// Les 61 sources : des points dans un champ, quelques-uns nommes.
const POINTS = Array.from({ length: 61 }, (_, i) => {
  let x = 0;
  let y = 0;
  for (let k = 0; k < 20; k++) {
    x = 120 + random(`sx${i}-${k}`) * 840;
    y = 700 + random(`sy${i}-${k}`) * 780;
    if (Math.hypot(x - 540, y - 1090) > 190) break;
  }
  return { x, y };
});
const NOMMES: [number, string][] = [
  [3, "Banque mondiale"], [9, "PNUD"], [14, "BAD"], [21, "DNCMP Bénin"], [28, "ARMP Cameroun"], [36, "DNCCP Togo"], [44, "UE · TED"], [52, "UNGM"],
];
const ORDRE = [...LIGNES].sort((a, b) => a.jours - b.jours).slice(0, 7);
const MELANGE = [3, 0, 5, 1, 6, 2, 4]; // la position de chaque ligne avant le tri

const S4Methode: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const P2 = S.methode + 54;
  const P3 = S.methode + 108;
  const phase = f < P2 ? 0 : f < P3 ? 1 : 2;
  const bascule = (d: number) => entre(f, d, d + 12, 0, 1, DOUX);
  const souligne = phase === 0 ? 0 : phase === 1 ? bascule(P2) : 1 + bascule(P3);
  const sortie = entre(f, S.rappels - 12, S.rappels, 0, 1, ACCELERE);
  const ONGLETS = ["Collecte", "Tri", "Alerte"];
  const converge = entre(f, S.methode + 30, S.methode + 50, 0, 1, ACCELERE);
  const centre = { x: 540, y: 1090 };
  const collecteur = ressort(f, S.methode + 44, fps, 220, 12) * (1 - entre(f, P2, P2 + 8, 0, 1));
  const tri = entre(f, P2 + 28, P2 + 44, 0, 1, DOUX);
  const leve = ressort(f, P3 + 4, fps, 170, 14);

  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - sortie, transform: `translateY(${-sortie * 80}px)` }}>
      {/* Les etapes, dans l'ordre reel du traitement. */}
      <div style={{ position: "absolute", top: 200, left: G, width: D - G, display: "flex" }}>
        {ONGLETS.map((o, i) => (
          <div key={o} style={{ flex: 1, fontFamily: POLICE, fontWeight: 800, fontSize: 32, color: i === phase ? C.encre : C.pale, display: "flex", gap: 14, opacity: entre(f, S.methode + i * 4, S.methode + 10 + i * 4, 0, 1) }}>
            <span style={{ color: i === phase ? C.bleu : C.pale, fontVariantNumeric: "tabular-nums" }}>0{i + 1}</span>
            {o}
          </div>
        ))}
        <div style={{ position: "absolute", top: 58, left: 0, width: D - G, height: 2, background: C.trait }} />
        <div style={{ position: "absolute", top: 56, left: ((D - G) / 3) * souligne, width: (D - G) / 3 - 30, height: 6, background: C.bleu }} />
      </div>

      <Titre lignes={["*61 sources*", "officielles, lues."]} debut={S.methode + 4} fin={P2 + 2} y={330} taille={88} />
      <Titre lignes={["Triées par", "*échéance.*"]} debut={P2 + 4} fin={P3 + 2} y={330} taille={88} />
      <Titre lignes={["L'urgent", "*vient à vous.*"]} debut={P3 + 4} fin={S.rappels - 2} y={330} taille={88} />

      {/* 01 - la collecte */}
      {f < P2 + 10 && (
        <>
          <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
            {POINTS.map((p, i) => (
              <line
                key={i}
                x1={p.x}
                y1={p.y}
                x2={p.x + (centre.x - p.x) * entre(f, S.methode + 20 + (i % 10), S.methode + 34 + (i % 10), 0, 1, DOUX)}
                y2={p.y + (centre.y - p.y) * entre(f, S.methode + 20 + (i % 10), S.methode + 34 + (i % 10), 0, 1, DOUX)}
                stroke={C.bleu}
                strokeWidth={1.5}
                opacity={0.35 * (1 - converge)}
              />
            ))}
          </svg>
          {POINTS.map((p, i) => {
            const vu = entre(f, S.methode + 2 + i * 0.25, S.methode + 8 + i * 0.25, 0, 1);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: p.x + (centre.x - p.x) * converge - 7,
                  top: p.y + (centre.y - p.y) * converge - 7,
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  background: i % 7 === 0 ? C.bleu : C.encre,
                  opacity: vu * (1 - entre(f, S.methode + 46, S.methode + 50, 0, 1)),
                  transform: `scale(${vu})`,
                }}
              />
            );
          })}
          {NOMMES.map(([i, nom]) => (
            <div
              key={nom}
              style={{
                position: "absolute",
                left: POINTS[i].x + 14,
                top: POINTS[i].y - 14,
                fontFamily: POLICE,
                fontSize: 20,
                fontWeight: 700,
                color: C.encre,
                opacity: entre(f, S.methode + 8, S.methode + 14, 0, 1) * (1 - converge),
                whiteSpace: "nowrap",
              }}
            >
              {nom}
            </div>
          ))}
          <div
            style={{
              position: "absolute",
              left: centre.x - 110,
              top: centre.y - 110,
              width: 220,
              height: 220,
              borderRadius: 110,
              background: C.bleu,
              color: "#fff",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              transform: `scale(${collecteur})`,
            }}
          >
            <div style={{ fontFamily: TITRE, fontWeight: 800, fontSize: 96, lineHeight: 1, letterSpacing: "-0.04em" }}>61</div>
            <div style={{ fontFamily: POLICE, fontWeight: 700, fontSize: 22, letterSpacing: "0.14em" }}>SOURCES</div>
          </div>
        </>
      )}

      {/* 02 - le tri, puis 03 - l'alerte */}
      {f >= P2 && (
        <>
          <div style={{ position: "absolute", left: D - 250, top: 620, width: 250, textAlign: "right", opacity: entre(f, P2 + 22, P2 + 30, 0, 1) }}>
            <Etiq couleur={C.bleu}>ÉCHÉANCE ↓</Etiq>
          </div>
          {ORDRE.map((l, i) => {
            const st = STATUTS[l.st];
            const vu = entre(f, P2 + 4 + i * 3, P2 + 14 + i * 3, 0, 1);
            const place = MELANGE[i] + (i - MELANGE[i]) * tri;
            const urgent = i === 0;
            const y = 680 + place * 118 - (urgent ? (1 - leve) * 0 : 0);
            const estompe = phase === 2 && !urgent ? 0.25 + 0.75 * (1 - bascule(P3)) : 1;
            return (
              <div
                key={l.titre}
                style={{
                  position: "absolute",
                  left: G,
                  top: y,
                  width: D - G,
                  height: 102,
                  boxSizing: "border-box",
                  display: "flex",
                  alignItems: "center",
                  gap: 22,
                  padding: "0 24px 0 0",
                  background: C.papier,
                  borderRadius: 16,
                  border: `2px solid ${urgent && phase === 2 ? C.rouge : C.trait}`,
                  opacity: vu * estompe,
                  transform: `translateX(${(1 - vu) * 60}px) scale(${urgent && phase === 2 ? 1 + 0.05 * leve : 1})`,
                  boxShadow: urgent && phase === 2 ? `0 ${30 * leve}px ${60 * leve}px rgba(229,55,43,${0.22 * leve})` : "none",
                  zIndex: urgent ? 2 : 1,
                  fontFamily: POLICE,
                }}
              >
                <div style={{ width: 10, alignSelf: "stretch", borderRadius: "14px 0 0 14px", background: st.vif }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 29, fontWeight: 700, color: C.encre, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.titre}</div>
                  <div style={{ fontSize: 22, color: C.gris, marginTop: 2 }}>{l.pays}</div>
                </div>
                <div style={{ fontFamily: TITRE, fontWeight: 800, fontSize: 34, color: st.encre, background: st.fond, padding: "6px 16px", borderRadius: 10, fontVariantNumeric: "tabular-nums" }}>J-{l.jours}</div>
              </div>
            );
          })}
          {phase === 2 && (
            <div
              style={{
                position: "absolute",
                left: G + 40,
                top: 1560 - (1 - ressort(f, P3 + 10, fps, 180, 14)) * -300,
                width: D - G - 80,
                background: C.encre,
                color: "#fff",
                borderRadius: 28,
                padding: "26px 30px",
                boxSizing: "border-box",
                display: "flex",
                gap: 22,
                alignItems: "center",
                fontFamily: POLICE,
                opacity: entre(f, P3 + 10, P3 + 16, 0, 1),
                zIndex: 3,
              }}
            >
              <div style={{ width: 70, height: 70, borderRadius: 18, background: C.rouge, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: C.pale, letterSpacing: "0.12em" }}>TENDERPILOT · MAINTENANT</div>
                <div style={{ fontSize: 32, fontWeight: 800, marginTop: 4 }}>URGENT · 2 jours restants</div>
                <div style={{ fontSize: 24, fontWeight: 500, color: "#C9CEDA", marginTop: 2 }}>Fourniture de médicaments · Togo</div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

/** Les pictogrammes des trois canaux, au trait. */
const Canal: React.FC<{ type: "mail" | "telegram" | "agenda" }> = ({ type }) => (
  <svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke={C.encre} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {type === "mail" && (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 7l9 6 9-6" />
      </>
    )}
    {type === "telegram" && <path d="M21 4L3 11l6 2 2 6 3-4 5 4 2-15zM9 13l9-6" />}
    {type === "agenda" && (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </>
    )}
  </svg>
);

const S5Rappels: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const debutCurseur = S.rappels + 30;
  const finCurseur = S.fin - 30;
  const curseur = entre(f, debutCurseur, finCurseur, G, D, (t) => t);
  const x = (j: number) => G + ((10 - j) / 10) * (D - G);
  const sortie = entre(f, S.fin - 10, S.fin, 0, 1, ACCELERE);
  const RAPPELS = [
    { j: 7, y: 1020, label: "Rappel J-7" },
    { j: 3, y: 880, label: "Rappel J-3" },
    { j: 1, y: 740, label: "Rappel la veille" },
  ];
  const arrive = f >= finCurseur;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - sortie }}>
      <Titre lignes={["Alerté à *J-7*,", "J-3 et la veille."]} debut={S.rappels + 4} fin={S.fin} y={250} />
      <Frise f0={S.rappels} y={1250} de={10} pas={1} curseur={curseur} sortie={0} />
      {RAPPELS.map((r) => {
        const passe = entre(f, debutCurseur, finCurseur, 0, 1, (t) => t) >= (10 - r.j) / 10;
        const tf = debutCurseur + ((10 - r.j) / 10) * (finCurseur - debutCurseur);
        const p = ressort(f, tf, fps, 220, 14);
        const w = 290;
        const gauche = Math.min(D - w, Math.max(G, x(r.j) - w / 2));
        return (
          <div key={r.j}>
            <div style={{ position: "absolute", left: x(r.j) - 13, top: 1250 - 13, width: 30, height: 30, borderRadius: 15, background: passe ? C.bleu : C.papier, border: `4px solid ${C.bleu}`, boxSizing: "border-box", transform: `scale(${entre(f, S.rappels + 20, S.rappels + 28, 0, 1)})` }} />
            <div style={{ position: "absolute", left: x(r.j) - 1, top: r.y + 90, width: 2, height: (1250 - r.y - 90) * p, background: C.bleu }} />
            <div
              style={{
                position: "absolute",
                left: gauche,
                top: r.y,
                width: w,
                background: C.papier,
                border: `2px solid ${C.bleu}`,
                borderRadius: 18,
                padding: "16px 20px",
                boxSizing: "border-box",
                transform: `translateY(${(1 - p) * 40}px)`,
                opacity: p,
                fontFamily: POLICE,
              }}
            >
              <div style={{ fontSize: 26, fontWeight: 800, color: C.bleu }}>{r.label}</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: C.gris, marginTop: 2 }}>email · Telegram · agenda</div>
            </div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: G, top: 1390, display: "flex", gap: 36, alignItems: "center" }}>
        {(["mail", "telegram", "agenda"] as const).map((t, i) => (
          <div key={t} style={{ display: "flex", gap: 12, alignItems: "center", opacity: entre(f, S.rappels + 40 + i * 6, S.rappels + 48 + i * 6, 0, 1) }}>
            <Canal type={t} />
            <span style={{ fontFamily: POLICE, fontSize: 28, fontWeight: 700, color: C.encre }}>{["Email", "Telegram", "Google Agenda"][i]}</span>
          </div>
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          right: 1080 - D,
          top: 1500,
          display: "flex",
          gap: 14,
          alignItems: "center",
          fontFamily: POLICE,
          fontWeight: 800,
          fontSize: 34,
          color: C.vert,
          opacity: arrive ? entre(f, finCurseur, finCurseur + 8, 0, 1) : 0,
          transform: `translateY(${entre(f, finCurseur, finCurseur + 12, 24, 0)}px)`,
        }}
      >
        <span style={{ width: 48, height: 48, borderRadius: 24, background: C.vert, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>✓</span>
        Dossier déposé à temps
      </div>
    </div>
  );
};

const DRAPEAUX = ["bj", "tg", "ne", "bf", "ci", "sn", "ml", "cm"];

const S6Fin: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f - S.fin;
  const h = 132;
  const reflet = entre(t, 60, 84, -30, 130, DOUX);
  return (
    <>
      <div style={{ position: "absolute", top: 400, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 10 }}>
        <Img src={staticFile("icone-fonce.png")} style={{ height: h, transform: `scale(${ressort(t, 2, fps, 200, 12)})` }} />
        <div style={{ width: entre(t, 8, 26, 0, (850 / 267) * h, SORTIE), overflow: "hidden" }}>
          <Img src={staticFile("mot-fonce.png")} style={{ height: h }} />
        </div>
      </div>
      <div style={{ position: "absolute", top: 670, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <Masque debut={S.fin + 16}>
          <Etiq couleur={C.rouge} taille={24}>VEILLE AUTOMATIQUE · 8 PAYS</Etiq>
        </Masque>
      </div>
      <div style={{ position: "absolute", top: 730, left: 0, right: 0, textAlign: "center", fontFamily: TITRE, color: C.encre }}>
        <Masque debut={S.fin + 20}>
          <div style={{ fontSize: 124, fontWeight: 800, fontStretch: "86%", letterSpacing: "-0.045em", lineHeight: 1 }}>Paiement unique.</div>
        </Masque>
        <Masque debut={S.fin + 28}>
          <div style={{ fontSize: 58, fontWeight: 600, letterSpacing: "-0.02em", color: C.gris }}>
            sans abonnement
          </div>
        </Masque>
      </div>
      <div style={{ position: "absolute", top: 1140, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            gap: 22,
            background: C.bleu,
            color: "#fff",
            fontFamily: POLICE,
            fontWeight: 800,
            fontSize: 54,
            padding: "26px 52px",
            borderRadius: 20,
            transform: `scale(${ressort(t, 40, fps, 190, 13)})`,
            boxShadow: "0 30px 70px rgba(0,80,240,0.3)",
          }}
        >
          tenderpilot.store <span style={{ fontSize: 48 }}>→</span>
          <div style={{ position: "absolute", top: 0, bottom: 0, left: `${reflet}%`, width: "18%", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)", transform: "skewX(-20deg)" }} />
        </div>
      </div>
      <div style={{ position: "absolute", top: 1340, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <Masque debut={S.fin + 50}>
          <div style={{ fontFamily: POLICE, fontSize: 28, fontWeight: 600, color: C.gris }}>Sources officielles · Satisfait ou remboursé 30 jours</div>
        </Masque>
      </div>
      <div style={{ position: "absolute", top: 1470, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 18 }}>
        {DRAPEAUX.map((d, i) => (
          <Img
            key={d}
            src={staticFile(`drapeaux/${d}.svg`)}
            style={{ width: 84, height: 56, objectFit: "cover", borderRadius: 8, border: `2px solid ${C.trait}`, transform: `scale(${ressort(t, 56 + i * 2, fps, 240, 13)})` }}
          />
        ))}
      </div>
      <div style={{ position: "absolute", top: 1550, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <Masque debut={S.fin + 70}>
          <Etiq taille={22}>8 PAYS SUIVIS</Etiq>
        </Masque>
      </div>
    </>
  );
};

// ================================================================ FILM

export const FilmC: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.papier, overflow: "hidden" }}>
      <Habillage />
      {f < S.cout + 2 && <S1Enjeu />}
      {f >= S.cout && f < S.marque + 4 && <S2Cout />}
      {f >= S.marque - 6 && f < S.methode + 2 && <S3Marque />}
      {f >= S.methode && f < S.rappels + 2 && <S4Methode />}
      {f >= S.rappels && f < S.fin + 2 && <S5Rappels />}
      {f >= S.fin && <S6Fin />}
      <Audio src={staticFile("musique-c.wav")} />
    </AbsoluteFill>
  );
};
