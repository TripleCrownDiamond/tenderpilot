"""
Texte du guide utilisateur TenderPilot.

Isole dans son propre fichier parce qu'il est long et qu'il vit sa propre
vie : on le relit et on le corrige souvent, sans toucher au builder.

Ecrit pour quelqu'un qui n'ouvrira jamais une formule : pas de jargon, une
action par ligne, et les pieges annonces avant qu'ils ne se produisent.
"""

GUIDE = """# TenderPilot - guide d'utilisation

De l'installation a votre premiere soumission.
Comptez 15 minutes de lecture, 5 minutes d'installation.

---

# 1. Ce que fait TenderPilot

TenderPilot centralise vos opportunites - appels d'offres, consultations,
appels a projets - et vous evite d'en perdre.

Il fait quatre choses :

1. **Il rassemble.** Vos annonces arrivent au meme endroit, qu'elles viennent
   d'un email, d'un site ou de votre propre veille.
2. **Il trie.** Chaque opportunite recoit un score de pertinence selon vos
   pays, vos secteurs et vos mots-cles.
3. **Il surveille.** Les deadlines changent de couleur en approchant, et vous
   recevez un email avant qu'il ne soit trop tard.
4. **Il vous aide a decider.** Un classeur separe repond a la seule question
   qui compte : faut-il y aller, oui ou non.

Ce qu'il ne fait pas : ecrire votre offre, ni garantir que vous gagnerez. Il
vous fait gagner du temps et vous evite les oublis.

---

# 2. Installer dans Google Sheets

Aucun logiciel a installer. Il faut un compte Google - Gmail suffit.

## Etape 1 : faire votre copie

Ouvrez le lien qui vous a ete transmis. Une fenetre s'affiche avec un bouton
**Creer une copie**. Cliquez dessus.

Google cree alors *votre* fichier, prive, dans votre Google Drive. Le fichier
d'origine reste intact : vous ne pouvez rien casser.

Renommez votre copie si vous le souhaitez, cela n'a aucune importance pour le
fonctionnement.

## Etape 2 : autoriser le programme

En haut de la fenetre, a cote de *Fichier*, *Edition*, *Affichage*, un menu
supplementaire apparait : **TenderPilot**.

> Il n'apparait pas ? Fermez le fichier, rouvrez-le et attendez une dizaine
> de secondes. Le menu se charge apres la feuille.

Cliquez sur **TenderPilot > Configuration...**

Google demande alors une autorisation. C'est normal, et cela n'arrive qu'une
fois. Le programme a besoin de :

- lire et ecrire dans votre feuille ;
- vous envoyer des rappels par email ;
- lire le libelle Gmail que vous choisirez, et uniquement celui-la.

### L'ecran d'avertissement

Un ecran peut afficher **"Google n'a pas valide cette application"**. Ne
fermez pas la fenetre :

1. Cliquez sur **Parametres avances**, en bas a gauche.
2. Cliquez sur **Acceder a TenderPilot (non securise)**.
3. Cliquez sur **Autoriser**.

Cet avertissement s'affiche pour tout programme qui n'a pas encore ete soumis
a la procedure de validation de Google. Le programme tourne dans votre propre
compte et n'envoie aucune donnee a l'exterieur.

Si vous preferez ne pas donner l'acces a Gmail, dites-le : une version sans
cette fonction peut vous etre fournie. Vous saisirez vos opportunites
vous-meme.

## Etape 3 : repondre a l'assistant

Une barre laterale s'ouvre a droite.

| Question | A quoi ca sert |
|----------|----------------|
| Nom de votre organisation | apparait dans vos emails de rappel |
| Fuseau horaire | calculer correctement les jours restants |
| Pays cibles | +20 points aux annonces de ces pays |
| Secteurs cibles | +30 points, le critere qui pese le plus |
| Types d'opportunite | +15 points |
| Mots-cles a privilegier | +20 points si le mot apparait dans l'annonce |
| Mots-cles a exclure | l'annonce est ecartee, quel que soit le reste |
| Budget minimum | +5 points si le budget est compatible |
| Delai minimum | +10 points s'il reste assez de temps pour preparer |
| Email a prevenir | ou partent les rappels |
| Libelle Gmail | le dossier Gmail que le programme surveillera |

Pour choisir plusieurs pays ou secteurs : maintenez **Ctrl** enfonce (ou
**Cmd** sur Mac) en cliquant.

Cliquez sur **Enregistrer**. Les rappels automatiques s'activent.

## Etape 4 : supprimer les exemples

Le fichier livre contient des lignes de demonstration, reconnaissables a leur
identifiant commencant par `DEMO-`.

Ouvrez l'onglet `OPPORTUNITIES`, selectionnez ces lignes, clic droit,
**Supprimer les lignes**. Faites de meme dans l'onglet `SOURCES`.

C'est fait. Vous pouvez commencer.

---

# 3. Ajouter une opportunite

Menu **TenderPilot > Ajouter une opportunite...**

Un formulaire s'ouvre a droite. Seuls **le titre** et **la deadline** sont
obligatoires. Tout le reste peut attendre.

A l'enregistrement, TenderPilot affiche immediatement :

```
OPP-0007 enregistree.
88/100 - Tres pertinent
+20 pays cible - +30 secteur cible - +20 mot-cle : plateforme
- +10 delai suffisant - +5 budget compatible
```

Le score n'est jamais un chiffre sorti de nulle part : la ligne du dessous
dit exactement d'ou viennent les points.

## Comment lire le score

| Score | Ce que ca veut dire |
|-------|---------------------|
| 80 a 100 | Tres pertinent - a traiter en priorite |
| 60 a 79 | A analyser - lisez le dossier |
| 40 a 59 | Faible priorite |
| 0 a 39 | Ignorer |

Le score mesure **l'interet pour vous**. Il ne dit pas si vous etes eligible :
c'est le role du classeur Go/No-Go.

## Les doublons

Si vous saisissez deux fois la meme annonce, TenderPilot refuse la seconde et
vous donne l'identifiant de la premiere. La comparaison porte sur le titre,
l'organisation et la deadline - accents et majuscules sans importance.

---

# 4. Recuperer les opportunites automatiquement

Trois canaux, du plus fiable au plus automatique.

## a. Les alertes email (recommande)

La plupart des plateformes envoient deja des alertes par email. TenderPilot
sait les recuperer.

**Une seule fois, dans Gmail :**

1. Creez un libelle nomme `TenderPilot`.
   *Menu de gauche > Plus > Creer un libelle.*
2. Ouvrez un email d'alerte que vous recevez deja.
3. Cliquez sur les trois points en haut a droite du message, puis
   **Filtrer les messages similaires**.
4. Cliquez sur **Creer un filtre**.
5. Cochez **Appliquer le libelle** et choisissez `TenderPilot`.
6. Cochez aussi **Appliquer le filtre aux conversations correspondantes**
   pour traiter les emails deja recus.

**Ensuite, dans TenderPilot :** menu **Relever mes alertes email**.

Chaque email portant ce libelle devient une ligne de votre tableau.

Le programme ne lit **que** ce libelle. Il ne parcourt jamais votre boite de
reception.

## b. Les flux RSS

Certains sites publient un flux RSS : une adresse qui liste leurs dernieres
annonces, lisible par un programme.

1. Ouvrez l'onglet `SOURCES`.
2. Sur une nouvelle ligne, remplissez `Source_ID` (par exemple `SRC-001`) et
   `Source_Name` (le nom du site).
3. Collez l'adresse du flux dans la colonne `RSS_URL`.
4. Mettez `Active` sur `OUI`.
5. Menu **TenderPilot > Relever mes flux RSS**.

Chaque annonce devient une ligne, avec son score deja calcule. Les annonces
contenant un de vos mots-cles a exclure ne sont pas importees du tout.

**Trouver l'adresse d'un flux :** cherchez une icone orange RSS sur le site,
ou essayez d'ajouter `/rss` ou `/feed` a la fin de l'adresse de la page des
appels d'offres. Beaucoup de sites n'en proposent pas : utilisez alors les
alertes email.

## c. La saisie manuelle

Pour tout le reste. C'est le canal le plus fiable, et souvent le plus rapide
quand vous avez deja l'annonce sous les yeux.

## Une precision importante sur les dates

Quand une annonce arrive par email ou par flux, TenderPilot ne remplit la
deadline **que** si elle est annoncee par un mot explicite : « date limite »,
« cloture », « deadline ».

Sinon, il laisse la case vide.

Ce n'est pas un manque, c'est un choix. Une echeance devinee a partir de la
premiere date trouvee dans le texte serait souvent la date de publication -
et vous vous fieriez a une date fausse. Une case vide se voit ; une date
fausse ne se voit pas.

**Completez donc toujours les deadlines des annonces importees.**

---

# 5. Suivre vos deadlines

## Les couleurs

Chaque ligne de l'onglet `OPPORTUNITIES` prend une couleur selon le temps
restant :

| Couleur | Delai |
|---------|-------|
| Vert | plus de 15 jours |
| Jaune | 8 a 15 jours |
| Orange | 3 a 7 jours |
| Rouge | 0 a 2 jours |
| Gris | deadline depassee, ou dossier clos |

**La regle importante :** des que vous passez un dossier en `Soumis`, il
devient gris et cesse d'etre signale comme urgent - meme la veille de la
deadline. Vous avez fait votre part, le systeme arrete de vous alerter.

C'est aussi vrai pour `Gagne`, `Perdu`, `Expire`, `Archive` et `NO-GO`.

## Les rappels par email

Un email part automatiquement a J-14, J-7, J-3 et J-1. Un seul par jour,
regroupant toutes les echeances concernees. Un dossier clos ne declenche
jamais de rappel.

Vous pouvez changer ces paliers dans la configuration : saisissez par exemple
`30;15;7;1`.

## La liste des echeances

Menu **TenderPilot > Verifier les deadlines**. L'onglet `DEADLINES` se
remplit avec tout ce qui arrive a echeance dans les 15 jours, du plus urgent
au moins urgent.

---

# 6. Faire avancer un dossier

La colonne `Status` suit le cycle de vie d'une opportunite. Choisissez
toujours dans la liste deroulante, jamais en tapant du texte.

```
Nouveau  ->  A lire  ->  A qualifier  ->  GO  ->  A preparer
         ->  En preparation  ->  En validation  ->  Pret a soumettre
         ->  Soumis  ->  Gagne / Perdu
```

En cours de route : `NO-GO` si vous renoncez, `Expire` si la date est passee,
`Archive` pour ranger.

Deux colonnes valent la peine d'etre remplies :

- `Next_Action` et `Next_Action_Date` : ce que vous devez faire ensuite.
  C'est ce qui evite qu'un dossier dorme.
- `Missing_Documents` : ce qu'il vous reste a obtenir.

---

# 7. Decider : le classeur Go/No-Go

Quand une opportunite merite un examen serieux, ouvrez le classeur
**Go / No-Go**. Un classeur par opportunite : faites une copie a chaque fois.

## Comment faire

1. Dans l'onglet `DECISION`, renseignez l'opportunite et recopiez son score
   de pertinence.
2. Dans l'onglet `CRITERIA`, saisissez une ligne par exigence du dossier
   d'appel d'offres.
3. Pour chaque exigence, repondez a trois questions :
   - **Obligatoire ?** l'exigence est-elle imposee
   - **Eliminatoire ?** son absence disqualifie-t-elle d'office
   - **Poids** de 1 a 5 selon son importance
4. Indiquez ce que vous pouvez prouver, puis le resultat : `Satisfait`,
   `Partiellement satisfait`, `Non satisfait` ou `A verifier`.
5. Lisez le verdict dans l'onglet `DECISION`.

La colonne `Score` se calcule seule a partir du resultat. Elle n'est pas
saisissable, et c'est voulu : un chiffre modifiable a la main serait la porte
ouverte a l'arrangement du resultat par celui qui veut soumissionner.

## Les quatre verdicts

| Verdict | Ce que vous faites |
|---------|--------------------|
| **GO** | Vous y allez. Aucun blocage. |
| **GO_WITH_ACTIONS** | Vous y allez, mais des documents ou des preuves doivent etre obtenus avant le depot. |
| **NO_GO_CONDITIONAL** | Ne decidez pas encore. Un point eliminatoire n'est pas tranche, ou l'evaluation est incomplete. Clarifiez, puis relisez. |
| **NO_GO** | N'y allez pas. |

## La regle a retenir

**Une exigence eliminatoire non satisfaite ne peut jamais etre rattrapee par
un bon score.**

C'est l'erreur la plus couteuse du metier : voir 85/100, se lancer, mobiliser
une equipe pendant deux semaines - et voir l'offre ecartee sans meme etre
lue, parce qu'une certification obligatoire manquait.

Le classeur regarde les criteres eliminatoires **avant** de regarder le
score. Le jeu de demonstration fourni illustre exactement ce cas : un score
de 71 qui depasse le seuil de 70, et pourtant un `NO_GO`.

## Les trois scores ne se melangent pas

| Score | Question |
|-------|----------|
| Pertinence | Est-ce interessant pour nous ? |
| Eligibilite | Avons-nous le droit de repondre ? |
| Preparation | Avons-nous les documents et l'equipe **maintenant** ? |

Ils sont affiches separement, et c'est volontaire. Une moyenne des trois
cacherait un blocage derriere deux bons resultats.

---

# 8. Le profil de votre organisation

Le classeur **Organization Profile** decrit une fois pour toutes ce que vous
etes capable de prouver : identite legale, chiffres d'affaires, references,
equipe, documents administratifs et leurs dates d'expiration.

Remplissez-le une fois, mettez-le a jour deux fois par an.

**Commencez par la case "Type de candidat"**, en haut de l'onglet `IDENTITY` :
PME, cabinet, ONG, consultant individuel ou consortium. Toutes les autres
lignes s'adaptent alors :

- **Requis** : obligatoire pour votre type
- **Optionnel** : utile mais pas bloquant
- **Sans objet** : ne vous concerne pas, la ligne devient grise

Les champs requis encore vides apparaissent en rouge. L'onglet
`COMPLETENESS` donne votre taux de remplissage.

**Attention :** ce taux mesure votre preparation, pas votre eligibilite. Un
profil rempli a 100 % peut etre inelegible a un marche precis.

## Ne jamais inventer une valeur

Si vous ne connaissez pas un chiffre, laissez la case vide. Le resume
affichera « Non fourni ».

Un profil honnete avec des trous reste utilisable. Un profil invente produit
une decision fausse et une offre rejetee.

---

# 9. En cas de probleme

**Le menu TenderPilot n'apparait pas.**
Fermez le fichier, rouvrez-le, attendez dix secondes. Le menu se charge apres
la feuille.

**Les listes Pays et Secteur sont vides dans le formulaire.**
Le formulaire doit etre ouvert depuis le menu TenderPilot, a l'interieur de
Google Sheets. Ces listes sont lues dans votre classeur : ouvertes ailleurs,
elles n'ont rien a lire. Si le probleme persiste dans Google Sheets, un
onglet a probablement ete renomme ou supprime.

**Une action affiche un message d'erreur.**
Verifiez qu'aucun onglet et aucune colonne n'a ete renomme. Le programme
retrouve les colonnes par leur nom : renommer `Deadline_Date` le rend
aveugle. Ajouter des colonnes a la fin ne pose aucun probleme.

**Les rappels n'arrivent pas.**
Menu *Configuration* : verifiez l'email, et que les rappels sont sur
*Actives*. Verifiez aussi vos spams. Un rappel ne part que le jour exact d'un
palier, pas tous les jours.

**Un flux RSS ne remonte rien.**
Ouvrez l'onglet `LOGS` : la raison y est ecrite. Le plus souvent, l'adresse
n'est pas celle d'un flux mais d'une page web ordinaire.

**J'ai supprime un onglet par erreur.**
*Fichier > Historique des versions > Afficher l'historique des versions*, et
restaurez une version anterieure. Google conserve tout.

---

# 10. Ce que TenderPilot ne fait pas

Autant le dire franchement.

- **Il ne parcourt pas les sites d'appels d'offres a votre place.** Cette
  technique casse tous les deux mois et est interdite sur beaucoup de sites.
  Les alertes email et les flux RSS couvrent le meme besoin, durablement.
- **Il n'ecrit pas votre offre.**
- **Il ne devine pas une date limite** qui n'est pas annoncee comme telle.
- **Il ne garantit rien sur l'issue d'un marche.**

Ce qu'il fait, il le fait de facon fiable : rien ne se perd, rien n'expire
sans prevenir, et aucune decision ne se prend sur un chiffre trompeur.
"""
