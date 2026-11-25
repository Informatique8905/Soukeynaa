import Link from "next/link";
import { getPrisma } from "@/lib/db";
import { fcfa, dateFr } from "@/lib/format";
import {
  CarteListe,
  EnTetePage,
  ModeLivraison,
  Panneau,
  StatutCommande,
  StatutPaiement,
  Vide,
  lien,
} from "@/components/admin/ui";
import { ORDER_STATUS_LABELS } from "@/lib/constants";

const FILTRES = [
  "",
  "payee",
  "en_preparation",
  "expediee",
  "livree",
  "annulee",
] as const;

export default async function PageCommandes({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>;
}) {
  const { statut } = await searchParams;
  const prisma = getPrisma();
  const commandes = await prisma.order.findMany({
    where: statut ? { statut: statut as never } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const vide = (
    <Vide titre="Aucune commande">
      Aucune commande ne correspond à ce filtre.
    </Vide>
  );

  return (
    <div className="flex flex-col gap-6">
      <EnTetePage
        titre="Commandes"
        description={`${commandes.length} commande${commandes.length > 1 ? "s" : ""} affichée${commandes.length > 1 ? "s" : ""} (100 dernières)`}
      />

      <div className="flex flex-wrap gap-1.5">
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
                <p className="truncate font-semibold text-vert">{c.reference}</p>
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

      {/* Desktop : tableau */}
      <Panneau corps="p-0" className="hidden md:block">
        {commandes.length === 0 ? (
          vide
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Date</th>
                  <th>Client</th>
                  <th>Commune</th>
                  <th className="num">Total</th>
                  <th>Statut</th>
                  <th>Paiement</th>
                </tr>
              </thead>
              <tbody>
                {commandes.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/admin/commandes/${c.id}`} className={lien}>
                        {c.reference}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap text-muted-foreground tabular-nums">
                      {dateFr(c.createdAt)}
                    </td>
                    <td>
                      <span className="font-medium">{c.clientNom}</span>
                      <span className="block text-xs text-muted-foreground">
                        {c.clientTelephone}
                      </span>
                    </td>
                    <td className="text-muted-foreground">{c.communeNom}</td>
                    <td className="num font-semibold">{fcfa(c.total)}</td>
                    <td>
                      <StatutCommande statut={c.statut} />
                    </td>
                    <td>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatutPaiement statut={c.statutPaiement} />
                        {c.modePaiement === "livraison" && <ModeLivraison />}
                      </div>
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
