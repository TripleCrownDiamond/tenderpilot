# Site TenderPilot — tout en un dossier

Dossier unique et cohérent contenant **la page de vente** et **toute
l'architecture de paiement** : un seul déploiement, les liens sont relatifs,
rien ne pointe ailleurs.

## Contenu

| Emplacement | Rôle |
|---|---|
| `index.html` | La page de vente (bouton « Obtenir TenderPilot » → `/checkout` via `.htaccess`) |
| `legal/terms.html`, `legal/privacy.html` | Pages légales |
| `*.webp`, `*.jpg`, `*.png` | Images de la page de vente |
| `payment/` | **Architecture de paiement (PHP)** : voir son README |

## Parcours client

```
index.html (page de vente)
   └─ bouton → /checkout              (formulaire client → payment/checkout.php)
        └─ API Chariow (clé du serveur, dans .env)
             └─ paiement sécurisé Chariow
                  └─ retour → /thank-you (page de remerciement)
                       └─ webhook successful.sale → email autorisé automatiquement
```

Le dossier `payment/` n'apparaît jamais dans l'URL : `.htaccess` expose les
chemins propres `/checkout`, `/thank-you` et `/webhook`, et redirige en 301
les anciennes URLs françaises (`/remerciement`, `/mentions-legales`,
`/conditions-de-vente`).

## Déploiement

- **Hébergeur PHP + Apache** (tout le dossier) : c'est ici que ça s'exécute.
  Le `.env` et les `.json` sont bloqués par `payment/.htaccess`.
- Vercel/statique : **ne convient pas** — les `.php` ne s'exécutent pas.

## À régler avant la mise en ligne

1. `payment/.env` : `CHARIOW_API_KEY`, `CHARIOW_WEBHOOK_SECRET`,
   `URL_REDIRECTION` (URL propre : `https://tenderpilot.store/thank-you`),
   le groupe WhatsApp, la vidéo.
2. Tableau des prix et compteur de places de `index.html` selon la vente.
3. Vérifier que le bouton pointe bien sur `/checkout`
   (constante `LIEN_CHARIOW` en bas de `index.html`).

Ce dossier est la consolidation de l'ancien doublon `page-vente/` (supprimé),
enrichie de l'architecture de paiement.
## Styles de la page de vente (`tailwind.css`)

`index.php` charge `tailwind.css`, **compilé** — plus le CDN de Tailwind,
qui est un outil de développement. Après avoir ajouté ou changé des classes
dans `index.php`, recompilez (Tailwind 3.4, sans configuration de thème) :

```bash
npx tailwindcss@3.4 --content ./index.php -o ./tailwind.css --minify
```

Une classe absente de `tailwind.css` ne lève aucune erreur : elle ne fait
simplement rien. Recompilez à chaque modification de la page.
