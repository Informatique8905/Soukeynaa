import Link from "next/link";
import { auth, signOut } from "@/auth";
import { getPrisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { fcfa, dateFr } from "@/lib/format";
import { ORDER_STATUS_LABELS, ORDER_BADGE_VARIANT } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { EtatVide } from "@/components/motion/EtatVide";
import { CompteForms } from "@/components/boutique/CompteForms";
import type { AdresseEnregistree } from "./actions";

export const metadata = { title: "Mon compte" };

export default async function PageCompte() {
  const session = await auth();
  if (!session?.user) redirect("/connexion?callbackUrl=/compte");

  const prisma = getPrisma();
  const commandes = await prisma.order.findMany({
    where: { clientUserId: Number(session.user.id) },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      reference: true,
      total: true,
      statut: true,
      createdAt: true,
    },
  });

  const [user, communes] = await Promise.all([
    prisma.user.findUnique({
      where: { id: Number(session.user.id) },
      select: { nom: true, telephone: true, adresses: true },
    }),
    prisma.commune.findMany({
      where: { active: true },
      orderBy: { ordre: "asc" },
      select: { id: true, nom: true },
    }),
  ]);

  const nom = session.user.name ?? session.user.email ?? "Client";
  const initiales = nom
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      {/* Profil */}
      <div data-reveal className="relative flex items-center gap-4 overflow-hidden rounded-[2rem] bg-gradient-to-br from-vert to-vert-fonce p-5 text-white shadow-xl shadow-vert/20">
        <span aria-hidden className="pointer-events-none absolute -right-8 -top-10 size-36 rounded-full bg-white/10" />
        <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-lg font-extrabold text-vert shadow-md">
          {initiales || "C"}
        </span>
        <div className="relative min-w-0 flex-1">
          <h1 className="truncate text-lg font-extrabold">{nom}</h1>
          <p className="truncate text-sm text-white/70">
            {session.user.email}
          </p>
        </div>
        <form
          className="relative"
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button
            className="press flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white ring-1 ring-white/20 hover:bg-white/25"
            aria-label="Se déconnecter"
          >
            Déconnexion
          </button>
        </form>
      </div>

      {/* Profil / adresses / mot de passe (CDC 8.5) */}
      <CompteForms
        nom={user?.nom ?? nom}
        telephone={user?.telephone ?? ""}
        adresses={(user?.adresses as AdresseEnregistree[] | null) ?? []}
        communes={communes}
      />

      {/* Commandes */}
      <h2 data-reveal="left" className="mt-8 flex items-center gap-2 text-lg font-extrabold text-noir">
Mes commandes
      </h2>
      {commandes.length === 0 ? (
        <EtatVide
          dessin="colis"
          titre="Aucune commande pour le moment"
          texte="Vos futures commandes apparaîtront ici, avec leur suivi."
          action={{ href: "/", label: "Découvrir la boutique" }}
        />
      ) : (
        <ul className="mt-4 space-y-3">
          {commandes.map((c) => (
            <li key={c.id} data-reveal>
              <Link
                href={`/commande/${c.reference}`}
                transitionTypes={["nav-forward"]}
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
                  <div className="mt-1 flex items-center justify-between text-xs text-gris-fonce">
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
      )}
    </main>
  );
}
