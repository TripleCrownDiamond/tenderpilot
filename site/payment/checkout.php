<?php

// =============================================================
//  checkout.php : point d'entree de l'achat.
//  - recoit le client (venu du bouton "Obtenir TenderPilot")
//  - appelle l'API Chariow cote serveur (cle jamais exposee)
//  - redirige vers https://payment.chariow.com/... (paiement)
//   Apres paiement, Chariow renvoie le client vers URL_REDIRECTION
//  (la page de remerciement), avec son email en parametre.
//
//  Le bouton d'achat de la page de vente doit pointer ici :
//      https://tenderpilot.store/checkout
// =============================================================

require __DIR__ . '/config.php';
require __DIR__ . '/../commun.php';

$erreurs = [];
$email   = trim($_POST['email']   ?? ($_GET['email']   ?? ''));
$prenom  = trim($_POST['prenom']  ?? ($_GET['prenom']  ?? ''));
$nom     = trim($_POST['nom']     ?? ($_GET['nom']     ?? ''));
$tel     = trim($_POST['telephone'] ?? ($_GET['telephone'] ?? ''));
$pays    = strtoupper(trim($_POST['pays'] ?? ($_GET['pays'] ?? 'BJ')));
$codePromo = trim($_POST['code_promo'] ?? ($_GET['code_promo'] ?? ''));

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    if (!CHARIOW_API_KEY) {
        $erreurs[] = 'Configuration incomplete : cle API Chariow manquante (fichier .env).';
    }
    if (!preg_match('/^[^@\s]+@[^@\s]+\.[^@\s]+$/', $email)) {
        $erreurs[] = 'Adresse email invalide.';
    }
    if ($prenom === '' || $nom === '') {
        $erreurs[] = 'Prenom et nom sont obligatoires.';
    }
    $telChiffres = preg_replace('/\D/', '', $tel);
    if (strlen($telChiffres) < 6) {
        $erreurs[] = 'Numero de telephone invalide.';
    }
    if ($codePromo !== '' && mb_strlen($codePromo) > 100) {
        $erreurs[] = 'Code promo invalide.';
    }

    if (!$erreurs) {
        $urlSuite = URL_REDIRECTION
            ? URL_REDIRECTION . (strpos(URL_REDIRECTION, '?') !== false ? '&' : '?') . 'email=' . rawurlencode($email)
              // {sale_id} est remplace par Chariow : la page de remerciement
              // verifie la vente en direct, sans attendre le webhook.
              . '&sale={sale_id}'
            : '';

        // L'IP reelle de l'acheteur fait choisir a Chariow les moyens de
        // paiement disponibles pour son pays (carte, mobile money, etc.).
        $ipBrut = $_SERVER['HTTP_CF_CONNECTING_IP']
            ?? $_SERVER['HTTP_X_FORWARDED_FOR']
            ?? $_SERVER['REMOTE_ADDR']
            ?? '';
        $ip = trim(explode(',', (string) $ipBrut)[0]);

        $corps = [
            'product_id'    => PRODUIT_ID,
            'email'         => $email,
            'first_name'    => $prenom,
            'last_name'     => $nom,
            'phone'         => ['number' => $telChiffres, 'country_code' => $pays],
            'redirect_url'  => $urlSuite,
        ];
        if (filter_var($ip, FILTER_VALIDATE_IP)) {
            $corps['customer_ip'] = $ip;
        }
        if ($codePromo !== '') {
            // Chariow applique la remise et renvoie le montant reduit.
            $corps['discount_code'] = $codePromo;
        }

        $ch = curl_init('https://api.chariow.com/v1/checkout');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($corps, JSON_UNESCAPED_SLASHES));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . CHARIOW_API_KEY,
            'Content-Type: application/json',
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        $reponse = curl_exec($ch);
        $http    = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $err     = curl_error($ch);
        curl_close($ch);

        $donnees = json_decode((string) $reponse, true);
        $step    = $donnees['data']['step'] ?? null;

        // Trace minimale (ni cle ni coordonnees) : dit si Chariow a accepte
        // la redirection. Bloque en web par .htaccess.
        @file_put_contents(__DIR__ . '/checkout.log', sprintf(
            "%s http=%d step=%s redirect=%s err=%s\n",
            date('c'), $http, (string) $step, $urlSuite !== '' ? 'oui' : 'NON',
            $err ?: (string) ($donnees['message'] ?? '')
        ), FILE_APPEND | LOCK_EX);

        if ($err || $http < 200 || $http >= 300) {
            $message = $donnees['message'] ?? 'Echec de la connexion au paiement (' . ($err ?: 'HTTP ' . $http) . ').';
            $erreurs[] = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');
        } else {
            switch ($step) {
                case 'payment':
                    $url = $donnees['data']['payment']['checkout_url'] ?? '';
                    if ($url) {
                        header('Location: ' . $url);
                        exit;
                    }
                    $erreurs[] = 'Reponse de paiement inattendue.';
                    break;
                case 'completed':
                case 'already_purchased':
                    // Produit libre deja livre, ou deja possede : direction remerciement
                    header('Location: ' . ($urlSuite ?: LIEN_PORTAL_CHARIOW));
                    exit;
                default:
                    $erreurs[] = 'Statut de paiement inattendu : ' . htmlspecialchars((string) $step, ENT_QUOTES, 'UTF-8');
            }
        }
    }
}

$paysListe = [
    'BJ' => 'Bénin', 'TG' => 'Togo', 'NE' => 'Niger', 'BF' => 'Burkina Faso',
    'CI' => 'Côte d\'Ivoire', 'SN' => 'Sénégal', 'ML' => 'Mali', 'CM' => 'Cameroun',
    'GN' => 'Guinée', 'GA' => 'Gabon', 'CD' => 'RD Congo', 'CG' => 'Congo', 'FR' => 'France',
];

?>
<?php tp_debut('Commander — ' . NOM_PRODUIT, ['description' => 'Finalisez votre commande ' . NOM_PRODUIT . '. Payé une fois, sans abonnement.']); ?>

  <style>
        /* Styles propres a la page de commande. */
        .deux { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 600px) { .deux { grid-template-columns: 1fr; } }
        .bouton-large { width: 100%; font-weight: 650; font-size: 1.02rem; padding: 15px 26px; margin-top: 22px; }
        .securise { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 18px; color: var(--brume); font-size: 0.85rem; }
        .securise svg { width: 14px; height: 14px; }
        .moyens-titre { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--primary); margin: 14px 0 10px; }
        .moyens { display: flex; flex-wrap: wrap; gap: 8px; }
        .moyens .chip {
            font-size: 0.78rem; line-height: 1.4; font-weight: 500;
            color: var(--text-dark); border: 1px solid var(--filet);
            background: var(--light-gray);
            padding: 5px 11px; border-radius: 999px; white-space: nowrap;
        }
        .moyens .chip.na { color: var(--brume); }
        .note-moyens { color: var(--brume); font-size: 0.85rem; margin: 10px 0 0; }
  </style>

  <main class="etroit">
    <p class="sur-titre">Commande sécurisée · Chariow</p>
    <h1 class="affiche">Finaliser la commande</h1>
    <p class="chapeau">Renseignez vos coordonnées : vous serez redirigé vers le paiement sécurisé Chariow. C'est payé une fois, sans abonnement.</p>

    <div class="carte">
      <?php foreach ($erreurs as $erreur): ?>
        <div class="erreur"><?= $erreur ?></div>
      <?php endforeach; ?>

      <?php if ($_SERVER['REQUEST_METHOD'] === 'POST' && $erreurs): ?>
        <p class="erreur-chapeau">Corrigez les champs puis validez à nouveau.</p>
      <?php endif; ?>

      <form method="post" action="">
        <label>Pays</label>
        <select class="champ" name="pays" id="pays">
          <?php foreach ($paysListe as $code => $libelle): ?>
            <option value="<?= $code ?>" <?= $pays === $code ? 'selected' : '' ?>><?= e($libelle) ?></option>
          <?php endforeach; ?>
        </select>
        <p class="moyens-titre">Moyens de paiement disponibles</p>
        <div class="moyens" id="moyens-paiement"></div>
        <p class="note-moyens">Indicatif — la liste exacte est présentée par Chariow au moment du paiement.</p>

        <label>Email (celui de votre commande)</label>
        <input class="champ" type="email" name="email" required value="<?= e($email) ?>" placeholder="vous@exemple.com" autocomplete="email">

        <div class="deux">
          <div>
            <label>Prénom</label>
            <input class="champ" type="text" name="prenom" required value="<?= e($prenom) ?>" autocomplete="given-name">
          </div>
          <div>
            <label>Nom</label>
            <input class="champ" type="text" name="nom" required value="<?= e($nom) ?>" autocomplete="family-name">
          </div>
        </div>

        <label>Téléphone</label>
        <input class="champ" type="tel" name="telephone" required value="<?= e($tel) ?>" placeholder="01 67 00 00 00" autocomplete="tel" inputmode="tel">

        <label>Code promo <span style="color:var(--brume);font-weight:500">(optionnel)</span></label>
        <input class="champ" type="text" name="code_promo" value="<?= e($codePromo) ?>" placeholder="Ex. BIENVENUE15" autocomplete="off" maxlength="100">

        <button class="bouton bouton-large" type="submit">Payer maintenant</button>
      </form>

      <div class="securise">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
        Paiement chiffré et sécurisé
      </div>
    </div>
  </main>

<?php tp_fin(<<<'JS'
  var MOYENS = {
    'BJ': ['MTN MoMo', 'Moov Money', 'Celtiis Cash', 'Coris Money', 'Carte bancaire'],
    'TG': ['Mixx by Yas', 'Moov Money', 'Carte bancaire'],
    'NE': ['Airtel Money', 'Moov Money', 'Amanata', 'Zamani Cash', 'MyNita', 'LigdiCash', 'Carte bancaire'],
    'BF': ['Orange Money', 'Moov Money', 'Telecel Money', 'Wave', 'Coris Money', 'LigdiCash', 'SankMoney', 'Carte bancaire'],
    'CI': ['Orange Money', 'MTN MoMo', 'Moov Money', 'Wave', 'Djamo', 'Carte bancaire'],
    'SN': ['Orange Money', 'Wave', 'Free Money', 'E-Money', 'Djamo', 'Carte bancaire'],
    'ML': ['Orange Money', 'Moov Money', 'Carte bancaire'],
    'CM': ['MTN MoMo', 'Orange Money', 'EU Mobile Money', 'Carte bancaire']
  };
  var MOYENS_DEFAUT = ['Carte bancaire', 'Mobile money'];

  function majMoyens() {
    var pays = document.getElementById('pays').value;
    var liste = MOYENS[pays] || MOYENS_DEFAUT;
    document.getElementById('moyens-paiement').innerHTML = liste
      .map(function (m) { return '<span class="chip">' + m + '</span>'; })
      .join('');
  }
  document.getElementById('pays').addEventListener('change', majMoyens);
  majMoyens();
JS); ?>
