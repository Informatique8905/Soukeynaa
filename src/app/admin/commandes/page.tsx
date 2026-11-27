import Link from "next/link";
import { getPrisma } from "@/lib/db";
import { fcfa, dateFr, heureFr } from "@/lib/format";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import {
  AvatarClient,
  CarteListe,
  EnTetePage,
  Panneau,
  Pastille,
  StatutCommandeLigne,
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

// Commandes qui attendent une action de l'admin — listées en premier,
// surlignées en vert et comptées dans la pastille « à traiter ».
const A_TRAITER = ["en_attente_paiement", "payee", "en_preparation"] as const;
const aTraiter = (statut: string) => (A_TRAITER as readonly string[]).includes(statut);

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
      take: 200,
    }),
    prisma.order.count({ where: { statut: { in: [...A_TRAITER] } } }),
  ]);
  // Les commandes à traiter remontent en tête ; les traitées descendent
  // (tri stable : l'ordre chronologique est conservé dans chaque groupe).
  commandes.sort(
    (a, b) => Number(aTraiter(b.statut)) - Number(aTraiter(a.statut)),
  );
  // Frontière entre les deux groupes — sert à insérer un séparateur.
  const iPremiereTraitee = commandes.findIndex((c) => !aTraiter(c.statut));
  const aDeuxGroupes =
    iPremiereTraitee > 0 && commandes.length > iPremiereTraitee;

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
          <Pastille ton="vert" className="h-9 px-3.5 text-xs font-semibold">
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
        {commandes.map((c, i) => (
          <div key={c.id}>
            {aDeuxGroupes && i === iPremiereTraitee && (
              <p className="pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Déjà traitées
              </p>
            )}
          <Link href={`/admin/commandes/${c.id}`} className="block">
            <CarteListe
              className={`transition-colors active:bg-muted/40 ${aTraiter(c.statut) ? "border-vert/30 bg-vert-clair/50" : ""}`}
            >
              <div className="flex items-center gap-3">
                <AvatarClient nom={c.clientNom} graine={c.id} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.clientNom}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.reference} · {c.communeNom}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold tabular-nums">{fcfa(c.total)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                    {dateFr(c.createdAt)} · {heureFr(c.createdAt)}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
                <StatutCommandeLigne statut={c.statut} />
                <span className="text-xs text-muted-foreground">
                  {PAYMENT_STATUS_LABELS[c.statutPaiement]}
                  {c.modePaiement === "livraison" ? " · à la livraison" : ""}
                </span>
              </div>
            </CarteListe>
          </Link>
          </div>
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
                  <th className="w-12">
                    <span className="sr-only">Ouvrir</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {commandes.map((c, i) => (
                  <LigneCliquable
                    key={c.id}
                    apresSep={aDeuxGroupes && i === iPremiereTraitee}
                    href={`/admin/commandes/${c.id}`}
                    className={`group focus-visible:outline-none ${aTraiter(c.statut) ? "non-traitee focus-visible:bg-vert-clair" : "focus-visible:bg-muted/50"}`}
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        <AvatarClient nom={c.clientNom} graine={c.id} />
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
