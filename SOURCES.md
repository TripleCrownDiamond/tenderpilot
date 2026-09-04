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

90 sources, 57 pays, **44 actives par defaut**.

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
| `AFDB-NOTICES` | Banque africaine de developpement | `HTML:afdb.org` | EOI, AMI, SPN, GPN des projets finances par la BAD. **Inactive depuis le 2026-09-02** : site entier derriere un controle anti-robot |
| `ENABEL-BEN` | Enabel (cooperation belge) | `HTML:enabel.be` | marches beninois avec un statut Open/Close explicite. Interroge en `is_status=all` : c'est l'analyseur qui ecarte les clos |
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

**Enabel : les marches clos sont ecartes.** C'etait la seule source qui
publiait un statut explicite. On s'en servait, sinon la page melangerait
ouverts et clos et l'utilisateur perdrait du temps sur des annonces mortes.

**Et c'est nous qui les ecartons, pas le site.** Le 2026-09-02, l'adresse
collectee - `?in_country=850&is_status=0`, soit « ouverts seulement » -
renvoie « Sorry, we couldn't find any results. » alors que la meme page en
`is_status=all` rend les 10 marches beninois, dont un ouvert. Le filtre du
site a change de comportement : le 2026-08-31 il rendait les 10 avis, clos
compris. On demande donc `is_status=all`, et `analyserEnabel` fait le tri
comme il le faisait deja.

Ce filtre est le seul point qui a bouge : la page se rend toujours cote
serveur, la mise en page est intacte, et l'analyseur lit la capture du
2026-08-31 comme la page du jour - octet pour octet le meme document.

**Ne pas basculer sur `/fr/marches-publics/`.** La page francaise existe et
rend les memes cartes, mais ses etiquettes sont traduites : « Pays », « Date
de cloture ». L'analyseur lit `Country` et `Closing date`. En francais il
lirait les cartes sans jamais en tirer ni pays ni echeance.

L'API `https://www.enabel.be/wp-json/wp/v2/tenders` existe aussi - 1812
marches - mais elle ne porte **ni pays, ni date de cloture, ni statut** : ces
trois champs ne vivent que sur la fiche de chaque marche. Elle ne remplace
pas la page, elle la remplacerait par des marches du monde entier sans
echeance.

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

## Pourquoi la moitie des sources est livree inactive

Le catalogue couvre 57 pays. Une entreprise beninoise n'en prospecte que
quinze : le Benin et la CEDEAO.

Mesure du 2026-09-01, sur une collecte reelle :

| | Offres en cours |
|---|---|
| Les 88 sources actives | **315** |
| Reduites au Benin et a la CEDEAO | **160** |
| dont concernant le Benin | 22 |

Livrer les 88 donnerait au client 293 lignes qui ne le concernent pas pour 22
qui le concernent. C'est le symetrique exact du probleme des annonces
expirees : un tableau techniquement complet, pratiquement illisible.

Sont donc livrees inactives :

- les deux flux PNUD tous pays confondus, qui ramenaient 141 et 429 annonces
  et ecrasaient tout le reste ;
- les flux PNUD d'Afrique centrale, orientale, septentrionale et australe ;
- les pays Banque mondiale hors CEDEAO.

Chaque source desactivee porte la raison dans sa colonne `Statut`. Le client
en reactive une en passant `Active` a `OUI` : rien n'est perdu, tout est a
un clic.

**Pour vendre hors du Benin**, fabriquez un second classeur maitre avec la
zone correspondante activee. C'est un reglage du classeur, pas du code.

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

## Deux sources ajoutees le 2026-09-02

| Code | Source | Methode | Ce qu'elle apporte |
|------|--------|---------|--------------------|
| `NE-MARCHES` | Niger Marches | `JSON:nigermarches.com` | 668 avis nigeriens, **tous dates**. API WordPress publique |
| `GIZ-VERGABE` | GIZ, cooperation allemande | `HTML:giz.de` | 224 avis sur 12 pages, dont 91 ouverts. Consultance et fournitures, monde entier |

**Niger Marches : on lit l'API, pas la page.** La page est construite par
Elementor - ses classes changent a chaque changement de theme. Le site expose
ses avis dans un type de contenu WordPress standard :
`/wp-json/wp/v2/appel_d_offre`. Les champs ACF portent l'essentiel :
`date_expiration` donne l'echeance, `nom_de_la_societe` donne l'acheteur reel
(la Nigerienne des Eaux, AMF-UMOA, Medecins Sans Frontieres, GIZ Niger). Le
`_fields=id,link,title,date,acf` de l'URL divise le volume par vingt : sans
lui chaque avis traine son HTML complet et ses metadonnees SEO.

Mesure du 2026-09-02 : **20 avis sur 20 portent une date d'expiration**. C'est
rare au point de meriter d'etre verifie, et le test le verifie.

**GIZ : 58 % du flux est deja attribue.** Sur les 224 avis, 131 sont des
`Vergebener Auftrag` - des marches DEJA ATTRIBUES - et deux des avenants.
L'analyseur les ecarte, exactement comme les `Contract Award` de la Banque
mondiale. Les 91 qui restent portent tous une echeance : les 133 lignes sans
date etaient precisement celles qu'on ecarte.

Le type allemand est traduit dans le vocabulaire ferme : `Ausschreibung`
devient un appel d'offres, `TNW` (Teilnahmewettbewerb, appel a candidatures)
devient un AMI.

**Deux pieges, tous deux mesures.** La page est servie en **ISO-8859-1** - il
faut la decoder d'apres son en-tete, sans quoi les umlauts et les accents
francais reviennent en morceaux. Et les dates sont en **JJ.MM.AAAA** :
`new Date("02.09.2026")` rend le **9 fevrier**, pas le 2 septembre. La
conversion est faite a la main dans l'analyseur, et un test la garde.

Interet reel pour la zone : 16 des 224 avis nomment un pays africain, dont 6
en Afrique de l'Ouest - Burkina Faso, Senegal, Ghana, Nigeria - certains
rediges en francais. C'est peu en proportion, mais la GIZ est un donneur
d'ordre majeur et ces avis-la sont de vraies consultances.


## Les liens : ce que chaque source sait donner

**Audit du 2026-09-02, sur les 51 sources actives.** Un lien par annonce est
la regle ; trois sources y manquaient, chacune pour une raison differente.

**DEDRAS - corrige.** Les 98 avis renvoyaient tous a la page de liste. Chaque
carte porte pourtant un bouton "Details" vers
`/tenderforapplicationbis/<uuid>` : 98 avis, 98 liens distincts desormais.

**Grand Challenges - corrige.** Le lien etait bati en collant le slug sur
`www.grandchallenges.org` : **404 pour les trois defis ouverts**, sans
exception. Le champ `apply_link` du JSON repond 200 pour les trois, et mene
la ou l'on candidate. La fiche descriptive vit sur `gcgh.grandchallenges.org`
(200 pour deux sur trois) : elle sert de repli.

**DNCMP - le domaine etait mort, la faute est chez eux.** Le flux publie
`www.marches-public.bj`, sans le s. Ce domaine ne resout pas du tout. Le
portail est `www.marches-publics.bj`, il sert la meme page, et c'est aussi
le domaine de son API. `nettoyerLien` corrige donc ce domaine precis - la
seule entree de la table, et il a fallu verifier les deux cotes pour
l'ecrire.

### Les PDF de la DNCMP : visibles dans un navigateur, hors de portee d'un programme

Chaque avis beninois a bien un PDF, du genre
`bi.marches-publics.bj/beninmp/fichiers/pj/<id>_Pj_<intitule>.pdf`, et il se
telecharge sans authentification - verifie le 2026-09-02, `200
application/pdf`.

**Mais son adresse n'existe nulle part dans ce que le site sert a un
programme.** Ni dans le flux RSS - zero occurrence - ni dans le HTML de
`/appels-doffres`, qui ne contient aucune carte : le tableau que voit un
humain est construit par Angular APRES coup, a partir de l'API. Et cette
API repond `401` sur toutes ses adresses, y compris celles qui n'existent
pas : la passerelle rejette avant de router.

Le portail ne publie pas non plus de page par avis : dans le navigateur
lui-meme, une carte n'a qu'un seul lien, celui du PDF. C'est pour cela que
le flux renvoie tout le monde vers la liste - il n'a rien d'autre a donner.

**Ce qu'il faudrait pour les avoir :** un acces API accorde par la DNCMP.
C'est une demarche a faire aupres d'eux, pas une extraction a ecrire.

## Expertise France, ajoutee le 2026-09-04

`EF-OFFRES`, `HTML:expertise-france.gestmax.fr`, paginee.

**Rare par sa richesse.** 144 offres, dix par page, quinze pages, rendues
cote serveur. Chaque carte porte d'un coup ce que la plupart des sources
donnent au compte-gouttes : le titre, la ZONE ET LE PAYS, le type de
contrat, le secteur declare, et une vraie "Date limite de candidature" -
dix sur dix a la mesure.

**Ce n'est pas qu'un site d'emploi.** Expertise France y publie ses
consultations autant que ses postes : "Recrutement d'une agence de
communication pour la realisation d'outils de communication, Benin" est un
marche, pas une offre d'emploi.

**Le pays de l'annonce prime sur le defaut de la source**, et il a fallu le
rendre possible : le moteur web ecrasait le pays lu avec `paysDefaut`. Apps
Script, lui, lisait deja `brut.country`. Sans cette correction, les 144
offres d'Expertise France auraient toutes ete jugees "International" par la
colonne Pertinence, alors qu'elles nomment la Tanzanie, l'Algerie, le
Benin.

**Le type de contrat n'est traduit qu'a moitie, et c'est delibere.** CDD,
CDDU, CDI, stage : des postes, ranges en Recrutement. "Contrat de
prestation de services" - huit offres sur dix - reste NON traduit, le
defaut de la source s'appliquant alors : ce libelle recouvre l'expert
individuel comme l'agence de communication. Le ranger d'office dans
"Recrutement" ferait disparaitre les marches d'agence pour qui filtre les
postes ; dans "Appel d'offres", l'inverse. Un libelle qui recouvre deux
notions ne se tranche pas a l'aveugle.

### Les accents, corriges au passage

Les titres arrivaient en `Consultant charg&eacute; d&rsquo;une
&eacute;tude`. Seules les entites du HTML de base etaient decodees - `&amp;`
`&lt;` `&quot;` - et pas une seule lettre accentuee. La table des entites
nommees francaises est desormais dans les deux moteurs, et le decodage se
fait AVANT `&amp;` : une page mal echappee ecrit `&amp;eacute;`, et l'ordre
inverse laisserait un `&eacute;` litteral que plus rien ne decoderait.

## AFD sur dgMarket : lisible a la main, pas par un programme

`AFD-DGMARKET`, `MANUAL`, inactive. **La liste existe et elle est riche** -
pays, intitule, date de publication et date limite par avis, le tout rendu
cote serveur dans un vrai tableau. Ce n'est pas ce qui bloque.

**Le portail ouvre une session avant d'afficher quoi que ce soit.** Mesure du
2026-09-04 : la premiere requete pose `digi_session_id=UNASSIGNED` et renvoie
302 vers `web3-login.dgmarket.com/um~user/login.do?autoLogin=true`, sur un
SECOND domaine, pour l'echanger contre une vraie session. Une deuxieme
requete portant les cookies de la premiere repond encore 302 : la poignee de
main compte trois a quatre allers-retours entre deux domaines.

**On ne la simule pas.** Rejouer cet echange revient a rejouer un login, et
la regle du produit est ecrite depuis le premier jour : on ne se bat pas
contre les sites qui exigent un compte. S'y ajoute que les dossiers d'appel
d'offres eux-memes demandent une adhesion dgMarket - meme une collecte
reussie n'aurait donne que des intitules.

La source reste au catalogue, en `MANUAL`, avec son adresse : le client la
consulte a la main, gratuitement. Le catalogue client porte le mode d'emploi
que l'AFD publie elle-meme.

**Ce que TenderPilot collecte quand meme chez l'AFD** : `AFD-APPELS`, ses
appels a projets, publies en clair sur afd.fr - active et fonctionnelle.

## Plan International, ajoutee le 2026-09-04

`PLAN-TENDERS`, `HTML:plan-international.org`.

**Huit appels actifs, huit echeances, huit dossiers.** C'est la premiere
source du registre qui remplit la colonne PDF : elle etait vide depuis le
premier jour, faute d'une source donnant un fichier par annonce. Un appel
beninois est en cours a la mesure - `006/Plan Int'l BEN/CO/CD/Aout 2026`.

**Pas de page par appel** : les huit vivent sur la meme. Le lien mene donc a
la liste, et c'est le DOSSIER qui est propre a chacun. Exactement le
contraire de la DNCMP, ou ni l'un ni l'autre n'existe.

### Deux corrections d'echeance, qui profitent a toutes les sources

Les huit appels annoncent leur date en prose anglaise : *"Responses should
be submitted no later than Friday, 28th August 2026."* Le 2026-09-04, huit
sur huit arrivaient sans date, pour deux raisons :

1. **"no later than" n'etait pas un mot annonciateur.** Ajoute, avec
   "submitted by", "due by", "closes on", "bids must be received" et "date
   de remise".
2. **Le rang ordinal collait au quantieme.** "28th August" n'etait pas
   reconnu comme un 28. Les rangs sont desormais retires avant la
   recherche : ils n'apportent rien qu'une lettre.

La regle de fond ne bouge pas : **une date n'est retenue que si elle suit un
mot annonciateur.** Une date isolee reste ignoree, sans quoi on prendrait la
date de publication pour une echeance.

## biddetail.com : sept avis sur dix sont payants

Evalue le 2026-09-04, non retenu. La page rend bien dix avis avec leur date
de cloture et leur zone, mais **trois seulement portent un lien libre** ; les
sept autres sont derriere l'abonnement du site, qui vend precisement cet
acces ("Subscribe", "Pay Now").

Et c'est un REVENDEUR : il republie des avis qui paraissent ailleurs, chez
leurs emetteurs, gratuitement - la ou TenderPilot va deja les chercher. Le
recuperer ajouterait des doublons partiels, dont les deux tiers menent a un
mur payant. Meme raisonnement que pour Fundpilote, dont le registre dit
qu'il est "a traiter comme une piste, pas comme une source primaire" - a
cette difference pres que Fundpilote, lui, donne des montants que personne
d'autre ne publie.

## JobRelais : premiere source lue en DEUX TEMPS

`JOBRELAIS`, `HTML:jobrelais.com`, active depuis le 2026-09-04.

12 avis par page, 27 pages, de vrais avis ouest-africains - BCEAO, GIZ Cote
d'Ivoire, GIZ Togo, Plan International Benin, LuxDev, Amnesty Togo.

**Sa liste ne date rien** - pour toute date, "il y a 3 mois" - mais chaque
fiche porte un JSON-LD propre avec `validThrough`. C'est la source qui a
fait naitre la lecture en deux temps : le moteur lit la liste, puis les
fiches manquantes, dans la limite de `MAX_FICHES_PAR_PASSAGE`. Mesure en
direct le 2026-09-04 : 6 fiches lues en 14 s, 6 annonces datees, 6
reportees au passage suivant.

**Une annonce qu'on n'a pas pu dater n'entre pas.** Pour cette source, sans
date veut dire "fiche non lue", pas "avis sans echeance".

C'est un AGREGATEUR : GIZ, Plan International et la BCEAO sont aussi
collectes a la source, avec leurs propres dates. La deduplication s'en
charge, mais gardez-le en tete si vous voyez un avis deux fois.

### Ce qui bloquait avant (2026-09-04, resolu le meme jour)


`JOBRELAIS`, evalue le 2026-09-04, `MANUAL` et inactive.

**Ce qui marche.** La liste est rendue cote serveur : 12 avis par page, 27
pages, et de vrais avis ouest-africains - BCEAO, GIZ Cote d'Ivoire, GIZ
Togo, Plan International Benin, LuxDev, Amnesty Togo. Un site beninois qui
rassemble ce qui compte dans la region.

**Ce qui bloque, et ce n'est pas rattrapable ici.**

1. **La liste ne porte aucune echeance** - seulement un age relatif, "il y a
   3 mois". La date limite existe pourtant : elle est sur la FICHE, proprement
   balisee en JSON-LD `validThrough` ("2026-11-26T11:16"). Mais l'atteindre
   demande une requete par avis - douze de plus par page - et un analyseur
   recoit UNE page, il n'en demande jamais une autre.
2. **La liste n'est pas triee par date.** Page 1 melange "il y a 2 jours" et
   "il y a 3 mois" : meme en se limitant a la premiere page, on ne prendrait
   pas les plus recents.
3. **Sans echeance, le filtre des expirees ne joue pas.** Le tableau du
   client se remplirait d'avis morts, exactement ce que ce filtre existe pour
   empecher.
4. **C'est un agregateur** : GIZ, Plan International et la BCEAO sont deja
   collectes a la source, avec leurs dates.

**Ce qu'il faudrait pour l'ouvrir.** Un mode de collecte en deux temps -
liste, puis fiches - que le moteur ne sait pas faire. C'est la deuxieme
source a le demander apres Enabel. Le jour ou ce mode existera, JobRelais
sera un bon candidat : ses fiches sont balisees, la date y est propre, et le
site couvre precisement la zone du produit.

En attendant il reste au catalogue, en `MANUAL`, avec son adresse.

## Fragilites connues

**La BAD est fermee aux robots depuis le 2026-09-02.** Le site repondait
parfois `403` a une requete identique a celle qui avait fonctionne la minute
d'avant, et on mettait cela sur le compte du debit. Ce n'est plus le cas :
`www.afdb.org` repond desormais `403` a TOUTES ses adresses, `robots.txt`
compris, derriere un controle anti-robot Cloudflare qui exige l'execution de
JavaScript. Aucune chaine d'agent n'en vient a bout. `AFDB-EOI` et
`AFDB-NOTICES` sont desactivees ; leurs analyseurs restent en place, il
suffira d'un `OUI` le jour ou le site rouvre.

Un `403` isole sur une AUTRE source reste, lui, une limitation de debit sans
gravite : le moteur isole chaque source, la collecte suivante repasse.

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
