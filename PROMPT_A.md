# PROMPT A — CRÉER LE FICHIER SOURCES TENDERPILOT

Tu dois créer un fichier tableur professionnel nommé :

`TenderPilot_Sources.xlsx`

Ce fichier fait partie d’un produit appelé **TenderPilot Toolkit**.

TenderPilot n’est pas un SaaS. C’est une boîte à outils opérationnelle destinée aux entreprises, ONG, cabinets, consultants et consortiums qui souhaitent trouver, organiser, qualifier et suivre des opportunités telles que :

* appels d’offres ;
* consultations ;
* appels à manifestation d’intérêt ;
* demandes de cotation ;
* appels à projets ;
* subventions ;
* grants ;
* missions de consultance ;
* opportunités institutionnelles ;
* opportunités de développement.

Le fichier `TenderPilot_Sources.xlsx` doit servir de base de veille structurée.

L’objectif n’est pas simplement de créer une liste de liens.

Le fichier doit permettre à l’utilisateur de :

* savoir où chercher ;
* filtrer les plateformes selon ses besoins ;
* identifier les sources adaptées à son pays ;
* identifier les sources adaptées à son secteur ;
* savoir si une inscription est nécessaire ;
* savoir si des alertes email sont disponibles ;
* savoir si la source propose un flux RSS, une API ou une page publique exploitable ;
* savoir si des PDF sont généralement disponibles ;
* identifier les plateformes payantes ;
* créer sa propre sélection de sources ;
* suivre les sources qui doivent être vérifiées ;
* préparer les sources pour une future automatisation.

---

# 1. STRUCTURE DU FICHIER

Créer les onglets suivants dans cet ordre :

1. `START_HERE`
2. `ALL_SOURCES`
3. `PUBLIC_TENDERS`
4. `CONSULTANCIES`
5. `GRANTS`
6. `CALLS_FOR_PROJECTS`
7. `INTERNATIONAL_ORGS`
8. `WEST_AFRICA`
9. `BY_COUNTRY`
10. `MY_SOURCES`
11. `AUTOMATION_READY`
12. `TO_VERIFY`
13. `SOURCE_TYPES`
14. `COUNTRIES`
15. `SECTORS`

Tous les onglets doivent être professionnels, lisibles et immédiatement exploitables.

---

# 2. ONGLET START_HERE

Créer une page d’introduction claire et propre.

Le contenu doit expliquer :

## Titre

`TenderPilot — Sources & Opportunity Watchlist`

## Sous-titre

`Base de sources pour identifier, organiser et automatiser la veille d’opportunités.`

Ajouter une section :

### À quoi sert ce fichier ?

Expliquer en quelques lignes que le fichier permet de centraliser les plateformes où rechercher des opportunités et de préparer les sources qui pourront ensuite être utilisées dans le TenderPilot Command Center et les automatisations.

Ajouter une section :

### Comment l’utiliser ?

Présenter les étapes suivantes :

1. Parcourir `ALL_SOURCES`.
2. Filtrer selon les pays, secteurs et types d’opportunités.
3. Ajouter les sources intéressantes dans `MY_SOURCES`.
4. Vérifier les sources compatibles avec l’automatisation dans `AUTOMATION_READY`.
5. Vérifier régulièrement les sources présentes dans `TO_VERIFY`.
6. Mettre à jour les dates de dernière vérification.

Ajouter une section :

### Légende

Créer une légende visuelle pour :

* Source active
* Source à vérifier
* Source inactive
* Inscription obligatoire
* Source payante
* Automatisation possible
* Alerte email disponible
* RSS disponible
* API disponible

---

# 3. ONGLET ALL_SOURCES

C’est l’onglet principal.

Créer les colonnes suivantes dans cet ordre :

1. `Source_ID`
2. `Source_Name`
3. `Organization`
4. `Main_URL`
5. `Opportunity_Page_URL`
6. `Country`
7. `Region`
8. `Coverage`
9. `Opportunity_Type`
10. `Main_Sectors`
11. `Languages`
12. `Registration_Required`
13. `Free_or_Paid`
14. `Email_Alerts`
15. `RSS_Available`
16. `API_Available`
17. `Public_HTML_Page`
18. `PDF_Available`
19. `Login_Required_For_Details`
20. `Update_Frequency`
21. `Automation_Level`
22. `Automation_Method`
23. `Priority`
24. `Last_Checked`
25. `Link_Status`
26. `Last_Opportunity_Observed`
27. `Notes`
28. `Recommended_For`
29. `Added_By`
30. `Date_Added`

---

# 4. RÈGLES POUR LES COLONNES

## Source_ID

Créer un identifiant unique.

Format recommandé :

`SRC-0001`

`SRC-0002`

etc.

---

## Coverage

Valeurs autorisées :

* National
* Regional
* Africa
* International
* Multi-country

---

## Opportunity_Type

Créer une liste déroulante avec :

* Public Tender
* Private Tender
* Consultancy
* Expression of Interest
* Request for Proposal
* Request for Quotation
* Grant
* Call for Projects
* Funding
* Procurement
* Framework Agreement
* Individual Consultant
* Firm / Cabinet
* NGO Opportunity
* Other

---

## Registration_Required

Liste déroulante :

* Yes
* No
* Optional
* Unknown

---

## Free_or_Paid

Liste déroulante :

* Free
* Freemium
* Paid
* Unknown

---

## Email_Alerts

Valeurs :

* Yes
* No
* Unknown

---

## RSS_Available

Valeurs :

* Yes
* No
* Unknown

---

## API_Available

Valeurs :

* Yes
* No
* Unknown

---

## Public_HTML_Page

Valeurs :

* Yes
* No
* Partial
* Unknown

---

## PDF_Available

Valeurs :

* Usually
* Sometimes
* Rarely
* No
* Unknown

---

## Update_Frequency

Valeurs :

* Daily
* Several times per week
* Weekly
* Irregular
* Monthly
* Unknown

---

# 5. AUTOMATION LEVEL

La colonne `Automation_Level` doit indiquer la facilité avec laquelle la source peut être intégrée dans une automatisation.

Créer les niveaux :

### LEVEL 0 — MANUAL ONLY

Cas :

* login complexe ;
* captcha ;
* plateforme fermée ;
* scraping interdit ;
* contenu non accessible publiquement.

### LEVEL 1 — EMAIL

La plateforme propose des alertes email qui peuvent être récupérées via Gmail.

### LEVEL 2 — RSS

La source propose un flux RSS ou Atom.

### LEVEL 3 — PUBLIC HTML

Les opportunités sont disponibles sur une page HTML publique relativement simple.

### LEVEL 4 — API

Une API officielle ou endpoint JSON/documenté est disponible.

### LEVEL 5 — HIGHLY AUTOMATABLE

La source combine :

* page publique ;
* URLs stables ;
* données structurées ;
* RSS ou API ;
* liens PDF accessibles.

Créer une liste déroulante correspondante.

---

# 6. AUTOMATION METHOD

Créer des valeurs possibles :

* Manual
* Gmail Alert
* RSS / Atom
* Public HTML Parsing
* Official API
* JSON Endpoint
* PDF Feed
* CSV Export
* Sitemap
* Other
* Unknown

---

# 7. PRIORITY

Créer les niveaux :

* High
* Medium
* Low

La priorité doit représenter la valeur générale de la source.

Critères possibles :

* nombre d’opportunités ;
* pertinence Afrique ;
* régularité ;
* qualité ;
* accessibilité ;
* gratuité ;
* fiabilité.

---

# 8. LINK STATUS

Créer une liste :

* Active
* Redirect
* Temporarily Unavailable
* Broken
* Requires Verification
* Inactive

Utiliser une mise en forme conditionnelle :

Active :
vert.

Requires Verification :
orange.

Broken :
rouge.

Inactive :
gris.

---

# 9. ONGLET PUBLIC_TENDERS

Créer une vue filtrée ou une copie dynamique des sources dont le type est principalement lié aux marchés publics :

* Public Tender
* Procurement
* RFQ
* RFP
* Framework Agreement
* Expression of Interest

Conserver au minimum :

* Source
* Organisation
* URL
* Pays
* Région
* Types
* Secteurs
* Gratuit / Payant
* Alertes
* Automation Level
* Priority
* Status

---

# 10. ONGLET CONSULTANCIES

Regrouper les sources proposant principalement :

* consultant individuel ;
* cabinet ;
* expertise ;
* étude ;
* assistance technique ;
* recrutement consultants.

Colonnes principales :

* Source
* Organisation
* URL
* Pays
* Coverage
* Type
* Secteurs
* Individual / Firm
* Alerts
* Automation
* Status

---

# 11. ONGLET GRANTS

Regrouper :

* grants ;
* funding ;
* subventions ;
* fonds ;
* programmes de financement.

Ajouter une colonne :

`Typical_Applicant`

Valeurs possibles :

* NGO
* Company
* Startup
* Researcher
* Institution
* Consortium
* Individual
* Mixed

---

# 12. ONGLET CALLS_FOR_PROJECTS

Regrouper :

* appels à projets ;
* challenges ;
* incubateurs institutionnels ;
* concours ;
* programmes ;
* initiatives de développement.

Ajouter :

* Applicant Type
* Geographic Eligibility
* Typical Funding
* Application Mode

---

# 13. ONGLET INTERNATIONAL_ORGS

Inclure uniquement les principales organisations internationales et bailleurs.

Prévoir des catégories telles que :

* Nations Unies
* Banque mondiale
* Banque africaine de développement
* Union européenne
* GIZ
* AFD
* USAID
* FCDO
* agences de coopération
* banques de développement
* grandes ONG internationales

Créer une colonne :

`Organization_Type`

Valeurs :

* UN Agency
* Development Bank
* Bilateral Donor
* Multilateral Donor
* International NGO
* Foundation
* Government Agency
* Other

---

# 14. ONGLET WEST_AFRICA

Créer une vue regroupant prioritairement les opportunités et plateformes couvrant :

* Bénin
* Togo
* Côte d’Ivoire
* Sénégal
* Burkina Faso
* Niger
* Mali
* Guinée
* Ghana
* Nigeria
* Sierra Leone
* Liberia
* Gambie
* Cap-Vert
* Mauritanie

Inclure également :

* CEDEAO / ECOWAS
* UEMOA
* BOAD
* institutions régionales pertinentes.

---

# 15. ONGLET BY_COUNTRY

Créer une table de synthèse avec :

* Country
* Number_of_Sources
* Public_Tenders
* Consultancies
* Grants
* Calls_for_Projects
* Highly_Automatable
* Main_National_Portal
* Notes

Ce tableau doit permettre de voir rapidement où la couverture est faible.

---

# 16. ONGLET MY_SOURCES

Cet onglet est destiné à l’utilisateur final.

Colonnes :

* Enabled
* Source_ID
* Source_Name
* Country
* Opportunity_Type
* Sector
* Priority
* Frequency
* Monitoring_Method
* Email_Used
* Alert_Configured
* Automation_Enabled
* Notes

Créer `Enabled` sous forme de case à cocher si possible.

Même chose pour :

* Alert_Configured
* Automation_Enabled

L’utilisateur doit pouvoir choisir uniquement les sources qu’il souhaite réellement surveiller.

---

# 17. ONGLET AUTOMATION_READY

Créer une vue des sources pour lesquelles `Automation_Level` est supérieur ou égal à LEVEL 1.

Ajouter les colonnes :

* Source_ID
* Source_Name
* URL
* Automation_Level
* Automation_Method
* RSS_URL
* API_URL
* HTML_Opportunity_Page
* Email_Alert_Link
* Requires_Login
* Parsing_Notes
* Recommended_Check_Frequency
* Test_Status
* Last_Test
* Technical_Notes

Créer les statuts de test :

* Not Tested
* Working
* Partial
* Failed
* Requires Manual Review

---

# 18. ONGLET TO_VERIFY

Toutes les sources qui ont :

* un lien cassé ;
* un statut inconnu ;
* plus de 90 jours depuis la dernière vérification ;
* des informations incomplètes ;
* un changement de domaine ;
* une automatisation non testée.

Colonnes :

* Source_ID
* Source_Name
* URL
* Issue
* Last_Checked
* Verification_Priority
* Assigned_To
* Verification_Result
* Notes

---

# 19. ONGLET SOURCE_TYPES

Créer une table de référence expliquant les différents types d’opportunités.

Colonnes :

* Opportunity_Type
* Definition
* Typical_Applicant
* Typical_Document
* Notes

Expliquer brièvement :

* Tender
* RFP
* RFQ
* EOI
* Consultancy
* Grant
* Call for Projects
* Framework Agreement
* Procurement
* Funding

---

# 20. ONGLET COUNTRIES

Créer une table :

* Country
* ISO_Code
* Region
* Currency
* Main_Language
* Procurement_Portal
* Notes

Prioriser l’Afrique.

Inclure au minimum tous les pays d’Afrique de l’Ouest.

---

# 21. ONGLET SECTORS

Créer une taxonomie structurée.

Secteurs recommandés :

* Agriculture
* Agribusiness
* Livestock
* Fisheries
* Environment
* Climate
* Energy
* Renewable Energy
* Water
* Sanitation
* Health
* Education
* Digital
* ICT
* Software
* Data
* AI
* Communication
* Media
* Monitoring & Evaluation
* Research
* Consulting
* Infrastructure
* Construction
* Transport
* Logistics
* Finance
* Governance
* Gender
* Youth
* Employment
* Entrepreneurship
* Private Sector Development
* Humanitarian
* Social Protection
* Tourism
* Culture
* Procurement
* Training
* Capacity Building
* Other

Créer :

* Sector_ID
* Sector_Name
* Parent_Sector
* Keywords
* Notes

---

# 22. QUALITÉ DES DONNÉES

Ne jamais inventer une plateforme.

Ne jamais inventer une URL.

Ne jamais considérer une URL comme active sans vérification.

Pour chaque source ajoutée :

1. vérifier que le domaine existe ;
2. vérifier que la page d’opportunités est accessible ;
3. vérifier qu’elle contient réellement des opportunités pertinentes ;
4. identifier le type d’accès ;
5. identifier si une inscription est requise ;
6. identifier si l’utilisateur peut configurer des alertes ;
7. identifier si une automatisation semble possible.

Si une information ne peut pas être confirmée :

utiliser `Unknown`.

Ne jamais remplir une donnée incertaine comme si elle était certaine.

---

# 23. DONNÉES À PRIORISER

Prioriser les sources pertinentes pour :

## Afrique

et en particulier :

* Bénin
* Togo
* Côte d’Ivoire
* Sénégal
* Burkina Faso
* Ghana
* Nigeria

Puis ajouter les plateformes internationales pertinentes.

---

# 24. SOURCES INSTITUTIONNELLES À RECHERCHER

Rechercher notamment les portails officiels et opportunités des organisations suivantes lorsque disponibles :

* UNDP
* UNICEF
* UNOPS
* FAO
* WFP
* WHO
* UNESCO
* UN Women
* UNFPA
* World Bank
* African Development Bank
* European Union
* GIZ
* AFD
* USAID
* Millennium Challenge Corporation
* ECOWAS
* UEMOA
* BOAD

Ne pas supposer que chaque organisation utilise un portail séparé.

Vérifier les pages réellement actives.

---

# 25. DESIGN

Le fichier doit avoir un aspect professionnel.

Utiliser :

* en-têtes visibles ;
* filtres ;
* volets figés ;
* largeur de colonnes adaptée ;
* wrap text ;
* couleurs sobres ;
* bordures légères ;
* listes déroulantes ;
* mise en forme conditionnelle.

Ne pas utiliser de couleurs excessives.

Le fichier doit rester lisible sur écran portable.

---

# 26. TABLEAUX

Transformer les principales listes en tableaux structurés lorsque le format le permet.

Activer les filtres.

Figer :

* première ligne ;
* premières colonnes utiles.

---

# 27. DONNÉES D’EXEMPLE

Ajouter quelques lignes d’exemple si nécessaire pour montrer le fonctionnement.

Les exemples doivent être clairement identifiés comme :

`DEMO`

et ne doivent pas être confondus avec des sources vérifiées.

Si des données réelles sont ajoutées, ne pas les marquer comme DEMO.

---

# 28. README INTERNE

Ajouter dans `START_HERE` une petite section :

## Maintenance recommandée

* Vérifier les liens au moins tous les 60 à 90 jours.
* Ajouter la date de dernière vérification.
* Ne jamais supprimer immédiatement une source cassée.
* La déplacer d’abord vers `TO_VERIFY`.
* Conserver l’historique des modifications importantes.

---

# 29. PRÉPARATION À L’AUTOMATISATION

Le fichier doit être conçu pour être utilisé plus tard par :

* Google Apps Script ;
* Python ;
* PostgreSQL ;
* Telegram Bot ;
* IA.

Pour cette raison :

* utiliser des noms de colonnes stables ;
* éviter les colonnes fusionnées dans les tables de données ;
* utiliser des identifiants uniques ;
* éviter les informations importantes stockées uniquement dans les couleurs ;
* privilégier des valeurs explicites.

---

# 30. LIVRABLE FINAL

Créer un fichier final :

`TenderPilot_Sources.xlsx`

Le fichier doit contenir :

* tous les onglets demandés ;
* listes déroulantes ;
* filtres ;
* règles conditionnelles ;
* formules nécessaires ;
* structure compatible avec automatisation ;
* données vérifiées lorsque possible ;
* documentation intégrée.

Avant livraison, vérifier :

* aucun lien cassé volontairement laissé comme actif ;
* pas de doublons évidents ;
* pas de plateforme inventée ;
* pas de cellule obligatoire oubliée dans les modèles ;
* noms d’onglets corrects ;
* cohérence des valeurs ;
* lisibilité générale.

Le fichier doit pouvoir être utilisé immédiatement comme premier module de TenderPilot Toolkit.
