"""
TenderPilot - build.

    python build.py            genere le livrable et lance les tests
    python build.py --no-test  genere seulement

Le livrable complet tient dans dist/TenderPilot/ : un classeur et un projet
Apps Script. Rien n'est jamais modifie a la main dans dist.
"""

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
TESTS = ["tests/test_logic.js", "tests/test_sheet.py"]


def main():
    from builders.toolkit import build

    print("=" * 58)
    print("TENDERPILOT - BUILD")
    print("=" * 58)

    sortie = build()
    print(f"\nLivrable : {sortie.relative_to(ROOT)}")

    # Les guides PDF sont rendus depuis le README qui vient d etre genere :
    # ils ne peuvent donc pas decrire une version anterieure du produit.
    from builders.guides import main as generer_guides
    print(f"\nGuides PDF :")
    generer_guides()

    # L archive de livraison vient apres les guides : elle les embarque.
    from builders.livraison import main as generer_archive
    print(f"\nArchive de livraison :")
    generer_archive()

    if "--no-test" in sys.argv:
        return 0

    echecs = []
    for test in TESTS:
        moteur = "node" if test.endswith(".js") else sys.executable
        print(f"\n> {test}")
        if subprocess.run([moteur, str(ROOT / test)], cwd=ROOT).returncode:
            echecs.append(test)

    print("\n" + "=" * 58)
    if echecs:
        print("EN ECHEC : " + ", ".join(echecs))
        return 1
    print("Livrable genere, tous les tests passent.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
