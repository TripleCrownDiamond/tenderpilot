/**
 * Tableau de bord : ce qui demande votre attention, et l'etat de l'installation.
 *
 * Deux blocs, dans cet ordre :
 *
 *   1. les alertes - ce qu'il faut regarder aujourd'hui ;
 *   2. l'installation - ce qui empeche encore l'outil de tourner.
 *
 * L'ordre compte. Un acheteur qui revient chaque matin veut ses echeances,
 * pas la liste de ses variables d'environnement. Mais tant que rien n'est
 * branche, le second bloc est le seul qui ait quelque chose a dire, et il
 * doit le dire clairement plutot que d'afficher un ecran vide.
 */

import { SOURCES_DEFAUT } from "@/data/sources-defaut";
import {
  alertes, aujourdhui, compterAlertes, CONFIG_DEFAUT,
  type Alerte, type NiveauAlerte, type Opportunite,
} from "@/lib/domain/regles";

export const dynamic = "force-dynamic";

interface Etape {
  titre: string;
  pret: boolean;
  detail: string;
}

function etapes(): Etape[] {
  return [
    {
      titre: "Base de donnees",
      pret: Boolean(process.env.DATABASE_URL),
      detail: "Variable DATABASE_URL. Une base Postgres gratuite chez Neon "
        + "ou Supabase suffit.",
    },
    {
      titre: "Envoi des emails",
      pret: Boolean(process.env.RESEND_API_KEY),
      detail: "Variable RESEND_API_KEY. Sans elle, les emails sont ecrits "
        + "dans la console au lieu d'etre envoyes.",
    },
    {
      titre: "Collecte automatique",
      pret: Boolean(process.env.CRON_SECRET),
      detail: "Variable CRON_SECRET. Elle protege la route /api/run contre "
        + "les appels exterieurs.",
    },
  ];
}

/**
 * Les opportunites collectees.
 *
 * Renvoie une liste vide tant que la base n'est pas branchee. C'est un
 * choix explicite : mieux vaut un tableau de bord honnetement vide qu'un
 * jeu de donnees de demonstration qu'on finirait par prendre pour vrai.
 */
async function lireOpportunites(): Promise<Opportunite[]> {
  return [];
}

const NIVEAUX: Record<NiveauAlerte, { libelle: string; pastille: string }> = {
  urgent: { libelle: "Urgent", pastille: "s-URGENT" },
  bientot: { libelle: "Bientot", pastille: "s-BIENTOT" },
  expire: { libelle: "Expire", pastille: "s-EXPIRE" },
  nouvelle: { libelle: "A verifier", pastille: "s-DATE-A-VERIFIER" },
};

export default async function Accueil() {
  const liste = etapes();
  const restant = liste.filter((e) => !e.pret);

  const opportunites = await lireOpportunites();
  const jour = aujourdhui(CONFIG_DEFAUT.fuseau);
  const notifications = alertes(opportunites, jour);
  const compte = compterAlertes(notifications);

  const sousSeptJours = opportunites.filter((o) =>
    o.joursRestants !== null && o.joursRestants !== undefined
    && o.joursRestants >= 0 && o.joursRestants <= 7).length;

  return (
    <>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>Tableau de bord</h1>
      <p className="aide" style={{ marginBottom: 24 }}>
        {restant.length === 0
          ? "Installation terminee."
          : `${restant.length} etape(s) d'installation restante(s).`}
      </p>

      <div className="indicateurs">
        <div className="indicateur">
          <div className="valeur">{opportunites.length}</div>
          <div className="libelle">Opportunites</div>
        </div>
        <div className="indicateur">
          <div className="valeur">{sousSeptJours}</div>
          <div className="libelle">Echeance sous 7 j</div>
        </div>
        <div className="indicateur">
          {/* Compte reel du catalogue livre. Les compteurs precedents restent
              a zero tant que la base n'est pas branchee : mieux vaut un zero
              honnete qu'un chiffre invente. */}
          <div className="valeur">{SOURCES_DEFAUT.filter((s) => s.active).length}</div>
          <div className="libelle">Sources actives</div>
        </div>
        <div className="indicateur">
          <div className="valeur">{notifications.length || "-"}</div>
          <div className="libelle">Alertes</div>
        </div>
      </div>

      <section style={{ marginTop: 34 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12,
                      flexWrap: "wrap", marginBottom: 4 }}>
          <h2 style={{ fontSize: 20, margin: 0 }}>Notifications</h2>
          {notifications.length > 0 && (
            <span className="aide" style={{ margin: 0 }}>
              {[
                compte.urgent && `${compte.urgent} urgent(s)`,
                compte.bientot && `${compte.bientot} bientot`,
                compte.expire && `${compte.expire} expire(s)`,
                compte.nouvelle && `${compte.nouvelle} a verifier`,
              ].filter(Boolean).join(" - ")}
            </span>
          )}
        </div>
        <p className="aide" style={{ marginBottom: 14 }}>
          Les memes seuils que les emails, mais affiches en permanence : un
          email part une fois, cette liste montre l&apos;etat du moment.
        </p>

        {notifications.length === 0 ? (
          <div className="vide">
            <p>Aucune alerte.</p>
            <p className="aide">
              {opportunites.length === 0
                ? "Cette liste se remplira a la premiere collecte."
                : "Aucune echeance proche parmi les opportunites suivies."}
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {notifications.map((a, i) => (
              <LigneAlerte key={a.id ?? `${a.titre}-${i}`} alerte={a} />
            ))}
          </div>
        )}
      </section>

      <section style={{ marginTop: 34 }}>
        <h2 style={{ fontSize: 20, marginBottom: 4 }}>Installation</h2>
        <p className="aide" style={{ marginBottom: 14 }}>
          Tant qu&apos;une etape est a faire, la collecte ne peut pas tourner
          seule.
        </p>
        <div style={{ display: "grid", gap: 10 }}>
          {liste.map((e) => (
            <div key={e.titre} className="carte">
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span className={"pastille " + (e.pret ? "s-OUVERT" : "s-URGENT")}>
                  {e.pret ? "PRET" : "A FAIRE"}
                </span>
                <strong>{e.titre}</strong>
              </div>
              <p className="aide">{e.detail}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function LigneAlerte({ alerte }: { alerte: Alerte }) {
  const niveau = NIVEAUX[alerte.niveau];
  const corps = (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <span className={"pastille " + niveau.pastille}
            style={{ flexShrink: 0, marginTop: 2 }}>
        {niveau.libelle}
      </span>
      <div style={{ minWidth: 0 }}>
        <strong style={{ display: "block" }}>{alerte.titre}</strong>
        <p className="aide">
          {alerte.detail}
          {alerte.deadline && ` — echeance le ${alerte.deadline}`}
        </p>
      </div>
    </div>
  );

  // Un lien vers l'avis officiel quand on l'a : c'est la seule action utile.
  return alerte.lien ? (
    <a className="carte" href={alerte.lien} target="_blank"
       rel="noreferrer noopener" style={{ textDecoration: "none",
                                          color: "inherit", display: "block" }}>
      {corps}
    </a>
  ) : (
    <div className="carte">{corps}</div>
  );
}
