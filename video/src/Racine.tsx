import { Composition } from "remotion";
import { Film } from "./Film";
import { DUREE, FPS } from "./tempo";
import { FilmB } from "./b/FilmB";
import { FilmC } from "./c/FilmC";
import { FilmD } from "./d/FilmD";
import { FilmE } from "./e/FilmE";
import { DUREE_FIN, Fin } from "./fin/Fin";
import { DUREE_G, FilmG } from "./g/FilmG";
import { DUREE_H, FilmH } from "./h/FilmH";

// Cinq films pour les tests (E : le film A aux couleurs du site) : meme duree, meme format, rien d'autre en commun.
export const Racine: React.FC = () => (
  <>
    <Composition id="Film" component={Film} durationInFrames={DUREE} fps={FPS} width={1080} height={1920} />
    <Composition id="FilmB" component={FilmB} durationInFrames={DUREE} fps={FPS} width={1080} height={1920} />
    <Composition id="FilmC" component={FilmC} durationInFrames={DUREE} fps={FPS} width={1080} height={1920} />
    <Composition id="FilmD" component={FilmD} durationInFrames={DUREE} fps={FPS} width={1080} height={1920} />
    <Composition id="FilmE" component={FilmE} durationInFrames={DUREE} fps={FPS} width={1080} height={1920} />
    <Composition id="FilmG" component={FilmG} durationInFrames={DUREE_G} fps={FPS} width={1080} height={1920} />
    <Composition id="FilmH" component={FilmH} durationInFrames={DUREE_H} fps={FPS} width={1080} height={1920} />
    {/* La fin commune, collee derriere chaque film par assembler.py. */}
    <Composition id="Fin" component={Fin} durationInFrames={DUREE_FIN} fps={FPS} width={1080} height={1920} />
  </>
);
