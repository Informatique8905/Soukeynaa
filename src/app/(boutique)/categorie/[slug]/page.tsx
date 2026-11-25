import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/db";
import { EnTetePage } from "@/components/boutique/EnTetePage";
import { EtatVide } from "@/components/motion/EtatVide";
import { prixAvecPromos, promotionsActives } from "@/lib/pricing";
import { ProductCard } from "@/components/boutique/ProductCard";

interface ImageJson {
  url?: string;
}

export default async function CategoriePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const prisma = getPrisma();
  const categorie = await prisma.category.findUnique({ where: { slug } });
  if (!categorie || !categorie.active) notFound();

  const enfants = await prisma.category.findMany({
    where: { parentId: categorie.id, active: true },
    orderBy: { ordre: "asc" },
  });
  const catIds = [categorie.id, ...enfants.map((e) => e.id)];

  const [produits, promos] = await Promise.all([
    prisma.product.findMany({
      where: { statut: "publie", categorieId: { in: catIds } },
      orderBy: { createdAt: "desc" },
    }),
    promotionsActives(),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <EnTetePage
        titre={categorie.nom}
        compteur={produits.length}
        ariane={[{ href: "/", label: "Accueil" }]}
        puces={enfants.map((c) => ({ href: `/categorie/${c.slug}`, label: c.nom }))}
      />

      {produits.length === 0 ? (
        <EtatVide
          dessin="boite"
          titre="Aucun produit dans cette catégorie"
          texte="Explorez les autres catégories en attendant."
          action={{ href: "/", label: "Retour à l'accueil" }}
        />
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
      )}
    </main>
  );
}
