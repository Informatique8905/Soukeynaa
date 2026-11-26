import { getPrisma } from "@/lib/db";
import { creerCategorie, basculerCategorie } from "./actions";
import {
  CarteListe,
  CaseLibellee,
  Champ,
  EnTetePage,
  Panneau,
  Pastille,
  Vide,
  bouton,
  champ,
} from "@/components/admin/ui";

export default async function PageCategories() {
  const prisma = getPrisma();
  const categories = await prisma.category.findMany({
    orderBy: [{ parentId: "asc" }, { ordre: "asc" }, { nom: "asc" }],
    include: { parent: { select: { nom: true } }, _count: { select: { produits: true, enfants: true } } },
  });
  const racines = categories.filter((c) => !c.parentId);

  const SUGGESTIONS = [
    "Chaussures", "Sacs", "Robes", "Chemises & T-shirts", "Pantalons", "Jupes",
    "Ensembles", "Pagnes & Tissus", "Montres", "Bijoux", "Lingerie",
    "Chapeaux & Casquettes", "Ceintures", "Lunettes",
  ];
  const existants = new Set(categories.map((c) => c.nom.trim().toLowerCase()));
  const suggestions = SUGGESTIONS.filter((s) => !existants.has(s.toLowerCase()));

  const etat = (active: boolean) =>
    active ? <Pastille ton="vert">Active</Pastille> : <Pastille ton="gris">Inactive</Pastille>;

  const bascule = (c: (typeof categories)[number]) => (
    <form action={basculerCategorie.bind(null, c.id)}>
      <button className={bouton(c.active ? "secondaire" : "primaire", "sm")}>
        {c.active ? "Désactiver" : "Activer"}
      </button>
    </form>
  );

  const vide = (
    <Vide titre="Aucune catégorie">Créez la première à l&apos;aide du formulaire ci-dessus.</Vide>
  );

  return (
    <div className="flex flex-col gap-6">
      <EnTetePage
        titre="Catégories"
        description="Organisez le catalogue par catégories et sous-catégories."
      />

      <Panneau titre="Nouvelle catégorie">
        <form
          action={creerCategorie}
          className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1.4fr_6rem_auto_auto]"
        >
          <Champ label="Nom">
            <input name="nom" required className={champ} />
          </Champ>
          <Champ label="Parent">
            <select name="parent" className={champ}>
              <option value="">Aucun (catégorie racine)</option>
              {racines.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
          </Champ>
          <Champ label="Ordre">
            <input name="ordre" type="number" defaultValue={0} className={champ} />
          </Champ>
          <CaseLibellee name="active" defaultChecked className="h-10">
            Active
          </CaseLibellee>
          <button className={bouton("primaire")}>Ajouter</button>
        </form>
        {suggestions.length > 0 && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Suggestions fréquentes, un clic pour ajouter
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <form key={s} action={creerCategorie}>
                  <input type="hidden" name="nom" value={s} />
                  <input type="hidden" name="active" value="on" />
                  <button className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-vert hover:bg-vert-clair hover:text-vert-fonce">
                    + {s}
                  </button>
                </form>
              ))}
            </div>
          </div>
        )}
      </Panneau>

      {/* Mobile : cartes */}
      <div className="space-y-3 md:hidden">
        {categories.map((c) => (
          <CarteListe key={c.id} className={c.parentId ? "ml-4" : undefined}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{c.nom}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {c.parent ? `Dans ${c.parent.nom} · ` : ""}{c._count.produits} produit(s)
                </p>
              </div>
              {etat(c.active)}
            </div>
            <div className="mt-3 flex justify-end border-t border-border pt-3">{bascule(c)}</div>
          </CarteListe>
        ))}
        {categories.length === 0 && <CarteListe className="p-0">{vide}</CarteListe>}
      </div>

      {/* Desktop : tableau */}
      <Panneau corps="p-0" className="hidden md:block">
        {categories.length === 0 ? (
          vide
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Parent</th>
                  <th className="num">Produits</th>
                  <th>État</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id}>
                    <td className="font-medium">
                      <span className={c.parentId ? "flex items-center gap-2 pl-5" : undefined}>
                        {c.parentId && <span aria-hidden className="h-px w-3 bg-border" />}
                        {c.nom}
                      </span>
                    </td>
                    <td className="text-muted-foreground">{c.parent?.nom ?? "—"}</td>
                    <td className="num">{c._count.produits}</td>
                    <td>{etat(c.active)}</td>
                    <td>
                      <div className="flex justify-end">{bascule(c)}</div>
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
