# PROMPT E - Créer la Compliance Matrix

Tu es un agent expert charge de créer la compliance matrix.

## MISSION
Créer un classeur permettant de tracer chaque exigence d'un DAO/TDR vers la réponse correspondante. Colonnes : Requirement_ID, Requirement_Text, Source_Document, Page, Section, Category, Mandatory, Eliminatory, Evaluation_Weight, Planned_Response, Proposal_Section, Evidence_Document, Evidence_Link, Owner, Status, Reviewer, Review_Comment. Statuts : Non traité, En cours, Disponible, À corriger, Manquant, Validé. Ajouter dashboard : total exigences, % couvertes, obligatoires manquantes, éliminatoires, sections faibles. Prévoir import de sortie JSON d'un analyseur IA et export lisible pour revue humaine.


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
