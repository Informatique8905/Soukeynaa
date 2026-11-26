"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, Tag, History } from "lucide-react";

const CLE_RECH = "soukeyna_rech";
function lireRecentes(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CLE_RECH) ?? "[]");
  } catch {
    return [];
  }
}
function memoriserRecherche(t: string) {
  const s = t.trim();
  if (s.length < 2) return;
  try {
    const l = lireRecentes().filter((x) => x.toLowerCase() !== s.toLowerCase());
    localStorage.setItem(CLE_RECH, JSON.stringify([s, ...l].slice(0, 6)));
  } catch {
    /* stockage indisponible */
  }
}

interface Suggestions {
  categories: { slug: string; nom: string }[];
  produits: { slug: string; nom: string; categorie: string | null }[];
}

/** Pilule de recherche avec suggestions instantanées : catégories puis
 * articles proposés dès 2 caractères, sans connaître le nom exact. */
export function BarreRecherche({
  initial = "",
  enPromo = false,
}: {
  initial?: string;
  enPromo?: boolean;
}) {
  const [terme, setTerme] = useState(initial);
  const [sugg, setSugg] = useState<Suggestions | null>(null);
  const [recentes, setRecentes] = useState<string[]>([]);
  useEffect(() => {
    const id = setTimeout(() => setRecentes(lireRecentes()), 0);
    return () => clearTimeout(id);
  }, []);
  const [ouvert, setOuvert] = useState(false);
  const boite = useRef<HTMLFormElement>(null);

  // Fermer au clic dehors ou à Échap.
  useEffect(() => {
    function fermer(e: MouseEvent | KeyboardEvent) {
      if (e instanceof KeyboardEvent && e.key !== "Escape") return;
      if (e instanceof MouseEvent && boite.current?.contains(e.target as Node))
        return;
      setOuvert(false);
    }
    document.addEventListener("mousedown", fermer);
    document.addEventListener("keydown", fermer);
    return () => {
      document.removeEventListener("mousedown", fermer);
      document.removeEventListener("keydown", fermer);
    };
  }, []);

  // Suggestions débouncées — 220 ms après la dernière frappe.
  useEffect(() => {
    const t = terme.trim();
    const id = setTimeout(async () => {
      if (t.length < 2) {
        setSugg(null);
        return;
      }
      try {
        const res = await fetch(`/api/recherche?q=${encodeURIComponent(t)}`);
        if (res.ok) {
          setSugg(await res.json());
          setOuvert(true);
        }
      } catch {
        // Pas de réseau : la recherche classique reste disponible.
      }
    }, 220);
    return () => clearTimeout(id);
  }, [terme]);

  const aSugg = !!sugg && (sugg.categories.length > 0 || sugg.produits.length > 0);

  return (
    <form
      ref={boite}
      action="/recherche"
      data-reveal
      className="group relative mt-4"
      autoComplete="off"
      role="search"
      onSubmit={() => memoriserRecherche(terme)}
    >
      {enPromo && <input type="hidden" name="promo" value="1" />}
      <input
        name="q"
        type="search"
        autoFocus
        value={terme}
        onChange={(e) => setTerme(e.target.value)}
        onFocus={() => aSugg && setOuvert(true)}
        placeholder="Un article, une catégorie, une couleur…"
        className="w-full rounded-full bg-white py-4 pl-11 pr-28 text-sm shadow-sm ring-1 ring-black/5 outline-none transition placeholder:text-gris-fonce focus:shadow-lg focus:shadow-vert/10 focus:ring-2 focus:ring-vert"
      />
      <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-gris-fonce" aria-hidden />
      <button
        type="submit"
        className="press absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-vert px-5 py-2.5 text-xs font-bold text-white hover:bg-vert-fonce"
      >
        Chercher
      </button>

      {ouvert && aSugg && sugg && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/10">
          {sugg.categories.length > 0 && (
            <div className="border-b border-black/5 px-2 pb-1 pt-1">
              <p className="px-2 pb-0.5 pt-1 text-[10px] font-bold uppercase tracking-wider text-gris-fonce">
                Catégories
              </p>
              {sugg.categories.map((c) => (
                <Link
                  key={c.slug}
                  href={`/categorie/${c.slug}`}
                  onClick={() => setOuvert(false)}
                  className="flex items-center gap-2.5 rounded-xl px-2 py-2 text-sm font-semibold text-noir transition hover:bg-vert-clair hover:text-vert-fonce"
                >
                  <Tag className="size-3.5 shrink-0 text-vert" aria-hidden />
                  {c.nom}
                </Link>
              ))}
            </div>
          )}
          {sugg.produits.length > 0 && (
            <div className="px-2 pb-1 pt-1">
              <p className="px-2 pb-0.5 pt-1 text-[10px] font-bold uppercase tracking-wider text-gris-fonce">
                Articles
              </p>
              {sugg.produits.map((p) => (
                <Link
                  key={p.slug}
                  href={`/produit/${p.slug}`}
                  onClick={() => setOuvert(false)}
                  className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 text-sm font-semibold text-noir transition hover:bg-vert-clair hover:text-vert-fonce"
                >
                  <span className="truncate">{p.nom}</span>
                  {p.categorie && (
                    <span className="shrink-0 text-[10px] font-semibold text-gris-fonce">
                      {p.categorie}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
          <Link
            href={`/recherche?q=${encodeURIComponent(terme.trim())}`}
            onClick={() => {
              memoriserRecherche(terme);
              setOuvert(false);
            }}
            className="block bg-vert-clair px-4 py-2.5 text-center text-xs font-bold text-vert-fonce transition hover:bg-vert hover:text-white"
          >
            Voir tous les résultats pour « {terme.trim()} »
          </Link>
        </div>
      )}

      {terme.trim() === "" && recentes.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <History className="size-3.5 text-gris-fonce" aria-hidden />
          {recentes.map((r) => (
            <Link
              key={r}
              href={`/recherche?q=${encodeURIComponent(r)}`}
              className="rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-noir ring-1 ring-black/10 transition hover:bg-vert-clair hover:text-vert"
            >
              {r}
            </Link>
          ))}
        </div>
      )}
    </form>
  );
}
