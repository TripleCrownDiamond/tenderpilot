# Vos échéances dans Google Agenda

> **Cette configuration existe en vidéo**, trois minutes : {video_06}

C'est le réglage le plus utile du produit, et celui auquel on pense le moins.

Un email, un message Telegram, une notification : trois façons de vous interrompre. L'agenda, lui, ne vous interrompt pas — **il organise**. Vos dates limites apparaissent dans le calendrier de votre téléphone, à leur place, des semaines à l'avance, et Google se charge des rappels.

## Le principe : vous choisissez, le classeur pose

**Tout n'est pas posé, et c'est voulu.** Votre tableau ramène des centaines d'avis ; les verser tous dans votre agenda le rendrait inutilisable en une semaine. Seules entrent les lignes que **vous** avez marquées.

Une échéance est posée quand les trois conditions sont réunies :

1. la colonne **Suivi** de la ligne porte `OUI` ;
2. la ligne a une **Deadline** ;
3. elle n'a pas déjà été posée.

La colonne Suivi est la seule que vous remplissez dans tout le classeur. Tout le reste est écrit par le script. Celle-là est votre décision, et elle commande votre agenda.

## Régler, en trois minutes

1. Onglet **CONFIG** : mettez `SEND_AGENDA` à `true`.
2. Réglez `AGENDA_RAPPELS_JOURS` si `7, 1` ne vous convient pas. C'est le nombre de jours avant l'échéance où Google vous préviendra, séparés par des virgules. Les valeurs vont de 0 à 28. Vide : l'événement est posé, sans aucun rappel.
3. Laissez `AGENDA_ID` **vide** pour utiliser votre agenda principal. C'est le cas le plus courant, et vous n'avez alors rien à chercher.

   Pour un agenda dédié — « Appels d'offres », que vous pouvez partager avec votre équipe — créez-le d'abord dans Google Agenda, puis relevez son identifiant. **Attention, il n'est pas dans les réglages généraux** : la roue dentée en haut à droite ouvre Général, Événements ajoutés par Gmail, Gérer les comptes, et l'identifiant n'y figure pas. Le chemin est celui-ci :

   - dans la colonne de gauche, passez la souris sur le **nom de l'agenda** ;
   - cliquez sur les **trois points**, puis sur **Paramètres et partage** ;
   - descendez jusqu'à la section **Intégrer l'agenda** ;
   - copiez le champ **ID de l'agenda**. Il ressemble à `c_9a8b7...@group.calendar.google.com`.

   L'identifiant de votre agenda principal, lui, est tout simplement votre adresse Gmail. Le laisser vide revient au même.
4. Onglet **OPPORTUNITIES** : écrivez `OUI` dans la colonne **Suivi**, sur les avis auxquels vous comptez répondre.
5. Menu **TenderPilot > Tester l'agenda**.

**Le test ne pose rien.** Il vous dit le nom de l'agenda visé, combien d'échéances sont suivies, et combien seront posées au prochain passage. Un test qui écrirait dans votre agenda sans que vous l'ayez demandé serait un mauvais test.

## Ce qui est posé

Un **événement d'une journée entière**, à la date limite — une date de dépôt n'a pas d'heure utile, et un événement horaire se perd dans la grille.

| Dans l'événement | Ce qu'il contient |
|---|---|
| Titre | `Echeance : ` suivi de l'intitulé de l'avis |
| Description | l'organisation, le pays, la source, le lien de l'avis, et le lien du dossier PDF quand il existe |
| Rappels | une notification par valeur de `AGENDA_RAPPELS_JOURS` |

Depuis votre téléphone, la notification arrive, vous ouvrez l'événement, et le lien de l'avis officiel est là.

## Poser, reposer, retirer

**Une échéance n'est jamais posée deux fois.** La colonne masquée `Agenda` garde l'identifiant de l'événement créé. Tant qu'elle contient quelque chose, la ligne est considérée comme posée.

**Pour reposer un événement que vous avez supprimé par erreur** : videz la cellule de la colonne `Agenda` de cette ligne. Au passage suivant, l'événement est recréé. Pour voir cette colonne, affichez les colonnes masquées de l'onglet.

**Pour retirer une échéance de votre agenda, supprimez l'événement dans Google Agenda.** Effacer le `OUI` de la colonne Suivi ne le supprime pas : cela empêche seulement de nouvelles poses. Le classeur ne touche jamais à un événement déjà créé — il ne modifie ni ne supprime rien dans votre agenda.

## Aller plus loin

**Ne recevoir des rappels que sur ce que vous suivez** : mettez `RAPPELS_SUIVIS_SEULEMENT` à `true`. Vos rappels J-7, J-3 et J-1 ne concerneront plus que les lignes marquées `OUI`. L'annonce des nouveautés continue toujours — une opportunité qui vient d'entrer, vous ne pouvez pas encore l'avoir suivie.

**Partager le calendrier de votre équipe** : utilisez un agenda dédié via `AGENDA_ID`, puis partagez cet agenda depuis Google Agenda. Chacun voit les dépôts à venir sans avoir accès au classeur.

## Ce que ce canal ne fait pas

**Il agit sur le compte Google qui possède le classeur.** Les événements sont posés dans l'agenda de ce compte, pas dans celui d'un collègue à qui vous auriez partagé le classeur. Pour l'équipe, passez par un agenda dédié et partagé.

**Il ne rattrape pas le passé.** Une échéance déjà expirée n'est pas posée.

## Que faire si

**« Mettez SEND_AGENDA a true dans CONFIG »** : le réglage est encore à `false`.

**« Aucun agenda accessible. Verifiez AGENDA_ID »** : l'identifiant collé est faux, ou l'agenda n'appartient pas à ce compte Google. Laissez la case vide pour revenir à l'agenda principal.

**Le journal dit que la colonne `Agenda` manque.** Votre classeur a été créé avant cette version. Menu **TenderPilot > Verifier l'installation** vous dit quelle colonne ajouter, à la fin de l'onglet OPPORTUNITIES, avec son orthographe exacte. Sans elle, rien n'est posé — c'est délibéré : le même événement serait recréé trois fois par jour.

**Rien n'est posé alors que tout semble réglé.** Vérifiez qu'au moins une ligne porte `OUI` dans Suivi **et** une date dans Deadline. Le test de l'agenda vous donne les deux nombres.
