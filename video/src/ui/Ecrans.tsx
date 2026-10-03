import { POLICE } from "../polices";
import { entre, ressort } from "./anim";

/**
 * Les trois ecrans du telephone, dessines a la taille exacte de l'ecran
 * (L x H) au lieu de captures qui laissaient du vide. Ils reprennent le
 * contenu reel des alertes TenderPilot - memes rubriques, memes libelles -
 * mais sans logo de marque tierce : Gmail, Telegram et Google ne sont
 * evoques que par leur mise en page et leurs couleurs.
 *
 * `t` = images ecoulees depuis que l'ecran est apparu : chacun s'anime un
 * peu (message qui arrive, bandeau qui descend), un ecran fige fait capture.
 */
export const L_ECRAN = 508;
export const H_ECRAN = 1028;

const AVIS = {
  titre: "Fourniture de médicaments",
  acheteur: "Ministère de la Santé · Togo",
  echeance: "2026-10-02",
  source: "TG-DNCCP",
};

const BarreEtat: React.FC<{ sombre?: boolean }> = ({ sombre }) => (
  <div
    style={{
      height: 56,
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      padding: "0 34px 8px",
      fontFamily: POLICE,
      fontWeight: 700,
      fontSize: 19,
      color: sombre ? "#fff" : "#111",
    }}
  >
    <span>9:41</span>
    <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <span style={{ width: 18, height: 11, borderRadius: 2, background: sombre ? "#fff" : "#111", opacity: 0.9 }} />
      <span style={{ width: 26, height: 12, borderRadius: 3, border: `2px solid ${sombre ? "#fff" : "#111"}`, position: "relative" }}>
        <span style={{ position: "absolute", inset: 2, right: 6, background: sombre ? "#fff" : "#111", borderRadius: 1 }} />
      </span>
    </span>
  </div>
);

const Pastille: React.FC<{ fond: string; encre: string; texte: string }> = ({ fond, encre, texte }) => (
  <span style={{ background: fond, color: encre, fontWeight: 800, fontSize: 15, padding: "4px 10px", borderRadius: 999, letterSpacing: "0.03em" }}>
    {texte}
  </span>
);

// --------------------------------------------------------------- EMAIL

export const EcranEmail: React.FC<{ t: number; fps: number }> = ({ t, fps }) => {
  const carte = ressort(t, 4, fps, 140, 15);
  const pulse = 0.5 + 0.5 * Math.sin(t / 5);
  return (
    <div style={{ width: L_ECRAN, height: H_ECRAN, background: "#F6F8FC", fontFamily: POLICE, overflow: "hidden" }}>
      <BarreEtat />
      {/* La barre de l'application de messagerie. */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 22px 16px" }}>
        <div style={{ fontSize: 30, color: "#444" }}>←</div>
        <div style={{ flex: 1 }} />
        {[0, 1, 2].map((k) => (
          <div key={k} style={{ width: 22, height: 22, borderRadius: 5, border: "2.5px solid #555" }} />
        ))}
      </div>
      <div style={{ padding: "0 24px" }}>
        <div style={{ fontSize: 25, fontWeight: 700, color: "#1F1F1F", lineHeight: 1.25 }}>
          [TenderPilot] URGENT - 2 jours restants - {AVIS.titre}
        </div>
        <div style={{ display: "inline-block", marginTop: 10, fontSize: 15, fontWeight: 600, color: "#5F6368", background: "#E8EAED", padding: "3px 10px", borderRadius: 6 }}>
          Boîte de réception
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 20 }}>
          <div style={{ width: 52, height: 52, borderRadius: 26, background: "#4F46FF", color: "#fff", fontWeight: 800, fontSize: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
            T
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#1F1F1F" }}>TenderPilot</div>
            <div style={{ fontSize: 16, color: "#5F6368" }}>à moi · 08:03</div>
          </div>
        </div>
      </div>

      {/* Le corps de l'alerte, tel que TenderPilot l'envoie. */}
      <div
        style={{
          margin: "22px 18px 0",
          background: "#fff",
          borderRadius: 22,
          border: "1px solid #E5E7EB",
          padding: 22,
          transform: `translateY(${(1 - carte) * 60}px)`,
          opacity: carte,
          boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 800, color: "#0B1225" }}>
          Tender<span style={{ color: "#0050F0" }}>Pilot</span>
        </div>
        <div style={{ marginTop: 16, background: "#FFD6D6", borderRadius: 14, padding: "14px 16px", boxShadow: `0 0 ${18 * pulse}px rgba(248,113,113,0.5)` }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", color: "#9B1C1C" }}>ÉCHÉANCE PROCHE</div>
          <div style={{ fontSize: 30, fontWeight: 900, color: "#9B1C1C", marginTop: 2 }}>URGENT · dans 2 jours</div>
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: "#0B1225", marginTop: 18, lineHeight: 1.25 }}>{AVIS.titre}</div>
        <div style={{ fontSize: 17, color: "#4B5563", marginTop: 6 }}>Acheteur : {AVIS.acheteur}</div>
        <div style={{ display: "inline-block", marginTop: 18, background: "#1F3A5F", color: "#fff", fontWeight: 700, fontSize: 18, padding: "13px 20px", borderRadius: 10 }}>
          Ouvrir l'avis officiel
        </div>
        <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "130px 1fr", rowGap: 12, fontSize: 18 }}>
          {[
            ["Pertinence", "3 - PRIORITAIRE"],
            ["Deadline", AVIS.echeance],
            ["Pays", "Togo"],
            ["Source", AVIS.source],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "contents" }}>
              <div style={{ color: "#6B7280" }}>{k}</div>
              <div style={{ color: "#111827", fontWeight: 600 }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 22, background: "#4F46FF", color: "#fff", fontWeight: 700, fontSize: 18, padding: "15px 0", borderRadius: 12, textAlign: "center" }}>
          Ouvrir mon tableau TenderPilot
        </div>
        <div style={{ marginTop: 14, fontSize: 14, color: "#9CA3AF", textAlign: "center" }}>
          Consultez toujours la source officielle avant de candidater.
        </div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------ TELEGRAM

const Bulle: React.FC<{ t: number; debut: number; fps: number; lignes: [string, boolean?][]; heure: string }> = ({
  t,
  debut,
  fps,
  lignes,
  heure,
}) => {
  const p = ressort(t, debut, fps, 190, 14);
  return (
    <div
      style={{
        alignSelf: "flex-start",
        maxWidth: 430,
        background: "#fff",
        borderRadius: "20px 20px 20px 6px",
        padding: "12px 16px 8px",
        boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
        transform: `scale(${0.6 + 0.4 * p})`,
        transformOrigin: "0% 100%",
        opacity: p,
        fontSize: 20,
        lineHeight: 1.35,
        color: "#111",
      }}
    >
      {lignes.map(([txt, fort], i) => (
        <div key={i} style={{ fontWeight: fort ? 800 : 500, color: txt.startsWith("Ouvrir") ? "#2481CC" : undefined }}>
          {txt}
        </div>
      ))}
      <div style={{ textAlign: "right", fontSize: 13, color: "#8A9AA9", marginTop: 2 }}>{heure}</div>
    </div>
  );
};

export const EcranTelegram: React.FC<{ t: number; fps: number }> = ({ t, fps }) => (
  <div style={{ width: L_ECRAN, height: H_ECRAN, fontFamily: POLICE, overflow: "hidden", position: "relative", background: "linear-gradient(160deg, #B8D98E, #7FB56A 55%, #5E9D63)" }}>
    {/* Le motif discret du fond de conversation. */}
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: 0.18,
        backgroundImage: "radial-gradient(circle at 20px 20px, #fff 3px, transparent 4px), radial-gradient(circle at 60px 60px, #fff 2px, transparent 3px)",
        backgroundSize: "80px 80px",
      }}
    />
    <div style={{ position: "relative", background: "rgba(255,255,255,0.92)", paddingBottom: 12 }}>
      <BarreEtat />
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "4px 18px 0" }}>
        <div style={{ fontSize: 28, color: "#2481CC" }}>←</div>
        <div style={{ width: 50, height: 50, borderRadius: 25, background: "linear-gradient(135deg, #FF8A65, #E64A19)", color: "#fff", fontWeight: 800, fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>
          T
        </div>
        <div>
          <div style={{ fontSize: 21, fontWeight: 700, color: "#111" }}>TenderPilot</div>
          <div style={{ fontSize: 15, color: "#8A9AA9" }}>bot</div>
        </div>
      </div>
    </div>
    <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 14, padding: "20px 16px" }}>
      <div style={{ alignSelf: "center", background: "rgba(0,0,0,0.22)", color: "#fff", fontSize: 15, fontWeight: 700, padding: "5px 14px", borderRadius: 999 }}>
        Aujourd'hui
      </div>
      <Bulle t={t} debut={0} fps={fps} heure="08:03" lignes={[
        ["Nouvelle opportunité", true],
        ["Construction d'un centre de santé"],
        ["Ministère de la Santé · Bénin"],
        ["Échéance : 2026-10-20"],
      ]} />
      <Bulle t={t} debut={6} fps={fps} heure="13:01" lignes={[
        ["Échéance dans 7 jours", true],
        ["Étude de faisabilité d'un barrage"],
        ["Cameroun · Échéance : 2026-10-07"],
      ]} />
      <Bulle t={t} debut={12} fps={fps} heure="18:02" lignes={[
        ["URGENT - échéance proche", true],
        [AVIS.titre],
        [AVIS.acheteur],
        [`Échéance : ${AVIS.echeance}`],
        ["Ouvrir l'avis officiel ›"],
      ]} />
      <Bulle t={t} debut={18} fps={fps} heure="18:02" lignes={[
        ["DERNIER RAPPEL - échéance demain", true],
        ["Réhabilitation de forages · Niger"],
        ["Échéance : 2026-10-01"],
      ]} />
    </div>
    {/* La barre de saisie, en bas. */}
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 86, background: "rgba(255,255,255,0.95)", display: "flex", alignItems: "center", gap: 14, padding: "0 20px" }}>
      <div style={{ flex: 1, height: 46, borderRadius: 23, background: "#F1F3F4", color: "#9AA0A6", fontSize: 18, display: "flex", alignItems: "center", paddingLeft: 18 }}>Message</div>
      <div style={{ width: 46, height: 46, borderRadius: 23, background: "#2481CC" }} />
    </div>
  </div>
);

// -------------------------------------------------------------- AGENDA

// Octobre 2026 commence un jeudi. La semaine commence le lundi.
const JOURS = ["L", "M", "M", "J", "V", "S", "D"];
const CASES: { jour: number; mois: "prec" | "oct" | "suiv" }[] = [
  { jour: 28, mois: "prec" as const }, { jour: 29, mois: "prec" as const }, { jour: 30, mois: "prec" as const },
  ...Array.from({ length: 31 }, (_, i) => ({ jour: i + 1, mois: "oct" as const })),
  ...Array.from({ length: 8 }, (_, i) => ({ jour: i + 1, mois: "suiv" as const })),
].slice(0, 35);
// Les echeances suivies, posees par TenderPilot : couleur du statut.
const ECHEANCES: Record<number, { c: string; txt: string }> = {
  2: { c: "#F87171", txt: "Médicaments" },
  7: { c: "#FBBF24", txt: "Barrage" },
  20: { c: "#34D399", txt: "Centre de santé" },
};

export const EcranAgenda: React.FC<{ t: number; fps: number }> = ({ t, fps }) => {
  const bandeau = ressort(t, 10, fps, 150, 15) * (1 - entre(t, 34, 42, 0, 1));
  return (
    <div style={{ width: L_ECRAN, height: H_ECRAN, background: "#fff", fontFamily: POLICE, overflow: "hidden", position: "relative" }}>
      <BarreEtat />
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "6px 24px 14px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {[0, 1, 2].map((k) => <div key={k} style={{ width: 24, height: 3, background: "#5F6368", borderRadius: 2 }} />)}
        </div>
        <div style={{ fontSize: 28, fontWeight: 600, color: "#1F1F1F" }}>Octobre</div>
        <div style={{ flex: 1 }} />
        <div style={{ width: 38, height: 38, borderRadius: 8, border: "2.5px solid #5F6368", fontSize: 16, fontWeight: 700, color: "#5F6368", display: "flex", alignItems: "center", justifyContent: "center" }}>30</div>
      </div>

      {/* La grille du mois. */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", padding: "0 10px", fontSize: 14, color: "#70757A", fontWeight: 600, textAlign: "center" }}>
        {JOURS.map((j, i) => <div key={i} style={{ paddingBottom: 8 }}>{j}</div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", padding: "0 10px", borderTop: "1px solid #E8EAED" }}>
        {CASES.map((c, i) => {
          const auj = c.mois === "prec" && c.jour === 30;
          const ev = c.mois === "oct" ? ECHEANCES[c.jour] : undefined;
          const pop = ev ? ressort(t, 2 + (c.jour % 5) * 2, fps, 180, 13) : 0;
          return (
            <div key={i} style={{ height: 136, borderBottom: "1px solid #E8EAED", borderRight: i % 7 === 6 ? undefined : "1px solid #F1F3F4", padding: "6px 3px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  fontWeight: 600,
                  background: auj ? "#1A73E8" : undefined,
                  color: auj ? "#fff" : c.mois === "oct" ? "#3C4043" : "#BDC1C6",
                }}
              >
                {c.jour}
              </div>
              {ev && (
                <div
                  style={{
                    width: "100%",
                    background: ev.c,
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 700,
                    borderRadius: 5,
                    padding: "3px 3px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    transform: `scale(${0.4 + 0.6 * pop})`,
                    opacity: pop,
                  }}
                >
                  {ev.txt}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Le rappel qui descend du haut de l'ecran. */}
      <div
        style={{
          position: "absolute",
          left: 14,
          right: 14,
          top: 60 - (1 - bandeau) * 180,
          background: "rgba(255,255,255,0.97)",
          borderRadius: 22,
          boxShadow: "0 12px 34px rgba(0,0,0,0.22)",
          padding: "16px 18px",
          display: "flex",
          gap: 14,
          alignItems: "center",
          opacity: bandeau,
        }}
      >
        <div style={{ width: 50, height: 54, borderRadius: 12, background: "#1A73E8", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0, lineHeight: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em" }}>OCT</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>2</div>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#5F6368" }}>AGENDA · rappel</div>
          <div style={{ fontSize: 19, fontWeight: 800, color: "#111" }}>Échéance : {AVIS.titre}</div>
          <div style={{ fontSize: 15, color: "#5F6368" }}>Vendredi 2 octobre · toute la journée</div>
        </div>
      </div>

      {/* Le detail de l'evenement, en bas, comme dans l'application. */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 190, background: "#F8F9FA", borderTop: "1px solid #E8EAED", padding: "20px 24px", boxSizing: "border-box", opacity: entre(t, 20, 30, 0, 1), transform: `translateY(${entre(t, 20, 30, 40, 0)}px)` }}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div style={{ width: 16, height: 16, borderRadius: 4, background: "#F87171", marginTop: 6 }} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#1F1F1F" }}>Échéance : {AVIS.titre}</div>
            <div style={{ fontSize: 16, color: "#5F6368", marginTop: 4 }}>Vendredi 2 octobre · Toute la journée</div>
            <div style={{ fontSize: 16, color: "#3C4043", marginTop: 8 }}>Rappels : 7 jours avant · la veille</div>
            <div style={{ fontSize: 16, color: "#3C4043", marginTop: 4 }}>Ministère de la Santé · Togo · TG-DNCCP</div>
            <div style={{ fontSize: 16, color: "#1A73E8", marginTop: 4 }}>Ouvrir l'avis officiel</div>
          </div>
        </div>
      </div>
    </div>
  );
};
