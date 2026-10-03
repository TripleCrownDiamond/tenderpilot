<?php
header('Content-Type: text/plain; charset=utf-8');
$servername = $_SERVER['SERVER_NAME'] ?? '?';
echo "SERVER_NAME: $servername\n";
echo "HTTP_CF_CONNECTING_IP: " . ($_SERVER['HTTP_CF_CONNECTING_IP'] ?? '(vide)') . "\n";
echo "HTTP_X_FORWARDED_FOR: " . ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? '(vide)') . "\n";
echo "HTTP_X_REAL_IP: " . ($_SERVER['HTTP_X_REAL_IP'] ?? '(vide)') . "\n";
echo "REMOTE_ADDR: " . ($_SERVER['REMOTE_ADDR'] ?? '(vide)') . "\n";
echo "HTTP_HOST: " . ($_SERVER['HTTP_HOST'] ?? '(vide)') . "\n";
echo "HTTPS: " . ($_SERVER['HTTPS'] ?? '(vide)') . "\n";