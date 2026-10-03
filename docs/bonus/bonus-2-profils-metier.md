Chaque profil tient en quelques lignes à coller dans l'onglet **CONFIG**, colonne **Valeur**, en face de la clé indiquée. Choisissez le profil le plus proche de votre activité, collez, puis lancez **TenderPilot > Exécuter maintenant**.

## Avant de coller : trois règles

**1. Les secteurs s'écrivent comme TenderPilot les nomme.** Un secteur mal écrit ne correspond à rien, et rien ne vous le signale. Voici les quinze noms exacts :

| Secteurs reconnus | |
|---|---|
| Sante | Eau et assainissement |
| Energie | Agriculture et agroalimentaire |
| Education et formation | Numerique et technologie |
| Infrastructures et BTP | Transport et logistique |
| Environnement et climat | Finance |
| Genre et inclusion | Humanitaire |
| Gouvernance et institutions | Culture et arts |
| Entrepreneuriat et PME | |

**2. Vos pays ne dépendent pas de votre métier.** C'est la seule clé que les profils ci-dessous ne touchent pas : écrivez dans `PAYS_SUIVIS` vos pays d'intervention, dans l'ordre d'importance, séparés par des virgules — `Benin, Togo, Niger`. Le premier passe devant dans les récapitulatifs. Écrivez-les comme TenderPilot les nomme : `Benin`, `Togo`, `Niger`, `Burkina Faso`, `Cote d'Ivoire`, `Senegal`, `Mali`, `Cameroun`. Un cabinet d'études de Cotonou et un cabinet d'études de Lomé collent donc le même profil, et n'écrivent pas les mêmes pays.

**3. Rien n'est supprimé.** Ces réglages rangent le tableau et trient vos emails. Une annonce hors profil reste dans l'onglet OPPORTUNITIES : vous la retrouvez en triant ou en filtrant.

## Comment se calcule la pertinence

Chaque annonce reçoit des points sur deux axes.

| Axe | 2 points | 1 point | 0 point |
|---|---|---|---|
| Pays | un de vos pays | ouverte à tous : International, Afrique de l'Ouest... | un autre pays |
| Secteur | un de vos secteurs, ou aucun secteur déclaré | secteur inconnu | un autre secteur |

**4 points** donnent `3 - PRIORITAIRE`, **3 points** `2 - A VOIR`, **2 points** `1 - POSSIBLE`, moins de 2 `0 - HORS PROFIL`.

Une annonce « internationale » dont le titre nomme un autre pays que les vôtres perd son point : elle ne vous concerne pas.

## Cabinet d'études et consultant

Vous répondez à des manifestations d'intérêt, dans deux ou trois domaines.

| Clé | Valeur à coller | Pourquoi |
|---|---|---|
| SECTEURS_SUIVIS | Gouvernance et institutions, Education et formation | Gardez vos deux ou trois domaines, pas plus. |
| NOTIFIER_PERTINENCE | 3 - PRIORITAIRE, 2 - A VOIR | Seul ce qui vous concerne vous écrit. |
| DIGEST_GROUPE_PAR | secteur | Vous sautez directement à votre rubrique. |
| RAPPELS_UNITAIRES_SOUS_JOURS | 5 | Références et CV se rassemblent en plusieurs jours : le rappel arrive seul plus tôt. |
| RAPPELS_SUIVIS_SEULEMENT | true | Les rappels ne concernent que les avis marqués OUI dans la colonne SUIVI. |
| SEND_AGENDA | true | Les dates limites des avis suivis vont dans votre agenda. |

## ONG et association

Vous cherchez des subventions et des appels à projets, souvent internationaux.

| Clé | Valeur à coller | Pourquoi |
|---|---|---|
| SECTEURS_SUIVIS | Genre et inclusion, Education et formation, Sante | Vos thématiques. |
| NOTIFIER_PERTINENCE | *(laisser vide)* | Un appel international vaut au mieux 3 points : ne coupez rien au début. |
| DIGEST_GROUPE_PAR | pertinence | Le plus proche de vous en premier. |
| RAPPELS_UNITAIRES_SOUS_JOURS | 7 | Un appel à projets se monte sur plusieurs jours : chaque rappel de la dernière semaine arrive seul. |
| SEND_AGENDA | true | Les dates limites des avis suivis vont dans votre agenda. |

## BTP et travaux

Vos dossiers sont lourds : garantie de soumission, états financiers certifiés, références.

| Clé | Valeur à coller | Pourquoi |
|---|---|---|
| SECTEURS_SUIVIS | Infrastructures et BTP, Eau et assainissement, Energie | Les marchés de travaux. |
| NOTIFIER_PERTINENCE | 3 - PRIORITAIRE, 2 - A VOIR | Seul ce qui vous concerne vous écrit. |
| DIGEST_GROUPE_PAR | pays | Vous voyez d'un coup d'œil où ça se passe. |
| RAPPELS_UNITAIRES_SOUS_JOURS | 7 | Une caution bancaire ne s'obtient pas en trois jours. |
| COLLECTER_PLANS | true | Au Bénin, l'onglet PLANS_DE_PASSATION annonce les travaux que les autorités prévoient de lancer, avec leur budget estimé. |

## Informatique et numérique

| Clé | Valeur à coller | Pourquoi |
|---|---|---|
| SECTEURS_SUIVIS | Numerique et technologie | Votre métier. |
| NOTIFIER_PERTINENCE | 3 - PRIORITAIRE, 2 - A VOIR | Beaucoup d'achats informatiques ont un titre générique, donc un secteur inconnu. Dans votre pays, ils valent quand même 3 points et vous écrivent. |
| DIGEST_GROUPE_PAR | pertinence | Le plus proche de vous en premier. |
| RAPPELS_UNITAIRES_SOUS_JOURS | 3 | Le réglage de départ suffit. |

## Fournisseur et commerce général

Vous vendez à tous les secteurs.

| Clé | Valeur à coller | Pourquoi |
|---|---|---|
| SECTEURS_SUIVIS | *(laisser vide)* | Sans secteur déclaré, tous les secteurs comptent. |
| NOTIFIER_PERTINENCE | 3 - PRIORITAIRE | Seules les annonces de vos pays vous écrivent. Les internationales restent dans le tableau. |
| DIGEST_GROUPE_PAR | secteur | Vous voyez tout de suite quel type d'achat est publié. |

## Agriculture, agro-industrie et environnement

| Clé | Valeur à coller | Pourquoi |
|---|---|---|
| SECTEURS_SUIVIS | Agriculture et agroalimentaire, Environnement et climat, Eau et assainissement | Vos filières. |
| NOTIFIER_PERTINENCE | 3 - PRIORITAIRE, 2 - A VOIR | Seul ce qui vous concerne vous écrit. |
| DIGEST_GROUPE_PAR | secteur | Une rubrique par filière. |

Les sources agricoles et environnementales sont déjà actives : ARAA (CEDEAO), CORAF, AGRA, Terra Viva Grants, l'Agence béninoise pour l'environnement.

## Santé et fournitures médicales

| Clé | Valeur à coller | Pourquoi |
|---|---|---|
| SECTEURS_SUIVIS | Sante | Votre métier. |
| NOTIFIER_PERTINENCE | 3 - PRIORITAIRE, 2 - A VOIR | Seul ce qui vous concerne vous écrit. |
| COLLECTER_PLANS | true | L'onglet PLANS_DE_PASSATION contient les calendriers d'achats de l'UNICEF : médicaments, dispositifs médicaux, nutrition. |

## Communication, audiovisuel et culture

| Clé | Valeur à coller | Pourquoi |
|---|---|---|
| SECTEURS_SUIVIS | Culture et arts | Les marchés culturels. |
| NOTIFIER_PERTINENCE | *(laisser vide)* | Voir ci-dessous. |
| DIGEST_GROUPE_PAR | secteur | Une rubrique par thème. |

**Pourquoi ne rien couper.** Un marché de communication est souvent rangé dans le secteur de son sujet : une campagne de sensibilisation sur la santé tombe en Sante. Dans l'onglet OPPORTUNITIES, filtrez la colonne **Opportunite** sur les mots *communication*, *audiovisuel*, *film*, *sensibilisation* ou *campagne*.

## Et ensuite

Après une ou deux exécutions, ouvrez l'onglet **PAYS_ET_SECTEURS**. Il liste les pays et les secteurs réellement collectés, avec leur nombre d'annonces. Ajustez vos réglages d'après ce que vous y lisez, pas de mémoire.
