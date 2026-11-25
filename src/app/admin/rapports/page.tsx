import { getPrisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { fcfa, dateFr, dateHeureFr } from "@/lib/format";
import { rapportVentes, rapportStock, rapportPromotions } from "@/lib/rapports";
import { getSettings } from "@/lib/settings";
import { BoutonImprimer } from "@/components/admin/BoutonImprimer";
import {
  Alerte,
  Champ,
  EnTetePage,
  Indicateur,
  Panneau,
  StatutPaiement,
  bouton,
  champ,
} from "@/components/admin/ui";
import { Download } from "lucide-react";

const MOYEN_LABELS: Record<string, string> = {
  wave: "Wave",
  orange_money: "Orange Money",
  mtn_momo: "MTN MoMo",
  moov_money: "Moov Money",
  carte: "Carte bancaire",
};

const GRAN: Record<string, string> = {
  jour: "Journalier",
  semaine: "Hebdomadaire",
  mois: "Mensuel",
  perso: "Personnalisé",
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

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête d'impression (visible uniquement à l'impression) */}
      <div className="hidden print:block">
        <h1 className="text-xl font-bold">Rapport d&apos;activité SOUKEYNA</h1>
        <p>
          Période du {dateFr(debut)} au {dateFr(fin)}, généré le{" "}
          {dateHeureFr(new Date())}
        </p>
      </div>

      <div className="print:hidden">
        <EnTetePage
          titre="Rapports"
          description="Chiffre d'affaires, produits, livraisons et stock sur la période choisie."
          actions={<BoutonImprimer />}
        />
      </div>

      <Panneau className="print:hidden" corps="p-4">
        <form className="flex flex-wrap items-end gap-3">
          <Champ label="Du" className="w-40">
            <input
              type="date"
              name="debut"
              defaultValue={debut.toISOString().slice(0, 10)}
              className={champ}
            />
          </Champ>
          <Champ label="Au" className="w-40">
            <input
              type="date"
              name="fin"
              defaultValue={fin.toISOString().slice(0, 10)}
              className={champ}
            />
          </Champ>
          <button className={bouton("primaire")}>Générer</button>
          <a
            href={`/admin/rapports/export?debut=${debut.toISOString().slice(0, 10)}&fin=${fin.toISOString().slice(0, 10)}`}
            className={bouton("secondaire")}
          >
            <Download />
            Exporter CSV
          </a>
        </form>
      </Panneau>

      <p className="text-xs text-muted-foreground">
        Période : <span className="font-medium text-foreground">{dateFr(debut)} → {dateFr(fin)}</span>
        {" "}Seules les commandes au paiement confirmé comptent dans le CA (CDC 13.8).
      </p>

      {/* ===== Indicateurs ===== */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Indicateur label="Commandes payées" valeur={ventes.commandes} />
        <Indicateur label="Chiffre d'affaires" valeur={fcfa(ventes.chiffreAffaires)} />
        <Indicateur label="Panier moyen" valeur={fcfa(ventes.panierMoyen)} />
        <Indicateur label="Frais de livraison" valeur={fcfa(ventes.fraisLivraison)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panneau titre="Détail par jour" corps="p-0">
          <div className="overflow-x-auto">
            <table className="admin-table compact">
              <thead>
                <tr>
                  <th>Jour</th>
                  <th className="num">Commandes</th>
                  <th className="num">CA</th>
                </tr>
              </thead>
              <tbody>
                {ventes.parJour.map((j) => (
                  <tr key={j.jour}>
                    <td className="tabular-nums">{dateFr(j.jour)}</td>
                    <td className="num">{j.commandes}</td>
                    <td className="num font-medium">{fcfa(j.ca)}</td>
                  </tr>
                ))}
                {ventes.parJour.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center text-muted-foreground">
                      Aucune vente sur la période.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panneau>

        <Panneau titre="Produits les plus vendus" corps="p-0">
          <div className="overflow-x-auto">
            <table className="admin-table compact">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th className="num">Qté</th>
                  <th className="num">CA</th>
                </tr>
              </thead>
              <tbody>
                {ventes.topProduits.map((p, i) => (
                  <tr key={i}>
                    <td className="font-medium">{p.nom}</td>
                    <td className="num">{p.quantite}</td>
                    <td className="num font-medium">{fcfa(p.ca)}</td>
                  </tr>
                ))}
                {ventes.topProduits.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center text-muted-foreground">
                      Aucune vente.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panneau>

        <Panneau titre="Livraisons par commune" corps="p-0">
          <div className="overflow-x-auto">
            <table className="admin-table compact">
              <thead>
                <tr>
                  <th>Commune</th>
                  <th className="num">Commandes</th>
                  <th className="num">Frais</th>
                </tr>
              </thead>
              <tbody>
                {ventes.parCommune.map((c) => (
                  <tr key={c.commune}>
                    <td className="font-medium">{c.commune}</td>
                    <td className="num">{c.commandes}</td>
                    <td className="num font-medium">{fcfa(c.frais)}</td>
                  </tr>
                ))}
                {ventes.parCommune.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center text-muted-foreground">
                      Aucune livraison.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panneau>

        <Panneau titre="Paiements">
          {ventes.paiements.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun paiement.</p>
          ) : (
            <ul className="divide-y divide-border">
              {ventes.paiements.map((p) => (
                <li key={p.statut} className="flex items-center justify-between py-2 first:pt-0">
                  <StatutPaiement statut={p.statut} />
                  <span className="text-sm font-semibold tabular-nums">{p.nombre}</span>
                </li>
              ))}
            </ul>
          )}
          {ventes.parMoyen.length > 0 && (
            <>
              <p className="mt-4 border-t border-border pt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Par moyen de paiement
              </p>
              <table className="admin-table compact mt-2">
                <tbody>
                  {ventes.parMoyen.map((m) => (
                    <tr key={m.moyen}>
                      <td className="pl-0 font-medium">{MOYEN_LABELS[m.moyen] ?? m.moyen}</td>
                      <td className="num">{m.nombre}</td>
                      <td className="num font-medium">{fcfa(m.montant)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Panneau>

        <Panneau
          titre="Stock"
          description={`Instantané (seuil « faible » : ${settings.seuilStockFaible})`}
        >
          <p className="text-sm">
            <strong className="tabular-nums">{stockR.articles}</strong> articles
            suivis. Valeur du stock :{" "}
            <strong className="text-vert tabular-nums">
              {fcfa(stockR.valeurStock)}
            </strong>
          </p>
          {stockR.ruptures.length === 0 && stockR.faibles.length === 0 ? (
            <Alerte ton="info" className="mt-3">
              Aucune rupture ni stock faible.
            </Alerte>
          ) : (
            <div className="mt-3 space-y-4">
              {stockR.ruptures.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-destructive">
                    Ruptures ({stockR.ruptures.length})
                  </p>
                  <ul className="mt-1.5 space-y-1 text-sm">
                    {stockR.ruptures.slice(0, 10).map((r, i) => (
                      <li key={i} className="flex justify-between gap-3">
                        <span className="truncate">
                          {r.nom} {r.variante !== "—" && `(${r.variante})`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {stockR.faibles.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                    Stock faible ({stockR.faibles.length})
                  </p>
                  <ul className="mt-1.5 space-y-1 text-sm">
                    {stockR.faibles.slice(0, 10).map((f, i) => (
                      <li key={i} className="flex justify-between gap-3">
                        <span className="truncate">
                          {f.nom} {f.variante !== "—" && `(${f.variante})`}
                        </span>
                        <span className="shrink-0 font-medium tabular-nums">
                          {f.stock} restant{f.stock > 1 ? "s" : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Panneau>

        <Panneau titre="Promotions" corps="p-0">
          <div className="overflow-x-auto">
            <table className="admin-table compact">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th className="num">Réduction</th>
                  <th className="num">Ventes</th>
                  <th className="num">CA</th>
                </tr>
              </thead>
              <tbody>
                {promos.promos.map((p, i) => (
                  <tr key={i}>
                    <td className="font-medium">{p.nom}</td>
                    <td className="num">
                      {p.type === "pourcentage" ? `-${p.valeur} %` : `-${fcfa(p.valeur)}`}
                    </td>
                    <td className="num">{p.ventes}</td>
                    <td className="num font-medium">{fcfa(p.ca)}</td>
                  </tr>
                ))}
                {promos.promos.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-muted-foreground">
                      Aucune promotion sur la période.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panneau>
      </div>

      <Panneau
        className="print:hidden"
        titre="Rapports automatiques"
        description="Instantanés générés par la tâche planifiée /api/cron/rapports (CDC 13.8)"
        corps="p-0"
      >
        <div className="overflow-x-auto">
          <table className="admin-table compact">
            <thead>
              <tr>
                <th>Type</th>
                <th>Granularité</th>
                <th>Période</th>
                <th className="num">Généré le</th>
              </tr>
            </thead>
            <tbody>
              {instantanes.map((r) => (
                <tr key={r.id}>
                  <td className="font-medium capitalize">{r.type}</td>
                  <td>{GRAN[r.granularite] ?? r.granularite}</td>
                  <td className="tabular-nums">
                    {dateFr(r.periodeDebut)} → {dateFr(r.periodeFin)}
                  </td>
                  <td className="num text-xs text-muted-foreground tabular-nums">
                    {dateHeureFr(r.genereLe)}
                  </td>
                </tr>
              ))}
              {instantanes.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-muted-foreground">
                    Aucun instantané. Configurez le cron (voir vercel.json).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panneau>
    </div>
  );
}
