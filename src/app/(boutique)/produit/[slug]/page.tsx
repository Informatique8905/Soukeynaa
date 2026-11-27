import { notFound } from "next/navigation";
import Link from "next/link";
import { getPrisma } from "@/lib/db";
import { prixAvecPromos, prixEffectif, promotionsActives } from "@/lib/pricing";
import { ProductCard } from "@/components/boutique/ProductCard";
import { FicheProduit } from "@/components/boutique/FicheProduit";

interface ImageJson {
  url?: string;
  alt?: string;
}

export default async function ProduitPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const prisma = getPrisma();
  const produit = await prisma.product.findUnique({
    where: { slug },
    include: { variantes: { orderBy: { id: "asc" } }, categorie: true },
  });
  if (!produit || produit.statut !== "publie") notFound();

  const [prix, promos, candidats] = await Promise.all([
    prixEffectif(produit),
    promotionsActives(),
    prisma.product.findMany({
      where: {
        statut: "publie",
        categorieId: produit.categorieId,
        id: { not: produit.id },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);
  // Le mê public d'abord : un client qui regarde un article
  // femme voit en priorié les autres articles pour femmes.
  const similaires = candidats
    .sort(
      (a, b) =>
        Number(b.univers === produit.univers) - Number(a.univers === produit.univers)
    )
    .slice(0, 10);

  return (
    <main className="motion-safe:animate-entree">
      <nav
        aria-label="Fil d'Ariane"
        className="mx-auto flex max-w-7xl items-center gap-1 px-4 pt-4 text-xs text-gris-fonce"
      >
        <Link href="/" transitionTypes={["nav-back"]} className="transition hover:text-vert">
          Accueil
        </Link>
        <span aria-hidden="true">›</span>
        <Link
          href={`/categorie/${produit.categorie.slug}`}
          transitionTypes={["nav-back"]}
          className="transition hover:text-vert"
        >
          {produit.categorie.nom}
        </Link>
      </nav>

      <FicheProduit
        produitId={produit.id}
        nom={produit.nom}
        description={produit.description}
        categorie={produit.categorie.nom}
        prix={prix}
        prixBase={produit.prix}
        images={(produit.images as ImageJson[]) ?? []}
        aVariantes={produit.aVariantes}
        stock={produit.stock}
        variantes={produit.variantes.map((v) => ({
          id: v.id,
          taille: v.taille,
          couleur: v.couleur,
          stock: v.stock,
        }))}
      />

      {similaires.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-10">
          <h2 className="font-display text-xl font-bold tracking-tight text-noir">
            Dans la mê catégorie
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {similaires.map((p) => {
              const px = prixAvecPromos(p, promos);
              return (
                <ProductCard
                  key={p.id}
                  p={{
                    id: p.id,
                    slug: p.slug,
                    nom: p.nom,
                    prix: p.prix,
                    stock: p.aVariantes ? undefined : p.stock,
                    prixAffiche: px,
                    image: (p.images as ImageJson[])?.[0]?.url ?? null,
                    enPromo: px < p.prix,
                  }}
                />
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
