import { getPrisma } from "@/lib/db";
import { UNIVERSES } from "@/lib/constants";
import { creerCategorie, basculerCategorie } from "./actions";

export default async function PageCategories() {
  const prisma = getPrisma();
  const categories = await prisma.category.findMany({
    orderBy: [{ univers: "asc" }, { parentId: "asc" }, { ordre: "asc" }],
    include: { parent: { select: { nom: true } }, _count: { select: { produits: true, enfants: true } } },
  });
  const racines = categories.filter((c) => !c.parentId);

  return (
    <div>
      <h1 className="text-2xl font-bold text-vert">Catégories</h1>

      <form
        action={creerCategorie}
        className="mt-6 flex flex-wrap items-end gap-3 rounded border bg-white p-4 text-sm"
      >
        <label className="flex flex-col">
          Nom
          <input name="nom" required className="rounded border px-2 py-1" />
        </label>
        <label className="flex flex-col">
          Univers
          <select name="univers" required className="rounded border px-2 py-1">
            {UNIVERSES.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col">
          Parent (optionnel)
          <select name="parent" className="rounded border px-2 py-1">
            <option value="">— catégorie racine —</option>
            {racines.map((c) => (
              <option key={c.id} value={c.id}>
                {c.univers} / {c.nom}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col">
          Ordre
          <input
            name="ordre"
            type="number"
            defaultValue={0}
            className="w-20 rounded border px-2 py-1"
          />
        </label>
        <label className="flex items-center gap-2">
          <input name="active" type="checkbox" defaultChecked /> Active
        </label>
        <button className="rounded bg-vert px-4 py-1.5 font-semibold text-white">
          Ajouter
        </button>
      </form>

      {/* Mobile : cartes tactiles */}
      <div className="mt-5 space-y-2.5 md:hidden">
        {categories.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-3 rounded-2xl border bg-white p-3.5 shadow-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {c.parentId ? "↳ " : ""}
                {c.nom}
              </p>
              <p className="mt-0.5 text-xs text-gris-fonce">
                {c.univers}
                {c.parent && ` — parent : ${c.parent.nom}`} —{" "}
                {c._count.produits} produit(s)
              </p>
            </div>
            {c.active ? (
              <span
                className="shrink-0 font-bold text-vert"
                aria-label="Active"
              >
                ✓
              </span>
            ) : (
              <span
                className="shrink-0 font-bold text-red-600"
                aria-label="Inactive"
              >
                ×
              </span>
            )}
            <form action={basculerCategorie.bind(null, c.id)}>
              <button className="shrink-0 rounded-full bg-gris px-3 py-1.5 text-xs font-semibold text-gris-fonce">
                {c.active ? "Désactiver" : "Activer"}
              </button>
            </form>
          </div>
        ))}
        {categories.length === 0 && (
          <p className="rounded-2xl border bg-white p-4 text-center text-sm opacity-60">
            Aucune catégorie — créez la première ci-dessus.
          </p>
        )}
      </div>

      {/* Desktop : table */}
      <div className="mt-6 hidden overflow-x-auto md:block">
        <table className="w-full border bg-white text-sm">
        <thead className="bg-gris text-left">
          <tr>
            <th className="p-2">Nom</th>
            <th className="p-2">Univers</th>
            <th className="p-2">Parent</th>
            <th className="p-2">Produits</th>
            <th className="p-2">Active</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {categories.map((c) => (
            <tr key={c.id} className="border-t">
              <td className="p-2 font-medium">
                {c.parentId ? "↳ " : ""}
                {c.nom}
              </td>
              <td className="p-2">{c.univers}</td>
              <td className="p-2">{c.parent?.nom ?? "—"}</td>
              <td className="p-2">{c._count.produits}</td>
              <td className="p-2">
                {c.active ? (
                  <span className="font-bold text-vert" aria-label="Active">✓</span>
                ) : (
                  <span className="font-bold text-red-600" aria-label="Inactive">×</span>
                )}
              </td>
              <td className="p-2">
                <form action={basculerCategorie.bind(null, c.id)}>
                  <button className="text-vert underline">
                    {c.active ? "Désactiver" : "Activer"}
                  </button>
                </form>
              </td>
            </tr>
          ))}
          {categories.length === 0 && (
            <tr>
              <td colSpan={6} className="p-4 text-center opacity-60">
                Aucune catégorie — créez la première ci-dessus.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
