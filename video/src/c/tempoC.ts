// La grille du film C. 90 BPM : un temps = 20 images, une mesure = 80,
// douze mesures = 960 images, les 32 secondes des films A et B.
export const TEMPS = 20;
export const MESURE = 80;
export const DUREE = MESURE * 12;

// Six scenes de deux mesures, une phrase de voix chacune.
export const SCENES = {
  enjeu: 0, //           0 s    un appel d'offres se gagne avant la date limite
  cout: MESURE * 2, //   5,3 s  la veille manuelle coute cher
  marque: MESURE * 4, // 10,7 s TenderPilot (impact)
  methode: MESURE * 6, // 16 s   collecte, tri, alerte
  rappels: MESURE * 8, // 21,3 s J-7, J-3, la veille
  fin: MESURE * 10, //   26,7 s le prix, l'adresse (impact)
};
