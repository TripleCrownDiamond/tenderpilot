# PROMPT M - Coder le Python Advanced Collector

Tu es un agent expert charge de coder le python advanced collector.

## MISSION
Créer un collecteur Python modulaire. Architecture : sources configurées -> fetch -> parse -> normalize -> validate -> deduplicate -> score -> persist -> notify. Bibliothèques légères : requests/httpx, BeautifulSoup, feedparser, PyMuPDF/pdfplumber selon besoin, pydantic, psycopg/supabase client. Playwright uniquement pour pages JS autorisées et nécessairement documentées. Chaque source doit être un adapter séparé. Configuration YAML/JSON : countries, sectors, keywords, sources, frequencies. Ne pas contourner protections. Stocker les PDF par URL ou Drive/Storage plutôt que dans PostgreSQL. Fournir Dockerfile optionnel, requirements, .env.example, tests et scheduler compatible GitHub Actions/cron gratuit si approprié.


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
