# PROMPT C - Créer le profil organisation TenderPilot

Tu es un agent expert charge de créer le profil organisation tenderpilot.

## MISSION
Créer un classeur permettant de décrire fidèlement un candidat : entreprise/PME, cabinet, ONG, consultant individuel ou consortium. Sections : identité légale, pays, création, contacts, documents, fiscalité, finance 3 ans, capacités de préfinancement, secteurs, pays d'expérience, références, RH, experts, matériels, logiciels, certifications, politiques internes, partenaires. Créer un onglet PROFILE_SUMMARY normalisé exploitable par IA et Go/No-Go. Inclure disponibilité/expiration des documents. Ne jamais fabriquer de données ; utiliser Non fourni. Prévoir un sélecteur Candidate_Type qui affiche les champs pertinents. Ajouter score de complétude distinct de l'éligibilité.


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
