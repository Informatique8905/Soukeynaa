import { getPrisma } from "@/lib/db";
import type { Product, ProductVariant, Prisma } from "@/generated/prisma/client";

type Db = Prisma.TransactionClient | ReturnType<typeof getPrisma>;

// Prix effectif TOUJOURS recalculé côté serveur (CDC 6.6)
// Ordre : prixReduit variante > prixReduit produit > meilleure promotion active
export async function prixEffectif(
  produit: Product,
  variante?: ProductVariant | null,
  db?: Db
): Promise<number> {
  const base = produit.prix;
  if (variante?.prixReduit != null) return variante.prixReduit;
  if (produit.prixReduit != null) return produit.prixReduit;

  const prisma = db ?? getPrisma();
  const now = new Date();
  const promos = await prisma.promotion.findMany({
    where: {
      active: true,
      debut: { lte: now },
      fin: { gte: now },
      OR: [
        { portee: "produits", produitIds: { has: produit.id } },
        { portee: "categories", categorieIds: { has: produit.categorieId } },
      ],
    },
  });

  let meilleur = base;
  for (const p of promos) {
    const reduit =
      p.type === "pourcentage"
        ? Math.round(base * (1 - p.valeur / 100))
        : base - p.valeur;
    if (reduit < meilleur && reduit >= 0) meilleur = reduit;
  }
  return meilleur;
}

// ===== Variante batch : une seule requête promo par page, calcul en mémoire =====

export type PromoActive = Awaited<ReturnType<typeof promotionsActives>>[number];

/** Toutes les promotions en cours — une seule requête à réutiliser pour toute la page. */
export async function promotionsActives(db?: Db) {
  const prisma = db ?? getPrisma();
  const now = new Date();
  return prisma.promotion.findMany({
    where: { active: true, debut: { lte: now }, fin: { gte: now } },
    select: {
      type: true,
      valeur: true,
      portee: true,
      produitIds: true,
      categorieIds: true,
    },
  });
}

/** Même règle que prixEffectif mais sans requête : la liste des promos est fournie. */
export function prixAvecPromos(
  produit: {
    id: number;
    prix: number;
    prixReduit: number | null;
    categorieId: number;
  },
  promos: PromoActive[],
  variante?: { prixReduit: number | null } | null
): number {
  if (variante?.prixReduit != null) return variante.prixReduit;
  if (produit.prixReduit != null) return produit.prixReduit;

  let meilleur = produit.prix;
  for (const p of promos) {
    const concerne =
      (p.portee === "produits" && p.produitIds.includes(produit.id)) ||
      (p.portee === "categories" && p.categorieIds.includes(produit.categorieId));
    if (!concerne) continue;
    const reduit =
      p.type === "pourcentage"
        ? Math.round(produit.prix * (1 - p.valeur / 100))
        : produit.prix - p.valeur;
    if (reduit < meilleur && reduit >= 0) meilleur = reduit;
  }
  return meilleur;
}

// Stock disponible selon le produit (simple ou variante)
export function stockDisponible(
  produit: Pick<Product, "aVariantes" | "stock">,
  variante?: Pick<ProductVariant, "stock"> | null
): number {
  return produit.aVariantes ? (variante?.stock ?? 0) : produit.stock;
}
