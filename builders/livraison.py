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

# Deux archives, deux publics.
#
# Le client recoit un lien a dupliquer et le minimum pour demarrer. Il garde
# la methode manuelle en secours : si le menu n'apparait pas apres la copie,
# il doit pouvoir s'en sortir sans attendre une reponse.
#
# L'operateur recoit en plus le guide de preparation et les fichiers de
# script, dont il a besoin pour fabriquer son classeur maitre. Le guide
# operateur ne doit JAMAIS partir chez un client : il decrit comment
# fabriquer le produit.
GUIDES_CLIENT = [
    "1_Guide_Demarrage.pdf",
    "2_Catalogue_des_Sources.pdf",
    "3_Installation_Manuelle.pdf",
]
GUIDES_OPERATEUR = ["0_Guide_Operateur.pdf"] + GUIDES_CLIENT

# Le premier fichier que l'acheteur voit en ouvrant l'archive. En .txt parce
# qu'il s'ouvre partout, y compris sur un telephone, sans rien installer.
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

C'est tout. Le detail est dans guides/1_Guide_Demarrage.pdf.

====================================================================
CE QUE CONTIENT CETTE ARCHIVE
====================================================================

guides/1_Guide_Demarrage.pdf
    Les cinq minutes ci-dessus, en detail, avec Telegram.

guides/2_Catalogue_des_Sources.pdf
    Les {nb_sources} sources surveillees, par type et par secteur.

guides/3_Installation_Manuelle.pdf
    EN CAS DE PROBLEME SEULEMENT. Si le menu TenderPilot
    n'apparait pas apres la copie, ce guide vous fait installer
    le classeur a la main, avec le dossier script/.

script/ et TenderPilot.xlsx
    Necessaires uniquement pour l'installation manuelle.
    Si le lien a fonctionne, vous n'y toucherez jamais.

====================================================================
CE QU'IL VOUS FAUT
====================================================================

- Un compte Google (gratuit).
- Un ordinateur. L'editeur de script n'existe pas sur telephone.
- Une adresse email pour les alertes.
- Facultatif : un bot Telegram, pour les alertes sur mobile.

====================================================================
CE QUE TENDERPILOT NE FAIT PAS
====================================================================

Il ne remplit pas vos dossiers.
Il n'invente aucune date limite : quand la source ne l'ecrit pas,
la case reste vide.
Il ne garantit pas l'exhaustivite. Verifiez toujours l'avis
officiel avant de candidater.

====================================================================

Une question, un blocage : {contact}
"""

ACCUEIL_OPERATEUR = """TENDERPILOT - DOSSIER OPERATEUR
Version {version}

CE DOSSIER N'EST PAS DESTINE A UN CLIENT.

Il contient le guide qui explique comment fabriquer le produit.
Ne l'envoyez jamais tel quel : envoyez l'archive CLIENT.

====================================================================
COMMENCEZ PAR
====================================================================

    guides/0_Guide_Operateur.pdf

Il vous fait fabriquer le classeur maitre, en tirer un lien de
vente, et le tester avant la premiere vente.

====================================================================
CE QUE CONTIENT CE DOSSIER
====================================================================

guides/0_Guide_Operateur.pdf   pour vous : preparer et vendre
guides/1_Guide_Demarrage.pdf   ce que le client lit
guides/2_Catalogue_des_Sources.pdf
guides/3_Installation_Manuelle.pdf

TenderPilot.xlsx   le classeur de depart
script/            les {nb_scripts} fichiers a coller UNE FOIS dans le maitre
README.md          la version texte du guide d'installation

====================================================================
AVANT DE VENDRE
====================================================================

1. Fabriquez le maitre et VIDEZ son onglet CONFIG :
   NOTIFICATION_EMAIL, TELEGRAM_TOKEN, TELEGRAM_CHAT_ID.
   Votre jeton de bot laisse quelqu'un ecrire a votre place.

2. Partagez en LECTEUR, jamais en Editeur.

3. Testez le lien avec un DEUXIEME compte Google.

4. Renseignez le lien dans data/livraison.json et relancez
   python build.py : les guides et l'archive client le reprennent.

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


def livraison():
    """Lien de vente et contact, renseignes dans data/livraison.json."""
    import json
    chemin = RACINE / "data" / "livraison.json"
    conf = {"lien_copie": "[LIEN A RENSEIGNER]",
            "contact": "[CONTACT A RENSEIGNER]"}
    if chemin.exists():
        conf.update(json.loads(chemin.read_text(encoding="utf-8")))
    return conf


def construire_une(nom, accueil, guides, dossier):
    """Ecrit une archive et renvoie son chemin.

    Les deux archives partagent le classeur, les scripts et le README :
    l'operateur en a besoin pour fabriquer son maitre, le client pour
    l'installation manuelle de secours.
    """
    from builders.toolkit import VERSION

    conf = livraison()
    scripts = fichiers_script()
    dossier.mkdir(parents=True, exist_ok=True)
    archive = dossier / (nom + ".zip")

    # ZIP_DEFLATED : une archive de cette taille passe en piece jointe
    # partout, y compris sur une connexion mobile.
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr(nom + "/COMMENCEZ_ICI.txt", accueil.format(
            version=VERSION,
            nb_scripts=len([f for f in scripts if f.endswith(".gs")]),
            nb_sources=nombre_de_sources(),
            lien=conf["lien_copie"],
            contact=conf["contact"]))

        z.write(LIVRABLE / "TenderPilot.xlsx", nom + "/TenderPilot.xlsx")
        z.write(LIVRABLE / "README.md", nom + "/README.md")

        for fichier in scripts:
            z.write(LIVRABLE / fichier, nom + "/script/" + fichier)
        for guide in guides:
            z.write(LIVRABLE / "guides" / guide, nom + "/guides/" + guide)

    return archive


def construire():
    from builders.toolkit import VERSION

    if not (LIVRABLE / "TenderPilot.xlsx").exists():
        print("Le livrable n'existe pas. Lancer d'abord : python build.py")
        return None

    manquants = [g for g in GUIDES_OPERATEUR
                 if not (LIVRABLE / "guides" / g).exists()]
    if manquants:
        print("Guides manquants : " + ", ".join(manquants))
        return None

    # Le client recoit un nom de produit propre, pas un nom de fichier
    # interne : "TenderPilot_Sheets_v1.0.0.zip" se presente mieux dans une
    # conversation WhatsApp que "..._CLIENT.zip".
    archives = [
        construire_une("TenderPilot_Sheets_v" + VERSION,
                       ACCUEIL_CLIENT, GUIDES_CLIENT, VENTE),
        construire_une("TenderPilot_OPERATEUR_v" + VERSION,
                       ACCUEIL_OPERATEUR, GUIDES_OPERATEUR, PRIVE),
    ]
    (PRIVE / "NE_PAS_ENVOYER_AU_CLIENT.txt").write_text(
        AVERTISSEMENT, encoding="utf-8", newline=chr(10))
    return archives


def verifier(archive):
    """Relit l'archive produite : un ZIP corrompu ne se vend qu'une fois."""
    with zipfile.ZipFile(archive) as z:
        casse = z.testzip()
        if casse:
            raise RuntimeError("Archive corrompue : " + casse)
        noms = z.namelist()

    scripts = [n for n in noms if "/script/" in n and n.endswith(".gs")]
    attendus = [f for f in fichiers_script() if f.endswith(".gs")]
    if len(scripts) != len(attendus):
        raise RuntimeError(str(len(scripts)) + " scripts dans l'archive, "
                           + str(len(attendus)) + " attendus")

    for indispensable in ("COMMENCEZ_ICI.txt", "TenderPilot.xlsx",
                          "appsscript.json", "1_Guide_Demarrage.pdf"):
        if not any(n.endswith(indispensable) for n in noms):
            raise RuntimeError(indispensable + " absent de " + archive.name)

    # Le guide de l'application web est un autre produit.
    if any("Application_Web" in n for n in noms):
        raise RuntimeError("Le guide de l'application web est dans l'archive")

    # Le guide operateur explique comment fabriquer le produit : il ne doit
    # jamais partir chez un client.
    if archive.parent == VENTE and any("0_Guide_Operateur" in n for n in noms):
        raise RuntimeError("Le guide operateur est dans l'archive a vendre")

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

    if livraison()["lien_copie"].startswith("["):
        print("  ! Le lien de vente n'est pas renseigne "
              "(data/livraison.json). Les guides portent un texte a "
              "remplacer.")
    return 0


if __name__ == "__main__":
    sys.path.insert(0, str(RACINE))
    sys.exit(main())
