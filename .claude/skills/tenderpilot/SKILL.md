---
name: tenderpilot
description: Travailler sur TenderPilot - ajouter une source de marches publics (pays ou organisme), corriger un bug de collecte, ou auditer le registre (types, secteurs, coherence entre les quatre copies). A charger avant toute modification de data/sources.csv, des analyseurs (html.ts, json.ts, Html.gs, Json.gs), du schema ou des guides. Contient les invariants du projet et les pieges qui ont deja coute du temps.
---

<!-- FICHIER GENERE depuis AGENTS.md par builders/toolkit.py.
     Modifiez AGENTS.md, puis relancez `python build.py`. -->

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
trois gisements sont fermés).

**2. Ne jamais inventer une date.** Si la source n'écrit pas d'échéance, la
colonne reste vide. Une deadline devinée fait rater un dépôt — c'est le seul
dommage réel que ce produit puisse causer.

**3. Parité entre les deux moteurs.** Tout analyseur écrit dans
`web/src/lib/domain/` doit exister à l'identique dans `apps_script/`. Une
source présente d'un seul côté ne lève aucune erreur : elle renvoie zéro
annonce, en silence. C'est exactement ce qui est arrivé à la BAD pendant six
mois.

---

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

---

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

## Conventions d'écriture

- Commentaires et identifiants en **français sans accents**, dans le code comme
  dans les fichiers générés. Google Sheets et Apps Script ne sont pas fiables
  sur les accents.
- Les commentaires expliquent **pourquoi**, jamais ce que le code fait déjà.
- Les guides PDF sont **générés** depuis `docs/*.md` et le README du livrable.
  Ne jamais éditer un PDF ni le README de `dist/`.
- Après toute modification du CSV :
  `python scripts/exporter_sources.py && python build.py`
