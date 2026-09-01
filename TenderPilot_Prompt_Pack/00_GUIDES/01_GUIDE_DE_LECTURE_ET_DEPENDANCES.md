# Guide de lecture et dependances

## 1. Relation avec la documentation precedente
La documentation precedente definit la vision, les modules et la logique de TenderPilot. Ce pack transforme cette vision en prompts executables pour produire chaque outil.

## 2. Carte des prompts
- A (deja cree) : fichier Sources.
- B : Command Center Google Sheets.
- C : Organization Profile.
- D : Go/No-Go Engine.
- E : Compliance Matrix.
- F : Reference Database.
- G : Expert Database.
- H : Templates d'offres techniques.
- I : Templates d'offres financieres.
- J : AI Playbook.
- K : Google Apps Script.
- L : Telegram Bot.
- M : Python Collector.
- N : Schema PostgreSQL/Supabase.
- O : Moteur de scoring.
- P : Analyseur IA.
- Q : Guide utilisateur final.
- R : Mini-formation.

## 3. Dependances
B depend de A pour les sources.
D depend de C.
E depend du DAO et peut exploiter C, F et G.
H et I dependent de E pour aligner la proposition sur les exigences.
J explique comment utiliser l'IA avec C, E, F, G, H et I.
K automatise B et les rappels.
L s'appuie sur B/K ou M/N.
M peut alimenter N puis B.
O peut fonctionner dans B, K ou M.
P utilise le contenu du DAO + C/F/G et renvoie une sortie exploitable par D/E/B.
Q documente tout le produit.
R transforme Q et les workflows en micro-formation.

## 4. Ordre de construction conseille
### MVP vendable
A -> B -> C -> D -> E -> F -> G -> H -> I -> J -> Q.

### Automatisation legere
K -> L.

### Couche avancee
N -> M -> O -> P.

### Formation
R en dernier, lorsque le produit est stabilise.

## 5. Regle de version
Chaque livrable doit indiquer : version, date, dependances, changelog court.
Ne jamais casser les noms de colonnes sans mettre a jour les scripts qui en dependent.

## 6. Definition of Done globale
Un module est termine seulement s'il :
- fonctionne avec des donnees de demonstration ;
- contient une aide minimale ;
- gere les erreurs courantes ;
- n'invente aucune donnee sensible ou administrative ;
- peut etre utilise sans explication orale du createur ;
- est compatible avec les modules precedents.
