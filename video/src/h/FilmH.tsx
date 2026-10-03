import { AbsoluteFill, Audio, random, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { chargerPolices, POLICE } from "../polices";
import { ACCELERE, DOUX, SORTIE, entre, ressort } from "../ui/anim";

chargerPolices();

/**
 * FILM H - « Combien coute un avis rate ? ». L'argument rationnel, pour ceux
 * qui comparent les couts : un ticket de caisse qui s'imprime, ligne par
 * ligne, et fait l'addition de la veille manuelle.
 *
 * LES CHIFFRES SONT UNE ESTIMATION, et le film le dit : tout decoule de deux
 * hypotheses ecrites en pied du ticket (500 F de journaux et 2 h de recherche
 * par jour ouvre, 20 jours par mois). Le prix d'un marche rate n'est pas
 * invente : il reste « ??? ».
 *
 * Le film ne montre AUCUN prix de TenderPilot : il finit sur une question, et
 * la fin commune (src/fin) y repond.
 */
export const DUREE_H = 780;

const T = { navy: "#0B1225", primary: "#4F46FF", lightBlue: "#EEF0FF", g500: "#6B7280", rouge: "#DC2626" };
const MACHINE = "PlexTP, 'IBM Plex Mono', ui-monospace, monospace";

// Les hypotheses : changer ici recalcule tout le ticket.
const JOURNAL_PAR_JOUR = 500;
const HEURES_PAR_JOUR = 2;
const JOURS_PAR_MOIS = 20;
const SITES_PAR_JOUR = 60;

const f0 = (n: number) => Math.round(n).toLocaleString("fr-FR").replace(/ /g, " ");

type Ligne = { d: number; libelle: string; detail?: string; valeur: (p: number) => string; couleur?: string; gras?: boolean };
const MOIS_F = JOURNAL_PAR_JOUR * JOURS_PAR_MOIS;
const MOIS_H = HEURES_PAR_JOUR * JOURS_PAR_MOIS;
const LIGNES: Ligne[] = [
  { d: 180, libelle: "Journaux", detail: `≈ ${f0(JOURNAL_PAR_JOUR)} F × ${JOURS_PAR_MOIS} jours`, valeur: (p) => `${f0(MOIS_F * p)} F` },
  { d: 270, libelle: "Temps de recherche", detail: `≈ ${HEURES_PAR_JOUR} h × ${JOURS_PAR_MOIS} jours`, valeur: (p) => `${f0(MOIS_H * p)} h` },
  { d: 360, libelle: "Sites consultés", detail: "chaque jour", valeur: (p) => `${f0(SITES_PAR_JOUR * p)}` },
  { d: 410, libelle: "Avis repérés trop tard", valeur: () => "?" },
  { d: 460, libelle: "Un marché raté", valeur: () => "???", couleur: T.rouge, gras: true },
];
const ANNEE = 560; // la ligne « sur un an »

/** La hauteur imprimee du ticket, selon les lignes deja sorties. */
const hauteurTicket = (f: number) => {
  const sorties = [120, ...LIGNES.map((l) => l.d), ANNEE, ANNEE + 40].filter((d) => f >= d).length;
  // Le bloc « sur un an » est plus haut qu'une ligne : 120 px de plus.
  return 150 + entre(f, 96, 120, 0, 90) + sorties * 96 + entre(f, ANNEE + 40, ANNEE + 52, 0, 120);
};

export const FilmH: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titreHaut = entre(f, 80, 100, 0, 1, DOUX); // le titre remonte quand l'imprimante arrive
  const imprimante = ressort(f, 84, fps, 150, 15);
  const h = hauteurTicket(f);
  const froisse = entre(f, 640, 668, 0, 1, ACCELERE);
  const vibre = f >= 470 && f < 490 ? Math.sin(f * 2.4) * 6 : 0;
  const question = entre(f, 664, 690, 0, 1, SORTIE);

  return (
    <AbsoluteFill style={{ background: `radial-gradient(900px 700px at 50% 45%, ${T.lightBlue}, transparent 70%), #F6F7FA`, overflow: "hidden", fontFamily: POLICE }}>
      {/* Le titre : plein ecran, puis il monte se ranger en haut. */}
      <div
        style={{
          position: "absolute",
          left: 60,
          right: 60,
          top: 720 - titreHaut * 590,
          textAlign: "center",
          fontWeight: 800,
          fontSize: 120 - titreHaut * 48,
          lineHeight: 1.06,
          letterSpacing: "-0.03em",
          color: T.navy,
          opacity: 1 - froisse,
        }}
      >
        {["Combien coûte", "un avis raté ?"].map((l, i) => {
          const p = entre(f, 6 + i * 8, 22 + i * 8, 0, 1, SORTIE);
          return (
            <div key={l} style={{ color: i ? T.primary : T.navy, opacity: p, transform: `translateY(${(1 - p) * 40}px)` }}>
              {l}
            </div>
          );
        })}
      </div>

      {/* L'imprimante, et le ticket qui en sort. */}
      <div style={{ position: "absolute", left: 140, top: 330, width: 800, transform: `translateY(${(1 - imprimante) * -700}px) rotate(${froisse * -8}deg) scale(${1 - froisse * 0.5})`, transformOrigin: "50% 0%", opacity: 1 - froisse }}>
        <div style={{ position: "relative", height: 90, borderRadius: 28, background: T.navy, boxShadow: "0 20px 40px rgba(11,18,37,0.25)", zIndex: 2 }}>
          <div style={{ position: "absolute", left: 50, right: 50, bottom: 18, height: 12, borderRadius: 6, background: "#050814" }} />
          <div style={{ position: "absolute", right: 36, top: 22, width: 14, height: 14, borderRadius: 7, background: f % 20 < 10 && f > 100 && f < 640 ? "#34D399" : "#1F2B5E" }} />
        </div>
        <div
          style={{
            position: "relative",
            margin: "-20px 50px 0",
            height: h,
            background: "#fff",
            boxShadow: "0 30px 60px rgba(11,18,37,0.14)",
            transform: `translateX(${vibre}px)`,
            overflow: "hidden",
            fontFamily: MACHINE,
            color: T.navy,
            clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 14px), 95% 100%, 90% calc(100% - 14px), 85% 100%, 80% calc(100% - 14px), 75% 100%, 70% calc(100% - 14px), 65% 100%, 60% calc(100% - 14px), 55% 100%, 50% calc(100% - 14px), 45% 100%, 40% calc(100% - 14px), 35% 100%, 30% calc(100% - 14px), 25% 100%, 20% calc(100% - 14px), 15% 100%, 10% calc(100% - 14px), 5% 100%, 0 calc(100% - 14px))",
          }}
        >
          <div style={{ padding: "50px 44px 0" }}>
            <div style={{ textAlign: "center", fontSize: 30, fontWeight: 700, letterSpacing: "0.08em" }}>VEILLE MANUELLE</div>
            <div style={{ textAlign: "center", fontSize: 22, color: T.g500, marginTop: 6 }}>ESTIMATION · UN MOIS</div>
            <div style={{ borderTop: "3px dashed #CBD2E0", margin: "26px 0 10px" }} />
            {LIGNES.map((l) => {
              if (f < l.d) return null;
              const p = entre(f, l.d + 4, l.d + 40, 0, 1, DOUX);
              return (
                <div key={l.libelle} style={{ height: 96, display: "flex", flexDirection: "column", justifyContent: "center", opacity: entre(f, l.d, l.d + 6, 0, 1) }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, fontSize: 30, fontWeight: l.gras ? 700 : 500, color: l.couleur ?? T.navy }}>
                    <span style={{ whiteSpace: "nowrap" }}>{l.libelle}</span>
                    <span style={{ flex: 1, borderBottom: "3px dotted #CBD2E0", transform: "translateY(-8px)" }} />
                    <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{l.valeur(p)}</span>
                  </div>
                  {l.detail && <div style={{ fontSize: 21, color: T.g500, marginTop: 2 }}>{l.detail}</div>}
                </div>
              );
            })}
            {f >= ANNEE && (
              <>
                <div style={{ borderTop: "3px dashed #CBD2E0", margin: "10px 0 0" }} />
                <div style={{ height: 96, display: "flex", alignItems: "center", fontSize: 26, color: T.g500, opacity: entre(f, ANNEE, ANNEE + 8, 0, 1) }}>× 12 MOIS</div>
              </>
            )}
            {f >= ANNEE + 40 && (
              <div style={{ background: T.navy, color: "#fff", margin: "0 -44px", padding: "22px 44px", opacity: entre(f, ANNEE + 40, ANNEE + 48, 0, 1) }}>
                <div style={{ fontSize: 22, letterSpacing: "0.12em", color: "#A5B4FC" }}>SUR UN AN</div>
                <div style={{ fontSize: 50, fontWeight: 700, fontVariantNumeric: "tabular-nums", marginTop: 4 }}>
                  ≈ {f0(MOIS_F * 12 * entre(f, ANNEE + 44, ANNEE + 76, 0, 1, DOUX))} F
                </div>
                <div style={{ fontSize: 34, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                  + {f0(MOIS_H * 12 * entre(f, ANNEE + 50, ANNEE + 82, 0, 1, DOUX))} heures
                </div>
                <div style={{ fontSize: 26, color: "#FCA5A5", marginTop: 6 }}>+ les marchés ratés</div>
              </div>
            )}
          </div>
        </div>
        {/* L'hypothese, ecrite : c'est ce qui rend le calcul honnete. */}
        <div style={{ margin: "18px 50px 0", textAlign: "center", fontSize: 22, lineHeight: 1.4, color: T.g500, opacity: entre(f, ANNEE + 60, ANNEE + 74, 0, 1) }}>
          Estimation : {f0(JOURNAL_PAR_JOUR)} F de journaux et {HEURES_PAR_JOUR} h de recherche
          <br />
          par jour ouvré, {JOURS_PAR_MOIS} jours par mois.
        </div>
      </div>

      {/* Les petits morceaux de papier quand le ticket part a la corbeille. */}
      {/* Declenche sur le temps : la courbe ACCELERE ne vaut pas tout a fait 0 au depart. */}
      {f > 640 &&
        f < 668 &&
        Array.from({ length: 18 }, (_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 540 + (random(`px${i}`) - 0.5) * 700 * froisse,
              top: 900 + (random(`py${i}`) - 0.3) * 900 * froisse,
              width: 26,
              height: 18,
              background: "#fff",
              boxShadow: "0 4px 8px rgba(11,18,37,0.12)",
              transform: `rotate(${random(`pr${i}`) * 360 * froisse}deg)`,
              opacity: 1 - froisse,
            }}
          />
        ))}

      {/* La question. La reponse, c'est la fin commune. */}
      {f >= 660 && (
        <div style={{ position: "absolute", left: 60, right: 60, top: 700, textAlign: "center", fontWeight: 800, fontSize: 92, lineHeight: 1.08, letterSpacing: "-0.03em" }}>
          <div style={{ color: T.navy, opacity: question, transform: `translateY(${(1 - question) * 40}px)` }}>Et si votre veille</div>
          <div style={{ color: T.primary, opacity: entre(f, 676, 700, 0, 1), transform: `translateY(${entre(f, 676, 700, 40, 0)}px)` }}>coûtait un seul paiement ?</div>
        </div>
      )}
      <Audio src={staticFile("musique-h.wav")} />
    </AbsoluteFill>
  );
};
