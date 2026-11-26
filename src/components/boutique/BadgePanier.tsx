"use client";

import { useEffect, useState } from "react";

const EVT = "cart-delta";

/** Ajustement optimiste du compteur panier : appelé depuis les actions
 * « ajouter / quantité / retirer », met à jour tous les badges (en-tête
 * + barre du bas) instantanément, avant la revalidation serveur. */
export function deltaPanier(n: number) {
  window.dispatchEvent(new CustomEvent<number>(EVT, { detail: n }));
}

/** Compteur courant = base serveur + deltas optimistes ; le delta est
 * remis à zéro quand la base revalidée arrive (évite le double compte). */
export function useCompteurPanier(base: number): number {
  const [delta, setDelta] = useState(0);
  // Remise à zéro quand la base revalidée change — ajustement pendant le
  // rendu (pattern officiel React, pas d'effet ni de rendu en cascade).
  const [baseVu, setBaseVu] = useState(base);
  if (baseVu !== base) {
    setBaseVu(base);
    setDelta(0);
  }
  useEffect(() => {
    const h = (e: Event) =>
      setDelta((d) => d + ((e as CustomEvent<number>).detail ?? 0));
    window.addEventListener(EVT, h);
    return () => window.removeEventListener(EVT, h);
  }, []);
  return Math.max(0, base + delta);
}

/** Badge du panier (en-tête) : pop à chaque changement de valeur. */
export function BadgePanier({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  const n = useCompteurPanier(count);
  if (n <= 0) return null;
  return (
    <span key={n} className={className}>
      {n > 99 ? "99+" : n}
    </span>
  );
}
