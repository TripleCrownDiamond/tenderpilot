# TenderPilot - depot de production

Ce depot fabrique le produit. Les livrables sont generes dans
`dist/TenderPilot/` : on ne les modifie jamais a la main.

```
SOURCES -> COLLECTE -> NORMALISATION -> DEDUPLICATION -> BASE
        -> DEADLINE -> COULEUR -> EMAIL
```

Rien d'autre. Pas d'IA, pas de scoring, pas de Go/No-Go, pas de comptes
utilisateurs.

Les alertes partent par **email, Telegram ou notification push (ntfy)**. Les
trois canaux partagent les memes regles de declenchement, mais chacun a son
plafond et sa memoire : si l'un tombe ou plafonne, les autres passent, et
aucun ne renvoie ce qu'il a deja envoye.

Les echeances que le client marque **Suivi** sont en plus posees dans son
**Google Agenda** - celles-la seulement : y verser les centaines d'avis
collectes rendrait son agenda inutilisable.

## Deux moteurs, une seule logique

Le meme pipeline existe en deux versions, volontairement jumelles :

| Version | Ou | Pour qui |
|---------|-----|----------|
| **Google Sheets** | `apps_script/` -> `dist/TenderPilot/` | le client qui veut un classeur, sans rien heberger |
| **Web** | `web/` (Next.js + Postgres) | le meme produit, en application |

Les deux lisent le **meme registre de sources**, `data/sources.csv`. Toute
source ajoutee au CSV doit donc avoir son analyseur des deux cotes, sinon
un moteur la collecte et l'autre l'ignore en silence.

## Utilisation

    python build.py                     genere le livrable Sheets et lance les tests
    python build.py --no-test           genere seulement
    python scripts/exporter_sources.py  regenere le registre de l'app web depuis le CSV
    cd web && npm run dev               lance l'application web

Prerequis : Python 3.10+ avec `openpyxl`, et Node pour les tests et le web.

## Structure

    schema/columns.py     source unique : colonnes, statuts, couleurs, config
    data/sources.csv      registre des sources - la reference, editee a la main
    apps_script/          le code deploye dans Google Sheets
      Core.gs             logique pure, testee hors de Google
      Rss.gs              lecture des flux RSS et Atom
      Html.gs             extraction des pages sans flux
      Json.gs             lecture des API publiques
      Sources.gs          synchronisation du catalogue de sources
      Sheet.gs            acces au classeur
      Telegram.gs         second canal : messages Telegram
      Ntfy.gs             troisieme canal : notifications push
      Agenda.gs           echeances SUIVIES posees dans Google Agenda
      Llm.gs              classement intelligent, inerte sans cle
      Run.gs              collecte, deadlines, alertes, menu, declencheurs
      Schema.gs           GENERE depuis schema/columns.py
    web/src/lib/          le meme moteur, en TypeScript
      domain/rss.ts       equivalent de Rss.gs
      domain/html.ts      equivalent de Html.gs
      domain/json.ts      equivalent de Json.gs
      domain/regles.ts    equivalent de Core.gs
      run.ts              equivalent de Run.gs
    web/src/data/         registre GENERE depuis data/sources.csv
    builders/toolkit.py   genere le classeur, Schema.gs et le README livre
    scripts/              outils de generation
    tests/                scenarios metier, conformite du classeur, fixtures
    build.py              point d'entree
    dist/TenderPilot/     livrable - ne rien y editer
    _ARCHIVE_v1/          version precedente, hors build (voir plus bas)

## Les trois facons de lire une source

La colonne `Methode` de `data/sources.csv` dit comment une source est lue.
L'ordre ci-dessous est un ordre de preference, pas un catalogue : quand
plusieurs voies existent pour un meme site, on prend toujours la premiere
disponible.

| Methode | Ce que c'est | Ce qui peut casser |
|---------|--------------|--------------------|
| `JSON:<site>` | une API publique | rien, sauf changement de contrat annonce |
| `RSS` | un flux standard | rien, mais le flux est pauvre en champs |
| `HTML:<site>` | une extraction de page | tout, le jour ou le site change de mise en page |
| `MANUAL` | rien n'est collecte | - |

`MANUAL` est un choix explicite : on ne se bat pas contre un site qui exige
un login, un captcha ou un navigateur pilote.

**Ajouter une source** : une ligne dans `data/sources.csv`, puis
`python scripts/exporter_sources.py`. Si la methode n'est pas `RSS`, il faut
aussi ecrire l'analyseur dans `Html.gs` **et** `html.ts` (ou `Json.gs` et
`json.ts`), et l'enregistrer dans les deux repertoires d'analyseurs. Une
source dont l'analyseur manque n'est pas signalee en erreur : elle renvoie
zero annonce, en silence.

## Le registre voyage en quatre exemplaires

`data/sources.csv` est la reference. Trois copies en derivent :

| Copie | Generee par | Pour |
|-------|-------------|------|
| onglet `SOURCES` du classeur | `builders/toolkit.py` | la collecte Sheets |
| `SCHEMA.SOURCES_LIVREES` dans `Schema.gs` | `builders/toolkit.py` | la synchronisation |
| `web/src/data/sources-defaut.ts` | `scripts/exporter_sources.py` | la collecte web |

Un test refuse toute divergence entre les quatre. C'est ce qui manquait
quand la source BAD est restee six mois dans le CSV sans jamais etre
collectee par l'application web.

**Le classeur se met a jour tout seul.** `Schema.gs` embarque le catalogue,
et le menu **TenderPilot > Synchroniser les sources** aligne l'onglet dessus.
La synchronisation n'efface jamais une ligne et ne touche jamais a la colonne
`Active` : ajouter une source ne doit pas defaire un choix de l'utilisateur.
L'onglet `SOURCES` est d'ailleurs livre masque - un menu le reaffiche.

## Le schema commande tout

`schema/columns.py` definit les colonnes de `OPPORTUNITIES`, les statuts de
delai, les couleurs, les methodes de collecte et les cles de configuration.
Le classeur ET le script en sont derives : `Schema.gs` est genere. Renommer
une colonne se fait la, et nulle part ailleurs.

Un test refuse tout nom d'onglet ou de colonne ecrit en dur dans le
JavaScript.

## Tests

    node tests/test_logic.js    402 verifications - scenarios metier et synchronisation
    python tests/test_sheet.py  136 controles - classeur et coherence des registres
    cd web && npm test          176 tests - moteur web et analyseurs

`test_logic.js` charge le vrai `Run.gs` et l'execute contre une feuille en
memoire, une boite aux lettres factice et un reseau simule. La logique
testee est exactement celle qui est deployee.

Les analyseurs sont testes contre `tests/fixtures/`, qui contient de VRAIES
pages capturees sur les sites. Une fixture ecrite a la main ne teste que
l'idee qu'on se fait du site, jamais le site. Quand une extraction casse, on
recapture la page et le diff montre ce qui a change.

## Version precedente

`_ARCHIVE_v1/` contient les modules retires lors de la simplification :
Organization Profile, Go/No-Go, scoring, watchlist, collecteur Gmail,
barres laterales, jeux de donnees. Ils ne sont plus dans le build.

Le depot n'etant pas sous git, ils ont ete deplaces plutot que supprimes.
Une fois la nouvelle version validee en conditions reelles :

```bash
rm -rf _ARCHIVE_v1
```

## Documentation

**[AGENTS.md](AGENTS.md)** est la reference de travail : comment ajouter une
source, corriger un bug de collecte, auditer le registre, et les decisions a
ne pas defaire. Tout agent - Claude, Cursor, Codex, Aider - lit ce fichier.
La skill Claude `.claude/skills/tenderpilot/` en est generee, et un test
refuse toute divergence.

`SOURCES.md` detaille le registre : ce qui est collecte, ce qui ne l'est pas
et pourquoi.

`DOCUMENTATION.md`, `PROMPT_A.md` et `TenderPilot_Prompt_Pack/` decrivent la
vision large du produit. Le MVP actuel n'en implemente volontairement qu'une
partie.
