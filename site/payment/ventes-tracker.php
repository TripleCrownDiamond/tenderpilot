<?php

// =============================================================
//  ventes-tracker.php : journal des ventes réelles.
//  Include-only (ne produit aucune sortie).
//
//  Chaque successful.sale réel (dédupliqué, remonté par webhook.php)
//  est ajouté à payment/ventes.csv, une ligne par vente. Le fichier
//  est lisible dans un tableur et bloqué en web par .htaccess : on
//  ne sert jamais les emails des acheteurs sur Internet.
//
//  Format (une ligne par vente, séparateur ;, UTF-8) :
//    date (UTC) ; delivery_id ; sale_id ; email ; montant ; produit
//  Les valeurs à ; ou \n ou " sont échappées entre guillemets.
// =============================================================

const FICHIER_VENTES = __DIR__ . '/ventes.csv';

// Vrai si une commande (sale_id) figure deja au journal. Permet de ne
// jamais compter deux fois une meme vente : le webhook (retry avec un
// nouveau delivery_id) et le filet de secours de thank-you.php s'appuient
// dessus pour eviter le double increment du compteur et la double ligne.
function venteDejaEnregistree(string $saleId): bool {
    if ($saleId === '') { return false; }
    $contenu = @file_get_contents(FICHIER_VENTES);
    if ($contenu === false) { return false; }
    return strpos($contenu, $saleId) !== false;
}

function ventesEchapper(string $valeur): string {
    if (strpbrk($valeur, ";\n\"") === false) { return $valeur; }
    return '"' . str_replace('"', '""', $valeur) . '"';
}

// Ajoute une vente au journal (atomique, flock ; crée le fichier et
// l'en-tête au premier appel). Retourne true si la ligne est écrite.
function venteEnregistrer(array $donnees): bool {
    $client  = $donnees['customer'] ?? ($donnees['data']['customer'] ?? []);
    $vente   = $donnees['sale'] ?? ($donnees['data']['sale'] ?? []);
    $email    = strtolower(trim((string) ($client['email'] ?? '')));
    $saleId   = trim((string) ($vente['id'] ?? ($vente['reference'] ?? '')));
    $montant = $vente['amount'] ?? '';
    if (is_array($montant)) { $montant = $montant['formatted'] ?? ''; }
    $montant = trim((string) $montant);
    // Schema plat Chariow : le produit est au niveau racine, pas dans sale.
    $produit = $donnees['product'] ?? ($vente['product'] ?? '');
    if (is_array($produit)) { $produit = $produit['name'] ?? ''; }
    $produit = trim((string) $produit);

    $ligne = [
        date('c', time()),                                  // date UTC ISO-8601
        $donnees['delivery_id'] ?? '',
        $saleId,
        $email,
        $montant,
        $produit,
    ];

    $h = @fopen(FICHIER_VENTES, 'a');
    if (!$h) { return false; }
    if (!flock($h, LOCK_EX)) { fclose($h); return false; }
    if (filesize(FICHIER_VENTES) === 0) {
        fwrite($h, implode(';', ['date', 'delivery_id', 'sale_id', 'email', 'montant', 'produit']) . "\n");
    }
    $ok = fwrite($h, implode(';', array_map('ventesEchapper', $ligne)) . "\n") !== false;
    flock($h, LOCK_UN);
    fclose($h);
    return $ok;
}