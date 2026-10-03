<?php

// =============================================================
//  sync-places.php : recompte les ventes REELLES chez Chariow et
//  aligne places.json dessus.
//
//  POURQUOI. Le compteur est incremente par le webhook. Si un webhook
//  a ete perdu (panne, secret change, pulse non configure), le compteur
//  sous-compte et la page annonce plus de places qu'il n'en reste. Le
//  journal des ventes (ventes.csv) a le meme angle mort. Chariow, lui,
//  sait toujours combien de ventes ont ete payees : c'est la seule
//  source qui fasse foi.
//
//  NE COMPTE QUE CE QUI EST PAYE, ET QUE CE PRODUIT. Les paniers
//  abandonnes, les paiements echoues et les autres produits de la
//  boutique ne sont pas des places prises.
//
//  Usage (en ligne de commande, jamais par le web) :
//      php sync-places.php              # affiche le compte, n'ecrit rien
//      php sync-places.php --ecrire     # aligne places.json
//
//  En cron, une fois par jour suffit :
//      /usr/local/bin/php /home/franwawe/tenderpilot.store/payment/sync-places.php --ecrire >> /home/franwawe/tenderpilot.store/payment/sync-places.log 2>&1
// =============================================================

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("Ce script s'utilise en ligne de commande.\n");
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/compteur-places.php';

$ecrire = in_array('--ecrire', $argv, true);

if (CHARIOW_API_KEY === '') {
    fwrite(STDERR, "CHARIOW_API_KEY absente du .env\n");
    exit(1);
}

// Toutes les ventes, page par page. L'API en rend 100 au plus par appel.
$ventes = [];
for ($page = 1; $page <= 20; $page++) {
    $ch = curl_init('https://api.chariow.com/v1/sales?per_page=100&page=' . $page);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . CHARIOW_API_KEY],
    ]);
    $reponse = curl_exec($ch);
    $http    = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    if ($reponse === false || $http < 200 || $http >= 300) {
        fwrite(STDERR, "API Chariow : HTTP $http\n");
        exit(1);
    }
    $lot = json_decode((string) $reponse, true)['data'] ?? [];
    if (!is_array($lot) || !$lot) { break; }
    $ventes = array_merge($ventes, $lot);
    if (count($lot) < 100) { break; }
}

$payees = 0;
$autres = 0;
foreach ($ventes as $v) {
    if (!in_array((string) ($v['status'] ?? ''), ['completed', 'settled'], true)) {
        continue;
    }
    // Ce produit uniquement : la boutique en vend d'autres.
    if ((string) ($v['product']['id'] ?? '') === PRODUIT_ID) { $payees++; }
    else { $autres++; }
}

$avant = placesLire();
printf("Ventes payees de ce produit : %d (autres produits payes : %d)\n", $payees, $autres);
printf("Compteur actuel            : %d vendue(s), %d place(s) restante(s)\n",
       $avant['vendues'], max(0, $avant['total'] - $avant['vendues']));

if ($payees === $avant['vendues']) {
    echo "Le compteur est juste, rien a faire.\n";
    exit(0);
}

if (!$ecrire) {
    printf("Ecart de %+d. Relancez avec --ecrire pour aligner places.json.\n",
           $payees - $avant['vendues']);
    exit(0);
}

$plafonne = max(0, min(PLACES_LANCEMENT, $payees));
file_put_contents(__DIR__ . '/places.json',
    json_encode(['total' => PLACES_LANCEMENT, 'vendues' => $plafonne],
                JSON_UNESCAPED_UNICODE) . "\n", LOCK_EX);
$apres = placesLire();
printf("places.json aligne : %d vendue(s), %d place(s) restante(s), prix %d FCFA.\n",
       $apres['vendues'], max(0, $apres['total'] - $apres['vendues']),
       $apres['prix_actuel']);
