"""
Builder du module 12 - TenderPilot Automation (Google Apps Script).

Produit : dist/TenderPilot_Toolkit/12_AUTOMATION/

Le code Apps Script est ecrit a la main dans apps_script/ - c'est du code
source, pas un livrable genere. Ce builder fait deux choses :

1. Il GENERE apps_script/Schema.gs depuis schema/columns.py. Le script ne
   contient donc aucun nom d'onglet ni de colonne ecrit en dur : renommer
   une colonne dans le schema la renomme partout, y compris cote JavaScript.

2. Il assemble le dossier livrable avec le mode d'emploi client et la
   procedure de deploiement de l'operateur.

Dependances : schema/columns.py, apps_script/*
"""

import datetime as dt
import json
import shutil
from pathlib import Path

from schema import columns as S
from builders.guide_utilisateur import GUIDE
from builders.mise_en_ligne import MISE_EN_LIGNE

ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = ROOT / "apps_script"
OUT_DIR = ROOT / "dist" / "TenderPilot_Toolkit" / "12_AUTOMATION"
SCHEMA_FILE = SOURCE_DIR / "Schema.gs"

MODULE_VERSION = "0.1.0"

# Fichiers copies tels quels dans le livrable.
SOURCE_FILES = [
    "appsscript.json",
    "Schema.gs",
    "Core.gs",
    "Rss.gs",
    "Sheets.gs",
    "Menu.gs",
    "Setup.html",
    "AddOpportunity.html",
]


def js(value, indent=2):
    """Serialise une valeur Python en litteral JavaScript lisible."""
    return json.dumps(value, ensure_ascii=False, indent=indent)


def render_schema_gs():
    """Contenu de Schema.gs, derive integralement de schema/columns.py."""
    return f"""/**
 * TenderPilot - FICHIER GENERE. NE PAS MODIFIER A LA MAIN.
 *
 * Genere par builders/build_12_apps_script.py depuis schema/columns.py.
 * Toute modification sera perdue au prochain `python build.py`.
 *
 * C'est ce fichier qui garantit que le script et le classeur parlent des
 * memes colonnes. Pour renommer une colonne : modifier schema/columns.py,
 * puis relancer le build.
 *
 * Schema {S.SCHEMA_VERSION} - module {MODULE_VERSION}
 */

var SCHEMA = {{

  VERSION: {js(S.SCHEMA_VERSION)},

  /** Noms des onglets du Command Center. */
  SHEETS: {js(S.SHEETS)},

  /** Cle technique -> nom de colonne de l'onglet OPPORTUNITIES. */
  OPP: {js(S.OPP_KEYS)},

  /** Cle technique -> nom de colonne de l'onglet SOURCES. */
  SRC: {js(S.SOURCE_KEYS)},

  /** Cle technique -> nom de colonne de l'onglet LOGS. */
  LOG: {js(S.LOG_KEYS)},

  /** En-tetes de l'onglet technique LISTS. */
  LISTS: {js(S.LISTS_COLUMNS)},

  /** Libelle en colonne A de l'onglet SETTINGS. */
  SETTINGS_LABELS: {js(S.SETTINGS_LABELS)},

  /** Libelle en colonne A de l'onglet WATCHLIST. */
  WATCHLIST_LABELS: {js(S.WATCHLIST_LABELS)},

  /** Zone de selection de WATCHLIST : une colonne de valeurs, une de cases. */
  WATCHLIST_TARGETS_TITLE: {js(S.WATCHLIST_TARGETS_TITLE)},
  WATCHLIST_CHECK_HEADER: {js(S.WATCHLIST_CHECK_HEADER)},
  WATCHLIST_BLOCKS: {js(S.WATCHLIST_BLOCKS)},
  WATCHLIST_CHECKED: {js(S.WATCHLIST_CHECKED)},

  /** Statuts possibles d'une opportunite. */
  STATUSES: {js(S.STATUSES)},

  /**
   * Statuts clos. Regle produit : ils ne declenchent jamais d'alerte
   * d'urgence ni de rappel, meme la veille de la deadline.
   */
  STATUSES_CLOSED: {js(S.STATUSES_CLOSED)},

  /** Libelle lisible de chaque palier de deadline. */
  BUCKET_LABELS: {js(S.BUCKET_LABELS)},

  /** Ligne de l'onglet DEADLINES ou le script ecrit la liste detaillee. */
  DEADLINES_LIST_ROW: {S.DEADLINES_LIST_ROW}
}};

// Export pour les tests Node. Apps Script n'a pas de module.
if (typeof module !== 'undefined') {{
  module.exports = {{ SCHEMA: SCHEMA }};
}}
"""


# ------------------------------------------------------------------ docs ---
INSTALL_CLIENT = """# TenderPilot - installation en 5 minutes

Aucun logiciel a installer. Aucun compte a creer. Il faut seulement un
compte Google (Gmail ou Google Workspace).

## Etape 1 - Faire votre copie

Ouvrez le lien qui vous a ete transmis, puis cliquez sur **Creer une copie**.

Google cree alors **votre** fichier, prive, dans votre Google Drive. Le
fichier d'origine reste intact : vous ne pouvez rien casser.

## Etape 2 - Autoriser TenderPilot

Ouvrez le menu **TenderPilot** en haut de la fenetre, puis
**Configuration...**

Google demande une autorisation la premiere fois. C'est normal : le fichier
contient un programme qui doit pouvoir lire votre feuille, vous envoyer des
rappels par email et lire le libelle Gmail que vous choisirez.

Un ecran d'avertissement peut apparaitre :

1. Cliquez sur **Parametres avances** (en bas a gauche).
2. Cliquez sur **Acceder a TenderPilot (non securise)**.
3. Cliquez sur **Autoriser**.

Cet avertissement s'affiche pour tout programme qui n'a pas encore ete
verifie par Google. Le programme s'execute dans votre propre compte et
n'envoie aucune donnee a l'exterieur.

Si vous preferez ne pas donner l'acces a Gmail, le produit fonctionne
entierement sans : vous saisirez vos opportunites vous-meme.

## Etape 3 - Repondre a l'assistant

L'assistant vous pose quelques questions :

- le nom de votre organisation ;
- vos pays et secteurs cibles ;
- vos mots-cles a privilegier et a exclure ;
- votre budget minimum et le delai minimum avant une deadline ;
- l'email a prevenir quand une echeance approche.

Cliquez sur **Enregistrer**. Les rappels automatiques s'activent.

## Etape 4 - Supprimer les exemples

Le fichier livre contient des lignes de demonstration, reconnaissables a
leur identifiant `DEMO-`. Selectionnez ces lignes dans l'onglet
`OPPORTUNITIES` et supprimez-les. Faites de meme dans l'onglet `SOURCES`.

## Etape 5 - Ajouter votre premiere opportunite

Menu **TenderPilot** puis **Ajouter une opportunite...**

Seuls le titre et la deadline sont obligatoires. A l'enregistrement,
TenderPilot affiche un score de pertinence et vous dit pourquoi : pays
cible, secteur cible, mot-cle reconnu.

## Recevoir vos alertes automatiquement

La plupart des plateformes d'appels d'offres envoient deja des alertes par
email. TenderPilot sait les recuperer.

1. Dans Gmail, creez un libelle nomme **TenderPilot**.
2. Creez un filtre : *Gmail > Afficher les options de recherche > saisir
   l'expediteur de vos alertes > Creer un filtre > Appliquer le libelle
   TenderPilot*.
3. Dans TenderPilot, menu **Relever mes alertes email**.

Chaque email portant ce libelle devient une ligne de votre tableau. Les
doublons sont ignores automatiquement.

Le programme ne lit **que** ce libelle. Il ne parcourt jamais votre boite de
reception.

## Recevoir les annonces d un site automatiquement (flux RSS)

Certaines plateformes publient un flux RSS : une adresse qui liste leurs
dernieres annonces, lisible par un programme.

1. Ouvrez l onglet `SOURCES` de votre classeur.
2. Ajoutez une ligne : un identifiant dans `Source_ID`, le nom du site dans
   `Source_Name`.
3. Collez l adresse du flux dans la colonne `RSS_URL`.
4. Mettez `Active` a `OUI`.
5. Menu **TenderPilot > Relever mes flux RSS**.

Chaque annonce du flux devient une ligne, avec son score de pertinence
calcule automatiquement. Les annonces contenant un de vos mots-cles negatifs
ne sont pas importees du tout.

**Comment trouver l adresse d un flux ?** Cherchez une icone orange RSS sur
le site, ou essayez d ajouter `/rss` ou `/feed` a l adresse de la page des
appels d offres. Si le site n en propose pas, utilisez les alertes email.

**Les dates limites.** TenderPilot ne retient une date que si elle est
annoncee par un mot explicite (« date limite », « cloture », « deadline »).
Sinon il laisse la case vide plutot que de deviner : une echeance inventee
vous ferait rater un marche. Completez-la a la main.

## Ce qui se passe ensuite tout seul

Chaque matin vers 7h :

- la liste des deadlines proches est mise a jour ;
- les nouvelles alertes email sont importees ;
- les flux RSS actifs sont releves ;
- un email de rappel part si une echeance tombe a J-14, J-7, J-3 ou J-1.

Un dossier deja marque **Soumis** ne declenche plus aucun rappel.

## En cas de probleme

- **Le menu TenderPilot n'apparait pas** : fermez et rouvrez le fichier,
  puis patientez quelques secondes.
- **Une action affiche une erreur** : verifiez qu'aucun onglet et aucune
  colonne n'a ete renomme. Le programme retrouve les colonnes par leur nom.
- **Les rappels n'arrivent pas** : menu *Configuration*, verifiez l'email et
  que les rappels sont sur *Actives*.
"""

INSTALL_OPERATOR = """# Deploiement du module 12 - procedure operateur

Ce document est destine a la personne qui prepare le produit, pas au client.

## Ce que contient le module

| Fichier | Role |
|---------|------|
| `appsscript.json` | manifeste et autorisations demandees |
| `Schema.gs` | **genere** depuis `schema/columns.py`, ne pas editer |
| `Core.gs` | logique metier pure, testee sous Node |
| `Sheets.gs` | acces au classeur |
| `Menu.gs` | menu, actions, declencheurs |
| `Setup.html` | assistant de configuration |
| `AddOpportunity.html` | formulaire de saisie |

## Preparer le fichier maitre, une fois

1. Generer les classeurs : `python build.py`.
2. Importer `02_TenderPilot_Command_Center.xlsx` dans Google Sheets
   (*Fichier > Importer > Importer les donnees*), en conservant la mise en
   forme et les formules.
3. Verifier que l'onglet `LISTS` est present et masque.
4. Ouvrir *Extensions > Apps Script*.
5. Coller le contenu de chaque fichier de ce dossier dans un fichier de meme
   nom du projet Apps Script. Les `.html` se creent via
   *Fichier > Nouveau > Fichier HTML*.
6. Remplacer le contenu de `appsscript.json` (visible via
   *Parametres du projet > Afficher le fichier manifeste*).
7. Enregistrer, puis executer `onOpen` une fois pour declencher l'ecran
   d'autorisation et verifier que le menu apparait.

### Avec clasp, si vous preferez

```
npm install -g @google/clasp
clasp login
clasp clone <SCRIPT_ID>
clasp push
```

`clasp` attend l'extension `.js` par defaut : renommer les `.gs` ou ajuster
`.clasp.json` avant le push.

## Produire le lien de copie

Partager le fichier maitre en lecture, recuperer son URL, puis remplacer
`/edit` par `/copy` :

```
https://docs.google.com/spreadsheets/d/<ID>/copy
```

Ce lien affiche directement le bouton *Creer une copie*. Le projet Apps
Script est copie avec le classeur, fichiers HTML compris.

## Points de vigilance

**L'ecran "application non verifiee".** Il s'affiche tant que le projet
n'est pas valide par Google. Le contournement est documente dans le mode
d'emploi client. Pour le supprimer definitivement, il faut publier un add-on
Google Workspace et passer la validation : politique de confidentialite,
video de demonstration, et - parce que le script lit Gmail - une evaluation
de securite.

**Les declencheurs ne se copient pas.** Ils sont crees dans la copie du
client quand il enregistre sa configuration, ou via le menu *Activer les
rappels automatiques*. A verifier lors d'une livraison accompagnee.

**Les mises a jour ne se propagent pas.** Une copie livree est independante.
Corriger un bug apres livraison suppose de recontacter les clients ou de
leur fournir un nouveau lien. C'est le compromis assume du mode template ;
l'add-on publie resout ce point.

**Quotas Google.** Compte gratuit : environ 100 emails par jour et 20 000
lectures Gmail. Largement suffisant pour un usage normal, mais a connaitre
avant de promettre un volume.

## Tests avant livraison

```
python build.py
node tests/test_12_apps_script.js
python tests/test_12_apps_script.py
```

Puis, dans une copie vierge et avec un compte Google neuf :

- [ ] le menu TenderPilot apparait a l'ouverture
- [ ] l'autorisation aboutit
- [ ] l'assistant se pre-remplit et enregistre
- [ ] l'ajout d'une opportunite renvoie un score coherent
- [ ] la meme opportunite saisie deux fois est refusee comme doublon
- [ ] la verification des deadlines remplit l'onglet DEADLINES
- [ ] une opportunite au statut Soumis ne genere pas de rappel
- [ ] l'import Gmail affiche un message clair quand le libelle n'existe pas
"""


def render_readme(today):
    return f"""# Module 12 - TenderPilot Automation

Version {MODULE_VERSION} - schema {S.SCHEMA_VERSION} - genere le {today}

L'interface du produit, pour un utilisateur qui n'ouvrira jamais une
formule : un menu dans Google Sheets, deux formulaires, des rappels
automatiques.

## Contenu

| Fichier | Pour qui |
|---------|----------|
| `GUIDE_UTILISATEUR.md` | le client - de l'installation a la soumission |
| `INSTALLATION_CLIENT.md` | le client - installation en 5 minutes |
| `MISE_EN_LIGNE.md` | vous - du depot local au lien de copie |
| `DEPLOIEMENT_OPERATEUR.md` | vous - preparation et checklist de livraison |
| `*.gs`, `*.html`, `appsscript.json` | le projet Apps Script |
| `clasp/` | le meme projet en `.js`, pret pour `clasp push` |

## Le menu

```
TenderPilot
  Ajouter une opportunite...
  Verifier les deadlines
  Relever mes alertes email
  Envoyer les rappels maintenant
  Configuration...
  Activer / Desactiver les rappels automatiques
  Aide
```

## Comment les donnees entrent

| Canal | Fiabilite | Ce que le client doit faire |
|-------|-----------|------------------------------|
| Formulaire | totale | coller un lien, saisir un titre et une deadline |
| Libelle Gmail | tres bonne | creer un filtre Gmail, une fois |

Le scraping de sites n'est volontairement pas propose : il casse, il demande
de la maintenance, et il est interdit sur les sites proteges. Les alertes
email des plateformes couvrent le meme besoin de facon stable.

## Regles produit respectees

- Le classeur reste utilisable sans le script. Le script accelere, il ne
  conditionne rien.
- Un dossier clos ne declenche jamais de rappel, meme a J-1. La regle est
  ecrite une fois dans `Core.gs` et testee.
- Aucune cle API n'est stockee dans le classeur.
- Le script ne lit que le libelle Gmail configure, jamais la boite de
  reception.
- Aucune colonne n'est designee par sa position : tout passe par
  `Schema.gs`, genere depuis `schema/columns.py`.

## Architecture

```
Core.gs     logique pure, aucune API Google, testee sous Node
Sheets.gs   acces au classeur, resolution des colonnes par nom
Menu.gs     menu, actions, declencheurs, gestion des erreurs
*.html      barres laterales
Schema.gs   GENERE - noms d'onglets, de colonnes et de reglages
```

Cette separation existe pour une raison : la logique metier est testable
hors de Google. `deadlineBucket`, `shouldRemind`, `dedupKey` et
`relevanceScore` sont couverts par des tests qui tournent en local.

## Tests

```
node tests/test_12_apps_script.js   logique metier
python tests/test_12_apps_script.py coherence avec le schema
```

## Limites connues

- Une copie livree est independante : les corrections ne se propagent pas
  aux clients existants.
- L'ecran Google "application non verifiee" apparait a la premiere
  autorisation.
- L'import Gmail traite les 40 conversations les plus recentes du libelle.
- Un email importe n'a pas de deadline : le client doit la renseigner. Une
  extraction automatique de date releve du module P (analyseur IA).
- Le score de pertinence est algorithmique et volontairement simple. Il ne
  remplace pas la lecture du dossier.

## Changelog

### {MODULE_VERSION} - {today}
- Version initiale.
- Menu, assistant de configuration, formulaire de saisie.
- Liste des deadlines, rappels email, declencheur quotidien.
- Import des alertes Gmail par libelle, avec deduplication.
- Score de pertinence explicable, calcule a la saisie.
- Schema.gs genere depuis schema/columns.py.
"""


CLASP_CONFIG = """{
  "scriptId": "VOTRE_SCRIPT_ID",
  "rootDir": ".",
  "filePushOrder": ["appsscript.json", "Schema.js", "Core.js", "Rss.js",
                    "Sheets.js", "Menu.js"]
}
"""

CLASP_README = """# Dossier pret pour clasp

`clasp` attend l'extension `.js` : ces fichiers sont les memes que les `.gs`
du dossier parent, simplement renommes. Ils redeviennent des `.gs` une fois
pousses chez Google.

Ne modifiez rien ici : ce dossier est regenere a chaque `python build.py`.
Les sources sont dans `apps_script/` a la racine du depot.

## Premiere fois

```
npm install -g @google/clasp
clasp login
```

Recuperez l'ID du script dans l'editeur Apps Script
(*Parametres du projet > ID du script*), copiez `.clasp.json.example` en
`.clasp.json`, remplacez `VOTRE_SCRIPT_ID`, puis :

```
clasp push
```

## Ensuite

```
python build.py && clasp push
```

`clasp push` ecrase les fichiers distants. Il ne touche ni au classeur, ni aux
declencheurs, ni aux autorisations deja accordees.
"""


def write_clasp_bundle():
    """Copie du projet avec l'extension .js attendue par clasp."""
    clasp_dir = OUT_DIR / "clasp"
    clasp_dir.mkdir(parents=True, exist_ok=True)

    for name in SOURCE_FILES:
        target = name[:-3] + ".js" if name.endswith(".gs") else name
        shutil.copy2(SOURCE_DIR / name, clasp_dir / target)

    (clasp_dir / ".clasp.json.example").write_text(CLASP_CONFIG, encoding="utf-8")
    (clasp_dir / "README.md").write_text(CLASP_README, encoding="utf-8")
    return clasp_dir


# ----------------------------------------------------------------- build ---
def build():
    today = dt.date.today().isoformat()

    SCHEMA_FILE.write_text(render_schema_gs(), encoding="utf-8")

    missing = [name for name in SOURCE_FILES if not (SOURCE_DIR / name).exists()]
    if missing:
        raise FileNotFoundError(
            f"Fichiers Apps Script absents de {SOURCE_DIR} : {missing}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for name in SOURCE_FILES:
        shutil.copy2(SOURCE_DIR / name, OUT_DIR / name)

    (OUT_DIR / "INSTALLATION_CLIENT.md").write_text(INSTALL_CLIENT,
                                                    encoding="utf-8")
    (OUT_DIR / "GUIDE_UTILISATEUR.md").write_text(GUIDE, encoding="utf-8")
    (OUT_DIR / "MISE_EN_LIGNE.md").write_text(MISE_EN_LIGNE, encoding="utf-8")
    write_clasp_bundle()
    (OUT_DIR / "DEPLOIEMENT_OPERATEUR.md").write_text(INSTALL_OPERATOR,
                                                      encoding="utf-8")
    (OUT_DIR / "README.md").write_text(render_readme(today), encoding="utf-8")
    return OUT_DIR


if __name__ == "__main__":
    print(f"OK  {build()}")
