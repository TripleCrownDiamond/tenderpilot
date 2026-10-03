<?php

// =============================================================
//  mails-plafond.php : plafond horaire glissant des envois SMTP.
//  Include-only (ne produit aucune sortie).
//
//  Le webhook livre immediatement : un pic de ventes produit un
//  pic de mails — et un hebergeur partage plafonne l'envoi SMTP
//  (Namecheap : ~30/h), sans jamais renvoyer ce que son serveur
//  a refuse. Le plafond s'applique UNIQUEMENT aux mails
//  operateurs ; le mail du client n'est JAMAIS plafonne : c'est
//  le mail prioritaire, celui qui donne l'acces au produit.
//
//  Principe : un journal (mails-journal.json) note un message
//  par envoi operateur reussi ; on ne compte que les 60
//  dernieres minutes (fenetre glissante). Au-dela du plafond,
//  l'envoi n'est PAS tente : on n'ecrit rien au journal (on ne
//  marque que ce qui est parti) — la notification correspondante
//  se repercutera par la reprise du job (worker) ou restera
//  visible dans partages-en-echec.csv.
// =============================================================

const PLAFOND_MAILS_HEURE = 20; // mails operateurs max par heure glissante
const FICHIER_MAILS_JOURNAL = __DIR__ . '/mails-journal.json';

// Lis le journal des envois (timestamps entiers).
function mailsJournalLire(): array {
    $contenu = @file_get_contents(FICHIER_MAILS_JOURNAL);
    if ($contenu === false) { return []; }
    $liste = json_decode((string) $contenu, true);
    return is_array($liste) ? array_values(array_filter($liste, 'is_int')) : [];
}

// Note un envoi parti (atomique, flock ; purge les entrees de plus d'une heure).
function mailsJournalNoter(): void {
    $h = @fopen(FICHIER_MAILS_JOURNAL, 'c+');
    if (!$h) { return; }
    if (!flock($h, LOCK_EX)) { fclose($h); return; }
    $contenu = stream_get_contents($h);
    $liste = json_decode((string) $contenu, true);
    $liste = is_array($liste) ? array_values(array_filter($liste, 'is_int')) : [];
    $liste[] = time();
    $limite = time() - 3600;
    $liste = array_values(array_filter($liste, function ($t) use ($limite) { return $t >= $limite; }));
    ftruncate($h, 0);
    rewind($h);
    fwrite($h, json_encode($liste) . "\n");
    fflush($h);
    flock($h, LOCK_UN);
    fclose($h);
}

// Combien de mails operateurs sont partis dans la derniere heure.
function mailsOperateurCompte(): int {
    $limite = time() - 3600;
    return count(array_filter(mailsJournalLire(), function ($t) use ($limite) { return $t >= $limite; }));
}

// Vrai si un mail operateur peut partir maintenant.
function mailOperateurAutorise(): bool {
    return mailsOperateurCompte() < PLAFOND_MAILS_HEURE;
}
