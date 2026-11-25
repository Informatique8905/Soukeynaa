import Link from "next/link";
import { getPrisma } from "@/lib/db";
import { fcfa, dateHeureFr } from "@/lib/format";
import { resoudrePaiement } from "./actions";
import {
  CarteListe,
  EnTetePage,
  Panneau,
  StatutPaiement,
  Vide,
  bouton,
  champ,
  lien,
} from "@/components/admin/ui";

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

  const vide = (
    <Vide titre="Aucun paiement">
      Les tentatives de paiement Jèko apparaîtront ici.
    </Vide>
  );

  return (
    <div className="flex flex-col gap-6">
      <EnTetePage
        titre="Paiements"
        description={`${paiements.length} paiement${paiements.length > 1 ? "s" : ""} affiché${paiements.length > 1 ? "s" : ""} (100 derniers)`}
      />

      {aVerifier.length > 0 && (
        <Panneau
          className="border-amber-200 bg-amber-50/60"
          titre={`${aVerifier.length} paiement${aVerifier.length > 1 ? "s" : ""} à vérifier`}
          description="Vérifiez la transaction sur le portail Jèko, puis résolvez avec un motif — l'action est journalisée (CDC 10.12–10.13). Un double paiement reçu doit être remboursé manuellement via Jèko."
          corps="p-0"
        >
          <ul className="divide-y divide-amber-200/60">
            {aVerifier.map((p) => (
              <li key={p.id} className="bg-white px-5 py-4">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <Link href={`/admin/commandes/${p.commandeId}`} className={lien}>
                    {p.referenceCommande}
                  </Link>
                  <span className="text-sm">{p.commande.clientNom}</span>
                  <span className="text-sm tabular-nums">
                    <strong>{fcfa(p.montant)}</strong>
                    <span className="text-muted-foreground">
                      {" "}(attendu : {fcfa(p.commande.total)})
                    </span>
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  txn Jèko : {p.transactionJeko ?? "—"} · {dateHeureFr(p.createdAt)}
                </p>
                <form className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    name="motif"
                    required
                    minLength={10}
                    placeholder="Motif (min. 10 caractères) — ex. montant vérifié sur le portail Jèko"
                    className={`${champ} min-w-64 flex-1 text-xs`}
                  />
                  <button
                    formAction={resoudrePaiement.bind(null, p.id, "confirme")}
                    className={bouton("primaire", "sm")}
                  >
                    Confirmer (vérifié sur Jèko)
                  </button>
                  <button
                    formAction={resoudrePaiement.bind(null, p.id, "rejete")}
                    className={bouton("danger", "sm")}
                  >
                    Rejeter
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </Panneau>
      )}

      {/* Mobile : cartes */}
      <div className="space-y-3 md:hidden">
        {paiements.map((p) => (
          <CarteListe key={p.id}>
            <div className="flex items-start justify-between gap-3">
              <Link href={`/admin/commandes/${p.commandeId}`} className={`${lien} truncate`}>
                {p.commande.reference}
              </Link>
              <StatutPaiement statut={p.statut} />
            </div>
            <p className="mt-1 truncate text-sm">{p.commande.clientNom}</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {p.moyen ?? "—"} · {dateHeureFr(p.createdAt)}
              </p>
              <p className="text-sm font-semibold tabular-nums">{fcfa(p.montant)}</p>
            </div>
            {p.transactionJeko && (
              <p className="mt-1 truncate text-[11px] text-muted-foreground">
                txn : {p.transactionJeko}
              </p>
            )}
          </CarteListe>
        ))}
        {paiements.length === 0 && <CarteListe className="p-0">{vide}</CarteListe>}
      </div>

      {/* Desktop : tableau */}
      <Panneau corps="p-0" className="hidden md:block">
        {paiements.length === 0 ? (
          vide
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Commande</th>
                  <th>Client</th>
                  <th>Moyen</th>
                  <th className="num">Montant</th>
                  <th>Statut</th>
                  <th>Date</th>
                  <th>Txn Jèko</th>
                </tr>
              </thead>
              <tbody>
                {paiements.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/admin/commandes/${p.commandeId}`} className={lien}>
                        {p.commande.reference}
                      </Link>
                    </td>
                    <td className="font-medium">{p.commande.clientNom}</td>
                    <td className="text-muted-foreground">{p.moyen ?? "—"}</td>
                    <td className="num font-semibold">{fcfa(p.montant)}</td>
                    <td>
                      <StatutPaiement statut={p.statut} />
                    </td>
                    <td className="whitespace-nowrap text-xs text-muted-foreground tabular-nums">
                      {dateHeureFr(p.createdAt)}
                    </td>
                    <td className="max-w-44 truncate font-mono text-xs text-muted-foreground">
                      {p.transactionJeko ?? "—"}
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
