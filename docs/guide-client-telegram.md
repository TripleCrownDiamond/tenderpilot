# Recevoir vos alertes sur Telegram

> **Cette configuration existe en vidéo**, huit minutes, montrée pas à pas : {video_05}

Un email se perd dans une boîte pleine. Une notification Telegram arrive sur le téléphone, et pour une échéance à vingt-quatre heures, cela change tout.

Ce canal est facultatif et gratuit. Comptez dix minutes, une seule fois. Il vous faut deux informations : **le jeton d'un bot** et **l'identifiant de la discussion** qui recevra les alertes.

## 1. Créer votre bot

Un bot Telegram est un compte que votre classeur utilise pour vous écrire. Il se crée en trois messages.

1. Dans Telegram, cherchez **@BotFather** et ouvrez la discussion.
2. Envoyez `/newbot`.
3. BotFather demande **un nom** : ce qui s'affichera en haut de la discussion. `TenderPilot` convient.
4. Il demande ensuite **un nom d'utilisateur**. Les règles sont strictes : de 5 à 32 caractères, lettres latines, chiffres et tirets bas seulement, et il **doit finir par `bot`** — par exemple `veille_marches_bot`. Il n'est plus modifiable ensuite, choisissez-le bien.
5. BotFather répond avec un **jeton**, de la forme `110201543:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw`.

> **Ce jeton est un mot de passe.** Quiconque l'a peut écrire à votre place. Ne le publiez jamais, ne l'envoyez pas dans un groupe, et ne le laissez pas apparaître sur une capture d'écran de votre onglet CONFIG. S'il a fui : `/revoke` chez BotFather, et collez le nouveau jeton dans CONFIG.

## 2. Trouver l'identifiant de la discussion

Le jeton dit **qui écrit**. L'identifiant dit **à qui**. Vous avez deux façons de l'obtenir.

### Pour vous écrire à vous-même

**La méthode sûre, avec votre propre bot :**

1. Ouvrez la discussion avec **votre bot** (BotFather vous en donne le lien, `t.me/votre_bot`) et envoyez-lui `/start`. Cette étape est obligatoire : un bot ne peut pas écrire le premier à quelqu'un qui ne lui a jamais parlé.
2. Dans un navigateur, ouvrez cette adresse, en remplaçant `VOTRE_JETON` :

   `https://api.telegram.org/botVOTRE_JETON/getUpdates`

3. Cherchez dans la réponse `"chat":{"id":123456789`. Ce nombre est votre identifiant.
4. Fermez l'onglet : cette adresse contient votre jeton.

**La méthode rapide :** écrivez à **@userinfobot**, qui répond votre identifiant. Vous devez quand même envoyer `/start` à votre bot, sans quoi il ne pourra pas vous écrire.

### Pour un groupe d'équipe

1. Créez le groupe et ajoutez-y votre bot.
2. Envoyez un message dans le groupe, puis ouvrez la même adresse `getUpdates`.
3. L'identifiant d'un groupe est **négatif** : `-1001234567890`. Recopiez-le avec son signe moins.

> Par défaut, un bot ne voit pas tous les messages d'un groupe : c'est le mode confidentialité de Telegram. Pour envoyer des alertes, cela n'a aucune importance — votre bot parle, il n'a pas besoin de lire. Si `getUpdates` ne montre rien, nommez le bot administrateur du groupe, ou désactivez le mode confidentialité avec `/setprivacy` chez BotFather.

## 3. Régler le classeur

Onglet **CONFIG**, colonne `Valeur` :

| Clé | Valeur |
|---|---|
| `SEND_TELEGRAM` | `true` |
| `TELEGRAM_TOKEN` | le jeton de BotFather |
| `TELEGRAM_CHAT_ID` | l'identifiant trouvé à l'étape 2 |

Puis **TenderPilot > Tester la notification Telegram**. Un message de test doit arriver dans la seconde. Le menu vous dit ce qui s'est passé.

## Ce qui arrive ensuite

Les alertes Telegram suivent exactement les mêmes règles que les emails : mêmes déclenchements, et une opportunité ne vous écrit jamais deux fois pour la même raison.

| En-tête du message | Quand |
|---|---|
| `Nouvelle opportunite` | l'annonce vient d'entrer dans votre tableau |
| `Echeance dans 7 jours` | il reste sept jours |
| `URGENT - echeance proche` | il reste trois jours |
| `DERNIER RAPPEL - echeance demain` | il reste un jour |
| `Opportunite expiree` | si vous avez activé `SEND_EXPIRED` |

Chaque message tient en quelques lignes : l'intitulé, l'organisation et le pays, l'échéance avec le nombre de jours restants, et le lien de l'avis. Le détail est à un clic, sur la source officielle.

Quand une collecte ramène beaucoup de nouveautés d'un coup, elles partent en **un seul message** : les dix plus pertinentes listées, puis « et N autres ».

**Le rythme des deux canaux se règle séparément.** Google ne laisse envoyer que cent emails par jour à une adresse ordinaire, alors que Telegram n'a pas de quota journalier. D'où `MAX_TELEGRAM_PAR_EXECUTION`, dans CONFIG : **`0` veut dire aucune limite**, ce qui est la valeur livrée. Une alerte déjà partie par email ne repart pas sur Telegram, et l'inverse est vrai aussi.

**Vous pouvez vous passer complètement des emails** : laissez `NOTIFICATION_EMAIL` vide et gardez Telegram seul.

## Que faire si

**« Telegram n'est pas configuré »** au test : l'une des trois clés est vide, ou `SEND_TELEGRAM` n'est pas à `true`.

**« chat not found »** : l'identifiant est faux, ou vous n'avez jamais envoyé `/start` à votre bot. Refaites l'étape 2.

**« bot was blocked by the user »** : vous avez bloqué le bot dans Telegram. Débloquez-le dans la discussion.

**HTTP 401** : le jeton est faux ou révoqué. Recopiez-le depuis BotFather, sans espace avant ni après.

**Le test passe, mais aucune alerte ne suit.** C'est normal tant qu'aucune nouveauté n'est arrivée. Regardez l'onglet LOGS après une exécution : il dit ce qui est parti, et sur quel canal.

**Vous voulez arrêter.** Mettez `SEND_TELEGRAM` à `false`. Le reste du produit continue sans rien changer.
