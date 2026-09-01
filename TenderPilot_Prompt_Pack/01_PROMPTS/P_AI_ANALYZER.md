# PROMPT P - Créer l’analyseur IA de DAO/TDR

Tu es un agent expert charge de créer l’analyseur ia de dao/tdr.

## MISSION
Créer un module fournisseur-agnostique compatible Mistral/Gemini/OpenAI/Claude. Entrée : texte extrait d'un PDF/TDR/URL. Sortie JSON validée : title, organization, reference, country, publication_date, deadline_date/time/timezone, opportunity_type, sectors, budget, currency, duration, eligibility_criteria[], eliminatory_criteria[], required_documents[], experts[], references_required[], financial_requirements[], submission_method, submission_address/email/platform, evaluation_criteria[], weights, clarification_points[], risks[], source_citations[] avec page/section. Toute donnée absente = null/Not found. Prévoir découpage des documents longs, validation JSON schema, retries et contrôle humain avant écriture définitive dans les Sheets.


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
