import type { Metadata } from "next";
import Navigation, { type Onglet } from "@/components/Navigation";
import SelecteurTheme from "@/components/SelecteurTheme";
import "./globals.css";

export const metadata: Metadata = {
  title: "TenderPilot",
  description:
    "Veille, qualification et suivi des appels d'offres et opportunites.",
};

/**
 * Applique le theme AVANT la premiere peinture.
 *
 * Sans ce script, la page s'affiche une fraction de seconde en clair avant
 * que React ne pose le theme sombre : c'est le clignotement blanc que tout
 * le monde deteste. Il doit rester synchrone et minuscule.
 */
const SANS_CLIGNOTEMENT = `
try {
  var t = localStorage.getItem("tp.theme");
  if (t === "clair" || t === "sombre") {
    document.documentElement.setAttribute("data-theme", t);
  }
} catch (e) {}
`;

const LIENS: Onglet[] = [
  { href: "/", libelle: "Tableau de bord" },
  { href: "/opportunites", libelle: "Opportunites" },
  { href: "/sources", libelle: "Sources" },
  { href: "/reglages", libelle: "Reglages" },
];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Zilla+Slab:wght@500;600;700&family=Source+Sans+3:wght@400;600&family=IBM+Plex+Mono:wght@400;600&display=swap"
        />
        <script dangerouslySetInnerHTML={{ __html: SANS_CLIGNOTEMENT }} />
      </head>
      <body>
        <header className="barre">
          <div className="barre-interne">
            <div className="marque">
              TenderPilot
              <span>Suivi des opportunites</span>
            </div>
            <Navigation liens={LIENS} />
            <SelecteurTheme />
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
