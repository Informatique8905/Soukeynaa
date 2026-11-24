import { getPrisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { PAYMENT_STATUS_LABELS, PAYMENT_BADGE_VARIANT, type PaymentStatus } from "@/lib/constants";
import { requireAdmin } from "@/lib/admin";
import { fcfa, dateFr } from "@/lib/format";

export default async function RapportsPage({
  searchParams,
}: {
  searchParams: Promise<{ debut?: string; fin?: string }>;
}) {
  await requireAdmin();
  const prisma = getPrisma();
  const sp = await searchParams;

  const fin = sp.fin ? new Date(sp.fin + "T23:59:59") : new Date();
  const debut = sp.debut
    ? new Date(sp.debut + "T00:00:00")
    : new Date(fin.getTime() - 30 * 24 * 3600_000);
  const periode = { gte: debut, lte: fin };

  const [commandes, parCommune, topProduits, paiements] = await Promise.all([
    // Ventes (CDC 13.2) : commandes payées de la période
    prisma.order.aggregate({
      where: { statutPaiement: "confirme", createdAt: periode },
      _sum: { total: true, fraisLivraison: true },
      _count: true,
    }),
    // Livraisons par commune (CDC 13.5)
    prisma.order.groupBy({
      by: ["communeNom"],
      where: { statutPaiement: "confirme", createdAt: periode },
      _count: true,
      _sum: { fraisLivraison: true },
      orderBy: { _count: { communeNom: "desc" } },
    }),
    // Produits les plus vendus (CDC 13.3)
    prisma.orderLine.groupBy({
      by: ["nom", "produitId"],
      where: { commande: { statutPaiement: "confirme", createdAt: periode } },
      _sum: { quantite: true, total: true },
      orderBy: { _sum: { quantite: "desc" } },
      take: 10,
    }),
    // Paiements par statut (CDC 13.6)
    prisma.payment.groupBy({
      by: ["statut"],
      where: { createdAt: periode },
      _count: true,
    }),
  ]);

  const ca = commandes._sum.total ?? 0;
  const livraison = commandes._sum.fraisLivraison ?? 0;

  return (
    <div className="mx-auto max-w-6xl">
      <h1>Rapports</h1>

      <form className="mt-4 flex flex-wrap items-end gap-3 rounded border bg-white p-4 text-sm">
        <div>
          <label className="block text-xs opacity-60">Du</label>
          <input
            type="date"
            name="debut"
            defaultValue={debut.toISOString().slice(0, 10)}
            className="rounded border px-2 py-1.5"
          />
        </div>
        <div>
          <label className="block text-xs opacity-60">Au</label>
          <input
            type="date"
            name="fin"
            defaultValue={fin.toISOString().slice(0, 10)}
            className="rounded border px-2 py-1.5"
          />
        </div>
        <button className="rounded bg-vert px-4 py-2 font-semibold text-white">
          Générer
        </button>
        <a
          href={`/admin/rapports/export?debut=${debut.toISOString().slice(0, 10)}&fin=${fin.toISOString().slice(0, 10)}`}
          className="rounded border px-4 py-2"
        >
          Exporter CSV
        </a>
      </form>

      <p className="mt-4 text-sm opacity-60">
        Période : {dateFr(debut)} → {dateFr(fin)}
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {[
          { label: "Commandes payées", valeur: String(commandes._count) },
          { label: "Chiffre d'affaires", valeur: fcfa(ca) },
          { label: "Frais de livraison encaissés", valeur: fcfa(livraison) },
        ].map((k, i) => (
          <div
            key={k.label}
            className="lift rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-gris-fonce">
              {k.label}
            </p>
            <p className="mt-1 text-2xl font-extrabold text-vert tabular-nums">
              {k.valeur}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded border bg-white p-4">
          <h2 className="font-semibold">Top produits vendus</h2>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {topProduits.map((p, i) => (
                <tr key={i} className="border-t">
                  <td className="py-1.5">{p.nom}</td>
                  <td className="py-1.5 text-right">{p._sum.quantite}</td>
                  <td className="py-1.5 text-right font-medium">
                    {fcfa(p._sum.total ?? 0)}
                  </td>
                </tr>
              ))}
              {topProduits.length === 0 && (
                <tr>
                  <td className="py-2 opacity-50">Aucune vente sur la période.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="rounded border bg-white p-4">
          <h2 className="font-semibold">Livraisons par commune</h2>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {parCommune.map((c) => (
                <tr key={c.communeNom} className="border-t">
                  <td className="py-1.5">{c.communeNom}</td>
                  <td className="py-1.5 text-right">{c._count}</td>
                  <td className="py-1.5 text-right font-medium">
                    {fcfa(c._sum.fraisLivraison ?? 0)}
                  </td>
                </tr>
              ))}
              {parCommune.length === 0 && (
                <tr>
                  <td className="py-2 opacity-50">Aucune livraison.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="rounded border bg-white p-4">
          <h2 className="font-semibold">Paiements par statut</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {paiements.map((p) => (
              <li key={p.statut} className="flex items-center justify-between py-2">
                <Badge variant={PAYMENT_BADGE_VARIANT[p.statut as PaymentStatus]}>
                  {PAYMENT_STATUS_LABELS[p.statut as PaymentStatus] ?? p.statut}
                </Badge>
                <span className="font-bold tabular-nums">{p._count}</span>
              </li>
            ))}
            {paiements.length === 0 && (
              <li className="opacity-50">Aucun paiement.</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
