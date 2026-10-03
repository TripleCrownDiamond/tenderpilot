<?php

// =============================================================
//  echecs-tracker.php : journal des partages en echec.
//  Include-only (ne produit aucune sortie).
//
//  L'achat peut reussir pendant que le partage du classeur
//  maitre echoue : pont Apps Script en panne, hoquet Google
//  (page d'erreur Drive), email refuse par Drive. L'acheteur
//  a paye — sa trace ne doit JAMAIS se perdre. Chaque echec
//  definitif ecrit une ligne dans partages-en-echec.csv
//  (bloque en web comme ventes.csv) ; la ligne passe a RESOLU
//  des que la meme vente aboutit (pulse ressoumis, worker,
//  ou partage fait a la main) : le proprietaire voit d'un
//  coup d'oeil qui attend encore son acces.
//
//  Format (separateur ;, UTF-8, valeurs ;\n" echappees) :
//    date_echec;delivery_id;sale_id;email;motif;statut;date_resolution
//  statut : ECHEC (a traiter) | RESOLU (acces finalement donne)
// =============================================================

const FICHIER_ECHECS = __DIR__ . '/partages-en-echec.csv';

function echecsEchapper(string $valeur): string {
    if (strpbrk($valeur, ";\n\"") === false) { return $valeur; }
    return '"' . str_replace('"', '""', $valeur) . '"';
}

// Lit toutes les lignes du journal (en-tete exclus). Chaque ligne est
// un tableau de 7 champs ; les lignes illisibles sont ignorees.
function echecsLire(): array {
    if (!is_file(FICHIER_ECHECS)) { return []; }
    $contenu = @file_get_contents(FICHIER_ECHECS);
    if ($contenu === false) { return []; }
    $lignes = explode("\n", $contenu);
    $lignes = array_slice($lignes, 1); // en-tete
    $sortie = [];
    foreach ($lignes as $ligne) {
        $ligne = trim($ligne);
        if ($ligne === '') { continue; }
        $sortie[] = str_getcsv($ligne, ';', '"', '"');
    }
    return $sortie;
}

// Vrai si la derniere ligne de cette vente est un ECHEC non resolu.
// Un echec deja trace ne se retrace pas : le mail d'alerte repart
// (il faut etre prevenu), pas une seconde ligne identique.
function echecOuvertPourVente(string $saleId): bool {
    if ($saleId === '') { return false; }
    $dernierStatut = '';
    foreach (echecsLire() as $champs) {
        if (count($champs) < 6) { continue; }
        if (trim($champs[2]) === $saleId) { $dernierStatut = trim($champs[5]); }
    }
    return $dernierStatut === 'ECHEC';
}

// Ajoute un echec au journal (atomique, flock, en-tete cree au besoin).
// Retourne true si une ligne a ete ecrite (false = deja tracee).
function echecEnregistrer(string $deliveryId, string $saleId, string $email, string $motif): bool {
    if (echecOuvertPourVente($saleId)) { return false; }
    $ligne = [
        date('c', time()),
        $deliveryId,
        $saleId,
        strtolower(trim($email)),
        $motif,
        'ECHEC',
        '',
    ];
    $h = @fopen(FICHIER_ECHECS, 'a');
    if (!$h) { return false; }
    if (!flock($h, LOCK_EX)) { fclose($h); return false; }
    if (filesize(FICHIER_ECHECS) === 0) {
        fwrite($h, implode(';', ['date_echec', 'delivery_id', 'sale_id', 'email', 'motif', 'statut', 'date_resolution']) . "\n");
    }
    $ok = fwrite($h, implode(';', array_map('echecsEchapper', $ligne)) . "\n") !== false;
    flock($h, LOCK_UN);
    fclose($h);
    return $ok;
}

// Marque RESOLUE la (derniere) ligne ECHEC ouverte de cette vente :
// le statut change et la date de resolution est posee. Reecriture
// complete du fichier en un passage, sous flock, via fichier
// temporaire + rename (atomique). Retourne true si une ligne a change.
function echecMarquerResolu(string $saleId): bool {
    if ($saleId === '') { return false; }
    if (!is_file(FICHIER_ECHECS)) { return false; }
    $h = @fopen(FICHIER_ECHECS, 'c+');
    if (!$h) { return false; }
    if (!flock($h, LOCK_EX)) { fclose($h); return false; }

    $contenu = stream_get_contents($h);
    $lignes = explode("\n", (string) $contenu);
    $enTete = array_shift($lignes);
    $change = false;
    $sortie = [];
    foreach ($lignes as $ligne) {
        if (trim($ligne) === '') { continue; }
        $champs = str_getcsv($ligne, ';', '"', '"');
        if (count($champs) >= 7 && trim($champs[2]) === $saleId && trim($champs[5]) === 'ECHEC') {
            $champs[5] = 'RESOLU';
            $champs[6] = date('c', time());
            $ligne = implode(';', array_map('echecsEchapper', $champs));
            $change = true;
        }
        $sortie[] = $ligne;
    }
    if ($change) {
        ftruncate($h, 0);
        rewind($h);
        fwrite($h, implode("\n", array_merge([$enTete], $sortie)) . "\n");
        fflush($h);
    }
    flock($h, LOCK_UN);
    fclose($h);
    return $change;
}
