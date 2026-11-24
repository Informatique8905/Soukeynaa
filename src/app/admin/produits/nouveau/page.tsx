import { getPrisma } from "@/lib/db";
import { ProduitForm } from "@/components/admin/ProduitForm";
import { creerProduit } from "../actions";

export default async function NouveauProduit() {
  const prisma = getPrisma();
  const categories = await prisma.category.findMany({
    where: { active: true },
    orderBy: [{ univers: "asc" }, { ordre: "asc" }],
    select: { id: true, nom: true, univers: true, parentId: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-vert">Nouveau produit</h1>
      <ProduitForm categories={categories} action={creerProduit} />
    </div>
  );
}
