"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

// Auto-actualisation intelligente : sonde l'empreinte des données via
// /api/etat et ne recharge la page (router.refresh) QUE si elle a changé.
// En pause quand l'onglet est masqué, sondage immédiat au retour.
export function AutoRefresh({
  scope,
  actif = true,
  ms = 15_000,
}: {
  scope: "admin" | "commandes";
  actif?: boolean;
  ms?: number;
}) {
  const router = useRouter();
  const version = useRef<string | null>(null);

  useEffect(() => {
    if (!actif) return;
    version.current = null;
    let stop = false;

    const sonder = async () => {
      if (stop || document.visibilityState !== "visible") return;
      try {
        const r = await fetch(`/api/etat?scope=${scope}`, {
          cache: "no-store",
        });
        if (!r.ok) return;
        const d = (await r.json()) as { v?: string };
        if (version.current !== null && d.v && d.v !== version.current) {
          router.refresh();
        }
        version.current = d.v ?? null;
      } catch {
        // Réseau coupé : on réessaiera au prochain tick
      }
    };

    sonder(); // empreinte initiale — jamais de refresh au montage
    const t = window.setInterval(sonder, ms);
    const retourOnglet = () => {
      sonder();
    };
    document.addEventListener("visibilitychange", retourOnglet);
    return () => {
      stop = true;
      clearInterval(t);
      document.removeEventListener("visibilitychange", retourOnglet);
    };
  }, [scope, actif, ms, router]);

  return null;
}
