import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_BADGE_VARIANT,
  type PaymentStatus,
} from "@/lib/constants";
import { getPrisma } from "@/lib/db";
import { fcfa, dateHeureFr } from "@/lib/format";
import { resoudrePaiement } from "./actions";

export default async function PagePaiements() {
  const prisma = getPrisma();
  const [paiements, aVerifier] = await Promise.all([
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { commande: { select: { reference: true, clientNom: true } } },
    }),
    prisma.payment.findMany({
      where: { statut: "a_verifier" },
      include: { commande: { select: { reference: true, clientNom: true, total: true } } },
    }),
  ]);

  return (
    <div>
      <h1>Paiements</h1>

      {aVerifier.length > 0 && (
        <section className="mt-6 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
          <h2 className="flex items-center gap-2 font-bold text-amber-900">
            <span aria-hidden className="mt-0.5 size-2.5 shrink-0 rounded-full bg-amber-500" />
            {aVerifier.length} paiement(s) à vérifier (CDC 10.12)
          </h2>
          <p className="mt-1 text-xs opacity-70">
            Vérifiez la transaction sur le portail Jèko, puis résolvez avec un
            motif — l&apos;action est journalisée (CDC 10.13). Un double paiement
            reçu doit être remboursé manuellement via Jèko.
          </p>
          {aVerifier.map((p) => (
            <div key={p.id} className="mt-3 rounded-xl bg-white p-3 text-sm ring-1 ring-amber-200/60">
              <p>
                <strong>{p.referenceCommande}</strong> — {p.commande.clientNom}{" "}
                — {fcfa(p.montant)} (attendu : {fcfa(p.commande.total)})
              </p>
              <p className="text-xs opacity-60">
                txn Jèko : {p.transactionJeko ?? "—"} —{" "}
                {dateHeureFr(p.createdAt)}
              </p>
              <form className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  name="motif"
                  required
                  minLength={10}
                  placeholder="Motif (min 10 caractères) — ex. montant vérifié sur portail Jèko"
                  className="min-w-64 flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs outline-none transition focus:border-vert focus:ring-4 focus:ring-vert/10"
                />
                <button
                  formAction={resoudrePaiement.bind(null, p.id, "confirme")}
                  className="rounded-full bg-vert px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-vert-fonce"
                >
                  Confirmer (vérifié sur Jèko)
                </button>
                <button
                  formAction={resoudrePaiement.bind(null, p.id, "rejete")}
                  className="rounded-full bg-red-50 px-4 py-2 text-xs font-bold text-red-700 ring-1 ring-red-200 transition hover:bg-red-100"
                >
                  Rejeter
                </button>
              </form>
            </div>
          ))}
        </section>
      )}

      <div className="overflow-x-auto">
      <table className="mt-6 w-full border bg-white text-sm">
        <thead className="bg-gris text-left">
          <tr>
            <th className="p-2">Commande</th>
            <th className="p-2">Client</th>
            <th className="p-2">Moyen</th>
            <th className="p-2">Montant</th>
            <th className="p-2">Statut</th>
            <th className="p-2">Date</th>
            <th className="p-2">Txn Jèko</th>
          </tr>
        </thead>
        <tbody>
          {paiements.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="p-2">
                <Link
                  href={`/admin/commandes/${p.commandeId}`}
                  className="text-vert underline"
                >
                  {p.commande.reference}
                </Link>
              </td>
              <td className="p-2">{p.commande.clientNom}</td>
              <td className="p-2">{p.moyen ?? "—"}</td>
              <td className="p-2">{fcfa(p.montant)}</td>
              <td className="p-2">
                <Badge variant={PAYMENT_BADGE_VARIANT[p.statut as PaymentStatus]}>
                  {PAYMENT_STATUS_LABELS[p.statut as PaymentStatus] ?? p.statut}
                </Badge>
              </td>
              <td className="p-2 text-xs">{dateHeureFr(p.createdAt)}</td>
              <td className="max-w-40 truncate p-2 text-xs opacity-60">
                {p.transactionJeko ?? "—"}
              </td>
            </tr>
          ))}
          {paiements.length === 0 && (
            <tr>
              <td colSpan={7} className="p-4 text-center opacity-60">
                Aucun paiement.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
