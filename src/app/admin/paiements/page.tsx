import Link from "next/link";
import { getPrisma } from "@/lib/db";
import { fcfa, dateFr, heureFr, dateHeureFr } from "@/lib/format";
import { resoudrePaiement } from "./actions";
import { ChevronRight } from "lucide-react";
import {
  AvatarClient,
  CarteListe,
  EnTetePage,
  Panneau,
  StatutPaiementLigne,
  Vide,
  bouton,
  champ,
  lien,
} from "@/components/admin/ui";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { LigneCliquable } from "@/components/admin/LigneCliquable";

// Tentatives non soldees — surlignees en vert comme les commandes a traiter
const NON_SOLDES = ["en_attente", "a_verifier"] as const;
const nonSolde = (statut: string) => (NON_SOLDES as readonly string[]).includes(statut);

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
      Les tentatives de paiement en ligne apparaîtront ici.
    </Vide>
  );

  return (
    <div className="flex flex-col gap-6">
      <EnTetePage
        titre="Paiements"
        description="Suivi des tentatives de paiement en ligne"
      />

      {aVerifier.length > 0 && (
        <Panneau
          className="border-amber-200 bg-amber-50/60"
          titre={`${aVerifier.length} paiement${aVerifier.length > 1 ? "s" : ""} à vérifier`}
          description="Vérifiez la transaction auprès du prestataire de paiement, puis résolvez avec un motif. L'action est journalisée (CDC 10.12–10.13). Un double paiement reçu doit être remboursé manuellement."
          corps="p-0"
        >
          <ul className="divide-y divide-amber-200/60">
            {aVerifier.map((p) => (
              <li key={p.id} className="bg-white px-5 py-4">
                <div className="flex items-center gap-3">
                  <AvatarClient nom={p.commande.clientNom} graine={p.id} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {p.commande.clientNom}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      <Link
                        href={`/admin/commandes/${p.commandeId}`}
                        className={lien}
                      >
                        {p.referenceCommande}
                      </Link>{" "}
                      · txn : {p.transactionJeko ?? "—"} ·{" "}
                      {dateHeureFr(p.createdAt)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold tabular-nums">
                      {fcfa(p.montant)}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      attendu : {fcfa(p.commande.total)}
                    </p>
                  </div>
                </div>
                <form className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    name="motif"
                    required
                    minLength={10}
                    placeholder="Motif (min. 10 caractères). Ex. : montant vérifié"
                    className={`${champ} min-w-64 flex-1 text-xs`}
                  />
                  <button
                    formAction={resoudrePaiement.bind(null, p.id, "confirme")}
                    className={bouton("primaire", "sm")}
                  >
                    Confirmer (vérifié)
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
          <Link
            key={p.id}
            href={`/admin/commandes/${p.commandeId}`}
            className="block"
          >
            <CarteListe
              className={`transition-colors active:bg-muted/40 ${nonSolde(p.statut) ? "border-vert/30 bg-vert-clair/50" : ""}`}
            >
              <div className="flex items-center gap-3">
                <AvatarClient nom={p.commande.clientNom} graine={p.id} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.commande.clientNom}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.commande.reference} ·{' '}
                    {p.moyen ? PAYMENT_METHOD_LABELS[p.moyen] : '—'}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold tabular-nums">{fcfa(p.montant)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                    {dateFr(p.createdAt)} · {heureFr(p.createdAt)}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
                <StatutPaiementLigne statut={p.statut} />
                {p.transactionJeko && (
                  <span className="truncate text-xs text-muted-foreground">
                    txn : {p.transactionJeko}
                  </span>
                )}
              </div>
            </CarteListe>
          </Link>
        ))}
        {paiements.length === 0 && <CarteListe className="p-0">{vide}</CarteListe>}
      </div>

      {/* Desktop : tableau « Payment History » */}
      <Panneau
        titre="Historique des paiements"
        description={`Les ${paiements.length} tentative${paiements.length > 1 ? 's' : ''} les plus récentes`}
        corps="p-0"
        className="hidden md:block"
      >
        {paiements.length === 0 ? (
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
                  <th className="w-12">
                    <span className="sr-only">Ouvrir</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paiements.map((p) => (
                  <LigneCliquable
                    key={p.id}
                    href={`/admin/commandes/${p.commandeId}`}
                    className={`group focus-visible:outline-none ${nonSolde(p.statut) ? 'non-traitee focus-visible:bg-vert-clair' : 'focus-visible:bg-muted/50'}`}
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        <AvatarClient nom={p.commande.clientNom} graine={p.id} />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">
                            {p.commande.clientNom}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {p.commande.reference} ·{' '}
                            {p.moyen ? PAYMENT_METHOD_LABELS[p.moyen] : '—'}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap tabular-nums">
                      {dateFr(p.createdAt)}
                    </td>
                    <td className="whitespace-nowrap text-muted-foreground tabular-nums">
                      {heureFr(p.createdAt)}
                    </td>
                    <td>
                      <StatutPaiementLigne statut={p.statut} />
                      {p.transactionJeko && (
                        <span className="mt-0.5 block max-w-44 truncate text-xs text-muted-foreground">
                          txn : {p.transactionJeko}
                        </span>
                      )}
                    </td>
                    <td className="num font-semibold">{fcfa(p.montant)}</td>
                    <td className="w-12">
                      <ChevronRight
                        aria-hidden
                        className="ml-auto size-4 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-vert"
                      />
                    </td>
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
