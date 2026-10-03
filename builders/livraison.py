"""TenderPilot - archive de livraison du produit classeur.

    python builders/livraison.py

Produit un ZIP unique, pret a etre envoye a un acheteur. Il ne contient que
le produit CLASSEUR : le guide de l'application web est un autre produit, et
le glisser dans la meme archive ferait douter de ce qui a ete achete.

L'archive est reconstruite a chaque build. On ne la modifie jamais a la
main : ce qu'elle contient vient forcement de dist/TenderPilot.
"""

import csv
import pathlib
import sys
import zipfile

RACINE = pathlib.Path(__file__).resolve().parent.parent
LIVRABLE = RACINE / "dist" / "TenderPilot"

# Les deux archives vivent dans deux DOSSIERS separes, pas cote a cote.
#
# Un jour de rush, on choisit une piece jointe dans une liste triee par nom :
# "_CLIENT" et "_OPERATEUR" ne different que de quelques lettres, et le
# dossier operateur contient le guide qui explique comment fabriquer le
# produit. Le nom du dossier fait le travail que le nom du fichier ne fait
# pas.
VENTE = RACINE / "dist" / "A_VENDRE"
PRIVE = RACINE / "dist" / "PRIVE_NE_PAS_ENVOYER"

# Marqueur depose dans le dossier prive : visible sans ouvrir quoi que ce soit.
AVERTISSEMENT = """CE DOSSIER NE SORT JAMAIS D'ICI.

L'archive qu'il contient inclut le guide operateur, qui explique
comment fabriquer le produit et en tirer un lien de vente.

Ce que vous envoyez a un client est dans :

    dist/A_VENDRE/

Si vous hesitez entre deux fichiers, prenez celui de A_VENDRE.
"""

# Deux archives, deux publics - et deux contenus qui n'ont rien en commun.
#
# Le CLIENT ne recoit ni les fichiers de script, ni le classeur, ni la
# methode manuelle. Rien qu'un lien et deux PDF. C'est ce qui protege le
# produit : sans les fichiers, on ne peut ni le revendre ni le
# redistribuer. En contrepartie, un echec d'installation revient a
# l'operateur - le guide client le dit clairement.
#
# L'OPERATEUR recoit tout : les guides de preparation, les fichiers de
# script pour fabriquer son maitre, et une copie exacte de ce que le client
# lit, pour savoir de quoi celui-ci parle quand il appelle.
# Ce que l'ACHETEUR recoit : le guide de demarrage, et rien d'autre.
#
# LE CATALOGUE DES SOURCES N'Y EST PLUS. Il liste les cent quinze sources
# surveillees, une par une - c'est-a-dire le travail qui fait la valeur du
# produit, offert avant meme l'achat. Un concurrent n'a plus qu'a le lire.
# Il reste genere, et reste dans l'archive de l'operateur : rien n'empeche
# de l'envoyer a un client qui le demande APRES la vente.
GUIDES_CLIENT = [
    "1_Guide_Demarrage.pdf",
    "2_Lire_le_tableau.pdf",
    "3_Plans_de_passation.pdf",
    "4_Telegram.pdf",
    "5_Google_Agenda.pdf",
]

# LES BONUS DE L'OFFRE. La page de vente les promet : ils partent avec
# chaque vente, a plat a cote du guide. Les modeles de lettres existent aussi
# en Word, parce qu'une lettre sert a etre modifiee. Aucun ne contient une
# piece du produit : ni script, ni classeur.
BONUS_CLIENT = [
    "Bonus_1_Configuration_faite_avec_vous.pdf",
    "Bonus_2_Profils_metier.pdf",
    "Bonus_3_Checklist_du_dossier.pdf",
    "Bonus_4_Modeles_de_lettres.pdf",
    "Bonus_4_Modeles_de_lettres.docx",
]

# L'operateur, lui, garde tout - dont le catalogue.
GUIDES_CLIENT_ARCHIVE = [
    "1_Guide_Demarrage.pdf",
    "2_Lire_le_tableau.pdf",
    "3_Plans_de_passation.pdf",
    "4_Telegram.pdf",
    "5_Google_Agenda.pdf",
    "6_Catalogue_des_Sources.pdf",
]
GUIDES_OPERATEUR = [
    "1_Guide_Operateur.pdf",
    "2_Installation_Manuelle.pdf",
    "3_Guide_Application_Web.pdf",
]

# Les deux archives vivent dans deux DOSSIERS separes, pas cote a cote.
#
# Un jour de rush, on choisit une piece jointe dans une liste triee par nom :
# le nom du dossier fait le travail que le nom du fichier ne fait pas.
VENTE = RACINE / "dist" / "A_VENDRE"
PRIVE = RACINE / "dist" / "PRIVE_NE_PAS_ENVOYER"
ARCHIVES = RACINE / "dist" / "ARCHIVES"

AVERTISSEMENT = """CE DOSSIER NE SORT JAMAIS D'ICI.

L'archive qu'il contient inclut les fichiers de script et le guide
operateur, qui explique comment fabriquer le produit.

Ce que vous envoyez a un client est dans :

    dist/A_VENDRE/

Si vous hesitez entre deux fichiers, prenez celui de A_VENDRE.
"""

ACCUEIL_CLIENT = """TENDERPILOT - VOTRE VEILLE DES APPELS D'OFFRES
Version {version}

====================================================================
EN CINQ MINUTES
====================================================================

1. Ouvrez ce lien. Google vous propose de creer une copie :

   {lien}

2. Dans le classeur qui s'ouvre, menu TENDERPILOT > Executer
   maintenant. Autorisez le script quand Google le demande.

3. Onglet CONFIG : mettez votre adresse email.

4. Menu TENDERPILOT > Activer l'execution automatique.

Rien a installer, rien a copier-coller. Tout est deja dans le
classeur que vous venez de copier.

Le detail est dans 1_Guide_Demarrage.pdf.

====================================================================
CE QUE CONTIENT CETTE ARCHIVE
====================================================================

1_Guide_Demarrage.pdf
    Les quatre etapes ci-dessus, en detail.

2_Lire_le_tableau.pdf
    Les colonnes, les couleurs, la colonne Suivi qui est a vous.

3_Plans_de_passation.pdf
    Les marches a venir, des semaines avant l'avis.

4_Telegram.pdf
    Creer le bot, trouver l'identifiant du salon, regler le classeur.

5_Google_Agenda.pdf
    Vos echeances dans l'agenda de votre telephone, avec leurs rappels.

====================================================================
VOS VIDEOS
====================================================================

Huit videos, une heure et quart en tout. Le PDF sert a chercher une
reponse precise, la video a se lancer la premiere fois :

    {videos}

====================================================================
VOS BONUS
====================================================================

Bonus_1_Configuration_faite_avec_vous.pdf
    Vingt minutes sur WhatsApp pour regler votre veille avec nous.
    Reserve aux 50 premiers acheteurs.

Bonus_2_Profils_metier.pdf
    Les reglages prets a coller pour votre metier.

Bonus_3_Checklist_du_dossier.pdf
    Les pieces d'une offre, de la recevabilite a la signature.

Bonus_4_Modeles_de_lettres.pdf et Bonus_4_Modeles_de_lettres.docx
    Eclaircissements, manifestation d'interet, habilitation,
    transmission de l'offre, CV d'expert. Le fichier Word se modifie.

Bonus 5 - le groupe WhatsApp prive TenderPilot :
    {groupe}

Les {nb_actives} sources actives sont listees dans l'onglet SOURCES de votre
classeur, avec leur type, leur secteur et leur pays. Le catalogue en compte
{nb_sources} : les autres y attendent, en veille, qu'un portail rouvre ou
qu'une extraction soit reparee.

====================================================================
CE QU'IL VOUS FAUT
====================================================================

- Un compte Google (gratuit).
- Un ordinateur, une seule fois, pour les deux premiers clics.
  L'application mobile Google Sheets n'affiche pas les menus.
- Une adresse email pour les alertes.
- Facultatif : un bot Telegram, pour les alertes sur mobile.

Ensuite, le telephone suffit : la collecte tourne chez Google et
les alertes arrivent sur votre appareil.

====================================================================
CE QUE TENDERPILOT NE FAIT PAS
====================================================================

Il ne remplit pas vos dossiers.
Il n'invente aucune date limite : quand la source ne l'ecrit pas,
la case reste vide.
Il ne garantit pas l'exhaustivite. Verifiez toujours l'avis
officiel avant de candidater.

====================================================================

Un blocage a l'installation ? Ecrivez-moi, je m'en occupe :

    {contact}
"""


def liens_videos(conf):
    """Retourne chaque vidéo avec son titre et son lien direct."""
    liens = conf.get("lien_videos") or []
    if not liens:
        return "demandez le lien a votre vendeur"
    videos = [
        ("00 - Commencez ici", "8 min"),
        ("IMPORTANT - Autorisations Google", "4 min"),
        ("01 - Prise en main", "30 min"),
        ("02 - Alertes email", "8 min"),
        ("03 - Telegram", "8 min"),
        ("04 - Google Agenda", "3 min"),
        ("05 - Classement intelligent", "4 min"),
        ("06 - Onglet OPPORTUNITIES", "13 min"),
    ]
    manquant = "demandez le lien a votre vendeur"
    return "\n".join(
        f"    {titre} ({duree}) : {liens[i] if i < len(liens) else manquant}"
        for i, (titre, duree) in enumerate(videos))

ACCUEIL_OPERATEUR = """TENDERPILOT - DOSSIER OPERATEUR
Version {version}

CE DOSSIER N'EST PAS DESTINE A UN CLIENT.

Il contient les fichiers de script et le guide qui explique
comment fabriquer le produit. Ne l'envoyez jamais tel quel :
envoyez l'archive de dist/A_VENDRE.

====================================================================
COMMENCEZ PAR
====================================================================

    guides/1_Guide_Operateur.pdf

Il vous fait fabriquer le classeur maitre, en tirer un lien de
vente, et le tester avant la premiere vente.

====================================================================
CE QUE CONTIENT CE DOSSIER
====================================================================

guides/1_Guide_Operateur.pdf        preparer, vendre, maintenir
guides/2_Installation_Manuelle.pdf  fabriquer le maitre, depanner
guides/3_Guide_Application_Web.pdf  l'autre produit

docs_client/    copie exacte de ce que le client recoit
script/         les {nb_scripts} fichiers a coller UNE FOIS dans le maitre
TenderPilot.xlsx
README.md       la version texte de l'installation manuelle

====================================================================
LE CLIENT N'A AUCUN REPLI
====================================================================

Il ne recoit ni script, ni classeur, ni methode manuelle. Si sa
copie echoue, il vous ecrit. Vous avez alors deux options :

  - refaire la copie a sa place, puis lui transferer la propriete ;
  - installer manuellement, avec le dossier script/ ci-dessus.

Dans les deux cas, il ne voit jamais le code.

====================================================================
AVANT DE VENDRE
====================================================================

1. Fabriquez le maitre et VIDEZ son onglet CONFIG :
   NOTIFICATION_EMAIL, TELEGRAM_TOKEN, TELEGRAM_CHAT_ID.
   Votre jeton de bot laisse quelqu'un ecrire a votre place.

2. Partagez en LECTEUR, jamais en Editeur.

3. Testez le lien avec un DEUXIEME compte Google.

4. Renseignez le lien dans data/livraison.json et relancez
   python build.py.

Lien actuellement configure :
   {lien}

Contact actuellement configure :
   {contact}
"""


def fichiers_script():
    """Les fichiers Apps Script du livrable, dans l'ordre de creation."""
    from builders.toolkit import SCRIPT_FILES
    return [n for n in SCRIPT_FILES if (LIVRABLE / n).exists()]


def nombre_de_sources():
    with (RACINE / "data" / "sources.csv").open(encoding="utf-8", newline="") as f:
        return sum(1 for r in csv.DictReader(f) if (r["Source_ID"] or "").strip())


def nombre_de_sources_actives():
    """Celles qui collectent vraiment.

    Le catalogue compte les sources en veille ; le client, lui, ne voit
    arriver que les actives. Annoncer le total lui promettrait plus que ce
    qu'il recoit - mesure du 2026-09-16 : 61 actives sur 120.
    """
    with (RACINE / "data" / "sources.csv").open(encoding="utf-8", newline="") as f:
        return sum(1 for r in csv.DictReader(f)
                   if (r["Source_ID"] or "").strip()
                   and (r["Active"] or "").strip().upper() == "OUI")


def livraison():
    """Lien de vente et contact, renseignes dans data/livraison.json."""
    import json
    chemin = RACINE / "data" / "livraison.json"
    conf = {"lien_copie": "[LIEN A RENSEIGNER]",
            "contact": "[CONTACT A RENSEIGNER]"}
    if chemin.exists():
        conf.update(json.loads(chemin.read_text(encoding="utf-8")))
    return conf


def construire_client(nom):
    """L'archive du client : un lien, deux PDF, rien d'autre.

    Volontairement plate, sans sous-dossier : trois fichiers se lisent d'un
    coup d'oeil, une arborescence donne l'impression d'un logiciel a
    installer - exactement ce qu'on veut eviter de suggerer.
    """
    from builders.toolkit import VERSION

    conf = livraison()
    VENTE.mkdir(parents=True, exist_ok=True)
    archive = VENTE / (nom + ".zip")

    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr(nom + "/COMMENCEZ_ICI.txt", ACCUEIL_CLIENT.format(
            version=VERSION,
            nb_sources=nombre_de_sources(),
            nb_actives=nombre_de_sources_actives(),
            lien=conf["lien_copie"],
            contact=conf["contact"],
            groupe=conf.get("groupe_whatsapp")
            or "demandez le lien a votre vendeur",
            videos=liens_videos(conf)))
        for guide in GUIDES_CLIENT:
            z.write(LIVRABLE / "guides" / "client" / guide, nom + "/" + guide)
        for bonus in BONUS_CLIENT:
            z.write(LIVRABLE / "guides" / "bonus" / bonus, nom + "/" + bonus)

    return archive


def construire_operateur(nom):
    """L'archive de l'operateur : tout, y compris ce que lit le client."""
    from builders.toolkit import VERSION

    conf = livraison()
    scripts = fichiers_script()
    PRIVE.mkdir(parents=True, exist_ok=True)
    archive = PRIVE / (nom + ".zip")

    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr(nom + "/COMMENCEZ_ICI.txt", ACCUEIL_OPERATEUR.format(
            version=VERSION,
            nb_scripts=len([f for f in scripts if f.endswith(".gs")]),
            lien=conf["lien_copie"],
            contact=conf["contact"]))

        z.write(LIVRABLE / "TenderPilot.xlsx", nom + "/TenderPilot.xlsx")
        z.write(LIVRABLE / "README.md", nom + "/README.md")

        for fichier in scripts:
            z.write(LIVRABLE / fichier, nom + "/script/" + fichier)
        for guide in GUIDES_OPERATEUR:
            z.write(LIVRABLE / "guides" / "operateur" / guide,
                    nom + "/guides/" + guide)
        # Ce que le client lit, mot pour mot - PLUS le catalogue, que
        # l'operateur garde sous la main sans le joindre a la vente.
        for guide in GUIDES_CLIENT_ARCHIVE:
            z.write(LIVRABLE / "guides" / "client" / guide,
                    nom + "/docs_client/" + guide)
        for bonus in BONUS_CLIENT:
            z.write(LIVRABLE / "guides" / "bonus" / bonus,
                    nom + "/docs_client/" + bonus)

    return archive


def archiver(archives):
    """Conserve une copie datee de chaque version publiee.

    dist/ est reconstruit a chaque build : sans cette copie, la version
    livree hier disparait des qu'on relance. Or un client qui appelle dans
    six mois se refere a ce qu'il a recu, pas a la version courante.
    """
    from builders.toolkit import VERSION

    dossier = ARCHIVES / ("v" + VERSION)
    dossier.mkdir(parents=True, exist_ok=True)
    gardees = []
    for source in archives:
        cible = dossier / source.name
        cible.write_bytes(source.read_bytes())
        gardees.append(cible)
    return gardees


def construire():
    from builders.toolkit import VERSION

    if not (LIVRABLE / "TenderPilot.xlsx").exists():
        print("Le livrable n'existe pas. Lancer d'abord : python build.py")
        return None

    for jeu, dossier in ((GUIDES_CLIENT_ARCHIVE, "client"),
                         (GUIDES_OPERATEUR, "operateur")):
        manquants = [g for g in jeu
                     if not (LIVRABLE / "guides" / dossier / g).exists()]
        if manquants:
            print("Guides manquants : " + ", ".join(manquants))
            return None

    absents = [b for b in BONUS_CLIENT
               if not (LIVRABLE / "guides" / "bonus" / b).exists()]
    if absents:
        print("Bonus manquants : " + ", ".join(absents))
        return None

    # La version change toute seule a chaque modification du produit.
    # On ne garde dans A_VENDRE et PRIVE que la version courante : les
    # precedentes restent archivees dans dist/ARCHIVES/vX.Y.Z.
    for dossier, prefixe in ((VENTE, "TenderPilot_Sheets_v"),
                             (PRIVE, "TenderPilot_OPERATEUR_v")):
        if dossier.is_dir():
            for ancien in dossier.glob(prefixe + "*.zip"):
                ancien.unlink()

    # Le client recoit un nom de produit propre, pas un nom de fichier
    # interne : "TenderPilot_Sheets_v1.0.0.zip" se presente mieux dans une
    # conversation WhatsApp que "..._CLIENT.zip".
    archives = [
        construire_client("TenderPilot_Sheets_v" + VERSION),
        construire_operateur("TenderPilot_OPERATEUR_v" + VERSION),
    ]
    (PRIVE / "NE_PAS_ENVOYER_AU_CLIENT.txt").write_text(
        AVERTISSEMENT, encoding="utf-8", newline=chr(10))
    archiver(archives)
    return archives


def verifier(archive):
    """Relit l'archive produite : un ZIP corrompu ne se vend qu'une fois."""
    with zipfile.ZipFile(archive) as z:
        casse = z.testzip()
        if casse:
            raise RuntimeError("Archive corrompue : " + casse)
        noms = z.namelist()

    a_vendre = archive.parent == VENTE

    if not any(n.endswith("COMMENCEZ_ICI.txt") for n in noms):
        raise RuntimeError("COMMENCEZ_ICI.txt absent de " + archive.name)

    if a_vendre:
        # Le client ne doit recevoir AUCUN element du produit lui-meme :
        # ni script, ni classeur, ni methode manuelle. Sans les fichiers,
        # le produit ne peut etre ni revendu ni redistribue.
        interdits = [n for n in noms
                     if n.endswith((".gs", ".xlsx", ".json", ".md"))
                     or "Installation_Manuelle" in n
                     or "Guide_Operateur" in n]
        if interdits:
            raise RuntimeError("Contenu interdit dans l'archive client : "
                               + ", ".join(sorted(interdits)[:4]))
        for guide in GUIDES_CLIENT + BONUS_CLIENT:
            if not any(n.endswith(guide) for n in noms):
                raise RuntimeError(guide + " absent de " + archive.name)
        # ET CE QUI NE DOIT PAS Y ETRE. Le catalogue liste les sources une
        # par une : c'est le travail qui fait la valeur du produit. Le
        # controle est ici parce qu'un ajout distrait a GUIDES_CLIENT le
        # remettrait dans l'archive de vente sans que personne ne le voie.
        if any("Catalogue_des_Sources" in n for n in noms):
            raise RuntimeError("Le catalogue des sources ne doit pas partir "
                               "avec l'archive de vente : " + archive.name)
    else:
        attendus = [f for f in fichiers_script() if f.endswith(".gs")]
        presents = [n for n in noms if "/script/" in n and n.endswith(".gs")]
        if len(presents) != len(attendus):
            raise RuntimeError(str(len(presents)) + " scripts, "
                               + str(len(attendus)) + " attendus")
        if not any("1_Guide_Operateur" in n for n in noms):
            raise RuntimeError("Le guide operateur manque a son archive")

    return noms


def main():
    archives = construire()
    if not archives:
        return 1
    for archive in archives:
        noms = verifier(archive)
        print("  " + str(archive.relative_to(RACINE)) + "  ("
              + str(archive.stat().st_size // 1024) + " ko, "
              + str(len(noms)) + " fichiers)")

    from builders.toolkit import VERSION
    print("  " + str((ARCHIVES / ("v" + VERSION)).relative_to(RACINE))
          + "  (copie conservee)")

    if livraison()["lien_copie"].startswith("["):
        print("  ! Le lien de vente n'est pas renseigne "
              "(data/livraison.json). Les guides portent un texte a "
              "remplacer.")
    return 0


if __name__ == "__main__":
    sys.path.insert(0, str(RACINE))
    sys.exit(main())
