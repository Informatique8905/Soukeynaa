"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Rafraîchit les données serveur de la page en continu : toutes les
// `secondes` + quand l'onglet redevient visible. Permet à l'admin de
// voir les nouvelles commandes/paiements sans recharger manuellement.
export function ActualisationAuto({ secondes = 15 }: { secondes?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), secondes * 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, secondes]);
  return null;
}
