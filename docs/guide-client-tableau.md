# Lire votre tableau

> **Cet onglet est présenté en vidéo**, treize minutes : {video_08}

L'onglet **OPPORTUNITIES** est le cœur de TenderPilot : une ligne par opportunité, et tout y est écrit par le script. Une seule colonne est à vous, la colonne **Suivi**.

## Les couleurs, et ce qu'elles disent

Chaque ligne est peinte selon le temps qu'il reste avant la date limite. La couleur se recalcule à chaque passage, trois fois par jour.

| Couleur | Statut_Delai | Il reste |
|---|---|---|
| Vert | `OUVERT` | plus de 15 jours |
| Jaune | `A SURVEILLER` | 15 jours ou moins |
| Orange | `BIENTOT` | 7 jours ou moins |
| Rouge | `URGENT` | 3 jours ou moins |
| Gris | `EXPIRE` | la date est passée |
| Crème | `DATE A VERIFIER` | la source n'a publié aucune date |

**La couleur ne porte jamais une information à elle seule.** Le statut est écrit en toutes lettres dans la colonne `Statut_Delai` : vous pouvez filtrer dessus, et une impression en noir et blanc reste lisible.

## Les colonnes, dans l'ordre

| Colonne | Ce qu'elle dit |
|---|---|
| ID | L'identifiant interne, `TP-000123`. Il ne change jamais. |
| Date_Ajout | Le jour où la ligne est entrée dans votre tableau. |
| Opportunite | L'intitulé, tel que la source l'écrit. |
| Organisation | L'acheteur ou le bailleur. |
| Pays | Le pays du marché, ou `International`. |
| Type | Appel d'offres, manifestation d'intérêt, subvention, appel à projets... |
| Secteur | Santé, énergie, BTP... Vide quand la source ne le dit pas. |
| Budget | Le montant, quand la source le publie. |
| Source | Le portail d'où vient la ligne. |
| Lien | L'avis officiel. **C'est lui qui fait foi.** |
| PDF | Le dossier, quand la source publie un lien direct. |
| Date_Publication | Le jour de parution de l'avis. |
| Deadline | La date limite de dépôt. |
| Jours_Restants | Recalculé à chaque passage. Négatif après l'échéance. |
| Statut_Delai | Le statut du tableau ci-dessus. |
| Pertinence | Est-ce que cela vous concerne ? Voir plus bas. |
| **Suivi** | **La vôtre.** Écrivez `OUI` sur ce à quoi vous comptez répondre. |
| Resume | Les premières lignes de l'avis, mises en forme pour être lues. |
| Derniere_MAJ | Le dernier passage qui a touché cette ligne. |

Six colonnes sont masquées : cinq témoins d'envoi (`Notif_Nouvelle`, `Notif_J7`, `Notif_J3`, `Notif_J1`, `Notif_Expire`) et `Agenda`. Elles empêchent qu'une même alerte parte deux fois. **Ne les effacez pas au hasard** : vider un témoin fait repartir l'alerte correspondante.

## La colonne Pertinence

Elle répond à la question qu'on se pose devant trois cents lignes : *est-ce que cela me concerne ?* Elle croise le pays et le secteur de l'annonce avec vos réglages `PAYS_SUIVIS` et `SECTEURS_SUIVIS`, sans aucune intelligence artificielle et sans aucune clé.

| Niveau | Ce que cela veut dire |
|---|---|
| `3 - PRIORITAIRE` | votre pays **et** votre secteur |
| `2 - A VOIR` | l'un des deux, l'autre étant ouvert à tous |
| `1 - POSSIBLE` | rien ne correspond, rien n'exclut |
| `0 - HORS PROFIL` | un autre pays et un autre secteur |

Le détail du calcul et les réglages prêts à coller sont dans le bonus 2, *Profils métier*.

**La pertinence n'enlève jamais rien du tableau.** Elle étiquette. Pour alléger votre boîte email sans rien retirer du tableau, c'est `NOTIFIER_PERTINENCE` qui sert.

## La colonne Suivi, et ce qu'elle déclenche

Écrivez `OUI` (ou `X`, ou `VRAI`) sur les avis auxquels vous comptez répondre. Trois choses en dépendent :

1. **Votre agenda** : seules les lignes suivies y sont posées. Voir le guide *Vos échéances dans Google Agenda*.
2. **Vos rappels**, si vous mettez `RAPPELS_SUIVIS_SEULEMENT` à `true` : les rappels J-7, J-3 et J-1 ne concernent alors que ces lignes.
3. **La trace de ce que vous avez déposé** : une opportunité suivie qui arrive à échéance reste dans le tableau, en gris, au lieu d'être rangée avec le reste.

## Ce que le tableau fait tout seul

**Il se range à chaque passage.** Le plus de temps devant en haut, les échéances de plus en plus proches ensuite, les expirées en dessous, et les annonces sans date tout en bas. À délai égal, la plus pertinente passe devant.

Le tri étant refait à chaque exécution, **un tri manuel ne tient pas**. Pour retrouver une catégorie, utilisez plutôt les filtres de l'en-tête : filtrez sur `Pays`, sur `Secteur`, ou sur `Statut_Delai`.

**Il ne fait jamais entrer une annonce déjà échue.** Les portails laissent des années d'archives en ligne : sans ce filtre, votre tableau serait une salle d'attente de lignes grises.

**Il n'invente aucune date.** Quand la source ne publie pas d'échéance, `Deadline` reste vide et le statut devient `DATE A VERIFIER`. Ouvrez l'avis officiel : une date devinée vous ferait manquer un dépôt.

**Il ne met pas deux fois la même annonce.** Une opportunité publiée à la fois sur un portail national et chez un bailleur n'entre qu'une fois. Si la source corrige son intitulé ou sa date, la ligne est mise à jour et `Derniere_MAJ` change.

## Les autres onglets

| Onglet | À quoi il sert |
|---|---|
| LISEZ_MOI | Le rappel des trois étapes de démarrage. |
| SOURCES | Le catalogue, avec l'état de la dernière collecte de chaque source. |
| CONFIG | Tous vos réglages. Ne modifiez que la colonne `Valeur`. |
| PAYS_ET_SECTEURS | Les pays et secteurs réellement collectés, avec leur nombre d'annonces. C'est là qu'on recopie les valeurs à mettre dans `PAYS_SUIVIS`. |
| PLANS_DE_PASSATION | Les marchés à venir. Voir le guide dédié. |
| LOGS | Le journal de chaque passage. La première chose à regarder quand quelque chose manque. |

## Que faire si

**Le menu TenderPilot a disparu.** Rechargez la page du classeur. S'il ne revient pas, ouvrez Extensions > Apps Script et lancez la fonction `autoriser` une fois.

**Le tableau ne se remplit pas.** Ouvrez l'onglet LOGS : chaque source y dit ce qu'elle a trouvé, ou pourquoi elle a échoué. Une source en `ERROR` isolée n'empêche pas les autres de travailler.

**Une colonne manque**, par exemple après une mise à jour du script. Menu **TenderPilot > Verifier l'installation** : il dit en une phrase quelle colonne ajouter, et à quel endroit.

**Une ligne vous paraît fausse.** Ouvrez son `Lien` : l'avis officiel fait foi, toujours. Si l'écart vient de notre lecture de la source, signalez-le dans le groupe WhatsApp : c'est comme cela que les extractions se corrigent.
