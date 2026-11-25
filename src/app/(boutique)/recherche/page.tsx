import Link from "next/link";
import { EtatVide } from "@/components/motion/EtatVide";
import { getPrisma } from "@/lib/db";
import { prixAvecPromos, promotionsActives } from "@/lib/pricing";
import { UNIVERSES, type Universe } from "@/lib/constants";
import { ProductCard } from "@/components/boutique/ProductCard";

export const metadata = { title: "Recherche" };

interface ImageJson {
  url?: string;
}

const RACCOURCIS: { slug: Universe; label: string }[] = [
  { slug: "femmes", label: "Femmes" },
  { slug: "hommes", label: "Hommes" },
  { slug: "enfants", label: "Enfants" },
  { slug: "accessoires", label: "Accessoires" },
];

export default async function RecherchePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; promo?: string; u?: string }>;
}) {
  const { q, promo, u } = await searchParams;
  const terme = (q ?? "").trim();
  const enPromo = promo === "1";
  const univers = UNIVERSES.includes(u as Universe) ? (u as Universe) : undefined;
  const prisma = getPrisma();

  const promos = await promotionsActives();
  const produits =
    terme || enPromo || univers
      ? await prisma.product.findMany({
          where: {
            statut: "publie",
            ...(univers ? { univers } : {}),
            ...(enPromo ? { prixReduit: { not: null } } : {}),
            ...(terme
              ? {
                  OR: [
                    { nom: { contains: terme, mode: "insensitive" } },
                    { description: { contains: terme, mode: "insensitive" } },
                  ],
                }
              : {}),
          },
          orderBy: { createdAt: "desc" },
          take: 48,
        })
      : [];

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <h1 data-reveal="left" className="text-2xl font-extrabold tracking-tight text-noir">
        Recherche
      </h1>

      {/* Pilule de recherche façon app */}
      <form action="/recherche" data-reveal className="group relative mt-4">
        {enPromo && <input type="hidden" name="promo" value="1" />}
        <input
          name="q"
          type="search"
          autoFocus
          defaultValue={terme}
          placeholder="Un article, une catégorie, une couleur…"
          className="w-full rounded-full bg-white py-4 pl-11 pr-28 text-sm shadow-sm ring-1 ring-black/5 outline-none transition placeholder:text-gris-fonce focus:shadow-lg focus:shadow-vert/10 focus:ring-2 focus:ring-vert"
        />
        <button
          type="submit"
          className="press absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-vert px-5 py-2.5 text-xs font-bold text-white hover:bg-vert-fonce"
        >
          Chercher
        </button>
      </form>

      {/* Raccourcis */}
      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
        <Link
          href={(() => {
            const params = new URLSearchParams();
            if (!enPromo) params.set("promo", "1");
            if (univers) params.set("u", univers);
            if (terme) params.set("q", terme);
            const qs = params.toString();
            return qs ? `/recherche?${qs}` : "/recherche";
          })()}
          className={`press flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold ${
            enPromo
              ? "bg-vert text-white shadow-md shadow-vert/25"
              : "bg-white text-noir ring-1 ring-black/10 hover:bg-vert-clair hover:text-vert"
          }`}
        >
          En promotion
        </Link>
        {RACCOURCIS.map((r) => {
          const actif = univers === r.slug;
          const params = new URLSearchParams();
          if (!actif) params.set("u", r.slug);
          if (enPromo) params.set("promo", "1");
          if (terme) params.set("q", terme);
          const qs = params.toString();
          return (
            <Link
              key={r.slug}
              href={qs ? `/recherche?${qs}` : "/recherche"}
              className={`press shrink-0 rounded-full px-4 py-2 text-xs font-semibold ${
                actif
                  ? "bg-vert text-white shadow-md shadow-vert/25"
                  : "bg-white text-noir ring-1 ring-black/10 hover:bg-vert-clair hover:text-vert"
              }`}
            >
              {r.label}
            </Link>
          );
        })}
      </div>

      {/* Résultats */}
      {terme || enPromo || univers ? (
        produits.length > 0 ? (
          <>
            <p className="mt-5 text-sm text-gris-fonce">
              {produits.length} résultat{produits.length > 1 ? "s" : ""}
              {terme ? ` pour « ${terme} »` : enPromo ? " en promotion" : ""}
              {univers ? ` · ${RACCOURCIS.find((r) => r.slug === univers)?.label ?? univers}` : ""}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {produits.map((p) => {
                const prix = prixAvecPromos(p, promos);
                return (
                  <ProductCard
                    key={p.id}
                    p={{
                      slug: p.slug,
                      nom: p.nom,
                      prix: p.prix,
                      prixAffiche: prix,
                      image: (p.images as ImageJson[])?.[0]?.url ?? null,
                      enPromo: prix < p.prix,
                    }}
                  />
                );
              })}
            </div>
          </>
        ) : (
          <EtatVide
            dessin="loupe"
            titre="Aucun résultat"
            texte="Essayez un autre mot ou un autre univers — une couleur, un type d'article…"
            action={{ href: "/", label: "Voir toute la boutique" }}
          />
        )
      ) : (
        <EtatVide
          dessin="loupe"
          titre="Que cherchez-vous aujourd'hui ?"
          texte="Tapez un mot ou touchez un raccourci ci-dessus."
        />
      )}
    </main>
  );
}
