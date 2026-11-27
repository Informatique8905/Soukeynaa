import Link from "next/link";
import { Fragment } from "react";
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

const FILTRES = [
  "",
  "en_cours",
  "programmee",
  "terminee",
  "arretee",
] as const;

const ETAT_LABELS: Record<string, string> = {
  en_cours: "En cours",
  programmee: "Programmées",
  terminee: "Terminées",
  arretee: "Arrêtées",
};

export default async function PagePromotions({
  searchParams,
}: {
  searchParams: Promise<{ etat?: string }>;
}) {
  const { etat } = await searchParams;
  const prisma = getPrisma();
  const [promotions, produits, categories] = await Promise.all([
    prisma.promotion.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.product.findMany({
      where: { statut: { not: "desactive" } },
      select: { id: true, nom: true },
      orderBy: { nom: "asc" },
    }),
    prisma.category.findMany({
      select: { id: true, nom: true },
      orderBy: { nom: "asc" },
    }),
  ]);
  const now = new Date();

  type Promo = (typeof promotions)[number];

  // État calculé d'une promotion — un seul point de vérité pour
  // la pastille affichée, le filtre et le tri « à traiter ».
  const etatDe = (p: Promo) => {
    if (!p.active) return "arretee";
    if (p.debut > now) return "programmee";
    if (p.fin < now) return "terminee";
    return "en_cours";
  };

  // Terminée mais encore marquée active = à arrêter (sinon elle
  // reste comptée « active » côté métier). Remontée en tête,
  // surlignée en vert comme les commandes à traiter.
  const aArreter = (p: Promo) => etatDe(p) === "terminee";
  const nbAArreter = promotions.filter(aArreter).length;

  const liste = etat
    ? promotions.filter((p) => etatDe(p) === etat)
    : promotions;
  liste.sort((a, b) => Number(aArreter(b)) - Number(aArreter(a)));
  const iPremiereAJour = liste.findIndex((p) => !aArreter(p));
  const aDeuxGroupes = iPremiereAJour > 0 && liste.length > iPremiereAJour;

  const etatPill = (p: Promo) => {
    const e = etatDe(p);
    if (e === "arretee") return <Pastille ton="rouge">Arrêtée</Pastille>;
    if (e === "programmee") return <Pastille ton="bleu">Programmée</Pastille>;
    if (e === "terminee") return <Pastille ton="gris">Terminée</Pastille>;
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
        description="Soldes, réductions ponctuelles et ventes flash, sans codes promo (CDC 6.4)."
      />

      <div className="flex flex-wrap items-center gap-1.5">
        {nbAArreter > 0 && (
          <Pastille ton="vert" className="h-9 px-3.5 text-xs font-semibold">
            {nbAArreter} à arrêter
          </Pastille>
        )}
        {FILTRES.map((e) => {
          const actif = etat === e || (!etat && !e);
          return (
            <Link
              key={e}
              href={e ? `/admin/promotions?etat=${e}` : "/admin/promotions"}
              aria-current={actif ? "page" : undefined}
              className={`inline-flex h-9 items-center rounded-lg border px-3.5 text-xs font-medium transition-colors ${
                actif
                  ? "border-vert bg-vert text-white shadow-sm"
                  : "border-border bg-white text-muted-foreground hover:border-vert/40 hover:text-foreground"
              }`}
            >
              {e ? ETAT_LABELS[e] : "Toutes"}
            </Link>
          );
        })}
      </div>

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
            aide="Séparés par des virgules (voir la référence ci-dessous)"
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
                    <span className="truncate">{c.nom}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </details>
      </Panneau>

      {/* Mobile : cartes */}
      <div className="space-y-3 md:hidden">
        {liste.map((p, i) => (
          <div key={p.id}>
            {aDeuxGroupes && i === iPremiereAJour && (
              <p className="pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                À jour
              </p>
            )}
            <CarteListe
              className={aArreter(p) ? "border-vert/30 bg-vert-clair/50" : ""}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 truncate font-semibold">{p.nom}</p>
                {etatPill(p)}
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
          </div>
        ))}
        {liste.length === 0 && <CarteListe className="p-0">{vide}</CarteListe>}
      </div>

      {/* Desktop : tableau */}
      <Panneau corps="p-0" className="hidden md:block">
        {liste.length === 0 ? (
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
                {liste.map((p, i) => (
                  <Fragment key={p.id}>
                    {aDeuxGroupes && i === iPremiereAJour && (
                      <tr aria-hidden className="sep-groupe">
                        <td colSpan={10}>À jour</td>
                      </tr>
                    )}
                    <tr className={aArreter(p) ? "non-traitee" : undefined}>
                      <td className="font-medium">{p.nom}</td>
                      <td className="num font-semibold text-vert">{reduction(p)}</td>
                      <td className="text-muted-foreground">{portee(p)}</td>
                      <td className="text-xs text-muted-foreground tabular-nums">
                        {dateHeureFr(p.debut)}
                        <span className="block">au {dateHeureFr(p.fin)}</span>
                      </td>
                      <td>{etatPill(p)}</td>
                      <td>
                        <div className="flex justify-end">{bascule(p)}</div>
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panneau>
    </div>
  );
}
