# TenderPilot Toolkit - depot de production

Ce depot **fabrique** le produit TenderPilot. Il ne le contient pas.

Les livrables vendus (classeurs, templates, scripts) sont generes dans
`dist/TenderPilot_Toolkit/`. On ne les modifie jamais a la main : on modifie
le schema, les donnees ou un builder, puis on relance le build.

## Pourquoi generer par code

Le produit est un ensemble de fichiers avec des formules, des validations,
des couleurs conditionnelles et des noms de colonnes partages entre modules.
Les modules d'automatisation (Apps Script, Telegram, collecteur Python,
PostgreSQL) se referent tous a ces noms de colonnes. Regenerer ces fichiers a
la main a chaque correction casse la coherence.

Ici, `schema/columns.py` est la source unique de verite. Un renommage se fait
a un seul endroit et se propage a tous les livrables au prochain build.

## Utilisation

    python build.py            # regenere tout et lance les tests
    python build.py --no-test  # build seul

Prerequis : Python 3.10+, `openpyxl`, `python-docx`. Node n'est requis que
pour les tests JavaScript du module 12.

## Structure

    schema/columns.py     source unique des noms de colonnes et des listes
    data/                 contenu editable sans toucher au code (CSV)
      demo/               jeux de demonstration, entierement fictifs
    apps_script/          code source du module 12 (Schema.gs est GENERE)
    builders/             un builder par module du produit
    tests/                un test par module produit (.py et .js)
    build.py              orchestrateur
    dist/                 livrables generes - ne rien y editer a la main

## Documentation fonctionnelle

- `DOCUMENTATION.md` : vision, modules, regles produit. Reference principale.
- `PROMPT_A.md` : cahier des charges du module 01 (Sources).
- `TenderPilot_Prompt_Pack/` : cahiers des charges des modules B a R et
  guides operateur.

Les prompts B a R servent de cahiers des charges pour ecrire les builders.
Ils ne sont pas destines a produire les fichiers directement.

## Etat d'avancement

| Module | Etat | Livrable |
|--------|------|----------|
| 02 Command Center | **fait** - 40 tests verts | `02_TenderPilot_Command_Center.xlsx` |
| 03 Organization Profile | **fait** - 46 tests verts | `03_TenderPilot_Organization_Profile.xlsx` |
| 04 Go / No-Go | **fait** - 48 tests verts | `04_TenderPilot_Go_NoGo.xlsx` |
| 12 Automation (interface) | **fait** - 70 + 64 tests verts | projet Apps Script + guides d'installation |
| 01 Sources | a faire | depend d'un travail de sourcing manuel |
| 08 Compliance Matrix | a faire | |
| 06 References / 07 Experts | a faire | |
| 09 / 10 Templates offres | a faire | python-docx |
| 11 AI Playbook | a faire | |
| Telegram, Collector, PostgreSQL | a faire | phase 3, optionnels |

Ordre de construction impose par
`TenderPilot_Prompt_Pack/00_GUIDES/01_GUIDE_DE_LECTURE_ET_DEPENDANCES.md` :
A puis B, C, D, E, F, G, H, I, J, Q pour le MVP vendable.

## Regles non negociables

Reprises du guide agent, elles s'appliquent au code comme aux livrables :

1. Ne jamais inventer une source, une URL, une reference client, un expert ou
   un chiffre. Les jeux DEMO sont explicitement fictifs (`example.org`).
2. Le systeme manuel doit fonctionner seul. Python, Telegram et l'IA sont des
   couches optionnelles, jamais des dependances du produit de base.
3. Les trois scores (Relevance, Eligibility, Readiness) ne se fusionnent
   jamais en un chiffre unique.
4. Un critere eliminatoire l'emporte sur n'importe quel score.
5. Aucune cle API dans un fichier livre.
6. Ne pas renommer une colonne sans passer par `schema/columns.py`.

## Point de vigilance

Le contenu reel du module 01 (plateformes de veille verifiees, avec statut
RSS / API / alertes email) est un travail de collecte manuel. Il conditionne
la date de sortie bien plus que le code, et doit demarrer en parallele.
