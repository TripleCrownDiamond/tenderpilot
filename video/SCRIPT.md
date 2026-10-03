# SCRIPT — Film F : « La balise » (TenderPilot)

> Motion design 100 % **SVG animé** : tout ce qui bouge à l'écran est un tracé vectoriel
> qui se dessine, tourne ou pulse. Rendu Remotion, 1080×1920, 30 fps, 32 s (960 images).
> Grille musicale : 1 temps = 15 images, 1 mesure = 60 (`src/tempo.ts`).
>
> **Principe directeur :** chaque scène repose sur **une seule métaphore visuelle**, portée
> par des SVG — le radar, le faisceau, le tableau, l'anneau, la carte, le compte à rebours,
> la signature. Un seul geste par scène, poussé au bout : c'est ce qui sépare un film
> professionnel d'un diaporama animé.

---

## S1 — L'écriture (0:00 → 0:04) · mesure 1–2 · frame 0–119

**Idée :** le film commence sur une page vide. La promesse **s'écrit sous vos yeux**,
au stylo — rien n'existe encore, tout se trace.

| Timecode | À l'écran | SVG animé |
|---|---|---|
| 0.0–1.0 s | Fond nuit, grain | halos qui dérivent (hérités de `Fond`) |
| 0.3–2.2 s | Une ligne lumineuse se trace sous le texte | `path` `strokeDashoffset` 1→0, pointe lumineuse qui suit la trajectoire |
| 0.8–2.8 s | « Vous ratez des **appels d'offres**. » | mots qui montent du flou, un par temps (hérite `Titre`) |
| 2.8–4.0 s | Titre remplacé : « Pas avec **TenderPilot**. » | premier titre sort vers le haut, second entre |

**SVG :** un soulignement « stylo » (courbe de Bézier, tracé animé avec sa lueur),
rien d'autre. La scène respire par la typographie.

---

## S2 — Le radar (0:04 → 0:08) · mesure 3–4 · frame 120–239

**Idée :** pendant que vous dormez, une balise tourne et balaie l'Afrique de l'Ouest.

| Timecode | À l'écran | SVG animé |
|---|---|---|
| 4.0 s | Le radar apparaît au centre | cercles concentriques (3 anneaux) + croix, tracés en 0,4 s |
| 4.0–8.0 s | **Le faisceau balaie**, rotation continue | secteur angulaire en dégradé conique, 1 tour / 2 temps |
| 5.0 s+ | Des **blips** s'allument quand le faisceau passe | points qui émergent (scale 0→1 + halo pulsé), positionnés Bénin/Togo/Niger/… |
| 6.5 s | Titre : « **61 sources** officielles, scannées pour vous. » | chiffre qui compte 0→61, synchronisé au faisceau |

**SVG :** `circle` × 3 + `path` croix + secteur balayeur (`path` arc + gradient) +
8 blips `circle` avec `animate` d'opacité déclenchée au passage du faisceau
(angle du faisceau calculé par frame → l'opacité de chaque blip suit `cos(θ_blip − θ_balayage)`).

---

## S3 — La capture (0:08 → 0:14) · mesure 5–7 · frame 240–419

**Idée :** les avis captés **tombent dans le tableau** et prennent leur couleur.

| Timecode | À l'écran | SVG animé |
|---|---|---|
| 8.0–10.0 s | 3 lucioles quittent le radar, grossissent, deviennent des **lignes** | interpolation : chaque `circle` devient une carte `rect` arrondie (morph par crossfade + translation) |
| 10.0–13.0 s | 7 lignes se posent une à une, **triées par temps restant** | ressorts en cascade (½ temps d'écart), badge statut qui se teinte après la pose |
| 13.0–14.0 s | Titre : « Tout arrive dans **un seul tableau**. » | tracé du cadre en trait qui court autour (dashoffset) |

**SVG :** les cartes sont des `rect` rx=16 ; le statut est une pastille `circle` +
`text` dont le fond passe de gris à la couleur du statut (OUVERT → URGENT).
Le fil lumineux qui relie radar → tableau est un `path` courbe tracé à la volée.

---

## S4 — L'anneau (0:14 → 0:20) · mesure 8–10 · frame 420–599

**Idée :** la dead-line, c'est un cercle qui se vide. L'alerte part **avant** qu'il soit plein de regret.

| Timecode | À l'écran | SVG animé |
|---|---|---|
| 14.0 s | Un grand anneau au centre, plein | `circle` stroke 14, dasharray = circonférence |
| 14.0–17.0 s | L'anneau **se vide** de 14 j → 3 j ; le chiffre défile au centre | rotation du `strokeDashoffset` + compteur 14→3 (chiffre qui floute à chaque changement) |
| 17.0 s | **Flash** : l'anneau passe au rouge « URGENT » | fond de l'anneau pulse (scale 1→1.06→1), onde circulaire émise |
| 17.5–20.0 s | La notification **tombe** sur l'anneau : « Rappel J-3 — il reste 3 jours » | carte en ressort + cloche SVG qui oscille 2 fois |

**SVG :** anneau = `circle` avec `pathLength=100`, onde = `circle` animé
(r→0→400, opacité 0.8→0), cloche = `path` avec rotation ±14°.

---

## S5 — La carte (0:20 → 0:24) · mesure 11–12 · frame 600–719

**Idée :** d'un point (Bénin), l'ondes s'étend : **8 pays**, plus l'international.

| Timecode | À l'écran | SVG animé |
|---|---|---|
| 20.0 s | La carte en **points** (Afrique de l'Ouest en grille de points) | réutilisation de la grille du film E (points `circle` r=6.5) |
| 20.5 s | Une **onde** part de Cotonou | `circle` grandissant, bord lumineux, opacité décroissante |
| 21.0–23.0 s | Chaque pays touché s'allume en cascade + émet sa propre onde | 8 pastilles pays, ressorts décalés de ¼ temps, onde par pays |
| 23.0–24.0 s | Titre : « **8 pays**, et l'international. » | lignes qui montent |

**SVG :** grille de points pré-calculée (fonction `dedans()` du film E),
ondes `circle`, pastilles pays = `circle` + `text` + petit drapeau `rect`.

---

## S6 — Le compte à rebours (0:24 → 0:28) · mesure 13–14 · frame 720–839

**Idée :** ce que vous gagnez, dit simplement : **les jours devant, pas derrière.**

| Timecode | À l'écran | SVG animé |
|---|---|---|
| 24.0 s | Trois jauge horizontales (J-7, J-3, J-1) | `rect` de fond gris, remplissage animé un après l'autre |
| 24.0–26.5 s | Chaque jauge se remplit, son étiquette tombe | largeur interpolée + texte en ressort |
| 26.5 s | Les 3 jauges **fusionnent** en une seule ligne « 3 canaux : Email · Telegram · Agenda » | morph : les rects glissent vers une ligne unique (translation + crossfade) |

**SVG :** `rect` × 3 (remplissage), icônes canaux = `path` mail/envoi/agenda
déjà présents dans `ui/Ecrans`, réutilisés en mini-SVG.

---

## S7 — La signature (0:28 → 0:32) · mesure 15–16 · frame 840–959

**Idée :** tout se rassemble. Le logo se pose, le prix apparaît, l'URL **s'écrit au stylo**
comme au début — la boucle est bouclée.

| Timecode | À l'écran | SVG animé |
|---|---|---|
| 28.0 s | Fond se recentre (halos se stabilisent) | interpolation énergie 1→0.6 |
| 28.0–29.5 s | Le logo arrive (hérite `LogoAnime`) | icône en ressort + mot révélé + reflet |
| 29.5–30.5 s | « **10 000 FCFA** — payé une seule fois. » | chiffre en slide-up + soulignement tracé |
| 30.5–32.0 s | « tenderpilot.store » **s'écrit** | `text` derrière un masque qui s'ouvre + point lumineux qui suit la fin du tracé |

**SVG :** le trait de signature = `path` horizontal sous l'URL, `strokeDashoffset`
1→0 en 1,2 s, avec un point brillant à sa pointe (position = longueur tracée × largeur).

---

## Choix de mise en scène (et pourquoi)

1. **Une métaphore par scène** — le radar, l'anneau, la carte : chaque scène n'enseigne
   qu'une chose. Une pub qui apprend dix choses n'en fait retenir aucune.
2. **Tout est tracé, rien n'apparaît** — les SVG se *dessinent* (dashoffset), se *posent*
   (ressorts), ou *pulsent* (ondes). C'est la signature « dessin animé technique » du film.
3. **La grille musicale gouverne** — chaque arrivée tombe sur un temps (15 images) ou un
   demi-temps. Le spectateur ne sait pas pourquoi c'est rythmé, mais il le ressent.
4. **Réutilisation stricte** — fond, grain, poussière, ressorts, courbes et polices viennent
   des briques existantes (`ui/`) : le film F reste un frère des films A–E, pas un ovni.
5. **Textes = ceux du site** — « 61 sources », « 8 pays », « 10 000 FCFA » : le film et la
   page de vente racontent la même chose avec les mêmes mots.

## Composition « FilmF »

- Fond commun (énergie montante, comme le film A) + 7 plans en `Sequence` avec raccords
  fondus (même mécanique `Plan` que `Film.tsx`).
- Audio : `public/musique.wav` (la même piste que le film A — la grille lui est calée).
- Duree : 960 frames (32 s), 1080×1920, 30 fps.
