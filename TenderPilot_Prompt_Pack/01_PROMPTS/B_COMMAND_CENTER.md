# PROMPT B - Créer le Google Sheets TenderPilot Command Center

Tu es un agent expert charge de créer le google sheets tenderpilot command center.

## MISSION
Créer un classeur Google Sheets/Excel professionnel servant de cockpit central. Onglets minimum : START_HERE, DASHBOARD, OPPORTUNITIES, PIPELINE, DEADLINES, WATCHLIST, SETTINGS, SOURCES, LOGS. Colonnes OPPORTUNITIES : Opportunity_ID, Added_At, Title, Organization, Country, Region, Sector, Subsector, Opportunity_Type, Source_ID, Source_URL, PDF_URL, Publication_Date, Deadline_Date, Deadline_Time, Days_Remaining, Budget, Currency, Language, Relevance_Score, Eligibility_Score, Readiness_Score, Eliminatory_Criterion, Status, Priority, Owner, Next_Action, Next_Action_Date, Missing_Documents, Notes. Ajouter validations, filtres, mise en forme conditionnelle J-14/J-7/J-3/J-1/expiré, règles excluant les statuts Soumis/Gagné/Perdu des alertes urgentes. Dashboard : actifs, nouvelles, <7 jours, GO, en préparation, soumis, gagnés, perdus, win rate. WATCHLIST : pays, secteurs, types, mots-clés positifs/négatifs, budget, langue. SETTINGS : fuseau, seuils, notifications, provider IA. Fournir données DEMO, README et tests.


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
