<?php

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/../commun.php';

// Le Pulse Chariow (webhook) peut être configuré sur l'URL de cette page
// ("Automations -> Pulses" pointe vers /thank-you) : on le traite ici
// pour que l'email, l'accès au classeur et le script partent quand même.
if (($_SERVER['HTTP_X_CHARIOW_SIGNATURE'] ?? '') !== ''
    || strpos((string) ($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json') === 0) {
    require_once __DIR__ . '/webhook.php';
}

// Filet de sécurité (voir plus bas) : si le webhook a été défaillant,
// l'acheteur peut débloquer son accès avec son n° de commande, vérifié
// en direct sur l'API Chariow.
require_once __DIR__ . '/access.php';
require_once __DIR__ . '/process-order.php';
require_once __DIR__ . '/compteur-places.php';
require_once __DIR__ . '/ventes-tracker.php';
require_once __DIR__ . '/receipt-mail.php';

// Vérifie sur l'API Chariow (GET /v1/sales?search=...) qu'une commande
// existe, est payée (completed/settled) et appartient bien à l'email saisi.
// Retourne un tableau : ['ok' => bool, 'donnees' => ?array (la vente), 'raison' => string].
function verifierCommandeChariow(string $reference, string $email): array {
    if (CHARIOW_API_KEY === '' || $reference === '' || !$email) {
        return ['ok' => false, 'donnees' => null, 'raison' => 'NUMERO_OU_EMAIL_MANQUANT'];
    }
    $url = 'https://api.chariow.com/v1/sales?search=' . rawurlencode($reference);
    $req = curl_init($url);
    curl_setopt_array($req, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . CHARIOW_API_KEY],
    ]);
    $reponse = curl_exec($req);
    $http    = (int) curl_getinfo($req, CURLINFO_RESPONSE_CODE);
    $erreur  = curl_error($req);
    curl_close($req);

    if ($reponse === false || $http < 200 || $http >= 300) {
        return ['ok' => false, 'donnees' => null, 'raison' => 'API_CHARIOW(' . ($erreur ?: ('HTTP ' . $http)) . ')'];
    }
    $resultat = json_decode((string) $reponse, true);
    $ventes   = $resultat['data'] ?? [];
    if (!is_array($ventes)) { $ventes = []; }

    $email = strtolower(trim($email));
    foreach ($ventes as $vente) {
        if (!is_array($vente)) { continue; }
        $client    = $vente['customer'] ?? [];
        $emailVente = strtolower(trim((string) ($client['email'] ?? '')));
        $statut    = (string) ($vente['status'] ?? '');

        // L'API "search" filtre déjà sur la référence : on accepte le
        // premier résultat payé dont l'email correspond strictement au
        // saisie (évite qu'un acheteur débloque l'accès d'un autre email).
        if ($emailVente === $email
            && in_array($statut, ['completed', 'settled'], true)) {
            return ['ok' => true, 'donnees' => $vente, 'raison' => ''];
        }
    }
    return ['ok' => false, 'donnees' => null, 'raison' => 'COMMANDE_INTROUVABLE'];
}

// Débloque l'accès pour une vente vérifiée sur Chariow : autorise l'email,
// partage le classeur, journalise la vente (sans double compte) et envoie
// le récap. Retourne ['ok' => bool, 'raison' => string].
function debloquerAccesParCommande(array $vente, string $email): array {
    $email = strtolower(trim($email));
    if (!preg_match('/^[^@\s]+@[^@\s]+\.[^@\s]+$/', $email)) {
        return ['ok' => false, 'raison' => 'EMAIL_INVALIDE'];
    }

    // Journal et compteur : on réutilise la dédoublonnage de ventes.csv pour
    // ne jamais compter deux fois une commande déjà traitée par le webhook.
    $saleId  = (string) ($vente['reference'] ?? ($vente['id'] ?? ''));
    $produit = $vente['product'] ?? [];
    if (is_array($produit)) { $produit = $produit['name'] ?? NOM_PRODUIT; }
    $montant = $vente['amount'] ?? [];
    if (is_array($montant)) { $montant = $montant['formatted'] ?? ''; }

    if (!venteDejaEnregistree($saleId)) {
        $donneesJournal = [
            'delivery_id' => 'verif_' . $saleId,
            'sale'        => ['id' => $saleId, 'reference' => $saleId, 'amount' => $montant],
            'customer'    => ['email' => $email],
            'product'     => $produit,
        ];
        venteEnregistrer($donneesJournal);
        placesIncrementer();
    }

    // Livraison complète : même brique que le webhook/worker.
    autoriserEmail($email);
    $verif = donnerAccesFeuille($email);
    if ($verif['ok'] !== true) {
        return ['ok' => false, 'raison' => 'ACCES(' . $verif['reponse'] . ')'];
    }

    $donneesRecap = [
        'customer' => ['email' => $email],
        'sale'     => ['id' => $saleId, 'reference' => $saleId, 'amount' => $montant, 'product' => ['name' => $produit]],
    ];
    $recapOk = envoyerRecapAchat($donneesRecap);
    notifierOperateur($donneesRecap, 'VERIF_COMMANDE ' . $saleId, $recapOk);

    return ['ok' => true, 'raison' => ''];
}

// Retour direct de Chariow : redirect_url porte ?sale={sale_id}. On lit la
// vente (GET /v1/sales/{id}) pour ouvrir la page sans attendre le webhook.
// Retourne ['statut' => string, 'email' => string] ; statut vide si illisible.
function lireVenteChariow(string $saleId): array {
    if (CHARIOW_API_KEY === '' || !preg_match('/^[A-Za-z0-9_-]{4,80}$/', $saleId)) {
        return ['statut' => '', 'email' => ''];
    }
    $req = curl_init('https://api.chariow.com/v1/sales/' . rawurlencode($saleId));
    curl_setopt_array($req, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . CHARIOW_API_KEY],
    ]);
    $reponse = curl_exec($req);
    $http    = (int) curl_getinfo($req, CURLINFO_RESPONSE_CODE);
    curl_close($req);
    if ($reponse === false || $http < 200 || $http >= 300) {
        return ['statut' => '', 'email' => ''];
    }
    $vente = json_decode((string) $reponse, true)['data'] ?? [];
    return [
        'statut' => (string) ($vente['status'] ?? ''),
        'email'  => strtolower(trim((string) ($vente['customer']['email'] ?? ''))),
    ];
}

$autorises = require __DIR__ . '/clients.php';
if (!is_array($autorises)) { $autorises = []; }
$fichierAuto = __DIR__ . '/auto-clients.json';
if (is_file($fichierAuto)) {
    $auto = json_decode((string) @file_get_contents($fichierAuto), true);
    if (is_array($auto)) { $autorises = array_merge($autorises, $auto); }
}

session_start();

function emailAutorise($email, array $autorises): bool {
    $email = strtolower(trim($email));
    if ($email === '' || !preg_match('/^[^@\s]+@[^@\s]+\.[^@\s]+$/', $email)) {
        return false;
    }
    foreach ($autorises as $a) {
        if (strtolower(trim((string)$a)) === $email) {
            return true;
        }
    }
    return false;
}

$erreur      = false;
$erreurMsg   = '';
$emailSaisi  = trim($_GET['email'] ?? '');
$refSaisie   = trim($_POST['reference'] ?? ($_GET['reference'] ?? ''));
$connecte    = !empty($_SESSION['tenderpilot_email']);
$enAttente   = false;   // paiement pas encore confirme (mobile money en cours)

// Arrivee depuis Chariow : la vente fait foi, et c'est SON email qu'on
// retient (jamais celui de l'URL, qu'on pourrait trafiquer).
$saleParam = trim($_GET['sale'] ?? '');
if (!$connecte && $_SERVER['REQUEST_METHOD'] === 'GET' && $saleParam !== '' && $saleParam !== '{sale_id}') {
    $vente = lireVenteChariow($saleParam);
    if (in_array($vente['statut'], ['completed', 'settled'], true) && $vente['email'] !== '') {
        session_regenerate_id(true);
        $_SESSION['tenderpilot_email'] = $vente['email'];
        $connecte = true;
    } elseif ($vente['statut'] === 'awaiting_payment') {
        $enAttente = true;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['logout'])) {
        session_unset();
        session_destroy();
        header('Location: ' . strtok($_SERVER['REQUEST_URI'], '?'));
        exit;
    }
    $emailSaisi = trim($_POST['email'] ?? '');
    if (emailAutorise($emailSaisi, $autorises)) {
        session_regenerate_id(true);
        $_SESSION['tenderpilot_email'] = $emailSaisi;
        $connecte = true;
    } elseif ($refSaisie !== '') {
        // Filet de sécurité : le webhook n'a pas autorisé l'email (panne,
        // mauvais secret, retry). On vérifie la commande en direct sur
        // Chariow et on débloque si elle est payée et appartient à l'email.
        $verif = verifierCommandeChariow($refSaisie, $emailSaisi);
        if ($verif['ok'] && $verif['donnees'] !== null) {
            $res = debloquerAccesParCommande($verif['donnees'], $emailSaisi);
            if ($res['ok']) {
                session_regenerate_id(true);
                $_SESSION['tenderpilot_email'] = $emailSaisi;
                $connecte = true;
            } else {
                $erreur  = true;
                $erreurMsg = 'Votre commande est bien payée mais votre accès n\'a pas pu être activé (' . $res['raison'] . ').';
            }
        } else {
            $erreur  = true;
            $erreurMsg = 'Numéro de commande et/ou email non reconnus comme achetés sur Chariow.';
        }
    } else {
        $erreur = true;
    }
}

$email = $connecte ? $_SESSION['tenderpilot_email'] : '';

function e($s): string { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

// Identifiant d'une video YouTube (watch?v=, youtu.be/, embed/) ; '' sinon.
function idYoutube(string $url): string {
    return preg_match('~(?:v=|youtu\.be/|embed/)([A-Za-z0-9_-]{11})~', $url, $m) ? $m[1] : '';
}

const WA_ICONE = '<svg viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm5.7 14.1c-.24.68-1.4 1.3-1.95 1.34-.52.04-1.18.19-3.98-.83-3.37-1.3-5.5-4.67-5.66-4.88-.17-.21-1.36-1.8-1.36-3.44 0-1.64.86-2.44 1.16-2.78.31-.33.67-.42.9-.42l.64.01c.21.01.48-.08.75.57l1.02 2.44c.08.18.14.4.02.63-.1.24-.22.35-.41.56l-.3.34c-.13.13-.25.25-.11.49.14.24.63 1.04 1.36 1.68.93.83 1.72 1.09 1.97 1.21.23.12.37.1.51-.06l.74-.86c.16-.19.32-.15.53-.09l2.06.97c.25.12.41.18.47.28.06.11.06.63-.18 1.31Z"/></svg>';

?>
<?php tp_debut('Merci pour votre commande — ' . NOM_PRODUIT, ['noindex' => true, 'largeur' => 820]); ?>

  <style>
        /* Styles propres a la page de remerciement. */
        .etroit { padding-block: clamp(20px, 3vw, 40px) clamp(48px, 7vw, 72px); }
        /* La grille du formulaire (login + deblocage) passe a une colonne
           des 560px, comme les champs prenom/nom du checkout. */
        @media (max-width: 560px) { .carte { padding: 20px; } }
        .etapes { display: grid; gap: 16px; margin: 28px 0; list-style: none; padding: 0; }
        .etape {
            display: flex; gap: 16px; align-items: flex-start;
            background: #fff; border: 1px solid var(--filet); border-radius: 12px; padding: 22px 24px;
        }
        .numero {
            flex: none; width: 36px; height: 36px; border-radius: 12px;
            font-family: ui-monospace, "SFMono-Regular", Menlo, monospace; font-weight: 600; font-size: 0.9rem;
            display: flex; align-items: center; justify-content: center;
            background: var(--primary); color: #fff;
            box-shadow: 0 8px 20px -8px rgba(79, 70, 255, 0.55);
        }
        .etape h3 { margin: 0 0 6px; font-size: 1.08rem; color: var(--navy); }
        .etape p { margin: 0; color: var(--brume); font-size: 0.98rem; }
        .etape a { color: var(--primary); font-weight: 600; text-decoration: none; }
        .etape a:hover { text-decoration: underline; }
        .etape a.bouton { color: #fff; text-decoration: none; }
        .etape a.bouton.secondaire { color: var(--text-dark); }
        .video { position: relative; overflow: hidden; border-radius: 12px; border: 1px solid var(--filet-fort); background: #000; margin-top: 10px; aspect-ratio: 16/9; }
        .video iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
        .code-inline { display:inline-block; min-width:0; padding: 2px 8px; }
        .merci { text-align: center; }
        .merci .pastille-gros {
            width: 64px; height: 64px; margin: 0 auto 18px; border-radius: 18px;
            background: var(--primary); display: flex; align-items: center; justify-content: center; flex: none;
            box-shadow: 0 18px 44px -12px rgba(79, 70, 255, 0.55);
        }
        .merci .pastille-gros svg { width: 32px; height: 32px; }
        .merci .chapeau { margin-inline: auto; text-align: center; }
        .bleu { color: var(--primary); }
        .etroit .champ { margin: 0 0 18px; }
        .champ-marge { margin: 8px 0 18px; }
        .note-fine { color: var(--brume); font-size: 0.9rem; margin: 0 0 8px; }
        .systemes { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 8px; }
        @media (max-width: 640px) { .systemes { grid-template-columns: 1fr; gap: 24px; } }
        .etape > div { min-width: 0; }
  </style>

  <main class="etroit">

<?php if (!$connecte): ?>

  <div class="carte">
    <h1 class="affiche">Bienvenue, vérifions votre accès</h1>
    <p class="chapeau">Entrez l'adresse email que vous avez utilisée pour commander. Votre accès se débloque dès que celle-ci est autorisée.</p>

    <?php if ($enAttente): ?>
      <div class="encadre">
        <strong>Votre paiement est en cours de confirmation.</strong> Avec le mobile money, validez l'opération sur votre téléphone,
        puis <a href="" style="color:var(--primary);font-weight:600">actualisez cette page</a> dans une minute.
      </div>
    <?php endif; ?>

    <?php if ($erreur): ?>
      <div class="erreur">
        <strong>Accès non activé.</strong> Le paiement est peut-être en cours, ou votre email n'est pas encore autorisé.<br>
        <?php if ($erreurMsg !== ''): ?>
          <?= e($erreurMsg) ?><br>
        <?php endif; ?>
        Pour activer votre accès : envoyez sur WhatsApp un message avec l'email utilisé pour l'achat →
        <a href="<?= e(LIEN_WHATSAPP) ?>?text=Bonjour%2C%20je%20viens%20d%27acheter%20<?= e(NOM_PRODUIT) ?>%2C%20voici%20mon%20email%20de%20commande%20%3A%20<?= e(rawurlencode($emailSaisi)) ?>" style="color:var(--primary)">Nous écrire sur WhatsApp</a>, nous activons votre accès sous quelques minutes.
      </div>
    <?php endif; ?>

    <form method="post" action="">
      <label for="email">Email utilisé pour la commande</label>
      <input class="champ" type="email" id="email" name="email" required
             placeholder="vous@exemple.com" value="<?= e($emailSaisi) ?>" autocomplete="email">

      <label for="reference">Numéro de commande <span style="color:var(--brume);font-weight:500">(facultatif, accélère le déblocage)</span></label>
      <input class="champ" type="text" id="reference" name="reference"
             placeholder="Ex. SALE5JKVQ1IKEJ7MCKB" value="<?= e($refSaisie) ?>" autocomplete="off">
      <p class="note-fine">Retrouvez-le sur Chariow : «&#8202;Vos achats&#8202;» ou dans l'email de commande.</p>

      <button class="bouton" type="submit">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
        Accéder à la page de remerciement
      </button>
    </form>

    <div class="encadre">
      <strong>Pas encore autorisé ?</strong> C'est normal : votre accès est activé à la réception de votre paiement.
      Contactez-nous sur WhatsApp au <a href="<?= e(LIEN_WHATSAPP) ?>"><?= e(NUMERO_WHATSAPP) ?></a>
      en envoyant l'email de votre commande, et nous débloquons tout de suite.
    </div>
  </div>

<?php else: ?>

  <div class="carte">
    <div class="merci">
      <div class="pastille-gros" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
      </div>
      <h1 class="affiche">Merci, votre paiement est confirmé</h1>
      <p class="chapeau">Bienvenue chez <strong class="bleu"><?= e(NOM_PRODUIT) ?></strong>. Encore quelques étapes, dix minutes en tout, et votre veille tourne toute seule.</p>
    </div>

<?php
    $wa = WA_ICONE;
    $msgActivation = 'Bonjour, je viens d\'acheter ' . NOM_PRODUIT . '. Mon email de commande : ' . $email . '. Merci d\'activer mon accès.';
    $lienActivation = LIEN_WHATSAPP . '?text=' . rawurlencode($msgActivation);
    $idPc  = idYoutube(VIDEO_DEZIPPER_PC);
    $idMac = idYoutube(VIDEO_DEZIPPER_MAC);
?>
    <ol class="etapes">

      <li class="etape">
        <div class="numero">1</div>
        <div>
          <h3>Envoyez-nous votre email sur WhatsApp</h3>
          <p>
            Votre classeur TenderPilot s'ouvre par un <strong style="color:var(--text-dark)">lien de copie protégé</strong> :
            il ne fonctionne que pour l'adresse que nous avons autorisée. Un lien transmis à quelqu'un d'autre n'ouvre rien.
            Envoyez-nous l'email utilisé pour l'achat, nous l'autorisons tout de suite :
          </p>
          <p style="margin-top:10px"><span class="code" style="display:inline-block;min-width:0"><?= e($email) ?></span></p>
          <p style="margin-top:12px"><a class="bouton whatsapp" href="<?= e($lienActivation) ?>" target="_blank" rel="noopener"><?= $wa ?> Activer mon accès sur WhatsApp</a></p>
          <p class="note-fine" style="margin-top:8px">Le message est déjà rédigé, il suffit de l'envoyer. Utilisez ensuite le compte Google de cette adresse.</p>
        </div>
      </li>

      <?php if (LIEN_GROUPE_WHATSAPP): ?>
      <li class="etape">
        <div class="numero">2</div>
        <div>
          <h3>Rejoignez le groupe WhatsApp des acheteurs</h3>
          <p>
            C'est là que nous annonçons les nouvelles sources et les mises à jour, et que vous posez vos questions d'installation.
          </p>
          <p style="margin-top:12px"><a class="bouton whatsapp" href="<?= e(LIEN_GROUPE_WHATSAPP) ?>" target="_blank" rel="noopener"><?= $wa ?> Rejoindre le groupe</a></p>
        </div>
      </li>
      <?php endif; ?>

      <li class="etape">
        <div class="numero"><?= LIEN_GROUPE_WHATSAPP ? 3 : 2 ?></div>
        <div>
          <h3>Téléchargez votre fichier</h3>
          <p>
            Chariow vous a envoyé un email de confirmation : votre produit est dans <strong style="color:var(--text-dark)">vos achats</strong>,
            sous la forme d'un fichier <span class="code code-inline">.zip</span>.
          </p>
          <p style="margin-top:12px"><a class="bouton secondaire" href="<?= e(LIEN_PORTAL_CHARIOW) ?>" target="_blank" rel="noopener">Ouvrir mes achats Chariow</a></p>
        </div>
      </li>

      <li class="etape">
        <div class="numero"><?= LIEN_GROUPE_WHATSAPP ? 4 : 3 ?></div>
        <div style="min-width:0;flex:1">
          <h3>Dézippez le fichier</h3>
          <div class="systemes">
            <div>
              <p><strong style="color:var(--text-dark)">Sur Windows :</strong> clic droit sur le fichier <span class="code code-inline">.zip</span>, puis «&nbsp;Extraire tout…&nbsp;», puis «&nbsp;Extraire&nbsp;».</p>
              <?php if ($idPc): ?>
              <div class="video"><iframe src="https://www.youtube-nocookie.com/embed/<?= e($idPc) ?>" title="Dézipper un fichier sur Windows" loading="lazy" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe></div>
              <?php endif; ?>
            </div>
            <div>
              <p><strong style="color:var(--text-dark)">Sur Mac :</strong> double-clic sur le fichier <span class="code code-inline">.zip</span>, le dossier apparaît juste à côté.</p>
              <?php if ($idMac): ?>
              <div class="video"><iframe src="https://www.youtube-nocookie.com/embed/<?= e($idMac) ?>" title="Dézipper un fichier sur Mac" loading="lazy" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe></div>
              <?php endif; ?>
            </div>
          </div>
          <p class="note-fine" style="margin-top:12px">Sur téléphone, passez par l'application Fichiers (Android ou iPhone) : un appui sur le .zip l'ouvre.</p>
        </div>
      </li>

      <li class="etape">
        <div class="numero"><?= LIEN_GROUPE_WHATSAPP ? 5 : 4 ?></div>
        <div>
          <h3>Ouvrez COMMENCEZ_ICI et créez votre classeur</h3>
          <p>
            Dans le dossier, ouvrez <span class="code code-inline">COMMENCEZ_ICI</span> et cliquez sur le lien de copie,
            connecté avec le compte Google autorisé à l'étape 1. Google crée votre propre classeur, script compris.
            Les guides PDF et les vidéos vous accompagnent ensuite pas à pas.
          </p>
        </div>
      </li>

    </ol>
    <div class="centre" style="margin-top:28px">
      <a class="bouton secondaire" href="<?= e(LIEN_WHATSAPP) ?>" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm5.7 14.1c-.24.68-1.4 1.3-1.95 1.34-.52.04-1.18.19-3.98-.83-3.37-1.3-5.5-4.67-5.66-4.88-.17-.21-1.36-1.8-1.36-3.44 0-1.64.86-2.44 1.16-2.78.31-.33.67-.42.9-.42l.64.01c.21.01.48-.08.75.57l1.02 2.44c.08.18.14.4.02.63-.1.24-.22.35-.41.56l-.3.34c-.13.13-.25.25-.11.49.14.24.63 1.04 1.36 1.68.93.83 1.72 1.09 1.97 1.21.23.12.37.1.51-.06l.74-.86c.16-.19.32-.15.53-.09l2.06.97c.25.12.41.18.47.28.06.11.06.63-.18 1.31Z"/></svg>
        Une question ? Écrivez-nous sur WhatsApp
      </a>
    </div>

    <div style="margin-top:20px;text-align:center;border-top:1px solid var(--filet);padding-top:16px;color:var(--brume);font-size:0.9rem">
      Connecté avec <strong style="color:var(--text-dark)"><?= e($email) ?></strong>
      <form method="post" action="" style="display:inline" onsubmit="return confirm('Se déconnecter de cette page ?')">
        <input type="hidden" name="logout" value="1">
        <button class="mini" type="submit" style="margin-left:8px">Se déconnecter</button>
      </form>
    </div>
  </div>

<?php endif; ?>

  </main>

<?php tp_fin(<<<'JS'
function copier(id, bouton) {
  var champ = document.getElementById(id);
  var ok = false;
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(champ.value).then(function(){ ok = true; majBouton(bouton); });
  } else {
    champ.focus(); champ.select();
    try { ok = document.execCommand('copy'); } catch(e) {}
    if (ok) majBouton(bouton);
  }
  function majBouton(b) {
    var t = b.textContent; b.textContent = 'Copié ✓';
    setTimeout(function(){ b.textContent = t; }, 2000);
  }
}
JS); ?>