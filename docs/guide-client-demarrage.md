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

**Chaque alerte ramene a votre tableau.** Un bouton *Ouvrir mon tableau
TenderPilot* figure au bas de chaque mail, et l'adresse en toutes lettres
dans la version texte. C'est de la que vous comparez les echeances et que
vous cochez la colonne SUIVI.

> **Attention si vous mettez plusieurs adresses** dans
> `NOTIFICATION_EMAIL`. Vos collegues recevront les alertes, mais le bouton
> ne s'ouvrira pour eux QUE si vous leur avez donne acces au classeur
> (bouton *Partager*, en haut a droite). Sans cela, ils verront une page de
> demande d'autorisation.

### Deux autres canaux, si vous voulez

Un email se perd dans une boite pleine. Deux autres facons d'etre prevenu
existent, toutes deux facultatives et reglables dans l'onglet CONFIG : un
salon **Telegram**, et vos echeances dans votre **Google Agenda**. Vous
pouvez les cumuler - laissez `NOTIFICATION_EMAIL` vide si vous ne voulez
pas d'emails du tout.

**Telegram**, si vous y etes deja.

1. Ecrivez a **@BotFather**, envoyez `/newbot`, suivez les questions. Il
   vous donne un **jeton**.
2. Ecrivez a **@userinfobot** : il vous donne votre **identifiant**.
3. Onglet CONFIG :

| Cle | Valeur |
|-----|--------|
| `SEND_TELEGRAM` | `true` |
| `TELEGRAM_TOKEN` | le jeton de @BotFather |
| `TELEGRAM_CHAT_ID` | votre identifiant |

4. Menu **TenderPilot > Tester la notification Telegram**.

**Chaque canal a son propre rythme.** `MAX_EMAILS_PAR_EXECUTION` et
`MAX_TELEGRAM_PAR_EXECUTION` se reglent separement. C'est utile : Google ne
vous laisse envoyer que 100 emails par jour, alors qu'un salon Telegram n'a
pas de limite. Vous pouvez donc garder 20 emails par passage et laisser
Telegram sans plafond. Une alerte deja partie sur un canal ne repart pas
quand l'autre la rattrape.

## 3 bis. Vos echeances dans votre agenda

C'est le reglage le plus utile du produit, et celui auquel on pense le
moins. Il pose vos dates limites dans **Google Agenda** - vous les voyez
dans le calendrier de votre telephone, des semaines a l'avance, avec les
rappels que vous choisissez.

**Il ne pose pas tout, et c'est voulu.** Le tableau ramene des centaines
d'avis ; les verser tous dans votre agenda le rendrait illisible. Seuls
entrent ceux que **vous** designez.

1. Onglet CONFIG : mettez `SEND_AGENDA` a `true`. Reglez
   `AGENDA_RAPPELS_JOURS` si `7, 1` ne vous convient pas - c'est le nombre
   de jours avant l'echeance ou Google vous previendra.
2. Onglet OPPORTUNITIES : ecrivez **OUI** dans la colonne **Suivi**, sur
   les avis auxquels vous comptez repondre.
3. Menu **TenderPilot > Tester l'agenda** vous dit combien seront poses au
   prochain passage.

**La colonne Suivi est la seule que vous remplissez.** Tout le reste du
tableau est ecrit par le script. Celle-la est votre decision.

Si vous voulez aller plus loin, mettez `RAPPELS_SUIVIS_SEULEMENT` a `true` :
vos rappels J-7, J-3 et J-1 ne concerneront plus que les avis suivis.
L'annonce des **nouveautes**, elle, continue toujours - une opportunite qui
vient d'entrer, vous ne pouvez pas encore l'avoir suivie.

### Un seul mail au lieu de dix, range par rubrique

> Si vous ne voyez pas `DIGEST_GROUPE_PAR` dans l'onglet CONFIG, lancez une
> execution : TenderPilot ajoute tout seul les reglages qui manquent, avec
> leur valeur par defaut. Un reglage absent n'a jamais empeche le produit de
> marcher - c'est sa valeur par defaut qui s'applique.

Quand une collecte ramene plus de `DIGEST_THRESHOLD` nouveautes (cinq par
defaut), elles partent en **un seul mail recapitulatif** au lieu d'un mail
par annonce.

`DIGEST_GROUPE_PAR` decide comment ce recapitulatif est range :

| Valeur | Ce que vous recevez |
|--------|---------------------|
| `pertinence` (defaut) | Prioritaire d'abord, puis A voir, puis le reste |
| `secteur` | Une rubrique par secteur - agriculture, environnement, numerique... |
| `pays` | Une rubrique par pays |
| `aucun` | Une liste a plat |

**Les rubriques les plus interessantes passent en premier**, jamais par
ordre alphabetique : une rubrique passe devant une autre si elle contient
une annonce plus pertinente pour vous.

**Les rappels d'echeance sont regroupes eux aussi**, au-dela du meme seuil :
douze echeances font un mail, les douze listees, rien de perdu.

**Sauf ce qui presse.** `RAPPELS_UNITAIRES_SOUS_JOURS` - trois jours par
defaut - dit en dessous de combien de jours un rappel part dans SON propre
mail. Une echeance a deux jours ne doit pas arriver en douzieme position
d'une liste. Mettez 0 pour tout regrouper.

> Si vous recevez encore trop de mails : baissez
> `MAX_EMAILS_PAR_EXECUTION`, ou mettez `RAPPELS_SUIVIS_SEULEMENT` a `true`
> pour n'etre rappele que sur les avis ou vous avez ecrit OUI dans la
> colonne SUIVI.

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

Les colonnes qui comptent : **Deadline**, **Jours_Restants**, et
**Pertinence** - qui dit si l'avis correspond a vos pays et secteurs.

**La colonne Suivi est a vous.** Ecrivez `OUI` sur ce a quoi vous comptez
repondre : c'est ce qui alimente votre agenda.

**Les annonces deja echues n'entrent pas.** Les portails laissent des annees
d'archives en ligne : sans ce filtre, votre tableau serait rempli de lignes
grises ou il faudrait chercher les quelques dizaines auxquelles vous pouvez
encore repondre.

En revanche, une opportunite deja suivie qui arrive a echeance **reste** dans
le tableau, en gris : vous gardez la trace de ce a quoi vous avez repondu.

Quand `Deadline` est vide, c'est que la source n'a pas publie de date.
**Nous n'en inventons jamais** - une date devinee vous ferait manquer un
depot. Ouvrez l'avis officiel avec le lien de la ligne.

## 5 bis. La colonne Pertinence : ce qui vous concerne

C'est la colonne qui repond a la premiere question qu'on se pose devant un
tableau de trois cents lignes : **est-ce que ca me concerne ?**

Elle se calcule a chaque passage, sans intelligence artificielle et sans
aucune cle, a partir de deux reglages de l'onglet CONFIG : `PAYS_SUIVIS` et
`SECTEURS_SUIVIS`.

### Le calcul, en entier

Deux axes, deux points chacun.

| Le pays de l'annonce | Points |
|----------------------|--------|
| Un de vos pays suivis | 2 |
| International, Afrique, ou pays non precise | 1 |
| Un autre pays | 0 |

| Le secteur de l'annonce | Points |
|-------------------------|--------|
| Un de vos secteurs suivis, ou vous n'en suivez aucun | 2 |
| Secteur non precise | 1 |
| Un autre secteur | 0 |

Le total donne le niveau :

| Total | Niveau | Ce que ca veut dire |
|-------|--------|---------------------|
| 4 | **3 - PRIORITAIRE** | votre pays ET votre secteur |
| 3 | **2 - A VOIR** | l'un des deux, l'autre etant ouvert |
| 2 | **1 - POSSIBLE** | rien ne correspond, rien n'exclut |
| 0-1 | **0 - HORS PROFIL** | un autre pays et un autre secteur |

### Deux precisions qui evitent des surprises

**Une annonce "internationale" qui nomme un pays dans son titre n'est pas
consideree comme ouverte.** Si vous suivez le Benin et que le titre dit
"...au Senegal", elle perd le point des annonces ouvertes. Sans cette
regle, tout ce qui est publie par une source internationale remontait chez
vous.

**Les noms de pays sont compares en entier.** Suivre le `Niger` ne fait
plus remonter le `Nigeria`. En revanche, suivre le `Soudan` attrape encore
le `Soudan du Sud`, et la `Guinee` attrape la `Guinee-Bissau` : la, c'est le
nom lui-meme qui est ambigu.

### Ce que la pertinence ne fait JAMAIS

**Elle ne supprime rien.** Une annonce hors profil reste dans votre
tableau, avec sa couleur et son echeance. Elle etiquette, elle ne trie pas
a votre place - parce qu'une ligne de trop coute un defilement, et qu'une
opportunite supprimee coute un marche.

Pour couper le bruit **dans votre boite** sans rien retirer du tableau,
c'est `NOTIFIER_PERTINENCE` qui sert :

| Valeur | Vous etes prevenu pour |
|--------|------------------------|
| vide (defaut) | tout |
| `3 - PRIORITAIRE, 2 - A VOIR` | ce qui touche vos pays ou vos secteurs |
| `3 - PRIORITAIRE` | uniquement vos pays ET vos secteurs |

### D'ou viennent les valeurs a ecrire

**Ne les inventez pas.** L'onglet `PAYS_ET_SECTEURS` se remplit tout seul a
chaque passage avec les pays et les secteurs REELLEMENT collectes, et le
nombre d'annonces de chacun. Ouvrez-le apres une execution et recopiez de
la : un pays mal orthographie ne correspondra a rien, en silence.

**L'ordre compte.** Si vous ecrivez `Benin, Niger, Togo`, vos alertes
arrivent dans cet ordre : le Benin d'abord, a pertinence egale.

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
| Les alertes email, Telegram et push a J-7, J-3, J-1 | oui |
| Poser vos echeances suivies dans Google Agenda | oui |
| L'absence de doublons | oui |
| **Le filtre par type** | oui, huit valeurs propres |
| **Le filtre par secteur** | oui, deduit du titre pour une annonce sur deux |
| Ce qui n'a pas pu etre classe | affiche **Non precise**, jamais une case vide |
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
2. **Le secteur est trouve plus souvent, et plus finement.** Sans cle, il
   est deduit du titre : environ une annonce sur deux y gagne un secteur, le
   reste affiche *Non precise*. Avec, le modele lit aussi le corps de
   l'annonce et classe presque tout.
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

## Rester au courant

Le groupe WhatsApp TenderPilot annonce les nouvelles sources, les
corrections et les nouveautes du produit. C'est aussi la que les questions
recoivent une reponse le plus vite.

{groupe}

---

Une question, un blocage : {contact}
