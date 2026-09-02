# Demarrer avec TenderPilot

Votre veille des appels d'offres, dans un Google Sheets.

TenderPilot surveille {nb_sources} sources - marches publics du Benin, SBEE,
SONEB, ARMP, DEDRAS, Banque mondiale, BAD, Enabel, BCEAO - et vous previent
avant chaque date limite.

Comptez cinq minutes.

## 1. Creer votre classeur

Ouvrez ce lien :

{lien}

Google vous propose **Creer une copie**. Acceptez.

Le classeur s'ouvre : c'est le votre. Vous en etes proprietaire, personne
d'autre n'y a acces.

Rien a installer, rien a copier-coller. Tout est deja dedans.

> Si Google demande de vous connecter, faites-le : le classeur doit se
> creer dans VOTRE Drive.

## 2. Autoriser le script

En haut, un menu **TenderPilot** apparait. S'il n'est pas la, rechargez la
page une fois.

Cliquez sur **TenderPilot > Executer maintenant**.

Google affiche un avertissement : *cette application n'est pas validee*.
C'est normal - c'est votre propre copie du script, pas une application
publiee.

1. Cliquez **Parametres avances**.
2. Puis **Acceder a TenderPilot (non securise)**.
3. Puis **Autoriser**.

Vous ne le ferez qu'une fois.

## 3. Recevoir les alertes

Onglet **CONFIG**, ligne `NOTIFICATION_EMAIL` : mettez votre adresse.

Plusieurs adresses ? Separez-les par des points-virgules.

Vous recevrez un email :

- a chaque nouvelle opportunite ;
- **7 jours**, **3 jours** et **1 jour** avant chaque date limite.

Une opportunite ne vous ecrit jamais deux fois pour la meme raison.

### Aussi sur Telegram, si vous voulez

Un email se perd dans une boite pleine. Une notification Telegram arrive sur
votre telephone.

1. Dans Telegram, ecrivez a **@BotFather**, envoyez `/newbot`, suivez les
   questions. Il vous donne un **jeton**.
2. Ecrivez a **@userinfobot** : il vous donne votre **identifiant**.
3. Onglet CONFIG :

| Cle | Valeur |
|-----|--------|
| `SEND_TELEGRAM` | `true` |
| `TELEGRAM_TOKEN` | le jeton de @BotFather |
| `TELEGRAM_CHAT_ID` | votre identifiant |

4. Menu **TenderPilot > Tester la notification Telegram**.

## 4. Laisser tourner

Menu **TenderPilot > Activer l'execution automatique**.

Trois passages par jour : 8h, 13h et 18h. Les jours restants et les couleurs
sont recalcules a chaque fois, meme sans nouveaute.

**Cette etape est necessaire** : sans elle, rien ne se collecte tout seul.

## 5. Lire le tableau

Onglet **OPPORTUNITIES**, une ligne par opportunite.

| Couleur | Ce que ca veut dire |
|---------|---------------------|
| Vert | vous avez le temps |
| Jaune | a surveiller |
| Orange | echeance dans une semaine |
| Rouge | trois jours ou moins |
| Gris | echeance passee |

Les colonnes qui comptent : **Deadline** et **Jours_Restants**.

**Les annonces deja echues n'entrent pas.** Les portails laissent des annees
d'archives en ligne : sans ce filtre, votre tableau serait rempli de lignes
grises ou il faudrait chercher les quelques dizaines auxquelles vous pouvez
encore repondre.

En revanche, une opportunite deja suivie qui arrive a echeance **reste** dans
le tableau, en gris : vous gardez la trace de ce a quoi vous avez repondu.

Quand `Deadline` est vide, c'est que la source n'a pas publie de date.
**Nous n'en inventons jamais** - une date devinee vous ferait manquer un
depot. Ouvrez l'avis officiel avec le lien de la ligne.

## 6. Suivre d'autres pays

Au depart, **seul le Benin est coche**. C'est le reglage de sortie d'usine,
pas une limite : votre classeur porte deja des sources pour toute l'Afrique
de l'Ouest, et d'autres au-dela.

Beaucoup d'entreprises beninoises repondent a des marches hors du Benin -
dans la sous-region, parfois dans le monde entier. TenderPilot ne vous en
empeche jamais.

**Pour ouvrir a un autre pays :**

1. Menu **TenderPilot > Afficher / masquer l'onglet SOURCES**.
2. Trouvez les lignes du pays voulu dans la colonne **Pays_Defaut**.
3. Mettez **OUI** dans la colonne **Active**.
4. Menu **TenderPilot > Executer maintenant**.

Pour cesser de suivre un pays, remettez **NON**. Rien n'est perdu : les
opportunites deja collectees restent dans votre tableau.

### Ce que vous trouverez, pays par pays

| Zone | Ce qui est couvert |
|------|--------------------|
| **Benin** | portails nationaux, SBEE, SONEB, ABE, DEDRAS, plus PNUD et Banque mondiale |
| **Reste de la CEDEAO** | PNUD et Banque mondiale pour chaque pays |
| **Afrique et international** | bailleurs, fondations, appels a projets et subventions |

Soyons clairs sur la difference : le Benin est couvert en profondeur, avec
ses portails nationaux. Les autres pays le sont par les grands bailleurs
seulement. C'est deja beaucoup - la Banque mondiale et le PNUD publient
l'essentiel des marches finances - mais ce n'est pas la meme densite.

**Les appels ouverts a tous les pays vous sont montres de toute facon.** Une
bourse mondiale, un appel a projets international : vous pouvez y candidater
depuis Cotonou, donc ils apparaissent, quel que soit le pays coche.

### Les salons et ateliers

Ils n'apparaissent pas par defaut : ce ne sont pas des marches, et ils
rempliraient le tableau. Si vous les voulez - un salon professionnel a
Nairobi, une formation financee - demandez-le, c'est une case a cocher.

## 7. Rester a jour

Menu **TenderPilot > Synchroniser les sources**.

Les sources evoluent : une adresse change, un site est ajoute. **Nous en
ajoutons regulierement, pays par pays** - c'est par ici qu'elles arrivent
chez vous.

La synchronisation aligne votre classeur sans rien vous faire perdre :

- vos propres sources restent ;
- ce que vous avez desactive reste desactive - une mise a jour n'annule
  jamais votre choix ;
- les nouvelles sources arrivent avec notre reglage de depart.

Apres une synchronisation, ouvrez l'onglet SOURCES : la colonne
**Pays_Defaut** vous dit ce qui est arrive et pour quel pays. A vous de
cocher ce qui vous interesse.

Faites-le une fois par mois, ou quand on vous annonce une mise a jour.

## Ce que TenderPilot ne fait pas

- **Il ne remplit pas vos dossiers.** Il vous fait gagner la recherche, pas
  la redaction.
- **Il n'invente aucune date limite.**
- **Il ne garantit pas l'exhaustivite.** Verifiez toujours l'avis officiel
  avant de candidater.

## Que faire si

**Le menu TenderPilot n'apparait pas.** Rechargez la page une fois : Google
met parfois quelques secondes a charger le script. S'il manque toujours,
ecrivez-moi - je m'en occupe, vous n'avez rien a installer vous-meme.

**Aucune opportunite n'arrive.** Avez-vous lance *Executer maintenant* ?
Sinon, regardez l'onglet LOGS : il dit ce qui s'est passe.

**Les emails ne partent pas.** Verifiez `NOTIFICATION_EMAIL` dans CONFIG.
Regardez aussi vos indesirables la premiere fois.

**Une source ne rapporte plus rien.** Certaines sont lues directement sur
des pages web, et se taisent quand le site est refait. Signalez-le : la
correction est envoyee a tous.

---

Une question, un blocage : {contact}
