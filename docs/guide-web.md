# TenderPilot - application web

> **ETAT AU 2026-09-02 : cette application n'est pas encore livrable.**
>
> Le moteur est complet et teste - collecte, deduplication, deadlines,
> notifications, classement intelligent : 107 tests passent. Mais trois
> pieces de l'application manquent, et sans elles rien ne tourne
> automatiquement :
>
> | Piece | Etat |
> |-------|------|
> | `prisma/schema.prisma` | present |
> | `prisma/seed.ts` | **absent** - `npm run db:seed` echouerait |
> | `src/app/api/run/route.ts` | **absent** - le cron appelle une page qui n'existe pas |
> | `scripts/collecte.ts` | **absent** |
>
> **Vendez la version Google Sheets.** Elle, elle fonctionne de bout en bout.
> Ce guide decrit la cible, pas l'etat actuel. Les sections marquees
> **[A VENIR]** ne peuvent pas encore etre suivies.

La meme collecte que le classeur Google Sheets, mais dans une application
que vous mettez en ligne. Meme catalogue de sources, memes regles de
deadline, memes emails.

```
SOURCES -> COLLECTE -> DEDUPLICATION -> BASE DE DONNEES
        -> DEADLINE -> ALERTES -> EMAIL
```

## Lequel des deux choisir

| Vous voulez... | Prenez |
|----------------|--------|
| ne rien heberger, tout garder dans Google Drive | le classeur |
| partager l'acces a plusieurs personnes | l'application web |
| trier, filtrer et retrouver vite dans beaucoup d'annonces | l'application web |
| que ca marche en quinze minutes, sans compte technique | le classeur |

Les deux lisent le meme catalogue. Passer de l'un a l'autre ne fait perdre
aucune source.

## Ce qu'il faut avant de commencer

Trois comptes, tous avec une offre gratuite suffisante pour demarrer :

| Service | A quoi il sert | Offre gratuite |
|---------|----------------|----------------|
| **Vercel** | heberge l'application et declenche la collecte | oui |
| **Neon** ou **Supabase** | la base de donnees Postgres | oui |
| **Resend** | l'envoi des emails | 100 emails par jour |

Comptez une heure la premiere fois.

## 1. Creer la base de donnees

1. Ouvrez un compte sur Neon ou Supabase.
2. Creez un projet, region **Europe** de preference : c'est la plus proche
   de l'Afrique de l'Ouest, et la latence s'en ressent.
3. Copiez la **chaine de connexion**. Elle ressemble a ceci :

```
postgresql://utilisateur:motdepasse@hote.neon.tech/basededonnees?sslmode=require
```

Gardez-la de cote : c'est la valeur de `DATABASE_URL`.

> Cette chaine contient un mot de passe. Ne la mettez jamais dans un email,
> un document partage ou un depot de code.

## 2. Creer la cle d'envoi d'emails

1. Ouvrez un compte sur Resend.
2. Ajoutez votre domaine et suivez la verification DNS. Sans domaine
   verifie, vos emails partiront mais finiront souvent en indesirables.
3. Creez une **API key**. C'est la valeur de `RESEND_API_KEY`.
4. Notez l'adresse d'expedition, par exemple `alertes@votredomaine.bj`.
   C'est la valeur de `EMAIL_EXPEDITEUR`.

## 3. Mettre l'application en ligne

1. Importez le dossier `web/` dans un nouveau projet Vercel.
2. Dans **Settings > Environment Variables**, renseignez les quatre valeurs :

| Variable | Valeur | Si elle manque |
|----------|--------|----------------|
| `DATABASE_URL` | la chaine de connexion Postgres | rien n'est enregistre |
| `RESEND_API_KEY` | la cle Resend | les emails sont ecrits dans les journaux au lieu d'etre envoyes |
| `EMAIL_EXPEDITEUR` | l'adresse d'expedition | Resend refuse l'envoi |
| `CRON_SECRET` | une phrase longue, inventee par vous | la collecte automatique reste ouverte aux appels exterieurs |

3. Lancez le deploiement.
4. Preparez la base :

```
npm run db:push
```

`db:push` cree les tables.

> **[A VENIR]** `npm run db:seed`, qui doit verser le catalogue de sources,
> **echoue aujourd'hui** : `prisma/seed.ts` n'existe pas encore. Le catalogue
> est bien present dans `src/data/sources-defaut.ts`, mais rien ne l'ecrit
> encore en base.

## 4. Verifier que tout est branche

Ouvrez l'application. Le **tableau de bord** affiche trois lignes
d'installation. Les trois doivent etre en **PRET**.

Une ligne en **A FAIRE** nomme la variable manquante : ajoutez-la dans
Vercel, redeployez, rechargez la page.

## 5. La collecte automatique

> **[A VENIR]** `vercel.json` declare bien trois passages par jour - 8h, 13h
> et 18h **heure UTC**, soit 9h, 14h et 19h a Cotonou. Mais la page appelee,
> `/api/run`, **n'existe pas encore** : le cron rend 404 trois fois par jour.
>
> A titre de comparaison, le classeur Google Sheets se declenche a 8h, 13h et
> 18h **heure locale**, et sa collecte fonctionne.

Une fois la route ecrite, chaque passage :

Chaque passage :

1. lit les sources actives ;
2. ecarte ce qui est deja connu ;
3. recalcule les jours restants sur TOUTES les opportunites suivies, meme
   celles qui n'ont pas bouge ;
4. envoie les emails qui n'ont pas encore ete envoyes.

Une source en panne est journalisee et les autres continuent. Une seule
source qui ne repond plus n'arrete jamais la collecte.

## 6. Lire le tableau de bord

**Notifications.** Ce qui demande votre attention aujourd'hui, classe du
plus pressant au moins pressant :

| Niveau | Ce que ca veut dire |
|--------|---------------------|
| **Urgent** | echeance dans 3 jours ou moins |
| **Bientot** | echeance dans 4 a 7 jours |
| **Expire** | echeance passee depuis moins d'une semaine |
| **A verifier** | aucune echeance lue : ouvrez l'avis officiel |

Les emails utilisent **exactement les memes seuils**. Mais ils ne font pas
la meme chose, et c'est voulu :

- un **email** est un evenement. Il part une fois, puis l'opportunite est
  marquee pour ne pas vous relancer.
- le **tableau de bord** est un etat. Il montre la situation a l'instant ou
  vous le regardez. Une echeance a 2 jours y reste affichee tant qu'elle est
  a 2 jours, meme si l'email est deja parti.

Autrement dit : vous ne pouvez pas rater une echeance parce que vous avez
efface un email.

## 7. Recevoir les alertes ailleurs que par email

En plus des emails. Un email se perd dans une boite deja pleine ; une
notification Telegram arrive sur le telephone, et pour une echeance a
vingt-quatre heures cela change tout.

1. Dans Telegram, ecrivez a **@BotFather**, envoyez `/newbot` et suivez les
   questions. Il vous donne un **jeton**.
2. Ecrivez a **@userinfobot** : il vous donne votre **identifiant de salon**.
   Pour un groupe, ajoutez-y d'abord votre bot.
3. Ajoutez trois variables dans Vercel :

| Variable | Valeur |
|----------|--------|
| `SEND_TELEGRAM` | `true` |
| `TELEGRAM_TOKEN` | le jeton donne par @BotFather |
| `TELEGRAM_CHAT_ID` | votre identifiant de salon |

4. Redeployez.

> **Le jeton permet d'ecrire a votre place.** Traitez-le comme un mot de
> passe : jamais dans un email, jamais dans un document partage.

### Et la notification push, qui ne demande rien

Un troisieme canal : **ntfy**. Aucun compte a creer. Installez
l'application ntfy, abonnez-vous a un sujet - **long et difficile a
deviner**, sur le serveur public un sujet n'est pas un secret - puis
ajoutez deux variables :

| Variable | Valeur |
|----------|--------|
| `SEND_NTFY` | `true` |
| `NTFY_SUJET` | le sujet choisi, par exemple `tenderpilot-benin-4f2a9c` |

`NTFY_SERVEUR` n'est utile que si vous hebergez votre propre ntfy.

### Ce que les trois canaux partagent, et ce qu'ils ne partagent pas

Ils partagent leurs regles de **declenchement** : une opportunite ne vous
previent jamais deux fois par le meme canal.

Tout le reste leur est propre.

- Si l'un tombe, les autres partent quand meme.
- **Chacun a son plafond** : `MAX_EMAILS_PAR_EXECUTION`,
  `MAX_TELEGRAM_PAR_EXECUTION`, `MAX_NTFY_PAR_EXECUTION`. Utile, parce que
  l'email est limite a 100 destinataires par jour la ou un salon Telegram
  ou un telephone n'ont pas de quota.
- **Chacun a sa memoire.** Telegram peut avoir tout recu aujourd'hui
  pendant que l'email rattrape sur trois passages, sans jamais rien
  envoyer deux fois.

Vous pouvez n'utiliser aucun email : laissez `NOTIFICATION_EMAIL` vide.

Les messages Telegram et push sont volontairement courts - titre, echeance,
lien - parce qu'on les lit sur un telephone. Le detail reste a un clic, sur
la source officielle.

## 8. La page Sources

Elle liste tout ce qui est surveille, avec trois filtres : **type**,
**secteur** et **mode de lecture**.

Le mode de lecture dit ce qui peut tomber en panne :

| Mode | Solidite |
|------|----------|
| **API** | un contrat : ne casse pas quand le site change d'apparence |
| **RSS** | un format standard, stable, mais pauvre en informations |
| **Page web** | une lecture de la mise en page : casse le jour ou le site est refait |

La colonne Verification porte la date du dernier controle et ce qui a ete
trouve ce jour-la.

## 9. Ce que l'application ne fait pas

- **Elle ne remplit pas les dossiers.** Elle vous fait gagner la recherche,
  pas la redaction.
- **Elle n'invente aucune date.** Si la source n'ecrit pas d'echeance, la
  colonne reste vide. Une date devinee vous ferait manquer un depot.
- **Elle ne se connecte a aucun portail exigeant un identifiant.** Les
  sources qui demandent un compte, un captcha ou un navigateur pilote ne
  sont pas collectees. C'est un choix : ces collectes cassent en permanence
  et donneraient une fausse impression de couverture.
- **Elle ne garantit pas l'exhaustivite.** Verifiez toujours l'avis officiel
  avant de candidater.

## Que faire si

**Le tableau de bord reste vide apres un deploiement.** La collecte n'a pas
encore tourne. Attendez le prochain passage, ou declenchez-en un.

**Une source ne remonte plus rien.** Regardez les journaux : une source en
`ERROR` est signalee avec sa cause. Un code `403` isole vient souvent d'une
limitation de debit du site, et le passage suivant repasse.

**Les emails ne partent pas.** Verifiez `RESEND_API_KEY` et
`EMAIL_EXPEDITEUR` dans Vercel, puis que le domaine est bien verifie chez
Resend.

**Une echeance affichee est fausse.** Elle vient de la source, telle quelle.
Ouvrez l'avis officiel : c'est lui qui fait foi, toujours.
