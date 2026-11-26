import Link from "next/link";
import { EtatVide } from "@/components/motion/EtatVide";
import { getPrisma } from "@/lib/db";
import { prixAvecPromos, promotionsActives } from "@/lib/pricing";
import { UNIVERSES, type Universe } from "@/lib/constants";
import { ProductCard } from "@/components/boutique/ProductCard";
import { BarreRecherche } from "@/components/boutique/BarreRecherche";

export const metadata = { title: "Recherche" };

interface ImageJson {
  url?: string;
}

// Un accessoire se porte par tous : il remonte aussi sous Femmes et Hommes
// dans la recherche (CDC 4.5, articles communs aux deux publics).
const PUBLICS_FILTRE: Record<Universe, Universe[]> = {
  femmes: ["femmes", "accessoires"],
  hommes: ["hommes", "accessoires"],
  enfants: ["enfants"],
  accessoires: ["accessoires"],
};

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
  // Catégories proposées quand rien n'a encore été tapé : autre
  // porte d'entrée pour qui ne connaî pas les noms d'articles.
  const catVisites =
    terme || enPromo || univers
      ? []
      : await prisma.category.findMany({
          where: { active: true },
          orderBy: { ordre: "asc" },
          take: 10,
          select: {
            slug: true,
            nom: true,
            _count: { select: { produits: { where: { statut: "publie" } } } },
          },
        });
  const produits =
    terme || enPromo || univers
      ? await prisma.product.findMany({
          where: {
            statut: "publie",
            ...(univers ? { univers: { in: PUBLICS_FILTRE[univers] } } : {}),
            ...(enPromo ? { prixReduit: { not: null } } : {}),
            ...(terme
              ? {
                  OR: [
                    { nom: { contains: terme, mode: "insensitive" } },
                    { description: { contains: terme, mode: "insensitive" } },
                    { categorie: { nom: { contains: terme, mode: "insensitive" } } },
                    { categorie: { parent: { nom: { contains: terme, mode: "insensitive" } } } },
                    { variantes: { some: { couleur: { contains: terme, mode: "insensitive" } } } },
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

      {/* Pilule de recherche avec suggestions instantanées */}
      <BarreRecherche initial={terme} enPromo={enPromo} />

      {/* Raccourcis : barre sticky — collée sous l'en-tête, elle remonte
          en haut quand l'en-tête se masque au scroll (.pilules-sticky) */}
      <div className="pilules-sticky no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto bg-blanc-casse/95 px-4 py-2 backdrop-blur">
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
            texte="Essayez un autre mot : une couleur, un type d'article…"
            action={{ href: "/", label: "Voir toute la boutique" }}
          />
        )
      ) : (
        <>
          {catVisites.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-semibold text-noir">
                Ou explorez une catégorie
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {catVisites.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/categorie/${c.slug}`}
                    className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-noir ring-1 ring-black/10 transition hover:bg-vert-clair hover:text-vert"
                  >
                    {c.nom}
                    <span className="ml-1.5 text-gris-fonce">
                      {c._count.produits}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          <div className="mt-6">
            <EtatVide
              dessin="loupe"
              titre="Que cherchez-vous aujourd'hui ?"
              texte="Tapez un mot ou touchez un raccourci ci-dessus."
            />
          </div>
        </>
      )}
    </main>
  );
}
