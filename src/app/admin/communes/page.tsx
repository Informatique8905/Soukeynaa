import { getPrisma } from "@/lib/db";
import { modifierCommune, creerCommune } from "./actions";

export default async function PageCommunes() {
  const prisma = getPrisma();
  const communes = await prisma.commune.findMany({
    orderBy: { ordre: "asc" },
    include: { _count: { select: { commandes: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-vert">
        Communes & tarifs de livraison
      </h1>
      <p className="mt-2 text-sm opacity-70">
        Le tarif appliqué à une commande est figé au moment de l&apos;achat (CDC 11.5).
      </p>

      <form
        action={creerCommune}
        className="mt-6 flex flex-wrap items-end gap-3 rounded border bg-white p-4 text-sm"
      >
        <label className="flex flex-col">
          Nouvelle commune
          <input name="nom" required className="rounded border px-2 py-1" />
        </label>
        <label className="flex flex-col">
          Quartiers inclus
          <input
            name="quartiersInclus"
            className="w-56 rounded border px-2 py-1"
          />
        </label>
        <label className="flex flex-col">
          Tarif (FCFA)
          <input
            name="tarif"
            type="number"
            min={0}
            required
            className="w-24 rounded border px-2 py-1"
          />
        </label>
        <label className="flex flex-col">
          Ordre
          <input
            name="ordre"
            type="number"
            defaultValue={0}
            className="w-16 rounded border px-2 py-1"
          />
        </label>
        <button className="rounded bg-vert px-4 py-1.5 font-semibold text-white">
          Ajouter
        </button>
      </form>

      <div className="mt-6 space-y-2">
        {communes.map((c) => (
          <form
            key={c.id}
            action={modifierCommune.bind(null, c.id)}
            className="flex flex-wrap items-center gap-3 rounded border bg-white p-3 text-sm"
          >
            <span className="w-44 font-medium">{c.nom}</span>
            <span className="w-56 text-xs opacity-60">{c.quartiersInclus}</span>
            <label className="flex items-center gap-1">
              Tarif
              <input
                name="tarif"
                type="number"
                min={0}
                defaultValue={c.tarif}
                className="w-24 rounded border px-2 py-1"
              />
              FCFA
            </label>
            <label className="flex items-center gap-2">
              <input name="active" type="checkbox" defaultChecked={c.active} />
              Active
            </label>
            <span className="text-xs opacity-50">
              {c._count.commandes} commande(s)
            </span>
            <button className="ml-auto rounded bg-vert px-3 py-1 text-white">
              Enregistrer
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
