import Link from "next/link";
import { Fragment } from "react";
import { Plus } from "lucide-react";
import { getPrisma } from "@/lib/db";
import { fcfa } from "@/lib/format";
import { changerStatutProduit } from "./actions";
import {
  CarteListe,
  EnTetePage,
  Panneau,
  Pastille,
  StatutProduit,
  Vide,
  bouton,
  lien,
} from "@/components/admin/ui";
import { PRODUCT_STATUS_LABELS } from "@/lib/constants";

const FILTRES = ["", "publie", "brouillon", "desactive"] as const;

export default async function PageProduits({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>;
}) {
  const { statut } = await searchParams;
  const prisma = getPrisma();
  const tous = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      categorie: { select: { nom: true } },
      variantes: { select: { stock: true } },
    },
  });

  const stockDe = (p: (typeof tous)[number]) =>
    p.aVariantes ? p.variantes.reduce((s, v) => s + v.stock, 0) : p.stock;

  // Produit publié en rupture : visible en boutique mais invendable —
  // à traiter (réassortir ou dépublier). Remonté en tête, surligné en vert.
  const enRupture = (p: (typeof tous)[number]) =>
    p.statut === "publie" && stockDe(p) === 0;
  const nbRupture = tous.filter(enRupture).length;

  const produits = statut ? tous.filter((p) => p.statut === statut) : tous;
  produits.sort((a, b) => Number(enRupture(b)) - Number(enRupture(a)));
  const iPremierSansRupture = produits.findIndex((p) => !enRupture(p));
  const aDeuxGroupes =
    iPremierSansRupture > 0 && produits.length > iPremierSansRupture;

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

  const vide = (
    <Vide titre="Aucun produit">
      {statut
        ? "Aucun produit ne correspond à ce filtre."
        : "Créez votre premier produit pour l'afficher dans la boutique."}
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

      <div className="flex flex-wrap items-center gap-1.5">
        {nbRupture > 0 && (
          <Pastille ton="vert" className="h-9 px-3.5 text-xs font-semibold">
            {nbRupture} en rupture
          </Pastille>
        )}
        {FILTRES.map((s) => {
          const actif = statut === s || (!statut && !s);
          return (
            <Link
              key={s}
              href={s ? `/admin/produits?statut=${s}` : "/admin/produits"}
              aria-current={actif ? "page" : undefined}
              className={`inline-flex h-9 items-center rounded-lg border px-3.5 text-xs font-medium transition-colors ${
                actif
                  ? "border-vert bg-vert text-white shadow-sm"
                  : "border-border bg-white text-muted-foreground hover:border-vert/40 hover:text-foreground"
              }`}
            >
              {s ? PRODUCT_STATUS_LABELS[s] : "Tous"}
            </Link>
          );
        })}
      </div>

      {/* Mobile : cartes */}
      <div className="space-y-3 md:hidden">
        {produits.map((p, i) => {
          const stock = stockDe(p);
          return (
            <div key={p.id}>
              {aDeuxGroupes && i === iPremierSansRupture && (
                <p className="pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Sans rupture
                </p>
              )}
              <CarteListe
                className={enRupture(p) ? "border-vert/30 bg-vert-clair/50" : ""}
              >
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
            </div>
          );
        })}
        {produits.length === 0 && <CarteListe className="p-0">{vide}</CarteListe>}
      </div>

      {/* Desktop : tableau */}
      <Panneau
        titre="Catalogue"
        description={`${produits.length} produit${produits.length > 1 ? "s" : ""}`}
        corps="p-0"
        className="hidden md:block"
      >
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
                {produits.map((p, i) => {
                  const stock = stockDe(p);
                  return (
                    <Fragment key={p.id}>
                      {aDeuxGroupes && i === iPremierSansRupture && (
                        <tr aria-hidden className="sep-groupe">
                          <td colSpan={10}>Sans rupture</td>
                        </tr>
                      )}
                      <tr className={enRupture(p) ? "non-traitee" : undefined}>
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
                    </Fragment>
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
