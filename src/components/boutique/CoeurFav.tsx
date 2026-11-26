"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

export const CLE_FAV = "soukeyna_fav";

export function lireFavoris(): number[] {
  try {
    return JSON.parse(localStorage.getItem(CLE_FAV) ?? "[]");
  } catch {
    return [];
  }
}

export function ecrireFavoris(ids: number[]) {
  try {
    localStorage.setItem(CLE_FAV, JSON.stringify(ids));
  } catch {
    /* stockage indisponible */
  }
  window.dispatchEvent(new Event("fav-change"));
}

/** Petit cœur posé sur une carte produit : favori en un tap, sans quitter
 * la liste. Le bouton neutralise le lien parent (preventDefault). */
export function CoeurFav({ produitId }: { produitId: number }) {
  const [actif, setActif] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setActif(lireFavoris().includes(produitId)), 0);
    const sync = () => setActif(lireFavoris().includes(produitId));
    window.addEventListener("fav-change", sync);
    return () => {
      clearTimeout(id);
      window.removeEventListener("fav-change", sync);
    };
  }, [produitId]);

  return (
    <button
      type="button"
      aria-label={actif ? "Retirer des favoris" : "Ajouter aux favoris"}
      aria-pressed={actif}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const l = lireFavoris();
        const suivant = !actif;
        setActif(suivant);
        ecrireFavoris(
          suivant
            ? [...new Set([...l, produitId])]
            : l.filter((x) => x !== produitId)
        );
      }}
      className={`press absolute right-2 top-2 z-10 grid size-9 place-items-center rounded-full bg-white/95 shadow-md backdrop-blur transition ${
        actif ? "text-red-500" : "text-noir/70 hover:text-red-500"
      }`}
    >
      <Heart className={`size-4 ${actif ? "fill-current" : ""}`} aria-hidden />
    </button>
  );
}
