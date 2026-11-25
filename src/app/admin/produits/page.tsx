import Link from "next/link";
import { Plus } from "lucide-react";
import { getPrisma } from "@/lib/db";
import { fcfa } from "@/lib/format";
import { changerStatutProduit } from "./actions";
import {
  CarteListe,
  EnTetePage,
  Panneau,
  StatutProduit,
  Vide,
  bouton,
  lien,
} from "@/components/admin/ui";

export default async function PageProduits() {
  const prisma = getPrisma();
  const produits = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      categorie: { select: { nom: true } },
      variantes: { select: { stock: true } },
    },
  });

  const actions = (p: { id: number; statut: string }) => (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {p.statut !== "publie" && (
        <form action={changerStatutProduit.bind(null, p.id, "publie")}>
          <button className={bouton("secondaire", "sm")}>Publier</button>
        </form>
      )}
      {p.statut === "publie" && (
        <form action={changerStatutProduit.bind(null, p.id, "brouillon")}>
          <button className={bouton("secondaire", "sm")}>Dépublier</button>
        </form>
      )}
      {p.statut !== "desactive" && (
        <form action={changerStatutProduit.bind(null, p.id, "desactive")}>
          <button className={bouton("danger", "sm")}>Désactiver</button>
        </form>
      )}
    </div>
  );

  const prix = (p: { prix: number; prixReduit: number | null }) => (
    <span className="tabular-nums">
      <span className="font-semibold">{fcfa(p.prixReduit ?? p.prix)}</span>
      {p.prixReduit && (
        <span className="ml-1.5 text-xs text-muted-foreground line-through">
          {fcfa(p.prix)}
        </span>
      )}
    </span>
  );

  const stockDe = (p: (typeof produits)[number]) =>
    p.aVariantes ? p.variantes.reduce((s, v) => s + v.stock, 0) : p.stock;

  const vide = (
    <Vide titre="Aucun produit">
      Créez votre premier produit pour l&apos;afficher dans la boutique.
    </Vide>
  );

  return (
    <div className="flex flex-col gap-6">
      <EnTetePage
        titre="Produits"
        description={`${produits.length} produit${produits.length > 1 ? "s" : ""} au catalogue`}
        actions={
          <Link href="/admin/produits/nouveau" className={bouton("primaire")}>
            <Plus />
            Nouveau produit
          </Link>
        }
      />

      {/* Mobile : cartes */}
      <div className="space-y-3 md:hidden">
        {produits.map((p) => {
          const stock = stockDe(p);
          return (
            <CarteListe key={p.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/admin/produits/${p.id}`} className={`${lien} block truncate`}>
                    {p.nom}
                  </Link>
                  <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                    {p.categorie.nom}
                  </p>
                </div>
                <StatutProduit statut={p.statut} />
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                {prix(p)}
                <span className={`text-xs ${stock === 0 ? "font-semibold text-destructive" : "text-muted-foreground"}`}>
                  {stock === 0 ? "Rupture" : `${stock} en stock`}
                </span>
              </div>
              <div className="mt-3 border-t border-border pt-3">{actions(p)}</div>
            </CarteListe>
          );
        })}
        {produits.length === 0 && <CarteListe className="p-0">{vide}</CarteListe>}
      </div>

      {/* Desktop : tableau */}
      <Panneau corps="p-0" className="hidden md:block">
        {produits.length === 0 ? (
          vide
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Catégorie</th>
                  <th className="num">Prix</th>
                  <th className="num">Stock</th>
                  <th>Statut</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {produits.map((p) => {
                  const stock = stockDe(p);
                  return (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/admin/produits/${p.id}`} className={lien}>
                          {p.nom}
                        </Link>
                        {p.aVariantes && (
                          <span className="block text-xs text-muted-foreground">
                            {p.variantes.length} variante{p.variantes.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </td>
                      <td className="text-muted-foreground">
                        {p.categorie.nom}
                      </td>
                      <td className="num">{prix(p)}</td>
                      <td className={`num ${stock === 0 ? "font-semibold text-destructive" : ""}`}>
                        {stock === 0 ? "Rupture" : stock}
                      </td>
                      <td>
                        <StatutProduit statut={p.statut} />
                      </td>
                      <td>{actions(p)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panneau>
    </div>
  );
}
