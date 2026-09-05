<!--
  FICHIER DE REFERENCE POUR TOUT AGENT TRAVAILLANT SUR CE DEPOT.

  Convention AGENTS.md, lue par Cursor, Codex, Aider, Zed et les autres.
  Claude Code le lit via .claude/skills/tenderpilot/SKILL.md, qui en est
  GENERE : ne modifiez que ce fichier-ci, puis relancez `python build.py`.
-->

# TenderPilot

Veille d'appels d'offres pour le Bénin et l'Afrique de l'Ouest. Deux produits
jumeaux, un seul registre de sources.

```
data/sources.csv  ->  COLLECTE  ->  DEDUP  ->  DEADLINE  ->  COULEUR
                                                          ->  EMAIL + TELEGRAM
```

## Les trois règles qui priment sur tout

**1. Vérifier, jamais supposer.** Une source recommandée dans une liste — même
par un humain, même par un autre modèle — n'existe pas tant qu'elle n'a pas
répondu. Sur les listes traitées jusqu'ici, environ la moitié des URL étaient
mortes, rendues en JavaScript, ou authentifiées. Deux affirmations confiantes
se sont révélées fausses : « la BAD a un flux RSS marchés » (non, seulement
carrières et actualités) et « on peut lire les plans de passation » (non, les
trois gisements sont fermés — revérifié le 2026-09-02, voir plus bas).

**Vérifier vaut aussi dans l'autre sens.** Le 2026-09-02, une extraction
Enabel qui ne rendait plus rien a été déclarée cassée « la liste est
construite dans le navigateur » : c'était faux. La page se rendait toujours
côté serveur, seul un paramètre de filtre avait changé de comportement. Une
conclusion pessimiste est une conclusion comme une autre : elle se mesure.

**2. Ne jamais inventer une date.** Si la source n'écrit pas d'échéance, la
colonne reste vide. Une deadline devinée fait rater un dépôt — c'est le seul
dommage réel que ce produit puisse causer.

**3. Parité entre les deux moteurs.** Tout analyseur écrit dans
`web/src/lib/domain/` doit exister à l'identique dans `apps_script/`. Une
source présente d'un seul côté ne lève aucune erreur : elle renvoie zéro
annonce, en silence. C'est exactement ce qui est arrivé à la BAD pendant six
mois.

---

## Le classement intelligent : ce qu'il peut et ce qui lui est interdit

Optionnel, et **inerte sans clé**. Le client fournit la sienne — c'est son
compte qui paie. Fichiers : `web/src/lib/domain/llm.ts` (logique pure),
`web/src/lib/llm.ts` (réseau), `apps_script/Llm.gs` (les deux, Apps Script
n'ayant pas de modules).

### L'interdiction, et pourquoi elle tient

**Le modèle ne lit jamais une date.** Un modèle produit toujours une échéance
plausible plutôt que rien, et une échéance inventée fait rater un dépôt.

L'étanchéité ne tient pas à une liste de champs protégés, elle tient à la
forme : **le jugement du modèle n'est jamais étalé dans la fiche.** Seuls les
champs nommés un par un — secteur, type, résumé, pertinent, opportunité —
sont repris. Une échéance renvoyée malgré l'interdiction, sous n'importe quel
nom, n'a aucun chemin pour arriver.

Un test des deux côtés lui fait renvoyer `2030-01-01` et vérifie que la fiche
garde sa date.

### Les quatre règles à ne pas défaire

1. **Le modèle ne casse jamais la collecte.** Clé absente, plafond atteint,
   API en panne, réponse illisible : les annonces traversent sans classement
   et le produit se comporte comme avant que la fonctionnalité existe.
2. **Une annonce non jugée est conservée.** Le doute profite à l'annonce.
   `appliquerPreferences` ne retire que ce qui a été **explicitement** jugé.
3. **On ne soumet que le nouveau.** Ce qui est déjà suivi a son jugement ;
   le renvoyer triplerait la facture sans rien apprendre.
4. **La zone étiquette, elle ne supprime pas.** Sauf demande explicite du
   client. Une ligne de trop coûte un défilement ; une opportunité supprimée
   coûte un marché.

### Le vocabulaire est fermé, et partagé

`TYPES_ANNONCE` vit dans `regles.ts` et `Core.gs`. Le modèle **et** la
normalisation déterministe y puisent.

Ils ne le faisaient pas : le modèle proposait `Appel d offres` quand le
registre écrivait `Appel d'offres`. Deux chaînes différentes, donc un choix
du modèle qui ne correspondait **jamais** au défaut de la source. Toute
valeur hors liste est rejetée, jamais rangée dans « Autre » en douce.

### Ce qui doit marcher sans clé

Un client sans clé doit avoir un produit complet, pas un produit diminué :
collecte, **lecture des dates**, **filtre des échues**, couleurs, alertes,
déduplication, **filtre par type** — **et la colonne `Pertinence`**. Le
classement n'ajoute que le secteur par annonce, le tri des articles, les
résumés et l'étiquette de zone.

C'est pourquoi `normaliserType()` est déterministe : mesuré le 2026-09-02, il
ramène quatorze libellés à huit, sans aucun appel réseau. Et c'est pourquoi
`pertinence()` l'est aussi.

## Le profil du client : `PAYS_SUIVIS` et `SECTEURS_SUIVIS`

Deux clients reçoivent les mêmes annonces et n'ont pas le même métier. La
colonne `Pertinence` répond à une seule question — *est-ce que cela me
concerne ?* — en croisant le pays et le secteur de l'annonce avec les deux
clés de l'onglet CONFIG. `pertinence()` vit dans `Core.gs` et `regles.ts`,
le vocabulaire dans `schema/columns.py`.

**Deux axes, deux points chacun, un total de 0 à 4.**

| | 2 points | 1 point | 0 point |
|---|---|---|---|
| **Pays** | dans `PAYS_SUIVIS` | n'exclut personne : `International`, `Afrique (multi-pays)`, vide | un autre pays |
| **Secteur** | dans `SECTEURS_SUIVIS`, **ou aucun secteur déclaré** | secteur inconnu | un autre secteur |

`4 → 3 - PRIORITAIRE`, `3 → 2 - A VOIR`, `2 → 1 - POSSIBLE`, sinon
`0 - HORS PROFIL`. Le libellé commence par son rang pour qu'un tri
alphabétique de Google Sheets range le plus pertinent en premier.

**Trois choses à ne pas défaire.**

1. **Ne rien déclarer n'est pas se restreindre.** Sans `SECTEURS_SUIVIS`, le
   secteur donne deux points, pas un : le client livré n'a que
   `PAYS_SUIVIS=Benin`, et ses annonces béninoises doivent rester en tête.
   Une configuration entièrement vide ne dégrade rien.
2. **Un appel mondial n'est jamais rétrogradé.** Une structure béninoise peut
   candidater à un appel ouvert à tous — c'est la même décision que
   `LLM_APPELS_MONDIAUX`, et elle vaut **sans clé**.
3. **Elle étiquette, elle ne supprime pas.** Une ligne de trop coûte un
   défilement ; une opportunité supprimée coûte un marché. Le seul levier qui
   supprime reste `LLM_FILTRER_ZONE`, et il est à `false`.

**`PAYS_SUIVIS` est sortie du bloc IA le 2026-09-02, et ce n'est pas
cosmétique.** Elle existait avant, mais ne servait qu'à l'invite du modèle :
sans clé, elle ne faisait **rien**. Rangée au milieu des `LLM_*`, elle passait
pour un réglage d'IA, et le client a légitimement conclu qu'elle était morte.
Elle est maintenant juste après Telegram, avec `SECTEURS_SUIVIS`, sous un
en-tête qui dit qu'elles agissent **sans aucune clé**. Un réglage qui ne se
voit pas agir est un réglage qu'on croit cassé.

La pertinence est **recalculée à chaque passage**, comme les jours restants,
dans `updateDeadlines` / `majDeadlines`. Changer une clé et relancer suffit
donc à remettre à jour tout le tableau, y compris les lignes collectées il y a
six mois — rien n'est recollecté. Les emails et Telegram trient le
récapitulatif par pertinence puis par urgence : les dix lignes montrées
doivent être les dix qui comptent, pas les dix premières arrivées.

## Les guides PDF : ce que la mise en page doit tenir

Cinq réglages, chacun venu d'un défaut visible sur une page rendue.

**Les liens écrits en toutes lettres sont cliquables.** Le lien de copie, le
groupe WhatsApp, l'adresse email — et le **numéro WhatsApp**, qui devient un
`wa.me/…`. Les laisser en texte mort obligerait le lecteur d'un PDF à les
recopier à la main, sur un téléphone. Les liens Markdown sont mis de côté
sous un jeton **avant** la reconnaissance des adresses nues : sinon l'URL qui
vit dans leur parenthèse serait transformée à son tour, et le lien porterait
un lien. Un numéro n'est cliquable que s'il est annoncé comme WhatsApp — sans
cette condition, un montant deviendrait un lien.

**Le bleu des liens est celui du logo**, relevé sur l'image : `#0050F0`.

**Un titre se colle à ce qui le suit — sauf devant un grand tableau.**
`keepWithNext` force le titre **et tout l'élément suivant** sur la même page :
devant un tableau de quatorze lignes, les deux basculaient à la page suivante
et laissaient un tiers de page blanc. `grand_tableau_apres()` détecte le cas
et retire la colle : le tableau commence sous son titre et se coupe
proprement, en-tête répétée. Même seuil des deux côtés — au-delà de huit
rangées, la coupure vaut mieux que le trou.

**Les colonnes se répartissent selon leur contenu.** Trois colonnes égales
donnaient autant de place à un nombre à deux chiffres qu'à une phrase. La
racine carrée de la longueur amortit les écarts, bornée entre 12 % et 55 %.

**Pas de quadrillage, des filets horizontaux.** Un quadrillage enferme chaque
mot dans une case et fatigue la lecture.

## La marque : deux originaux, dix déclinaisons

`data/marque/` porte les **deux seuls fichiers à garder** — le logo
horizontal et l'icône carrée. `python builders/marque.py` en tire tout le
reste dans `data/marque/rendu/`, qui n'est **pas** versionné : versionner dix
PNG générés ferait un diff binaire à chaque retouche.

**Les originaux ne sont jamais modifiés.** Un original abîmé ne se récupère
pas, et ce n'est pas à un script de build de faire courir ce risque.

Deux traitements, tous deux mesurés le 2026-09-03 :

- **Rognage.** Le logo livré fait 1536×1024, son dessin n'occupe qu'une bande
  de 1432×319 — **69 % de vide**. Posé tel quel dans un en-tête de 13 mm, il
  n'en aurait rempli que 4. Le seuil d'alpha ignore le halo, sinon on
  rognerait la lueur au lieu du dessin.
- **Mise au carré.** Le dessin de l'icône rogné fait 1059×1024. « Presque
  carré » suffit à déformer visiblement un pictogramme quand on le
  redimensionne en 512×512 : on le centre donc dans un carré transparent.

Le logo des guides est le **600 px**, pas le 1200 : 262 points par pouce à la
taille imprimée, déjà au-delà de ce qu'un imprimeur restitue. Le 900 px
pesait 120 ko dans **chacun** des cinq guides — et ces PDF voyagent par
WhatsApp.

Enfin, `logo_guides()` rend `None` si l'image manque : **un livrable ne
dépendra jamais d'un fichier de marque.** Le guide s'imprime avec son titre
seul, et le build ne casse pas.

## L'heure d'un déclencheur est une fenêtre, pas une alarme

**Mesure du 2026-09-03 : le passage de 8h est arrivé à 8h55.** Conforme, et
déroutant. `atHour(8)` seul veut dire « entre 8h00 et 9h00 » : Google se
réserve l'heure entière pour répartir la charge de tous ses utilisateurs.

`nearMinute(0)` ramène la fenêtre à **plus ou moins quinze minutes**. Elle ne
tombera jamais à zéro, et le promettre au client serait mentir — le LISEZ_MOI
dit donc « 8h, 13h et 18h, à quinze minutes près ».

Le fuseau appliqué est celui du **projet de script** (`appsscript.json`), pas
la clé `TIMEZONE` de l'onglet CONFIG. Les deux valent `Africa/Porto-Novo` :
les désynchroniser ferait tourner la collecte à une heure et dater les lignes
à une autre.

## La collecte en deux temps : la liste, puis les fiches

**Mesure du 2026-09-04, sur JobRelais.** Sa liste rend 12 avis par page,
27 pages, de vrais avis ouest-africains — et **pas une seule échéance** :
pour toute date, « il y a 3 mois ». La date existe pourtant, proprement
balisée en JSON-LD `validThrough`, mais **sur la fiche de chaque avis**.
Sans second temps, cette source arrivait sans date, le filtre des échues ne
pouvait pas jouer, et le tableau se serait rempli d'avis morts. Elle était
restée inactive pour cette seule raison.

**Comment une source le déclare.** Elle n'a rien à déclarer dans le
registre : c'est l'existence d'un analyseur dans `ANALYSEURS_FICHE`, sous
le même nom de site, qui active le second temps. C'est honnête — celui qui
écrit l'analyseur est celui qui sait que le site date ailleurs.

**Trois bornes, parce que ce n'est pas gratuit** (mesuré : ~2,3 s par fiche) :

1. **Une fiche n'est lue que si l'échéance manque.** Une annonce que la
   liste date ne coûte aucune requête.
2. **Une annonce déjà au classeur n'est jamais relue.** Les liens connus
   descendent depuis `executerTenderPilot`, qui lit les opportunités avant
   de collecter. Sans cela, chaque passage relirait les douze mêmes fiches
   et le rattrapage tournerait en rond.
3. **Un plafond par passage** — `MAX_FICHES_PAR_PASSAGE`, 12. Ce qui dépasse
   revient au passage suivant, où il sera encore inconnu.

**Deux règles à ne pas défaire.**

**La fusion comble, elle ne remplace pas.** Ce que la liste a lu fait foi ;
la fiche ne remplit que les cases vides. Une source qui donne un titre court
en liste et un titre à rallonge en fiche ne doit pas voir le second écraser
le premier.

**Ce qu'on n'a pas pu dater n'entre pas.** Pour une source qui déclare un
analyseur de fiche, l'absence de date veut dire « fiche non lue », pas
« avis sans échéance » — c'est l'inverse de la règle générale, et c'est
délibéré : la retenir ferait entrer exactement la ligne morte que ce
mécanisme existe pour éviter.

## Les six minutes d'Apps Script, et ce qui les mangeait

**Mesure du 2026-09-03 : une exécution a dépassé la limite.** Le passage
entier a été perdu — ni deadlines, ni couleurs, ni emails.

Le réseau n'y était pour presque rien : **52 secondes** pour les 51 sources
actives, mesurées. Le coupable était le bavardage avec la feuille :

| Ce qui parlait | Aller-retours par passage |
|---|---|
| `logEvent`, un `appendRow` par ligne | ~500 |
| `majSource_`, en-têtes relus puis deux `setValue` par source | ~200 |
| | **~700**, soit 2 à 4 minutes |

**Chaque `setValue`, chaque `appendRow` est une requête réseau vers Google.**
C'est la première règle d'Apps Script, l'en-tête de `Sheet.gs` l'affiche — et
le journal ne l'appliquait pas.

### Ce qui a été fait, du plus rentable au moins

1. **Le journal est tamponné** (`JOURNAL_EN_ATTENTE`) et écrit en un
   `setValues`. Il est vidé tous les 100 événements malgré tout : si
   l'exécution est tuée net, on perd au pire les cent dernières lignes, pas
   la trace entière. Sans ce garde-fou, une exécution qui déborde ne
   laisserait **aucun** journal, et le diagnostic serait impossible. Toute
   fonction qui journalise hors exécution appelle `ecrireJournal_()`
   elle-même — sinon personne ne le ferait.
2. **`majSource_` tamponne aussi**, `ecrireStatutsSources_()` écrit les deux
   colonnes en deux appels.
3. **Les 57 sources désactivées tiennent en une ligne** au lieu de 57.
4. **Les annonces déjà connues tiennent en une ligne** au lieu de ~390. Le
   détail par annonce n'apprenait rien : c'est le régime normal.

### Le garde-fou : `BUDGET_COLLECTE_SECONDES`, 240 par défaut

Quatre minutes pour lire, deux pour écrire. Passé ce budget, la collecte
**rend la main** : ce qui a été lu est enregistré, les échéances sont
recalculées, les alertes partent. **Un passage tronqué vaut infiniment mieux
qu'un passage tué.**

**Et on reprend où l'on s'est arrêté.** Le rang de la dernière source lue est
gardé dans les propriétés du script ; le passage suivant commence juste
après et fait le tour. Sans cette rotation, les vingt premières sources
seraient lues à chaque fois et les dernières jamais. Une source au moins est
lue à chaque passage, même budget déjà dépassé : sinon un budget mal réglé
bloquerait tout.

**À vérifier avant d'ajouter des sources ou de la pagination :** le coût
d'un passage n'est pas le nombre de sources, c'est le nombre d'aller-retours
vers la feuille. Ajouter dix sources coûte dix requêtes réseau ; ajouter un
`setValue` dans une boucle sur les annonces en coûte des centaines.


## L'ordre du tableau, et pourquoi le tri vient en dernier

Le classeur est rangé à chaque passage : **le plus de temps devant en haut**,
puis les échéances de plus en plus proches, les expirées en dessous, et les
annonces **sans échéance tout en bas**. À délai égal, la plus pertinente
passe devant. `parDelai_` / `parDelai` portent la règle des deux côtés.

**`trierOpportunites_` est appelé en tout dernier, après les emails.** Toute
l'exécution désigne ses lignes par leur numéro — `majLigne_`,
`marquerNotifications_`, `ecrireDelais_`, `peindreLignes_`. Déplacer les
lignes avant que ces écritures soient finies ferait écrire dans la mauvaise.
À cet endroit, plus personne ne s'en sert : le passage suivant relit la
feuille et recalcule tous les numéros.

**Le tri se fait en mémoire, pas avec `Range.sort()`.** Sheets range toujours
les cellules vides en dernier, quel que soit le sens du tri, et ce
comportement n'est écrit nulle part. Le tri en mémoire dit explicitement où
vont les annonces sans échéance. Les lignes reprennent les mêmes
emplacements, dans un autre ordre : une ligne ajoutée à la main hors collecte
garde donc sa place et n'est jamais écrasée. Les couleurs, elles, ne suivent
pas les valeurs — d'où le `peindreLignes_` qui suit immédiatement.

## Vider le tableau

`Menu TenderPilot > Vider les opportunites`, sur confirmation nommant le
nombre de lignes. Efface les valeurs **et la mise en forme** — un
`clearContents` seul laisserait un tableau vide barré de vert et de rouge.

**Le journal part avec, depuis le 2026-09-02.** Après un vidage la collecte
reprend tout depuis zéro : un journal qui mêlerait les lignes de l'essai
précédent à celles du nouveau ne se lirait plus. Il est effacé **avant** que
le vidage soit journalisé — la première ligne du journal neuf dit donc ce qui
vient de se passer.

Ce qui n'est **jamais** touché : l'onglet SOURCES et la CONFIG. On remet à
zéro le résultat, jamais le réglage.

**Ce que la confirmation dit, et qui compte :** les témoins d'envoi
(`Notif_Nouvelle`, `Notif_J7`…) partent avec les lignes. La collecte suivante
reprend donc tout depuis zéro et **renvoie les alertes des mêmes
opportunités** — d'où l'intérêt de `MAX_EMAILS_PAR_EXECUTION` juste après un
vidage.

`viderOpportunites_()` fait le travail sans interface, pour être testable et
rappelable depuis un script ; `viderOpportunites()` est l'entrée de menu qui
demande confirmation.


## Le premier passage envoie tout d'un coup — et c'est réglé

**Mesuré le 2026-09-02.** Sur une feuille vierge, la première collecte ramène
239 annonces sur les quatorze sources les plus productives, dont **28 à moins
de sept jours**. Le digest ramenait bien les 239 nouveautés à **un** email —
mais les 28 rappels d'échéance partaient **un par un, dans la même minute**.
En régime courant il en part un ou deux par jour ; c'est le premier passage
qui concentre tout, et c'est celui que le client voit en premier.

`MAX_EMAILS_PAR_EXECUTION` plafonne les envois d'un passage. Trois propriétés
qui ne doivent pas se défaire :

1. **Rien n'est perdu.** Au-delà du plafond, l'exécution n'envoie plus **et
   ne marque rien**. La ligne repasse identique au passage suivant, son plan
   de notification est recalculé à l'identique, et l'alerte part alors. Le
   marquage et l'envoi vont ensemble — les séparer perdrait l'alerte en
   silence, ce qui est exactement ce que fait un quota Google épuisé.
2. **Ce qui part d'abord est ce qui compte.** La boucle parcourt les lignes
   par `parPertinence` : pays et secteur suivis d'abord, puis la plus urgente.
   Quand le plafond coupe, il coupe dans le moins pertinent.
3. **Le plafond ne compte que les emails.** Telegram n'a pas de quota
   journalier et un salon ne se noie pas comme une boîte aux lettres.

Côté Sheets, le plafond est en plus borné par ce que Google laisse encore :
`plafondEnvois_` lit `MailApp.getRemainingDailyQuota()` et divise par le
nombre de destinataires — **le quota se compte en destinataires, pas en
messages**, et une liste de trois adresses consomme trois unités par envoi.
100 par jour sur une adresse `gmail.com` ordinaire, 1 500 sur Workspace.

Côté web il n'y a pas d'équivalent : le fournisseur d'envoi a ses propres
limites, et seul le plafond configuré s'applique. C'est la seule asymétrie
volontaire entre les deux moteurs sur les notifications.

`0` désactive le plafond et rend le comportement d'avant, quota mis à part.


## Le budget : deux sources sur seize, et c'est tout

**Mesuré le 2026-09-02, source par source.** La question « peut-on afficher
les montants ? » a une réponse chiffrée, pas une intuition :

| Source | Montant exposé ? |
|--------|------------------|
| Portail européen | **oui** — `metadata.budget`, un nombre nu en euros, 20 avis sur 100 |
| Fundpilote | **oui** — `amount_min` / `amount_max` / `currency`, 10 sur 20 |
| Banque mondiale | non — aucun champ de montant dans `procnotices` |
| Grants.gov | non — `search2` ne rend ni `awardCeiling` ni `estimatedFunding` |
| Niger Marchés | non — les champs ACF donnent la date et l'acheteur, pas le montant |
| GIZ, DNCMP, PNUD, SBEE, SONEB, BCEAO, UNICEF, ARAA, ABE… | non |

La colonne `Budget` est donc **vide sur la grande majorité des lignes, et
c'est exact**. Une case vide dit « la source ne l'a pas publié », jamais
« marché sans budget ».

**On ne lit pas un montant écrit en prose.** Wellcome affiche `£3.5` dans sa
page — trois millions et demi, le mot « million » venant plus loin dans la
phrase. Un chiffre extrait là serait faux d'un facteur mille. Un budget faux
vaut moins qu'une case vide : c'est exactement la règle des dates.

**Le montant est du texte, pas un nombre.** Les devises diffèrent d'une
source à l'autre — EUR, USD, CAD — et additionner des euros avec des francs
CFA dans une colonne de tableur ne voudrait rien dire. `formaterMontant`,
`budgetSimple` et `budgetFourchette` vivent dans `json.ts` et `Json.gs`, et
rendent `""` dès qu'il n'y a rien à annoncer — un minimum à zéro compris,
que l'API de Fundpilote pose par défaut sur la moitié de ses annonces.

### Les plans de passation restent fermés

La vérification a été refaite le 2026-09-02 sur le portail béninois, où le
plan de passation porte les budgets prévisionnels :
`www.marches-publics.bj/plan-de-passation` est une application Angular dont
le HTML servi ne contient aucune donnée, et **toutes** les adresses de
`api.marches-publics.bj/v2/api/` répondent `401` — y compris des chemins qui
n'existent pas, la passerelle rejetant avant de router. Il n'existe pas de
variante RSS pour les plans : `?type=plan` rend le flux des appels d'offres,
inchangé, au même octet près.

Le flux `v2/rss` reste la seule porte publique du portail béninois. La
conclusion de départ tient, et elle est maintenant mesurée plutôt que
supposée.


## L'onglet PAYS_ET_SECTEURS : on ne configure pas de mémoire

`PAYS_SUIVIS` et `SECTEURS_SUIVIS` se remplissent à la main. **Une valeur
inventée ne se voit pas** : un pays qu'aucune source ne publie, un secteur
écrit autrement que dans le tableau, et la colonne Pertinence baisse sans que
personne comprenne pourquoi. C'est une panne silencieuse, la pire espèce.

L'onglet est donc **réécrit entier à chaque passage** depuis les opportunités
réellement collectées : `Type | Valeur | Annonces | Suivi`. Le client y lit ce
qui existe, avec son poids, et recopie.

Trois points à ne pas défaire :

1. **Réécrit, jamais complété.** Un pays dont la source a été désactivée doit
   disparaître de la liste — sinon le client continue de le suivre sans plus
   jamais rien en recevoir.
2. **Une seule table, pas deux blocs côte à côte.** Elle se trie et se filtre ;
   deux blocs juxtaposés ne le permettent pas.
3. **Une seule écriture.** `ecrireProfil_` efface et écrit en deux appels —
   c'est la leçon des six minutes, et un inventaire de cinquante lignes ne
   mérite pas cinquante requêtes.

Il est écrit **après** le recalcul de la pertinence : il montre l'état du
jour, pas celui d'avant le passage.

## `NOTIFIER_PERTINENCE` coupe la boîte, jamais le tableau

Le client liste les niveaux qui doivent lui écrire — un, plusieurs, ou rien
du tout, ce qui veut dire tous. Vide est le défaut : **un client qui n'a rien
réglé ne doit rien rater.**

**On ne marque pas ce qu'on n'envoie pas.** Le niveau d'une ligne change dès
que le client change ses pays ou ses secteurs : marquer ici lui interdirait de
recevoir plus tard une alerte qu'il vient tout juste de demander. Même règle
que le plafond d'envois, pour la même raison.

**La comparaison est tolérante** — `3 - PRIORITAIRE`, `PRIORITAIRE` et `3`
désignent le même niveau. Un réglage qui n'obéit qu'à celui qui a recopié le
tiret et les espaces au bon endroit est un réglage qui ne marche pas.

## Deux canaux, deux rythmes, deux mémoires

L'email et Telegram partagent leurs règles de **déclenchement** — une
opportunité ne prévient jamais deux fois par le même canal. Tout le reste
leur est propre, et c'est une décision, pas un oubli.

**Pourquoi ils ne peuvent pas partager un plafond.** L'email est contraint
par le quota Google — compté en *destinataires*, 100 par jour sur un compte
gmail.com — et par une boîte qu'on noie en vingt messages. Telegram n'a ni
l'un ni l'autre : l'API tolère une trentaine de messages par seconde vers un
même salon. Tant qu'un seul plafond gouvernait les deux, régler l'email à 20
imposait 20 à Telegram, et un salon qui aurait pu tout recevoir n'en recevait
que vingt. `MAX_EMAILS_PAR_EXECUTION` et `MAX_TELEGRAM_PAR_EXECUTION` sont
donc comptés séparément, chacun avec son compteur.

**Et pourquoi ils ne peuvent plus partager un témoin.** Une case `Notif_*`
portait un booléen : « cette alerte est partie ». Cela suffisait tant que les
deux canaux avançaient ensemble. Dès l'instant où ils ont chacun leur
plafond, ils n'avancent plus au même rythme : Telegram peut avoir servi une
ligne que l'email doit encore envoyer au passage suivant. Un seul booléen ne
sait pas dire cela — il ferait **soit un doublon sur Telegram, soit un email
perdu**.

La case porte donc la liste des canaux déjà servis : `` (vide), `email`,
`telegram`, ou `email,telegram`. La chaîne est toujours écrite dans l'ordre
de `CANAUX` : deux passages doivent produire la même valeur, sinon la
cellule change sans que rien n'ait changé.

**Rétrocompatibilité — le seul choix sûr.** Une case écrite par une version
précédente vaut `TRUE`. Elle est lue comme **tous canaux servis**. L'autre
lecture — « aucun canal » — renverrait à un client en service toutes les
alertes qu'il a déjà reçues, et c'est la seule erreur des deux qu'on ne peut
pas rattraper.

**Un échec d'envoi ne marque rien.** Si l'appel échoue, le canal n'a rien
servi : la ligne repassera au prochain passage. C'est la même règle que le
plafond et que `NOTIFIER_PERTINENCE` — on ne marque que ce qui est parti.

### Le troisième canal : ntfy

Choisi pour une raison unique : **il ne demande rien au client**. L'email
suppose une boîte qu'on relève ; Telegram suppose un bot, un jeton, un salon.
ntfy suppose *un mot* — le client installe l'application, s'abonne à un sujet,
colle ce sujet dans `CONFIG`, et son téléphone sonne. Aucun compte, aucune
inscription, gratuit.

Contrat **mesuré le 2026-09-04**, par un aller-retour réel sur `ntfy.sh` :
un POST avec le texte en corps et les en-têtes `Title`, `Priority`, `Tags`,
`Click` rend `200`, et le message se relit tel quel sur le sujet.

Deux différences avec Telegram, qui sont dans le code :

- **le corps est du texte simple.** ntfy affiche ce qu'on lui donne ; y
  envoyer du HTML afficherait les balises ;
- **le digest montre cinq lignes, pas dix.** Une notification push se lit
  d'un coup d'œil sur un écran verrouillé.

Et ce qui doit être dit au client, écrit dans `CONFIG` : sur le serveur
public, **un sujet n'est pas un secret**. Quiconque le devine lit les alertes
et peut en envoyer. Les avis de marchés sont publics — c'est son confort qui
est en jeu, pas sa confidentialité — mais il doit le savoir, d'où la consigne
de choisir un sujet long.

## Suivre une offre : la seule colonne que le client remplit

L'agenda n'est pas un canal comme les trois autres. Un email, un message, une
notification : trois façons d'interrompre. L'agenda n'interrompt pas, il
**organise** — la date limite apparaît dans le calendrier du téléphone, à sa
place, des semaines à l'avance, et Google se charge des rappels.

**Et il ne reçoit pas tout.** Le classeur ramène des centaines d'avis ; les y
verser tous rendrait l'agenda du client inutilisable en une semaine, ce qui
est exactement le contraire du service rendu. Seules entrent les lignes dont
la colonne `Suivi` porte `OUI` : les avis auxquels il a décidé de répondre.

C'est la **seule colonne que le client remplit**. Tout le reste du classeur
est écrit par le script ; celle-là est sa décision, et elle commande son
agenda. Ne la remplissez jamais depuis le code.

Trois conditions pour qu'une échéance soit posée, et les trois comptent :
`Suivi` vaut `OUI`, la ligne a une `Deadline`, et la colonne `Agenda` est
vide. Cette dernière garde l'identifiant de l'événement : **une échéance
posée ne l'est jamais deux fois**, et vider la cellule la fait reposer — la
porte de sortie quand le client a supprimé l'événement à la main.

### `RAPPELS_SUIVIS_SEULEMENT`, et l'exception qui le sauve

Le même choix peut gouverner les rappels : avec ce réglage à `true`, les
alertes J-7, J-3, J-1 et « échéance dépassée » ne partent plus que pour les
lignes suivies.

**L'annonce d'une nouveauté n'est JAMAIS concernée**, et c'est ce qui rend le
réglage utilisable. Une opportunité qui vient d'entrer ne peut pas encore
être suivie — le client ne l'a pas vue. La restreindre reviendrait à ne plus
rien annoncer, et le produit ne servirait plus à rien.

**Un rappel écarté n'est pas marqué.** Le client peut cocher `Suivi` demain,
et le rappel doit alors partir. C'est la même règle que pour
`NOTIFIER_PERTINENCE` et que pour le plafond : *on ne marque que ce qui est
parti*.

Le défaut est `false` : un classeur déjà en service ne perd pas ses rappels
parce que son propriétaire n'a rien coché.

**Pas de jumeau dans le moteur web, et c'est voulu.** `CalendarApp` agit sur
le compte Google du propriétaire du classeur, qui est aussi le destinataire.
Le produit web a sa propre base et aucun compte Google : un jumeau
demanderait un consentement OAuth que ce produit ne demande pas. La règle de
parité vise les **analyseurs** — ce qui lit une source — pas les transports.

### Ce que la priorité entre rappels et nouveautés recouvre

Il n'y a **pas** de priorité par catégorie : rien ne dit « les rappels
d'abord » ni « les nouveautés d'abord ». L'ordre d'envoi est celui de
`parPertinence_` — pertinence décroissante, puis délai croissant. À
pertinence égale, un rappel J-1 passe donc avant une nouveauté à trois
semaines, parce que son échéance est plus proche, pas parce que c'est un
rappel. Et une nouveauté prioritaire passe devant un rappel hors profil.

Deux effets de structure s'ajoutent à cet ordre :

- le **digest** part avant la boucle, et absorbe toutes les nouveautés en un
  message dès qu'elles dépassent `DIGEST_THRESHOLD` ;
- parmi les rappels d'une même ligne, **un seul part** — le plus urgent — et
  les autres sont marqués sans objet.

## L'onglet SOURCES est livré visible

Il a longtemps été masqué — c'était de la plomberie. Il ne l'est plus : sa
colonne `Active` est le seul endroit où le client choisit ce qu'il surveille,
et mettre une commande de menu devant le réglage le plus utile du produit
était une marche de trop. La bascule du menu reste, pour qui veut le ranger.

Rappel qui n'a pas changé : pour écarter une source on écrit `NON`, on ne
supprime pas la ligne — la synchronisation la remettrait.


## Ajouter une source

### Étape 1 — Vérifier avant d'écrire une ligne de code

```bash
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36"
curl -sS -L --max-time 30 -A "$UA" "<URL>" -o page.html -w '%{http_code} %{size_download}\n'
```

Puis **mesurer le texte utile**, script et style retirés :

```python
import re, io
s = io.open('page.html', encoding='utf-8', errors='replace').read()
s = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', s, flags=re.S | re.I)
print(len(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', s)).strip()))
```

Un HTTP 200 de 200 ko avec 900 caractères de texte est une coquille
JavaScript : la source est **inexploitable**, quoi qu'en dise la page.
Sèmè City, World Bank Business Opportunities et STEP sont dans ce cas.

### Étape 2 — Choisir la méthode, dans cet ordre

| Méthode | Quand | Solidité |
|---------|-------|----------|
| `JSON:<hôte>` | une API publique existe | contrat stable |
| `RSS` | un flux existe | stable mais pauvre en champs |
| `HTML:<hôte>` | rien d'autre | casse quand le site est refait |
| `MANUAL` | login, captcha, navigateur piloté | rien n'est collecté |

Cherchez toujours une API avant de scraper. Une page Angular vide côté serveur
cache souvent une API publique : la Banque mondiale, invisible en HTML, expose
`search.worldbank.org/api/v2/procnotices`. Un site WordPress a souvent
`/feed/`, mais **vérifiez le contenu** : beaucoup de flux ne servent que des
billets de blog, pas des avis.

### Étape 2 bis — Une liste qui tient sur plusieurs pages

Mettez `{page}` dans l'URL du registre. La collecte remplace le marqueur par
1, 2, 3… et s'arrête d'elle-même :

- dès que `MAX_ITEMS_PER_SOURCE` annonces sont retenues — la GIZ a douze
  pages, mais un plafond à 40 en lit deux ;
- après **deux** pages sans rien de neuf. Deux, pas une : une page entière de
  marchés déjà attribués n'apporte rien et n'est pourtant pas la fin de la
  liste. Au-delà de la dernière page, le portail en sert autant qu'on en
  demande, vides ;
- à 20 pages, garde-fou (`PAGES_MAX`).

Une source **sans** `{page}` fait exactement une requête, comme avant.

Deux détails qui ont leur importance. Les doublons ne sont écartés que d'une
page à l'autre, **jamais à l'intérieur d'une même page** : deux exemplaires
d'un même avis sur la même page doivent traverser, c'est la déduplication
d'écriture qui les réunit et elle sait compléter la fiche. Et un échec HTTP
sur la **première** page est une panne de source, alors qu'un échec sur une
page suivante termine simplement la pagination : ce qui a déjà été lu reste
bon.

### Étape 2 ter — Le jeu de caractères n'est pas toujours l'UTF-8

`getContentText()` sans argument suppose l'UTF-8, et `Response.text()` décode
en UTF-8 quoi que dise l'en-tête. Le portail de la GIZ sert de l'ISO-8859-1 —
il l'annonce dans son `Content-Type` — et sans le lire « Überarbeitung » et
« développement » reviennent en morceaux. `corpsReponse_()` et
`texteDecode()` lisent l'en-tête et décodent en conséquence, avec repli sur
l'UTF-8. On ne devine pas : on lit ce que le serveur déclare.


### Étape 3 — Capturer une fixture

```bash
curl -sS -L --max-time 35 -A "$UA" "<URL>" -o tests/fixtures/<nom>.html
```

Les tests tournent contre de **vraies pages**. Une fixture écrite à la main ne
teste que l'idée qu'on se fait du site, jamais le site.

### Étape 4 — Écrire l'analyseur des deux côtés

- `web/src/lib/domain/html.ts` ou `json.ts` → renvoie `EntreeFlux[]`
- `apps_script/Html.gs` ou `Json.gs` → renvoie `normalizeOpportunity(...)`

Le runtime Apps Script est **V8** : `const`, arrow functions, `?.` et `??`
fonctionnent. Les regex se portent mot pour mot ; seules changent la signature
`(html, source)` et la sortie.

Enregistrer dans les deux répertoires : `ANALYSEURS_HTML` / `ANALYSEURS_JSON`.

### Étape 5 — La ligne CSV

`data/sources.csv`, colonnes :
`Source_ID, Nom, Methode, URL, Pays_Defaut, Secteur_Defaut, Type_Defaut, Active, Derniere_Collecte, Statut`

- `Statut` porte **ce qui a été mesuré** ce jour-là, pas une promesse :
  `"Verifie le 2026-09-01 : 30 avis, tous avec date de cloture."`
- `Active = NON` pour une source qui publie une ou deux fois par an, ou dont le
  flux est bruité. Mieux vaut inactive que noyée.
- `Type_Defaut` et `Secteur_Defaut` : **laisser vide si la source donne
  elle-même l'information**. La valeur de l'annonce prime toujours sur le
  défaut ; imposer un défaut écraserait une donnée plus juste.

### Étape 6 — Tests, puis build

```bash
cd web && npm test        # analyseurs + moteur
cd .. && python build.py  # classeur, guides, archives, conformité
```

Le test de cohérence refuse toute divergence entre les quatre copies du
registre.

---

## Corriger un bug

### Reproduire d'abord, sur la fixture

Si l'analyseur renvoie 0, ce n'est presque jamais le site : c'est une regex.
Comparez le nombre de blocs trouvés au nombre attendu avant de toucher au
reste.

### Les pièges qui ont déjà coûté du temps

**Les heredocs mangent les antislashs.** Écrire une regex dans un
`python - <<'PY'` produit `\b` transformé en caractère backspace (0x08), ou
`\s` en `s`. Les regex deviennent silencieusement fausses. Deux parades :

- l'outil `Write` plutôt qu'un heredoc ;
- un jeton : écrire `@s` et faire `.replace('@', chr(92))` à la fin.

Après toute génération de code, **scanner les caractères de contrôle** :

```python
bad = [(i, ord(c)) for i, c in enumerate(s) if ord(c) < 32 and c not in '\n\t']
```

**En JavaScript, `'\s'` vaut `'s'`.** Une regex construite par `new RegExp("...")`
a besoin de `\\s` dans la source. Préférez un littéral `/.../` quand c'est
possible — mais alors chaque `/` doit être échappé, y compris dans `<\/div>`.

**Les gardes par sous-chaîne se trompent.** `if "analyserAfd" not in source`
est vrai même quand `analyserAfdb` existe déjà : l'insertion est sautée en
silence. Gardez sur une forme complète : `"export function analyserAfd("`.

**`tests/test_sheet.py` refuse les noms de colonnes en dur** dans le
JavaScript. Un libellé HTML qui vaut exactement `'Type'` fait échouer le build.
Qualifiez-le : `'Type[^<]*'`.

**Les mois français ne sont pas lisibles par `new Date()`.** « 24 Août 2026 »
doit passer par `extraireDeadline` / `extractDeadline`, pas par `Date`.

**Une date nue recule d'un jour.** `new Date("02 March 2026")` placé à minuit
local, relu en UTC depuis un fuseau positif, donne le 1er mars. `lireDateFlux`
gère le cas — ne le contournez pas.

**Zéro annonce n'accuse pas l'analyseur.** Avant de toucher une extraction
qui ne rend plus rien, redemandez la page **sans les paramètres de filtre**.
Mesure du 2026-09-02 : Enabel rendait « Sorry, we couldn't find any results »
sur `?in_country=850&is_status=0`, et ses dix marchés béninois sur la même
adresse en `is_status=all`. Le site avait changé le comportement de son
filtre, pas sa mise en page — l'analyseur lit la capture du 2026-08-31 comme
la page du jour. Conclure « la liste est rendue par le navigateur » sur la
seule absence de cartes est une erreur : c'est la première chose à vérifier,
pas la première à croire.

**Et ne changez pas de langue pour réparer.** La même page existe en
`/fr/marches-publics/` et rend les mêmes cartes, mais ses étiquettes sont
traduites (« Pays », « Date de clôture ») quand l'analyseur lit `Country` et
`Closing date`. Elle lirait les cartes sans jamais en tirer ni pays ni
échéance.

**Un doublon n'a pas toujours de ligne.** Mesure du 2026-09-02, sur la
BCEAO : la même page listait deux fois le même avis. Le second exemplaire
était reconnu comme doublon du premier — une annonce qui n'a ni identifiant
ni ligne tant qu'elle n'est pas écrite — et partait quand même en mise à jour
de feuille. `getRange(null, colonne)` arrêtait alors l'exécution entière :
ni deadlines, ni couleurs, ni emails, pour toutes les sources. Un doublon est
de deux natures, et l'écriture doit les séparer : la ligne déjà écrite se met
à jour, l'annonce en attente se **complète en mémoire**, et seulement là où
elle est vide. Les deux exemplaires ayant été lus dans la même exécution,
aucun n'est plus récent que l'autre : on prend l'union de ce qui a été lu,
jamais un arbitrage entre deux échéances.

---

## Un lien ne suffit pas à identifier un avis

Mesure du 2026-09-02, la découverte la plus coûteuse du projet à ce jour.

`clesDedup` posait `url:<lien>` comme identité, et `trouverDoublon` s'arrête
à la première clé qui correspond. Or beaucoup de portails pointent **chaque
avis vers la même page de liste**. Dégâts constatés en production, sur des
sources actives :

| Source | Publiés | Enregistrés |
|--------|---------|-------------|
| DNCMP Bénin | **43** | **1** |
| SBEE | 7 | 1 |
| DEDRAS | 2 | 1 |

Le Bénin passait de **22 à 70 opportunités** une fois corrigé.

**La clé porte désormais le lien ET le titre.** Le compromis est assumé : si
une source réécrit un titre, elle peut créer une seconde ligne. Une ligne en
double se voit et se supprime ; quarante-deux marchés jamais enregistrés ne
se voient pas.

### Les trois défauts se cumulaient

**Un lien codé en dur.** L'analyseur SBEE écrivait
`lien: 'https://marches-publics.sbee.bj/'` pour les sept avis, et le
commentaire au-dessus affirmait « les avis n'ont pas d'adresse propre ».
C'était faux : `/demande-dossier/appel-doffre/113`, `/118`, `/122`. Le
commentaire a été corrigé aussi — **une hypothèse fausse laissée dans le code
se reproduit**.

**Un titre de catégorie.** Le flux de la DNCMP intitule ses 43 éléments
`Appel d'Offre` — un libellé de rubrique, pas un intitulé. L'objet réel est
dans `<description>`. Même les rares lignes écrites étaient inutilisables.
`reparerTitresIdentiques` corrige, mais **volontairement étroit** : il faut
que TOUS les éléments partagent le même titre ET que les descriptions
diffèrent.

**Une référence dans la colonne type.** L'analyseur ABE y déversait
`AVIS N° 001/2026/PRMP-ABE/APM du 19 Janvier 2026`. La limite de longueur
existante — 60 caractères — ne suffisait pas : ces références en font 45.

### Le contrôle à refaire après tout changement d'analyseur

Compter les liens distincts par source. Si une source rend N avis et moins de
N liens, la déduplication va en manger.

```
liens distincts < avis collectés  ->  examiner l'analyseur
```

## Quand un GET ne suffit pas : la forme de requête

Le portail européen Funding & Tenders a coûté une heure, pour un détail.

Son API n'applique ses filtres qu'à **une** condition : un POST multipart
dont **chaque partie déclare son type de contenu**. Mesure du 2026-09-02 :

| Forme | Résultat |
|-------|----------|
| `query` en paramètre d'URL | 200, filtre **ignoré** — 4 175 120 résultats |
| Corps JSON simple | 200, filtre **ignoré** |
| GET | 405 |
| Multipart sans type par partie | **500** |
| **Multipart typé par partie** | **200, filtre appliqué — 1 421** |

Le piège est le 200 trompeur : la requête paraît réussir.

Le corps est donc **écrit à la main** dans `corpsMultipart`, pas confié à une
bibliothèque. Ce n'est pas une coquetterie : `UrlFetchApp` ne sait pas typer
les parties d'un multipart, et une chaîne construite nous-mêmes tourne à
l'identique dans les deux moteurs.

Le registre `REQUETES_JSON` décrit ces formes par hôte. Les sources qui n'en
déclarent aucune restent en GET, sans changement.

### Le tri décroissant, qui n'est pas un caprice

Un appel européen en deux étapes porte **plusieurs échéances**, et le tri
croissant retient la plus ancienne — souvent passée. Croissant rend 0
échéance à venir sur 100 ; décroissant en rend 92.

### L'agent utilisateur

`TenderPilot/1.0` seul fait refuser certains sites. L'agent s'identifie
désormais comme robot avec un préfixe `Mozilla/5.0` — forme que beaucoup de
réseaux de diffusion exigent même sur des pages publiques.

**Ce que cela ne résout pas.** Wellcome Trust rend 200 à un agent de
**navigateur** et 202 à tout agent annonçant un robot, de façon reproductible.
Se présenter en navigateur est une décision du propriétaire du produit, pas
un choix technique — elle n'a pas été prise.

**UNGM va plus loin, et le mesure au caractere pres.** Le meme agent avec le
suffixe `TenderPilot/1.0` obtient `403` ; sans le suffixe, `200`. Ce n'est
donc pas la forme de la chaine qui gene, c'est le fait de s'identifier. La
decision est la meme, et elle n'a pas ete prise non plus : voir « UNGM : le
cas a ne pas se raconter ».

Et la BAD n'a jamais eu de problème d'agent — mais l'explication qui a suivi
était fausse elle aussi. **Mesure du 2026-09-02 : `www.afdb.org` répond 403 à
TOUTES ses adresses, `robots.txt` compris**, derrière un contrôle anti-robot
Cloudflare qui exige l'exécution de JavaScript. Ce n'est ni l'agent, ni le
parallélisme — la collecte réelle est séquentielle et se fait refuser pareil.
Aucune chaîne d'agent n'en vient à bout, et franchir ce contrôle n'est pas au
programme. `AFDB-EOI` et `AFDB-NOTICES` sont désactivées dans le registre,
avec la mesure en clair ; leurs analyseurs restent en place, il suffira d'un
`OUI` le jour où le site rouvre.

## Auditer le registre

### Types et secteurs renseignés

```python
import io, csv, collections, sys
sys.path.insert(0, '.')
import schema.columns as S

with io.open('data/sources.csv', encoding='utf-8', newline='') as f:
    l = [r for r in csv.DictReader(f) if (r['Source_ID'] or '').strip()]

print(collections.Counter(r['Type_Defaut'].strip() or '(donne par la source)'
                          for r in l))
print(collections.Counter(r['Secteur_Defaut'].strip() or '(non defini)'
                          for r in l))

hors = [r['Source_ID'] for r in l
        if r['Type_Defaut'].strip()
        and r['Type_Defaut'].strip() not in S.TYPES_OPPORTUNITE]
print('types hors taxonomie :', hors)
```

Les listes `TYPES_OPPORTUNITE` et `SECTEURS` vivent dans `schema/columns.py`.
Elles sont **indicatives, pas contraignantes** : une source peut publier un
libellé imprévu, et il vaut mieux le garder tel quel que le perdre. Mais un
libellé hors liste sur une source dont c'est le *défaut* est presque toujours
une faute de frappe.

Un secteur vide n'est pas un défaut en soi : beaucoup de sources sont
généralistes. Un **type** vide, en revanche, doit se justifier — soit la source
donne le sien, soit personne ne le donne.

### Chaque source a-t-elle son analyseur ?

```python
import re, io
dispo = set()
for p in ('web/src/lib/domain/html.ts', 'web/src/lib/domain/json.ts'):
    dispo |= set(re.findall(r'"([a-z0-9.]+)":\s*analyser',
                            io.open(p, encoding='utf-8').read()))
manquants = [r['Source_ID'] for r in l
             if r['Methode'] != 'RSS'
             and r['Methode'].split(':', 1)[-1] not in dispo]
```

Comparez toujours avec le côté Apps Script : les deux ensembles doivent être
identiques.

### Les quatre copies concordent-elles ?

`python tests/test_sheet.py` le vérifie. Les copies :

| Copie | Générée par |
|-------|-------------|
| `data/sources.csv` | **la référence**, éditée à la main |
| onglet `SOURCES` du classeur | `builders/toolkit.py` |
| `SCHEMA.SOURCES_LIVREES` | `builders/toolkit.py` |
| `web/src/data/sources-defaut.ts` | `scripts/exporter_sources.py` |

---

## Décisions déjà prises — ne pas défaire sans raison

**Les annonces échues n'entrent pas.** Les portails gardent des années
d'archives : 85 % des annonces publiées sur les sources béninoises sont
expirées. Le filtre agit **à l'entrée seulement** — une opportunité déjà suivie
qui arrive à échéance reste, et passe en EXPIRE. `COLLECT_EXPIRED` la ramène.

**Les marchés déjà attribués sont écartés** côté Banque mondiale : trois quarts
du flux Bénin, et rien à soumissionner.

**Les agrégateurs commerciaux ne sont pas collectés** (Instrumentl,
DevelopmentAid, fundsforNGOs) : risque juridique, et ce sont des réindexeurs.
TenderPilot pointe toujours vers l'avis officiel.

**Le client ne reçoit ni script ni classeur** — seulement un lien de
duplication et deux PDF. Sans les fichiers, le produit ne peut être ni revendu
ni redistribué.

---

## Le nombre de sources n'est pas la mesure

Mesure du 2026-09-01, sur l'API Banque mondiale : **57 000 avis publies sur
douze pays africains, dont 61 encore ouverts.** Environ cinq par pays. Les
portails gardent des annees d'archives, et la part vivante est minuscule.

Ajouter cinquante sources qui remontent chacune zero a cinq avis ne rend pas
le produit cinquante fois meilleur : cela allonge la collecte, multiplie les
pannes a surveiller, et gonfle un chiffre qui ne veut rien dire.

### Silencieuse n'est pas cassee

**Une source sans avis ouvert aujourd'hui n'est pas une mauvaise source.**
Les plateformes publient par a-coups : un organisme peut ne rien passer
pendant trois mois, puis sortir dix marches d'un coup. La supprimer parce
qu'elle est calme, c'est perdre l'opportunite qui arrive dans six mois.

Le critere de jugement est **fonctionnelle ou cassee**, jamais productive
aujourd'hui. Le moteur distingue trois etats, visibles dans la colonne
`Statut` de l'onglet SOURCES et dans les journaux :

| Etat | Ce qui s'est passe | Que faire |
|------|--------------------|-----------|
| `OK` | des annonces lues, dont certaines ouvertes | rien |
| `EN ATTENTE` | page lue correctement, aucune echeance ouverte | **rien** : periode creuse, la source republiera |
| `FLUX VIDE` | flux valide, mais sans aucune entree | **rien** : la source ne publie rien en ce moment |
| `RIEN LU` | l'analyseur n'a rien trouve sur une page qu'on ne reconnait pas | **reparer** : le site a probablement change de mise en page |
| `SILENCIEUSE depuis N j` | des annonces, rien de neuf depuis plus de 180 jours, et aucune echeance a venir | verifier si le canal est abandonne |
| `ERREUR` | la page n'a pas repondu | reessayer ; un `403` isole peut etre une limitation de debit, un `403` sur TOUTES les adresses d'un site est un controle anti-robot |

`EN ATTENTE` et `RIEN LU` se ressemblent - dans les deux cas le tableau ne
gagne aucune ligne - et c'est precisement pour cela qu'il fallait les
separer. Le premier est normal, le second est une panne silencieuse.

**`FLUX VIDE` a ete ajoute le 2026-09-02**, pour la meme raison. Les bureaux
PNUD du Cap-Vert et du Togo servent un flux RSS parfaitement valide dont la
liste est vide : ils etaient signales `RIEN LU`, donc accuses d'avoir change
de mise en page, a chaque execution. Un flux se reconnait a sa balise racine
(`rss`, `feed`, `rdf:RDF`) : quand on l'a reconnu et qu'il ne contient rien,
il n'y a rien a reparer. Une page HTML, elle, ne dit pas si elle est vide ou
si elle a change : le doute reste entier, et le message aussi.

**Une echeance a venir prime sur l'age des publications.** Grants.gov, avec
1034 subventions ouvertes, etait annonce « peut-etre abandonnee » : le
portail expose la date d'OUVERTURE du programme, souvent vieille de deux ans,
pour des dossiers recevables jusqu'en 2028. Une annonce encore ouverte prouve
qu'il y a quelque chose a deposer - c'est la seule chose que l'utilisateur
ait besoin de savoir, et elle passe avant la fraicheur des publications.

**Ce qu'on mesure avant d'ajouter une source** : est-ce que l'analyseur lit
la page correctement ? Pas : est-ce qu'elle a des offres en ce moment.

### Pistes deja explorees, et ce qu'elles valent

| Piste | Constat mesure | Verdict |
|-------|----------------|---------|
| **Banque mondiale, par pays** | l'adaptateur existant marche pour tous les pays : `project_ctry_name=<pays>`. 17 pays d'Afrique de l'Ouest et Centrale ajoutes | fait, sans nouveau code |
| **TED (Union europeenne)** | `api.ted.europa.eu/v3/notices/search` repond sans authentification, mais une recherche plein texte "Benin" renvoie 42 000 avis : du bruit, pas des marches beninois | a filtrer finement avant d'envisager |
| **ReliefWeb** | l'API repond `410 Gone` | morte |
| **UNGM** | `401`, identifiants OAuth requis | possible avec un compte developpeur |
| **Agregateurs commerciaux** | Instrumentl, DevelopmentAid, fundsforNGOs | jamais : reindexeurs, et risque juridique |

### Pistes explorees le 2026-09-01, aucune retenue

Une tournee de recherche complete, pour ne pas la refaire.

| Piste | Constat mesure |
|-------|----------------|
| Portails nationaux CEDEAO (Togo DNCMP et ARMP, Senegal) | connexion impossible (`000`) |
| `marchespublics.ci`, UEMOA | `404` sur les adresses publiees |
| **BIDC** (banque CEDEAO) | page « Appels d'offres » a `200` et 23 ko, mais tout est du menu : aucun avis dans le HTML, et `/feed/` renvoie zero item |
| ARMP Niger, DGCMEF Burkina | accueil servi, sous-pages d'avis en `404` |
| Port de Cotonou, ASIN, ANIP | pas de rubrique appels d'offres accessible |
| **gouv.bj `/opportunites/`** (page large) | 60 avis contre 32 pour `/marches-publics/`, mais **1 seul encore ouvert contre 13** : la page large est dominee par des offres d'emploi expirees. L'ajouter degraderait le produit |

Le dernier cas merite d'etre retenu : la page large de gouv.bj n'a pas ete
ecartee parce qu'elle etait calme, mais parce qu'elle publie **autre chose** -
des offres d'emploi, pas des marches. Une page qui contient plus d'annonces
n'est pas forcement une meilleure source : regardez ce qu'elle contient, pas
combien.

Les portails nationaux restent la meilleure piste de volume, mais aucun ne
s'ajoute a la va-vite : il faut trouver la bonne sous-page, verifier qu'elle
est servie par le serveur, puis ecrire un analyseur dedie. Comptez une
demi-journee par pays.

### Une liste de sources produite par un modele : 0 sur 3

Le 2026-09-01, un prompt volontairement construit contre l'invention -
« verifie chaque URL, ouvre-la, donne la date du dernier avis, dis-moi si
tu as reellement ouvert la page » - a rendu trois sources. Le modele a
affirme pour chacune : « Page reellement interrogee et ouverte a l'instant ».

Mesure :

| Source annoncee | Ce qui a ete constate |
|-----------------|------------------------|
| UNGM `/Public/Notice` | **0 lien vers un avis**. La liste est chargee en AJAX et refuse sans session. Deux mesures independantes, a une heure d'intervalle |
| Commission CEDEAO `/procurement/` | application JavaScript : la page sert `Initializing...` et 3 800 caracteres de menu |
| ARCEP Benin `/marches-publics/` | 19 000 caracteres, **tous du menu**. `/marches-publics/feed/` renvoie zero item |

Trois sur trois. Aucune n'etait exploitable.

**La lecon n'est pas que ce modele-la se trompe.** C'est qu'une affirmation
de verification n'est pas une verification, et qu'aucune formulation de
prompt ne change cela. Une liste de sources produite par un modele est une
liste de PISTES A TESTER, jamais un resultat.

Le seul verdict qui compte est celui de `curl` suivi du comptage du texte
servi hors JavaScript. Il prend trente secondes par URL. Faites-le avant
d'ecrire une ligne de code, et avant d'annoncer quoi que ce soit.

### Un guichet ouvert n'est pas une source

Certains bailleurs ne publient pas d'appels dates. Ils expliquent un
processus, des criteres, et invitent a deposer un dossier quand on veut.

Le **FID** (Fonds d'Innovation pour le Developpement, preside par Esther
Duflo) en est l'exemple : verifie le 2026-09-01, il n'a pas de page
d'appels a projets, seulement des documents decrivant la demarche.

Ce n'est pas exploitable, et le refuser n'a rien a voir avec la qualite du
bailleur. Un guichet ouvert n'a **rien a interroger** : aucun nouvel avis
n'apparait, aucune echeance ne court. La collecte produirait une ligne
statique, eternellement identique, qui salirait le tableau sans jamais
alerter personne.

Le bon endroit pour ces financements est le **guide client**, en liste
fixe - « voici des bailleurs ou vous pouvez deposer a tout moment » - pas
le registre des sources.

Le test qui tranche : **est-ce que la page change ?** Si deux visites a
trois semaines d'ecart donnent le meme contenu, ce n'est pas une source,
c'est une brochure.

### Ou chercher du volume reellement utile

Par ordre de rendement decroissant :

1. **Un fournisseur qui expose un flux par pays.** Le PNUD en donne 58 d'un
   coup, la Banque mondiale autant. Un seul analyseur, des dizaines
   d'entrees. C'est le seul multiplicateur honnete.
2. **Les portails nationaux de marches publics**, un par pays. Chacun demande
   son propre analyseur : comptez une demi-journee par pays, et verifiez
   d'abord que la page n'est pas rendue en JavaScript.
3. **Les grands acheteurs publics d'un pays** - electricite, eau, telecoms,
   ports. Au Benin, la SBEE et la SONEB publient plus que certains bailleurs
   internationaux.
4. **Les ONG qui ont leur propre portail d'achats.** DEDRAS en est la preuve :
   98 consultations en ligne, invisible des grands agregateurs.

### UNGM : le cas a ne pas se raconter — deux fois

Ce guide a porte pendant deux commits l'affirmation qu'une inscription
gratuite suffirait a debloquer UNGM. **C'etait une supposition, pas une
mesure.** Constat du 2026-09-01 :

| Ce qui a ete teste | Resultat |
|--------------------|----------|
| `/Public/Notice` (la liste) | `200`, mais **zero lien vers un avis** : la liste est chargee en AJAX |
| `/Public/Notice/<id>` (un avis) | `200`, **lisible sans compte**, titre en clair |
| `/API/Notices` | `401` |

**Puis ce guide s'est trompe une seconde fois, sur la meme source.** Il
concluait que l'appel AJAX « refuse sans session ». Il n'avait pas ete
teste. Mesure du 2026-09-04, sur `POST /Public/Notice/Search`, corps JSON,
**sans compte et sans cookie** :

    200 — 95 040 octets — 15 avis, tous dates

Identifiant, titre, echeance, date de publication, agence, type d'avis,
reference et pays : la liste complete, dans des rangees HTML. Le filtre par
pays fonctionne (quinze identifiants CEDEAO, releves dans le selecteur de la
page publique), la pagination aussi (`PageIndex` dans le corps), et
`PageSize` est plafonne a 15 par le serveur — en demander 100 en rend 15.

**Ce qui bloque reellement est ailleurs, et tient en une ligne :**

| Agent utilisateur | Reponse |
|---|---|
| `Mozilla/5.0 (Windows NT 10.0…) Chrome/124.0.0.0 Safari/537.36 TenderPilot/1.0` | **403** |
| la meme chaine **sans** le suffixe `TenderPilot/1.0` | **200** |

Un 403 IIS nu — ni Cloudflare, ni defi, ni CAPTCHA. UNGM ne bloque pas les
robots techniquement : **il refuse ceux qui s'annoncent.** Retirer le
suffixe reviendrait a ne plus s'identifier du tout. C'est le cas Wellcome a
l'identique, et la meme regle s'applique : **c'est une decision du
proprietaire du produit, pas un choix technique — elle n'a pas ete prise.**

`UNGM-CEDEAO` est donc livree **inactive**, avec son analyseur, sa forme de
requete et ses tests ecrits des deux cotes. Le jour ou cette decision est
prise, il suffit d'un `OUI` dans le registre.

UNGM propose par ailleurs une offre payante d'alertes, et son API `/API/…`
demande un jeton. Les conditions n'ont pas ete etablies : ne les supposez
pas.

**La lecon, et c'est la deuxieme fois que cette source la donne.** Un
diagnostic qui n'a pas ete mesure est une supposition, meme quand il est
formule avec assurance et qu'il figure deja dans ce guide. « Refuse sans
session » etait faux ; il suffisait d'un POST pour le voir.

### Ou chercher ensuite, par rapport effort/resultat

1. **Un fournisseur avec un flux par pays** deja identifie - c'est ce qui a
   donne 58 entrees PNUD et 18 Banque mondiale sans nouveau code.
2. **Un portail national** : une demi-journee chacun, analyseur a ecrire
   **et a maintenir**. Le Togo et la Cote d'Ivoire sont les plus proches
   commercialement du Benin.
3. **Un gros acheteur public** d'un pays deja couvert. Au Benin, la SBEE et
   la SONEB publient plus que certains bailleurs internationaux.

Et la regle qui vaut pour toutes : **mesurez avant d'annoncer.** Ce guide a
deja porte deux affirmations fausses parce qu'elles paraissaient
raisonnables.

---

## Le flux d'actualités d'un bailleur n'est pas un flux d'opportunités

Mesuré deux fois, sur quatorze flux, les 1er et 2 septembre 2026. C'est le
piège le plus coûteux du catalogage, parce qu'il ne ressemble pas à une
panne : le flux répond 200, il livre dix éléments frais et datés, tous les
voyants sont au vert. Il ne contient simplement aucune opportunité.

Premier lot, huit flux désactivés :

| Flux | Vraies opportunités |
|---|---|
| Tony Elumelu, ACBF, Adaptation Fund, AfriLabs, ONU-Habitat | 0 sur 10 chacun |
| Union africaine | 1 sur 10 |
| Proparco | 5 sur 10, mais des communiqués contenant le mot « financement » |
| J360 | 37 sur 55 « retenues », alors que c'est un blog **sur** les marchés publics |

Second lot, six pistes explorées puis écartées :

| Flux | Vraies opportunités | Contenu réel |
|------|---------------------|--------------|
| GEF | 0 sur 6 | des **fiches de personnel** — noms et titres d'employés |
| Oxfam | 0 sur 6 | communiqués de presse |
| ACTED | 0 sur 6 | récits de projets |
| IFDD | 1 sur 6 | un appel noyé dans des comptes rendus |
| SGCI | 1 sur 6 | un rappel d'échéance |
| Grand Challenges Canada | 2 sur 6 | annonces de lancement |

**La règle.** Une source est bonne quand son URL est *consacrée aux appels*.
Elle est mauvaise quand c'est le fil d'actualité général de l'organisme —
même quand l'organisme finance réellement, et même quand le flux est frais.
Les bailleurs publient leurs appels sur une page dédiée ; leur RSS sert la
communication.

Ce qui marche partage ce trait, sans exception mesurée : Terra Viva Grants
(7 opportunités sur 8), catalogue de financements ; SBEE, SONEB, DNCMP,
Enabel, pages de marchés ; l'API de la Banque mondiale ; Wellcome et Grand
Challenges, pages de programmes.

**Le corollaire, qui fait gagner du temps.** Avant de tester un flux, regarder
son URL. `/feed/`, `/rss.xml`, `/news/` à la racine d'un organisme : très
probablement de la communication. `/appels-doffres/`, `/tenders/`,
`/funding-opportunities/`, `/grant-opportunities/` : là il y a une chance.

**Le second corollaire.** Un filtre par mots-clés ne rattrape pas ce défaut.
Mesuré : il gardait 37 des 55 articles de J360, parce qu'un article *sur* les
marchés publics emploie le vocabulaire des marchés publics. Il rejetait en
revanche UNDP-BFA-00733, un vrai marché de travaux, faute d'échéance lisible.
Le tri par vocabulaire retient le sujet traité, jamais la nature de l'annonce.

**Et un filtre strict ne le rattrape pas davantage.** Remesuré le 2026-09-04
sur les neuf flux encore inactifs, avec un filtre exigeant une tournure
d'appel entière (« avis d'appel d'offres », « manifestation d'intérêt »,
« call for proposals », « request for proposal »…) et excluant les
annulations, attributions et résultats : **3 éléments retenus sur 135**, et
aucun des trois n'est un appel — un avis de recrutement (MCA-Bénin), une
page de rubrique et un billet de blog intitulé « Three good reasons to
respond to a call for tenders » (J360). Serrer le filtre ne fait pas
apparaître des appels dans un flux qui n'en contient pas : ça ne fait que
descendre le bruit à zéro utile. Ces neuf flux restent inactifs **par
mesure**, pas par précaution.

### Pistes fermées, et pourquoi

Inutile de les retester sans élément nouveau.

| Piste | Constat du 2026-09-02 |
|-------|------------------------|
| ONU Femmes, page marchés | 19 000 caractères, **tout est menu** ; les dates repérées sont un calendrier de sélection |
| CRDI, page financements | chargement JavaScript, rien en HTML |
| Grand Challenges Canada, page appels | idem |
| AUF, GlobalGiving | HTTP 403 |
| OIF, Expertise France, IDRC, Fondation de France, ONU Femmes RSS, WFP, OPEC, IsDB, Norec | HTTP 404 sur toutes les adresses de flux essayées |

### Une piste ouverte, qui vaut le déplacement

**Le portail européen Funding & Tenders.** Son API de recherche répond
publiquement, sans authentification :

    POST https://api.tech.ec.europa.eu/search-api/prod/rest/search?apiKey=SEDIA

Un appel générique renvoie 4,17 millions de résultats — tout le portail,
événements et documents compris. Le jeu de données de référence complet
(`.../opportunities/data/referenceData/grantsTenders.json`) fait **129 Mo**,
au-delà de la limite de 50 Mo d'Apps Script.

Filtrer sur les appels ouverts demande la bonne forme de requête, et une
tentative sur `type` + `status` a rendu HTTP 500. Le format exact est à
relever sur le trafic du portail lui-même. Le Bénin étant éligible à de
nombreux programmes européens, c'est la piste la plus prometteuse restante —
compter une demi-journée, pas un essai.

## Conventions d'écriture

- Commentaires et identifiants en **français sans accents**, dans le code comme
  dans les fichiers générés. Google Sheets et Apps Script ne sont pas fiables
  sur les accents.
- Les commentaires expliquent **pourquoi**, jamais ce que le code fait déjà.
- Les guides PDF sont **générés** depuis `docs/*.md` et le README du livrable.
  Ne jamais éditer un PDF ni le README de `dist/`.
- Après toute modification du CSV :
  `python scripts/exporter_sources.py && python build.py`
