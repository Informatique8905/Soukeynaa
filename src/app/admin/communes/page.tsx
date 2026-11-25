import { getPrisma } from "@/lib/db";
import { modifierCommune, creerCommune } from "./actions";
import {
  CaseLibellee,
  Champ,
  EnTetePage,
  Panneau,
  bouton,
  champ,
} from "@/components/admin/ui";

export default async function PageCommunes() {
  const prisma = getPrisma();
  const communes = await prisma.commune.findMany({
    orderBy: { ordre: "asc" },
    include: { _count: { select: { commandes: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <EnTetePage
        titre="Communes et livraison"
        description="Le tarif appliqué à une commande est figé au moment de l'achat (CDC 11.5). Modifier un tarif n'affecte pas les commandes passées."
      />

      <Panneau titre="Nouvelle commune">
        <form
          action={creerCommune}
          className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_2fr_8rem_6rem_auto]"
        >
          <Champ label="Nom">
            <input name="nom" required className={champ} />
          </Champ>
          <Champ label="Quartiers inclus" aide="Séparés par des virgules">
            <input name="quartiersInclus" className={champ} />
          </Champ>
          <Champ label="Tarif (FCFA)">
            <input name="tarif" type="number" min={0} required className={champ} />
          </Champ>
          <Champ label="Ordre">
            <input name="ordre" type="number" defaultValue={0} className={champ} />
          </Champ>
          <button className={bouton("primaire")}>Ajouter</button>
        </form>
      </Panneau>

      <Panneau
        titre="Communes desservies"
        description="Tarif, visibilité en boutique et ordre d'affichage"
        corps="p-0"
      >
        {communes.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
            Aucune commune. Ajoutez la première ci-dessus.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {communes.map((c) => (
              <li key={c.id}>
                <form
                  action={modifierCommune.bind(null, c.id)}
                  className="flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4"
                >
                  <div className="min-w-0 flex-1 basis-52">
                    <p className="truncate font-semibold">{c.nom}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.quartiersInclus || "—"} · {c._count.commandes} commande
                      {c._count.commandes > 1 ? "s" : ""}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Tarif
                    </span>
                    <input
                      name="tarif"
                      type="number"
                      min={0}
                      defaultValue={c.tarif}
                      className={`${champ} w-28`}
                    />
                    <span className="text-xs text-muted-foreground">FCFA</span>
                  </label>
                  <CaseLibellee name="active" defaultChecked={c.active}>
                    Visible
                  </CaseLibellee>
                  <button className={`${bouton("secondaire", "sm")} ml-auto`}>
                    Enregistrer
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Panneau>
    </div>
  );
}
