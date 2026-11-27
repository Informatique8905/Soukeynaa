import Link from "next/link";
import { getPrisma } from "@/lib/db";
import { fcfa, dateFr } from "@/lib/format";
import { ArrowUpRight } from "lucide-react";
import {
  CarteListe,
  EnTetePage,
  ModeLivraison,
  Panneau,
  Pastille,
  StatutCommande,
  StatutCommandeLigne,
  StatutPaiement,
  Vide,
} from "@/components/admin/ui";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/constants";
import { LigneCliquable } from "@/components/admin/LigneCliquable";

const FILTRES = [
  "",
  "payee",
  "en_preparation",
  "expediee",
  "livree",
  "annulee",
] as const;

// Commandes qui attendent une action de l'admin — démarquées d'un point
// ambre dans la liste et comptées dans la pastille « à traiter ».
const A_TRAITER = ["en_attente_paiement", "payee", "en_preparation"] as const;
const aTraiter = (statut: string) => (A_TRAITER as readonly string[]).includes(statut);

// Avatar pastelle déterministe (cycle par id) — style « Payment History »
const AVATARS = [
  "bg-vert-clair text-vert-fonce",
  "bg-dore-clair text-bordeaux",
  "bg-sky-50 text-sky-800",
  "bg-red-50 text-red-700",
  "bg-amber-50 text-amber-800",
] as const;

const initiales = (nom: string) =>
  nom
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((m) => m[0])
    .join("")
    .toUpperCase();

const heureFr = (d: Date) =>
  d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

export default async function PageCommandes({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>;
}) {
  const { statut } = await searchParams;
  const prisma = getPrisma();
  const [commandes, nbATraiter] = await Promise.all([
    prisma.order.findMany({
      where: statut ? { statut: statut as never } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.order.count({ where: { statut: { in: [...A_TRAITER] } } }),
  ]);

  const vide = (
    <Vide titre="Aucune commande">
      Aucune commande ne correspond à ce filtre.
    </Vide>
  );

  return (
    <div className="flex flex-col gap-6">
      <EnTetePage
        titre="Commandes"
        description="Gestion et suivi de toutes les commandes"
      />

      <div className="flex flex-wrap items-center gap-1.5">
        {nbATraiter > 0 && (
          <Pastille ton="ambre" className="h-9 px-3.5 text-xs font-semibold">
            {nbATraiter} à traiter
          </Pastille>
        )}
        {FILTRES.map((s) => {
          const actif = statut === s || (!statut && !s);
          return (
            <Link
              key={s}
              href={s ? `/admin/commandes?statut=${s}` : "/admin/commandes"}
              aria-current={actif ? "page" : undefined}
              className={`inline-flex h-9 items-center rounded-lg border px-3.5 text-xs font-medium transition-colors ${
                actif
                  ? "border-vert bg-vert text-white shadow-sm"
                  : "border-border bg-white text-muted-foreground hover:border-vert/40 hover:text-foreground"
              }`}
            >
              {s ? ORDER_STATUS_LABELS[s] : "Toutes"}
            </Link>
          );
        })}
      </div>

      {/* Mobile : cartes */}
      <div className="space-y-3 md:hidden">
        {commandes.map((c) => (
          <Link key={c.id} href={`/admin/commandes/${c.id}`} className="block">
            <CarteListe className="transition-colors active:bg-muted/40">
              <div className="flex items-start justify-between gap-3">
                <p className="flex min-w-0 items-center gap-1.5 truncate font-semibold text-vert">
                  {aTraiter(c.statut) && (
                    <span
                      aria-label="À traiter"
                      className="size-2 shrink-0 rounded-full bg-amber-500"
                    />
                  )}
                  <span className="truncate">{c.reference}</span>
                </p>
                <p className="shrink-0 font-semibold tabular-nums">
                  {fcfa(c.total)}
                </p>
              </div>
              <p className="mt-1 truncate text-sm">
                {c.clientNom}
                <span className="text-muted-foreground"> · {c.clientTelephone}</span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {c.communeNom} · {dateFr(c.createdAt)}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <StatutCommande statut={c.statut} />
                <StatutPaiement statut={c.statutPaiement} />
                {c.modePaiement === "livraison" && <ModeLivraison />}
              </div>
            </CarteListe>
          </Link>
        ))}
        {commandes.length === 0 && <CarteListe className="p-0">{vide}</CarteListe>}
      </div>

      {/* Desktop : tableau « Payment History » — panneau blanc, lignes aérées */}
      <Panneau
        titre="Historique des commandes"
        description={`Les ${commandes.length} commande${commandes.length > 1 ? "s" : ""} les plus récentes`}
        actions={
          <Link
            href="/admin/rapports"
            aria-label="Ouvrir les rapports"
            className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-vert/40 hover:text-foreground"
          >
            <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        }
        corps="p-0"
        className="hidden md:block"
      >
        {commandes.length === 0 ? (
          <div className="p-5">{vide}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Date</th>
                  <th>Heure</th>
                  <th>Statut</th>
                  <th className="num">Montant</th>
                </tr>
              </thead>
              <tbody>
                {commandes.map((c) => (
                  <LigneCliquable key={c.id} href={`/admin/commandes/${c.id}`}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="relative shrink-0">
                          <span
                            aria-hidden
                            className={`grid size-10 place-items-center rounded-full text-xs font-bold ${AVATARS[c.id % AVATARS.length]}`}
                          >
                            {initiales(c.clientNom)}
                          </span>
                          {aTraiter(c.statut) && (
                            <span
                              aria-label="À traiter"
                              className="absolute -left-0.5 -top-0.5 size-2.5 rounded-full bg-amber-500 ring-2 ring-white"
                            />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">
                            {c.clientNom}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {c.reference} · {c.communeNom}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap tabular-nums">
                      {dateFr(c.createdAt)}
                    </td>
                    <td className="whitespace-nowrap text-muted-foreground tabular-nums">
                      {heureFr(c.createdAt)}
                    </td>
                    <td>
                      <StatutCommandeLigne statut={c.statut} />
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {PAYMENT_STATUS_LABELS[c.statutPaiement]}
                        {c.modePaiement === "livraison" ? " · à la livraison" : ""}
                      </span>
                    </td>
                    <td className="num font-semibold">{fcfa(c.total)}</td>
                  </LigneCliquable>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panneau>
    </div>
  );
}
