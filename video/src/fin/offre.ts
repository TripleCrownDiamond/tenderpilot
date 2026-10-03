// L'OFFRE, en un seul endroit. Toutes les videos finissent sur la meme fin
// (Fin.tsx), qui lit ces valeurs : changer un prix ici, puis lancer
//
//     .venv/bin/python assembler.py
//
// refait la fin et la recolle derriere chaque film, sans recalculer les films.
// Garder ces chiffres alignes sur la page de vente
// (site/payment/compteur-places.php).
export const OFFRE = {
  prix: "20 000", //               le prix affiche
  devise: "FCFA",
  prixBarre: "50 000 FCFA", //     le prix de reference, barre (vide : pas de prix barre)
  etiquette: "OFFRE DE LANCEMENT", // la pastille au-dessus du prix (vide : aucune)
  places: "50 premières places", // sous l'etiquette (vide : rien)
  mention: "Paiement unique, sans abonnement",
  garantie: "Satisfait ou remboursé 30 jours",
  url: "tenderpilot.store",
  pied: "Sources officielles · 8 pays suivis",
};
