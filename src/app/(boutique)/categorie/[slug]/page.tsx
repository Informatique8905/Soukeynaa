import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/db";
import { EnTetePage } from "@/components/boutique/EnTetePage";
import { EtatVide } from "@/components/motion/EtatVide";
import { prixAvecPromos, promotionsActives } from "@/lib/pricing";
import { ProductCard } from "@/components/boutique/ProductCard";
import type { Universe } from "@/lib/constants";

interface ImageJson {
  url?: string;
}

// Sections par public : dans une même catégorie (ex. Chaussures), le client
// repère tout de suite ce qui est pour femmes, hommes, enfants ou unisexe
// (CDC 4.5 — les accessoires sont portés par tous, 7.2 — navigation).
const SECTIONS: { u: Universe; label: string }[] = [
  { u: "femmes", label: "Pour femmes" },
  { u: "hommes", label: "Pour hommes" },
  { u: "enfants", label: "Pour enfants" },
  { u: "accessoires", label: "Pour tous" },
];

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

  const groupes = SECTIONS.map((s) => ({
    label: s.label,
    liste: produits.filter((p) => p.univers === s.u),
  })).filter((g) => g.liste.length > 0);
  // Une seule section remplie = grille simple, sans titre superflu.
  const sections = groupes.length > 1 ? groupes : [{ label: null, liste: produits }];

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
        sections.map((g, i) => (
          <section key={g.label ?? "unique"}>
            {g.label && (
              <h2
                className={`${i === 0 ? "mt-5" : "mt-9"} text-lg font-extrabold tracking-tight text-noir`}
              >
                {g.label}
                <span className="ml-2 text-sm font-semibold text-gris-fonce">
                  {g.liste.length}
                </span>
              </h2>
            )}
            <div
              className={`${g.label ? "mt-3" : "mt-5"} grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`}
            >
              {g.liste.map((p) => {
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
          </section>
        ))
      )}
    </main>
  );
}
