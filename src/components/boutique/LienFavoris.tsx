"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { lireFavoris } from "./CoeurFav";

/** Icône favoris de l'en-tête, avec le nombre d'articles enregistrés. */
export function LienFavoris() {
  const [n, setN] = useState(0);

  useEffect(() => {
    const maj = () => setN(lireFavoris().length);
    const id = setTimeout(maj, 0);
    window.addEventListener("fav-change", maj);
    window.addEventListener("storage", maj);
    return () => {
      clearTimeout(id);
      window.removeEventListener("fav-change", maj);
      window.removeEventListener("storage", maj);
    };
  }, []);

  return (
    <Link
      href="/favoris"
      aria-label="Mes favoris"
      className="press relative grid size-10 place-items-center rounded-full bg-gris text-noir hover:bg-vert-clair hover:text-vert"
    >
      <Heart className="size-4" aria-hidden />
      {n > 0 && (
        <span
          key={n}
          className="pop absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white"
        >
          {n > 99 ? "99+" : n}
        </span>
      )}
    </Link>
  );
}
