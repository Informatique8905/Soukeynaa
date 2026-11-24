"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Recherche d'une commande invité par sa référence (SOU-XXXX-NNNNNN). */
export function RechercheCommande() {
  const router = useRouter();
  const [ref, setRef] = useState("");

  function voir(e: React.FormEvent) {
    e.preventDefault();
    const r = ref.trim().toUpperCase();
    if (r) router.push(`/commande/${encodeURIComponent(r)}`);
  }

  return (
    <form onSubmit={voir} className="relative">
      <input
        value={ref}
        onChange={(e) => setRef(e.target.value)}
        placeholder="Référence — ex. SOU-2026-000123"
        required
        className="w-full rounded-full bg-white py-3.5 pl-4 pr-24 text-sm shadow-sm ring-1 ring-black/5 outline-none placeholder:text-gris-fonce focus:ring-2 focus:ring-vert"
      />
      <button
        type="submit"
        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-vert px-5 py-2.5 text-xs font-bold text-white transition hover:bg-vert-fonce"
      >
        Suivre
      </button>
    </form>
  );
}
