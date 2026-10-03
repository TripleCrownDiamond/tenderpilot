<?php

// =============================================================
//  places.php : sert à la homepage l'état des places du prix de
//  lancement. URL publique : /places  (voir .htaccess racine).
//  Réponse : {"total":M,"vendues":N,"restantes":M-N,
//            "en_lancement":true,"prix_actuel":20000,
//            "prix_lancement":20000,"prix_apres":30000,
//            "prix_reference":50000}.
//  Le prix barré de la page reste PRIX_REFERENCE (50 000) quel que
//  soit l'état : seul le prix réel change (20 000 puis 30 000).
//  Lecture seule : seule la fonction placesIncrementer (appelée par
//  webhook.php) écrit dans places.json.
// =============================================================

require_once __DIR__ . '/compteur-places.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$etat = placesLire();
echo json_encode([
    'total'          => $etat['total'],
    'vendues'        => $etat['vendues'],
    'restantes'      => max(0, $etat['total'] - $etat['vendues']),
    'en_lancement'   => $etat['en_lancement'],
    'prix_actuel'    => $etat['prix_actuel'],
    'prix_lancement' => $etat['prix_lancement'],
    'prix_apres'     => $etat['prix_apres'],
    'prix_reference' => $etat['prix_reference'],
]);