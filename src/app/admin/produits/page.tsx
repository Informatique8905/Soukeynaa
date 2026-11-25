import Link from "next/link";
import { getPrisma } from "@/lib/db";
import { fcfa } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { changerStatutProduit } from "./actions";
import {
  PRODUCT_STATUS_LABELS,
  PRODUCT_BADGE_VARIANT,
  type ProductStatus,
} from "@/lib/constants";

export default async function PageProduits() {
  const prisma = getPrisma();
  const produits = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      categorie: { select: { nom: true } },
      variantes: { select: { stock: true } },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-vert">Produits</h1>
        <Link
          href="/admin/produits/nouveau"
          className="rounded-full bg-vert px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-vert-fonce"
        >
          + Nouveau produit
        </Link>
      </div>

      <div className="overflow-x-auto">
      <table className="mt-6 w-full border bg-white text-sm">
        <thead className="bg-gris text-left">
          <tr>
            <th className="p-2">Produit</th>
            <th className="p-2">Univers / Catégorie</th>
            <th className="p-2">Prix</th>
            <th className="p-2">Stock</th>
            <th className="p-2">Statut</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {produits.map((p) => {
            const stock = p.aVariantes
              ? p.variantes.reduce((s, v) => s + v.stock, 0)
              : p.stock;
            return (
              <tr key={p.id} className="border-t">
                <td className="p-2">
                  <Link
                    href={`/admin/produits/${p.id}`}
                    className="font-medium text-vert underline"
                  >
                    {p.nom}
                  </Link>
                </td>
                <td className="p-2">
                  {p.univers} / {p.categorie.nom}
                </td>
                <td className="p-2">
                  {fcfa(p.prixReduit ?? p.prix)}
                  {p.prixReduit && (
                    <span className="ml-1 text-xs line-through opacity-50">
                      {fcfa(p.prix)}
                    </span>
                  )}
                </td>
                <td className={`p-2 ${stock === 0 ? "font-bold text-red-600" : ""}`}>
                  {stock}
                </td>
                <td className="p-2">
                  <Badge variant={PRODUCT_BADGE_VARIANT[p.statut as ProductStatus]}>
                    {PRODUCT_STATUS_LABELS[p.statut as ProductStatus]}
                  </Badge>
                </td>
                <td className="space-x-2 p-2 text-xs">
                  {p.statut !== "publie" && (
                    <form
                      className="inline"
                      action={changerStatutProduit.bind(null, p.id, "publie")}
                    >
                      <button className="text-green-700 underline">
                        Publier
                      </button>
                    </form>
                  )}
                  {p.statut === "publie" && (
                    <form
                      className="inline"
                      action={changerStatutProduit.bind(
                        null,
                        p.id,
                        "brouillon"
                      )}
                    >
                      <button className="text-orange-600 underline">
                        Dépublier
                      </button>
                    </form>
                  )}
                  {p.statut !== "desactive" && (
                    <form
                      className="inline"
                      action={changerStatutProduit.bind(
                        null,
                        p.id,
                        "desactive"
                      )}
                    >
                      <button className="text-red-600 underline">
                        Désactiver
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            );
          })}
          {produits.length === 0 && (
            <tr>
              <td colSpan={6} className="p-4 text-center opacity-60">
                Aucun produit — créez le premier.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
