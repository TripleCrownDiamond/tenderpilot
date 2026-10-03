import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, STATUTS } from "../theme";
import { POLICE } from "../polices";
import { DOUX, entre, ressort } from "../ui/anim";
import { Titre } from "../ui/Titre";
import { TEMPS } from "../tempo";

// Les libelles des statuts, tels que le classeur les ecrit.
export const NOMS_STATUT = ["OUVERT", "À SURVEILLER", "BIENTÔT", "URGENT"];

// De vraies lignes : c'est ce qui fait comprendre qu'il s'agit d'appels
// d'offres, et pas d'un tableau quelconque.
export const LIGNES = [
  { titre: "Construction d'un centre de santé", pays: "Bénin", jours: 20, st: 0 },
  { titre: "Fourniture de matériel informatique", pays: "Togo", jours: 27, st: 0 },
  { titre: "Réhabilitation de forages", pays: "Niger", jours: 33, st: 0 },
  { titre: "Étude de faisabilité d'un barrage", pays: "Cameroun", jours: 12, st: 1 },
  { titre: "Appui à la digitalisation", pays: "Bénin", jours: 14, st: 1 },
  { titre: "Travaux d'assainissement", pays: "Bénin", jours: 6, st: 2 },
  { titre: "Acquisition de véhicules", pays: "Niger", jours: 7, st: 2 },
  { titre: "Fourniture de médicaments", pays: "Togo", jours: 2, st: 3 },
];
export const L_TABLEAU = 920;
export const H_LIGNE = 104;

export const Ligne: React.FC<{
  titre: string;
  pays: string;
  jours: number;
  statut: number;
  couleur: number;
  lueur?: number;
}> = ({ titre, pays, jours, statut, couleur, lueur = 0 }) => {
  const s = STATUTS[statut];
  return (
    <div
      style={{
        position: "relative",
        width: L_TABLEAU,
        height: H_LIGNE,
        borderRadius: 16,
        overflow: "hidden",
        background: C.verre,
        border: `1px solid ${C.bordVerre}`,
        boxShadow: lueur ? `0 0 ${60 * lueur}px ${s.vif}` : undefined,
        fontFamily: POLICE,
      }}
    >
      {/* La couleur arrive en balayage, de gauche a droite. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: `${couleur * 100}%`,
          background: `linear-gradient(90deg, ${s.vif}38, ${s.vif}12)`,
        }}
      />
      <div style={{ position: "absolute", left: 28, top: 20, fontSize: 29, fontWeight: 600, color: C.texte, whiteSpace: "nowrap" }}>
        {titre}
      </div>
      <div style={{ position: "absolute", left: 28, top: 60, fontSize: 22, fontWeight: 500, color: C.lavande }}>
        {pays} · {jours} jours
      </div>
      <div
        style={{
          position: "absolute",
          right: 22,
          top: 30,
          height: 44,
          padding: "0 18px",
          borderRadius: 22,
          background: s.vif,
          color: "#0B1225",
          fontSize: 19,
          fontWeight: 800,
          letterSpacing: "0.04em",
          display: "flex",
          alignItems: "center",
          opacity: 0.2 + 0.8 * couleur,
          transform: `scale(${0.75 + 0.25 * couleur})`,
          boxShadow: `0 0 ${24 * couleur}px ${s.vif}`,
        }}
      >
        {NOMS_STATUT[statut]}
      </div>
    </div>
  );
};

/**
 * Mesures 5-7. Le coeur de la scene precedente s'ouvre en un tableau de
 * verre, en perspective. Les lignes tombent une par une et prennent leur
 * couleur au rythme des temps ; la camera tourne lentement autour.
 */
export const S3Tableau: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();

  const ouverture = ressort(f, 0, fps, 110, 14);
  const rotX = entre(f, 0, 180, 20, 8, DOUX);
  const rotY = entre(f, 0, 180, -22, -6, DOUX);
  const recul = entre(f, 0, 180, -140, 20, DOUX);
  const balayage = ((f % (TEMPS * 2)) / (TEMPS * 2)) * 1.3 - 0.15;

  return (
    <AbsoluteFill style={{ perspective: 1800, alignItems: "center", justifyContent: "center" }}>
      <Titre lignes={["Tout arrive dans", "*un seul tableau*"]} debut={4} fin={92} y={170} taille={78} />
      <Titre lignes={["Rangé selon", "*le temps qui reste*"]} debut={96} fin={184} y={170} taille={78} />
      <div
        style={{
          marginTop: 250,
          transform: `translateZ(${recul}px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${(0.2 + 0.8 * ouverture) * 0.94})`,
          opacity: Math.min(1, ouverture * 1.4),
          padding: 26,
          borderRadius: 34,
          background: C.clair ? "#FFFFFF" : "linear-gradient(160deg, rgba(20,28,58,0.88), rgba(8,12,28,0.92))",
          border: `1px solid ${C.bordVerre}`,
          boxShadow: `0 60px 140px ${C.ombre}, 0 0 120px ${C.indigo}${C.clair ? "22" : "55"}`,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: L_TABLEAU,
            height: 66,
            borderRadius: 16,
            background: `linear-gradient(90deg, ${C.indigo}, ${C.bleu})`,
            position: "relative",
            overflow: "hidden",
            fontFamily: POLICE,
            fontWeight: 700,
            fontSize: 24,
            color: C.blanc,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(100deg, transparent ${balayage * 100 - 10}%, rgba(255,255,255,0.4) ${balayage * 100}%, transparent ${balayage * 100 + 10}%)`,
            }}
          />
          <div style={{ position: "absolute", left: 28, top: 19 }}>Appel d'offres</div>
          <div style={{ position: "absolute", right: 30, top: 19 }}>Statut</div>
        </div>

        {LIGNES.map((l, i) => {
          const arrivee = 12 + i * (TEMPS / 2);
          const p = ressort(f, arrivee, fps, 160, 15);
          const couleur = entre(f, arrivee + 10, arrivee + 26, 0, 1);
          return (
            <div
              key={i}
              style={{
                transform: `translateY(${(1 - p) * 90}px)`,
                opacity: p,
                filter: `blur(${(1 - p) * 8}px)`,
              }}
            >
              <Ligne titre={l.titre} pays={l.pays} jours={l.jours} statut={l.st} couleur={couleur} />
            </div>
          );
        })}

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: `${((f % 60) / 60) * 100}%`,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${C.lavande}, transparent)`,
            boxShadow: `0 0 20px ${C.lavande}`,
            opacity: f > 60 ? 0.6 : 0,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
