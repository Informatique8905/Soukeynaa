import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { prixAvecPromos, promotionsActives } from "@/lib/pricing";

interface ImageJson {
  url?: string;
}

// Articles enregistrés en favoris (ids stockés côté navigateur) —
// prix remisés recalculés côté serveur comme partout ailleurs.
export async function GET(req: Request) {
  const ids = (new URL(req.url).searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 60);
  if (!ids.length) return NextResponse.json({ produits: [] });

  const prisma = getPrisma();
  const [produits, promos] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: ids }, statut: "publie" },
      orderBy: { createdAt: "desc" },
    }),
    promotionsActives(),
  ]);

  return NextResponse.json({
    produits: produits.map((p) => {
      const px = prixAvecPromos(p, promos);
      return {
        id: p.id,
        slug: p.slug,
        nom: p.nom,
        prix: p.prix,
        prixAffiche: px,
        image: (p.images as ImageJson[])?.[0]?.url ?? null,
        enPromo: px < p.prix,
        stock: p.aVariantes ? undefined : p.stock,
      };
    }),
  });
}
