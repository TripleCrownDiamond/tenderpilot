<?php

// =============================================================
//  process-order.php : exécution d'un job "successful.sale".
//  Appelé par le worker.php (jamais par le webhook).
//
//  Ordre, et pourquoi :
//   1. autoriserEmail    -> débloque la page de remerciement
//   2. donnerAccesFeuille -> partage LECTEUR sur le maitre, et on VÉRIFIE
//                            la réponse du pont (HTTP 200 + corps 'OK')
//   3. envoyerRecapAchat  -> récap au client (seulement si l'acces est la)
//   4. notifierOperateur  -> un mail à l'opérateur, sccès OU alerte
//
//  Le mail au client n'est donc envoyé QUE si l'acces a réellement été
//  accordé : jamais de récap qui promet un produit illisible.
// =============================================================

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/access.php';
require_once __DIR__ . '/echecs-tracker.php';
require_once __DIR__ . '/receipt-mail.php';

// Traite UN job. Retourne le résultat pour le worker :
//   ['ok'     => bool,   vrai si l'acces est partage (et recap envoye)
//    'retry'  => bool,   vrai si l'echec est transitoire (reessayer)
//    'reponse'=> string  reponse du pont (diagnostic du mail operateur)
//    'raison' => string  message humain du diagnostic]
function traiterAchat(array $job, bool $rapide = false): array {
    $donnees = $job['donnees'] ?? [];
    // Format Chariow : customer à la racine. On tolère aussi une forme
    // imbriquee (data.customer) pour d'eventuels relais.
    $client = $donnees['customer'] ?? ($donnees['data']['customer'] ?? []);
    $email = strtolower(trim((string) ($client['email'] ?? '')));

    // Email absent ou invalide : rien a partager, rien a reessayer.
    if ($email === '' || !preg_match('/^[^@\s]+@[^@\s]+\.[^@\s]+$/', $email)) {
        return ['ok' => false, 'retry' => false, 'reponse' => '', 'raison' => 'EMAIL_INVALIDE'];
    }

    autoriserEmail($email);

    // EN DIRECT DEPUIS LE WEBHOOK, on tente une seule fois, sans trainer :
    // Chariow attend notre reponse. Ce qui echoue reste en file, et le
    // worker (cron) reprend avec le budget complet. Voir donnerAccesFeuille.
    $verif = $rapide
        ? donnerAccesFeuille($email, 1, 25)
        : donnerAccesFeuille($email);
    if ($verif['ok'] !== true) {
        // Echec transitoire (CURL_ERREUR, HTTP >= 500) : on laisse le worker
        // reessayer avec un delai. Echec franc (AUTH_FAIL, EMAIL_INVALIDE,
        // MAITRE_INTROUVABLE... a HTTP 200) : inutile de reessayer.
        $retry = ($verif['http'] === 0 || $verif['http'] >= 500);
        return [
            'ok'      => false,
            'retry'   => $retry,
            'reponse' => $verif['reponse'],
            'raison'  => 'Acces non partage (HTTP ' . $verif['http'] . " : " . $verif['reponse'] . ')',
        ];
    }

    // L'acces est en place : le client peut vraiment copier. Recap + mail
    // operateur. L'echec du recap (SMTP) ne remet PAS en cause le partage.
    $recapOk = envoyerRecapAchat($donnees);
    notifierOperateur($donnees, $verif['reponse'], $recapOk);

    // La vente a fini par aboutir : si elle figurait au journal des
    // partages en echec (partages-en-echec.csv), sa ligne passe a RESOLU —
    // le proprietaire ne garde a traiter que ce qui attend encore.
    $vente = $donnees['sale'] ?? ($donnees['data']['sale'] ?? []);
    echecMarquerResolu(trim((string) ($vente['id'] ?? ($vente['reference'] ?? ''))));

    return ['ok' => true, 'retry' => false, 'reponse' => $verif['reponse'], 'raison' => 'OK'];
}

// Traite un job déjà en file à partir de son chemin. Logique identique au
// worker.php, appelable immédiatement depuis le webhook pour que la livraison
// ne dépende pas du cron.
//   - succès  -> archive vers processed/
//   - échec transitoire -> tente une nouvelle fois plus tard (retry)
//   - échec définitif   -> alerte opérateur + archive vers failed/
function traiterJobEnfile(string $chemin, bool $rapide = false): void {
    $job = jobLire($chemin);
    if ($job === null) {
        jobVersEchecs($chemin);
        return;
    }
    $resultat = traiterAchat($job, $rapide);
    if ($resultat['ok'] === true) {
        jobVersTraites($chemin);
    } elseif ($resultat['retry'] === true
        && (int) ($job['tentatives'] ?? 0) < (int) ($job['max_tentatives'] ?? WORKER_MAX_TENTATIVES)) {
        $job['tentatives'] = (int) ($job['tentatives'] ?? 0) + 1;
        $job['prochaine_tentative'] = time() + (int) ($job['delai_retour_sec'] ?? WORKER_DELAI_RETOUR_SEC);
        jobEnfiler($job['id'], $job);
    } else {
        notifierOperateurEchec($job, $resultat);
        jobVersEchecs($chemin);
    }
}