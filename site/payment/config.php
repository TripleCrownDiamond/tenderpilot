<?php

// =============================================================
//  Page de remerciement TenderPilot - configuration.
//  Les valeurs SE sensibles viennent du fichier .env :
//  - cles Chariow (CHARIOW_API_KEY, CHARIOW_WEBHOOK_SECRET)
//  - liens de contact et de redirection
//  Chargez ce fichier (et non .env directement) partout.
// =============================================================

require_once __DIR__ . '/env.php';

// --- Secrets Chariow (dans .env, jamais en dur ici) ---
define('CHARIOW_API_KEY',      env('CHARIOW_API_KEY', ''));
define('CHARIOW_WEBHOOK_SECRET', env('CHARIOW_WEBHOOK_SECRET', ''));

// --- Produit et redirection ---
define('PRODUIT_ID',       env('PRODUIT_ID', 'prd_n2wrx3qc'));
define('URL_REDIRECTION',  env('URL_REDIRECTION', ''));

// --- Contact et produit ---
define('NOM_PRODUIT',      env('NOM_PRODUIT', 'TenderPilot'));
define('NUMERO_WHATSAPP',  env('NUMERO_WHATSAPP', '+229 01 67 65 97 17'));
define('LIEN_WHATSAPP',    env('LIEN_WHATSAPP', 'https://wa.me/2290167659717'));
define('LIEN_GROUPE_WHATSAPP', env('LIEN_GROUPE_WHATSAPP', ''));
define('EMAIL_CONTACT',    env('EMAIL_CONTACT', 'contact@tenderpilot.store'));
define('LIEN_FICHIER',     env('LIEN_FICHIER', ''));
define('VIDEO_DEZIPPER_EMBED', env('VIDEO_DEZIPPER_EMBED', ''));
// Videos d'aide pour dezipper : une pour Windows (PC), une pour Mac.
define('VIDEO_DEZIPPER_PC',  env('VIDEO_DEZIPPER_PC', 'https://www.youtube.com/watch?v=Qv4YnL6CmRc'));
define('VIDEO_DEZIPPER_MAC', env('VIDEO_DEZIPPER_MAC', 'https://www.youtube.com/watch?v=EWB3jcsrpOc'));
define('SHEET_SHARE_APP_URL',  env('SHEET_SHARE_APP_URL', ''));
define('SHEET_SHARE_TOKEN',    env('SHEET_SHARE_TOKEN', ''));

// --- Email de confirmation d'achat ---
define('MAIL_HOST',      env('MAIL_HOST', ''));
define('MAIL_PORT',      (int) env('MAIL_PORT', '465'));
define('MAIL_USERNAME',  env('MAIL_USERNAME', ''));
define('MAIL_PASSWORD',  env('MAIL_PASSWORD', ''));
define('MAIL_FROM',      env('MAIL_FROM', ''));
define('MAIL_FROM_NAME', env('MAIL_FROM_NAME', 'TenderPilot'));

// Opérateur notifié à chaque vente (succès ou alerte d'accès)
define('EMAIL_OPERATEUR', env('EMAIL_OPERATEUR', EMAIL_CONTACT));

// --- File d'attente (webhook -> worker) ---
define('WORKER_MAX_JOBS',     (int) env('WORKER_MAX_JOBS', '5'));      // jobs par passage cron
define('WORKER_MAX_SECONDES', (int) env('WORKER_MAX_SECONDES', '55')); // garde-fou de temps par passage
define('WORKER_MAX_TENTATIVES', (int) env('WORKER_MAX_TENTATIVES', '3')); // essais avant alerte operateur
define('WORKER_DELAI_RETOUR_SEC', (int) env('WORKER_DELAI_RETOUR_SEC', '300')); // attente entre deux tentatives

// Portail acheteur : l'acheteur retrouve son produit dans ses achats
define('PORTAL_ACHETEUR_URL', env('PORTAL_ACHETEUR_URL', 'https://app.ateliat.com/auth/login?next=%2F'));

// --- Chariow (liens officiels) ---
define('LIEN_GUIDE_CHARIOW',  env('LIEN_GUIDE_CHARIOW', 'https://chariow.dev/en/guides/checkout'));
define('LIEN_PORTAL_CHARIOW', env('LIEN_PORTAL_CHARIOW', 'https://portal.chariow.com/en'));