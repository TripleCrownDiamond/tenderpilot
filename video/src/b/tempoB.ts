// La grille du film B. 112,5 BPM : un temps dure exactement 16 images, une
// mesure 64, et quinze mesures font les 32 secondes du film A - meme duree,
// pour que le test A/B ne compare que le film, pas sa longueur.
export const FPS = 30;
export const BPM = 112.5;
export const TEMPS = 16;
export const MESURE = 64;
export const DUREE = MESURE * 15; // 960 images

// Une scene par phrase de voix. Memes mesures que musique_b.py.
export const SCENES = {
  matin: 0, //          mesures 1-2   : les journaux, chaque matin
  onglets: MESURE * 2, //       3-4   : soixante sites, pas le temps
  cloture: MESURE * 4, //       5-6   : l'avis parfait, cloture (tout s'arrete)
  copilote: MESURE * 6, //      7-8   : l'avion en papier, le logo (le groove entre)
  tableau: MESURE * 8, //       9-10  : 61 sources, un seul tableau
  rappels: MESURE * 10, //     11-12  : J-7, J-3, la veille
  fin: MESURE * 12, //         13-15  : le prix, l'adresse
};

// Seconde du film ou chaque phrase de voix doit commencer (mixage.py).
export const VOIX_B = [0.3, 3.2, 8.0, 13.57, 16.9, 21.4, 26.5];
