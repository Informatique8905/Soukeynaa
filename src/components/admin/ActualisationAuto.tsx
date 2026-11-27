"use client";

import { AutoRefresh } from "@/components/AutoRefresh";

// Rafraîchit les données serveur des pages admin quand elles changent :
// sonde /api/etat toutes les `secondes` + au retour sur l'onglet. Permet
// à l'admin de voir les nouvelles commandes/paiements sans recharger.
export function ActualisationAuto({ secondes = 15 }: { secondes?: number }) {
  return <AutoRefresh scope="admin" ms={secondes * 1000} />;
}
