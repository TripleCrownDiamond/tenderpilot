// La grille du film D. 120 BPM swing : un temps = 15 images, une mesure = 60.
// Koffi fait UN PAS PAR TEMPS : la contrebasse marche avec lui.
export const TEMPS = 15;
export const MESURE = 60;
export const DUREE = MESURE * 16;

export const SCENES = {
  une: 0, //               0 s   la une du journal, on entre dans la photo
  ville: MESURE * 2, //    4 s   la tournee des kiosques
  tard: MESURE * 5, //    10 s   l'avis parfait, la course, le rideau tombe
  rembobine: MESURE * 7, // 14 s rembobinons ; l'avion en papier
  veille: MESURE * 9, //  18 s   assis, la veille vient a lui
  depot: MESURE * 12, //  24 s   il depose a temps
  fin: MESURE * 14, //    28 s   retour a la une : le prix
};
