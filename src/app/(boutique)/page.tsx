import Link from "next/link";
import { HeroPromo } from "@/components/boutique/HeroPromo";
import { getPrisma } from "@/lib/db";
import { prixAvecPromos, promotionsActives, type PromoActive } from "@/lib/pricing";
import { bannieresDe } from "@/lib/settings";
import { cloud } from "@/lib/image";
import { auth } from "@/auth";
import { ProductCard, type CarteProduit } from "@/components/boutique/ProductCard";
import { DealCard } from "@/components/boutique/DealCard";

const AVANTAGES = [
  "Livraison dans tout Abidjan",
  "Paiement à la livraison",
  "Wave · Orange Money · MTN · Moov",
  "Paiement en ligne sécurisé",
  "Retours & échanges faciles",
];

interface ImageJson {
  url?: string;
  alt?: string;
}

type ProduitBase = {
  id: number;
  slug: string;
  nom: string;
  prix: number;
  prixReduit: number | null;
  images: unknown;
  categorieId: number;
};

function versCartes(
  produits: ProduitBase[],
  promos: PromoActive[]
): CarteProduit[] {
  return produits.map((p) => {
    const prix = prixAvecPromos(p, promos);
    return {
      slug: p.slug,
      nom: p.nom,
      prix: p.prix,
      prixAffiche: prix,
      image: (p.images as ImageJson[])?.[0]?.url ?? null,
      enPromo: prix < p.prix,
    };
  });
}

export default async function Accueil() {
  const prisma = getPrisma();
  const [session, categories, nouveautes, promos, actives, settings] =
    await Promise.all([
    auth(),
    prisma.category.findMany({
      where: { parentId: null, active: true },
      orderBy: { ordre: "asc" },
      take: 8,
      include: {
        produits: {
          where: { statut: "publie" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { images: true },
        },
      },
    }),
    prisma.product.findMany({
      where: { statut: "publie" },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.product.findMany({
      where: { statut: "publie", prixReduit: { not: null } },
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: { categorie: { select: { nom: true } } },
    }),
    promotionsActives(),
    prisma.settings.findUnique({ where: { cle: "boutique" } }),
  ]);

  const prenom = session?.user?.name?.split(" ")[0] ?? null;

  const cartesPromos = versCartes(promos, actives);
  const cartesNouveautes = versCartes(nouveautes, actives);

  // Cartes catégories : image du dernier produit illustré
  const cartesCategories = categories.map((cat) => ({
    slug: cat.slug,
    nom: cat.nom,
    image:
      (cat.produits[0]?.images as ImageJson[] | undefined)?.[0]?.url ?? null,
  }));

  // Réduction max affichée sur la bannière
  const maxReduc = cartesPromos.reduce(
    (m, p) =>
      p.enPromo && p.prix > 0
        ? Math.max(m, Math.round(((p.prix - p.prixAffiche) / p.prix) * 100))
        : m,
    0
  );
  const visuelPromo = cartesPromos.find((p) => p.image)?.image ?? null;

  // Bannières administrables (CDC 7.1)
  const bannieres = bannieresDe(settings ?? { bannieres: [] });

  return (
    <main className="mx-auto max-w-7xl px-4 pb-10">
      {/* Salutation */}
      <div className="pt-5" data-reveal="left">
        <p className="text-sm text-gris-fonce">
          {prenom ? `Bonjour, ${prenom}` : "Bienvenue"}
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight text-noir">
          {prenom ? "Heureux de vous revoir" : "Chez SOUKEYNA"}
        </h1>
      </div>

      {/* Pilule de recherche */}
      <Link
        href="/recherche"
        data-reveal
        className="press group mt-4 flex items-center gap-3 rounded-full bg-white px-4 py-3.5 text-sm text-gris-fonce shadow-sm ring-1 ring-black/5 hover:ring-vert/40"
      >
        <span className="flex-1">Rechercher un article, une catégorie…</span>
        <span className="hidden rounded-full bg-vert-clair px-2.5 py-1 text-[11px] font-semibold text-vert sm:inline">
          Rechercher
        </span>
      </Link>

      {/* Entrées par public : repère immédiat sans connaîre les noms (CDC 7.2) */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        {[
          { u: "femmes", label: "Femmes" },
          { u: "hommes", label: "Hommes" },
          { u: "enfants", label: "Enfants" },
          { u: "accessoires", label: "Accessoires" },
        ].map((p) => (
          <Link
            key={p.u}
            href={`/recherche?u=${p.u}`}
            data-reveal
            className="press rounded-2xl bg-white px-1 py-3 text-center text-xs font-bold text-noir shadow-sm ring-1 ring-black/5 transition hover:text-vert hover:ring-vert/40"
          >
            {p.label}
          </Link>
        ))}
      </div>

      {/* Bannières administrables (CDC 7.1) */}
      {bannieres.length > 0 && (
        <section
          aria-label="Bannières"
          className="no-scrollbar mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1"
        >
          {bannieres.map((b, i) => {
            const img = (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={cloud(b.url, 1200) ?? b.url}
                alt={b.titre ?? `Bannière ${i + 1}`}
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                className="h-full w-full object-cover"
              />
            );
            return b.lien ? (
              <Link
                key={i}
                href={b.lien}
                data-reveal
                className="zoom-scroll lift press relative h-36 w-full min-w-0 shrink-0 snap-start overflow-hidden rounded-3xl shadow-sm sm:h-44"
              >
                {img}
              </Link>
            ) : (
              <div
                key={i}
                data-reveal
                className="zoom-scroll relative h-36 w-full min-w-0 shrink-0 snap-start overflow-hidden rounded-3xl shadow-sm sm:h-44"
              >
                {img}
              </div>
            );
          })}
        </section>
      )}

      {/* Bannière promo animée (SVG) */}
      {cartesPromos.length > 0 && (
        <HeroPromo
          reduction={maxReduc}
          visuel={visuelPromo ? (cloud(visuelPromo, 360) ?? visuelPromo) : null}
        />
      )}

      {/* Réassurance — défile en continu */}
      <div className="relative mt-4 overflow-hidden rounded-2xl bg-white py-2.5 shadow-sm ring-1 ring-black/5 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
        <div className="defile flex w-max text-xs font-semibold text-noir">
          {[...AVANTAGES, ...AVANTAGES].map((a, i) => (
            <span key={i} className="whitespace-nowrap pr-8" aria-hidden={i >= AVANTAGES.length}>
              {a} <span className="ml-6 text-vert">•</span>
            </span>
          ))}
        </div>
      </div>

      {/* Catégories en cartes illustrées */}
      {cartesCategories.length > 0 && (
        <section className="mt-8">
          <h2 data-reveal="left" className="text-lg font-extrabold text-noir">Nos catégories</h2>
          <div className="no-scrollbar mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:overflow-visible xl:grid-cols-8">
            {cartesCategories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/categorie/${cat.slug}`}
                data-reveal
                className="zoom-scroll lift press group relative h-44 w-36 shrink-0 snap-start overflow-hidden rounded-3xl bg-vert shadow-sm md:h-48 md:w-auto"
              >
                {cat.image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={cloud(cat.image, 400) ?? cat.image}
                    alt={cat.nom}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-110"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-vert to-vert-fonce" />
                )}
                <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-1 bg-gradient-to-t from-noir/80 via-noir/30 to-transparent px-3 pb-3 pt-12 text-sm font-bold text-white">
                  <span className="leading-tight">{cat.nom}</span>

                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Offres du moment */}
      {cartesPromos.length > 0 && (
        <section id="offres" className="mt-10 scroll-mt-20">
          <div data-reveal="left" className="flex items-baseline justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-noir">
                Offres du moment
              </h2>
              <p className="mt-0.5 text-xs text-gris-fonce">
                Les prix fondent, le style reste
              </p>
            </div>
            <Link
              href="/recherche?promo=1"
              className="press group inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-vert hover:bg-vert-clair"
            >
              Tout voir →
            </Link>
          </div>
          <div className="no-scrollbar mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 pt-1 md:grid md:grid-cols-4 md:overflow-visible xl:grid-cols-6">
            {cartesPromos.map((p, i) => (
              <DealCard key={p.slug} p={p} categorie={promos[i]?.categorie.nom} />
            ))}
          </div>
        </section>
      )}

      {/* Nouveautés */}
      {cartesNouveautes.length > 0 && (
        <section className="mt-10">
          <div data-reveal="left" className="flex items-baseline justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-noir">
                Fraîchement arrivés
              </h2>
              <p className="mt-0.5 text-xs text-gris-fonce">
                Les dernières pépites, à découvrir avant tout le monde
              </p>
            </div>
            <Link
              href="/recherche"
              className="press group inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-vert hover:bg-vert-clair"
            >
              Tout voir →
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {cartesNouveautes.map((p) => (
              <ProductCard key={p.slug} p={p} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
