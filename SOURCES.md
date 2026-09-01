# Le registre des sources

`data/sources.csv` est la reference : c'est le fichier qu'on edite a la main.
Tout le reste en decoule.

    data/sources.csv
      |-- builders/toolkit.py           -> l'onglet SOURCES du classeur Google
      |-- scripts/exporter_sources.py   -> web/src/data/sources-defaut.ts

Apres toute modification du CSV :

```bash
python scripts/exporter_sources.py && python build.py
```

Sans cela les deux moteurs divergent en silence. C'est exactement ce qui
etait arrive a la source BAD : presente dans le CSV, absente du TypeScript,
donc jamais collectee par l'application web alors que la version Sheets la
lisait.

## Etat au 2026-09-01

90 sources, 57 pays, 88 actives par defaut.

| Methode | Nombre |
|---------|--------|
| `RSS` | 61 |
| `API JSON` | 18 |
| `HTML:<site>` | 11 |

Les 18 sources API sont la Banque mondiale, filtree pays par pays : un seul
adaptateur, dix-huit entrees. C'est le seul multiplicateur honnete trouve a
ce jour.

**Attention a ce chiffre.** Sur 57 000 avis publies par la Banque mondiale
pour douze pays africains, 61 seulement etaient encore ouverts au
2026-09-01. La mesure utile est le nombre d'avis auxquels on peut repondre,
pas le nombre de sources.

TenderPilot ne remonte pas que des marches publics. La colonne `Type_Defaut`
distingue ce qu'on peut vendre de ce qu'on peut demander : un appel d'offres
et une subvention n'interessent pas la meme personne. La page Sources de
l'application filtre par type et par secteur.

Le gros du volume vient du PNUD, qui publie un flux RSS par pays - utile,
mais generique. Les sources qui comptent vraiment pour un soumissionnaire
beninois sont les onze suivantes.

### Les sources non-RSS

| Code | Source | Methode | Ce qu'elle apporte |
|------|--------|---------|--------------------|
| `WB-BEN` | Banque mondiale | `JSON:worldbank.org` | l'acheteur reel, le type d'avis, l'echeance et le projet, tous structures |
| `BJ-GOUV` | Portail national du Benin | `HTML:gouv.bj` | DRP, AMI et avis publies par les structures publiques |
| `AFDB-NOTICES` | Banque africaine de developpement | `HTML:afdb.org` | EOI, AMI, SPN, GPN des projets finances par la BAD |
| `ENABEL-BEN` | Enabel (cooperation belge) | `HTML:enabel.be` | marches beninois avec un statut Open/Close explicite |
| `ARMP-BJ` | Regulateur beninois | `HTML:armp.bj` | audits, assurances, solutions numeriques. **Inactive** |
| `BJ-SBEE` | SBEE (electricite) | `HTML:sbee.bj` | 8 avis. La plus complete : reference, type, publication et date limite |
| `BJ-SONEB` | SONEB (eau) | `HTML:soneb.bj` | 30 avis, tous dates. Eau, BTP, informatique, maintenance |
| `BJ-DEDRAS` | DEDRAS-ONG | `HTML:dedras.org` | 98 avis. Demandes de cotation et AMI d'une ONG locale |
| `BJ-ABE` | Agence beninoise pour l'environnement | `HTML:abe.bj` | 9 avis en page 1. Etudes, consultants, evaluations |
| `ARAA-CEDEAO` | Agence agricole de la CEDEAO | `HTML:araa.org` | 12 avis. Agriculture, irrigation, equipements ruraux |
| `BCEAO-MP` | Banque centrale de l'UMOA | `HTML:bceao.int` | 20 avis. BTP, informatique, securite - Benin et sous-region |
| `BJ-MCA` | MCA-Benin Regional | `RSS` | Flux mixte actualites/avis. **Inactive** |
| `AFD-APPELS` | Agence francaise de developpement | `HTML:afd.fr` | 2 appels a projets ouverts. Bailleur majeur, volume faible |

## Trois decisions qui meritent d'etre connues

**La Banque mondiale : les marches attribues sont ecartes.** Sur les 500
avis Benin les plus recents, 368 sont des `Contract Award` - des marches
DEJA attribues. Les remonter noierait les 132 avis auxquels on peut encore
repondre. TenderPilot sert a candidater, pas a lire un palmares.

**Enabel : les marches clos sont ecartes.** C'est la seule source qui publie
un statut explicite. On s'en sert, sinon la page melangerait ouverts et clos
et l'utilisateur perdrait du temps sur des annonces mortes.

**L'ARMP est livree inactive.** Elle publie un a deux avis par an - le plus
recent date du 02/03/2026, le precedent de juillet 2025. Elle ne merite pas
une collecte a chaque passage, mais quand elle publie il s'agit de marches
importants. A activer au cas par cas.

## Ce qui a ete evalue et ecarte

Ces sources reviennent regulierement dans les listes de recommandations.
Elles ont ete testees, pas supposees. Voici pourquoi elles ne sont pas la.

| Source | Constat | Verdict |
|--------|---------|---------|
| **UNGM** | `GET /API/Notices` repond `401`. L'API exige des identifiants OAuth obtenus par inscription. La recherche AJAX de la page publique redirige vers `/Home/InternalError`. | Possible **si** le client ouvre un compte developpeur UNGM. Rien a faire sans ces identifiants. |
| **Plans de passation Benin** | Toute l'API `api.marches-publics.bj/v2/*` repond `401`, sauf `/v2/rss`. La page `/plan-de-passation/...` affiche « aucun resultat » cote serveur : c'est une application Angular. | Inaccessible sans compte sur le portail. |
| **World Bank Business Opportunities** | La page ne contient aucun avis dans son HTML : coquille Angular. | L'API `procnotices` deja branchee couvre le meme fonds. |
| **World Bank STEP** | Meme structure, pas de contenu servi par le serveur. | Idem. |
| **JNMP** (journal des marches) | `/appel-offre-liste` liste 155 **editions de journal en PDF**, pas des avis. Extraire les avis demanderait de lire les PDF. | Cout eleve, et le flux `BJ-DNCMP` couvre deja les memes publications. |
| **UNOPS** | Le site renvoie lui-meme vers UNGM pour ses opportunites. | Redondant avec UNGM. |
| **PNUD Benin** | Deja couvert par `UNDP-BEN` (flux RSS officiel). | Deja la. |

### Deux affirmations repandues, et fausses

**« La BAD propose des flux RSS pour le Project Procurement. »** Non. La page
`afdb.org/en/rss-feeds` liste exactement quatre flux : consultants, offres
d'emploi, actualites, secteur prive. Aucun flux marches. La source
`AFDB-EOI` utilise le flux consultants, et `AFDB-NOTICES` doit passer par
une extraction HTML.

**« On peut afficher les marches PLANIFIES, avant publication. »** Pas
aujourd'hui. Les trois gisements de plans de passation - portail beninois,
STEP, et les plans BAD - sont respectivement authentifies, rendus en
JavaScript et publies en PDF. Aucun n'est lisible. Un etat `PLANIFIE` dans
l'interface resterait vide : autant ne pas le promettre.

## Les sources beninoises et regionales

Ajoutees le 2026-08-31. C'est la couche qui differencie vraiment TenderPilot :
ces organismes publient sur leur propre portail, et n'apparaissent pas
toujours dans le flux general des marches publics.

**DEDRAS-ONG merite une mention.** Une ONG beninoise avec son propre portail
d'e-procurement, 98 avis en ligne, tous avec type, reference, date de
publication et limite de depot. Ce sont des demandes de cotation et des AMI
que les grands agregateurs ne couvrent pas - exactement le genre d'opportunite
accessible a une PME locale.

**La SBEE est la source la mieux structuree du lot.** Elle publie sa
reference officielle, son type de marche, sa date de parution ET sa date
limite, en clair. Aucune autre source beninoise ne fait aussi bien.

**La BCEAO deborde volontairement du Benin.** Elle couvre les huit pays de
l'UMOA. Un soumissionnaire beninois peut repondre a un marche senegalais ou
ivoirien : restreindre au Benin ferait perdre ces occasions.

### Deux pieges rencontres

**Les dates en francais.** "24 Aout 2026" et "08 Septembre 2026" ne sont pas
lisibles par `new Date()`. Elles passent par l'extraction de date maison, qui
connait les mois francais. L'abreviation "Aou" de la SONEB manquait a la
table : elle y est desormais.

**Les titres en double chez DEDRAS.** Chaque avis porte son titre deux fois :
une premiere dans un `<h5>` mis en commentaire, une seconde affichee. Sans
retirer les commentaires, on creerait deux annonces pour un seul avis.

## Ce qui reste a evaluer

Ces sources ont ete signalees mais pas encore integrees.

| Source | Constat |
|--------|---------|
| **Seme City** | Page rendue en JavaScript : 969 caracteres de texte utile sur 214 ko. Ni liste ni API accessible sans navigateur pilote. |
| **AFD**, **BOAD** | Les adresses citees renvoient 404. A rechercher. |
| **Expertise France** | Base de projets, pas d'appels d'offres. Interessante pour de la detection precoce, mais c'est une autre nature de donnee (voir plus bas). |
| **PLACE**, **dgMarket** | Non evaluees. dgMarket est un reindexeur : a n'utiliser qu'en source secondaire, jamais comme reference officielle. |
| **Portails fournisseurs ONU** | UNOPS eSourcing, PNUD Quantum, IOM Supplier Portal. Tous derriere authentification, comme UNGM. |

## Trois idees qui demandent une decision produit

Elles reviennent regulierement et sont bonnes, mais aucune ne se resout en
ajoutant une source : chacune change le modele de donnees.

**Les attributions.** La SONEB publie ses PV d'ouverture et ses attributions
definitives sur `/notifications-post-marches-publics`. Savoir qui gagne quoi
a une vraie valeur commerciale. Mais une attribution n'est PAS une
opportunite : elle n'a pas d'echeance, on ne peut pas y repondre, et la
verser dans la meme table casserait le suivi de delai et les alertes. Il lui
faut sa propre table.

**Les projets detectes.** Meme probleme : un projet Expertise France ou BAD
n'est pas un marche. C'est un signal amont, avec un budget et une periode,
pas une date limite. Autre table, autre ecran.

**Le mode de soumission.** Savoir qu'il faut repondre via UNGM, eSourcing ou
un portail national est utile. C'est une colonne a ajouter au schema, pas une
source. Peu couteux, a faire quand le schema bougera pour les deux points
precedents.

## Financements : appels a projets, subventions, bourses

Ajoutes le 2026-08-31, a cote des marches. Ce n'est pas le meme metier : un
marche public se gagne en vendant une prestation, un financement s'obtient en
candidatant. La colonne `Type_Defaut` porte la distinction, et l'application
filtre dessus.

| Code | Source | Type | Ce qu'on y trouve |
|------|--------|------|-------------------|
| `AFD-APPELS` | AFD | Appel a projets | Financements AFD, deux dates donnees ensemble |
| `TERRAVIVA` | Terra Viva Grants | Subvention | Environnement, climat, agriculture, energie |
| `OPP-AFRICANS` | Opportunities For Africans | Bourse | Fellowships destines a des PERSONNES |

`OPP-AFRICANS` merite un mot : ce sont des bourses individuelles, pas des
financements d'organisation. Le type `Bourse` existe pour qu'une entreprise
puisse les masquer d'un clic.

### Vingt sources evaluees, trois retenues

La liste de depart comptait plus de vingt portails de financement. Chacun a
ete recupere et son contenu lu. Voici ce qui les a ecartes.

| Source | Constat mesure | Verdict |
|--------|----------------|---------|
| **africa-grants.com** | Flux RSS actif, mais le dernier element date de novembre 2025 - neuf mois. Melange articles d'actualite et vrais appels. | Perime et bruite. |
| **africanngos.org** | 10 elements a jour, mais ce sont des billets de blog ("NGO Power Talk", "Income Diversification"), pas des avis. | Pas des opportunites. |
| **supportblackcharities.org** | Flux actif, contenu de philanthropie americaine. | Hors sujet. |
| **worldywca.org**, **trustafrica.org**, **commonwealthfoundation.com** | Flux actifs, mais ce sont les blogs des sites : communiques, tribunes, comptes rendus. | Aucun avis exploitable. |
| **triple-funds.com** | Flux actif, mais chaque billet est titre par sa date ("10 August 2026"). Un titre pareil n'est pas exploitable. | Inutilisable en l'etat. |
| **fundsforngos.org** | Le flux ne renvoie qu'un element : le contenu est derriere un portail payant. | Paywall. |
| **Grants.gov** | `POST /v1/opportunities/search` repond `401`. Une cle API est necessaire. | Possible avec une cle. |
| **DevelopmentAid** | Repond `403` au robot. Agregateur payant. | Bloque, et concurrent. |
| **Instrumentl** | Agregateur commercial payant. | Reindexeur : jamais en source primaire. |
| **mesh.tghn.org**, **essa-africa.org**, **newafricafund.org**, **fic.nih.gov** | Aucun flux : `404` ou `403` sur toutes les adresses testees. | Extraction HTML a ecrire, un site a la fois. |
| **Girls Not Brides**, **GSK Africa Open Lab**, **Royal Society FLAIR** | Pages de presentation d'un programme unique, sans liste d'avis. | Une page fixe ne se collecte pas. |

**Sur les agregateurs commerciaux.** Instrumentl, DevelopmentAid et
fundsforNGOs vivent de la revente de cette information. Les collecter, c'est
a la fois un risque juridique et une perte de fiabilite : ce sont des
reindexeurs, pas la source. TenderPilot doit toujours pointer vers l'avis
officiel.

### AFD opendata : une piste pour plus tard

`opendata.afd.fr` expose une API Opendatasoft v2.1, 23 jeux de donnees, dont
`les-projets-de-l-afd` : **140 projets Benin** au format IATI, avec secteur,
statut et periode.

Ce n'est PAS une source d'opportunites - un projet n'a pas de date limite et
ne se soumissionne pas. C'est de la detection amont, et cela demande la meme
table separee que les projets Expertise France ou BAD.

## Fragilites connues

**La BAD limite le debit.** Le site repond parfois `403` a une requete
identique a celle qui a fonctionne la minute d'avant. Le moteur isole chaque
source : la collecte suivante repasse. Rien a corriger, mais ne pas
s'alarmer d'un `403` isole dans les journaux.

**Les onze sources `HTML:` peuvent casser sans prevenir.** Elles lisent la
mise en page d'un site, pas un contrat. Le jour ou le site change, elles
renvoient zero annonce. Les tests de `web/tests/adaptateurs.test.ts`
tournent contre les pages reelles capturees dans `tests/fixtures/` : quand
une extraction casse, on recapture la page et le diff montre ce qui a change.

## Ajouter une source

1. Une ligne dans `data/sources.csv`.
2. Si la methode n'est pas `RSS`, ecrire l'analyseur **des deux cotes** :
   `apps_script/Html.gs` et `web/src/lib/domain/html.ts` (ou `Json.gs` et
   `json.ts`), puis l'enregistrer dans les deux repertoires d'analyseurs.
3. Capturer une fixture dans `tests/fixtures/` et ecrire le test.
4. `python scripts/exporter_sources.py && python build.py`

Une source dont l'analyseur manque n'est pas signalee en erreur : elle
renvoie zero annonce, en silence. C'est le piege principal de ce registre.
