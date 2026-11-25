import Link from "next/link";
import { EtatVide } from "@/components/motion/EtatVide";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/db";
import { fcfa, dateFr } from "@/lib/format";
import { cloud } from "@/lib/image";
import { ORDER_STATUS_LABELS, ORDER_BADGE_VARIANT } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { RechercheCommande } from "@/components/boutique/RechercheCommande";

export const metadata = { title: "Mes commandes" };

export default async function CommandesPage() {
  const session = await auth();

  const commandes = session?.user?.id
    ? await getPrisma().order.findMany({
        where: { clientUserId: Number(session.user.id) },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          reference: true,
          total: true,
          statut: true,
          createdAt: true,
          lignes: {
            take: 3,
            select: {
              nom: true,
              quantite: true,
              produit: { select: { images: true } },
            },
          },
          _count: { select: { lignes: true } },
        },
      })
    : [];

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <div data-reveal="left">
        <h1 className="text-2xl font-extrabold tracking-tight text-noir">Vos commandes</h1>
        <p className="mt-1 text-sm text-gris-fonce">
          Suivi en temps réel, de la commande à la livraison
        </p>
      </div>

      {/* Recherche par référence — commande invité (CDC 8.2) */}
      <div data-reveal className="mt-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <p className="mb-2.5 text-xs font-semibold text-gris-fonce">
          Retrouver une commande par sa référence
        </p>
        <RechercheCommande />
      </div>

      {session?.user ? (
        commandes.length === 0 ? (
          <EtatVide
            dessin="colis"
            titre="Aucune commande pour le moment"
            texte="Vos futures commandes apparaîtront ici, avec leur suivi."
            action={{ href: "/", label: "Découvrir la boutique" }}
          />
        ) : (
          <ul className="mt-5 space-y-3">
            {commandes.map((c) => (
              <li key={c.id} data-reveal>
                <Link
                  href={`/commande/${c.reference}`}
                  className="lift press group flex items-center gap-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-bold text-noir">
                        {c.reference}
                      </span>
                      <Badge variant={ORDER_BADGE_VARIANT[c.statut]}>
                        {ORDER_STATUS_LABELS[c.statut]}
                      </Badge>
                    </div>
                    {/* Articles de la commande : vignettes + noms */}
                    <div className="mt-2.5 flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {c.lignes.map((l, i) => {
                          const img = (
                            l.produit?.images as { url?: string }[] | null
                          )?.[0]?.url;
                          return (
                            <span
                              key={i}
                              className="h-9 w-9 overflow-hidden rounded-full bg-gris ring-2 ring-white"
                            >
                              {img ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={cloud(img, 120) ?? img}
                                  alt={l.nom}
                                  loading="lazy"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-gris-fonce">
                                  {l.nom.slice(0, 1)}
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                      <p className="min-w-0 flex-1 truncate text-xs text-gris-fonce">
                        {c.lignes
                          .map((l) => `${l.quantite}× ${l.nom}`)
                          .join(" · ")}
                        {c._count.lignes > c.lignes.length &&
                          ` +${c._count.lignes - c.lignes.length}`}
                      </p>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-xs text-gris-fonce">
                      <span>{dateFr(c.createdAt)}</span>
                      <span className="text-sm font-bold text-vert">
                        {fcfa(c.total)}
                      </span>
                    </div>
                  </div>
                  <span className="shrink-0 text-gris-fonce transition-transform group-hover:translate-x-1 group-hover:text-vert">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : (
        <EtatVide
          dessin="colis"
          titre="Tout votre historique, au même endroit"
          texte="Connectez-vous pour retrouver toutes vos commandes et leur suivi."
          action={{ href: "/connexion?callbackUrl=/commandes", label: "Se connecter" }}
        />
      )}
    </main>
  );
}
