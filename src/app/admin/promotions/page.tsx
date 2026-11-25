import { getPrisma } from "@/lib/db";
import { dateHeureFr } from "@/lib/format";
import { creerPromotion, basculerPromotion } from "./actions";
import {
  CarteListe,
  Champ,
  EnTetePage,
  Panneau,
  Pastille,
  Vide,
  bouton,
  champ,
} from "@/components/admin/ui";

export default async function PagePromotions() {
  const prisma = getPrisma();
  const [promotions, produits, categories] = await Promise.all([
    prisma.promotion.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.product.findMany({
      where: { statut: { not: "desactive" } },
      select: { id: true, nom: true },
      orderBy: { nom: "asc" },
    }),
    prisma.category.findMany({
      select: { id: true, nom: true, univers: true },
      orderBy: { nom: "asc" },
    }),
  ]);
  const now = new Date();

  type Promo = (typeof promotions)[number];

  const etat = (p: Promo) => {
    if (!p.active) return <Pastille ton="rouge">Arrêtée</Pastille>;
    if (p.debut > now) return <Pastille ton="bleu">Programmée</Pastille>;
    if (p.fin < now) return <Pastille ton="gris">Terminée</Pastille>;
    return <Pastille ton="vert">En cours</Pastille>;
  };

  const reduction = (p: Promo) =>
    p.type === "pourcentage" ? `-${p.valeur} %` : `-${p.valeur} FCFA`;

  const portee = (p: Promo) => {
    const n = (p.portee === "produits" ? p.produitIds : p.categorieIds).length;
    return `${n} ${p.portee === "produits" ? "produit" : "catégorie"}${n > 1 ? "s" : ""}`;
  };

  const bascule = (p: Promo) => (
    <form action={basculerPromotion.bind(null, p.id)}>
      <button className={bouton(p.active ? "secondaire" : "primaire", "sm")}>
        {p.active ? "Arrêter" : "Réactiver"}
      </button>
    </form>
  );

  const vide = (
    <Vide titre="Aucune promotion">
      Les soldes et ventes flash créées apparaîtront ici.
    </Vide>
  );

  return (
    <div className="flex flex-col gap-6">
      <EnTetePage
        titre="Promotions"
        description="Soldes, réductions ponctuelles et ventes flash — pas de codes promo (CDC 6.4)."
      />

      <Panneau titre="Nouvelle promotion" description="Les champs marqués * sont obligatoires">
        <form action={creerPromotion} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Champ label="Nom *" className="sm:col-span-2">
            <input name="nom" required className={champ} placeholder="Ex. Soldes de fin d'année" />
          </Champ>
          <Champ label="Type *">
            <select name="type" required className={champ}>
              <option value="pourcentage">Pourcentage (%)</option>
              <option value="montant">Montant (FCFA)</option>
            </select>
          </Champ>
          <Champ label="Valeur *">
            <input name="valeur" type="number" min={1} required className={champ} />
          </Champ>
          <Champ label="Portée *">
            <select name="portee" required className={champ}>
              <option value="produits">Produits</option>
              <option value="categories">Catégories</option>
            </select>
          </Champ>
          <Champ
            label="IDs ciblés *"
            aide="Séparés par des virgules — voir la référence ci-dessous"
            className="lg:col-span-3"
          >
            <input
              name="cibleIds"
              required
              placeholder={produits.slice(0, 3).map((p) => p.id).join(",")}
              className={champ}
            />
          </Champ>
          <Champ label="Début *" className="lg:col-span-2">
            <input name="debut" type="datetime-local" required className={champ} />
          </Champ>
          <Champ label="Fin *" className="lg:col-span-2">
            <input name="fin" type="datetime-local" required className={champ} />
          </Champ>
          <div className="flex justify-end sm:col-span-2 lg:col-span-4">
            <button className={bouton("primaire")}>Créer la promotion</button>
          </div>
        </form>

        <details className="group mt-5 rounded-lg border border-border bg-[#fafbf9]">
          <summary className="cursor-pointer select-none list-none px-4 py-3 text-xs font-semibold text-foreground [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Afficher</span>
            <span className="hidden group-open:inline">Masquer</span> la référence des IDs
            (produits et catégories)
          </summary>
          <div className="grid max-h-72 grid-cols-1 gap-6 overflow-y-auto border-t border-border px-4 py-3 text-xs sm:grid-cols-2">
            <div>
              <p className="mb-2 font-semibold uppercase tracking-wider text-muted-foreground">Produits</p>
              <ul className="space-y-1">
                {produits.map((p) => (
                  <li key={p.id} className="flex gap-3">
                    <span className="w-8 shrink-0 text-right font-mono text-muted-foreground">{p.id}</span>
                    <span className="truncate">{p.nom}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 font-semibold uppercase tracking-wider text-muted-foreground">Catégories</p>
              <ul className="space-y-1">
                {categories.map((c) => (
                  <li key={c.id} className="flex gap-3">
                    <span className="w-8 shrink-0 text-right font-mono text-muted-foreground">{c.id}</span>
                    <span className="truncate">
                      <span className="capitalize text-muted-foreground">{c.univers}</span> / {c.nom}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </details>
      </Panneau>

      {/* Mobile : cartes */}
      <div className="space-y-3 md:hidden">
        {promotions.map((p) => (
          <CarteListe key={p.id}>
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 truncate font-semibold">{p.nom}</p>
              {etat(p)}
            </div>
            <p className="mt-1 text-sm">
              <span className="font-semibold text-vert tabular-nums">{reduction(p)}</span>
              <span className="text-muted-foreground"> · {portee(p)}</span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
              Du {dateHeureFr(p.debut)} au {dateHeureFr(p.fin)}
            </p>
            <div className="mt-3 flex justify-end border-t border-border pt-3">{bascule(p)}</div>
          </CarteListe>
        ))}
        {promotions.length === 0 && <CarteListe className="p-0">{vide}</CarteListe>}
      </div>

      {/* Desktop : tableau */}
      <Panneau corps="p-0" className="hidden md:block">
        {promotions.length === 0 ? (
          vide
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th className="num">Réduction</th>
                  <th>Portée</th>
                  <th>Période</th>
                  <th>État</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {promotions.map((p) => (
                  <tr key={p.id}>
                    <td className="font-medium">{p.nom}</td>
                    <td className="num font-semibold text-vert">{reduction(p)}</td>
                    <td className="text-muted-foreground">{portee(p)}</td>
                    <td className="text-xs text-muted-foreground tabular-nums">
                      {dateHeureFr(p.debut)}
                      <span className="block">au {dateHeureFr(p.fin)}</span>
                    </td>
                    <td>{etat(p)}</td>
                    <td>
                      <div className="flex justify-end">{bascule(p)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panneau>
    </div>
  );
}
