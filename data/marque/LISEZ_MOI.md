# Les deux images de la marque

Deposez ici les deux fichiers, sous ces noms exacts. Le build les reprend
tels quels : rien d'autre a faire.

| Fichier attendu | Ce que c'est | Ou il sert |
|-----------------|--------------|------------|
| `tenderpilot-logo.png` | le logo horizontal, texte a droite du pictogramme | en-tete des guides PDF |
| `tenderpilot-icon.png` | l'icone carree, coins arrondis | favicon du site, image du groupe, vignette |

Les deux sont redimensionnes par `python builders/marque.py` :

- le logo en 900 px de large, ce qui suffit trois fois a la largeur imprimee
  d'une page A4 sans alourdir le PDF ;
- l'icone en 512, 256, 192, 180, 128, 64, 32 et 16 px, les tailles que
  demandent les navigateurs, Android, iOS et WhatsApp.

Les originaux ne sont jamais modifies : les sorties vont dans
`data/marque/rendu/`.
