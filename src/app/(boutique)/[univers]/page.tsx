import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/db";
import { EnTetePage } from "@/components/boutique/EnTetePage";
import { EtatVide } from "@/components/motion/EtatVide";
import { prixAvecPromos, promotionsActives } from "@/lib/pricing";
import { ProductCard } from "@/components/boutique/ProductCard";
import { Univers } from "@/generated/prisma/enums";

const LABELS: Record<string, string> = {
  enfants: "Enfants",
  hommes: "Hommes",
  femmes: "Femmes",
  accessoires: "Accessoires",
};

interface ImageJson {
  url?: string;
}

export default async function UniversPage({
  params,
}: {
  params: Promise<{ univers: string }>;
}) {
  const { univers } = await params;
  if (!Object.keys(LABELS).includes(univers)) notFound();
  const prisma = getPrisma();

  const categories = await prisma.category.findMany({
    where: { univers: univers as Univers, parentId: null, active: true },
    orderBy: { ordre: "asc" },
  });
  const catIds = await prisma.category
    .findMany({
      where: {
        univers: univers as Univers,
        active: true,
        OR: [
          { id: { in: categories.map((c) => c.id) } },
          { parentId: { in: categories.map((c) => c.id) } },
        ],
      },
      select: { id: true },
    })
    .then((r) => r.map((c) => c.id));

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
        titre={LABELS[univers]}
        sousTitre="Nos dernières pièces, sélectionnées pour vous"
        compteur={produits.length}
        ariane={[{ href: "/", label: "Accueil" }]}
        puces={categories.map((c) => ({ href: `/categorie/${c.slug}`, label: c.nom }))}
      />

      {produits.length === 0 ? (
        <EtatVide
          dessin="boite"
          titre="Rien ici pour le moment"
          texte="Les nouveautés de cet univers arrivent bientôt."
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
