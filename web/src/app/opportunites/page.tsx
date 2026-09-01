import Link from "next/link";
import { SOURCES_DEFAUT } from "@/data/sources-defaut";

/**
 * Liste des opportunites collectees.
 *
 * L'ecran est vide tant que la base n'est pas branchee. Plutot que d'afficher
 * un cadre muet, il dit ce qui viendra s'y mettre et ce qui manque pour y
 * arriver : un ecran vide qui s'explique ne ressemble pas a une panne.
 */

const COLONNES = [
  ["Opportunite", "l'objet du marche, tel que la source le publie"],
  ["Organisation", "l'acheteur reel quand la source le donne"],
  ["Type", "appel d'offres, AMI, demande de cotation, subvention..."],
  ["Secteur", "energie, eau, sante, numerique..."],
  ["Deadline", "la date limite, lue dans l'annonce"],
  ["Jours restants", "recalcule a chaque passage"],
  ["Statut", "OUVERT, A SURVEILLER, BIENTOT, URGENT ou EXPIRE"],
];

export default function Page() {
  const actives = SOURCES_DEFAUT.filter((s) => s.active).length;

  return (
    <>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>Opportunites</h1>
      <p className="aide" style={{ marginBottom: 24 }}>
        Tout ce que la collecte rapporte, dedoublonne et suivi jusqu&apos;a
        l&apos;echeance.
      </p>

      <div className="vide">
        <p>Aucune opportunite pour le moment.</p>
        <p className="aide">
          {actives} sources sont pretes a etre collectees. La liste se remplira
          au premier passage, une fois la base de donnees connectee.
        </p>
      </div>

      <h2 style={{ fontSize: 20, margin: "34px 0 4px" }}>Ce que la liste montrera</h2>
      <p className="aide" style={{ marginBottom: 14 }}>
        Une ligne par opportunite. Rien n&apos;est invente : une colonne reste
        vide quand la source ne donne pas l&apos;information.
      </p>
      <div style={{ display: "grid", gap: 8 }}>
        {COLONNES.map(([nom, quoi]) => (
          <div key={nom} className="carte">
            <strong>{nom}</strong>
            <p className="aide">{quoi}</p>
          </div>
        ))}
      </div>

      <p className="aide" style={{ marginTop: 24 }}>
        Le detail des sources collectees est sur la page{" "}
        <Link href="/sources">Sources</Link>.
      </p>
    </>
  );
}
