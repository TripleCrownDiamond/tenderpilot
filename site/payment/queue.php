<?php

// =============================================================
//  queue.php : file d'attente sur fichiers (zéro dépendance).
//
//  Le webhook est désormais un PRODUCTEUR : il valide, deduplique et
//  enfile aussitôt. Le worker.php est le CONSOMMATEUR : il
//  vide la file en arrière-plan (cron) avec un verrou exclusif, pour
//  que 1000 paiements simultanés ne bloquent jamais le site.
//
//  Deux primitives importantes :
//  - jobEnfiler()  : écrit le job de façon ATOMIQUE (temp + rename), donc
//                    aucun job corrompu même si plusieurs requêtes arrivent
//                    en même temps.
//  - verrouWorker() : flock exclusif non bloquant. Le premier worker qui
//                    le prend vide la file ; les autres sortent aussitôt
//                    (DEJA_EN_COURS). C'est ce qui évite l'avalanche.
// =============================================================

// Répertoires de la file. Créés à la volée.
//  queue/  jobs en attente
//  processed/       jobs terminés avec succès (historique, purgeable)
//  failed/        jobs qui ont épuisé leurs tentatives (à inspecter)
const REP_QUEUE = __DIR__ . '/queue';
const REP_PROCESSED     = __DIR__ . '/processed';
const REP_FAILED       = __DIR__ . '/failed';
const FICHIER_VERROU  = __DIR__ . '/worker.lock';

function repque_creer(string $rep): void {
    if (!is_dir($rep)) { @mkdir($rep, 0775, true); }
}

// --- Enfile un job atomiquement. Retourne true si posé. ---
function jobEnfiler(string $id, array $job): bool {
    if (!preg_match('/^[A-Za-z0-9_.-]+$/', $id)) { return false; }
    repque_creer(REP_QUEUE);
    $chemin = REP_QUEUE . '/' . $id . '.job.json';
    $tmp    = REP_QUEUE . '/.' . $id . '.tmp';
    $contenu = json_encode($job, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n";
    if (@file_put_contents($tmp, $contenu, LOCK_EX) === false) { return false; }
    if (!@rename($tmp, $chemin)) {
        @unlink($tmp);
        return false;
    }
    return true;
}

// --- Liste les fichiers de jobs en attente, du plus ancien au plus récent. ---
function jobsEnAttente(): array {
    if (!is_dir(REP_QUEUE)) { return []; }
    $fichiers = glob(REP_QUEUE . '/*.job.json');
    if (!is_array($fichiers)) { return []; }
    usort($fichiers, function ($a, $b) { return filemtime($a) <=> filemtime($b); });
    return $fichiers;
}

function jobLire(string $chemin): ?array {
    $contenu = @file_get_contents($chemin);
    if ($contenu === false) { return null; }
    $job = json_decode($contenu, true);
    return is_array($job) ? $job : null;
}

// --- Déplace le job (atomique via rename) vers processed/ ou failed/. ---
function jobArchive(string $chemin, string $rep): bool {
    repque_creer($rep);
    return @rename($chemin, $rep . '/' . basename($chemin));
}

function jobVersTraites(string $chemin): bool { return jobArchive($chemin, REP_PROCESSED); }
function jobVersEchecs(string $chemin): bool  { return jobArchive($chemin, REP_FAILED); }

// --- Verrou exclusif du worker. Retourne false si déjà pris. ---
function verrouWorker(): bool {
    $h = @fopen(FICHIER_VERROU, 'c');
    if (!$h) { return false; }
    $pris = flock($h, LOCK_EX | LOCK_NB);
    if (!$pris) { fclose($h); return false; }
    // On garde la ressource ouverte pendant toute la durée de vie du worker :
    // le handle de verrouillage est conservé dans une variable globale.
    $GLOBALS['__worker_lock'] = $h;
    return true;
}

function verrouWorkerRelacher(): void {
    if (!empty($GLOBALS['__worker_lock'])) {
        flock($GLOBALS['__worker_lock'], LOCK_UN);
        fclose($GLOBALS['__worker_lock']);
        unset($GLOBALS['__worker_lock']);
    }
}