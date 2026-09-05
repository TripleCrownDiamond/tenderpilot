# Preparer et vendre TenderPilot

Ce guide est pour VOUS, pas pour le client. Il decrit comment fabriquer le
classeur maitre, en tirer un lien de vente, et livrer.

Le client, lui, ne voit qu'un lien et deux PDF.

## Le principe

Vous collez les fichiers de script UNE SEULE FOIS, dans un classeur maitre
que vous gardez. Ensuite vous vendez un lien qui se termine par `/copy`.

Chaque acheteur clique, obtient sa propre copie - **script compris** - et
n'a plus qu'a autoriser et renseigner son email.

Vous passez de quinze minutes d'installation par client a deux.

## 1. Fabriquer le classeur maitre

A faire une fois. Comptez vingt minutes, tranquillement.

1. Importez `TenderPilot.xlsx` dans Google Sheets.
   Fichier > Importer > Importer les donnees.

2. Extensions > Apps Script.

3. Collez les fichiers du dossier `script/`, en suivant le guide
   d'installation manuelle (`3_Installation_Manuelle.pdf`).
   C'est la derniere fois que vous faites ce geste.

4. Remplacez le manifeste `appsscript.json`.

5. Menu TenderPilot > Executer maintenant. Verifiez que des lignes
   arrivent. Si oui, le maitre fonctionne.

### Puis nettoyez-le

C'est l'etape qu'on oublie, et elle est importante.

| Dans l'onglet CONFIG | Mettez |
|----------------------|--------|
| `NOTIFICATION_EMAIL` | vide |
| `TELEGRAM_TOKEN` | vide |
| `TELEGRAM_CHAT_ID` | vide |
| `SEND_TELEGRAM` | `false` |
| `LLM_CLE` | **vide** |
| `USE_LLM` | `false` |

**Votre adresse et votre jeton de bot partiraient chez chaque client.**
Un jeton de bot laisse quelqu'un ecrire a votre place.

**Et votre cle de modele ferait payer VOS appels par VOUS, pour EUX.**
C'est la ligne la plus facile a oublier et la plus chere : chaque client
livre avec votre cle appellerait le fournisseur sur votre compte, trois fois
par jour, sans que vous le sachiez. Le classement intelligent est une option
que le client active avec SA cle.

Videz aussi l'onglet OPPORTUNITIES des lignes de test, et l'onglet LOGS.
Un classeur livre avec vos essais fait amateur.

**N'activez pas l'execution automatique sur le maitre.** Vous n'avez pas
besoin de collecter, et un declencheur qui tourne pour rien consomme votre
quota Google.

## 2. Fabriquer le lien de vente

1. Bouton **Partager**, en haut a droite.
2. Acces general : **Tous les utilisateurs disposant du lien**.
3. Role : **Lecteur**. Jamais Editeur - un client pourrait modifier votre
   maitre, et tous les suivants heriteraient de ses modifications.
4. Copiez le lien. Il ressemble a :

```
https://docs.google.com/spreadsheets/d/1AbC...XyZ/edit?usp=sharing
```

5. Remplacez tout ce qui suit l'identifiant par `/copy` :

```
https://docs.google.com/spreadsheets/d/1AbC...XyZ/copy
```

6. Collez ce lien dans `data/livraison.json`, champ `lien_copie`, puis
   relancez `python build.py`. Les guides et les archives le reprendront
   automatiquement.

## 3. Tester avant de vendre

**Ne sautez pas cette etape.** Un lien casse se remarque au premier client,
et vous ne le rattrapez jamais.

Avec un DEUXIEME compte Google - pas le votre, il est deja proprietaire :

1. Ouvrez le lien `/copy` en navigation privee.
2. La copie se cree. Ouvrez-la.
3. **Le menu TenderPilot apparait-il ?** C'est le point critique : s'il
   n'apparait pas, le script n'a pas suivi.
4. Menu > Executer maintenant. Autorisez quand Google le demande.
5. Des opportunites arrivent-elles dans l'onglet ?
6. Menu > Activer l'execution automatique.

Si les six points passent, vous pouvez vendre.

**Les canaux facultatifs se testent a part**, et seulement si vous les
vendez comme arguments : Menu > *Tester la notification push (ntfy)* et
Menu > *Tester l'agenda*. Le test d'agenda ne pose rien - il dit ce que le
prochain passage ferait. Un test qui ecrirait dans l'agenda de quelqu'un
sans qu'il l'ait demande serait un mauvais test.

> Si le menu n'apparait pas : rechargez la page une fois, Google met
> parfois quelques secondes a charger le script.

### Le client n'a aucun repli, et c'est voulu

Il ne recoit ni les fichiers de script, ni le classeur, ni la methode
manuelle. Il ne recoit qu'un lien et deux PDF.

C'est ce qui protege le produit : sans les fichiers, on ne peut ni le
revendre ni le redistribuer.

**En contrepartie, un echec d'installation vous revient.** Le guide client
lui dit de vous ecrire. Deux facons de vous en sortir :

1. **Refaire la copie a sa place.** Vous dupliquez votre maitre, vous
   configurez, puis vous lui transferez la propriete du fichier.
2. **Installer manuellement pour lui**, avec le dossier `script/` de votre
   archive operateur, sur un classeur qu'il vous partage le temps de
   l'operation.

Dans les deux cas, il ne voit jamais le code.

## 4. Ce que vous envoyez au client

Apres paiement, trois choses :

1. **Le lien `/copy`.**
2. **L'archive client**, qui ne contient que deux PDF : le guide de
   demarrage et le catalogue des sources. Aucun fichier de script, aucun
   classeur.
3. **Votre contact**, pour l'aide a l'installation.

Le lien est la marchandise. **Quiconque l'a peut copier le produit.** Ne le
publiez jamais, ne le mettez pas dans un post : il ne sort qu'apres
paiement.

## 5. Publier une mise a jour

Quand des sources sont ajoutees ou reparees :

1. Vous recevez une nouvelle version du dossier `script/`.
2. Ouvrez votre **maitre**, remplacez les fichiers modifies.
3. Les nouveaux clients recoivent la version a jour automatiquement : ils
   copient le maitre.
4. Les clients existants n'ont rien a recopier. Ils font
   **TenderPilot > Synchroniser les sources**, et leur catalogue se met a
   niveau sans toucher a leurs choix.

C'est pour cela que la synchronisation existe : sans elle, chaque mise a
jour vous obligerait a reinstaller chez tout le monde.

> La synchronisation met a jour les SOURCES, pas le code. Si le code
> change - une extraction reparee, par exemple - les clients existants
> doivent recoller le fichier concerne. Prevenez-les, et envoyez le fichier
> seul plutot que l'archive entiere.

## 6. La zone livree, et comment en changer

Le catalogue couvre 57 pays, mais **44 sources sur 90 sont livrees
inactives** : celles qui sortent du Benin et de la CEDEAO.

Sans ce reglage, le client recevrait 315 offres dont 293 hors de sa portee.
Avec, il en recoit 160, dont les 22 beninoises intactes.

Chaque source eteinte porte la raison dans sa colonne `Statut`. Le client la
rallume en passant `Active` a `OUI`, dans l'onglet SOURCES - accessible par
le menu **TenderPilot > Afficher / masquer l onglet SOURCES**.

**Pour vendre a un client togolais, ivoirien ou senegalais**, fabriquez un
second maitre : meme procedure, mais activez les sources de son pays et
eteignez les autres. Un maitre par zone, un lien par zone. C'est un reglage
du classeur, jamais du code.

## 7. Les archives ne remontent pas

Une annonce dont la date limite est deja passee n'entre pas dans le
classeur. Ce n'est pas un detail : sur les sources beninoises, **environ
85 % des annonces publiees sont echues** - les portails gardent des annees
d'historique en ligne. Sans ce filtre, un client verrait 190 lignes dont 161
grises des le premier passage.

Le filtre agit a l'entree seulement. Une opportunite deja suivie qui arrive
a echeance reste dans le tableau, en gris : le client garde la trace de ce a
quoi il a repondu.

Un client peut vouloir l'historique - pour etudier qui remporte quoi, par
exemple. Onglet CONFIG, `COLLECT_EXPIRED` a `true`. Prevenez-le du volume.

## 8. Quand une source tombe en panne

Onze sources sont lues directement sur des pages web. Le jour ou un site est
refait, elles se taisent.

Comment vous le voyez : l'onglet LOGS du client affiche la source en
`ERROR`, ou elle rapporte zero annonce plusieurs jours de suite.

Ce que vous faites : vous corrigez l'extraction, vous mettez a jour votre
maitre, et vous envoyez le fichier corrige aux clients existants.

C'est du travail recurrent. **C'est ce qui justifie de vendre un abonnement
de maintenance plutot qu'une licence unique.** Dites-le a l'achat : le
client comprend qu'il paie une surveillance vivante, pas un fichier mort.

## 9. Le classement intelligent : ce que vous vendez, et ce que vous ne vendez pas

C'est une **option**, et il faut la presenter comme telle. Le produit est
complet sans elle.

| Sans aucune cle | Avec une cle |
|-----------------|--------------|
| collecte de toutes les sources | idem |
| **lecture des dates limites** | idem |
| **les annonces echues n'entrent pas** | idem |
| couleurs, jours restants, alertes J-7 J-3 J-1 | idem |
| **filtre par type** (huit valeurs propres) | idem |
| filtre par pays | idem |
| **filtre par type** : huit valeurs propres | idem |
| secteur : deduit du titre, une annonce sur deux | **presque toutes classees** |
| le reste affiche *Non precise* | idem |
| les articles et FAQ entrent | **ecartes** |
| resume : extrait brut de la source | **une phrase lisible** |
| — | zone de candidature signalee |

**Le point a marteler en demonstration :** le tri des echeances ne depend pas
du modele. Les dates sont lues par le programme, jamais par un modele - une
echeance inventee ferait manquer un depot.

**Ce que ca coute au client.** Sa propre cle, chez le fournisseur de son
choix - Mistral, Groq, DeepSeek, Anthropic, Google. Le classement travaille
par lots de trente annonces ; une collecte courante demande un a deux appels.
Le plafond `LLM_MAX_APPELS_JOUR`, a 100 par defaut, empeche toute derive de
facture : au-dela, le classement s'arrete et la collecte continue.

**Ce qu'il ne faut pas promettre.** Le modele se trompe parfois. Le produit
est construit pour que ses erreurs ne coutent rien : une annonce qu'il n'a
pas jugee est conservee, et il n'a pas le droit de toucher a une date. Dites
qu'il **trie et resume**, pas qu'il decide.

## 10. Ce qu'il vous reste a preparer

Ces points ne sont pas techniques, mais rien ne se vend sans eux.

- **Un prix.** Et une decision : vente unique ou abonnement. La maintenance
  des onze extractions penche pour l'abonnement.
- **Des mentions legales et des conditions de vente.** Vous collectez une
  adresse email et vous envoyez des notifications : c'est le minimum legal.
- **Une phrase de limite**, visible avant l'achat :
  *je vous fais gagner la recherche, pas la lecture du dossier ; verifiez
  toujours l'avis officiel avant de candidater.* Elle desamorce toute
  reclamation.

## Aide-memoire

| Quand | Vous faites |
|-------|-------------|
| Une fois | Fabriquer le maitre, le nettoyer, creer le lien `/copy` |
| Avant la premiere vente | Le test en six points, avec un autre compte |
| A chaque vente | Envoyer lien + archive client + votre contact |
| A chaque mise a jour de sources | Mettre a jour le maitre ; les clients synchronisent |
| Quand une source casse | Reparer, mettre a jour le maitre, envoyer le fichier |
