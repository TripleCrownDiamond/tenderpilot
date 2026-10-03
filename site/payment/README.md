# TenderPilot payment (PHP + Chariow)

Achat → `checkout.php` (API Chariow, clé côté serveur) → paiement sécurisé
Chariow → après paiement, le client revient sur `thank-you.php` (page de
remerciement) ; un webhook autorise automatiquement son email.

## Architecture

```
payment/
├── .env                    # TOUTES vos valeurs (clé API, liens, vidéo...) — protégé
├── .env.example            # modèle sans secrets (à committer)
├── env.php                 # chargeur .env (pur PHP, sans dépendance) — bloqué en web
├── config.php              # lit .env et expose les constantes NOM_PRODUIT, LIEN_*...
├── clients.php             # emails autorisés à la main (pour un déblocage manuel)
├── auto-clients.json        # emails autorisés automatiquement par le webhook
├── processed-pulses.json   # historique des webhooks (anti doublon)
├── thank-you.php            # page de remerciement (verrouillée par email autorisé)
├── checkout.php             # point d'entrée achat : forme client + API Chariow
├── webhook.php              # vérifie, déduplique, ENFILE — puis LIVRE IMMÉDIATEMENT
├── worker.php               # CONSOMMATEUR de secours : traite la file en arrière-plan (cron)
├── access.php               # partage lecteur VÉRIFIÉ + autorisation des emails
├── process-order.php        # exécution d'un job successful.sale (partage + mails)
├── receipt-mail.php         # recap client + notifications opérateur (SMTP)
├── echecs-tracker.php       # journal des partages en échec (partages-en-echec.csv)
├── mails-plafond.php        # plafond horaire glissant des mails opérateurs
├── queue.php                # file d'attente sur fichiers (atomique, verrou flock)
├── compteur-places.php      # compteur des 50 places du prix de lancement
├── places.php               # /places : JSON lu par la homepage (total, prix réel...)
├── ventes-tracker.php       # journal des ventes (ventes.csv)
├── ventes.csv               # une ligne par vente réelle — lisible, bloqué en web
├── queue/                   # jobs en attente (généré)
├── processed/               # jobs terminés avec succès (généré)
├── failed/                  # jobs en échec définitif à inspecter (généré)
├── .htaccess               # bloque .env, .json, la file et le worker en web
└── README.md
```

## File d'attente : pourquoi le webhook ne fait plus le travail

Avant, le webhook partageait la feuille (curl Google, jusqu'à 15 s) et
envoyait le mail SMTP **dans la requête entrante**. À 1000 achats simultanés,
1000 requêtes bloquaient PHP/SMTP en même temps : site lent, webhooks perdus,
mails dupliqués à la réexpédition.

Désormais le webhook fait **deux choses instantanées** :

1. vérifie la signature HMAC et déduplique sur `x-pulse-delivery-id` ;
2. écrit le job (fichier JSON) dans `queue/`, puis **livre immédiatement**
   — partage vérifié + mails opérateur — dans la même requête.

Le worker (cron) ne sert plus que de **secours** : si la livraison directe
échoue de façon transitoire (perturbation réseau, HTTP ≥ 500), le job reste
en file et `worker.php` le reprend avec espacement (`WORKER_DELAI_RETOUR_SEC`).
C'est ce filet qui encaisse les pannes sans perdre ni dupliquer de vente.

### Mettre le worker en route (cron)

Le minimum accepté par Namecheap (cPanel) est **une exécution toutes les 5
minutes** (règle indiquée à la fois sur la page Cron Jobs — *"not more often
than every 5 minutes"* — et dans la base de connaissance Namecheap : *"running
cron jobs with intervals of less than 5 minutes or setting up more than 5
simultaneous cron jobs is not allowed on all shared servers"*). Le worker
traite alors un lot borné à chaque passage, et le verrou `flock` garantit
qu'aucun deux passages ne se chevauchent.

Dans **Cron Jobs** (cPanel, compte `franwawe`) :

- contrôle **Minute** : `*/5`
- commande (chemin réel vérifié sur ce serveur — la racine du site de
  `tenderpilot.store` est `/home/franwawe/tenderpilot.store`, pas
  `public_html`) :

```
/usr/local/bin/php /home/franwawe/tenderpilot.store/payment/worker.php >> /home/franwawe/tenderpilot.store/payment/worker.log 2>&1
```

L'adresse du binaire PHP est celle du champ d'exemple de cPanel
(`/usr/local/bin/php`). Si la version choisie en *MultiPHP* diffère, le
Gestionnaire de fichiers → *Paramètres* indique le chemin exact
(ex. `/opt/alt/php82/usr/bin/php`).

**Le worker est le filet de secours.** La livraison immédiate se fait dans
le webhook ; `worker.php` ne reprend que les jobs laissés en file par un
échec transitoire. À 5 jobs par passage (`WORKER_MAX_JOBS`), un gros reliquat
mettrait des heures à se vider. Pour un reliquat, montez `WORKER_MAX_JOBS`
(ex. `100`) et `WORKER_MAX_SECONDES` (ex. `240` — sous 300 s pour ne pas
chevaucher le passage suivant) : chaque passage cron vide alors un gros lot.

Test manuel :

```bash
php worker.php             # traite un lot (WORKER_MAX_JOBS), sort
php worker.php --infini    # tourne jusqu'à file vide ou butée de temps
```

Chaque job réessaie jusqu'à `WORKER_MAX_TENTATIVES` fois (espacement
`WORKER_DELAI_RETOUR_SEC`) avant de passer dans `echecs/`.

## Ce que vous devez remplir dans `.env`

| Clé | Où la trouver | Exemple |
|---|---|---|
| `CHARIOW_API_KEY` | app.chariow.com → Settings → API Keys | `sk_live_…` |
| `CHARIOW_WEBHOOK_SECRET` | Automations → Pulses → votre Pulse → Overview | `whsec_…` |
| `PRODUIT_ID` | ton bouton d'achat actuel | `prd_n2wrx3qc` |
| `URL_REDIRECTION` | l'URL publique de `thank-you.php` (HTTPS) | `https://domaine.com/thank-you` |
| `LIEN_GROUPE_WHATSAPP` | invitation au groupe WhatsApp | vide si pas créé |
| `LIEN_FICHIER` | lien du fichier livré à "copier" | vide si sur le portail |
| `VIDEO_DEZIPPER_EMBED` | URL YouTube en *embed* pour dézipper | vide → étapes texte |
| `VIDEO_DEZIPPER_PC` | lien vidéo « dézipper sur PC » (mail recap) | `https://www.youtube.com/watch?v=Qv4YnL6CmRc` |
| `VIDEO_DEZIPPER_MAC` | lien vidéo « dézipper sur Mac » (mail recap) | `https://www.youtube.com/watch?v=EWB3jcsrpOc` |
| `EMAIL_OPERATEUR` | qui reçoit le mail à chaque vente (succès/alerte) | vide → `EMAIL_CONTACT` |
| `WORKER_MAX_JOBS` | jobs max par passage du worker | `5` |
| `WORKER_MAX_SECONDES` | garde-fou de temps par passage | `55` |
| `WORKER_MAX_TENTATIVES` | essais avant alerte opérateur | `3` |
| `WORKER_DELAI_RETOUR_SEC` | attente entre deux tentatives | `300` |

## URLs propres (sans .php)

Le `.htaccess` (mod_rewrite) offre des chemins propres :

| URL publique | Fichier |
|---|---|
| `…/payment/checkout` | `checkout.php` |
| `…/payment/thank-you` | `thank-you.php` |
| `…/payment/webhook` | `webhook.php` |

Les anciennes URLs avec `.php` continuent de fonctionner.

## Brancher le bouton de la page de vente

Dans `index.html` (racine du site), constante `LIEN_CHARIOW` (tout en bas) :

```js
var LIEN_CHARIOW = "checkout";
```

Les boutons `.js-payer` pointent alors vers votre `checkout.php` (plus le lien
Chariow direct), ce qui permet la redirection vers la page de remerciement.

## Compteur de places du prix de lancement

La homepage affiche « N places restantes au prix de lancement ». Ce compteur
est tenu **côté serveur**, dans `places.json`, et incrémenté par le webhook à
chaque `successful.sale` réel. La homepage lit le JSON via `/places`
(`places.php`), qui expose : `total`, `vendues`, `restantes`,
`en_lancement`, `prix_actuel`, `prix_lancement`, `prix_apres`,
`prix_reference`.

Barème actuel :

- **50 premières places** au prix de lancement (`PRIX_LANCEMENT`,
  20 000 FCFA) ;
- à la **50ᵉ vente**, le prix devient `PRIX_APRES` (30 000 FCFA). Le prix
  barré (`PRIX_REFERENCE`, 50 000 FCFA) ne change jamais.

Le compteur ne compte **que les ventes réelles** : dédupliquées, avec un ID de
livraison. Un pulse de test et un doublon passent déjà plus haut dans le
webhook. Le compteur plafonne à 50 (le prix de lancement n'existe plus après).

`places.json` contient `{"total": 50, "vendues": N}` — on ne l'édite pas à la
main (sauf correction). Le prix réel du produit côté Chariow (le bouton de
paiement) reste **manuel** : pensez à passer le prix à 30 000 FCFA à la
50ᵉ vente, `places.json` ne le fait pas pour vous.

## Journal des ventes (ventes.csv)

Chaque vente réelle ajoute une ligne à `ventes.csv`, lisible dans un tableur
(Excel, Google Sheets). Séparateur `;`, encodage UTF-8, format :

```
date;delivery_id;sale_id;email;montant;produit
2026-09-18T00:00:00+00:00;exemple_livraison;exemple_vente;acheteur@example.com;20 000 FCFA;TenderPilot
```

Le fichier est **bloqué en web** par `.htaccess` (403) — les emails des
acheteurs ne sont jamais servis sur Internet. À télécharger par FTP pour
consulter les ventes.

## Journal des partages en échec (partages-en-echec.csv)

L'achat peut réussir pendant que le **partage du classeur** échoue : pont
Apps Script en panne, hoquet Google (page « Impossible d'ouvrir le fichier »),
email refusé par Drive. L'acheteur a payé — sa trace ne se perd jamais :
chaque échec définitif ajoute une ligne à `partages-en-echec.csv`, lisible
dans un tableur, **bloqué en web** comme `ventes.csv` (téléchargé par FTP).

```
date_echec;delivery_id;sale_id;email;motif;statut;date_resolution
2026-09-28T15:17:02+00:00;dlv_xxx;sal_xxx;client@gmail.com;Acces non partage (HTTP 200 : ERREUR:Exception: E-mail incorrect);ECHEC;
```

`statut` vaut `ECHEC` (à traiter) ou `RESOLU`. La ligne passe **automatiquement
à `RESOLU`** dès que la même vente (même `sale_id`) finit par aboutir : pulse
ressoumis depuis Chariow, reprise par le worker, ou partage fait à la main
puis vente relancée. À traiter = toute ligne encore `ECHEC` : ajoutez le
visionneur dans le classeur maître, puis ressoumettez le pulse côté Chariow
(Automations → Pulses → Retry) pour livrer le récap et clôturer la ligne.

Un échec déjà tracé n'écrit pas de seconde ligne identique : l'alerte mail,
elle, repart à chaque tentative (c'est elle qui prévient).

## Plafond des mails opérateurs (anti-rafale)

Un pic de ventes produit un pic de mails, et Namecheap plafonne l'envoi SMTP
(~30/h) sans jamais renvoyer ce que son serveur a refusé. Depuis le 2026-09-28,
les **mails opérateurs** sont soumis à un plafond glissant de
`PLAFOND_MAILS_HEURE` (20/heure, dans `mails-plafond.php`) : au-delà, ils ne
partent pas et ne sont pas marqués comme partis. Le **mail du client n'est
jamais plafonné** : il est prioritaire, et il part avant toute notification
opérateur. Chaque vente produit quand même sa ligne dans `ventes.csv` (et son
echec éventuel dans `partages-en-echec.csv`) : rien ne dépend du mail.

## Moyens de paiement affichés

L'API Chariow **ne renvoie pas** la liste des moyens de paiement (vérifié dans
la documentation du 2026-09). Le formulaire affiche donc des pastilles
indicatives par pays, relevées sur la page officielle de couverture Chariow
(« chip » dans `checkout.php`), mises à jour quand le client change de pays.
La liste exacte est présentée par Chariow au moment du paiement.

## Livraison du produit

Le produit livré est **le lien `/copy` du classeur maître Google Sheets**
(voir `data/livraison.json`, champ `lien_copie`), embarqué dans le zip
`dist/A_VENDRE/` et déposé sur Chariow. L'acheteur :

1. télécharge le zip sur le portail Chariow après paiement ;
2. ouvre `COMMENCEZ_ICI.txt` et clique le lien `/copy` ;
3. Google crée **sa copie** (script compris) — il n'a rien d'autre à faire.

**Le maître ne doit PAS être partagé publiquement.** Il reste *restreint*
(propriétaire seul). Après un `successful.sale`, le webhook ajoute
immédiatement l'**email de l'acheteur en Lecteur** sur le maître — via le pont
Apps Script (`share-sheet.gs`, déployé en *Web app* dans un **projet
autonome**). Le
lien `/copy` ne fonctionne **que pour la personne ayant cet accès** : un lien
copié à un ami qui n'a pas payé n'ouvre rien. C'est le modèle qui empêche la
redistribution.

**L'accès est vérifié, pas supposé.** `donnerAccesFeuille()` lit la réponse
du pont (`HTTP 200` + corps `OK`). Le récap client ne part **que si** l'accès
est réellement en place ; sinon, l'opérateur reçoit une alerte
(`notifierOperateurEchec`) avec le motif (AUTH_FAIL, EMAIL_INVALIDE,
MAITRE_INTROUVABLE, CURL_ERREUR…) et l'action à faire — débloquer l'email à la
main dans `clients.php` et partager la feuille.

### Mise en place du pont (une fois)

**Projet AUTONOME obligatoire** — pas le projet du classeur maître :

- Un Web app *lié* au classeur ne peut pas utiliser `getActiveSpreadsheet()`
  (méthodes de conteneur indisponibles en contexte Web app), il doit passer
  par `SpreadsheetApp.openById()`, qui exige le scope **`spreadsheets`** plein.
- Le manifeste du produit (`apps_script/appsscript.json`) ne déclare que
  `spreadsheets.currentonly` : **on ne l'élargit pas**. Le pont vit donc dans
  son propre projet avec son propre manifeste.

1. `https://script.google.com` → **Nouveau projet** (autonome).
2. Dans l'éditeur : **Paramètres du projet → Paramètre → Afficher le fichier
   manifeste `appsscript.json`**. Collez-y le contenu de
   `share-appsscript.json` (il déclare `https://www.googleapis.com/auth/spreadsheets`).
3. Créez un fichier `Code.gs` et collez le contenu de `share-sheet.gs` ;
   `SPREADSHEET_ID` est déjà renseigné (ID du maître).
4. *Deploy → New deployment → Web app* (`Execute as: Me`, `Who has access: Anyone`).
   **Autorisez** : le consentement demandera l'accès à vos feuilles de calcul
   (scope `spreadsheets`). Copiez l'URL de déploiement (`/exec`).
5. Dans `.env` : `SHEET_SHARE_APP_URL` = cette URL, `SHEET_SHARE_TOKEN` = la
   même valeur que `TOKEN_PARTAGE` dans le script.
6. Refusez le partage public du maître : *Partager → Accès général → Limité*.
7. Testez : ouvrez l'URL `/exec?token=...&email=votre@email` dans le navigateur
   → `OK` ; avec un 2ᵉ compte Google sans accès, le `/copy` doit échouer ;
   après un achat réel, l'email de ce compte doit pouvoir copier.

## Tester en local

```bash
php -S 127.0.0.1:8899          # depuis payment/
# Ouvre http://127.0.0.1:8899/checkout.php (achat)
# et http://127.0.0.1:8899/ (page de remerciement)
```

- **test de l'API** : clé valide + `GET /v1/store`, puis un vrai checkout
  (`redirect_url` → votre URL). Le paiement de test est réel (pas de sandbox).
- **test du webhook** : Automations → Pulses → Send test pulse →
  vérifier `OK` et que rien n'est écrit (test pulse = ignoré). Pour un vrai
  `successful.sale` : le webhook répond `OK`, la vente est livrée immédiatement
  (partage + mails), le compteur de places est incrémenté (`/places`),
  une ligne est ajoutée à `ventes.csv`, et le job est archivé dans
  `processed/` (ou repris par le worker s'il a échoué de façon transitoire —
  voir la file d'attente plus haut).

## Sécurité

- La clé vit dans `.env`, jamais dans le code ni dans le navigateur.
- Le `.env` et les `.json` sont bloqués par `.htaccess` et `.gitignore`.
- La file d'attente (`queue/`, `processed/`, `failed/`), le verrou et le
  worker sont bloqués en web par `.htaccess`.
- Le webhook vérifie la signature HMAC (`x-chariow-signature`) avant d'agir.
- Ne mettez jamais la clé dans `checkout.php` côté client : tout l'appel API
  se fait côté serveur.