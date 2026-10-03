<?php

// Page de vente — le contenu est propre a cette page, mais le design
// system (tokens, head, footer) vient de commun.php : un seul endroit
// a modifier pour changer couleurs, police ou footer sur tout le site.

require __DIR__ . '/commun.php';

tp_debut('TenderPilot — Veille Appels d\'Offres Afrique', [
    'description' => 'Ne manquez plus les appels d\'offres qui comptent. Veille automatique des marchés publics en Afrique de l\'Ouest et du Centre : 61 sources officielles, alertes à temps, paiement unique.',
    'header'      => false,       // la page de vente pose sa propre navbar
    'html_class'  => 'scroll-smooth',
    // tailwind.css est COMPILE (voir README) : le CDN de Tailwind est un
    // outil de developpement, lent et bruyant en production.
    // Le script 'js' pose la classe sur <html> AVANT le rendu : les
    // animations d'apparition ne cachent le contenu que si JS tourne.
    'avant_css'   => '<script>document.documentElement.classList.add("js")</script>
                     <script src="https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js"></script>
                     <script defer src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
                     <script defer src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>',
    'head_extra'  => <<<HTML
<meta property="og:type" content="website">
<meta property="og:url" content="https://tenderpilot.store/">
<meta property="og:title" content="TenderPilot · Ne manquez plus les appels d'offres qui comptent">
<meta property="og:description" content="Trouvez les bons appels d'offres. Avant la deadline.">
<meta property="og:image" content="https://tenderpilot.store/partage-tenderpilot.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="TenderPilot : trouvez les bons appels d'offres, avant la deadline.">
<meta name="twitter:card" content="summary_large_image">
<style>
    /* Classes metier de la page de vente, branchees sur les tokens communs. */
    body { padding-inline: 0; } /* les sections gerent leurs propres marges */
    /* Le pied vient de commun.php, qui compte sur la marge du body : ici
       elle est a 0, il reprend donc celle des sections (px-6, 24 px). Et
       il suit directement la section sombre, sans bande ni filet. */
    .site-pied { margin-top: 0; border-top: 0; padding-inline: 24px; }
    .text-navy { color: var(--navy); }
    .bg-navy { background-color: var(--navy); }
    .bg-primary { background-color: var(--primary); }
    .text-primary { color: var(--primary); }
    .bg-light-blue { background-color: var(--light-blue); }
    .bg-light-gray { background-color: var(--light-gray); }

    .glass-card {
        background: rgba(255, 255, 255, 0.8);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.3);
    }

    @keyframes slideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
    .animate-slide-up {
        animation: slideUp 0.6s ease-out forwards;
    }

    #places-barre { transition: width 0.6s ease; }
    .js-payer { cursor: pointer; }
    .hero-nuit { background: radial-gradient(900px 520px at 85% 15%, rgba(79,70,255,.55), transparent 65%), radial-gradient(700px 400px at 0% 100%, rgba(79,70,255,.25), transparent 60%), var(--navy); }
    .annotation { font-family: 'Caveat', cursive; }
    .appel-final { background: linear-gradient(90deg, rgba(11,18,37,.95) 0%, rgba(11,18,37,.75) 45%, rgba(11,18,37,.1) 100%), url('/fond-final.webp') right center / cover no-repeat, var(--navy); }
    @media (max-width: 767px) { .appel-final { background: linear-gradient(rgba(11,18,37,.82), rgba(11,18,37,.82)), url('/fond-final.webp') 80% center / cover no-repeat, var(--navy); } }
    .logo-source { filter: grayscale(1); opacity: .65; transition: filter .3s, opacity .3s; }
    .logo-source:hover { filter: none; opacity: 1; }
    /* Le tableur penche en perspective, comme un ecran pose de biais. */
    .ecran-incline { transform: perspective(1400px) rotateY(-8deg) rotateX(4deg) rotateZ(1deg); transform-origin: center; transition: transform .6s ease; }
    @media (min-width: 1024px) { .ecran-incline { transform: perspective(1600px) rotateY(-16deg) rotateX(6deg) rotateZ(2deg); } }
    @media (hover: hover) { .ecran-incline:hover { transform: perspective(1600px) rotateY(-6deg) rotateX(2deg); } }
    @media (prefers-reduced-motion: reduce) { .ecran-incline { transition: none; } }
    .panneau-alertes { background: radial-gradient(500px 300px at 90% 10%, rgba(165,180,252,.5), transparent 60%), linear-gradient(135deg, #4F46FF, #0B1225); }
    /* Apparition au scroll : le contenu est visible par defaut (sans JS),
       cache puis revele uniquement quand html porte la classe js. */
    html.js .reveler { opacity: 0; transform: translateY(18px); transition: opacity .6s ease, transform .6s ease; }
    html.js .reveler.revele { opacity: 1; transform: none; }
    @media (prefers-reduced-motion: reduce) { html.js .reveler { opacity: 1; transform: none; transition: none; } }

    /* La ligne des etapes se remplit comme une barre de chargement
       (tirets indigo qui avancent de gauche a droite), et chaque pastille
       numerotee "s'allume" quand le trait l'atteint. Le delai de chaque
       pop est regle par la variable --pop posee sur le <li>. */
    .ligne-progres {
        height: 2px;
        background-image: repeating-linear-gradient(90deg, var(--primary) 0 10px, transparent 10px 20px),
                          repeating-linear-gradient(90deg, #C7D2FE 0 10px, transparent 10px 20px);
        background-repeat: no-repeat, repeat;
        background-size: 0% 100%, 100% 100%;
    }
    html.js .reveler.ligne-progres { opacity: 1; transform: none; } /* la ligne ne fade pas : elle se remplit */
    html.js .reveler.ligne-progres.revele { background-size: 100% 100%, 100% 100%; transition: background-size 2.4s ease; }
    html.js .reveler .pastille { opacity: 0; transform: scale(.3); }
    html.js .reveler.revele .pastille {
        opacity: 1; transform: scale(1);
        transition: transform .5s cubic-bezier(.34, 1.56, .64, 1) var(--pop, .4s), opacity .25s ease var(--pop, .4s);
    }
    @media (prefers-reduced-motion: reduce) {
        html.js .reveler.ligne-progres { background-size: 100% 100%, 100% 100%; transition: none; }
        html.js .reveler .pastille { opacity: 1; transform: none; transition: none; }
    }
    /* Sur mobile la ligne est cachee : les pastilles s'allument sans delai. */
    @media (max-width: 767px) {
        html.js .reveler.revele .pastille { transition: transform .5s cubic-bezier(.34, 1.56, .64, 1), opacity .25s ease; }
    }
    /* Le bouton flottant (mobile) ne doit jamais masquer le bas de page. */
    @media (max-width: 767px) { body { padding-bottom: 84px; } }
</style>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caveat:wght@600&amp;display=swap">
<link rel="stylesheet" href="/tailwind.css">
HTML,
]);
?>
    <div class="min-h-screen relative flex flex-col overflow-x-hidden">

        <!-- NAVBAR -->
        <nav class="fixed w-full z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 py-3 md:py-4">
            <div class="max-w-7xl mx-auto px-4 md:px-6 flex justify-between items-center gap-3">
                <a href="#hero" class="flex items-center gap-2 group" id="nav-logo" aria-label="TenderPilot, haut de page">
                    <img src="logo-fonce.png" alt="TenderPilot" class="h-7 md:h-8">
                </a>


                <a href="checkout" class="js-payer bg-primary text-white px-4 md:px-6 py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-indigo-200 hover:opacity-90 transition-all">
                    Obtenir TenderPilot
                </a>
            </div>
        </nav>

        <!-- HERO : bleu nuit, le tableau a droite. L'image du classeur est
             hero-classeur.webp si elle existe (visuel genere), sinon la vraie
             capture du tableau. -->
        <?php $visuelHero = is_file(__DIR__ . '/hero-classeur.webp') ? 'hero-classeur.webp' : 'capture-tableau.webp'; ?>
        <header id="hero" class="hero-nuit text-white pt-28 pb-16 md:pt-36 md:pb-24 px-6 overflow-hidden">
            <div class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                <div>
                    <span class="inline-block bg-white/10 border border-white/15 text-indigo-200 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-6">Veille des appels d'offres · Afrique de l'Ouest et du Centre</span>
                    <h1 class="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.08] mb-6">
                        Trouvez les bons appels d'offres. <span class="text-indigo-300">Avant la deadline.</span>
                    </h1>
                    <p class="text-lg md:text-xl text-slate-300 max-w-xl mb-9">
                        TenderPilot surveille les sources officielles, identifie les opportunités pertinentes pour votre activité et vous alerte avant les échéances.
                    </p>
                    <div class="flex flex-col sm:flex-row gap-3 mb-7">
                        <a href="checkout" class="js-payer inline-flex items-center justify-center gap-2 bg-primary text-white px-7 py-4 rounded-xl text-lg font-bold shadow-lg shadow-indigo-900/40 hover:translate-y-[-2px] transition-all">
                            Obtenir TenderPilot
                            <iconify-icon icon="lucide:arrow-right"></iconify-icon>
                        </a>
                        <a href="#how-it-works" class="inline-flex items-center justify-center gap-2 border border-white/25 text-white px-7 py-4 rounded-xl text-lg font-semibold hover:bg-white/10 transition-all">
                            Voir comment ça marche
                        </a>
                    </div>
                    <ul class="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-300">
                        <li class="flex items-center gap-2"><iconify-icon icon="lucide:check" class="text-indigo-300"></iconify-icon>Paiement unique</li>
                        <li class="flex items-center gap-2"><iconify-icon icon="lucide:check" class="text-indigo-300"></iconify-icon>Sans abonnement</li>
                        <li class="flex items-center gap-2"><iconify-icon icon="lucide:check" class="text-indigo-300"></iconify-icon><a href="/terms#garantie" class="underline decoration-dotted hover:text-white">Satisfait ou remboursé 30 jours</a></li>
                    </ul>
                </div>
                <div class="relative">
                    <div class="annotation hidden lg:flex absolute -top-16 right-2 items-start gap-1 text-indigo-200 text-2xl -rotate-3" aria-hidden="true">
                        <!-- fleche dessinee a la main, du texte vers le tableau -->
                        <svg width="70" height="56" viewBox="0 0 70 56" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" class="mt-3 shrink-0"><path d="M66 8 C 46 4, 20 12, 12 46"/><path d="M4 37 L12 48 L22 40"/></svg>
                        <span>Toutes vos opportunités, dans un seul tableau</span>
                    </div>
                    <div class="ecran-incline bg-white rounded-2xl shadow-2xl shadow-black/40 overflow-hidden text-left ring-1 ring-white/10">
                        <div class="bg-gray-50 border-b border-gray-100 px-4 py-3 flex items-center gap-2">
                            <span class="w-3 h-3 rounded-full bg-red-400"></span>
                            <span class="w-3 h-3 rounded-full bg-yellow-400"></span>
                            <span class="w-3 h-3 rounded-full bg-green-400"></span>
                            <span class="ml-3 text-[11px] text-gray-400 font-mono truncate">Votre classeur TenderPilot · Google Sheets</span>
                        </div>
                        <img src="<?= $visuelHero ?>" alt="Le tableau TenderPilot : une ligne par appel d'offres, colorée selon le temps qui reste" class="w-full">
                    </div>
                </div>
            </div>
        </header>

        <!-- SOURCES : logos d'organismes dont TenderPilot LIT les avis
             publics (fichiers Wikimedia Commons, site/logos/). Ce ne sont ni
             des clients ni des partenaires : la mention de non-affiliation
             reste sous la bande, et le titre dit "nous lisons", pas "ils nous
             font confiance". -->
        <section class="py-12 px-6 bg-white border-b border-gray-100">
            <div class="max-w-6xl mx-auto">
                <p class="text-center text-sm text-gray-500 mb-8"><span class="font-semibold text-navy">61 sources officielles</span> lues pour vous trois fois par jour, dont :</p>
                <ul class="flex flex-wrap justify-center gap-3">
                    <li class="logo-source w-[calc(33.333%-0.5rem)] sm:w-[calc(25%-0.6rem)] md:w-[calc(20%-0.6rem)] lg:w-[calc(14.285%-0.65rem)] h-20 rounded-xl bg-gray-50 flex items-center justify-center px-4" title="Banque mondiale"><img src="logos/banque-mondiale.svg" alt="Banque mondiale" class="h-6 w-auto max-w-full object-contain" loading="lazy"></li>
                    <li class="logo-source w-[calc(33.333%-0.5rem)] sm:w-[calc(25%-0.6rem)] md:w-[calc(20%-0.6rem)] lg:w-[calc(14.285%-0.65rem)] h-20 rounded-xl bg-gray-50 flex items-center justify-center px-4" title="AFD"><img src="logos/afd.svg" alt="AFD" class="h-8 w-auto max-w-full object-contain" loading="lazy"></li>
                    <li class="logo-source w-[calc(33.333%-0.5rem)] sm:w-[calc(25%-0.6rem)] md:w-[calc(20%-0.6rem)] lg:w-[calc(14.285%-0.65rem)] h-20 rounded-xl bg-gray-50 flex items-center justify-center px-4" title="Union européenne"><img src="logos/union-europeenne.svg" alt="Union européenne" class="h-10 w-auto max-w-full object-contain" loading="lazy"></li>
                    <li class="logo-source w-[calc(33.333%-0.5rem)] sm:w-[calc(25%-0.6rem)] md:w-[calc(20%-0.6rem)] lg:w-[calc(14.285%-0.65rem)] h-20 rounded-xl bg-gray-50 flex items-center justify-center px-4" title="PNUD"><img src="logos/pnud.svg" alt="PNUD" class="h-14 w-auto max-w-full object-contain" loading="lazy"></li>
                    <li class="logo-source w-[calc(33.333%-0.5rem)] sm:w-[calc(25%-0.6rem)] md:w-[calc(20%-0.6rem)] lg:w-[calc(14.285%-0.65rem)] h-20 rounded-xl bg-gray-50 flex items-center justify-center px-4" title="UNICEF"><img src="logos/unicef.svg" alt="UNICEF" class="h-6 w-auto max-w-full object-contain" loading="lazy"></li>
                    <li class="logo-source w-[calc(33.333%-0.5rem)] sm:w-[calc(25%-0.6rem)] md:w-[calc(20%-0.6rem)] lg:w-[calc(14.285%-0.65rem)] h-20 rounded-xl bg-gray-50 flex items-center justify-center px-4" title="GIZ"><img src="logos/giz.svg" alt="GIZ" class="h-7 w-auto max-w-full object-contain" loading="lazy"></li>
                    <li class="logo-source w-[calc(33.333%-0.5rem)] sm:w-[calc(25%-0.6rem)] md:w-[calc(20%-0.6rem)] lg:w-[calc(14.285%-0.65rem)] h-20 rounded-xl bg-gray-50 flex items-center justify-center px-4" title="Enabel"><img src="logos/enabel.webp" alt="Enabel" class="h-7 w-auto max-w-full object-contain" loading="lazy"></li>
                    <li class="logo-source w-[calc(33.333%-0.5rem)] sm:w-[calc(25%-0.6rem)] md:w-[calc(20%-0.6rem)] lg:w-[calc(14.285%-0.65rem)] h-20 rounded-xl bg-gray-50 flex items-center justify-center px-4" title="BCEAO"><img src="logos/bceao.svg" alt="BCEAO" class="h-8 w-auto max-w-full object-contain" loading="lazy"></li>
                    <li class="logo-source w-[calc(33.333%-0.5rem)] sm:w-[calc(25%-0.6rem)] md:w-[calc(20%-0.6rem)] lg:w-[calc(14.285%-0.65rem)] h-20 rounded-xl bg-gray-50 flex items-center justify-center px-4" title="Fondation Bill & Melinda Gates"><img src="logos/fondation-gates.svg" alt="Fondation Bill & Melinda Gates" class="h-6 w-auto max-w-full object-contain" loading="lazy"></li>
                    <li class="logo-source w-[calc(33.333%-0.5rem)] sm:w-[calc(25%-0.6rem)] md:w-[calc(20%-0.6rem)] lg:w-[calc(14.285%-0.65rem)] h-20 rounded-xl bg-gray-50 flex items-center justify-center px-4" title="Wellcome"><img src="logos/wellcome.svg" alt="Wellcome" class="h-12 w-auto max-w-full object-contain" loading="lazy"></li>
                    <li class="logo-source w-[calc(33.333%-0.5rem)] sm:w-[calc(25%-0.6rem)] md:w-[calc(20%-0.6rem)] lg:w-[calc(14.285%-0.65rem)] h-20 rounded-xl bg-gray-50 flex items-center justify-center px-4" title="Plan International"><img src="logos/plan-international.svg" alt="Plan International" class="h-9 w-auto max-w-full object-contain" loading="lazy"></li>
                    <li class="logo-source w-[calc(33.333%-0.5rem)] sm:w-[calc(25%-0.6rem)] md:w-[calc(20%-0.6rem)] lg:w-[calc(14.285%-0.65rem)] h-20 rounded-xl bg-gray-50 flex items-center justify-center px-4" title="AGRA"><img src="logos/agra.svg" alt="AGRA" class="h-8 w-auto max-w-full object-contain" loading="lazy"></li>
                    <li class="logo-source w-[calc(33.333%-0.5rem)] sm:w-[calc(25%-0.6rem)] md:w-[calc(20%-0.6rem)] lg:w-[calc(14.285%-0.65rem)] h-20 rounded-xl bg-gray-50 flex items-center justify-center px-4" title="SBEE"><img src="logos/sbee.webp" alt="SBEE" class="h-12 w-auto max-w-full object-contain" loading="lazy"></li>
                </ul>
                <p class="text-center mt-6 text-xs text-gray-400">Sources publiques officielles. TenderPilot n'est affilié à aucun de ces organismes ; les logos appartiennent à leurs propriétaires. <a href="/disclaimer" class="underline hover:text-primary">Avertissement</a></p>
            </div>
        </section>

        <!-- ATOUTS -->
        <section class="py-14 md:py-20 px-6 bg-white">
            <div class="max-w-7xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div class="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                    <div class="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center mb-5"><iconify-icon icon="lucide:search" class="text-xl"></iconify-icon></div>
                    <h3 class="text-lg font-bold text-navy mb-2">Trouvez</h3>
                    <p class="text-sm text-gray-500 leading-relaxed">61 sources officielles lues trois fois par jour, rassemblées dans un seul tableau.</p>
                </div>
                <div class="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                    <div class="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center mb-5"><iconify-icon icon="lucide:filter" class="text-xl"></iconify-icon></div>
                    <h3 class="text-lg font-bold text-navy mb-2">Qualifiez</h3>
                    <p class="text-sm text-gray-500 leading-relaxed">Chaque avis est classé selon vos pays et vos secteurs : le plus pertinent passe devant.</p>
                </div>
                <div class="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                    <div class="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center mb-5"><iconify-icon icon="lucide:bell-ring" class="text-xl"></iconify-icon></div>
                    <h3 class="text-lg font-bold text-navy mb-2">Soyez alerté</h3>
                    <p class="text-sm text-gray-500 leading-relaxed">Email, Telegram et Google Agenda : les nouveautés et les rappels avant chaque date limite.</p>
                </div>
                <div class="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                    <div class="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center mb-5"><iconify-icon icon="lucide:calendar-clock" class="text-xl"></iconify-icon></div>
                    <h3 class="text-lg font-bold text-navy mb-2">Anticipez</h3>
                    <p class="text-sm text-gray-500 leading-relaxed">Les plans de passation montrent les marchés prévus avant même leur publication.</p>
                </div>
            </div>
        </section>

        <!-- COMMENT CA MARCHE : une vraie sequence, d'ou la numerotation. -->
        <section id="how-it-works" class="py-14 md:py-24 px-6 bg-gray-50">
            <div class="max-w-7xl mx-auto">
                <span class="inline-block bg-light-blue text-primary text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">Comment ça marche</span>
                <h2 class="reveler text-3xl md:text-4xl font-bold text-navy mb-10 md:mb-14 max-w-2xl">De l'installation à votre première alerte, en dix minutes.</h2>
                <ol class="relative grid md:grid-cols-4 gap-8 md:gap-6">
                    <div class="reveler ligne-progres hidden md:block absolute top-6 left-12 right-12"></div>
                    <li class="reveler relative flex md:flex-col gap-4" style="transition-delay:0s">
                        <span class="pastille shrink-0 w-12 h-12 rounded-full bg-primary text-white font-bold flex items-center justify-center ring-8 ring-gray-50" style="--pop:0s">01</span>
                        <div><h3 class="font-bold text-navy text-lg mb-1">Copiez votre classeur</h3><p class="text-sm text-gray-500">Un clic sur le lien reçu : Google crée votre propre copie, script compris.</p></div>
                    </li>
                    <li class="reveler relative flex md:flex-col gap-4" style="transition-delay:.08s">
                        <span class="pastille shrink-0 w-12 h-12 rounded-full bg-white border-2 border-indigo-200 text-primary font-bold flex items-center justify-center ring-8 ring-gray-50" style="--pop:.8s">02</span>
                        <div><h3 class="font-bold text-navy text-lg mb-1">Réglez pays et secteurs</h3><p class="text-sm text-gray-500">Deux cases dans l'onglet CONFIG. Aucune intelligence artificielle requise.</p></div>
                    </li>
                    <li class="reveler relative flex md:flex-col gap-4" style="transition-delay:.16s">
                        <span class="pastille shrink-0 w-12 h-12 rounded-full bg-white border-2 border-indigo-200 text-primary font-bold flex items-center justify-center ring-8 ring-gray-50" style="--pop:1.6s">03</span>
                        <div><h3 class="font-bold text-navy text-lg mb-1">Recevez vos alertes</h3><p class="text-sm text-gray-500">Les nouveautés, puis les rappels à J-7, J-3 et J-1, par email ou Telegram.</p></div>
                    </li>
                    <li class="reveler relative flex md:flex-col gap-4" style="transition-delay:.24s">
                        <span class="pastille shrink-0 w-12 h-12 rounded-full bg-white border-2 border-indigo-200 text-primary font-bold flex items-center justify-center ring-8 ring-gray-50" style="--pop:2.4s">04</span>
                        <div><h3 class="font-bold text-navy text-lg mb-1">Suivez vos échéances</h3><p class="text-sm text-gray-500">Écrivez OUI dans la colonne Suivi : la date limite entre dans votre Google Agenda.</p></div>
                    </li>
                </ol>
            </div>
        </section>

        <!-- TOUT CE QU'IL FAUT : cartes d'alerte superposees. Photo en fond si
             photo-veille.webp existe (visuel genere), sinon un degrade. -->
        <?php $photoVeille = is_file(__DIR__ . '/photo-veille.webp'); ?>
        <section id="fonctionnalites" class="py-14 md:py-24 px-6 bg-white">
            <div class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                <div class="gs-up">
                    <span class="inline-block bg-light-blue text-primary text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">Une veille complète</span>
                    <h2 class="text-3xl md:text-4xl font-bold text-navy mb-5 leading-tight">Tout ce qu'il faut pour ne plus rater un appel d'offres.</h2>
                    <p class="text-gray-500 text-lg mb-7">De la collecte à la date limite, TenderPilot tient votre veille à jour, pendant que votre ordinateur est éteint.</p>
                    <ul class="space-y-3 mb-8">
                        <li class="flex items-start gap-3"><iconify-icon icon="lucide:check" class="text-primary text-xl mt-0.5 shrink-0"></iconify-icon><span>Mise à jour automatique trois fois par jour</span></li>
                        <li class="flex items-start gap-3"><iconify-icon icon="lucide:check" class="text-primary text-xl mt-0.5 shrink-0"></iconify-icon><span>Jours restants et couleur de chaque ligne recalculés à chaque passage</span></li>
                        <li class="flex items-start gap-3"><iconify-icon icon="lucide:check" class="text-primary text-xl mt-0.5 shrink-0"></iconify-icon><span>Aucune date inventée : sans date publiée, la ligne dit « à vérifier »</span></li>
                        <li class="flex items-start gap-3"><iconify-icon icon="lucide:check" class="text-primary text-xl mt-0.5 shrink-0"></iconify-icon><span>Plans de passation : les marchés à venir, avec leur budget estimé</span></li>
                        <li class="flex items-start gap-3"><iconify-icon icon="lucide:check" class="text-primary text-xl mt-0.5 shrink-0"></iconify-icon><span>Votre classeur reste dans votre propre compte Google</span></li>
                    </ul>
                    <a href="#pricing" class="inline-flex items-center gap-2 bg-primary text-white px-6 py-3.5 rounded-xl font-bold hover:opacity-90 transition-all">
                        Voir l'offre <iconify-icon icon="lucide:arrow-right"></iconify-icon>
                    </a>
                </div>
                <div class="relative rounded-3xl overflow-hidden min-h-[440px] md:min-h-[480px] p-5 md:p-8 flex flex-col justify-end gap-3 gs-panneau <?= $photoVeille ? '' : 'panneau-alertes' ?>">
                    <?php if ($photoVeille): ?>
                    <img src="photo-veille.webp" alt="" class="absolute inset-0 w-full h-full object-cover" loading="lazy">
                    <div class="absolute inset-0" style="background:linear-gradient(0deg,rgba(11,18,37,.55),transparent 55%)"></div>
                    <?php endif; ?>
                    <p class="relative text-[11px] font-bold uppercase tracking-widest text-white/80">Exemple d'alertes</p>
                    <div class="relative w-full max-w-[16rem] bg-navy text-white rounded-xl p-3 shadow-xl flex gap-2.5">
                        <iconify-icon icon="lucide:bell-ring" class="text-xl text-indigo-300 shrink-0 mt-0.5"></iconify-icon>
                        <div><p class="font-bold text-sm">Nouvelle opportunité</p><p class="text-xs text-slate-300">Accord-cadre, pièces de rechange pour véhicules · Ministère de la Défense · Bénin</p></div>
                    </div>
                    <div class="relative w-full max-w-[16rem] bg-white rounded-xl p-3 shadow-xl flex gap-2.5">
                        <iconify-icon icon="lucide:alarm-clock" class="text-xl text-red-600 shrink-0 mt-0.5"></iconify-icon>
                        <div><p class="font-bold text-sm text-navy">Échéance proche</p><p class="text-sm text-gray-500 leading-relaxed"><span class="inline-block rounded px-1.5 font-bold" style="background:#FFD6D6;color:#9B1C1C">URGENT</span> 3 jours restants</p></div>
                    </div>
                    <div class="relative w-full max-w-[16rem] rounded-xl p-3 shadow-xl flex gap-2.5" style="background:#D8F3DC">
                        <iconify-icon icon="lucide:calendar-check" class="text-xl shrink-0 mt-0.5" style="color:#1B5E2B"></iconify-icon>
                        <div><p class="font-bold text-sm" style="color:#1B5E2B">Ajoutée à votre Google Agenda</p><p class="text-xs" style="color:#1B5E2B">Rappels 7 jours et la veille</p></div>
                    </div>
                </div>
            </div>
        </section>

        <!-- ALERTES -->
        <section class="py-14 md:py-24 px-6 bg-white">
            <div class="max-w-7xl mx-auto">
                <div class="mb-10 md:mb-14 max-w-2xl gs-up">
                    <span class="inline-block bg-light-blue text-primary text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">Vos alertes</span>
                    <h2 class="text-3xl md:text-4xl font-bold text-navy leading-tight">Vous n'avez pas besoin de chercher. TenderPilot vous prévient.</h2>
                </div>
                <div class="grid md:grid-cols-3 gap-5 gs-cards">
                    <div class="bg-gray-50 rounded-2xl p-6 border border-gray-100 flex flex-col">
                        <div class="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center mb-5"><iconify-icon icon="lucide:mail" class="text-xl"></iconify-icon></div>
                        <h3 class="text-lg font-bold text-navy mb-2">Email</h3>
                        <p class="text-sm text-gray-500 leading-relaxed mb-5">Chaque nouveauté et chaque rappel d'échéance, directement dans votre boîte mail.</p>
                        <div class="mt-auto bg-white rounded-xl border border-gray-200 overflow-hidden">
                            <img src="email-rappel.webp" alt="Exemple d'alerte email TenderPilot" loading="lazy" class="w-full h-44 md:h-52 object-cover object-top">
                        </div>
                    </div>
                    <div class="bg-gray-50 rounded-2xl p-6 border border-gray-100 flex flex-col">
                        <div class="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center mb-5"><iconify-icon icon="lucide:send" class="text-xl"></iconify-icon></div>
                        <h3 class="text-lg font-bold text-navy mb-2">Telegram</h3>
                        <p class="text-sm text-gray-500 leading-relaxed mb-5">Les alertes urgentes sur votre téléphone, même en déplacement.</p>
                        <div class="mt-auto bg-white rounded-xl border border-gray-200 overflow-hidden">
                            <img src="telegram-alertes.webp" alt="Exemple d'alerte Telegram TenderPilot" loading="lazy" class="w-full h-44 md:h-52 object-cover object-top">
                        </div>
                    </div>
                    <div class="bg-gray-50 rounded-2xl p-6 border border-gray-100 flex flex-col">
                        <div class="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center mb-5"><iconify-icon icon="lucide:calendar-days" class="text-xl"></iconify-icon></div>
                        <h3 class="text-lg font-bold text-navy mb-2">Google Agenda</h3>
                        <p class="text-sm text-gray-500 leading-relaxed mb-5">Les échéances que vous suivez sont posées dans votre agenda, avec leurs rappels.</p>
                        <div class="mt-auto bg-white rounded-xl border border-gray-200 overflow-hidden">
                            <img src="agenda-echeance.webp" alt="Échéance posée par TenderPilot dans Google Agenda" loading="lazy" class="w-full h-44 md:h-52 object-cover object-top">
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- PRIORITY BADGES -->
        <section class="py-14 md:py-24 bg-gray-50">
            <div class="max-w-7xl mx-auto px-6">
                <div class="mb-10 max-w-2xl gs-up">
                    <span class="inline-block bg-light-blue text-primary text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">Les couleurs</span>
                    <h2 class="text-3xl md:text-4xl font-bold text-navy leading-tight">Tout n'est pas urgent. Chaque ligne dit combien de temps il reste.</h2>
                </div>
                <!-- Les six statuts du classeur, avec SES couleurs de ligne
                     (schema/columns.py, COULEURS). Texte fonce de la meme
                     teinte pour le contraste. A garder en phase. -->
                <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 gs-tuiles">
                    <div class="rounded-xl px-3 py-3 border border-black/5" style="background:#D8F3DC;color:#1B5E2B">
                        <p class="font-bold text-xs sm:text-sm tracking-wide">OUVERT</p>
                        <p class="text-[11px] sm:text-xs mt-0.5 opacity-80">plus de 15 jours</p>
                    </div>
                    <div class="rounded-xl px-3 py-3 border border-black/5" style="background:#FFF3BF;color:#7A5A00">
                        <p class="font-bold text-xs sm:text-sm tracking-wide">À SURVEILLER</p>
                        <p class="text-[11px] sm:text-xs mt-0.5 opacity-80">15 jours ou moins</p>
                    </div>
                    <div class="rounded-xl px-3 py-3 border border-black/5" style="background:#FFE0C2;color:#8A3E00">
                        <p class="font-bold text-xs sm:text-sm tracking-wide">BIENTÔT</p>
                        <p class="text-[11px] sm:text-xs mt-0.5 opacity-80">7 jours ou moins</p>
                    </div>
                    <div class="rounded-xl px-3 py-3 border border-black/5" style="background:#FFD6D6;color:#9B1C1C">
                        <p class="font-bold text-xs sm:text-sm tracking-wide">URGENT</p>
                        <p class="text-[11px] sm:text-xs mt-0.5 opacity-80">3 jours ou moins</p>
                    </div>
                    <div class="rounded-xl px-3 py-3 border border-black/5" style="background:#ECECEC;color:#4B5563">
                        <p class="font-bold text-xs sm:text-sm tracking-wide">EXPIRÉ</p>
                        <p class="text-[11px] sm:text-xs mt-0.5 opacity-80">date passée</p>
                    </div>
                    <div class="rounded-xl px-3 py-3 border border-black/5" style="background:#FFFBEA;color:#6B5B1E">
                        <p class="font-bold text-xs sm:text-sm tracking-wide">DATE À VÉRIFIER</p>
                        <p class="text-[11px] sm:text-xs mt-0.5 opacity-80">la source n'en donne pas</p>
                    </div>
                </div>
                <div class="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-center gs-cards">
                    <img src="statuts-couleurs-v2.webp" alt="Statuts colorés dans le tableau TenderPilot" loading="lazy" class="rounded-2xl border border-gray-200 bg-white w-full">
                    <div>
                        <h3 class="text-2xl font-bold text-navy mb-5">Un coup d'œil suffit.</h3>
                        <ul class="space-y-5">
                            <li class="flex gap-4">
                                <div class="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center shrink-0"><iconify-icon icon="lucide:refresh-cw" class="text-xl"></iconify-icon></div>
                                <div><p class="font-bold text-navy">Recalculé à chaque passage</p><p class="text-sm text-gray-500 leading-relaxed">Trois fois par jour, les jours restants et la couleur de chaque ligne sont remis à jour. Sans rien toucher.</p></div>
                            </li>
                            <li class="flex gap-4">
                                <div class="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center shrink-0"><iconify-icon icon="lucide:arrow-down-wide-narrow" class="text-xl"></iconify-icon></div>
                                <div><p class="font-bold text-navy">Rangé pour vous</p><p class="text-sm text-gray-500 leading-relaxed">Le plus de temps devant en haut, les échéances proches ensuite. À délai égal, la plus pertinente passe devant.</p></div>
                            </li>
                            <li class="flex gap-4">
                                <div class="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center shrink-0"><iconify-icon icon="lucide:type" class="text-xl"></iconify-icon></div>
                                <div><p class="font-bold text-navy">Écrit en toutes lettres</p><p class="text-sm text-gray-500 leading-relaxed">Le statut est aussi écrit dans sa colonne : vous pouvez filtrer dessus, et une impression en noir et blanc reste lisible.</p></div>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>

        <!-- GEOGRAPHIC COVERAGE -->
        <section class="py-14 md:py-24 px-6">
            <div class="max-w-7xl mx-auto">
                <div class="grid lg:grid-cols-2 gap-10 lg:gap-20 items-center gs-cards">
                    <div class="order-2 lg:order-1">
                        <div class="bg-light-blue rounded-3xl p-5 md:p-10 relative overflow-hidden md:aspect-square flex items-center justify-center">
                                                        <div class="relative z-10 grid grid-cols-2 gap-3 md:gap-4 w-full">
                                <div class="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-blue-50">
                                    <img src="drapeaux/bj.svg" alt="" width="36" height="24" class="w-9 h-6 rounded object-cover mb-3 ring-1 ring-black/10"><p class="text-primary font-black text-lg md:text-xl mb-1">Bénin</p>
                                    <p class="text-xs uppercase font-bold text-gray-400 leading-snug">Couverture approfondie</p>
                                </div>
                                <div class="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-blue-50">
                                    <img src="drapeaux/tg.svg" alt="" width="36" height="24" class="w-9 h-6 rounded object-cover mb-3 ring-1 ring-black/10"><p class="text-primary font-black text-lg md:text-xl mb-1">Togo</p>
                                    <p class="text-xs uppercase font-bold text-gray-400 leading-snug">National + bailleurs</p>
                                </div>
                                <div class="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-blue-50">
                                    <img src="drapeaux/ne.svg" alt="" width="36" height="24" class="w-9 h-6 rounded object-cover mb-3 ring-1 ring-black/10"><p class="text-primary font-black text-lg md:text-xl mb-1">Niger</p>
                                    <p class="text-xs uppercase font-bold text-gray-400 leading-snug">National + bailleurs</p>
                                </div>
                                <div class="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-blue-50">
                                    <img src="drapeaux/cm.svg" alt="" width="36" height="24" class="w-9 h-6 rounded object-cover mb-3 ring-1 ring-black/10"><p class="text-primary font-black text-lg md:text-xl mb-1">Cameroun</p>
                                    <p class="text-xs uppercase font-bold text-gray-400 leading-snug">National + bailleurs</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="order-1 lg:order-2">
                        <span class="inline-block bg-light-blue text-primary text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">Couverture</span>
                        <h2 class="text-3xl md:text-4xl font-bold text-navy mb-8 leading-tight">
                            Une veille pensée pour l'Afrique de l'Ouest et du Centre.
                        </h2>
                        <div class="grid grid-cols-2 gap-y-5 gap-x-6 sm:gap-x-12 mb-10">
                            <div class="flex items-start gap-2.5">
                                <img src="drapeaux/bj.svg" alt="" width="28" height="19" class="w-7 h-[19px] rounded-[3px] object-cover shrink-0 mt-0.5 ring-1 ring-black/10">
                                <div>
                                    <p class="font-semibold text-navy leading-snug">Bénin</p>
                                    <p class="text-sm text-gray-500 leading-relaxed">National + bailleurs</p>
                                </div>
                            </div>
                            <div class="flex items-start gap-2.5">
                                <img src="drapeaux/tg.svg" alt="" width="28" height="19" class="w-7 h-[19px] rounded-[3px] object-cover shrink-0 mt-0.5 ring-1 ring-black/10">
                                <div>
                                    <p class="font-semibold text-navy leading-snug">Togo</p>
                                    <p class="text-sm text-gray-500 leading-relaxed">National + bailleurs</p>
                                </div>
                            </div>
                            <div class="flex items-start gap-2.5">
                                <img src="drapeaux/ne.svg" alt="" width="28" height="19" class="w-7 h-[19px] rounded-[3px] object-cover shrink-0 mt-0.5 ring-1 ring-black/10">
                                <div>
                                    <p class="font-semibold text-navy leading-snug">Niger</p>
                                    <p class="text-sm text-gray-500 leading-relaxed">National + bailleurs</p>
                                </div>
                            </div>
                            <div class="flex items-start gap-2.5">
                                <img src="drapeaux/cm.svg" alt="" width="28" height="19" class="w-7 h-[19px] rounded-[3px] object-cover shrink-0 mt-0.5 ring-1 ring-black/10">
                                <div>
                                    <p class="font-semibold text-navy leading-snug">Cameroun</p>
                                    <p class="text-sm text-gray-500 leading-relaxed">National + bailleurs</p>
                                </div>
                            </div>
                            <div class="flex items-start gap-2.5">
                                <img src="drapeaux/bf.svg" alt="" width="28" height="19" class="w-7 h-[19px] rounded-[3px] object-cover shrink-0 mt-0.5 ring-1 ring-black/10">
                                <div>
                                    <p class="font-semibold text-navy leading-snug">Burkina Faso</p>
                                    <p class="text-sm text-gray-500 leading-relaxed">Bailleurs</p>
                                </div>
                            </div>
                            <div class="flex items-start gap-2.5">
                                <img src="drapeaux/ci.svg" alt="" width="28" height="19" class="w-7 h-[19px] rounded-[3px] object-cover shrink-0 mt-0.5 ring-1 ring-black/10">
                                <div>
                                    <p class="font-semibold text-navy leading-snug">Côte d'Ivoire</p>
                                    <p class="text-sm text-gray-500 leading-relaxed">Bailleurs</p>
                                </div>
                            </div>
                            <div class="flex items-start gap-2.5">
                                <img src="drapeaux/sn.svg" alt="" width="28" height="19" class="w-7 h-[19px] rounded-[3px] object-cover shrink-0 mt-0.5 ring-1 ring-black/10">
                                <div>
                                    <p class="font-semibold text-navy leading-snug">Sénégal</p>
                                    <p class="text-sm text-gray-500 leading-relaxed">Bailleurs</p>
                                </div>
                            </div>
                            <div class="flex items-start gap-2.5">
                                <img src="drapeaux/ml.svg" alt="" width="28" height="19" class="w-7 h-[19px] rounded-[3px] object-cover shrink-0 mt-0.5 ring-1 ring-black/10">
                                <div>
                                    <p class="font-semibold text-navy leading-snug">Mali</p>
                                    <p class="text-sm text-gray-500 leading-relaxed">Bailleurs</p>
                                </div>
                            </div>
                        </div>
                        <a href="#pricing" class="inline-flex items-center gap-2 text-primary font-bold hover:underline">
                            Voir l'offre TenderPilot
                            <iconify-icon icon="lucide:chevron-right"></iconify-icon>
                        </a>
                    </div>
                </div>
            </div>
        </section>

        <!-- AUDIENCE -->
        <section id="audience" class="py-14 md:py-24 px-6 bg-gray-50">
            <div class="max-w-7xl mx-auto">
                <div class="mb-10 md:mb-14 gs-up">
                    <span class="inline-block bg-light-blue text-primary text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">Pour qui ?</span>
                    <h2 class="text-3xl md:text-4xl font-bold text-navy">Une veille pour tous ceux qui répondent aux marchés.</h2>
                </div>
                <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 gs-cards">
                    <div class="bg-white p-6 rounded-2xl border border-gray-100">
                        <div class="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center mb-5"><iconify-icon icon="lucide:building-2" class="text-2xl"></iconify-icon></div>
                        <h4 class="text-xl font-bold text-navy mb-4">Entreprises</h4>
                        <p class="text-gray-500 text-sm leading-relaxed">
                            Développez votre activité grâce aux marchés publics et opportunités commerciales.
                        </p>
                    </div>
                    <div class="bg-white p-6 rounded-2xl border border-gray-100">
                        <div class="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center mb-5"><iconify-icon icon="lucide:microscope" class="text-2xl"></iconify-icon></div>
                        <h4 class="text-xl font-bold text-navy mb-4">Cabinets d'études</h4>
                        <p class="text-gray-500 text-sm leading-relaxed">
                            Identifiez les missions et manifestations d'intérêt pertinentes pour vos experts.
                        </p>
                    </div>
                    <div class="bg-white p-6 rounded-2xl border border-gray-100">
                        <div class="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center mb-5"><iconify-icon icon="lucide:users" class="text-2xl"></iconify-icon></div>
                        <h4 class="text-xl font-bold text-navy mb-4">ONG</h4>
                        <p class="text-gray-500 text-sm leading-relaxed">
                            Découvrez les appels à projets et les opportunités de financement pour vos programmes.
                        </p>
                    </div>
                    <div class="bg-white p-6 rounded-2xl border border-gray-100">
                        <div class="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center mb-5"><iconify-icon icon="lucide:user-check" class="text-2xl"></iconify-icon></div>
                        <h4 class="text-xl font-bold text-navy mb-4">Consultants</h4>
                        <p class="text-gray-500 text-sm leading-relaxed">
                            Centralisez votre veille et gagnez un temps précieux sur la recherche manuelle.
                        </p>
                    </div>
                </div>
            </div>
        </section>

        <!-- PRICING : une carte, deux colonnes. A gauche ce qu'on paie et le
             bouton, a droite ce qu'on recoit. Les identifiants places-* et les
             classes js-* sont lus par le script du compteur : ne pas renommer. -->
        <section id="pricing" class="py-14 md:py-24 px-6 bg-white">
            <div class="max-w-6xl mx-auto">
                <div class="mb-10 md:mb-12 text-center gs-up">
                    <span class="inline-block bg-light-blue text-primary text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">L'offre</span>
                    <h2 class="text-3xl md:text-4xl font-bold text-navy">Tout TenderPilot, payé une seule fois.</h2>
                </div>
                <div class="grid grid-cols-1 lg:grid-cols-5 rounded-3xl overflow-hidden border border-gray-200 shadow-2xl shadow-indigo-100 gs-cards">

                    <div class="lg:col-span-2 bg-primary text-white p-6 md:p-9 flex flex-col">
                        <div class="flex items-center gap-4 mb-6">
                            <img src="boite-tenderpilot.webp" alt="Le coffret TenderPilot" width="720" height="720" loading="lazy" class="w-20 h-20 object-contain drop-shadow-lg shrink-0">
                            <div>
                                <span class="inline-block bg-white/20 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest mb-1.5">Offre de lancement</span>
                                <p class="text-2xl font-extrabold leading-tight">TenderPilot</p>
                            </div>
                        </div>
                        <div class="flex items-baseline gap-2">
                            <span class="text-5xl md:text-6xl font-extrabold tabular-nums"><span class="js-prix-actuel">20 000</span></span>
                            <span class="text-xl font-bold">FCFA</span>
                        </div>
                        <p class="mt-2 text-white/80 text-sm"><s class="opacity-70">50 000 FCFA</s> · Paiement unique, sans abonnement</p>

                        <!-- PLACES -->
                        <div id="places" hidden class="mt-6 bg-white/10 border border-white/20 rounded-2xl p-4">
                            <div class="flex items-center justify-between gap-3">
                                <p class="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/85">
                                    <span class="relative flex h-2 w-2">
                                        <span class="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                        <span class="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
                                    </span>
                                    Places au prix de lancement
                                </p>
                                <p class="text-right leading-none"><span id="places-restantes" class="text-3xl font-black tabular-nums">--</span><span class="text-sm font-semibold text-white/75"> / <span id="places-total">--</span></span></p>
                            </div>
                            <div id="places-jauge" class="mt-3 h-2.5 bg-white/25 rounded-full overflow-hidden" aria-label="">
                                <div id="places-barre" class="h-full bg-white rounded-full" style="width:0%"></div>
                            </div>
                            <p class="mt-2.5 text-xs text-white/85">Ensuite, le prix passe à <strong><span class="js-prix-apres">30 000</span> FCFA</strong>.</p>
                        </div>

                        <a href="checkout" class="js-payer mt-6 flex items-center justify-center gap-2 bg-white text-primary py-4 rounded-xl text-lg font-extrabold shadow-xl hover:translate-y-[-2px] transition-all">
                            Obtenir TenderPilot <iconify-icon icon="lucide:arrow-right"></iconify-icon>
                        </a>
                        <p class="mt-4 flex items-start gap-2 text-sm text-white/90">
                            <iconify-icon icon="lucide:shield-check" class="text-lg shrink-0 mt-0.5"></iconify-icon>
                            <span><strong>Satisfait ou remboursé 30 jours</strong>, intégralement et sans justification. <a href="/terms#garantie" class="underline">Conditions</a></span>
                        </p>
                    </div>

                    <div class="lg:col-span-3 bg-white p-6 md:p-9">
                        <p class="text-lg font-bold text-navy mb-6">Tout ce qui est inclus</p>
                        <div class="grid sm:grid-cols-2 gap-x-8 gap-y-5 sm:gap-y-7">
                            <div>
                                <p class="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary mb-3"><iconify-icon icon="lucide:radar" class="text-base"></iconify-icon>La veille</p>
                                <ul class="space-y-1.5 sm:space-y-2">
                                    <li class="flex items-start gap-2.5 text-sm text-gray-700"><iconify-icon icon="lucide:check" class="text-primary text-base shrink-0 mt-0.5"></iconify-icon>Votre classeur Google Sheets, prêt à copier</li>
                                    <li class="flex items-start gap-2.5 text-sm text-gray-700"><iconify-icon icon="lucide:check" class="text-primary text-base shrink-0 mt-0.5"></iconify-icon>61 sources officielles, lues 3 fois par jour</li>
                                    <li class="flex items-start gap-2.5 text-sm text-gray-700"><iconify-icon icon="lucide:check" class="text-primary text-base shrink-0 mt-0.5"></iconify-icon>Pertinence selon vos pays et secteurs</li>
                                    <li class="flex items-start gap-2.5 text-sm text-gray-700"><iconify-icon icon="lucide:check" class="text-primary text-base shrink-0 mt-0.5"></iconify-icon>Plans de passation : les marchés à venir</li>
                                </ul>
                            </div>
                            <div>
                                <p class="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary mb-3"><iconify-icon icon="lucide:bell-ring" class="text-base"></iconify-icon>Les alertes</p>
                                <ul class="space-y-1.5 sm:space-y-2">
                                    <li class="flex items-start gap-2.5 text-sm text-gray-700"><iconify-icon icon="lucide:check" class="text-primary text-base shrink-0 mt-0.5"></iconify-icon>Email : nouveautés et rappels J-7, J-3, J-1</li>
                                    <li class="flex items-start gap-2.5 text-sm text-gray-700"><iconify-icon icon="lucide:check" class="text-primary text-base shrink-0 mt-0.5"></iconify-icon>Telegram, sur votre téléphone</li>
                                    <li class="flex items-start gap-2.5 text-sm text-gray-700"><iconify-icon icon="lucide:check" class="text-primary text-base shrink-0 mt-0.5"></iconify-icon>Google Agenda, avec ses rappels</li>
                                </ul>
                            </div>
                            <div>
                                <p class="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary mb-3"><iconify-icon icon="lucide:graduation-cap" class="text-base"></iconify-icon>Pour démarrer</p>
                                <ul class="space-y-1.5 sm:space-y-2">
                                    <li class="flex items-start gap-2.5 text-sm text-gray-700"><iconify-icon icon="lucide:check" class="text-primary text-base shrink-0 mt-0.5"></iconify-icon>Guides PDF, pas à pas</li>
                                    <li class="flex items-start gap-2.5 text-sm text-gray-700"><iconify-icon icon="lucide:check" class="text-primary text-base shrink-0 mt-0.5"></iconify-icon>Formation vidéo : 8 vidéos</li>
                                    <li class="flex items-start gap-2.5 text-sm text-gray-700"><iconify-icon icon="lucide:check" class="text-primary text-base shrink-0 mt-0.5"></iconify-icon>Support WhatsApp et groupe des acheteurs</li>
                                    <li class="flex items-start gap-2.5 text-sm text-gray-700"><iconify-icon icon="lucide:check" class="text-primary text-base shrink-0 mt-0.5"></iconify-icon>Mises à jour des sources</li>
                                </ul>
                            </div>
                            <div>
                                <p class="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary mb-3"><iconify-icon icon="lucide:gift" class="text-base"></iconify-icon>Les bonus</p>
                                <ul class="space-y-1.5 sm:space-y-2">
                                    <li class="flex items-start gap-2.5 text-sm text-gray-700"><iconify-icon icon="lucide:check" class="text-primary text-base shrink-0 mt-0.5"></iconify-icon>Configuration faite avec vous</li>
                                    <li class="flex items-start gap-2.5 text-sm text-gray-700"><iconify-icon icon="lucide:check" class="text-primary text-base shrink-0 mt-0.5"></iconify-icon>Profils métier prêts à l'emploi</li>
                                    <li class="flex items-start gap-2.5 text-sm text-gray-700"><iconify-icon icon="lucide:check" class="text-primary text-base shrink-0 mt-0.5"></iconify-icon>Checklist du dossier de soumission</li>
                                    <li class="flex items-start gap-2.5 text-sm text-gray-700"><iconify-icon icon="lucide:check" class="text-primary text-base shrink-0 mt-0.5"></iconify-icon>Modèles de lettres (Word et PDF)</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- REASSURANCE -->
        <section class="py-14 md:py-24 px-6 bg-gray-50">
            <div class="max-w-7xl mx-auto">
                <div class="mb-10 md:mb-14 max-w-2xl gs-up">
                    <span class="inline-block bg-light-blue text-primary text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">Pourquoi TenderPilot</span>
                    <h2 class="text-3xl md:text-4xl font-bold text-navy leading-tight">Payé une fois. À vous pour de bon.</h2>
                </div>
                <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 gs-cards">
                    <div class="bg-white p-6 rounded-2xl border border-gray-100">
                        <div class="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center mb-5 text-xl">
                            <iconify-icon icon="lucide:banknote"></iconify-icon>
                        </div>
                        <h3 class="text-lg font-bold mb-2 text-navy">Paiement unique</h3>
                        <p class="text-sm text-gray-500 leading-relaxed">Pas d'abonnement mensuel ou de frais cachés.</p>
                    </div>
                    <div class="bg-white p-6 rounded-2xl border border-gray-100">
                        <div class="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center mb-5 text-xl">
                            <iconify-icon icon="lucide:lock"></iconify-icon>
                        </div>
                        <h3 class="text-lg font-bold mb-2 text-navy">Vos données</h3>
                        <p class="text-sm text-gray-500 leading-relaxed">Votre classeur reste dans votre environnement Google sécurisé.</p>
                    </div>
                    <div class="bg-white p-6 rounded-2xl border border-gray-100">
                        <div class="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center mb-5 text-xl">
                            <iconify-icon icon="lucide:zap"></iconify-icon>
                        </div>
                        <h3 class="text-lg font-bold mb-2 text-navy">Automatique</h3>
                        <p class="text-sm text-gray-500 leading-relaxed">La collecte continue même lorsque votre ordinateur est éteint.</p>
                    </div>
                    <div class="bg-white p-6 rounded-2xl border border-gray-100">
                        <div class="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center mb-5 text-xl">
                            <iconify-icon icon="lucide:headphones"></iconify-icon>
                        </div>
                        <h3 class="text-lg font-bold mb-2 text-navy">Accompagnement</h3>
                        <p class="text-sm text-gray-500 leading-relaxed">Une aide à l'installation est incluse avec votre offre.</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- FAQ -->
        <section id="faq" class="py-14 md:py-24 px-6 bg-white">
            <div class="max-w-3xl mx-auto">
                <div class="text-center mb-10 md:mb-14 gs-up"><span class="inline-block bg-light-blue text-primary text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">FAQ</span><h2 class="text-3xl md:text-4xl font-bold text-navy">Questions fréquentes</h2></div>
                <div class="space-y-4">
                    <details class="gs-stagger group bg-gray-50 rounded-2xl p-6 border border-gray-100">
                        <summary class="flex items-center justify-between cursor-pointer list-none">
                            <span class="font-bold text-navy">Est-ce un abonnement ?</span>
                            <iconify-icon icon="lucide:chevron-down" class="group-open:rotate-180 transition-transform"></iconify-icon>
                        </summary>
                        <p class="mt-4 text-gray-500 text-sm leading-relaxed">
                            Non, TenderPilot est proposé avec un paiement unique. Une fois acheté, vous l'utilisez sans frais mensuels supplémentaires.
                        </p>
                    </details>
                    <details class="gs-stagger group bg-gray-50 rounded-2xl p-6 border border-gray-100">
                        <summary class="flex items-center justify-between cursor-pointer list-none">
                            <span class="font-bold text-navy">Ai-je besoin d'un ordinateur ?</span>
                            <iconify-icon icon="lucide:chevron-down" class="group-open:rotate-180 transition-transform"></iconify-icon>
                        </summary>
                        <p class="mt-4 text-gray-500 text-sm leading-relaxed">
                            L'installation initiale nécessite un ordinateur (pour configurer votre Google Sheet). Ensuite, les alertes et le suivi peuvent être consultés sur votre téléphone portable.
                        </p>
                    </details>
                    <details class="gs-stagger group bg-gray-50 rounded-2xl p-6 border border-gray-100">
                        <summary class="flex items-center justify-between cursor-pointer list-none">
                            <span class="font-bold text-navy">Quels pays sont couverts ?</span>
                            <iconify-icon icon="lucide:chevron-down" class="group-open:rotate-180 transition-transform"></iconify-icon>
                        </summary>
                        <p class="mt-4 text-gray-500 text-sm leading-relaxed">
                            Nous couvrons actuellement 8 pays : Bénin, Togo, Niger, Cameroun, Burkina Faso, Côte d'Ivoire, Sénégal et Mali, avec différents niveaux de couverture (national et/ou bailleurs internationaux).
                        </p>
                    </details>
                    <details class="gs-stagger group bg-gray-50 rounded-2xl p-6 border border-gray-100">
                        <summary class="flex items-center justify-between cursor-pointer list-none">
                            <span class="font-bold text-navy">Est-ce que TenderPilot rédige mes dossiers ?</span>
                            <iconify-icon icon="lucide:chevron-down" class="group-open:rotate-180 transition-transform"></iconify-icon>
                        </summary>
                        <p class="mt-4 text-gray-500 text-sm leading-relaxed">
                            Non. Il automatise principalement la veille et le suivi des opportunités pour que vous ne manquiez rien. La rédaction et la réponse restent à votre charge.
                        </p>
                    </details>
                    <details class="gs-stagger group bg-gray-50 rounded-2xl p-6 border border-gray-100">
                        <summary class="flex items-center justify-between cursor-pointer list-none">
                            <span class="font-bold text-navy">Est-ce que toutes les opportunités sont garanties ?</span>
                            <iconify-icon icon="lucide:chevron-down" class="group-open:rotate-180 transition-transform"></iconify-icon>
                        </summary>
                        <p class="mt-4 text-gray-500 text-sm leading-relaxed">
                            Nous surveillons les sources officielles, mais nous recommandons de toujours vérifier l'avis de publication original sur la source officielle citée avant de candidater.
                        </p>
                    </details>
                </div>
            </div>
        </section>

        <!-- FINAL CTA : fond-final.webp (immeubles a droite), texte et bouton
             a gauche pour ne pas les masquer. -->
        <section class="appel-final text-white py-16 md:py-28 px-6">
            <div class="max-w-7xl mx-auto">
                <div class="max-w-xl gs-up">
                    <span class="inline-block border border-white/20 text-indigo-200 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-5">Passez à l'action</span>
                    <h2 class="text-3xl md:text-5xl font-extrabold leading-tight mb-5">Votre prochaine opportunité est peut-être <span class="text-indigo-300">déjà publiée.</span></h2>
                    <p class="text-lg text-slate-300 mb-8">Ne perdez plus vos matinées à chercher. Laissez TenderPilot lire les sources à votre place.</p>
                    <a href="checkout" class="js-payer inline-flex items-center gap-2 bg-white text-navy px-8 py-4 rounded-xl text-lg font-bold shadow-xl hover:translate-y-[-2px] transition-all">
                        Obtenir TenderPilot <iconify-icon icon="lucide:arrow-right"></iconify-icon>
                    </a>
                    <ul class="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300">
                        <li class="flex items-center gap-2"><iconify-icon icon="lucide:check" class="text-indigo-300"></iconify-icon>Paiement unique</li>
                        <li class="flex items-center gap-2"><iconify-icon icon="lucide:check" class="text-indigo-300"></iconify-icon>Sans abonnement</li>
                        <li class="flex items-center gap-2"><iconify-icon icon="lucide:check" class="text-indigo-300"></iconify-icon><a href="/terms#garantie" class="underline decoration-dotted hover:text-white">Satisfait ou remboursé 30 jours</a></li>
                    </ul>
                </div>
            </div>
        </section>

        <!-- CTA STICKY : mobile seulement (md:hidden), apparaît après le hero. Sur ordinateur le bouton de la barre du haut suffit. -->
        <a href="checkout" id="cta-sticky"
           class="js-payer md:hidden fixed bottom-4 left-4 right-4 z-50 flex items-center justify-center gap-2 bg-primary text-white px-5 py-3.5 rounded-xl text-sm font-bold shadow-xl shadow-indigo-300/50 hover:opacity-90 transition-all duration-300 translate-y-24 opacity-0 pointer-events-none"
           aria-hidden="true" tabindex="-1">
            <iconify-icon icon="lucide:arrow-right" class="text-lg"></iconify-icon>
            Obtenir TenderPilot · <span class="js-prix-actuel">20 000</span>&nbsp;FCFA
        </a>

    </div>

<?php tp_fin(<<<'JS'
  // LIEN DE PAIEMENT CHARIOW : le bouton passe par notre checkout
  // (dossier payment/), chemin propre sans .php.
  var LIEN_CHARIOW = "checkout";

  (function () {
    if (LIEN_CHARIOW) {
      document.querySelectorAll(".js-payer").forEach(function (lien) {
        lien.setAttribute("href", LIEN_CHARIOW);
        lien.setAttribute("rel", "noopener");
      });
    }
    var annee = document.getElementById("annee");
    if (annee) annee.textContent = String(new Date().getFullYear());
  })();

  // APPARITION AU SCROLL : chaque element .reveler monte en fondu la
  // premiere fois qu'il entre dans l'ecran (IntersectionObserver, une
  // seule observation). Delais individuels via style="transition-delay".
  (function () {
    var cibles = document.querySelectorAll(".reveler");
    if (!cibles.length) return;
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      cibles.forEach(function (el) { el.classList.add("revele"); });
      return;
  }
    var observer = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (entree) {
        if (entree.isIntersecting) {
          entree.target.classList.add("revele");
          observer.unobserve(entree.target);
        }
      });
  }, { threshold: 0.15 });
    cibles.forEach(function (el) { observer.observe(el); });
  })();

  // ANIMATIONS GSAP : sections du bas de page. Les scripts CDN sont
  // charges en defer, donc l'init part a DOMContentLoaded, apres eux.
  // Si GSAP n'est pas la (CDN bloque), rien ne se passe : aucun style
  // ne cache le contenu, la page reste entierement visible.
  document.addEventListener("DOMContentLoaded", function () {
    if (typeof window.gsap === "undefined" || typeof window.ScrollTrigger === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);

    // Titres/blocs simples : montee en fondu a l'entree dans l'ecran.
    gsap.utils.toArray(".gs-up").forEach(function (el) {
      gsap.from(el, {
        y: 24, autoAlpha: 0, duration: 0.7, ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 85%", once: true }
      });
    });

    // Grilles de cartes : cascade gauche -> droite.
    gsap.utils.toArray(".gs-cards").forEach(function (grille) {
      gsap.from(grille.children, {
        y: 28, autoAlpha: 0, duration: 0.6, ease: "power2.out", stagger: 0.1,
        scrollTrigger: { trigger: grille, start: "top 85%", once: true }
      });
    });

    // Tuiles de statuts : petit zoom en serie.
    gsap.utils.toArray(".gs-tuiles").forEach(function (grille) {
      gsap.from(grille.children, {
        scale: 0.92, autoAlpha: 0, duration: 0.45, ease: "power2.out", stagger: 0.06,
        scrollTrigger: { trigger: grille, start: "top 88%", once: true }
      });
    });

    // Cartes d'alertes du panneau : entree laterale en cascade (on cible
    // les enfants .relative : l'image de fond absolute ne bouge pas).
    gsap.utils.toArray(".gs-panneau").forEach(function (panneau) {
      gsap.from(panneau.querySelectorAll(":scope > .relative"), {
        x: 36, autoAlpha: 0, duration: 0.6, ease: "power2.out", stagger: 0.12,
        scrollTrigger: { trigger: panneau, start: "top 80%", once: true }
      });
    });

    // Questions de la FAQ : chaque bloc emerge a son tour.
    gsap.utils.toArray(".gs-stagger").forEach(function (el) {
      gsap.from(el, {
        y: 18, autoAlpha: 0, duration: 0.5, ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 90%", once: true }
      });
    });
  });

  // Le CTA sticky entre en scène une fois le hero passé, pour garder
  // l'achat à portée de clic pendant toute la lecture.
  (function () {
    var cta = document.getElementById("cta-sticky");
    if (!cta) return;
    var visible = false;
    function maj() {
      var doit = window.scrollY > 600;
      if (doit === visible) return;
      visible = doit;
      cta.classList.toggle("opacity-0", !doit);
      cta.classList.toggle("translate-y-24", !doit);
      cta.classList.toggle("pointer-events-none", !doit);
      cta.setAttribute("aria-hidden", doit ? "false" : "true");
      cta.setAttribute("tabindex", doit ? "0" : "-1");
    }
    window.addEventListener("scroll", maj, { passive: true });
    maj();
  })();

  // LES PLACES DU PRIX DE LANCEMENT. Le compteur est tenu côté serveur
  // (payment/places.php, incrémenté par le webhook à chaque vente réelle)
  // et lu ici. Un seul palier : 50 places au prix de lancement ;
  // après les 50 ventes, le prix de lancement (20 000 FCFA) laisse place
  // au prix réel (30 000 FCFA). Le prix barré (50 000) ne bouge jamais.
  var PLACES_TOTAL = 50;
  var PLACES_VENDUES = 0;

  function placesPrixFCFA(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "\u202F");
  }

  // Applique à la page le prix réel courant (20 000 ou 30 000), le prix
  // d'après-lancement (30 000) et le nombre de places (50). Les éléments
  // sont marqués par une classe dédiée.
  function placesAppliquer(d) {
    var prixActuel = d.en_lancement ? d.prix_actuel : d.prix_apres;
    var txtActuel = placesPrixFCFA(prixActuel);
    var txtApres = placesPrixFCFA(d.prix_apres);
    document.querySelectorAll(".js-prix-actuel").forEach(function (el) {
      el.textContent = txtActuel;
    });
    document.querySelectorAll(".js-prix-apres").forEach(function (el) {
      el.textContent = txtApres;
    });
    document.querySelectorAll(".js-premiers").forEach(function (el) {
      el.textContent = String(d.total);
    });
  }

  (function () {
    var bloc = document.getElementById("places");
    function afficher(d) {
      var total = parseInt(d.total, 10) || PLACES_TOTAL;
      var vendues = parseInt(d.vendues, 10) || 0;
      var restantes = Math.max(0, total - vendues);
      // LE PRIX D'ABORD, LE COMPTEUR ENSUITE. Places epuisees, le bloc
      // disparait - mais le prix, lui, vient de changer : sortir ici
      // laissait la page afficher le prix de lancement pour toujours.
      placesAppliquer(d);
      if (!restantes) return;
      if (bloc) {
        document.getElementById("places-restantes").textContent = String(restantes);
        document.getElementById("places-total").textContent = String(total);
        var prises = Math.round(((total - restantes) / total) * 100);
        document.getElementById("places-jauge").setAttribute(
          "aria-label", restantes + " places restantes sur " + total + " au prix de lancement.");
        bloc.hidden = false;
        requestAnimationFrame(function () {
          document.getElementById("places-barre").style.width = Math.max(prises, 3) + "%";
        });
      }
    }
    // Lecture du compteur serveur ; repli silencieux sur PLACES_VENDUES.
    fetch("places", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        afficher({
          total: parseInt(d.total, 10) || PLACES_TOTAL,
          vendues: parseInt(d.vendues, 10) || 0,
          en_lancement: d.en_lancement,
          prix_actuel: parseInt(d.prix_actuel, 10) || 20000,
          prix_apres: parseInt(d.prix_apres, 10) || 30000,
        });
      })
      .catch(function () {
        afficher({ total: PLACES_TOTAL, vendues: PLACES_VENDUES, en_lancement: true, prix_actuel: 20000, prix_apres: 30000 });
      });
  })();
JS, ['navigation' => false]); ?>
