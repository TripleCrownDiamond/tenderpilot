// La grille du film. Memes valeurs que musique.py : un temps musical dure
// exactement 15 images, une mesure 60. Chaque animation se cale sur cette
// grille - c'est ce qui donne l'impression d'un montage "au rythme".
export const FPS = 30;
export const BPM = 120;
export const TEMPS = (FPS * 60) / BPM; // 15 images
export const MESURE = TEMPS * 4; // 60 images
export const DUREE = MESURE * 16; // 960 images = 32 s

// Debut de chaque scene, en mesures (cf. la structure dans musique.py).
export const SCENES = {
  logo: 0, // mesures 1-2   : intro, le logo s'ecrit
  sources: MESURE * 2, // 3-4   : le drop, les sources explosent
  tableau: MESURE * 4, // 5-7   : tout se range dans un tableau
  alerte: MESURE * 7, // 8-10  : une ligne devient une alerte
  carte: MESURE * 10, // 11-12 : respiration, la carte
  compte: MESURE * 12, // 13-14 : relance, le compte a rebours
  final: MESURE * 14, // 15-16 : impact, le logo se pose
};
