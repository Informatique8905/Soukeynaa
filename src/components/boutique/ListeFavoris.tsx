"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { ProductCard, type CarteProduit } from "./ProductCard";
import { lireFavoris } from "./CoeurFav";

/** Liste les articles favoris (ids en localStorage → fiches via l'API).
 * Se met à jour quand un cœur est décoché sur la page même. */
export function ListeFavoris() {
  const [cartes, setCartes] = useState<CarteProduit[] | null>(null);

  useEffect(() => {
    let stop = false;
    const charger = async () => {
      const ids = lireFavoris();
      if (!ids.length) {
        setCartes([]);
        return;
      }
      try {
        const res = await fetch(`/api/favoris?ids=${ids.join(",")}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (stop) return;
        const actifs = new Set(lireFavoris());
        setCartes(
          (data.produits as CarteProduit[]).filter((p) => actifs.has(p.id ?? -1))
        );
      } catch {
        if (!stop) setCartes([]);
      }
    };
    charger();
    window.addEventListener("fav-change", charger);
    return () => {
      stop = true;
      window.removeEventListener("fav-change", charger);
    };
  }, []);

  // Chargement : squelettes aux dimensions des cartes
  if (cartes === null) {
    return (
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="shimmer aspect-[4/5] rounded-3xl bg-white shadow-sm ring-1 ring-black/5"
          />
        ))}
      </div>
    );
  }

  if (cartes.length === 0) {
    return (
      <div className="mt-10 rounded-3xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-black/5">
        <Heart className="mx-auto size-10 text-gris-fonce" aria-hidden />
        <p className="mt-3 font-bold text-noir">Aucun favori pour l&apos;instant</p>
        <p className="mx-auto mt-1 max-w-xs text-sm text-gris-fonce">
          Touchez le cœur sur un article qui vous plaît pour le retrouver ici.
        </p>
        <Link
          href="/recherche"
          className="press mt-5 inline-block rounded-full bg-vert px-6 py-2.5 text-xs font-bold text-white hover:bg-vert-fonce"
        >
          Explorer la boutique
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {cartes.map((p) => (
        <ProductCard key={p.slug} p={p} />
      ))}
    </div>
  );
}
