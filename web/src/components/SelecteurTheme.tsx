"use client";

import { useEffect, useState } from "react";

export type Theme = "clair" | "sombre" | "systeme";

const CLE = "tp.theme";
const CHOIX: { valeur: Theme; libelle: string; titre: string }[] = [
  { valeur: "clair", libelle: "Clair", titre: "Toujours en clair" },
  { valeur: "sombre", libelle: "Sombre", titre: "Toujours en sombre" },
  { valeur: "systeme", libelle: "Auto", titre: "Suivre le reglage du systeme" },
];

/** Pose ou retire l'attribut qui force un theme. */
export function appliquerTheme(theme: Theme) {
  const racine = document.documentElement;
  if (theme === "systeme") racine.removeAttribute("data-theme");
  else racine.setAttribute("data-theme", theme);
}

/**
 * Selecteur a trois etats.
 *
 * "Auto" n'est pas un troisieme theme : c'est l'absence de choix, qui laisse
 * prefers-color-scheme decider. C'est pourquoi il retire l'attribut au lieu
 * d'en poser un.
 */
export default function SelecteurTheme() {
  const [theme, setTheme] = useState<Theme>("systeme");
  const [monte, setMonte] = useState(false);

  // Le rendu serveur ne connait pas le choix du visiteur : on n'affiche
  // l'etat actif qu'apres montage, sinon React signale une divergence.
  useEffect(() => {
    let enregistre: Theme = "systeme";
    try {
      const lu = window.localStorage.getItem(CLE);
      if (lu === "clair" || lu === "sombre" || lu === "systeme") enregistre = lu;
    } catch {
      // Navigation privee ou stockage refuse : on reste sur "systeme".
    }
    setTheme(enregistre);
    setMonte(true);
  }, []);

  function choisir(valeur: Theme) {
    setTheme(valeur);
    appliquerTheme(valeur);
    try {
      window.localStorage.setItem(CLE, valeur);
    } catch {
      // Le theme reste applique pour cette visite, simplement pas retenu.
    }
  }

  return (
    <div className="theme-choix" role="group" aria-label="Theme de l'interface">
      {CHOIX.map((c) => (
        <button
          key={c.valeur}
          type="button"
          title={c.titre}
          aria-pressed={monte && theme === c.valeur}
          onClick={() => choisir(c.valeur)}
        >
          {c.libelle}
        </button>
      ))}
    </div>
  );
}
