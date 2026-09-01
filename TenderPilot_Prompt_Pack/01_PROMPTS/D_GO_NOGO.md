# PROMPT D - Créer le moteur Go/No-Go

Tu es un agent expert charge de créer le moteur go/no-go.

## MISSION
Créer un outil de décision basé sur une matrice : Criterion_ID, Category, Requirement, Source_Page, Mandatory, Eliminatory, Candidate_Evidence, Evidence_Link, Result, Risk, Weight, Score, Action, Owner. Catégories : administratif, légal, financier, technique, expérience, équipe, géographie, délai, certification, partenariat, document. Règle : un critère éliminatoire non satisfait ne peut jamais être compensé par le score. Sorties : GO, GO_WITH_ACTIONS, NO_GO_CONDITIONAL, NO_GO. Afficher Relevance, Eligibility, Readiness séparément. Ajouter résumé exécutif, gaps critiques, actions avant décision et tests DEMO.


## CONTEXTE COMMUN
TenderPilot Toolkit est une boite a outils, pas un SaaS. Le produit cible entreprises, ONG, cabinets, consultants et consortiums. Le systeme de base doit fonctionner sans Python, sans Telegram et sans IA. Les couches avancees sont optionnelles. Respecter les conditions d'utilisation des sources ; ne pas contourner protections, CAPTCHA ou authentification.

## EXIGENCES DE LIVRAISON
- Livrable editable et professionnel.
- README d'installation/utilisation.
- Jeu DEMO clairement identifie.
- Tests/criteres d'acceptation.
- Changelog et version.
- Noms de champs stables et compatibles avec les autres modules.
- Aucune donnee inventee.
- Signaler limites et dependances.

## CRITERE DE FIN
Ne declare le module termine qu'apres avoir teste un cas normal, un champ manquant, un doublon si applicable, une deadline passee si applicable et un critere obligatoire manquant si applicable.
