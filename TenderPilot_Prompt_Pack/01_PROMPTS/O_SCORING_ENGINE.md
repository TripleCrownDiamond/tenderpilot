# PROMPT O - Créer le moteur de scoring

Tu es un agent expert charge de créer le moteur de scoring.

## MISSION
Créer un moteur explicable sans IA en premier niveau. Entrées Watchlist + opportunité. Pondérations configurables : pays, secteur, type, mots-clés, deadline, budget, langue. Sortie 0-100 + détail par critère. Puis prévoir interface pour ajouter Eligibility et Readiness issus d'autres modules. Ne jamais fusionner les scores en un seul chiffre trompeur. Seuils configurables. Ajouter tests unitaires : perfect match, pays exclu, deadline passée, keyword négatif, budget inconnu.


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
