import { continueRender, delayRender, staticFile } from "remotion";

// Inter, la police du site, chargee depuis les fichiers du projet : le rendu
// ne depend ni du reseau ni des polices installees sur la machine.
const GRAISSES: [string, number][] = [
  ["Medium", 500],
  ["SemiBold", 600],
  ["Bold", 700],
  ["ExtraBold", 800],
  ["Black", 900],
];

export const POLICE = "InterTP, Inter, system-ui, sans-serif";

let chargees = false;
export const chargerPolices = () => {
  if (chargees || typeof document === "undefined") return;
  chargees = true;
  const attente = delayRender("Chargement de la police Inter");
  Promise.all(
    GRAISSES.map(([nom, poids]) => {
      const face = new FontFace("InterTP", `url(${staticFile(`fonts/Inter-${nom}.ttf`)})`, {
        weight: String(poids),
      });
      document.fonts.add(face);
      return face.load();
    }),
  )
    .then(() => {
      // La police d'affiche du film B (variable : une seule fonte, toutes
      // les graisses).
      const affiche = new FontFace("BricoTP", `url(${staticFile("fonts/Bricolage.ttf")})`, {
        weight: "200 800",
      });
      // Et celle du film C : Archivo, variable en graisse et en chasse.
      const grille = new FontFace("ArchTP", `url(${staticFile("fonts/Archivo.ttf")})`, {
        weight: "100 900",
        stretch: "62% 125%",
      });
      // Et celles du film D : un titre de quotidien, une legende de machine.
      const une = new FontFace("AntonTP", `url(${staticFile("fonts/Anton.ttf")})`);
      const machine = new FontFace("PlexTP", `url(${staticFile("fonts/PlexMono-Bold.ttf")})`, { weight: "700" });
      // Et l'ecriture manuscrite des annotations du site, pour le film E.
      const main = new FontFace("CaveatTP", `url(${staticFile("fonts/Caveat.ttf")})`, { weight: "400 700" });
      const toutes = [affiche, grille, une, machine, main];
      toutes.forEach((p) => document.fonts.add(p));
      return Promise.all(toutes.map((p) => p.load()));
    })
    .then(() => continueRender(attente));
};
