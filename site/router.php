<?php
// Routeur local pour `php -S` : reproduit les routes propres de .htaccess
// (sans Apache, les règles de réécriture n'existent pas). Côté serveur,
// le compte réel vient de payment/places.php via /places.
// Usage :  php -S localhost:8080 router.php
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

$routes = [
    '/terms'      => 'legal/terms.php',
    '/privacy'    => 'legal/privacy.php',
    '/disclaimer' => 'legal/disclaimer.php',
    '/checkout'   => 'payment/checkout.php',
    '/thank-you'  => 'payment/thank-you.php',
    '/webhook'    => 'payment/webhook.php',
    '/places'     => 'payment/places.php',
];

if (isset($routes[$uri])) {
    require __DIR__ . '/' . $routes[$uri];
    return true;
}

// Fichier statique déjà présent a cote de la page : on le sert tel quel.
if ($uri !== '/' && is_file(__DIR__ . $uri)) {
    return false;
}

// Sinon la page d'accueil.
require __DIR__ . '/index.php';
return true;