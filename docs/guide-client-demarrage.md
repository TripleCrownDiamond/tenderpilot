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

## 7. Le classement intelligent, si vous le voulez

**TenderPilot fonctionne entierement sans cela.** C'est une option, pas une
condition. Si vous ne faites rien, tout ce qui suit continue de marcher :

| Ce qui marche sans aucune cle | |
|---|---|
| La collecte de toutes vos sources | oui |
| **La lecture des dates limites** | oui |
| **Les annonces deja echues ne rentrent pas** | oui |
| Les couleurs, les jours restants | oui |
| Les alertes email et Telegram a J-7, J-3, J-1 | oui |
| L'absence de doublons | oui |
| Le secteur et le type | **par source**, pas par annonce |
| Le resume | l'extrait brut publie par la source |

Les deux lignes en gras meritent d'etre soulignees : **le tri des echeances
ne depend pas du classement intelligent.** Les dates sont lues par le
programme, jamais par un modele - c'est une regle du produit, pas un hasard.
Un modele produit toujours une date plausible plutot que rien, et une
echeance inventee vous ferait manquer un depot.

### Ce que le classement ajoute

Si vous fournissez une cle, quatre choses changent :

1. **Les articles n'entrent plus.** Certaines sources melangent des appels
   et des billets de blog. Le classement ecarte ce a quoi on ne peut pas
   repondre : un communique, une page de FAQ, un portrait.
2. **Le secteur et le type deviennent justes.** Sans cle, une source donne
   le meme secteur a toutes ses annonces - la Banque mondiale en publie
   quarante etiquetees pareil. Avec, chaque annonce est classee pour
   elle-meme.
3. **Les resumes deviennent lisibles.** Un titre administratif de trois
   lignes devient une phrase.
4. **La pertinence geographique est signalee.** Une annonce reservee a un
   autre pays est marquee - mais **elle n'est pas supprimee**, sauf si vous
   le demandez. Un appel mondial reste toujours visible : vous pouvez y
   candidater depuis Cotonou.

### Ce qu'il faut savoir avant d'activer

**La cle est la votre, et c'est vous qui payez.** Nous n'y avons pas acces.
Ouvrez un compte chez un fournisseur - Mistral, par exemple - et collez la
cle dans CONFIG.

Le cout est faible : le classement travaille par lots de trente annonces, et
une collecte courante demande **un a deux appels**. Le reglage
`LLM_MAX_APPELS_JOUR`, a 100 par defaut, est votre garde-fou : au-dela, le
classement s'arrete pour la journee et **la collecte continue normalement**.

Menu **TenderPilot > Tester le classement intelligent** verifie que votre
cle repond, avant la premiere collecte.

**Si le fournisseur tombe en panne, vous ne perdez rien.** Les annonces
arrivent alors sans classement, exactement comme si l'option etait
desactivee.

## 8. Rester a jour

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
