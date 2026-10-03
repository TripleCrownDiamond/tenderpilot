<?php

// =============================================================
//  compteur-places.php : compteur des places du prix de lancement.
//  Include-only (ne produit aucune sortie).
//
//  La homepage affiche « N places restantes sur M au prix de
//  lancement ». Cette valeur était mise a jour a la main dans
//  index.html (PLACES_VENDUES). Desormais le webhook incremente ce
//  compteur a chaque successful.sale reel, et places.php le sert a
//  la homepage.
//
//  UN SEUL PALIER, depuis le 2026-09-28 : les 50 premieres places sont
//  au prix de lancement (PRIX_LANCEMENT). Au-dela, le prix passe a
//  PRIX_APRES. Le palier intermediaire (50 puis 100 places) a ete
//  retire : deux seuils a suivre pour une seule offre, personne ne
//  s'y retrouvait, ni le client ni le vendeur.
// =============================================================

// Limites du prix de lancement
const PLACES_LANCEMENT = 50;    // places au prix de lancement
// Prix
const PRIX_LANCEMENT = 20000;   // FCFA, pour les 50 premieres places
const PRIX_APRES     = 30000;   // FCFA, une fois les 50 places ecoulees
const PRIX_REFERENCE = 50000;   // FCFA, le prix barré de la page (toujours affiché)

const FICHIER_PLACES = __DIR__ . '/places.json';

// Lit l'état courant, avec valeurs par défaut si le fichier manque.
function placesLire(): array {
    $contenu = @file_get_contents(FICHIER_PLACES);
    $data = json_decode((string) $contenu, true);
    $vendues = is_array($data) ? (int) ($data['vendues'] ?? 0) : 0;
    $vendues = max(0, min(PLACES_LANCEMENT, $vendues));

    $total = PLACES_LANCEMENT;
    $enLancement = $vendues < PLACES_LANCEMENT;

    return [
        'total'          => $total,
        'vendues'        => $vendues,
        'en_lancement'   => $enLancement,
        'prix_actuel'    => $enLancement ? PRIX_LANCEMENT : PRIX_APRES,
        'prix_lancement' => PRIX_LANCEMENT,
        'prix_apres'     => PRIX_APRES,
        'prix_reference' => PRIX_REFERENCE, // le prix barré, inchangé a 50 000 (le lancement est passe a 20 000, l'apres a 30 000)
    ];
}

// Incrémente le compteur d'une place (atomique, flock). Rien ne
// dépasse PLACES_LANCEMENT : après les 50 premières ventes, le prix
// de lancement n'existe plus. Le journal des ventes (ventes.csv)
// reste, lui, le compte exact de toutes les ventes.
function placesIncrementer(): int {
    $h = @fopen(FICHIER_PLACES, 'c+');
    if (!$h) { return placesLire()['vendues']; }
    if (!flock($h, LOCK_EX)) { fclose($h); return placesLire()['vendues']; }

    $contenu = stream_get_contents($h);
    $data = json_decode((string) $contenu, true);
    $vendues = is_array($data) ? max(0, (int) ($data['vendues'] ?? 0)) : 0;
    if ($vendues < PLACES_LANCEMENT) { $vendues++; }

    ftruncate($h, 0);
    rewind($h);
    fwrite($h, json_encode(['total' => PLACES_LANCEMENT, 'vendues' => $vendues], JSON_UNESCAPED_UNICODE) . "\n");
    fflush($h);
    flock($h, LOCK_UN);
    fclose($h);
    return $vendues;
}