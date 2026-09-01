# PROMPT K - Coder l’automatisation Google Apps Script

Tu es un agent expert charge de coder l’automatisation google apps script.

## MISSION
Créer un projet Apps Script attaché au Command Center. Menu TenderPilot : Actualiser, Ajouter opportunité, Vérifier deadlines, Lire alertes Gmail, Synchroniser sources, Analyser, Envoyer rappels, Paramètres, Logs. Fonctions : déclencheur quotidien, calcul deadlines, couleurs/statuts, déduplication via Opportunity_ID/hash, lecture d'emails portant un label configuré, parsing simple d'HTML/RSS/API publiques via UrlFetchApp, ajout au Sheet, notifications email/Telegram optionnelles, appel IA optionnel avec clé utilisateur stockée de façon raisonnable. Prévoir quotas, retries limités, logs, erreurs lisibles. Ne pas contourner login/CAPTCHA/anti-bot. Fournir INSTALL.md et TESTS.md.


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
