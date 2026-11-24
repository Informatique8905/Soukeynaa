import Link from "next/link";
import { fcfa } from "@/lib/format";
import { cloud } from "@/lib/image";
import type { CarteProduit } from "./ProductCard";

/** Carte « offre » verte façon app : badge -X%, image ronde, défilement horizontal. */
export function DealCard({ p, categorie }: { p: CarteProduit; categorie?: string }) {
  const reduction =
    p.enPromo && p.prix > 0
      ? Math.round(((p.prix - p.prixAffiche) / p.prix) * 100)
      : 0;

  return (
    <Link
      href={`/produit/${p.slug}`}
      data-reveal="scale"
      className="lift press group relative flex w-52 shrink-0 snap-start flex-col items-center overflow-hidden rounded-3xl bg-gradient-to-br from-vert to-vert-fonce p-4 pt-5 text-center text-white shadow-md shadow-vert/20 md:w-auto"
    >
      <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-white/10 transition-transform duration-700 group-hover:scale-150" />
      {reduction > 0 && (
        <span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-1 text-xs font-extrabold text-vert shadow">
          -{reduction}%
        </span>
      )}
      <div className="relative mt-4 h-28 w-28 overflow-hidden rounded-full bg-white/20 ring-4 ring-white/30 transition-transform duration-500 group-hover:-rotate-3 group-hover:scale-105">
        {p.image ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={cloud(p.image, 300) ?? p.image}
            alt={p.nom}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-white/50">
            
          </div>
        )}
      </div>
      {categorie && (
        <p className="relative mt-3 text-[11px] uppercase tracking-wider opacity-80">
          {categorie}
        </p>
      )}
      <p className="relative mt-0.5 line-clamp-2 text-sm font-semibold leading-tight">
        {p.nom}
      </p>
      <p className="relative mt-2 text-sm">
        <span className="text-base font-extrabold">{fcfa(p.prixAffiche)}</span>
        {p.prixAffiche < p.prix && (
          <span className="ml-1.5 text-xs line-through opacity-60">
            {fcfa(p.prix)}
          </span>
        )}
      </p>
    </Link>
  );
}
