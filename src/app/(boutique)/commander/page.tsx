import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { getPrisma } from "@/lib/db";
import { auth } from "@/auth";
import { getPanierDetails } from "@/lib/cart";
import { fcfa } from "@/lib/format";
import { cloud } from "@/lib/image";
import { CheckoutForm } from "@/components/boutique/CheckoutForm";

export const metadata = { title: "Commander" };

export default async function CommanderPage() {
  const [panier, session] = await Promise.all([getPanierDetails(), auth()]);
  if (panier.lignes.length === 0) redirect("/panier");

  const prisma = getPrisma();
  const communes = await prisma.commune.findMany({
    where: { active: true },
    orderBy: { ordre: "asc" },
  });

  // Pré-remplissage si connecté (CDC 8.3) : coordonnées + première adresse
  // enregistrée (sauvegardée dans /compte ou mémorisée au checkout).
  let defauts: {
    nom: string;
    email: string;
    telephone: string;
    adresse: string;
    communeId: number | null;
    adresses: { communeId: number; detail: string }[];
  } = {
    nom: "",
    email: "",
    telephone: "",
    adresse: "",
    communeId: null,
    adresses: [],
  };
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: Number(session.user.id) },
    });
    const adresses =
      (user?.adresses as { communeId: number; detail: string }[] | null) ?? [];
    const adressesValides = adresses.filter((a) =>
      communes.some((c) => c.id === a.communeId)
    );
    const premiere = adressesValides[0];
    defauts = {
      nom: user?.nom ?? "",
      email: user?.email ?? "",
      telephone: user?.telephone ?? "",
      adresse: premiere?.detail ?? "",
      communeId: premiere?.communeId ?? null,
      adresses: adressesValides,
    };
  }

  const nbArticles = panier.lignes.reduce((s, l) => s + l.quantite, 0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 md:py-10">
      <Link
        href="/panier"
        transitionTypes={["nav-back"]}
        aria-label="Retour au panier"
        className="press group inline-grid size-11 place-items-center rounded-full bg-white text-noir ring-1 ring-black/5 transition hover:text-vert hover:ring-vert/40"
      >
        <ArrowLeft className="size-5 transition-transform group-hover:-translate-x-0.5" aria-hidden />
      </Link>
      <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-noir md:text-3xl">
        Finaliser la commande
      </h1>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-gris-fonce">
        Paiement sécurisé ou à la
        livraison, à vous de choisir.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-5 md:items-start">
        <div className="md:col-span-3">
          {/* Récapitulatif pliable — mobile : le total reste visible
              sans ouvrir, le détail se déplie au tap */}
          <details className="group mb-5 rounded-3xl bg-white shadow-sm ring-1 ring-black/5 md:hidden">
            <summary className="flex h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-bold text-noir [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2">
                Récapitulatif
                <span className="rounded-full bg-vert-clair px-2 py-0.5 text-[11px] font-bold text-vert">
                  {nbArticles} article{nbArticles > 1 ? "s" : ""}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className="tabular-nums font-extrabold text-vert">
                  {fcfa(panier.sousTotal)}
                </span>
                <ChevronDown className="size-4 text-gris-fonce transition-transform group-open:rotate-180" />
              </span>
            </summary>
            <ul className="space-y-2.5 border-t border-black/5 px-4 py-3 text-sm">
              {panier.lignes.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-gris-fonce">
                    {l.quantite} × {l.nom}
                  </span>
                  <span className="shrink-0 font-medium tabular-nums">
                    {fcfa(l.total)}
                  </span>
                </li>
              ))}
            </ul>
          </details>
          <CheckoutForm
            communes={communes.map((c) => ({
              id: c.id,
              nom: c.nom,
              quartiersInclus: c.quartiersInclus,
              tarif: c.tarif,
            }))}
            sousTotal={panier.sousTotal}
            defauts={defauts}
          />
        </div>

        {/* Récapitulatif (CDC 9.2) */}
        <aside className="md:sticky md:top-24 md:col-span-2" data-reveal="scale">
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <h2 className="flex items-center justify-between font-extrabold">
              Récapitulatif
              <span className="rounded-full bg-vert-clair px-2.5 py-0.5 text-xs font-bold text-vert">
                {nbArticles} article{nbArticles > 1 ? "s" : ""}
              </span>
            </h2>
            <ul className="mt-3 space-y-3 text-sm">
              {panier.lignes.map((l) => (
                <li key={l.id} className="flex items-center gap-3">
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-gris">
                    <span className="absolute -right-0 -top-0 z-10 grid size-5 place-items-center rounded-bl-lg bg-noir text-[10px] font-bold text-white">
                      {l.quantite}
                    </span>
                    {l.image && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={cloud(l.image, 120) ?? l.image}
                        alt={l.nom}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{l.nom}</span>
                    {l.varianteLabel && (
                      <span className="text-xs text-gris-fonce">
                        {l.varianteLabel}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-medium">{fcfa(l.total)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 flex justify-between border-t border-black/5 pt-3 text-sm font-bold">
              <span>Sous-total</span>
              <span className="text-vert">{fcfa(panier.sousTotal)}</span>
            </p>
            <ul className="mt-4 grid grid-cols-3 gap-2 border-t border-black/5 pt-4 text-center text-[10px] font-semibold text-gris-fonce">
              <li className="flex flex-col items-center gap-1">
                Paiement sécurisé
              </li>
              <li className="flex flex-col items-center gap-1">
                Livré à Abidjan
              </li>
              <li className="flex flex-col items-center gap-1">
                Échange facile
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
