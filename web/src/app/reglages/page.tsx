import { CONFIG_DEFAUT } from "@/lib/domain/regles";

/**
 * Reglages du compte.
 *
 * Les valeurs affichees sont celles livrees par defaut. Elles deviendront
 * modifiables quand la base sera branchee - d'ici la, mieux vaut les montrer
 * en lecture seule que d'offrir des champs qui n'enregistrent rien.
 */

export default function Page() {
  const c = CONFIG_DEFAUT;

  const rappels = [
    ["Nouvelle opportunite", c.envoiNouvelle],
    ["Rappel a 7 jours", c.envoiJ7],
    ["Rappel a 3 jours", c.envoiJ3],
    ["Rappel a 1 jour", c.envoiJ1],
    ["Echeance passee", c.envoiExpire],
  ] as const;

  return (
    <>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>Reglages</h1>
      <p className="aide" style={{ marginBottom: 24 }}>
        Valeurs livrees par defaut. Elles deviendront modifiables une fois la
        base de donnees connectee.
      </p>

      <h2 style={{ fontSize: 20, marginBottom: 4 }}>Emails</h2>
      <p className="aide" style={{ marginBottom: 14 }}>
        Une opportunite ne recoit jamais deux fois le meme type d&apos;email.
        Le tableau de bord, lui, affiche l&apos;etat en permanence.
      </p>
      <div style={{ display: "grid", gap: 8, marginBottom: 30 }}>
        {rappels.map(([libelle, actif]) => (
          <div key={libelle} className="carte">
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span className={"pastille " + (actif ? "s-OUVERT" : "s-EXPIRE")}>
                {actif ? "ACTIF" : "INACTIF"}
              </span>
              <strong>{libelle}</strong>
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 20, marginBottom: 14 }}>Collecte</h2>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid var(--encre)" }}>
              <th style={{ padding: "0 12px 8px 0" }}>Reglage</th>
              <th style={{ padding: "0 12px 8px 0" }}>Valeur</th>
              <th style={{ padding: "0 12px 8px 0" }}>A quoi ca sert</th>
            </tr>
          </thead>
          <tbody>
            <Ligne nom="Adresse de notification"
                   valeur={c.emailNotification || "non renseignee"}
                   quoi="Sans elle, aucun email ne part." />
            <Ligne nom="Seuil de digest" valeur={String(c.seuilDigest)}
                   quoi="Au-dela de ce nombre de nouveautes, un seul email recapitulatif." />
            <Ligne nom="Niveaux notifies"
                   valeur={c.notifierPertinence || "tous"}
                   quoi="Coupe le bruit dans la boite, jamais dans la liste : les annonces ecartees restent visibles." />
            <Ligne nom="Emails par execution"
                   valeur={c.maxEmailsParExecution ? String(c.maxEmailsParExecution) : "sans plafond"}
                   quoi="Au-dela, les alertes repartent au passage suivant - les plus pertinentes d'abord. Rien n'est perdu." />
            <Ligne nom="Annonces par source" valeur={String(c.maxParSource)}
                   quoi="Plafond par passage, pour qu'une source bavarde n'ecrase pas les autres." />
            <Ligne nom="Fuseau horaire" valeur={c.fuseau}
                   quoi="Sert au calcul des jours restants." />
          </tbody>
        </table>
      </div>
    </>
  );
}

function Ligne({ nom, valeur, quoi }: {
  nom: string; valeur: string; quoi: string;
}) {
  return (
    <tr>
      <td style={{ padding: "6px 12px 6px 0" }}><strong>{nom}</strong></td>
      <td className="mono" style={{ padding: "6px 12px 6px 0", whiteSpace: "nowrap" }}>
        {valeur}
      </td>
      <td className="aide" style={{ margin: 0, padding: "6px 12px 6px 0" }}>{quoi}</td>
    </tr>
  );
}
