import { getPrisma } from "@/lib/db";
import { modifierCommune } from "./actions";

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
