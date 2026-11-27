"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

// Actualisation temps réel : flux SSE /api/etat/stream — le serveur
// pousse « maj » dès qu'une donnée change, la page se recharge en <1 s.
// La sonde /api/etat reste en filet de sécurité (toutes les `ms`, min 30 s)
// et au retour sur l'onglet, au cas où le flux serait tombé silencieusement.
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
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!actif) return;
    version.current = null;
    let stop = false;

    // Rafraîchissements regroupés : une rafale d'événements (transaction
    // multi-étapes) ne produit qu'un seul rechargement, après commit.
    const planifierRefresh = () => {
      if (minuteur.current) return;
      minuteur.current = setTimeout(() => {
        minuteur.current = null;
        if (document.visibilityState === "visible") router.refresh();
      }, 400);
    };

    const flux = new EventSource(`/api/etat/stream?scope=${scope}`);
    flux.onmessage = (e) => {
      if (e.data === "maj") planifierRefresh();
    };

    const sonder = async () => {
      if (stop || document.visibilityState !== "visible") return;
      try {
        const r = await fetch(`/api/etat?scope=${scope}`, {
          cache: "no-store",
        });
        if (!r.ok) return;
        const d = (await r.json()) as { v?: string };
        if (version.current !== null && d.v && d.v !== version.current) {
          planifierRefresh();
        }
        version.current = d.v ?? null;
      } catch {
        // Réseau coupé : on réessaiera au prochain tick
      }
    };

    sonder(); // empreinte initiale — jamais de refresh au montage
    const t = window.setInterval(sonder, Math.max(ms, 30_000));
    const retourOnglet = () => sonder();
    document.addEventListener("visibilitychange", retourOnglet);
    return () => {
      stop = true;
      flux.close();
      clearInterval(t);
      if (minuteur.current) clearTimeout(minuteur.current);
      document.removeEventListener("visibilitychange", retourOnglet);
    };
  }, [scope, actif, ms, router]);

  return null;
}
