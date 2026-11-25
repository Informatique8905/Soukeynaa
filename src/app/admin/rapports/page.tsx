import { getPrisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_BADGE_VARIANT,
  type PaymentStatus,
} from "@/lib/constants";
import { requireAdmin } from "@/lib/admin";
import { fcfa, dateFr, dateHeureFr } from "@/lib/format";
import { rapportVentes, rapportStock, rapportPromotions } from "@/lib/rapports";
import { getSettings } from "@/lib/settings";
import { BoutonImprimer } from "@/components/admin/BoutonImprimer";

const UNIVERS_LABELS: Record<string, string> = {
  enfants: "Enfants",
  hommes: "Hommes",
  femmes: "Femmes",
  accessoires: "Accessoires",
};

const MOYEN_LABELS: Record<string, string> = {
  wave: "Wave",
  orange_money: "Orange Money",
  mtn_momo: "MTN MoMo",
  moov_money: "Moov Money",
  carte: "Carte bancaire",
};

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
  const periode = { debut, fin };

  const [settings, ventes, promos, instantanes] = await Promise.all([
    getSettings(),
    rapportVentes(periode),
    rapportPromotions(periode),
    prisma.report.findMany({
      orderBy: [{ periodeDebut: "desc" }],
      take: 12,
      select: {
        id: true,
        type: true,
        granularite: true,
        periodeDebut: true,
        periodeFin: true,
        genereLe: true,
      },
    }),
  ]);
  const stockR = await rapportStock(settings.seuilStockFaible);

  const GRAN: Record<string, string> = {
    jour: "Journalier",
    semaine: "Hebdomadaire",
    mois: "Mensuel",
    perso: "Personnalisé",
  };

  return (
    <div className="mx-auto max-w-6xl">
      {/* En-tête d'impression (visible uniquement à l'impression) */}
      <div className="hidden print:block">
        <h1 className="text-xl font-bold">SOUKEYNA — Rapport d&apos;activité</h1>
        <p>
          Période : {dateFr(debut)} → {dateFr(fin)} — généré le{" "}
          {dateHeureFr(new Date())}
        </p>
      </div>

      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-bold text-vert">Rapports</h1>
        <BoutonImprimer />
      </div>

      <form className="mt-4 flex flex-wrap items-end gap-3 rounded border bg-white p-4 text-sm print:hidden">
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

      <p className="mt-4 text-sm opacity-60 print:hidden">
        Période : {dateFr(debut)} → {dateFr(fin)} — seules les commandes au
        paiement confirmé comptent dans le CA (CDC 13.8).
      </p>

      {/* ===== Ventes ===== */}
      <h2 className="mt-6 font-bold">Ventes</h2>
      <div className="mt-2 grid gap-4 md:grid-cols-4">
        {[
          { label: "Commandes payées", valeur: String(ventes.commandes) },
          { label: "Chiffre d'affaires", valeur: fcfa(ventes.chiffreAffaires) },
          { label: "Panier moyen", valeur: fcfa(ventes.panierMoyen) },
          {
            label: "Frais de livraison",
            valeur: fcfa(ventes.fraisLivraison),
          },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5"
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

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className="rounded border bg-white p-4">
          <h3 className="font-semibold">Détail par jour</h3>
          <table className="mt-2 w-full text-sm">
            <thead className="text-left text-xs opacity-60">
              <tr>
                <th>Jour</th>
                <th className="text-right">Commandes</th>
                <th className="text-right">CA</th>
              </tr>
            </thead>
            <tbody>
              {ventes.parJour.map((j) => (
                <tr key={j.jour} className="border-t">
                  <td className="py-1">{dateFr(j.jour)}</td>
                  <td className="py-1 text-right">{j.commandes}</td>
                  <td className="py-1 text-right font-medium tabular-nums">
                    {fcfa(j.ca)}
                  </td>
                </tr>
              ))}
              {ventes.parJour.length === 0 && (
                <tr>
                  <td className="py-2 opacity-50" colSpan={3}>
                    Aucune vente sur la période.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="rounded border bg-white p-4">
          <h3 className="font-semibold">Ventes par univers</h3>
          <table className="mt-2 w-full text-sm">
            <tbody>
              {ventes.parUnivers.map((u) => (
                <tr key={u.univers} className="border-t">
                  <td className="py-1.5">
                    {UNIVERS_LABELS[u.univers] ?? u.univers}
                  </td>
                  <td className="py-1.5 text-right">{u.quantite} art.</td>
                  <td className="py-1.5 text-right font-medium tabular-nums">
                    {fcfa(u.ca)}
                  </td>
                </tr>
              ))}
              {ventes.parUnivers.length === 0 && (
                <tr>
                  <td className="py-2 opacity-50">Aucune vente.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="rounded border bg-white p-4">
          <h3 className="font-semibold">Produits les plus vendus</h3>
          <table className="mt-2 w-full text-sm">
            <tbody>
              {ventes.topProduits.map((p, i) => (
                <tr key={i} className="border-t">
                  <td className="py-1.5">{p.nom}</td>
                  <td className="py-1.5 text-right">{p.quantite}</td>
                  <td className="py-1.5 text-right font-medium tabular-nums">
                    {fcfa(p.ca)}
                  </td>
                </tr>
              ))}
              {ventes.topProduits.length === 0 && (
                <tr>
                  <td className="py-2 opacity-50">Aucune vente.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* ===== Livraisons ===== */}
        <section className="rounded border bg-white p-4">
          <h3 className="font-semibold">Livraisons par commune</h3>
          <table className="mt-2 w-full text-sm">
            <tbody>
              {ventes.parCommune.map((c) => (
                <tr key={c.commune} className="border-t">
                  <td className="py-1.5">{c.commune}</td>
                  <td className="py-1.5 text-right">{c.commandes}</td>
                  <td className="py-1.5 text-right font-medium tabular-nums">
                    {fcfa(c.frais)}
                  </td>
                </tr>
              ))}
              {ventes.parCommune.length === 0 && (
                <tr>
                  <td className="py-2 opacity-50">Aucune livraison.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* ===== Paiements ===== */}
        <section className="rounded border bg-white p-4">
          <h3 className="font-semibold">Paiements</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {ventes.paiements.map((p) => (
              <li
                key={p.statut}
                className="flex items-center justify-between py-1.5"
              >
                <Badge
                  variant={PAYMENT_BADGE_VARIANT[p.statut as PaymentStatus]}
                >
                  {PAYMENT_STATUS_LABELS[p.statut as PaymentStatus] ?? p.statut}
                </Badge>
                <span className="font-bold tabular-nums">{p.nombre}</span>
              </li>
            ))}
            {ventes.paiements.length === 0 && (
              <li className="opacity-50">Aucun paiement.</li>
            )}
          </ul>
          {ventes.parMoyen.length > 0 && (
            <>
              <h4 className="mt-3 text-xs font-semibold uppercase opacity-60">
                Par moyen de paiement
              </h4>
              <table className="mt-1 w-full text-sm">
                <tbody>
                  {ventes.parMoyen.map((m) => (
                    <tr key={m.moyen} className="border-t">
                      <td className="py-1.5">
                        {MOYEN_LABELS[m.moyen] ?? m.moyen}
                      </td>
                      <td className="py-1.5 text-right">{m.nombre}</td>
                      <td className="py-1.5 text-right font-medium tabular-nums">
                        {fcfa(m.montant)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>

        {/* ===== Stock ===== */}
        <section className="rounded border bg-white p-4">
          <h3 className="font-semibold">
            Stock{" "}
            <span className="text-xs font-normal opacity-60">
              (instantané — seuil « faible » : {settings.seuilStockFaible})
            </span>
          </h3>
          <p className="mt-2 text-sm">
            <strong>{stockR.articles}</strong> articles suivis — valeur du
            stock :{" "}
            <strong className="text-vert">{fcfa(stockR.valeurStock)}</strong>
          </p>
          {stockR.ruptures.length > 0 && (
            <>
              <h4 className="mt-3 text-xs font-semibold uppercase text-red-700">
                Ruptures ({stockR.ruptures.length})
              </h4>
              <ul className="mt-1 text-sm">
                {stockR.ruptures.slice(0, 10).map((r, i) => (
                  <li key={i} className="py-0.5">
                    {r.nom} {r.variante !== "—" && `(${r.variante})`}
                  </li>
                ))}
              </ul>
            </>
          )}
          {stockR.faibles.length > 0 && (
            <>
              <h4 className="mt-3 text-xs font-semibold uppercase text-amber-700">
                Stock faible ({stockR.faibles.length})
              </h4>
              <ul className="mt-1 text-sm">
                {stockR.faibles.slice(0, 10).map((f, i) => (
                  <li key={i} className="py-0.5">
                    {f.nom} {f.variante !== "—" && `(${f.variante})`} —{" "}
                    <strong>{f.stock}</strong> restant(s)
                  </li>
                ))}
              </ul>
            </>
          )}
          {stockR.ruptures.length === 0 && stockR.faibles.length === 0 && (
            <p className="mt-2 text-sm opacity-50">
              Aucune rupture ni stock faible.
            </p>
          )}
        </section>

        {/* ===== Promotions ===== */}
        <section className="rounded border bg-white p-4">
          <h3 className="font-semibold">Promotions</h3>
          <table className="mt-2 w-full text-sm">
            <thead className="text-left text-xs opacity-60">
              <tr>
                <th>Nom</th>
                <th className="text-right">Réduc.</th>
                <th className="text-right">Ventes</th>
                <th className="text-right">CA</th>
              </tr>
            </thead>
            <tbody>
              {promos.promos.map((p, i) => (
                <tr key={i} className="border-t">
                  <td className="py-1.5">{p.nom}</td>
                  <td className="py-1.5 text-right">
                    {p.type === "pourcentage"
                      ? `-${p.valeur}%`
                      : `-${fcfa(p.valeur)}`}
                  </td>
                  <td className="py-1.5 text-right">{p.ventes}</td>
                  <td className="py-1.5 text-right font-medium tabular-nums">
                    {fcfa(p.ca)}
                  </td>
                </tr>
              ))}
              {promos.promos.length === 0 && (
                <tr>
                  <td className="py-2 opacity-50" colSpan={4}>
                    Aucune promotion sur la période.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>

      {/* ===== Instantanés automatiques ===== */}
      <section className="mt-6 rounded border bg-white p-4 print:hidden">
        <h2 className="font-semibold">Rapports automatiques (instantanés)</h2>
        <p className="mt-1 text-xs opacity-60">
          Générés par la tâche planifiée /api/cron/rapports (CDC 13.8).
        </p>
        <table className="mt-2 w-full text-sm">
          <tbody>
            {instantanes.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="py-1.5 capitalize">{r.type}</td>
                <td className="py-1.5">{GRAN[r.granularite] ?? r.granularite}</td>
                <td className="py-1.5">
                  {dateFr(r.periodeDebut)} → {dateFr(r.periodeFin)}
                </td>
                <td className="py-1.5 text-right text-xs opacity-60">
                  généré le {dateHeureFr(r.genereLe)}
                </td>
              </tr>
            ))}
            {instantanes.length === 0 && (
              <tr>
                <td className="py-2 opacity-50">
                  Aucun instantané — configurez le cron (voir vercel.json).
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
