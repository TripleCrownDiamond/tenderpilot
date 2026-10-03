# Les plans de passation

Un appel d'offres ne tombe pas du ciel. Avant de le publier, une autorité contractante l'a inscrit dans son **plan de passation** : la liste de ce qu'elle prévoit d'acheter dans l'année, avec le budget estimé et le trimestre de lancement.

L'onglet **PLANS_DE_PASSATION** de votre classeur rassemble ces prévisions. Il vous donne ce qu'aucune alerte ne peut donner : **de l'avance**.

## Un plan n'est pas un avis

C'est la distinction à garder en tête.

| | Plan de passation | Appel d'offres |
|---|---|---|
| Où il vit | onglet PLANS_DE_PASSATION | onglet OPPORTUNITIES |
| Ce qu'il annonce | un marché **à venir** | un marché **ouvert** |
| Dossier disponible | non | oui |
| Date de dépôt | non, seulement un lancement prévu | oui |
| Déclenche une alerte | non | oui |
| Ce que vous pouvez faire | préparer | déposer |

C'est pour cela que les plans vivent dans leur propre onglet et ne vous écrivent jamais : recevoir une alerte pour un marché auquel personne ne peut encore répondre serait du bruit.

## Les colonnes

| Colonne | Ce qu'elle dit |
|---|---|
| Reference | La référence du marché dans le plan de l'autorité. |
| Source | D'où vient la ligne : le portail national, ou un calendrier d'achats. |
| Autorite | Qui achètera. |
| Objet | Ce qui sera acheté. |
| Type | Fournitures, travaux, services, prestations intellectuelles. |
| Mode | Appel d'offres ouvert, demande de cotation, manifestation d'intérêt... |
| Montant_Estime | Le budget prévu, en FCFA. C'est une estimation de l'autorité. |
| Lancement_Prevu | Quand l'avis devrait paraître. |
| Demarrage_Prevu | Quand l'exécution devrait commencer. |
| Bailleur | Budget national, budget autonome, financement extérieur. |
| Annee | L'exercice du plan. |
| Lien | Le portail où la prévision est publiée. |
| Derniere_MAJ | Le passage qui a écrit cette ligne. |

## Comment vous en servir

**Regardez d'abord `Montant_Estime` et `Lancement_Prevu`.** Un marché de 80 millions annoncé pour dans six semaines vous laisse le temps de faire ce qui prend du temps : rassembler vos attestations, demander une caution à votre banque, trouver un partenaire pour un groupement, réunir vos marchés similaires.

**Puis `Mode`.** Il vous dit à quoi vous attendre : une demande de cotation se répond en quelques jours, un appel d'offres international demande un dossier complet.

**Enfin `Autorite`.** Filtrez sur les acheteurs de votre secteur : les sociétés d'État, les communes, les agences. Vous verrez vite lesquelles achètent ce que vous vendez.

Quand l'avis paraît vraiment, il arrive dans **OPPORTUNITIES** comme les autres, avec sa date limite et son dossier — et vous serez prêt.

## Comment l'onglet se remplit

**Par tranches.** Plusieurs centaines d'autorités publient un plan. TenderPilot en lit `PLANS_AUTORITES_PAR_PASSAGE` à chaque exécution — trente par défaut — puis reprend à la suivante au passage d'après. Comptez deux à trois jours après le démarrage pour que l'onglet soit complet, et laissez tourner l'exécution automatique.

**Il ne garde que ce qui est encore à venir.** Un lancement déjà passé sort de l'onglet : ce qui est lancé se retrouve dans OPPORTUNITIES. Le lancement le plus proche est en haut.

**L'onglet se crée tout seul.** Si votre classeur ne l'a pas encore, il apparaît à la première exécution, avec ses colonnes et son en-tête. Vous n'avez rien à créer.

**Les calendriers d'achats de l'UNICEF y figurent aussi** : médicaments, dispositifs médicaux, nutrition, eau et assainissement, vaccins, éducation. Ils n'ont pas de date de lancement et sont donc rangés après les marchés datés. La colonne `Source` dit d'où vient chaque ligne, la colonne `Lien` ouvre le calendrier.

**Pour ne pas les collecter du tout** : mettez `COLLECTER_PLANS` à `false` dans l'onglet CONFIG. L'onglet reste en place, il ne se remplit plus.

## Ce que cet onglet ne promet pas

**Une prévision n'est pas un engagement.** Un marché inscrit au plan peut être reporté, modifié, ou ne jamais sortir. Le montant est une estimation, pas un prix.

**La couverture est celle du Bénin**, plus les calendriers de l'UNICEF, qui sont mondiaux. Les autres pays de votre veille reçoivent leurs appels d'offres dans OPPORTUNITIES, mais leurs plans de passation ne sont pas publiés de manière exploitable aujourd'hui. Si cela change, la source sera ajoutée et annoncée dans le groupe WhatsApp.

**Rien ne remplace l'avis officiel.** Le jour où le marché sort, ce sont ses documents qui font foi, pas la ligne du plan.
