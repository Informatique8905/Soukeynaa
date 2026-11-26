"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

/** Pilule de recherche d'accueil : le placeholder tourne en verticale entre
 * les vraies catégories de la boutique (ex. « Rechercher « Robes » »). */
export function PiluleRecherche({ exemples }: { exemples: string[] }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (
      exemples.length < 2 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const id = setInterval(() => setI((v) => (v + 1) % exemples.length), 3000);
    return () => clearInterval(id);
  }, [exemples.length]);

  return (
    <Link
      href="/recherche"
      data-reveal
      className="press group mt-4 flex items-center gap-3 rounded-full bg-white py-3.5 pl-4 pr-3 text-sm text-gris-fonce shadow-sm ring-1 ring-black/5 hover:ring-vert/40"
    >
      <Search className="size-4 shrink-0 opacity-60" aria-hidden />
      <span className="relative flex-1 overflow-hidden">
        {/* Réserve la hauteur d'une ligne */}
        <span className="invisible block truncate">Rechercher…</span>
        {exemples.map((e, k) => (
          <span
            key={e}
            aria-hidden={k !== i}
            className="absolute inset-0 block truncate transition-transform duration-300 ease-out"
            style={{ transform: `translateY(${(k - i) * 110}%)` }}
          >
            {e}
          </span>
        ))}
      </span>
      <span className="hidden shrink-0 rounded-full bg-vert-clair px-2.5 py-1 text-[11px] font-semibold text-vert sm:inline">
        Rechercher
      </span>
    </Link>
  );
}
