import Link from "next/link";
import { getPrisma } from "@/lib/db";
import { ProduitForm } from "@/components/admin/ProduitForm";
import { EnTetePage, lien } from "@/components/admin/ui";
import { creerProduit } from "../actions";

export default async function NouveauProduit() {
  const prisma = getPrisma();
  const categories = await prisma.category.findMany({
    where: { active: true },
    orderBy: [{ parentId: "asc" }, { ordre: "asc" }, { nom: "asc" }],
    select: { id: true, nom: true, parentId: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <EnTetePage
        surTitre={
          <Link href="/admin/produits" className={lien}>
            Produits
          </Link>
        }
        titre="Nouveau produit"
        description="Le produit reste en brouillon tant qu'il n'est pas publié."
      />
      <ProduitForm categories={categories} action={creerProduit} />
    </div>
  );
}
