# GUIDE DE CRÉATION DU PRODUIT — TENDERPILOT TOOLKIT

## 1. Vision du produit

TenderPilot Toolkit n’est pas un SaaS.

C’est une boîte à outils opérationnelle permettant à une entreprise, une ONG, un cabinet, un consultant ou un consortium de :

* trouver des opportunités ;
* centraliser les opportunités ;
* surveiller les deadlines ;
* qualifier rapidement une opportunité ;
* vérifier son éligibilité ;
* analyser un DAO, TDR, appel à projets ou consultation ;
* identifier les documents obligatoires ;
* préparer une offre technique ;
* préparer une offre financière ;
* utiliser l’IA pour accélérer la rédaction et le contrôle ;
* suivre les soumissions ;
* recevoir des notifications ;
* capitaliser sur les offres passées.

Le produit doit fonctionner sans infrastructure obligatoire.

Le niveau de base doit rester utilisable uniquement avec :

* Excel ;
* Google Sheets ;
* Google Drive ;
* Google Apps Script ;
* ChatGPT, Mistral, Gemini ou Claude.

Des outils avancés peuvent ensuite être ajoutés :

* Python ;
* PostgreSQL ;
* Supabase ;
* Telegram Bot ;
* APIs IA ;
* automatisations supplémentaires.

---

# 2. Positionnement

## Promesse principale

TenderPilot aide les organisations à transformer les opportunités qu’elles trouvent en soumissions réellement exploitables.

## Positionnement à éviter

Ne pas présenter TenderPilot comme :

* une marketplace d’appels d’offres ;
* une plateforme concurrente aux sites existants ;
* un simple fichier de liens ;
* un générateur automatique d’offres ;
* un SaaS supplémentaire ;
* un pack de prompts.

## Positionnement recommandé

TenderPilot est :

**un système opérationnel de veille, qualification, préparation et suivi des opportunités.**

Formule simple :

**FIND → TRACK → QUALIFY → ANALYZE → PREPARE → CHECK → SUBMIT**

---

# 3. Structure générale du produit

Le produit sera organisé en 8 grandes parties.

## MODULE 1 — SOURCES & VEILLE

Objectif :

Permettre à l’utilisateur de savoir où chercher et quelles sources surveiller.

Contenu :

* base de plateformes ;
* sources par pays ;
* sources par type d’opportunité ;
* sources publiques ;
* institutions ;
* bailleurs ;
* ONG ;
* organismes internationaux ;
* plateformes nationales ;
* plateformes privées ;
* sources sectorielles ;
* alertes email disponibles ;
* flux RSS ;
* APIs éventuelles ;
* pages publiques pouvant être surveillées.

Fichier principal :

`01_TenderPilot_Sources.xlsx`

Onglets recommandés :

1. Toutes les sources
2. Appels d’offres
3. Consultances
4. Appels à projets
5. Grants / Subventions
6. ONG / Développement
7. Institutions internationales
8. Afrique de l’Ouest
9. Sources par pays
10. Mes sources
11. Sources à vérifier

Colonnes :

* Nom de la plateforme
* Organisation
* URL
* Pays
* Région
* Type d’opportunité
* Secteurs
* Inscription obligatoire
* Gratuit / Payant
* Alertes email
* RSS
* API
* Page publique
* PDF disponible
* Fréquence de publication
* Langue
* Dernière vérification
* Statut du lien
* Notes

---

# 4. MODULE 2 — OPPORTUNITY COMMAND CENTER

Objectif :

Créer le tableau central dans lequel toutes les opportunités sont suivies.

Outil recommandé :

Google Sheets.

Nom :

`02_TenderPilot_Command_Center`

Onglets :

1. Dashboard
2. Opportunities
3. Pipeline
4. Deadlines
5. Watchlist
6. Settings
7. Sources
8. Logs

## Colonnes principales de l’onglet Opportunities

* Opportunity ID
* Date ajout
* Titre
* Organisation
* Pays
* Région
* Secteur
* Sous-secteur
* Type d’opportunité
* Source
* URL
* PDF
* Date publication
* Deadline
* Heure deadline
* Jours restants
* Budget
* Devise
* Langue
* Responsable
* Score pertinence
* Score éligibilité
* Score readiness
* Critère éliminatoire détecté
* Statut
* Priorité
* Prochaine action
* Date prochaine action
* Documents manquants
* Notes

## Statuts recommandés

* Nouveau
* À lire
* À qualifier
* GO
* NO-GO
* À préparer
* En préparation
* En validation
* Prêt à soumettre
* Soumis
* Gagné
* Perdu
* Expiré
* Archivé

---

# 5. SYSTÈME DE DEADLINES

Créer une colonne :

`Jours restants`

Formule conceptuelle :

Deadline - Date du jour

Créer des règles automatiques.

## Couleurs

Vert :
plus de 15 jours.

Jaune :
8 à 15 jours.

Orange :
3 à 7 jours.

Rouge :
0 à 2 jours.

Gris :
deadline dépassée.

Statut "Soumis" :
ne doit plus être affiché comme urgent.

Créer également :

* J-14 ;
* J-7 ;
* J-3 ;
* J-1 ;
* deadline dépassée.

Ces valeurs pourront ensuite être utilisées pour les notifications Telegram et email.

---

# 6. MODULE 3 — WATCHLIST

Objectif :

Permettre à chaque utilisateur de définir les opportunités réellement pertinentes pour lui.

Créer un onglet :

`Watchlist`

Champs :

## Géographie

* Pays ciblés
* Région
* Opportunités internationales autorisées

## Secteurs

Exemples :

* Agriculture
* Digital
* IT
* Développement web
* Communication
* Formation
* Data
* Monitoring & Evaluation
* Énergie
* Santé
* Education
* Construction
* Logistique

## Type d’opportunité

* Appel d’offres
* Consultation
* AMI
* RFP
* RFQ
* Grant
* Appel à projets
* Consultant individuel
* Cabinet
* Fourniture
* Service

## Paramètres

* Budget minimum
* Budget maximum
* Deadline minimale
* Langue
* Mots-clés positifs
* Mots-clés négatifs

---

# 7. MODULE 4 — MOTEUR DE PERTINENCE

Objectif :

Éviter de lancer l’IA sur toutes les opportunités.

Créer un premier score algorithmique.

Exemple :

Pays correspondant :
20 points.

Secteur correspondant :
30 points.

Type correspondant :
15 points.

Mot-clé important :
20 points.

Deadline supérieure à 7 jours :
10 points.

Budget compatible :
5 points.

TOTAL :
100 points.

Interprétation :

80–100 :
Très pertinent.

60–79 :
À analyser.

40–59 :
Faible priorité.

0–39 :
Ignorer.

L’IA ne doit être appelée automatiquement que lorsque le score dépasse un seuil défini.

---

# 8. MODULE 5 — ORGANIZATION PROFILE

Objectif :

Créer une fiche représentant les capacités réelles de l’organisation.

Nom :

`03_TenderPilot_Organization_Profile.xlsx`

L’utilisateur ne doit remplir ces informations qu’une fois puis les mettre à jour.

## Section 1 — Informations générales

* Nom
* Type d’organisation
* Pays
* Année création
* Adresse
* Site web
* Email
* Téléphone
* RCCM
* IFU
* Statut juridique

## Section 2 — Capacités financières

* CA année N-1
* CA année N-2
* CA année N-3
* Banque
* Capacité de préfinancement
* Audits disponibles

## Section 3 — Expérience

* Secteurs
* Nombre de projets
* Pays d’expérience
* Clients institutionnels
* Clients privés
* Missions similaires

## Section 4 — Ressources humaines

* Nombre employés
* Experts permanents
* Consultants partenaires
* Profils disponibles

## Section 5 — Capacités techniques

* Matériel
* Logiciels
* Certifications
* Outils
* Méthodes

## Section 6 — Documents disponibles

* RCCM
* IFU
* Attestation fiscale
* Attestation sociale
* Relevé bancaire
* États financiers
* Audits
* Certifications
* Documents légaux
* Références
* CV

---

# 9. PROFILS DE CANDIDATS

Créer différentes versions du moteur de qualification.

## ENTREPRISE / PME

Vérifier :

* existence légale ;
* CA ;
* références ;
* fiscalité ;
* personnel ;
* équipements ;
* capacité financière ;
* expériences similaires.

## CABINET

Vérifier :

* expérience du cabinet ;
* experts proposés ;
* diplômes ;
* années d’expérience ;
* missions similaires ;
* expérience pays ;
* méthodologie ;
* disponibilité.

## ONG

Vérifier :

* statut ;
* gouvernance ;
* projets passés ;
* gestion financière ;
* politiques internes ;
* mécanismes de suivi ;
* sauvegarde ;
* genre ;
* MEAL ;
* partenariats.

## CONSULTANT INDIVIDUEL

Vérifier :

* diplôme ;
* spécialité ;
* années d’expérience ;
* références ;
* disponibilité ;
* langues ;
* expérience géographique ;
* CV.

## CONSORTIUM

Vérifier :

* chef de file ;
* partenaires ;
* responsabilités ;
* références combinées ;
* accord de consortium ;
* complémentarité ;
* obligations financières.

---

# 10. MODULE 6 — GO / NO-GO ENGINE

Nom :

`04_TenderPilot_Go_NoGo.xlsx`

Objectif :

Décider rapidement s’il est pertinent de soumissionner.

Créer un tableau :

| Critère | Exigence | Notre capacité | Obligatoire | Résultat | Risque | Action |
| ------- | -------- | -------------- | ----------- | -------- | ------ | ------ |

## Types de critères

* administratif ;
* financier ;
* technique ;
* expérience ;
* équipe ;
* géographie ;
* certification ;
* délai ;
* budget ;
* documents ;
* partenariat ;
* références.

## Règle principale

Les critères éliminatoires doivent être séparés du score général.

Exemple :

Score général :
85/100.

Mais :

Critère éliminatoire manquant :
OUI.

Résultat final :

**NO-GO CONDITIONNEL**

L’utilisateur ne doit jamais croire qu’un score élevé compense une condition obligatoire.

---

# 11. SCORES À CALCULER

## Score 1 — Relevance Score

Mesure :

Est-ce une opportunité intéressante pour nous ?

## Score 2 — Eligibility Score

Mesure :

Sommes-nous éligibles ?

## Score 3 — Readiness Score

Mesure :

Avons-nous les documents et ressources nécessaires maintenant ?

## Score 4 — Strategic Score

Optionnel.

Mesure :

Est-ce intéressant stratégiquement ?

Critères possibles :

* relation client ;
* potentiel long terme ;
* visibilité ;
* marché cible ;
* marge ;
* difficulté ;
* concurrence.

---

# 12. MODULE 7 — DOCUMENT VAULT

Objectif :

Arrêter de chercher les mêmes documents à chaque soumission.

Créer un dossier Google Drive.

Structure :

TenderPilot_Document_Vault/

01_Legal/
02_Fiscal/
03_Financial/
04_References/
05_CV/
06_Certifications/
07_Company_Profile/
08_Previous_Proposals/
09_Templates/
10_Submissions/

Créer un tracker :

`05_TenderPilot_Document_Tracker.xlsx`

Colonnes :

* Document
* Catégorie
* Disponible
* Date émission
* Expiration
* Jours avant expiration
* Lien Drive
* Responsable
* Notes

Créer des alertes pour :

* documents expirés ;
* documents expirant dans 30 jours ;
* documents expirant dans 15 jours ;
* documents manquants.

---

# 13. MODULE 8 — REFERENCE LIBRARY

Nom :

`06_TenderPilot_References.xlsx`

Objectif :

Créer une mémoire des expériences passées.

Colonnes :

* Reference ID
* Projet
* Client
* Pays
* Secteur
* Sous-secteur
* Année
* Date début
* Date fin
* Montant
* Devise
* Rôle
* Description
* Activités
* Résultats
* Technologies
* Personnel mobilisé
* Contact client
* Attestation disponible
* Contrat disponible
* URL preuve
* Notes

Utilisation future :

L’IA pourra sélectionner automatiquement les références les plus pertinentes selon un DAO.

---

# 14. EXPERT DATABASE

Nom :

`07_TenderPilot_Experts.xlsx`

Colonnes :

* Expert ID
* Nom
* Fonction
* Domaine
* Diplôme
* Niveau diplôme
* Années expérience
* Pays d’expérience
* Secteurs
* Langues
* Missions similaires
* Employé permanent
* Consultant externe
* Disponibilité
* TJM
* CV
* Diplôme disponible
* Certificats
* Notes

Objectif :

Comparer automatiquement les exigences d’un DAO aux profils disponibles.

---

# 15. ANALYSE AUTOMATIQUE D’UNE OPPORTUNITÉ

Créer ensuite un module :

`Tender Analyzer`

Entrées possibles :

* PDF ;
* URL ;
* texte ;
* email ;
* fichier Word.

Sortie structurée :

## Identification

* titre ;
* organisation ;
* pays ;
* référence ;
* source ;
* publication ;
* deadline.

## Nature

* type ;
* secteur ;
* durée ;
* lieu ;
* budget.

## Conditions

* critères éligibilité ;
* critères obligatoires ;
* critères éliminatoires ;
* références demandées ;
* CA minimum ;
* certifications.

## Equipe

* experts demandés ;
* diplômes ;
* années expérience ;
* langues ;
* compétences.

## Documents

* documents administratifs ;
* documents techniques ;
* formulaires ;
* annexes ;
* signatures.

## Soumission

* plateforme ;
* email ;
* adresse ;
* nombre d’exemplaires ;
* format ;
* taille fichier ;
* heure limite.

## Evaluation

* critères ;
* pondération ;
* technique ;
* financier ;
* minimum technique.

## Risques

* ambiguïtés ;
* contraintes ;
* éléments manquants ;
* points à clarifier.

---

# 16. COMPLIANCE MATRIX

Nom :

`08_TenderPilot_Compliance_Matrix.xlsx`

Colonnes :

* Requirement ID
* Exigence
* Source
* Page
* Section
* Obligatoire
* Type
* Réponse prévue
* Document preuve
* Responsable
* Statut
* Commentaire

Statuts :

* Non traité
* En cours
* Disponible
* À corriger
* Manquant
* Validé

Objectif :

Aucune exigence du DAO ne doit être oubliée.

---

# 17. TECHNICAL PROPOSAL TOOLKIT

Créer plusieurs templates Word.

Dossier :

`09_Technical_Proposal_Templates`

## Template Cabinet

Sections :

1. Page de garde
2. Lettre de soumission
3. Compréhension de la mission
4. Approche méthodologique
5. Plan de travail
6. Organisation
7. Equipe
8. CV
9. Expériences similaires
10. Chronogramme
11. Annexes

## Template Consultant individuel

1. Lettre
2. Compréhension
3. Approche
4. Méthodologie
5. Planning
6. Expérience
7. CV
8. Offre financière

## Template ONG

1. Contexte
2. Problématique
3. Objectifs
4. Théorie du changement
5. Méthodologie
6. Activités
7. Bénéficiaires
8. Résultats
9. Indicateurs
10. MEAL
11. Risques
12. Durabilité
13. Gouvernance
14. Budget narratif

## Template Fourniture

1. Lettre
2. Présentation entreprise
3. Conformité technique
4. Tableau spécifications
5. Livraison
6. Garantie
7. SAV
8. Expérience
9. Documents
10. Offre financière

## Template Consortium

Inclure :

* composition ;
* rôles ;
* chef de file ;
* méthodologie commune ;
* capacités combinées ;
* gouvernance ;
* communication ;
* accord de consortium.

---

# 18. FINANCIAL PROPOSAL TOOLKIT

Dossier :

`10_Financial_Proposal_Templates`

Créer plusieurs modèles Excel.

## Modèle 1 — Consultant individuel

* honoraires ;
* nombre jours ;
* TJM ;
* déplacement ;
* hébergement ;
* per diem ;
* autres frais ;
* taxes ;
* total.

## Modèle 2 — Cabinet

* expert ;
* fonction ;
* jours ;
* TJM ;
* honoraires ;
* logistique ;
* déplacements ;
* atelier ;
* frais administratifs ;
* taxes ;
* total.

## Modèle 3 — Projet ONG

* personnel ;
* activités ;
* logistique ;
* transport ;
* communication ;
* équipement ;
* suivi-évaluation ;
* overhead ;
* taxes.

## Modèle 4 — Fourniture

* article ;
* quantité ;
* prix unitaire ;
* total ;
* livraison ;
* installation ;
* maintenance ;
* taxes ;
* total TTC.

---

# 19. PROPOSAL BUILDER

Objectif :

Aider l’utilisateur à construire son offre à partir du DAO.

Workflow :

DAO
↓
Analyse
↓
Compliance Matrix
↓
Structure recommandée
↓
Sections à rédiger
↓
Références pertinentes
↓
Experts pertinents
↓
Documents
↓
Offre complète

L’IA ne doit jamais inventer :

* références ;
* expériences ;
* chiffres ;
* certifications ;
* collaborateurs ;
* documents.

Toute information générée doit provenir :

* du DAO ;
* du profil organisation ;
* de la base références ;
* de la base experts.

---

# 20. AI WORKFLOW

Créer une bibliothèque dédiée.

Nom :

`11_TenderPilot_AI_Playbook.pdf`

Ne pas simplement fournir des prompts.

Enseigner un processus.

## Workflow 1 — Comprendre le DAO

Entrée :
DAO.

Sortie :
résumé structuré.

## Workflow 2 — Extraire les exigences

Sortie :
Compliance Matrix.

## Workflow 3 — Vérifier l’éligibilité

Entrées :

* exigences ;
* organisation profile.

Sortie :

* critères satisfaits ;
* gaps ;
* critères éliminatoires.

## Workflow 4 — Construire la structure

L’IA doit aligner le plan de l’offre avec les critères d’évaluation.

## Workflow 5 — Rédiger

Une section à la fois.

## Workflow 6 — Challenger

Demander à l’IA d’agir comme évaluateur.

## Workflow 7 — Vérifier

Comparer l’offre finale aux exigences.

---

# 21. RÈGLES D’UTILISATION DE L’IA

Inclure une page importante :

## L’IA peut

* résumer ;
* extraire ;
* reformuler ;
* comparer ;
* structurer ;
* vérifier ;
* proposer ;
* identifier des incohérences.

## L’IA ne doit pas

* inventer des expériences ;
* inventer des experts ;
* inventer des chiffres ;
* inventer des références ;
* décider seule d’un GO ;
* modifier des exigences ;
* masquer un critère éliminatoire ;
* générer des documents officiels frauduleux.

---

# 22. AUTOMATISATION GOOGLE APPS SCRIPT

Nom du module :

`12_TenderPilot_Automation`

Fonctions prévues :

## Fonction 1 — Installer

Créer un menu :

TenderPilot

Options :

* Actualiser les opportunités
* Ajouter une opportunité
* Analyser
* Vérifier les deadlines
* Envoyer rappels
* Synchroniser
* Paramètres

## Fonction 2 — Deadlines

Chaque jour :

* identifier J-14 ;
* J-7 ;
* J-3 ;
* J-1 ;
* expiré.

## Fonction 3 — Gmail

Lire les alertes correspondant aux labels configurés.

Exemple label :

`TenderPilot`

Tout email classé dans ce label peut être analysé.

## Fonction 4 — Sources simples

Utiliser les URLs configurées par l’utilisateur.

## Fonction 5 — Synchronisation

Mettre à jour le Sheet.

## Fonction 6 — IA

Envoyer certaines données à l’API configurée.

---

# 23. PARAMÈTRES IA

Créer un onglet :

`AI_Settings`

Champs :

* Provider
* API Key
* Model
* Temperature
* Max tokens
* Language

Providers prévus :

* Mistral
* Gemini
* OpenAI
* Claude

Le produit ne doit pas dépendre d’un fournisseur particulier.

---

# 24. PYTHON ADVANCED COLLECTOR

Cette partie sera optionnelle.

Dossier :

`13_Advanced_Collector`

Architecture :

Python
↓
Sources
↓
Parser
↓
Normalisation
↓
Déduplication
↓
Scoring
↓
PostgreSQL
↓
Sheet
↓
Telegram

Bibliothèques potentielles :

* requests
* BeautifulSoup
* feedparser
* pandas
* pdfplumber
* PyMuPDF
* psycopg
* supabase client
* python-telegram-bot

Utiliser Playwright uniquement lorsque nécessaire et autorisé.

---

# 25. DATABASE

Pour la version avancée :

PostgreSQL.

Tables :

## opportunities

* id
* source_id
* title
* organization
* country
* sector
* type
* publication_date
* deadline
* budget
* currency
* url
* pdf_url
* description
* created_at

## sources

* id
* name
* url
* parser
* active
* last_checked

## users/configs

Si installation individuelle :

pas forcément nécessaire.

Chaque utilisateur peut avoir sa propre configuration.

## notifications

* opportunity_id
* type
* sent_at
* channel

---

# 26. TELEGRAM BOT

Nom possible :

TenderPilot Alerts.

Fonctions :

`/start`

Configurer le bot.

`/today`

Afficher les opportunités du jour.

`/deadlines`

Afficher les deadlines.

`/search`

Chercher une opportunité.

`/status`

Afficher le pipeline.

Notifications :

## Nouvelle opportunité

Titre
Organisation
Pays
Deadline
Score
Lien

## J-7

Deadline proche.

## J-3

Urgence.

## J-1

Alerte critique.

## Document expirant

Alerte administrative.

---

# 27. EXEMPLE DE NOTIFICATION

🔥 NOUVELLE OPPORTUNITÉ

Mission :
Développement d’une plateforme digitale

Organisation :
XYZ

Pays :
Bénin

Deadline :
15 septembre

Match :
89 %

Eligibility :
À vérifier

Temps restant :
18 jours

Actions :

[Voir]
[Analyser]
[Ajouter au pipeline]
[Ignorer]

---

# 28. INSTALLATION PAR LE CLIENT

Créer un guide :

`14_Installation_Guide.pdf`

## Étape 1

Copier le Google Sheet.

## Étape 2

Remplir Settings.

## Étape 3

Choisir pays.

## Étape 4

Choisir secteurs.

## Étape 5

Importer sources.

## Étape 6

Créer Organization Profile.

## Étape 7

Ajouter références.

## Étape 8

Ajouter experts.

## Étape 9

Créer dossier Drive.

## Étape 10

Installer Apps Script.

## Étape 11

Autoriser Google.

## Étape 12

Créer éventuellement une clé IA.

## Étape 13

Tester une opportunité.

## Étape 14

Activer notifications.

---

# 29. MINI-FORMATION

Créer des vidéos courtes.

## Vidéo 1

Découvrir TenderPilot.

## Vidéo 2

Configurer le Command Center.

## Vidéo 3

Configurer ses sources.

## Vidéo 4

Activer les automatisations.

## Vidéo 5

Analyser un DAO.

## Vidéo 6

Faire un Go / No-Go.

## Vidéo 7

Utiliser le Compliance Matrix.

## Vidéo 8

Préparer l’offre technique.

## Vidéo 9

Préparer l’offre financière.

## Vidéo 10

Utiliser l’IA correctement.

## Vidéo 11

Contrôle avant soumission.

## Vidéo 12

Capitaliser après la soumission.

---

# 30. DOSSIER FINAL DU PRODUIT

Structure recommandée :

TenderPilot_Toolkit/

00_START_HERE/

01_SOURCES/

02_COMMAND_CENTER/

03_ORGANIZATION_PROFILE/

04_GO_NO_GO/

05_DOCUMENT_VAULT/

06_REFERENCES/

07_EXPERTS/

08_COMPLIANCE/

09_TECHNICAL_PROPOSALS/

10_FINANCIAL_PROPOSALS/

11_AI_PLAYBOOK/

12_AUTOMATION/

13_ADVANCED_COLLECTOR/

14_INSTALLATION/

15_TRAINING/

16_BONUS/

---

# 31. BONUS À AJOUTER

## Bonus 1

Checklist avant soumission.

## Bonus 2

Checklist 48 heures.

## Bonus 3

Checklist 24 heures.

## Bonus 4

Modèles d’emails.

* demande clarification ;
* soumission ;
* accusé réception ;
* relance ;
* demande résultat.

## Bonus 5

Naming convention.

Exemple :

`2026_UNDP_BENIN_Digitalisation_Technical.pdf`

## Bonus 6

Bid / No-Bid worksheet.

## Bonus 7

Lessons Learned.

Après chaque soumission :

* gagné ;
* perdu ;
* score ;
* retour client ;
* erreurs ;
* amélioration.

---

# 32. DASHBOARD

Le Dashboard doit afficher :

* Opportunités actives
* Nouvelles cette semaine
* Deadlines < 7 jours
* GO
* NO-GO
* Offres en préparation
* Soumises
* Gagnées
* Perdues
* Win Rate

Ajouter :

Top secteurs.

Top pays.

Top sources.

Taux de conversion.

---

# 33. ROADMAP DE CRÉATION

## PHASE 1 — MVP

Créer :

1. fichier Sources ;
2. Command Center ;
3. Deadline system ;
4. Watchlist ;
5. Organization Profile ;
6. Go/No-Go ;
7. Compliance Matrix ;
8. templates offres ;
9. AI Playbook ;
10. guide d’installation.

Ce produit est déjà vendable.

## PHASE 2 — AUTOMATION

Ajouter :

11. Apps Script ;
12. Gmail Collector ;
13. rappels ;
14. Telegram.

## PHASE 3 — ADVANCED

Ajouter :

15. Python Collector ;
16. PostgreSQL ;
17. scraping multi-source ;
18. PDF processing ;
19. IA structurée ;
20. matching automatique.

---

# 34. ORDRE DE DÉVELOPPEMENT RECOMMANDÉ

Ne pas commencer par Python.

Créer dans cet ordre :

## 1

Sources Excel.

## 2

Google Command Center.

## 3

Organization Profile.

## 4

Go / No-Go.

## 5

Compliance Matrix.

## 6

Templates.

## 7

AI Playbook.

## 8

Apps Script deadlines.

## 9

Apps Script Gmail.

## 10

Telegram.

## 11

Python uniquement après.

Cette approche garantit que le produit reste fonctionnel même si l’automatisation avancée tombe en panne.

---

# 35. PROMPTS À CRÉER ENSUITE

Nous créerons séparément les prompts suivants.

## Prompt A

Créer le fichier Excel Sources.

## Prompt B

Créer le Google Sheet Command Center.

## Prompt C

Créer Organization Profile.

## Prompt D

Créer Go / No-Go Engine.

## Prompt E

Créer Compliance Matrix.

## Prompt F

Créer Reference Database.

## Prompt G

Créer Expert Database.

## Prompt H

Créer les templates techniques.

## Prompt I

Créer les templates financiers.

## Prompt J

Créer AI Playbook.

## Prompt K

Coder Apps Script.

## Prompt L

Coder Telegram Bot.

## Prompt M

Coder Python Collector.

## Prompt N

Créer PostgreSQL schema.

## Prompt O

Créer moteur de scoring.

## Prompt P

Créer analyseur IA.

## Prompt Q

Créer guide utilisateur.

## Prompt R

Créer mini-formation.

Ces prompts doivent être créés séparément afin qu’ils puissent être utilisés dans Claude Code, Codex, Cursor, Gemini, ChatGPT ou un autre agent de développement.

---

# 36. CRITÈRES DE QUALITÉ AVANT LANCEMENT

Le produit n’est pas prêt tant que :

* les liens principaux ne sont pas vérifiés ;
* les formules fonctionnent ;
* les deadlines fonctionnent ;
* les couleurs fonctionnent ;
* les scores sont compréhensibles ;
* les templates sont éditables ;
* les exemples sont réalistes ;
* les instructions sont simples ;
* l’installation est testée sur un compte vierge ;
* aucune API payante n’est obligatoire ;
* le produit fonctionne sans Python ;
* le produit fonctionne sans Telegram ;
* le produit fonctionne sans IA ;
* chaque couche avancée apporte uniquement plus de confort.

---

# 37. PRINCIPE PRODUIT

TenderPilot doit respecter une règle :

**le système manuel doit toujours fonctionner.**

L’automatisation accélère.

L’IA aide.

Telegram rappelle.

Python collecte.

Mais aucun de ces outils ne doit être indispensable à l’utilisation de base.

Cela réduit :

* le support ;
* les bugs ;
* les coûts ;
* la dépendance technique ;
* les risques liés aux APIs.

---

# 38. EXPERIENCE UTILISATEUR IDÉALE

L’utilisateur achète.

Il ouvre :

`START_HERE`

Il suit :

1. Copier le Command Center.
2. Sélectionner ses secteurs.
3. Sélectionner ses pays.
4. Importer ses sources.
5. Créer son profil.
6. Ajouter ses références.
7. Ajouter ses experts.
8. Activer l’automatisation.
9. Ajouter une première opportunité.
10. Analyser.
11. Faire GO / NO-GO.
12. Construire l’offre.
13. Vérifier.
14. Soumettre.

L’utilisateur doit comprendre le produit en moins de 10 minutes.

---

# 39. PROMESSE FINALE DU PRODUIT

TenderPilot ne promet pas de gagner tous les appels d’offres.

TenderPilot promet d’aider l’utilisateur à :

* détecter plus efficacement ;
* perdre moins d’opportunités ;
* éviter les deadlines oubliées ;
* décider plus rapidement ;
* mieux organiser ses documents ;
* réduire les omissions ;
* préparer les offres plus vite ;
* mieux exploiter l’IA ;
* capitaliser sur son expérience ;
* construire progressivement un véritable processus de réponse aux opportunités.

---

# 40. FORMULE DU PRODUIT

**SOURCES**

*

**COMMAND CENTER**

*

**QUALIFICATION**

*

**DOCUMENT MANAGEMENT**

*

**PROPOSAL TOOLKIT**

*

**AI PLAYBOOK**

*

**AUTOMATION**

=

# TENDERPILOT TOOLKIT

Un système complet pour passer de :

**“J’ai trouvé une opportunité”**

à :

**“Notre soumission est prête, vérifiée et suivie.”**
