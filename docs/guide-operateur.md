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

**Votre adresse et votre jeton de bot partiraient chez chaque client.**
Un jeton de bot laisse quelqu'un ecrire a votre place.

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

> Si le menu n'apparait pas : rechargez la page une fois, Google met
> parfois quelques secondes a charger le script. S'il manque toujours,
> livrez la methode manuelle - l'archive contient tout ce qu'il faut.

## 4. Ce que vous envoyez au client

Apres paiement, trois choses :

1. **Le lien `/copy`.**
2. **L'archive client** (`TenderPilot_Sheets_vX_CLIENT.zip`), qui contient
   le guide de demarrage, le catalogue des sources, et la methode manuelle
   en secours.
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

## 6. Quand une source tombe en panne

Onze sources sont lues directement sur des pages web. Le jour ou un site est
refait, elles se taisent.

Comment vous le voyez : l'onglet LOGS du client affiche la source en
`ERROR`, ou elle rapporte zero annonce plusieurs jours de suite.

Ce que vous faites : vous corrigez l'extraction, vous mettez a jour votre
maitre, et vous envoyez le fichier corrige aux clients existants.

C'est du travail recurrent. **C'est ce qui justifie de vendre un abonnement
de maintenance plutot qu'une licence unique.** Dites-le a l'achat : le
client comprend qu'il paie une surveillance vivante, pas un fichier mort.

## 7. Ce qu'il vous reste a preparer

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
