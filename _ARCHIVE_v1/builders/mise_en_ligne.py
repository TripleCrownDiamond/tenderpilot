"""
Procedure de mise en ligne : du depot local vers un Google Sheet fonctionnel.

Document destine a l'operateur, pas au client. Il decrit les deux chemins
possibles - copier-coller et clasp - et les verifications a faire apres.
"""

MISE_EN_LIGNE = """# Du depot local vers Google Sheets

Comment transformer ce que produit `python build.py` en un Google Sheet
utilisable, puis en lien de copie a remettre a un client.

A faire une seule fois. Comptez 20 minutes la premiere fois, 2 minutes pour
les mises a jour suivantes si vous utilisez clasp.

---

## Avant de commencer

Depuis le depot :

```
python build.py
```

Vous devez lire `Tous les modules sont generes et testes.` Si un test echoue,
reglez-le avant de mettre en ligne : les tests verifient justement que le
script et le classeur parlent des memes colonnes.

Vous aurez besoin :

- d'un compte Google, celui qui hebergera le fichier maitre ;
- du fichier `dist/TenderPilot_Toolkit/02_COMMAND_CENTER/02_TenderPilot_Command_Center.xlsx` ;
- du dossier `dist/TenderPilot_Toolkit/12_AUTOMATION/`.

---

# Etape 1 - Importer le classeur dans Google Sheets

1. Ouvrez sheets.google.com et creez une feuille vierge.
2. *Fichier > Importer > Importer*.
3. Deposez `02_TenderPilot_Command_Center.xlsx`.
4. Choisissez **Remplacer la feuille de calcul**, puis *Importer les donnees*.
5. Renommez le fichier : `TenderPilot - Command Center (MAITRE)`.

## Verifier tout de suite trois choses

L'import Excel vers Sheets est fidele, mais pas parfait. Ces trois points
sont ceux qui cassent le script s'ils n'ont pas suivi :

**a. L'onglet technique LISTS existe et est masque.**
Clic droit sur la barre d'onglets en bas : `LISTS` doit apparaitre dans les
feuilles masquees. S'il a disparu, tout le script tombe : les listes
deroulantes du formulaire y sont lues.

**b. Les listes deroulantes fonctionnent.**
Onglet `OPPORTUNITIES`, colonne `Status` : un clic doit ouvrir une liste de
14 statuts. Sinon, les regles de validation ne sont pas passees.

**c. Les couleurs de deadline s'affichent.**
Les 10 lignes `DEMO-` doivent former un degrade vert, jaune, orange, rouge,
puis gris. La ligne `DEMO-006`, statut *Soumis* et echeance a 2 jours, doit
etre **grise et non rouge** : c'est le test le plus parlant, et celui qui
prouve que la mise en forme conditionnelle est bien arrivee.

Si un de ces trois points manque, refaites l'import en verifiant que vous
avez bien choisi *Remplacer la feuille de calcul*.

## Regler le fuseau horaire

*Fichier > Parametres > Fuseau horaire.* Choisissez celui du client. C'est ce
reglage qui determine a quelle heure partent les rappels, et comment les
jours restants sont comptes.

---

# Etape 2 - Installer le script

Deux chemins. Le premier ne demande aucune installation, le second automatise
les mises a jour.

## Chemin A - Copier-coller

Adapte a une premiere mise en ligne, ou si vous ne voulez rien installer.

1. Dans le classeur : *Extensions > Apps Script*. Un nouvel onglet s'ouvre.
2. Renommez le projet `TenderPilot`, en haut a gauche.
3. Un fichier `Code.gs` existe deja. Remplacez tout son contenu par celui de
   `Schema.gs`, puis renommez-le `Schema` (les trois points a cote du nom >
   *Renommer*).
4. Creez les autres fichiers via le **+** a cote de *Fichiers* :

| A creer | Type | Contenu a coller |
|---------|------|------------------|
| `Core` | Script | `Core.gs` |
| `Rss` | Script | `Rss.gs` |
| `Sheets` | Script | `Sheets.gs` |
| `Menu` | Script | `Menu.gs` |
| `Setup` | **HTML** | `Setup.html` |
| `AddOpportunity` | **HTML** | `AddOpportunity.html` |

   Attention au type : les deux derniers sont des fichiers **HTML**, pas des
   scripts. Le nom doit etre exact et sans extension : le code appelle
   `createHtmlOutputFromFile('Setup')`.

5. Remplacez le manifeste : *Parametres du projet*, roue crantee a gauche,
   cochez **Afficher le fichier manifeste appsscript.json**. Revenez aux
   fichiers, ouvrez `appsscript.json` et remplacez tout son contenu par celui
   du dossier.
6. Enregistrez avec Ctrl+S.
7. En haut, choisissez la fonction `onOpen` et cliquez sur **Executer**.
   Google demande l'autorisation : acceptez-la. Cela declenche l'ecran de
   consentement une premiere fois, de votre cote plutot que de celui du
   client.
8. Revenez au classeur et rechargez la page. Le menu **TenderPilot** doit
   apparaitre.

## Chemin B - clasp

Adapte aux mises a jour : une commande au lieu de sept copier-coller.

Le dossier `clasp/` livre a cote contient deja les memes fichiers avec
l'extension `.js` attendue par clasp.

```
npm install -g @google/clasp
clasp login
```

Recuperez l'identifiant du script : dans l'editeur Apps Script,
*Parametres du projet > ID du script*.

Copiez `clasp/.clasp.json.example` en `clasp/.clasp.json` et remplacez
`VOTRE_SCRIPT_ID` par cet identifiant. Puis :

```
cd dist/TenderPilot_Toolkit/12_AUTOMATION/clasp
clasp push
```

`clasp push` ecrase les fichiers du projet distant. Les `.js` deviennent des
`.gs` cote Google, les `.html` restent des `.html`.

Mises a jour suivantes : `python build.py` puis `clasp push`.

---

# Etape 3 - Faire tourner le systeme une fois

Avant de livrer :

1. Menu *TenderPilot > Configuration...* : remplissez avec vos propres
   parametres. Verifiez que les listes Pays et Secteur se remplissent - si
   elles sont vides, l'onglet `LISTS` n'a pas survecu a l'import.
2. Menu *Verifier les deadlines* : l'onglet `DEADLINES` doit se remplir a
   partir de la ligne 23.
3. Menu *Ajouter une opportunite...* : saisissez une ligne de test. Le score
   doit s'afficher avec son detail.
4. Ressaisissez exactement la meme : elle doit etre refusee comme doublon.
5. Onglet `LOGS` : vos actions doivent y etre tracees.

---

# Etape 4 - Produire le lien de copie

1. Bouton **Partager**, en haut a droite du classeur.
2. *Acces general* : **Tout utilisateur disposant du lien**, role
   **Lecteur**.
3. Copiez le lien. Il ressemble a :

```
https://docs.google.com/spreadsheets/d/1AbCdEf.../edit?usp=sharing
```

4. Remplacez tout ce qui suit l'identifiant par `/copy` :

```
https://docs.google.com/spreadsheets/d/1AbCdEf.../copy
```

C'est ce lien que vous remettez au client. Il affiche directement le bouton
*Creer une copie*. Le projet Apps Script est copie avec le classeur, fichiers
HTML compris.

**Testez-le vous-meme** depuis une fenetre de navigation privee, ou avec un
second compte Google. C'est le seul moyen de voir ce que voit le client, y
compris l'ecran d'autorisation.

---

# Ce qui ne se copie pas

**Les declencheurs.** Ils appartiennent a chaque copie. Le client les cree en
enregistrant sa configuration, ou via *Activer les rappels automatiques*. A
verifier lors d'une livraison accompagnee.

**Vos donnees.** Ce que vous saisissez dans le fichier maitre est copie avec
lui. Ne laissez que les lignes `DEMO-`, ou supprimez tout si vous preferez
livrer un fichier vierge.

**Les corrections futures.** Une copie livree est independante : corriger un
bug apres livraison suppose de recontacter les clients. C'est le compromis du
mode template.

---

# Mettre a jour apres une modification

Quand vous modifiez le schema ou un builder :

```
python build.py
```

Puis, selon le chemin choisi :

- **Chemin A** : recollez les fichiers modifies. `Schema.gs` change des que
  vous touchez a `schema/columns.py`.
- **Chemin B** : `clasp push`.

Si la modification touche le **classeur** - colonnes, formules, mise en
forme - il faut reimporter le `.xlsx` dans un nouveau fichier maitre et
refaire l'etape 2. Une modification de classeur coute donc plus cher qu'une
modification de script : raison de plus pour figer les noms de colonnes tot.

---

# Recapitulatif

| Etape | Ou | Duree |
|-------|-----|-------|
| 1. Importer le .xlsx | Google Sheets | 3 min |
| 2. Verifier LISTS, validations, couleurs | Google Sheets | 3 min |
| 3. Installer le script | Apps Script | 10 min (A) ou 2 min (B) |
| 4. Autoriser et tester | Apps Script | 5 min |
| 5. Partager, transformer en lien /copy | Google Sheets | 2 min |
| 6. Tester en navigation privee | Navigateur | 5 min |
"""
