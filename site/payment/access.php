<?php

// =============================================================
//  access.php : autorisation des emails acheteurs.
//
//  Partage par webhook.php (verification de signature +
//  dedupl. + enqueue) et worker.php (le travail l''e):
//  - chargernJson          : lecture JSON robuste
//  - livraisonDejaTraitee  : dedupl. sur x-pulse-delivery-id
//  - marquerLivraison      : historise un delivery-id traite
//  - autoriserEmail        : debloque la page de remerciement
//  - donnerAccesFeuille    : acces LECTEUR au maitre, VERIFIE
// =============================================================

function chargernJson($fichier, $defaut) {
    if (!is_file($fichier)) { return $defaut; }
    $contenu = @file_get_contents($fichier);
    if ($contenu === false) { return $defaut; }
    $valeur = json_decode((string) $contenu, true);
    return is_array($valeur) ? $valeur : $defaut;
}

function livraisonDejaTraitee(string $id): bool {
    return in_array($id, chargernJson(__DIR__ . '/processed-pulses.json', []), true);
}

function marquerLivraison(string $id): void {
    $fichier = __DIR__ . '/processed-pulses.json';
    $h = fopen($fichier, 'c+');
    if (!$h) { return; }
    if (flock($h, LOCK_EX)) {
        $liste = chargernJson($fichier, []);
        if (!in_array($id, $liste, true)) {
            $liste[] = $id;
        }
        ftruncate($h, 0);
        rewind($h);
        fwrite($h, json_encode($liste, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n");
        fflush($h);
        flock($h, LOCK_UN);
    }
    fclose($h);
}

// Debloque la page de remerciement pour un email (liste auto-clients.json).
function autoriserEmail(string $email): void {
    $email = strtolower(trim($email));
    if (!preg_match('/^[^@\s]+@[^@\s]+\.[^@\s]+$/', $email)) { return; }
    $fichier = __DIR__ . '/auto-clients.json';
    $h = fopen($fichier, 'c+');
    if (!$h) { return; }
    if (flock($h, LOCK_EX)) {
        rewind($h);
        $liste = json_decode((string) stream_get_contents($h), true);
        if (!is_array($liste)) { $liste = []; }
        if (!in_array($email, $liste, true)) {
            $liste[] = $email;
        }
        ftruncate($h, 0);
        rewind($h);
        fwrite($h, json_encode($liste, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n");
        fflush($h);
        flock($h, LOCK_UN);
    }
    fclose($h);
}

// Donne l'acces LECTEUR au classeur maitre, en VERIFIANT la reponse du pont.
// Le maître n'est pas partagé publiquement : seul l'acheteur (email paye)
// obtient l'acces en lecteur, ce qui rend le lien /copy fonctionnel pour
// lui seul. Un lien copie sans paiement n'ouvre rien.
//
// L'appel passe par une redirection 302 vers script.googleusercontent.com :
// on suit la chaine en mode GET (jamais de POST sur la suite), sinon
// l'echo d'Apps Script repond 405 et le partage echoue. Certains libcurl
// gardent le POST sur la 302 selon leur version : on force le GET de la
// chaine a la main, independamment de libcurl.
//
// Retourne un tableau :
//   ['ok'      => bool,
//    'http'    => int,
//    'reponse' => string]   // le corps renvoye par share-sheet.gs
// Le pont répond exactement 'OK' quand le partage lecteur est en place.
// Tout le reste (AUTH_FAIL, EMAIL_INVALIDE, MAITRE_INTROUVABLE, ERREUR:…,
// timeout, HTTP != 200) signifie que l'acces n'a PAS ete accorde.
function donnerAccesFeuille(string $email, int $essais = 3,
                           int $timeout = 45): array {
    // MESURE DU 2026-09-28 : le pont repond en 6 a 20 secondes selon qu'il
    // demarre a froid, et l'appel coupait a 10. Un partage sur deux tombait
    // en "CURL_ERREUR: Operation timed out" alors que Google, lui, avait
    // parfois deja partage. D'ou le delai long ET les tentatives : addViewer
    // est idempotent, reessayer ne partage jamais deux fois.
    $definitives = ['AUTH_FAIL', 'EMAIL_INVALIDE', 'MAITRE_INTROUVABLE',
                    'PONT_NON_CONFIGURE', 'CURL_ABSENT'];
    $dernier = ['ok' => false, 'http' => 0, 'reponse' => 'AUCUNE_TENTATIVE'];
    for ($n = 1; $n <= max(1, $essais); $n++) {
        $debut = microtime(true);
        $dernier = accesFeuilleUneTentative_($email, $timeout);
        journalPartage_($email, $n, microtime(true) - $debut, $dernier);
        if ($dernier['ok'] === true) { return $dernier; }
        // Refus franc du pont : reessayer ne changera rien.
        if (in_array($dernier['reponse'], $definitives, true)) { return $dernier; }
        if ($n < $essais) { sleep($n * 2); }
    }
    return $dernier;
}

/** Une ligne par tentative, pour savoir APRES COUP ce qui s'est passe. */
function journalPartage_(string $email, int $tentative, float $secondes,
                         array $resultat): void {
    @file_put_contents(__DIR__ . '/partages.log', sprintf(
        "%s %s tentative=%d duree=%.1fs http=%d reponse=%s\n",
        date('c'), $email, $tentative, $secondes,
        $resultat['http'], $resultat['reponse']
    ), FILE_APPEND | LOCK_EX);
}

/** Une seule tentative de partage. Voir donnerAccesFeuille. */
function accesFeuilleUneTentative_(string $email, int $timeout): array {
    $url = SHEET_SHARE_APP_URL;
    $jeton = SHEET_SHARE_TOKEN;
    if ($url === '' || $jeton === '') {
        return ['ok' => false, 'http' => 0, 'reponse' => 'PONT_NON_CONFIGURE'];
    }
    if (!function_exists('curl_init')) {
        return ['ok' => false, 'http' => 0, 'reponse' => 'CURL_ABSENT'];
    }

    // POST initial vers /exec (les parametres y vivent).
    $req = curl_init($url);
    curl_setopt_array($req, [
        CURLOPT_POST            => true,
        CURLOPT_POSTFIELDS      => http_build_query(['token' => $jeton, 'email' => $email]),
        CURLOPT_RETURNTRANSFER  => true,
        CURLOPT_TIMEOUT         => $timeout,
        CURLOPT_CONNECTTIMEOUT  => 10,
        CURLOPT_SSL_VERIFYPEER  => true,
        CURLOPT_FOLLOWLOCATION  => false,
        CURLOPT_HEADER          => true,
        CURLOPT_HTTPHEADER      => ['Content-Type: application/x-www-form-urlencoded'],
    ]);
    $corps = curl_exec($req);
    $erreur = curl_error($req);
    $http = (int) curl_getinfo($req, CURLINFO_RESPONSE_CODE);

    if ($corps === false) {
        return ['ok' => false, 'http' => $http, 'reponse' => 'CURL_ERREUR:' . $erreur];
    }

    // Suit la chaine de redirection manuellement, en GET uniquement.
    // Apps Script repond 302 (parfois plusieurs) vers
    // script.googleusercontent.com/macros/echo?… : c'est cette fin de chaine
    // qui execute vraiment le doGet/doPost. On borne a 5 sauts.
    $scope = curl_init();
    for ($i = 0; $i < 5; $i++) {
        if (!preg_match('~^Location:\s*(.+?)\s*$~mi', $corps, $m)) {
            break;
        }
        $suivante = trim($m[1]);
        curl_setopt_array($scope, [
            CURLOPT_URL            => $suivante,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => $timeout,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_FOLLOWLOCATION => true,
        ]);
        $corps = curl_exec($scope);
        $erreur = curl_error($scope);
        $http = (int) curl_getinfo($scope, CURLINFO_RESPONSE_CODE);
        if ($corps !== false && !preg_match('~^location:\s*~mi', $corps)) {
            break;
        }
    }
    unset($scope);
    if ($corps === false) {
        return ['ok' => false, 'http' => $http, 'reponse' => 'CURL_ERREUR:' . $erreur];
    }

    // Le corps final ne doit plus contenir les en-tetes.
    $reponse = trim((string) $corps);
    if (($pos = strpos($reponse, "\r\n\r\n")) !== false) {
        $reponse = trim(substr($reponse, $pos + 4));
    }
    return [
        'ok'      => ($http === 200 && $reponse === 'OK'),
        'http'    => $http,
        'reponse' => $reponse,
    ];
}