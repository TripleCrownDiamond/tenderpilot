<?php

// =============================================================
//  Envoi des emails : recap d'achat (cliente) et notifications
//  operateur (succes / alerte d'acces).
//  Utilise PHPMailer en SMTP (port 465 SSL), parametree dans .env.
//
//  Les gabarits HTML sont en <table> pleine largeur : c'est la seule
//  structure rendue a l'identique par tous les clients mail (Gmail,
//  Outlook, Apple Mail, mobiles). La mise en page responsive tient dans
//  trois regles @media (max-width: 620px) : 100% de largeur, paddings
//  reduits, tailles de titre descendues.
// =============================================================

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as PHPMailerException;

require_once __DIR__ . '/vendor/phpmailer/Exception.php';
require_once __DIR__ . '/vendor/phpmailer/PHPMailer.php';
require_once __DIR__ . '/vendor/phpmailer/SMTP.php';
require_once __DIR__ . '/mails-plafond.php';

// Brique commune : un PHPMailer SMTP pret. null si SMTP non configure.
function creerMailer(): ?PHPMailer {
    if (MAIL_HOST === '' || MAIL_USERNAME === '' || MAIL_PASSWORD === '') {
        return null;
    }
    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host       = MAIL_HOST;
        $mail->SMTPAuth   = true;
        $mail->Username   = MAIL_USERNAME;
        $mail->Password   = MAIL_PASSWORD;
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        $mail->Port       = MAIL_PORT;
        $mail->CharSet    = 'UTF-8';
        $mail->setFrom(MAIL_FROM, MAIL_FROM_NAME);
        return $mail;
    } catch (PHPMailerException $e) {
        error_log('Mailer non configure : ' . $mail->ErrorInfo);
        return null;
    }
}

// Envoi brut via un mailer prepare. Retourne false si SMTP absent ou
// plafond opereur atteint.
//   $prioritaire = true  -> mail du CLIENT : jamais plafonne, jamais retarde.
//   $prioritaire = false -> mail OPERATEUR : soumis au plafond horaire
//     glissant (mails-plafond.php) pour qu'un pic de ventes ne fasse pas
//     bloquer le SMTP de l'hebergeur. On ne note au journal que ce qui
//     est vraiment parti.
function envoyerSmtp(?PHPMailer $mail, string $dest, string $nom, string $sujet, string $html, string $texte, bool $prioritaire = false): bool {
    if ($mail === null) { return false; }
    if (!$prioritaire && !mailOperateurAutorise()) {
        error_log('Plafond mails operateur atteint (' . mailsOperateurCompte() . '/h) : non envoye a ' . $dest . ' : ' . $sujet);
        return false;
    }
    try {
        $mail->clearAddresses();
        $mail->addAddress($dest, $nom);
        $mail->Subject = $sujet;
        $mail->isHTML(true);
        $mail->Body    = $html;
        $mail->AltBody = $texte;
        $mail->send();
        if (!$prioritaire) { mailsJournalNoter(); }
        return true;
    } catch (PHPMailerException $e) {
        error_log('Email non envoye a ' . $dest . ' : ' . $mail->ErrorInfo);
        return false;
    }
}

// Récupère les infos de vente communes aux mails (bonjour, lignes détail).
// Compatible avec le payload Chariow (format plat) et la forme imbriquee
// (data.*). Plusieurs champs sont des objets chez Chariow : sale.product
// (objet {name}), sale.amount (objet {formatted}) — on lit la valeur utile.
function infosVente(array $donnees): array {
    $client  = $donnees['customer'] ?? ($donnees['data']['customer'] ?? []);
    $vente   = $donnees['sale'] ?? ($donnees['data']['sale'] ?? []);
    $email    = strtolower(trim((string) ($client['email'] ?? '')));
    $nom      = trim((string) ($client['name'] ?? ''));
    $saleId   = trim((string) ($vente['id'] ?? ($vente['reference'] ?? '')));
    $produit = $vente['product'] ?? NOM_PRODUIT;
    if (is_array($produit)) {
        // Chariow envoie sale.product = {id, name, url, ...}.
        $produit = $produit['name'] ?? '';
    }
    $produit = trim((string) $produit);
    if ($produit === '') { $produit = NOM_PRODUIT; }
    $montant = $vente['amount'] ?? '';
    if (is_array($montant)) {
        // Chariow envoie sale.amount = {value, formatted, short, currency}.
        $montant = $montant['formatted'] ?? '';
    }
    $montant = trim((string) $montant);

    $lignes = [];
    if ($produit !== '') { $lignes[] = ['Produit', $produit]; }
    if ($saleId !== '')  { $lignes[] = ['Référence', $saleId]; }
    if ($montant !== '') { $lignes[] = ['Montant', $montant]; }

    return [
        'email'    => $email,
        'nom'      => $nom,
        'saleId'   => $saleId,
        'produit'  => $produit,
        'montant'  => $montant,
        'bonjour'  => $nom !== '' ? $nom : explode('@', $email)[0],
        'lignes'   => $lignes,
    ];
}

// ------------------------------------------------------------------
//  Gabarits internes
// ------------------------------------------------------------------

const MAIL_INDIGO = '#4F46FF';
const MAIL_NAVY   = '#0B1225';
const MAIL_ENCRE  = '#374151';
const MAIL_GRIS   = '#6B7280';
const MAIL_FILET  = '#E5E7EB';
const MAIL_FOND   = '#F6F7FA';
const MAIL_VERT   = '#22B255';

// Ouverture commune : fond gris clair, carte blanche de 600px.
function mailDebut(string $titre): string {
    return '<!DOCTYPE html>
<html lang="fr" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>' . htmlspecialchars($titre, ENT_QUOTES, 'UTF-8') . '</title>
<style>
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0; mso-table-rspace: 0; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  a { text-decoration: none; }
  @media only screen and (max-width: 620px) {
    .cadre-mail { width: 100% !important; }
    .case-mail { padding-left: 20px !important; padding-right: 20px !important; }
    .titre-mail { font-size: 22px !important; line-height: 1.25 !important; }
    .titre-bloc { font-size: 15px !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background:' . MAIL_FOND . '; font-family: Arial, Helvetica, sans-serif;">
<div style="display:none;font-size:1px;color:' . MAIL_FOND . ';line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">Votre commande est confirmée — voici comment récupérer votre produit.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:' . MAIL_FOND . ';">
<tr><td align="center" style="padding:24px 12px;">
';
}

// Bandeau logo + carte ouverte. Un seul logo (fonce, bon sur fond clair).
function mailCarteOuverte(string $altLogo): string {
    $logo = '';
    if (is_file(__DIR__ . '/logo-email-fonce.png')) {
        $logo = '<img src="cid:logof" alt="' . htmlspecialchars($altLogo, ENT_QUOTES, 'UTF-8') . '" width="132" height="30" style="display:block;width:132px;height:30px">';
    }
    return '<table role="presentation" class="cadre-mail" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
<tr><td class="case-mail" style="padding:0 28px 16px;">' . $logo . '</td></tr>
<tr><td class="case-mail" style="background:#ffffff;border-radius:16px;border:1px solid ' . MAIL_FILET . ';padding:32px 36px 8px;">
';
}

// Bas de carte : pied avec mention reactive + legal.
function mailCarteFerme(string $emailContact, string $lienWhatsapp, string $numeroWhatsapp): string {
    return '</td></tr>
<tr><td class="case-mail" style="padding:20px 28px 4px;">
  <p style="margin:0;font-size:12px;line-height:1.6;color:' . MAIL_GRIS . ';">
    Vous recevez cet email parce qu’une commande ' . htmlspecialchars(NOM_PRODUIT, ENT_QUOTES, 'UTF-8') . ' a été passée avec cette adresse.<br>
    Une question ? Répondez à cet email, écrivez à <a href="mailto:' . htmlspecialchars($emailContact, ENT_QUOTES, 'UTF-8') . '" style="color:' . MAIL_INDIGO . ';font-weight:bold;">' . htmlspecialchars($emailContact, ENT_QUOTES, 'UTF-8') . '</a>
    ou sur <a href="' . htmlspecialchars($lienWhatsapp, ENT_QUOTES, 'UTF-8') . '" style="color:' . MAIL_INDIGO . ';font-weight:bold;">WhatsApp ' . htmlspecialchars($numeroWhatsapp, ENT_QUOTES, 'UTF-8') . '</a>.
  </p>
</td></tr>
</table>
';
}

function mailFin(): string {
    return '</td></tr>
</table>
</body>
</html>';
}

// Ligne de detail libelle/valeur (recapitulatif de commande).
function mailLigne(string $libelle, string $valeur): string {
    return '<tr>
  <td style="padding:9px 0;color:' . MAIL_GRIS . ';font-size:14px;">' . htmlspecialchars($libelle, ENT_QUOTES, 'UTF-8') . '</td>
  <td align="right" style="padding:9px 0;color:' . MAIL_NAVY . ';font-size:14px;font-weight:bold;overflow-wrap:anywhere;">' . htmlspecialchars($valeur, ENT_QUOTES, 'UTF-8') . '</td>
</tr>';
}

// --- Récap achat au client (uniquement quand l'acces est en place). ---
function envoyerRecapAchat(array $donnees): bool {
    $infos = infosVente($donnees);
    if ($infos['email'] === '' || !preg_match('/^[^@\s]+@[^@\s]+\.[^@\s]+$/', $infos['email'])) {
        return false;
    }

    $mail = creerMailer();
    if ($mail === null) { return false; }

    // Le logo voyage dans le mail (cid:), jamais depuis un serveur distant.
    if (is_file(__DIR__ . '/logo-email-fonce.png')) { $mail->addEmbeddedImage(__DIR__ . '/logo-email-fonce.png', 'logof'); }

    // MAIL PRIORITAIRE : le client d'abord, sans plafond ni attente.
    return envoyerSmtp(
        $mail,
        $infos['email'],
        $infos['nom'],
        'Votre accès ' . NOM_PRODUIT . ' est prêt',
        recapHtml($infos['bonjour'], $infos['lignes'], $infos['email']),
        recapTexte($infos['bonjour'], $infos['lignes'], $infos['email']),
        true
    );
}

function recapHtml(string $bonjour, array $lignes, string $email): string {
    $portail   = htmlspecialchars(PORTAL_ACHETEUR_URL, ENT_QUOTES, 'UTF-8');
    $videoPc   = htmlspecialchars(VIDEO_DEZIPPER_PC, ENT_QUOTES, 'UTF-8');
    $videoMac  = htmlspecialchars(VIDEO_DEZIPPER_MAC, ENT_QUOTES, 'UTF-8');
    $lienWa    = htmlspecialchars(LIEN_WHATSAPP, ENT_QUOTES, 'UTF-8');
    $numeroWa  = htmlspecialchars(NUMERO_WHATSAPP, ENT_QUOTES, 'UTF-8');
    $produit   = htmlspecialchars(NOM_PRODUIT, ENT_QUOTES, 'UTF-8');
    $emailE    = htmlspecialchars($email, ENT_QUOTES, 'UTF-8');

    // Lignes du recapitulatif.
    $lignesRecap = '';
    foreach ($lignes as $ligne) {
        $lignesRecap .= mailLigne((string) $ligne[0], (string) $ligne[1]);
    }

    // Etape 2 : le groupe WhatsApp des acheteurs, si cree.
    $blocGroupe = '';
    if (LIEN_GROUPE_WHATSAPP !== '') {
        $blocGroupe = '<p style="margin:0 0 6px;font-size:14px;color:' . MAIL_ENCRE . ';">Et rejoignez le <a href="' . htmlspecialchars(LIEN_GROUPE_WHATSAPP, ENT_QUOTES, 'UTF-8') . '" style="color:' . MAIL_INDIGO . ';font-weight:bold;">groupe WhatsApp des acheteurs</a> — c&#8217;est là que nous annonçons les nouvelles sources et aidons pour l&#8217;installation.</p>';
    }

    return mailDebut('Votre accès ' . NOM_PRODUIT)
        . mailCarteOuverte(NOM_PRODUIT)
        // Titre + accroche
        . '<h1 class="titre-mail" style="margin:0 0 10px;color:' . MAIL_NAVY . ';font-size:26px;line-height:1.3;font-weight:bold;">Merci ' . htmlspecialchars($bonjour, ENT_QUOTES, 'UTF-8') . ', c&#8217;est réglé&nbsp;!</h1>
<p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:' . MAIL_ENCRE . ';">
  Votre paiement est bien arrivé et votre accès est prêt. Voici le récapitulatif, puis comment récupérer votre produit — ça prend dix minutes, montre en main.
</p>'
        // Recapitulatif
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ' . MAIL_FILET . ';border-radius:12px;margin:0 0 24px;">
<tr><td style="padding:16px 18px 6px;">
  <p style="margin:0 0 6px;font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:' . MAIL_INDIGO . ';font-weight:bold;">Votre commande</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' . $lignesRecap . '</table>
</td></tr></table>'
        // Etape 1 : recuperer l'archive
        . '<p class="titre-bloc" style="margin:0 0 6px;font-size:16px;color:' . MAIL_NAVY . ';font-weight:bold;">1. Récupérez votre fichier</p>
<p style="margin:0 0 6px;font-size:14px;line-height:1.6;color:' . MAIL_ENCRE . ';">
  Tout est dans l&#8217;email de confirmation de commande (classeur, guide et bonus), sous forme d&#8217;archive <strong>.zip</strong>.
  Vous pouvez aussi la retrouver à tout moment sur votre <a href="' . $portail . '" style="color:' . MAIL_INDIGO . ';font-weight:bold;">espace acheteur</a>,
  connecté avec <strong>' . $emailE . '</strong>.
</p>'
        // Etape 2 : ouvrir le zip
        . '<p class="titre-bloc" style="margin:18px 0 6px;font-size:16px;color:' . MAIL_NAVY . ';font-weight:bold;">2. Ouvrez l&#8217;archive</p>
<p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:' . MAIL_ENCRE . ';">
  Sur PC, clic droit puis «&#8202;Extraire tout…&#8202;». Sur Mac, double-clic. Sur téléphone, un appui sur le fichier suffit.
  Besoin de voir le geste&nbsp;? Une courte vidéo par système&nbsp;:
</p>
<p style="margin:0 0 6px;font-size:14px;">→ <a href="' . $videoPc . '" style="color:' . MAIL_INDIGO . ';font-weight:bold;">la vidéo pour PC (Windows)</a></p>
<p style="margin:0 0 18px;font-size:14px;">→ <a href="' . $videoMac . '" style="color:' . MAIL_INDIGO . ';font-weight:bold;">la vidéo pour Mac</a></p>'
        // Etape 3 : lien de copie + autorisation
        . '<p class="titre-bloc" style="margin:18px 0 6px;font-size:16px;color:' . MAIL_NAVY . ';font-weight:bold;">3. Créez votre classeur</p>
<p style="margin:0 0 6px;font-size:14px;line-height:1.6;color:' . MAIL_ENCRE . ';">
  Dans le dossier, ouvrez le document <strong>COMMENCEZ_ICI</strong> et cliquez sur le lien de copie en vous connectant avec le compte Google de cette adresse&nbsp;: <strong>' . $emailE . '</strong>.
  Google crée alors votre propre classeur, déjà réglé pour vous.
</p>
' . $blocGroupe . '
<p style="margin:12px 0 0 0;font-size:14px;line-height:1.6;color:' . MAIL_ENCRE . ';">
  Un point pour que le lien fonctionne&nbsp;: il est réservé à votre adresse. Si votre accès n&#8217;était pas encore actif,
  écrivez-nous sur <a href="' . $lienWa . '" style="color:' . MAIL_INDIGO . ';font-weight:bold;">WhatsApp ' . $numeroWa . '</a> — nous l&#8217;activons en quelques minutes, c&#8217;est inclus.
</p>'
        // Remboursement
        . '<p style="margin:20px 0 4px;font-size:14px;line-height:1.6;color:' . MAIL_ENCRE . ';">
  Et si le produit ne vous convient pas, vous avez <strong>30 jours pour être remboursé intégralement</strong>, sans avoir à vous justifier&nbsp;:
  un simple message suffit.
</p>'
        . mailCarteFerme(EMAIL_CONTACT, LIEN_WHATSAPP, NUMERO_WHATSAPP)
        . mailFin();
}

function recapTexte(string $bonjour, array $lignes, string $email): string {
    $texte = "Bonjour " . $bonjour . ",\n\n"
        . "Votre paiement est bien arrivé et votre accès " . NOM_PRODUIT . " est prêt.\n\n"
        . "VOTRE COMMANDE\n";
    foreach ($lignes as $ligne) {
        $texte .= "- " . $ligne[0] . " : " . $ligne[1] . "\n";
    }
    $texte .= "\nRECUPERER VOTRE PRODUIT (10 minutes)\n"
        . "1. Récupérez le fichier : tout est dans l'email de confirmation de commande, sous forme d'archive .zip. Vous pouvez aussi la retrouver sur votre espace acheteur (" . PORTAL_ACHETEUR_URL . "), connecté avec " . $email . ".\n"
        . "2. Ouvrez l'archive : sur PC, clic droit puis « Extraire tout… ». Sur Mac, double-clic. Sur téléphone, un appui sur le fichier suffit.\n"
        . "   Vidéos d'aide : PC " . VIDEO_DEZIPPER_PC . " | Mac " . VIDEO_DEZIPPER_MAC . "\n"
        . "3. Ouvrez le document COMMENCEZ_ICI du dossier et cliquez sur le lien de copie en vous connectant avec le compte Google de votre achat (" . $email . "). Google crée votre propre classeur, déjà réglé.\n";
    if (LIEN_GROUPE_WHATSAPP !== '') {
        $texte .= "Rejoignez aussi le groupe WhatsApp des acheteurs : " . LIEN_GROUPE_WHATSAPP . "\n";
    }
    $texte .= "\nLe lien de copie est réservé à votre adresse. Si votre accès n'était pas encore actif, écrivez-nous sur WhatsApp (" . NUMERO_WHATSAPP . ") : nous l'activons en quelques minutes.\n\n"
        . "Si le produit ne vous convient pas : 30 jours pour être remboursé intégralement, sans justification. Un simple message suffit.\n\n"
        . "Une question ? Répondez à cet email ou écrivez-nous sur WhatsApp : " . LIEN_WHATSAPP . " (" . NUMERO_WHATSAPP . ").";
    return $texte;
}

// Carte blanche a une colonne pour les notifications operateurs.
function operateurCarte(string $titre, string $couleur, array $lignes, string $conclusion): string {
    $rows = '';
    foreach ($lignes as $ligne) {
        $rows .= '<tr><td style="padding:5px 0;font-size:14px;color:' . MAIL_ENCRE . ';line-height:1.5;">' . $ligne . '</td></tr>';
    }
    return mailDebut($titre)
        . '<table role="presentation" class="cadre-mail" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
<tr><td class="case-mail" style="background:#ffffff;border-radius:16px;border:1px solid ' . MAIL_FILET . ';padding:28px 32px;">
  <h1 class="titre-mail" style="margin:0 0 16px;color:' . $couleur . ';font-size:20px;font-weight:bold;">' . htmlspecialchars($titre, ENT_QUOTES, 'UTF-8') . '</h1>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ' . MAIL_FILET . ';border-radius:12px;">
  <tr><td style="padding:12px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' . $rows . '</table></td></tr>
  </table>
  <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:' . MAIL_ENCRE . '">' . $conclusion . '</p>
</td></tr>
</table>
' . mailFin();
}

// --- Notification OPERATEUR : succes (l'acces a bien ete partage). ---
function notifierOperateur(array $donnees, string $reponsePont, bool $recapOk): bool {
    $infos  = infosVente($donnees);
    $sujet  = 'Vente ' . ($infos['saleId'] !== '' ? $infos['saleId'] : $infos['email']) . ' : accès partagé';
    $lignes = [];
    foreach ($infos['lignes'] as $ligne) {
        $lignes[] = '<strong>' . htmlspecialchars((string) $ligne[0], ENT_QUOTES, 'UTF-8') . '</strong>&nbsp;: '
            . htmlspecialchars((string) $ligne[1], ENT_QUOTES, 'UTF-8');
    }
    $lignes[] = '<strong>Email</strong>&nbsp;: ' . htmlspecialchars($infos['email'], ENT_QUOTES, 'UTF-8');
    $lignes[] = '<strong>Pont</strong>&nbsp;: ' . htmlspecialchars($reponsePont, ENT_QUOTES, 'UTF-8');
    $lignes[] = '<strong>Récap client</strong>&nbsp;: ' . ($recapOk ? 'envoyé' : '<strong style="color:#B42318">échec SMTP — à relancer</strong>');
    $conclusion = $recapOk
        ? 'Tout est en ordre : accès partagé et récap envoyé à l&#8217;acheteur. Rien à faire.'
        : 'L&#8217;accès est partagé mais le récap client n&#8217;est pas parti : relancez worker.php.';
    return envoyerSmtp(creerMailer(), EMAIL_OPERATEUR, 'Opérateur', $sujet,
        operateurCarte('Accès lecteur partagé', MAIL_VERT, $lignes, $conclusion),
        "Accès lecteur partagé.\n" . implode("\n", ['Email : ' . $infos['email'], 'Pont : ' . $reponsePont, 'Récap client : ' . ($recapOk ? 'envoyé' : 'ÉCHEC SMTP (à relancer)')]));
}

// --- Notification OPERATEUR : echec definitif (a traiter a la main). ---
function notifierOperateurEchec(array $job, array $resultat): bool {
    $donnees = $job['donnees'] ?? [];
    $infos   = infosVente($donnees);
    // JOURNAL CONSULTABLE : l'acheteur a paye meme si le partage a echoue —
    // sa trace reste dans partages-en-echec.csv quoi qu'il arrive au mail.
    // Un echec deja trace n'ecrit pas une seconde ligne identique.
    echecEnregistrer(
        (string) ($job['id'] ?? ''),
        $infos['saleId'],
        $infos['email'],
        (string) ($resultat['raison'] ?? 'inconnue')
    );
    $sujet   = 'ALERTE vente ' . ($infos['saleId'] !== '' ? $infos['saleId'] : $infos['email']) . ' : accès NON partagé';
    $lignes = [
        '<strong>Email</strong>&nbsp;: ' . htmlspecialchars($infos['email'], ENT_QUOTES, 'UTF-8'),
        '<strong>Raison</strong>&nbsp;: ' . htmlspecialchars((string) ($resultat['raison'] ?? 'inconnue'), ENT_QUOTES, 'UTF-8'),
        '<strong>Référence</strong>&nbsp;: ' . htmlspecialchars($infos['saleId'] !== '' ? $infos['saleId'] : '—', ENT_QUOTES, 'UTF-8'),
    ];
    $conclusion = 'L&#8217;acheteur a payé mais n&#8217;a pas reçu l&#8217;accès au classeur. Ajoutez son email dans clients.php et partagez la feuille à la main.';
    return envoyerSmtp(creerMailer(), EMAIL_OPERATEUR, 'Opérateur', $sujet,
        operateurCarte('Accès lecteur NON partagé', '#B42318', $lignes, $conclusion),
        "Accès lecteur NON partagé.\nEmail : " . $infos['email'] . "\nRaison : " . ($resultat['raison'] ?? 'inconnue') . "\nAction : ajouter cet email dans clients.php et partager la feuille à la main.");
}
