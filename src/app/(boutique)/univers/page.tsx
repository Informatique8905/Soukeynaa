import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getPrisma } from "@/lib/db";
import { EnTetePage } from "@/components/boutique/EnTetePage";

/** Les quatre rubriques du menu principal (CDC 4.1). */
const UNIVERS = [
  { slug: "enfants", label: "Enfants" },
  { slug: "hommes", label: "Hommes" },
  { slug: "femmes", label: "Femmes" },
  { slug: "accessoires", label: "Accessoires" },
] as const;

export default async function PageUnivers() {
  const categories = await getPrisma().category.findMany({
    where: { active: true, parentId: null },
    orderBy: [{ ordre: "asc" }, { nom: "asc" }],
    select: { nom: true, slug: true, univers: true },
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <EnTetePage
        titre="Nos univers"
        sousTitre="Choisissez un univers pour explorer ses catégories et ses produits."
        ariane={[{ href: "/", label: "Accueil" }]}
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {UNIVERS.map((u) => {
          const cats = categories.filter((c) => c.univers === u.slug);
          return (
            <section
              key={u.slug}
              data-reveal
              className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5"
            >
              <Link
                href={`/${u.slug}`}
                className="press group flex items-center justify-between gap-3 p-5"
              >
                <h2 className="text-lg font-extrabold text-noir transition-colors group-hover:text-vert">
                  {u.label}
                </h2>
                <span className="flex size-9 items-center justify-center rounded-full bg-vert-clair text-vert transition-transform group-hover:translate-x-0.5">
                  <ChevronRight className="size-5" />
                </span>
              </Link>
              {cats.length > 0 && (
                <nav
                  aria-label={`Catégories ${u.label}`}
                  className="flex flex-wrap gap-2 px-5 pb-5"
                >
                  {cats.map((c) => (
                    <Link
                      key={c.slug}
                      href={`/categorie/${c.slug}`}
                      className="press rounded-full bg-gris px-3.5 py-1.5 text-xs font-semibold text-noir transition-colors hover:bg-vert-clair hover:text-vert"
                    >
                      {c.nom}
                    </Link>
                  ))}
                </nav>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
