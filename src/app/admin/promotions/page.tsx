import { getPrisma } from "@/lib/db";
import { dateHeureFr } from "@/lib/format";
import { creerPromotion, basculerPromotion } from "./actions";

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

  const etat = (p: (typeof promotions)[number]) => {
    const enCours = p.active && p.debut <= now && p.fin >= now;
    return enCours ? (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-vert/10 px-2.5 py-0.5 text-xs font-bold text-vert ring-1 ring-vert/20">
        <span className="size-1.5 rounded-full bg-vert" />
        En cours
      </span>
    ) : p.active ? (
      <span className="inline-flex rounded-full bg-gris px-2.5 py-0.5 text-xs font-semibold text-gris-fonce">
        Programmée / terminée
      </span>
    ) : (
      <span className="inline-flex rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-red-200">
        Arrêtée
      </span>
    );
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-vert">Promotions</h1>
      <p className="mt-2 text-sm opacity-70">
        Soldes, réductions ponctuelles et ventes flash — pas de codes promo
        (CDC 6.4).
      </p>

      <form
        action={creerPromotion}
        className="mt-6 grid grid-cols-2 gap-3 rounded border bg-white p-4 text-sm md:grid-cols-4"
      >
        <label className="flex flex-col gap-1">
          Nom *
          <input name="nom" required className="rounded border px-2 py-1" />
        </label>
        <label className="flex flex-col gap-1">
          Type *
          <select name="type" required className="rounded border px-2 py-1">
            <option value="pourcentage">Pourcentage (%)</option>
            <option value="montant">Montant (FCFA)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Valeur *
          <input
            name="valeur"
            type="number"
            min={1}
            required
            className="rounded border px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          Portée *
          <select name="portee" required className="rounded border px-2 py-1">
            <option value="produits">Produits</option>
            <option value="categories">Catégories</option>
          </select>
        </label>
        <label className="col-span-2 flex flex-col gap-1">
          IDs ciblés (séparés par des virgules) *
          <input
            name="cibleIds"
            required
            placeholder={produits
              .slice(0, 3)
              .map((p) => p.id)
              .join(",")}
            className="rounded border px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          Début *
          <input
            name="debut"
            type="datetime-local"
            required
            className="rounded border px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          Fin *
          <input
            name="fin"
            type="datetime-local"
            required
            className="rounded border px-2 py-1"
          />
        </label>
        <button className="col-span-2 rounded bg-vert px-4 py-2 font-semibold text-white md:col-span-4">
          Créer la promotion
        </button>
      </form>

      <details className="mt-4 rounded border bg-white p-3 text-xs">
        <summary className="cursor-pointer font-medium">
          Référence des IDs (produits & catégories)
        </summary>
        <div className="mt-2 grid grid-cols-2 gap-4">
          <ul>
            <li className="font-semibold">Produits</li>
            {produits.map((p) => (
              <li key={p.id}>
                {p.id} — {p.nom}
              </li>
            ))}
          </ul>
          <ul>
            <li className="font-semibold">Catégories</li>
            {categories.map((c) => (
              <li key={c.id}>
                {c.id} — {c.univers}/{c.nom}
              </li>
            ))}
          </ul>
        </div>
      </details>

      {/* Mobile : cartes tactiles */}
      <div className="mt-5 space-y-2.5 md:hidden">
        {promotions.map((p) => (
          <div
            key={p.id}
            className="rounded-2xl border bg-white p-3.5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 font-medium">{p.nom}</p>
              {etat(p)}
            </div>
            <p className="mt-1 text-sm font-semibold text-vert">
              {p.type === "pourcentage"
                ? `-${p.valeur}%`
                : `-${p.valeur} FCFA`}{" "}
              <span className="text-xs font-normal text-gris-fonce">
                — {p.portee} (
                {(p.portee === "produits" ? p.produitIds : p.categorieIds)
                  .length}{" "}
                cible(s))
              </span>
            </p>
            <p className="mt-0.5 text-xs text-gris-fonce">
              {dateHeureFr(p.debut)} → {dateHeureFr(p.fin)}
            </p>
            <div className="mt-2.5 border-t border-black/5 pt-2.5">
              <form action={basculerPromotion.bind(null, p.id)}>
                <button className="text-xs font-semibold text-vert">
                  {p.active ? "Arrêter" : "Réactiver"}
                </button>
              </form>
            </div>
          </div>
        ))}
        {promotions.length === 0 && (
          <p className="rounded-2xl border bg-white p-4 text-center text-sm opacity-60">
            Aucune promotion.
          </p>
        )}
      </div>

      {/* Desktop : table */}
      <div className="mt-6 hidden overflow-x-auto md:block">
        <table className="w-full border bg-white text-sm">
        <thead className="bg-gris text-left">
          <tr>
            <th className="p-2">Nom</th>
            <th className="p-2">Réduction</th>
            <th className="p-2">Portée</th>
            <th className="p-2">Période</th>
            <th className="p-2">État</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {promotions.map((p) => {
            return (
              <tr key={p.id} className="border-t">
                <td className="p-2 font-medium">{p.nom}</td>
                <td className="p-2">
                  {p.type === "pourcentage"
                    ? `-${p.valeur}%`
                    : `-${p.valeur} FCFA`}
                </td>
                <td className="p-2">
                  {p.portee} (
                  {(p.portee === "produits"
                    ? p.produitIds
                    : p.categorieIds
                  ).length}{" "}
                  cible(s))
                </td>
                <td className="p-2 text-xs">
                  {dateHeureFr(p.debut)} → {dateHeureFr(p.fin)}
                </td>
                <td className="p-2">{etat(p)}</td>
                <td className="p-2">
                  <form action={basculerPromotion.bind(null, p.id)}>
                    <button className="text-vert underline">
                      {p.active ? "Arrêter" : "Réactiver"}
                    </button>
                  </form>
                </td>
              </tr>
            );
          })}
          {promotions.length === 0 && (
            <tr>
              <td colSpan={6} className="p-4 text-center opacity-60">
                Aucune promotion.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
