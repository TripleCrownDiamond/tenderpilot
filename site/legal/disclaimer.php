<?php

// Avertissement — ce que TenderPilot est et n'est pas vis-a-vis des
// organismes cites, et la limite de ce qu'il affirme. Meme mise en forme
// que les autres pages legales (commun.php).

require __DIR__ . '/../commun.php';

tp_debut('Avertissement TenderPilot', [
    'description' => 'Avertissement TenderPilot : organismes et logos cités, exactitude des avis, absence de garantie de résultat.',
    'largeur'     => 760,
]);
?>

  <style>
        .sur-titre { font-family: ui-monospace, Menlo, monospace; }
        .maj { color: var(--brume); font-size: 0.92rem; margin: 0; }
        h1 { font-weight: 800; font-size: clamp(2rem, 1.4rem + 2.4vw, 2.9rem); line-height: 1.1; margin: 0 0 14px; text-wrap: balance; letter-spacing: -0.02em; color: var(--navy); }
        h2 { font-weight: 700; font-size: 1.28rem; line-height: 1.25; margin: 44px 0 12px; padding-top: 22px; border-top: 1px solid var(--filet); text-wrap: balance; letter-spacing: -0.01em; color: var(--navy); }
        .page-legale p, .page-legale li { color: #374151; }
        .page-legale p { margin: 0 0 12px; max-width: 68ch; }
        .page-legale ul { margin: 0 0 14px; padding-left: 1.25rem; display: grid; gap: 6px; }
        .page-legale strong { color: var(--navy); font-weight: 600; }
        .resume { background: var(--light-blue); border-radius: 16px; padding: 18px 20px; margin: 24px 0 0; }
        .resume p { margin: 0; color: var(--navy); }
  </style>

  <main class="etroit page-legale">

  <p class="sur-titre">TakaCode · TenderPilot</p>
  <h1>Avertissement</h1>
  <p class="maj">Mis à jour le 19 septembre 2026.</p>

  <div class="resume">
    <p><strong>Sources publiques officielles. TenderPilot n'est affilié à aucun de ces organismes ; les logos appartiennent à leurs propriétaires.</strong></p>
  </div>

  <h2 id="organismes">Organismes et logos cités</h2>
  <p>TenderPilot lit des avis que des organismes publient librement sur leurs sites : portails nationaux de marchés publics, banques de développement, agences des Nations unies, coopérations bilatérales, fondations. Les noms et logos de certains de ces organismes apparaissent sur ce site pour une seule raison : <strong>désigner les sources que TenderPilot consulte</strong>.</p>
  <p>Leur présence ne signifie pas que ces organismes sont clients, partenaires ou soutiens de TenderPilot, ni qu'ils ont approuvé ce produit ou ce site. TenderPilot n'a aucun lien contractuel avec eux. Les noms, logos et marques cités restent la propriété de leurs titulaires.</p>
  <p><strong>Vous représentez l'un de ces organismes</strong> et souhaitez que votre logo soit retiré ? Écrivez à <a href="mailto:contact@tenderpilot.store">contact@tenderpilot.store</a> : il est retiré sous 72 heures, sans discussion.</p>

  <h2 id="avis">L'avis officiel fait foi</h2>
  <p>Chaque ligne du classeur renvoie à l'avis publié par sa source. <strong>C'est cet avis qui fait foi</strong>, jamais la ligne du classeur ni une alerte. Avant de préparer un dossier, ouvrez toujours l'avis officiel et vérifiez-en les conditions, les pièces demandées et la date limite.</p>
  <ul>
    <li>TenderPilot n'invente aucune date. Quand une source ne publie pas d'échéance, la ligne l'indique « DATE À VÉRIFIER ».</li>
    <li>Une source peut corriger, reporter ou annuler un avis après sa publication. Le classeur se met à jour au passage suivant, trois fois par jour, pas en temps réel.</li>
    <li>Une source peut changer de présentation ou devenir indisponible. Sa collecte peut alors s'interrompre le temps d'être corrigée ; l'onglet LOGS du classeur le signale.</li>
  </ul>

  <h2 id="resultat">Aucune garantie de résultat</h2>
  <p>TenderPilot est un outil de veille : il vous aide à <strong>trouver</strong> des opportunités et à ne pas manquer leurs échéances. Il ne garantit ni l'exhaustivité des avis publiés dans un pays ou un secteur, ni l'obtention d'un marché, d'une subvention ou d'un financement. La décision de candidater, le contenu du dossier et son dépôt restent sous votre responsabilité.</p>
  <p>Les <strong>plans de passation</strong> sont des prévisions publiées par les autorités contractantes : un marché prévu peut être reporté, modifié ou ne jamais être lancé, et son montant est une estimation.</p>

  <h2 id="services">Services tiers</h2>
  <p>TenderPilot fonctionne sur votre compte Google et, si vous les activez, sur Telegram et sur un service d'intelligence artificielle dont vous fournissez la clé. Ces services ont leurs propres conditions et peuvent évoluer indépendamment de TenderPilot. Google, Google Sheets, Google Agenda, Telegram et WhatsApp sont des marques de leurs titulaires ; TenderPilot n'est affilié à aucun d'eux.</p>

  <h2 id="contact">Contact</h2>
  <p>Une erreur dans une ligne, une source à signaler, une demande de retrait : <a href="mailto:contact@tenderpilot.store">contact@tenderpilot.store</a> ou sur <a href="https://wa.me/2290167659717">WhatsApp, +229 01 67 65 97 17</a>. Voir aussi les <a href="/privacy">mentions légales</a> et les <a href="/terms">conditions générales de vente</a>.</p>

  </main>

<?php tp_fin(); ?>
