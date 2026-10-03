<?php

// =============================================================
//  webhook.php : recoit les événements Chariow (Pulses).
//   - verifie la signature HMAC (x-chariow-signature)
//   - deduplique sur x-pulse-delivery-id
//   - sur successful.sale : ENFILE le job puis LIVRE IMMEDIATEMENT
//     (partage + mails). La file sert de filet : si le traitement
//     direct échoue (transitoire), le job reste en attente pour
//     worker.php (cron) comme secours.
//
//  Alerte operateur : pour 1000 achats simultanés, le traitement
//  direct prend <10s par vente. Le webhook reste assez rapide ;
//  worker.php ne sert que de plan B en cas de panne transitoire.
//
//  Configuration côté Chariow : Automations -> Pulses ->
//  "Successful Sale" -> URL : https://TON-DOMAINE.com/../webhook.php
//  Le secret whsec_... se met dans .env (CHARIOW_WEBHOOK_SECRET).
// =============================================================

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/queue.php';
require_once __DIR__ . '/access.php';
require_once __DIR__ . '/process-order.php';
require_once __DIR__ . '/compteur-places.php';
require_once __DIR__ . '/ventes-tracker.php';

header('Content-Type: text/plain; charset=utf-8');

$corpsBrut = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_CHARIOW_SIGNATURE'] ?? '';
$idLivraison = $_SERVER['HTTP_X_PULSE_DELIVERY_ID'] ?? '';
$evenement = $_SERVER['HTTP_X_PULSE_EVENT'] ?? '';

// --- 1. Verification de la signature ---
if (!CHARIOW_WEBHOOK_SECRET) {
    http_response_code(500);
    exit('WEBHOOK_NON_CONFIGURE');
}
$attendu = 'sha256=' . hash_hmac('sha256', $corpsBrut, CHARIOW_WEBHOOK_SECRET);
if (!hash_equals($attendu, $signature)) {
    http_response_code(401);
    exit('SIGNATURE_INVALIDE');
}

$donnees = json_decode($corpsBrut, true);
if (!is_array($donnees)) {
    http_response_code(400);
    exit('PAYLOAD_INVALIDE');
}

// --- 2. Deduplication sur la livraison ---
// Un "test pulse" n'a pas d'identifiant de livraison : on accuse
// reception mais on n'ecrit rien.
$estLivraisonReelle = ($idLivraison !== '');
if (!$estLivraisonReelle) {
    http_response_code(200);
    exit('PULSE_TEST');
}
if (livraisonDejaTraitee($idLivraison)) {
    http_response_code(200);
    exit('DOUBLON_IGNORE');
}

// --- 3. Enfile le job pour successful.sale ---
$evenementReel = $evenement !== '' ? $evenement : ($donnees['event'] ?? '');
if ($evenementReel === 'successful.sale') {
    $job = [
        'id'      => $idLivraison,
        'type'    => 'successful.sale',
        'donnees' => $donnees,
        'tentatives' => 0,
        'max_tentatives' => WORKER_MAX_TENTATIVES,
        'delai_retour_sec' => WORKER_DELAI_RETOUR_SEC,
        'cree_le' => time(),
    ];
    // Enfile AVANT de marquer la livraison : si l'enfilement echoue, on
    // repond 500 et Chariow renverra le pulse, sans l'avoir perdu.
    if (!jobEnfiler($idLivraison, $job)) {
        http_response_code(500);
        exit('FILED_ERREUR');
    }
    marquerLivraison($idLivraison);

    // Compteur des places du prix de lancement : on ne compte QUE les
    // ventes réelles (dédupliquées, avec un ID de livraison). Les pulses
    // de test sans identifiant sortent plus haut ; un doublon est ignoré.
    //
    // Garde-fou retry : Chariow peut renvoyer la MÊME vente avec un NOUVEAU
    // x-pulse-delivery-id (retry manuel). La vente a alors déjà été comptée
    // et journalisée sous l'ancien id. On vérifie le sale_id dans ventes.csv
    // pour ne jamais compter deux fois ni écrire deux lignes pour la même
    // commande : la livraison (partage + mail) reste exécutée, le compteur
    // et le journal sautent.
    $vente  = $donnees['sale'] ?? ($donnees['data']['sale'] ?? []);
    $saleId = trim((string) ($vente['id'] ?? ($vente['reference'] ?? '')));
    $donnees['delivery_id'] = $idLivraison;
    if (!venteDejaEnregistree($saleId)) {
        placesIncrementer();
        venteEnregistrer($donnees);
    }

    // LIVRAISON IMMEDIATE : l'acheteur est servi dans cette même requête.
    // La file garde le job si le partage/mail échoue de façon transitoire ;
    // worker.php (cron) ne sert que de secours.
    traiterJobEnfile(REP_QUEUE . '/' . $idLivraison . '.job.json', true);
}

http_response_code(200);
exit('OK');