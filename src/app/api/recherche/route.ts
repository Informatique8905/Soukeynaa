import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

// Suggestions instantanées de la barre de recherche (CDC 7.2) : le visiteur
// qui ne connaît pas le nom d'un article est guidé vers la bonne catégorie
// ou le bon produit dès 2 caractères tapés.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ categories: [], produits: [] });

  const prisma = getPrisma();
  const filtre = { contains: q, mode: "insensitive" as const };
  const [categories, produits] = await Promise.all([
    prisma.category.findMany({
      where: { active: true, nom: filtre },
      orderBy: { nom: "asc" },
      take: 4,
      select: { slug: true, nom: true },
    }),
    prisma.product.findMany({
      where: {
        statut: "publie",
        OR: [
          { nom: filtre },
          { categorie: { nom: filtre } },
          { categorie: { parent: { nom: filtre } } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        slug: true,
        nom: true,
        categorie: { select: { nom: true } },
      },
    }),
  ]);

  return NextResponse.json({
    categories,
    produits: produits.map((p) => ({
      slug: p.slug,
      nom: p.nom,
      categorie: p.categorie.nom,
    })),
  });
}
