<?php

// =============================================================
//  commun.php : LE design system du site, a un seul endroit.
//  Les 5 pages (accueil, checkout, remerciement, CGV, mentions)
//  partagent ici les memes couleurs, la meme police, les memes
//  composants, le meme header simple et le meme footer.
//      require __DIR__ . '/commun.php';          (a la racine)
//      require __DIR__ . '/../commun.php';       (depuis payment/ ou legal/)
//
//  Page standard :
//      tp_debut('Titre', ['description' => '...']);
//      // contenu propre a la page
//      tp_fin();                        // ou tp_fin($javascript)
//
//  Page d'accueil (header propre + Tailwind + meta OG) :
//      tp_debut($titre, [
//          'header'    => false,        // elle pose sa propre navbar
//          'html_class'=> 'scroll-smooth',
//          'avant_css' => '<script ...tailwind...></script>',
//          'head_extra'=> '<meta property="og:..."> ... <style>...</style>',
//      ]);
// =============================================================

if (!function_exists('e')) {
    // Echappement HTML, utilise partout dans les pages.
    function e($s): string { return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8'); }
}

if (!defined('LIEN_WHATSAPP')) {
    // Les pages hors payment/ n'incluent pas config.php : on garde le
    // numero du site pour que le header/footer marchent partout.
    define('LIEN_WHATSAPP', 'https://wa.me/2290167659717');
}

/**
 * Ouvre la page : doctype, head (Inter + favicon + meta), le CSS du
 * design system, puis — sauf option 'header' => false — le conteneur
 * et le header commun. Le contenu de la page suit l'appel.
 *
 * Options :
 *   - 'description' : meta description (défaut : rien).
 *   - 'noindex'     : true pour interdire l'indexation (remerciement).
 *   - 'largeur'     : largeur max du conteneur central en px (défaut 680).
 *   - 'header'      : false pour poser son propre header (accueil).
 *   - 'html_class'  : classes posees sur <html> (ex. 'scroll-smooth').
 *   - 'avant_css'   : HTML colle avant le CSS du design system
 *                     (scripts Tailwind/Iconify de l'accueil).
 *   - 'head_extra'  : HTML colle apres le CSS (meta OG, styles locaux).
 */
function tp_debut(string $titre, array $options = []): void {
    $description = $options['description'] ?? '';
    $noindex     = !empty($options['noindex']);
    $avecHeader  = !isset($options['header']) || $options['header'];
    $largeur     = (int) ($options['largeur'] ?? 680);
    $htmlClass   = trim((string) ($options['html_class'] ?? ''));
    $avantCss    = (string) ($options['avant_css'] ?? '');
    $headExtra   = (string) ($options['head_extra'] ?? '');
    ?>
<!DOCTYPE html>
<html lang="fr"<?= $htmlClass !== '' ? ' class="' . e($htmlClass) . '"' : '' ?>>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= e($titre) ?></title>
<!-- Facebook Pixel Code -->
<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '2354862761986702');
  fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=2354862761986702&ev=PageView&noscript=1"/></noscript>
<!-- End Facebook Pixel Code -->
<?php if ($description !== ''): ?><meta name="description" content="<?= e($description) ?>">
<?php endif; ?>
<?php if ($noindex): ?><meta name="robots" content="noindex">
<?php endif; ?>
<?= $avantCss ?>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ctext y=%22.9em%22 font-size=%2290%22%3E%E2%9C%88%EF%B8%8F%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&amp;display=swap">
<style>
  /* ---- Design system de la page de vente (identique a index.php) ---- */
  :root {
    color-scheme: light;
    --navy: #0B1225;
    --primary: #4F46FF;
    --primary-vif: #4338CA;
    --light-blue: #EEF0FF;
    --light-gray: #F6F7FA;
    --text-dark: #172033;
    --brume: #6B7280;
    --filet: #E5E7EB;
    --filet-fort: #D1D5DB;
  }
  * { box-sizing: border-box; }
  html { background: var(--light-gray); overflow-x: clip; }
  body {
    margin: 0;
    background: var(--light-gray);
    color: var(--text-dark);
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    font-size: 1.05rem;
    line-height: 1.6;
    padding-inline: clamp(16px, 4vw, 40px);
    overflow-x: clip;
    -webkit-font-smoothing: antialiased;
  }
  img { max-width: 100%; height: auto; display: block; }
  a { color: inherit; }
  :focus-visible { outline: 2px solid var(--primary); outline-offset: 3px; border-radius: 4px; }
  .cadre { max-width: 1120px; margin-inline: auto; }

  /* Header simple : logo a gauche, contact a droite (pages secondaires). */
  .barre { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-block: 22px; }
  .barre img { height: 32px; width: auto; }
  .lien-contact { color: var(--brume); text-decoration: none; font-weight: 600; font-size: 0.95rem; white-space: nowrap; }
  .lien-contact:hover { color: var(--primary); }

  /* Footer commun aux 5 pages (memes blocs que la page de vente). */
  .site-pied { margin-top: 48px; border-top: 1px solid var(--filet); padding-block: 56px 32px; color: var(--brume); font-size: 0.9rem; }
  .pied-cadre { max-width: 1280px; margin-inline: auto; }
  .pied-grille { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr); gap: 40px; }
  .pied-grille.sans-nav { grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); }
  @media (max-width: 760px) { .pied-grille, .pied-grille.sans-nav { grid-template-columns: 1fr; gap: 32px; } }
  .pied-marque img { height: 28px; width: auto; margin-bottom: 16px; }
  .pied-marque p { max-width: 24rem; margin: 0 0 20px; }
  /* Sur mobile le pied suit les memes marges que les sections de la page
     de vente (px-6, 24 px), pas le padding large du body. */
  @media (max-width: 767px) { .site-pied { padding-inline: 24px; } }
  .pied-whatsapp { display: inline-flex; align-items: center; gap: 8px; color: var(--navy); font-weight: 700; text-decoration: none; }
  .pied-whatsapp:hover { color: var(--primary); }
  .pied-whatsapp svg { width: 20px; height: 20px; flex: none; }
  .pied-titre { font-weight: 900; font-size: 0.75rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--navy); margin: 0 0 20px; }
  .pied-liste { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; font-weight: 500; }
  .pied-liste a { text-decoration: none; }
  .pied-liste a:hover { color: var(--primary); }
  .pied-bas { margin-top: 48px; border-top: 1px solid var(--filet); padding-top: 24px; display: flex; flex-wrap: wrap; gap: 12px 28px; align-items: center; justify-content: space-between; }
  .pied-bas a:hover { color: var(--primary); }

  /* Contenu central. */
  /* La marge du body est grande sur ordinateur (comme la page de vente) et
     reduite sur mobile : pas de redefinition par page. Le conteneur central
     reprend la marge auto des sections de la home. */
  @media (max-width: 767px) { body { padding-inline: 20px; } }
  .etroit { max-width: <?= $largeur ?>px; margin-inline: auto; padding-block: clamp(24px, 4vw, 48px); }
  .sur-titre { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--primary); margin: 0 0 12px; }
  h1.affiche { font-weight: 800; letter-spacing: -0.02em; line-height: 1.1; color: var(--navy); font-size: clamp(1.9rem, 1.3rem + 2vw, 2.4rem); margin: 0 0 12px; text-wrap: balance; }
  .chapeau { color: var(--brume); font-size: 1.15rem; line-height: 1.55; margin: 0 0 24px; }

  /* Composants partages. */
  .carte { background: #fff; border: 1px solid var(--filet); border-radius: 16px; padding: clamp(22px, 4vw, 36px); box-shadow: 0 20px 60px -30px rgba(11, 18, 37, 0.18); }
  .bouton { display: inline-flex; align-items: center; justify-content: center; gap: 10px; font-family: 'Inter', sans-serif; font-weight: 700; font-size: 0.98rem; color: #fff; background: var(--primary); text-decoration: none; border: none; border-radius: 12px; padding: 13px 22px; cursor: pointer; box-shadow: 0 10px 30px -12px rgba(79, 70, 255, 0.6); transition: background 0.2s ease, transform 0.2s ease; }
  .bouton:hover { background: var(--primary-vif); transform: translateY(-1px); }
  .bouton.secondaire { background: transparent; box-shadow: none; border: 1px solid var(--filet-fort); color: var(--text-dark); }
  .bouton.secondaire:hover { background: var(--light-blue); }
  .bouton.whatsapp { background: #22B255; box-shadow: 0 10px 30px -12px rgba(34, 178, 85, 0.5); }
  .bouton.whatsapp:hover { background: #2AC963; }
  .bouton svg { width: 18px; height: 18px; flex: none; }
  label { font-weight: 600; font-size: 0.98rem; display: block; margin: 16px 0 7px; color: var(--navy); }
  .champ { width: 100%; background: #fff; border: 1px solid var(--filet-fort); color: var(--text-dark); border-radius: 10px; padding: 13px 15px; font-size: 1rem; font-family: 'Inter', sans-serif; }
  .champ::placeholder { color: var(--brume); }
  .champ:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(79, 70, 255, 0.18); }
  .erreur { background: #FEF2F2; border: 1px solid #FCA5A5; color: #B91C1C; border-radius: 10px; padding: 13px 15px; margin-bottom: 10px; font-size: 0.95rem; }
  .erreur-chapeau { color: #B91C1C; font-size: 1rem; margin: 0 0 24px; }
  /* Textes longs jamais plus etroits que l'ecran : les longues URLs des
     pages legales (RCCM, liens) ne poussent plus la page en largeur. */
  .etroit, .carte { min-width: 0; overflow-wrap: break-word; }
  .encadre { background: rgba(79, 70, 255, 0.06); border: 1px solid rgba(79, 70, 255, 0.35); border-radius: 12px; padding: 14px 16px; margin: 14px 0; font-size: 0.95rem; color: var(--brume); }
  .encadre strong { color: var(--text-dark); }
  .code { font-family: ui-monospace, "SFMono-Regular", Menlo, monospace; background: rgba(22, 32, 45, 0.06); border: 1px solid var(--filet); border-radius: 6px; padding: 6px 12px; font-size: 0.82rem; color: var(--text-dark); word-break: break-all; }
  .mini { background: transparent; border: 1px solid var(--filet-fort); color: var(--primary); font-family: 'Inter', sans-serif; border-radius: 10px; padding: 8px 12px; font-size: 0.85rem; font-weight: 600; cursor: pointer; flex: none; }
  .mini:hover { border-color: var(--primary); }
  .centre { text-align: center; }
</style>
<?= $headExtra ?>
</head>
<body>
<?php if ($avecHeader): ?>
<div class="cadre">

  <header class="barre">
    <a href="/" aria-label="TenderPilot, page de vente"><img src="/logo-fonce.png" alt="TenderPilot" width="135" height="30"></a>
    <a class="lien-contact" href="<?= e(LIEN_WHATSAPP) ?>" target="_blank" rel="noopener">Une question ? WhatsApp</a>
  </header>
<?php $GLOBALS['tp_cadre'] = true; ?>
<?php endif; ?>
<?php
}

/**
 * Referme la page : le footer commun (meme contenu que la page de
 * vente), puis le script eventuel et la fin du document.
 * $script : du JS colle tel quel juste avant </body>.
 * $options['navigation'] : true ajoute la colonne Navigation au pied
 *   (absente par defaut : chaque lien de plus est une sortie avant l'achat).
 */
function tp_fin(string $script = '', array $options = []): void {
    $whatsapp = LIEN_WHATSAPP;
    // Plus de colonne Navigation par defaut : chaque lien de plus est une
    // sortie, sur la page de vente comme sur les autres. 'navigation' => true
    // la remet si une page en a besoin.
    $avecNav  = !empty($options['navigation']);
    ?>
<?php if (!empty($GLOBALS['tp_cadre'])): ?>
</div>
<?php endif; ?>

  <footer class="site-pied">
    <div class="pied-cadre">
      <div class="pied-grille<?= $avecNav ? '' : ' sans-nav' ?>">
        <div class="pied-marque">
          <a href="/" aria-label="TenderPilot, page de vente"><img src="/logo-fonce.png" alt="TenderPilot" width="135" height="28"></a>
          <p>La solution de veille intelligente pour les appels d'offres en Afrique de l'Ouest et du Centre.</p>
          <a class="pied-whatsapp" href="<?= e($whatsapp) ?>" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" fill="#22B255" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm5.7 14.1c-.24.68-1.4 1.3-1.95 1.34-.52.04-1.18.19-3.98-.83-3.37-1.3-5.5-4.67-5.66-4.88-.17-.21-1.36-1.8-1.36-3.44 0-1.64.86-2.44 1.16-2.78.31-.33.67-.42.9-.42l.64.01c.21.01.48-.08.75.57l1.02 2.44c.08.18.14.4.02.63-.1.24-.22.35-.41.56l-.3.34c-.13.13-.25.25-.11.49.14.24.63 1.04 1.36 1.68.93.83 1.72 1.09 1.97 1.21.23.12.37.1.51-.06l.74-.86c.16-.19.32-.15.53-.09l2.06.97c.25.12.41.18.47.28.06.11.06.63-.18 1.31Z"/></svg>
            Nous contacter sur WhatsApp
          </a>
        </div>
        <?php if ($avecNav): ?>
        <div>
          <p class="pied-titre">Navigation</p>
          <ul class="pied-liste">
            <li><a href="/#fonctionnalites">Fonctionnalités</a></li>
            <li><a href="/#how-it-works">Comment ça marche</a></li>
            <li><a href="/#pricing">Tarifs</a></li>
            <li><a href="/#faq">FAQ</a></li>
          </ul>
        </div>
        <?php endif; ?>
        <div>
          <p class="pied-titre">Légal</p>
          <ul class="pied-liste">
            <li><a href="/terms">Conditions générales de vente</a></li>
            <li><a href="/privacy">Mentions légales</a></li>
            <li><a href="/disclaimer">Avertissement</a></li>
          </ul>
        </div>
      </div>
      <div class="pied-bas">
        <span>© <?= date('Y') ?> TenderPilot · TakaCode. Tous droits réservés.</span>
        <span>Designed by <a href="https://georgeo-agbahungba.xyz/" target="_blank" rel="noopener">Georgeo AGBAHUNGBA</a></span>
      </div>
    </div>
  </footer>
<?php if ($script !== ''): ?>
<script>
<?= $script ?>
</script>
<?php endif; ?>
</body>
</html>
<?php
}
