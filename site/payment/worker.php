<?php

// =============================================================
//  worker.php : vide la file d'attente en arriere-plan.
//
//  APPEL :
//    php worker.php [--infini] [--max N]
//
//  - par defaut (cron toutes les 5 min, minimum Namecheap) : traite un
//    lot borne (WORKER_MAX_JOBS par defaut), puis sort.
//  - --infini : boucle jusqu'a vider la file ou qu'un dechargeur
//    au bout de WORKER_MAX_SECONDES.
//
//  Un verrou flock exclusif garantit qu'un SEUL worker tourne a la
//  fois : si 500 webhooks declenchent 500 workers, 499 sortent
//  aussitot (DEJA_EN_COURS) et le premier traite, un job a la fois.
//
//  Cron recommande (Namecheap : minimum 5 minutes) :
//    */5 * * * * /usr/local/bin/php /home/franwawe/tenderpilot.store/payment/worker.php >> /home/franwawe/tenderpilot.store/payment/worker.log 2>&1
// =============================================================

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('CLI_ONLY');
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/queue.php';
require_once __DIR__ . '/process-order.php';

$infini = in_array('--infini', $argv, true);
// En mode --infini, seule la butée de temps borne le passage (pas de lot) ;
// en mode cron, on traite un lot borné et on sort.
$max = $infini ? PHP_INT_MAX : WORKER_MAX_JOBS;
for ($i = 1; $i < $argc; $i++) {
    if ($argv[$i] === '--max' && isset($argv[$i + 1])) {
        $max = max(1, (int) $argv[$i + 1]);
        $i++;
    }
}

if (!verrouWorker()) {
    echo "DEJA_EN_COURS\n";
    exit(0);
}

$debut = time();
$processed = 0;
$failed = 0;

try {
    while (true) {
        $fichiers = jobsEnAttente();
        if ($fichiers === []) {
            echo "FILE_VIDE\n";
            break;
        }
        $progres = false;
        foreach ($fichiers as $chemin) {
            if (time() - $debut >= WORKER_MAX_SECONDES) {
                echo "LIMITE_TEMPS\n";
                break 2;
            }
            if ($processed >= $max) {
                echo "LOT_MAX_ATTEINT\n";
                break 2;
            }
            $job = jobLire($chemin);
            if ($job === null) {
                // Fichier corrompu ou disparu : on le deloge vers failed.
                jobVersEchecs($chemin);
                $progres = true;
                continue;
            }
            // Pas encore l'heure de réessayer : on passe, sans bloquer la file.
            if ((int) ($job['prochaine_tentative'] ?? 0) > time()) {
                continue;
            }
            $progres = true;
            $resultat = traiterAchat($job);
            if ($resultat['ok'] === true) {
                $processed++;
                jobVersTraites($chemin);
                echo "OK   {$job['id']}\n";
            } elseif ($resultat['retry'] === true && (int) ($job['tentatives'] ?? 0) < (int) ($job['max_tentatives'] ?? WORKER_MAX_TENTATIVES)) {
                // Echec transitoire : on note la tentative et on repousse le
                // job dans le temps, sans le supprimer (jobEnfiler ecrit au
                // meme emplacement, en atomique).
                $job['tentatives'] = (int) ($job['tentatives'] ?? 0) + 1;
                $job['prochaine_tentative'] = time() + (int) ($job['delai_retour_sec'] ?? WORKER_DELAI_RETOUR_SEC);
                jobEnfiler($job['id'], $job);
                echo "EN RETRAIT  {$job['id']} ({$resultat['raison']})\n";
            } else {
                // Echec definitif : alerte operateur puis archive.
                $failed++;
                notifierOperateurEchec($job, $resultat);
                jobVersEchecs($chemin);
                echo "ECHEC {$job['id']} ({$resultat['raison']})\n";
            }
        }
        // Rien de traitable dans ce tour (tout est en attente de délai) : on
        // s'arrête, sinon --infini tournerait à vide.
        if (!$progres) { echo "ATTENTE_DELAI\n"; break; }
        if (!$infini) { break; }
        // En mode infini on reboucle — la file et le garde-fou de temps bornent.
    }
} finally {
    verrouWorkerRelacher();
}

echo "WORKER_TERMINE processed={$processed} failed={$failed}\n";
exit(0);