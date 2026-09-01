"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Navigation principale, avec l'onglet courant mis en evidence.
 *
 * La feuille de style sait deja habiller `a[aria-current="page"]` : il
 * manquait seulement quelqu'un pour poser l'attribut. C'est aussi ce que
 * lisent les lecteurs d'ecran, donc on le pose plutot que d'ajouter une
 * classe purement visuelle.
 *
 * Ce composant est le seul du gabarit a s'executer dans le navigateur :
 * connaitre l'adresse courante impose de sortir du rendu serveur.
 */

export interface Onglet {
  href: string;
  libelle: string;
}

export default function Navigation({ liens }: { liens: Onglet[] }) {
  const chemin = usePathname();

  /**
   * "/" ne doit correspondre qu'a la racine.
   *
   * Sans ce cas particulier, tout chemin commencerait par "/" et le premier
   * onglet resterait actif partout.
   */
  const estCourant = (href: string) =>
    href === "/" ? chemin === "/" : chemin.startsWith(href);

  return (
    <nav className="onglets">
      {liens.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={estCourant(l.href) ? "page" : undefined}
        >
          {l.libelle}
        </Link>
      ))}
    </nav>
  );
}
