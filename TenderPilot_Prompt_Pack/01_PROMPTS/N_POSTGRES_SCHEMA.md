# PROMPT N - Créer le schéma PostgreSQL/Supabase

Tu es un agent expert charge de créer le schéma postgresql/supabase.

## MISSION
Créer migrations SQL pour sources, opportunities, opportunity_documents, organization_profiles (optionnel pour installation privée), notifications, processing_logs. opportunities : UUID/id, source_id, external_id, title, organization, country, sector, opportunity_type, publication_date, deadline, budget, currency, source_url, pdf_url, raw_text_reference, normalized_hash, status, created_at, updated_at. Indexes sur deadline, country, sector, hash, source. Contraintes de déduplication. Ajouter vues : active_opportunities, upcoming_deadlines, recent_opportunities. RLS seulement si multi-utilisateur ; sinon expliquer qu'elle peut être omise. Fournir seed DEMO.


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
