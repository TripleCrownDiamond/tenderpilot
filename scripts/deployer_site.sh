#!/bin/sh
# Envoie les fichiers du site modifies sur l'hebergement Namecheap
# (racine /home/franwawe/tenderpilot.store), sans toucher aux donnees du
# serveur : .env, places.json, ventes.csv, auto-clients.json, la file.
#
# Le mot de passe est demande par lftp, dans votre terminal : il n'est
# jamais ecrit dans ce fichier ni dans l'historique.
#
#   sh scripts/deployer_site.sh                 # SFTP (port 21098, Namecheap)
#   PROTO=ftp sh scripts/deployer_site.sh       # FTP si SSH n'est pas active
#   PROTO=ftp UTILISATEUR=nom@tenderpilot.store RACINE=/ sh scripts/deployer_site.sh
#                                               # compte FTP cPanel (arrive dans le site)
#   SERVEUR=ftp.exemple.com:21 ...              # serveur FTP donne par l'hebergeur
set -e
# Les acces (et le mot de passe) viennent de scripts/.env.deploiement s'il
# existe ; les variables passees en ligne de commande restent prioritaires.
ENV_DEPLOIEMENT="$(dirname "$0")/.env.deploiement"
if [ -f "$ENV_DEPLOIEMENT" ]; then
  _P="$PROTO"; _S="$SERVEUR"; _U="$UTILISATEUR"; _R="$RACINE"
  . "$ENV_DEPLOIEMENT"
  [ -n "$_P" ] && PROTO="$_P"; [ -n "$_S" ] && SERVEUR="$_S"
  [ -n "$_U" ] && UTILISATEUR="$_U"; [ -n "$_R" ] && RACINE="$_R"
fi
cd "$(dirname "$0")/../site"

UTILISATEUR="${UTILISATEUR:-franwawe}"
PROTO="${PROTO:-sftp}"
if [ -n "$SERVEUR" ]; then
  HOTE="$PROTO://$SERVEUR"
elif [ "$PROTO" = "sftp" ]; then
  HOTE="sftp://tenderpilot.store:21098"
else
  HOTE="ftp://ftp.tenderpilot.store"
fi
RACINE="${RACINE:-/home/franwawe/tenderpilot.store}"

FICHIERS=".htaccess index.php commun.php tailwind.css agenda-echeance.webp boite-tenderpilot.webp partage-tenderpilot.jpg hero-classeur.webp photo-veille.webp fond-final.webp
logos/banque-mondiale.svg logos/afd.svg logos/union-europeenne.svg logos/pnud.svg logos/unicef.svg logos/giz.svg logos/enabel.webp logos/bceao.svg logos/fondation-gates.svg logos/wellcome.svg logos/plan-international.svg logos/agra.svg logos/sbee.webp
drapeaux/bj.svg drapeaux/tg.svg drapeaux/ne.svg drapeaux/cm.svg drapeaux/bf.svg drapeaux/ci.svg drapeaux/sn.svg drapeaux/ml.svg
legal/privacy.php legal/terms.php legal/disclaimer.php
payment/checkout.php payment/thank-you.php payment/.htaccess payment/compteur-places.php payment/places.php payment/sync-places.php payment/echecs-tracker.php payment/mails-plafond.php payment/webhook.php payment/worker.php payment/queue.php payment/access.php payment/process-order.php payment/receipt-mail.php payment/config.php payment/env.php payment/ventes-tracker.php payment/clients.php"

for f in $FICHIERS; do
  [ -f "$f" ] || { echo "Manquant : site/$f"; exit 1; }
  case "$f" in *.php) php -l "$f" >/dev/null ;; esac
done

COMMANDES="set sftp:auto-confirm yes; set ftp:ssl-allow yes; set ssl:verify-certificate no; cd $RACINE; pwd; mkdir -p -f logos; mkdir -p -f drapeaux; mkdir -p -f legal;"
for f in $FICHIERS; do
  COMMANDES="$COMMANDES put -O $(dirname "$f") $f;"
done
COMMANDES="$COMMANDES bye"

echo "Envoi vers $HOTE ($RACINE) en tant que $UTILISATEUR..."
if [ -n "$FTP_MOT_DE_PASSE" ]; then
  # Fichier de commandes temporaire (droits 600), supprime a la sortie :
  # le mot de passe n'apparait ni dans la ligne de commande ni dans la
  # liste des processus. La commande "user" le prend entre apostrophes,
  # ce qui laisse passer % # , et les espaces.
  CMD=$(mktemp "${TMPDIR:-/tmp}/tp-lftp.XXXXXX")
  trap 'rm -f "$CMD"' EXIT INT TERM
  chmod 600 "$CMD"
  MDP_ECHAPPE=$(printf '%s' "$FTP_MOT_DE_PASSE" | sed "s/'/'\\\\''/g")
  {
    printf 'open %s\n' "$HOTE"
    printf "user '%s' '%s'\n" "$UTILISATEUR" "$MDP_ECHAPPE"
    printf '%s\n' "$COMMANDES"
  } > "$CMD"
  lftp -f "$CMD"
else
  lftp -u "$UTILISATEUR" -e "$COMMANDES" "$HOTE"
fi
echo "Termine. Verifiez https://tenderpilot.store/ et /checkout."
