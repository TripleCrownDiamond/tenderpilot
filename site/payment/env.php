<?php

// =============================================================
//  Chargeur .env (aucune dependance, pur PHP).
//  Charge les variables du fichier .env dans getenv() / $_ENV.
// =============================================================

function env_charger(string $fichier): void {
    if (!is_file($fichier) || !is_readable($fichier)) {
        return;
    }
    $lignes = file($fichier, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lignes === false) {
        return;
    }
    foreach ($lignes as $ligne) {
        $l = trim($ligne);
        if ($l === '' || $l[0] === '#' || $l[0] === ';') {
            continue;
        }
        $pos = strpos($l, '=');
        if ($pos === false) {
            continue;
        }
        $cle    = trim(substr($l, 0, $pos));
        $valeur = trim(substr($l, $pos + 1));

        // Enleve des guillemets simples ou doubles qui encadrent la valeur
        if (strlen($valeur) >= 2) {
            $premier = $valeur[0];
            $dernier = substr($valeur, -1);
            if (($premier === '"' && $dernier === '"') || ($premier === "'" && $dernier === "'")) {
                $valeur = substr($valeur, 1, -1);
            }
        }

        putenv($cle . '=' . $valeur);
        $_ENV[$cle] = $valeur;
        $_SERVER[$cle] = $valeur;
    }
}

// Recupere une variable d'environnement avec un defaut.
function env(string $cle, $defaut = null) {
    $v = getenv($cle);
    if ($v === false || $v === '') {
        return $defaut;
    }
    return $v;
}

env_charger(__DIR__ . '/.env');