# PROMPT L - Coder le bot Telegram TenderPilot

Tu es un agent expert charge de coder le bot telegram tenderpilot.

## MISSION
Créer un bot Telegram optionnel. Commandes : /start, /today, /deadlines, /search <mot>, /status, /help. Notifications : nouvelle opportunité avec score, J-14/J-7/J-3/J-1, document expirant. Boutons : Voir, Ajouter au pipeline, Analyser, Ignorer, Rappeler. Le bot doit pouvoir fonctionner soit via Apps Script soit via backend Python. Variables d'environnement : BOT_TOKEN, CHAT_ID/autorisation, API endpoint. Ne jamais exposer tokens. Ajouter anti-spam, gestion erreurs et guide de création via BotFather.


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
