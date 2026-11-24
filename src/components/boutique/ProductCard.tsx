import Link from "next/link";
import { fcfa } from "@/lib/format";
import { cloud } from "@/lib/image";

export interface CarteProduit {
  slug: string;
  nom: string;
  prix: number;
  prixAffiche: number;
  image: string | null;
  enPromo: boolean;
}

export function ProductCard({ p }: { p: CarteProduit }) {
  const reduction =
    p.enPromo && p.prix > 0
      ? Math.round(((p.prix - p.prixAffiche) / p.prix) * 100)
      : 0;

  return (
    <Link
      href={`/produit/${p.slug}`}
      data-reveal
      className="lift press group block rounded-3xl bg-white p-2 shadow-sm ring-1 ring-black/5"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-[1.25rem] bg-gris">
        {p.image ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={cloud(p.image, 500) ?? p.image}
            alt={p.nom}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.07]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-noir opacity-20">
            
          </div>
        )}
        {reduction > 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-vert px-2.5 py-1 text-[11px] font-extrabold text-white shadow-md shadow-vert/30">
            -{reduction}%
          </span>
        )}
        <span className="absolute bottom-2 right-2 grid size-9 translate-y-2 place-items-center rounded-full bg-white/95 text-noir opacity-0 shadow-md backdrop-blur transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
          
        </span>
      </div>
      <div className="px-1.5 pb-1.5 pt-2.5">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-noir">
          {p.nom}
        </p>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-[15px] font-extrabold text-vert">{fcfa(p.prixAffiche)}</span>
          {p.prixAffiche < p.prix && (
            <span className="text-xs text-gris-fonce line-through">{fcfa(p.prix)}</span>
          )}
        </p>
      </div>
    </Link>
  );
}
