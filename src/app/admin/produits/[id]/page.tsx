import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/db";
import { ProduitForm, type ProduitInitial } from "@/components/admin/ProduitForm";
import { modifierProduit } from "../actions";
import { EnTetePage, StatutProduit, lien } from "@/components/admin/ui";

interface ImageJson {
  publicId: string;
  url: string;
  alt: string;
  ordre: number;
}

export default async function ModifierProduit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const prisma = getPrisma();
  const [produit, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id: Number(id) },
      include: { variantes: true },
    }),
    prisma.category.findMany({
      where: { active: true },
      orderBy: [{ parentId: "asc" }, { ordre: "asc" }, { nom: "asc" }],
      select: { id: true, nom: true, parentId: true },
    }),
  ]);
  if (!produit) notFound();

  const initial: ProduitInitial = {
    id: produit.id,
    nom: produit.nom,
    description: produit.description,
    prix: produit.prix,
    prixReduit: produit.prixReduit,
    categorieId: produit.categorieId,
    univers: produit.univers,
    images: produit.images as unknown as ImageJson[],
    aVariantes: produit.aVariantes,
    variantes: produit.variantes.map((v) => ({
      id: v.id,
      taille: v.taille ?? undefined,
      couleur: v.couleur ?? undefined,
      sku: v.sku ?? undefined,
      stock: v.stock,
      prixReduit: v.prixReduit,
    })),
    stock: produit.stock,
    poids: produit.poids,
    statut: produit.statut,
  };

  return (
    <div className="flex flex-col gap-6">
      <EnTetePage
        surTitre={
          <Link href="/admin/produits" className={lien}>
            Produits
          </Link>
        }
        titre={
          <span className="flex flex-wrap items-center gap-3">
            {produit.nom}
            <StatutProduit statut={produit.statut} />
          </span>
        }
        description="Modifiez les informations, le stock et les photos du produit."
      />
      <ProduitForm
        categories={categories}
        initial={initial}
        action={modifierProduit.bind(null, produit.id)}
      />
    </div>
  );
}
