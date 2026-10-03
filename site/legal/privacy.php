<?php

// Mentions légales — mise en forme par commun.php (meme design system
// que la page de vente). Contenu juridique seul ici.

require __DIR__ . '/../commun.php';

tp_debut('Mentions légales TenderPilot', [
    'description' => 'Mentions légales de TenderPilot : éditeur, hébergement, paiement, propriété intellectuelle, données personnelles et droit applicable.',
    'largeur'     => 760,
]);
?>

  <style>
        /* Styles propres aux pages légales. */
        .sur-titre { font-family: ui-monospace, Menlo, monospace; }
        .maj { color: var(--brume); font-size: 0.92rem; margin: 0; }
        h1 { font-weight: 800; font-size: clamp(2rem, 1.4rem + 2.4vw, 2.9rem); line-height: 1.1; margin: 0 0 14px; text-wrap: balance; letter-spacing: -0.02em; color: var(--navy); }
        h2 { font-weight: 700; font-size: 1.28rem; line-height: 1.25; margin: 44px 0 12px; padding-top: 22px; border-top: 1px solid var(--filet); text-wrap: balance; letter-spacing: -0.01em; color: var(--navy); }
        .page-legale p, .page-legale li { color: #374151; }
        .page-legale p { margin: 0 0 12px; max-width: 68ch; }
        .page-legale ul { margin: 0 0 14px; padding-left: 1.25rem; display: grid; gap: 6px; }
        .page-legale strong { color: var(--navy); font-weight: 600; }
        .fiche { display: grid; grid-template-columns: minmax(0, 15rem) minmax(0, 1fr); margin: 16px 0 18px; border: 1px solid var(--filet); border-radius: 16px; overflow: hidden; background: #fff; }
        .fiche dt, .fiche dd { margin: 0; padding: 10px 14px; border-bottom: 1px solid var(--filet); }
        .fiche dt { color: var(--brume); font-size: 0.9rem; background: var(--light-gray); }
        .fiche dd { color: var(--text-dark); font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
        .fiche dt:nth-last-of-type(1), .fiche dd:last-of-type { border-bottom: 0; }
        @media (max-width: 560px) {
            .fiche { grid-template-columns: 1fr; }
            .fiche dt { border-bottom: 0; padding-bottom: 2px; }
            .fiche dd { padding-top: 2px; }
        }
  </style>

  <main class="etroit page-legale">

  <p class="sur-titre">TakaCode · TenderPilot</p>
  <h1>Mentions légales</h1>
  <p class="maj">Mises à jour le 15 septembre 2026.</p>

  <h2 id="editeur">Éditeur et vendeur</h2>
  <p>TenderPilot est édité et vendu par <strong>TakaCode</strong>, la boutique de Solutions Luciole. Solutions Luciole est l'établissement enregistré auprès de l'APIEx (Agence de Promotion des Investissements et des Exportations) qui porte la marque et en est le promoteur.</p>
  <dl class="fiche">
    <dt>Boutique</dt><dd>TakaCode (<a href="https://takacode.store" target="_blank" rel="noopener">takacode.store</a>)</dd>
    <dt>Dénomination de l'établissement</dt><dd>Solutions Luciole</dd>
    <dt>Forme</dt><dd>Établissement</dd>
    <dt>Promoteur</dt><dd>Georgeo AGBAHUNGBA</dd>
    <dt>Adresse</dt><dd>Kouhounou Vedoko, Cotonou, Bénin</dd>
    <dt>N° RCCM</dt><dd>RB/COT/20 A 61483</dd>
    <dt>N° IFU</dt><dd>0202011737100</dd>
    <dt>N° Déclaration d'établissement (DGT)</dt><dd>0056326-COO</dd>
    <dt>N° Carte DGC</dt><dd>0043191-COO</dd>
    <dt>N° AL</dt><dd>0043192-COO</dd>
    <dt>Téléphone et WhatsApp</dt><dd><a href="https://wa.me/2290167659717">+229 01 67 65 97 17</a></dd>
    <dt>Email</dt><dd><a href="mailto:contact@tenderpilot.store">contact@tenderpilot.store</a></dd>
    <dt>Directeur de la publication</dt><dd>Georgeo AGBAHUNGBA</dd>
  </dl>

  <h2 id="hebergement">Hébergement et paiement</h2>
  <p><strong>Hébergement du site</strong> : Namecheap, Inc., 11400 W. Olympic Blvd., Suite 200, Los Angeles, CA 90064, États-Unis, <a href="https://www.namecheap.com" target="_blank" rel="noopener">namecheap.com</a>.</p>
  <p><strong>Paiement</strong> : les commandes sont payées par l'intermédiaire de la boutique <strong>TakaCode</strong>, programme de Solutions Luciole, sur la plateforme <a href="https://takacode.store" target="_blank" rel="noopener">takacode.store</a>. La page de paiement, le traitement des transactions et la page de confirmation post-achat sont fournis par Chariow et ses prestataires de paiement partenaires. Chariow n'est pas partie à la vente : le vendeur est la boutique TakaCode (Solutions Luciole). Les conditions de la vente sont dans les <a href="/terms">conditions générales de vente</a>.</p>
  <p><strong>Livraison</strong> : la commande est livrée sur la boutique <a href="https://takacode.store" target="_blank" rel="noopener">takacode.store</a> — dès la confirmation du paiement, le produit est disponible dans vos Achats et par email de confirmation. En cas de non-livraison constatée, vous êtes remboursé intégralement (voir les conditions générales de vente).</p>

  <h2 id="propriete">Propriété intellectuelle</h2>
  <p>Le nom et le logo TenderPilot, les textes et visuels de ce site, le classeur, son script, les guides et les bonus appartiennent à la boutique TakaCode, programme de Solutions Luciole. Toute reproduction ou diffusion sans autorisation écrite est interdite, sauf l'usage prévu par les conditions générales de vente.</p>
  <p>Les avis relayés par TenderPilot appartiennent à leurs éditeurs, vers lesquels chaque ligne renvoie. Google, Google Sheets, Telegram, WhatsApp et Chariow sont des marques de leurs titulaires respectifs. TenderPilot n'est affilié à aucun d'eux.</p>
  <p id="organismes"><strong>Organismes et logos cités.</strong> Sources publiques officielles. TenderPilot n'est affilié à aucun de ces organismes ; les logos appartiennent à leurs propriétaires. Ils ne sont reproduits que pour désigner les sources dont TenderPilot lit les avis publics. Le détail est dans l'<a href="/disclaimer">avertissement</a>.</p>

  <h2 id="donnees">Données personnelles</h2>
  <p>La boutique TakaCode, programme de Solutions Luciole, traite vos données dans le respect du Livre V de la loi n° 2017-20 du 20 avril 2018 portant code du numérique en République du Bénin.</p>
  <ul>
    <li><strong>Responsable du traitement</strong> : Solutions Luciole, aux coordonnées ci-dessus.</li>
    <li><strong>Collecte</strong> : ce site ne collecte aucune donnée. Les données de commande et de paiement sont collectées par Chariow et ses prestataires de paiement, selon leur propre politique.</li>
    <li><strong>Données consultées</strong> : dans son espace vendeur Chariow, Solutions Luciole voit l'adresse email, le numéro de téléphone et le pays de l'acheteur. S'y ajoutent vos échanges avec nous sur WhatsApp ou par email.</li>
    <li><strong>Finalités</strong> : livrer le produit, vous assister, réaliser la configuration du bonus 1, appliquer la garantie de remboursement, respecter nos obligations comptables.</li>
    <li><strong>Destinataires</strong> : Solutions Luciole uniquement. Vos données ne sont ni vendues ni louées.</li>
    <li><strong>Durée</strong> : la trace de la commande est conservée dix ans. Vos échanges d'assistance le sont trois ans après le dernier contact.</li>
    <li><strong>Prospection</strong> : nous ne vous envoyons d'offre commerciale qu'avec votre accord, et vous pouvez vous y opposer à tout moment, sans frais.</li>
  </ul>
  <p><strong>Votre classeur reste chez vous.</strong> TenderPilot tourne sur votre propre compte Google. Les opportunités collectées, vos réglages et vos alertes restent dans votre Google Drive et partent de vos comptes : le classeur ne transmet aucune de ces données à Solutions Luciole.</p>
  <p><strong>Vos droits</strong> : vous pouvez demander l'accès à vos données, leur rectification, leur suppression, ou vous opposer à leur traitement, en écrivant à l'adresse email ci-dessus. Vous pouvez aussi saisir l'Autorité de Protection des Données Personnelles (APDP), sur <a href="https://apdp.bj" target="_blank" rel="noopener">apdp.bj</a>.</p>

  <h2 id="cookies">Cookies</h2>
  <p>Ce site ne dépose aucun cookie publicitaire ni de mesure d'audience. La page de confirmation de commande utilise un cookie de session technique, supprimé à la fermeture du navigateur, pour afficher vos étapes d'activation. Namecheap, qui héberge le site, peut enregistrer des journaux techniques de connexion, dont l'adresse IP. Les polices de caractères sont chargées depuis Google Fonts, qui reçoit aussi l'adresse IP de votre appareil. La page de paiement Chariow applique sa propre politique.</p>

  <h2 id="droit">Droit applicable</h2>
  <p>Ces mentions sont soumises au droit béninois.</p>

  </main>

<?php tp_fin(); ?>
