<?php

// Conditions générales de vente — mise en forme par commun.php
// (meme design system que la page de vente). Contenu juridique seul ici.

require __DIR__ . '/../commun.php';

tp_debut('Conditions générales de vente TenderPilot', [
    'description' => 'Conditions générales de vente de TenderPilot : prix, commande, paiement, livraison, garantie satisfait ou remboursé 30 jours et droit de rétractation.',
    'largeur'     => 760,
]);
?>

  <style>
        /* Styles propres aux pages légales. */
        .sur-titre { font-family: ui-monospace, Menlo, monospace; }
        .maj { color: var(--brume); font-size: 0.92rem; margin: 0; }
        h1 { font-weight: 800; font-size: clamp(2rem, 1.4rem + 2.4vw, 2.9rem); line-height: 1.1; margin: 0 0 14px; text-wrap: balance; letter-spacing: -0.02em; color: var(--navy); }
        h2 { font-weight: 700; font-size: 1.28rem; line-height: 1.25; margin: 44px 0 12px; padding-top: 22px; border-top: 1px solid var(--filet); text-wrap: balance; letter-spacing: -0.01em; color: var(--navy); }
        h3 { font-size: 1.02rem; margin: 22px 0 6px; color: var(--navy); }
        .page-legale p, .page-legale li { color: #374151; }
        .page-legale p { margin: 0 0 12px; max-width: 68ch; }
        .page-legale ul, .page-legale ol { margin: 0 0 14px; padding-left: 1.25rem; display: grid; gap: 6px; }
        .page-legale strong { color: var(--navy); font-weight: 600; }
        .sommaire { margin: 28px 0 0; padding: 18px 20px; border: 1px solid var(--filet); border-radius: 16px; background: #fff; }
        .sommaire p { margin: 0 0 8px; font-family: ui-monospace, Menlo, monospace; font-size: 0.74rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--brume); }
        .sommaire ol { columns: 2 16rem; display: block; margin: 0; }
        .sommaire li { margin: 0 0 4px; break-inside: avoid; }
        .a-completer { background: rgba(255, 211, 138, 0.12); color: #A0721F; border: 1px dashed rgba(255, 211, 138, 0.55); border-radius: 6px; padding: 0 6px; font-family: ui-monospace, Menlo, monospace; font-size: 0.84em; white-space: normal; }
        .chiffres { font-variant-numeric: tabular-nums; }
        @media (max-width: 560px) { .sommaire ol { columns: 1; } }
        @media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; } }
  </style>

  <main class="etroit page-legale">

  <p class="sur-titre">TakaCode · TenderPilot</p>
  <h1>Conditions générales de vente</h1>
  <p class="maj">Version du 15 septembre 2026. Consultables, imprimables et enregistrables depuis cette page.</p>

  <nav class="sommaire" aria-label="Sommaire">
    <p>Sommaire</p>
    <ol>
      <li><a href="#objet">Objet</a></li>
      <li><a href="#vendeur">Le vendeur</a></li>
      <li><a href="#produit">Le produit</a></li>
      <li><a href="#prix">Prix</a></li>
      <li><a href="#commande">Commander, étape par étape</a></li>
      <li><a href="#paiement">Paiement</a></li>
      <li><a href="#livraison">Livraison</a></li>
      <li><a href="#licence">Droit d'utilisation</a></li>
      <li><a href="#garantie">Satisfait ou remboursé 30 jours</a></li>
      <li><a href="#retractation">Droit de rétractation légal</a></li>
      <li><a href="#garanties-legales">Garanties légales</a></li>
      <li><a href="#responsabilite">Responsabilité</a></li>
      <li><a href="#reclamations">Réclamations et litiges</a></li>
      <li><a href="#donnees">Données personnelles</a></li>
      <li><a href="#archivage">Archivage</a></li>
    </ol>
  </nav>

  <h2 id="objet">1. Objet</h2>
  <p>Ces conditions régissent la vente en ligne de <strong>TenderPilot</strong>, veille automatique d'appels d'offres dans Google Sheets, par la boutique <strong>TakaCode</strong> à toute personne, particulier ou professionnel, qui l'achète depuis la page de vente TenderPilot. TakaCode est un programme de Solutions Luciole.</p>
  <p>Valider le paiement vaut acceptation de ces conditions. Le contrat est conclu en français. Les conditions applicables sont celles en ligne au jour de la commande.</p>

  <h2 id="vendeur">2. Le vendeur</h2>
  <p>Les produits sont vendus par la boutique <strong>TakaCode</strong>, programme de <strong>Solutions Luciole</strong>, établissement enregistré auprès de l'APIEx (Agence de Promotion des Investissements et des Exportations), RCCM RB/COT/20 A 61483, IFU 0202011737100.</p>
  <p>Adresse : Kouhounou Vedoko, Cotonou, Bénin. Téléphone et WhatsApp : <a href="https://wa.me/2290167659717">+229 01 67 65 97 17</a>. Email : <a href="mailto:contact@tenderpilot.store">contact@tenderpilot.store</a>.</p>
  <p>Toutes les informations légales sont dans les <a href="/privacy">mentions légales</a>.</p>

  <h2 id="produit">3. Le produit</h2>
  <h3>Ce que vous achetez</h3>
  <ul>
    <li><strong>Le classeur TenderPilot</strong> : un lien qui crée votre propre copie d'un classeur Google Sheets et de son script. Une fois l'exécution automatique activée, il collecte les avis de marchés, les subventions et les plans de passation de sources publiques, trois fois par jour. Il calcule les jours restants, colore les lignes selon l'urgence et vous alerte par email, sur Telegram ou dans Google Agenda.</li>
    <li><strong>Le guide de démarrage</strong>, en PDF.</li>
    <li><strong>Cinq bonus</strong> : la configuration faite avec vous (vingt minutes sur WhatsApp, réservée aux 50 premiers acheteurs), les profils métier, la checklist du dossier de soumission, les modèles de lettres en PDF et en Word, l'accès au groupe WhatsApp des acheteurs.</li>
  </ul>
  <h3>Ce qu'il vous faut</h3>
  <ul>
    <li>Un compte Google, gratuit.</li>
    <li>Un ordinateur avec un navigateur récent pour l'installation, une seule fois. Ensuite, un téléphone suffit pour lire les alertes.</li>
    <li>Une connexion internet.</li>
    <li>Pour Telegram, un compte Telegram. Pour le classement intelligent, facultatif, votre propre clé chez un fournisseur de modèle de langage : son coût est facturé par ce fournisseur, pas par TakaCode.</li>
  </ul>
  <h3>Ce qu'il faut savoir avant d'acheter</h3>
  <ul>
    <li><strong>TenderPilot relaie des avis publiés par d'autres.</strong> Il n'en garantit ni l'exhaustivité ni l'exactitude. Avant de déposer une offre, vérifiez toujours la date limite et les conditions sur l'avis officiel, auquel chaque ligne renvoie.</li>
    <li><strong>La couverture varie selon le pays.</strong> Elle est détaillée pays par pays sur la page de vente, avant l'achat.</li>
    <li><strong>Une source peut changer ou fermer.</strong> TakaCode répare les sources qu'elle peut réparer et l'annonce dans le groupe WhatsApp. Le reste du classeur continue de fonctionner.</li>
    <li><strong>Les limites de Google s'appliquent</strong>, notamment le nombre d'emails qu'un compte peut envoyer par jour.</li>
    <li>La checklist et les modèles de lettres sont des aide-mémoire. Ils ne remplacent ni le dossier d'appel d'offres, qui fait foi, ni un conseil juridique.</li>
  </ul>

  <h2 id="prix">4. Prix</h2>
  <p class="chiffres">Les prix sont indiqués en francs CFA (FCFA), toutes taxes comprises. Il n'y a aucun frais de livraison : le produit est livré en ligne.</p>
  <ul class="chiffres">
    <li><strong>Prix de lancement : 20 000 FCFA</strong>, pour les 50 premiers acheteurs.</li>
    <li><strong>Prix ensuite : 30 000 FCFA</strong> (une fois les 50 premières places écoulées).</li>
  </ul>
  <p>Le prix est payé une seule fois : il n'y a pas d'abonnement. Le prix appliqué est celui affiché au moment de la commande. Les frais éventuellement prélevés par votre opérateur de mobile money ou votre banque ne sont pas perçus par TakaCode.</p>

  <h2 id="commande">5. Commander, étape par étape</h2>
  <ol>
    <li>Sur la page de vente, cliquez sur un bouton d'achat. Vous arrivez sur la page de paiement Chariow.</li>
    <li>Vérifiez le récapitulatif : le produit et le prix. Renseignez votre nom, votre adresse email et votre numéro de téléphone, et corrigez-les si besoin.</li>
    <li>Choisissez votre moyen de paiement : mobile money selon votre pays, ou carte bancaire.</li>
    <li>Validez le paiement. C'est ce geste qui conclut la commande. Tant que vous n'avez pas validé, vous pouvez tout abandonner sans rien payer.</li>
    <li>Vous recevez une confirmation et un justificatif de paiement récapitulant la commande, sa date et son heure.</li>
  </ol>

  <h2 id="paiement">6. Paiement</h2>
  <p>Le paiement est encaissé en ligne via Chariow, par des prestataires de paiement partenaires. TakaCode ne reçoit ni ne conserve vos coordonnées bancaires ou de mobile money. Le paiement est exigible en une fois, à la commande.</p>

  <h2 id="livraison">7. Livraison</h2>
  <p>La commande est livrée sur la boutique Chariow <strong>TakaCode</strong> (<a href="https://takacode.store" target="_blank" rel="noopener">takacode.store</a>) : dès la confirmation du paiement, le produit y est disponible dans vos <strong>Achats</strong>.</p>
  <ul>
    <li><strong>Dès la confirmation du paiement</strong>, vous accédez à votre commande sur la boutique TakaCode : le lien de copie du classeur, le guide et les bonus. Vous pouvez aussi retrouver le produit sur le portail client Chariow.</li>
    <li><strong>La configuration faite avec vous</strong> (bonus 1) a lieu sur rendez-vous, sur un créneau convenu ensemble sur WhatsApp.</li>
    <li><strong>Vous n'avez rien reçu 24 heures après le paiement ?</strong> Écrivez-nous : nous vous renvoyons l'accès. Si nous ne pouvons pas vous livrer, vous êtes remboursé intégralement.</li>
  </ul>

  <h2 id="licence">8. Droit d'utilisation</h2>
  <p>L'achat vous donne le droit d'utiliser TenderPilot, ses guides et ses bonus pour vous-même et pour votre structure, sans limite de durée. Ce droit n'est ni exclusif ni cessible.</p>
  <p>Il est interdit de revendre, de louer ou de diffuser le lien de copie, le classeur, son script, les guides ou les bonus, gratuitement ou non. Le code, les textes, le logo et la marque TenderPilot restent la propriété de TakaCode (programme de Solutions Luciole).</p>
  <p>Les corrections et les nouvelles sources sont annoncées dans le groupe WhatsApp des acheteurs. Votre classeur continue de fonctionner sans elles.</p>

  <h2 id="garantie">9. Satisfait ou remboursé 30 jours</h2>
  <div class="encadre">
    <p><strong>Si TenderPilot ne vous convient pas, vous êtes remboursé intégralement, sans avoir à vous justifier.</strong></p>
    <ul>
      <li><strong>Délai</strong> : faites votre demande dans les <strong>30 jours calendaires</strong> qui suivent votre achat.</li>
      <li><strong>Comment</strong> : par WhatsApp au <a href="https://wa.me/2290167659717">+229 01 67 65 97 17</a> ou par email à <a href="mailto:contact@tenderpilot.store">contact@tenderpilot.store</a>, en indiquant le nom, l'email ou le téléphone utilisés pour la commande.</li>
      <li><strong>Accusé de réception</strong> : sous 2 jours ouvrables.</li>
      <li><strong>Remboursement</strong> : la totalité du prix payé, sous 7 jours ouvrables après votre demande, par le même moyen de paiement que celui utilisé pour la commande, sans frais pour vous. Un autre moyen n'est utilisé qu'avec votre accord exprès.</li>
    </ul>
  </div>
  <p>Une fois remboursé, vous cessez d'utiliser TenderPilot : vous supprimez votre copie du classeur et les documents reçus, et votre accès au groupe WhatsApp prend fin.</p>
  <p>Cette garantie s'applique à tous les acheteurs, particuliers comme professionnels. Elle s'ajoute au droit de rétractation légal ci-dessous, qu'elle ne réduit en rien.</p>

  <h2 id="retractation">10. Droit de rétractation légal</h2>
  <p>Si vous achetez en tant que consommateur, la loi n° 2017-20 du 20 avril 2018 portant code du numérique en République du Bénin vous donne un droit de rétractation (articles 347 à 354) :</p>
  <ul>
    <li><strong>15 jours ouvrables</strong> pour l'exercer, à compter du lendemain de la commande, sans justification et sans frais ;</li>
    <li>une notification par courrier postal ou électronique, avec accusé de réception, aux coordonnées de l'article 2 ;</li>
    <li>un remboursement de toutes les sommes versées au plus tard <strong>30 jours ouvrables</strong> après la notification, par le même moyen de paiement.</li>
  </ul>
  <p>En pratique, la garantie de l'article 9 couvre ce délai et le dépasse : une seule demande suffit.</p>

  <h2 id="garanties-legales">11. Garanties légales</h2>
  <p>Vous bénéficiez des garanties légales prévues par le code du numérique : garantie de conformité, garantie des vices cachés et garantie d'éviction. Si le produit livré ne correspond pas à sa description, signalez-le : nous corrigeons ou nous remboursons.</p>

  <h2 id="responsabilite">12. Responsabilité</h2>
  <p>TakaCode met en œuvre les moyens nécessaires au bon fonctionnement de TenderPilot. Dans les limites permises par la loi, elle ne répond pas des conséquences :</p>
  <ul>
    <li>d'une erreur, d'un retard ou d'une absence de publication chez une source ;</li>
    <li>d'une source rendue indisponible par son éditeur ;</li>
    <li>des limites fixées par Google, Telegram ou votre fournisseur de modèle de langage ;</li>
    <li>d'une alerte classée en courrier indésirable, ou d'un réglage modifié par l'utilisateur ;</li>
    <li>d'une décision de candidature prise sans vérifier l'avis officiel.</li>
  </ul>
  <p>Rien dans ces conditions ne limite les droits que la loi reconnaît au consommateur.</p>

    <p><strong>Organismes cités.</strong> Sources publiques officielles. TenderPilot n'est affilié à aucun de ces organismes ; les logos appartiennent à leurs propriétaires. Voir l'<a href="/disclaimer">avertissement</a>.</p>

  <h2 id="reclamations">13. Réclamations et litiges</h2>
  <p>Toute réclamation s'adresse par WhatsApp au +229 01 67 65 97 17, par email à contact@tenderpilot.store ou par courrier à l'adresse de l'article 2. Nous répondons sous 7 jours ouvrables.</p>
  <p>Ces conditions sont soumises au droit béninois. En cas de litige, les parties recherchent d'abord une solution amiable. À défaut, le litige est porté devant les juridictions compétentes de Cotonou, sous réserve des règles qui protègent le consommateur.</p>

  <h2 id="donnees">14. Données personnelles</h2>
  <p>Les données de commande et de paiement sont collectées par Chariow. TakaCode n'utilise l'email, le téléphone et le pays que vous y renseignez que pour livrer le produit, vous assister et appliquer la garantie. Le classeur tourne sur votre propre compte Google : il ne transmet à TakaCode aucune des données que vous y collectez. Le détail et vos droits figurent dans les <a href="/privacy#donnees">mentions légales</a>.</p>

  <h2 id="archivage">15. Archivage</h2>
  <p>TakaCode conserve la trace de chaque commande pendant dix ans à compter de la livraison. Vous pouvez en demander une copie aux coordonnées de l'article 2.</p>

  </main>

<?php tp_fin(); ?>
