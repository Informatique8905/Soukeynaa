import Link from "next/link";
import { getPrisma } from "@/lib/db";
import { fcfa, dateFr } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  ORDER_BADGE_VARIANT,
  PAYMENT_BADGE_VARIANT,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/constants";

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

  return (
    <div>
      <h1 className="text-2xl font-bold text-vert">Commandes</h1>
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        {(
          [
            "",
            "payee",
            "en_preparation",
            "expediee",
            "livree",
            "annulee",
          ] as const
        ).map((s) => (
          <Link
            key={s}
            href={s ? `/admin/commandes?statut=${s}` : "/admin/commandes"}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium ${
              statut === s || (!statut && !s)
                ? "border-vert bg-vert text-white"
                : "bg-white text-gris-fonce hover:border-vert/60 hover:text-vert"
            }`}
          >
            {s ? ORDER_STATUS_LABELS[s] : "Toutes"}
          </Link>
        ))}
      </div>

      {/* Mobile : cartes tactiles */}
      <div className="mt-4 space-y-2.5 md:hidden">
        {commandes.map((c) => (
          <Link
            key={c.id}
            href={`/admin/commandes/${c.id}`}
            className="block rounded-2xl border bg-white p-3.5 shadow-sm transition active:scale-[0.99]"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-semibold text-vert">{c.reference}</p>
              <p className="shrink-0 font-bold tabular-nums">{fcfa(c.total)}</p>
            </div>
            <p className="mt-0.5 text-sm">
              {c.clientNom}{" "}
              <span className="text-xs opacity-60">{c.clientTelephone}</span>
            </p>
            <p className="mt-0.5 text-xs text-gris-fonce">
              {c.communeNom} — {dateFr(c.createdAt)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge variant={ORDER_BADGE_VARIANT[c.statut as OrderStatus]}>
                {ORDER_STATUS_LABELS[c.statut as OrderStatus]}
              </Badge>
              <Badge
                variant={
                  PAYMENT_BADGE_VARIANT[c.statutPaiement as PaymentStatus]
                }
              >
                {PAYMENT_STATUS_LABELS[c.statutPaiement as PaymentStatus]}
              </Badge>
              {c.modePaiement === "livraison" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 ring-1 ring-amber-200">
                  À la livraison
                </span>
              )}
            </div>
          </Link>
        ))}
        {commandes.length === 0 && (
          <p className="rounded-2xl border bg-white p-4 text-center text-sm opacity-60">
            Aucune commande.
          </p>
        )}
      </div>

      {/* Desktop : table */}
      <div className="mt-4 hidden overflow-x-auto md:block">
        <table className="w-full border bg-white text-sm">
        <thead className="bg-gris text-left">
          <tr>
            <th className="p-2">Référence</th>
            <th className="p-2">Date</th>
            <th className="p-2">Client</th>
            <th className="p-2">Commune</th>
            <th className="p-2">Total</th>
            <th className="p-2">Statut</th>
            <th className="p-2">Paiement</th>
          </tr>
        </thead>
        <tbody>
          {commandes.map((c) => (
            <tr key={c.id} className="border-t">
              <td className="p-2">
                <Link
                  href={`/admin/commandes/${c.id}`}
                  className="font-medium text-vert underline"
                >
                  {c.reference}
                </Link>
              </td>
              <td className="p-2">{dateFr(c.createdAt)}</td>
              <td className="p-2">
                {c.clientNom}
                <span className="block text-xs opacity-60">
                  {c.clientTelephone}
                </span>
              </td>
              <td className="p-2">{c.communeNom}</td>
              <td className="p-2 font-medium tabular-nums">{fcfa(c.total)}</td>
              <td className="p-2">
                <Badge variant={ORDER_BADGE_VARIANT[c.statut as OrderStatus]}>
                  {ORDER_STATUS_LABELS[c.statut as OrderStatus]}
                </Badge>
              </td>
              <td className="p-2">
                <Badge variant={PAYMENT_BADGE_VARIANT[c.statutPaiement as PaymentStatus]}>
                  {PAYMENT_STATUS_LABELS[c.statutPaiement as PaymentStatus]}
                </Badge>
                {c.modePaiement === "livraison" && (
                  <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 ring-1 ring-amber-200">
                    À la livraison
                  </span>
                )}
              </td>
            </tr>
          ))}
          {commandes.length === 0 && (
            <tr>
              <td colSpan={7} className="p-4 text-center opacity-60">
                Aucune commande.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
