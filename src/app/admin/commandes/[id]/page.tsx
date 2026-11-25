import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/db";
import { fcfa, dateHeureFr } from "@/lib/format";
import {
  changerStatutCommande,
  definirDelaiLivraison,
  enregistrerNoteInterne,
} from "../actions";
import type { StatutCommande as StatutCmd } from "@/generated/prisma/enums";
import {
  Alerte,
  Champ,
  EnTetePage,
  Panneau,
  StatutCommande,
  StatutPaiement,
  Pastille,
  bouton,
  champ,
  zoneTexte,
  lien,
} from "@/components/admin/ui";

// Transitions proposées selon le statut — pour le paiement à la livraison,
// l'annulation reste possible jusqu'à la livraison (refus du client)
const SUIVANT_EN_LIGNE: Partial<
  Record<StatutCmd, { statut: StatutCmd; label: string }[]>
> = {
  en_attente_paiement: [{ statut: "annulee", label: "Annuler" }],
  payee: [
    { statut: "en_preparation", label: "Passer en préparation" },
    { statut: "annulee", label: "Annuler" },
  ],
  en_preparation: [{ statut: "expediee", label: "Marquer expédiée" }],
  expediee: [{ statut: "livree", label: "Marquer livrée" }],
};

const SUIVANT_LIVRAISON: typeof SUIVANT_EN_LIGNE = {
  ...SUIVANT_EN_LIGNE,
  en_preparation: [
    { statut: "expediee", label: "Marquer expédiée" },
    { statut: "annulee", label: "Annuler (refus)" },
  ],
  expediee: [
    { statut: "livree", label: "Livrée — encaisser" },
    { statut: "annulee", label: "Annuler (refus)" },
  ],
};

export default async function DetailCommande({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const prisma = getPrisma();
  const commande = await prisma.order.findUnique({
    where: { id: Number(id) },
    include: {
      lignes: true,
      paiements: {
        orderBy: { createdAt: "desc" },
        include: {
          evenements: { orderBy: { at: "desc" }, take: 12 },
        },
      },
    },
  });
  if (!commande) notFound();

  const livraison = commande.modePaiement === "livraison";
  const actions = (livraison ? SUIVANT_LIVRAISON : SUIVANT_EN_LIGNE)[
    commande.statut
  ] ?? [];

  return (
    <div className="flex flex-col gap-6">
      <EnTetePage
        surTitre={
          <Link href="/admin/commandes" className={lien}>
            Commandes
          </Link>
        }
        titre={`Commande ${commande.reference}`}
        description={`Passée le ${dateHeureFr(commande.createdAt)}`}
        actions={
          <>
            <StatutCommande statut={commande.statut} />
            <StatutPaiement statut={commande.statutPaiement} />
            {livraison ? (
              <Pastille ton="ambre">Paiement à la livraison</Pastille>
            ) : (
              <Pastille ton="vert">Paiement en ligne (Jèko)</Pastille>
            )}
          </>
        }
      />

      {livraison && commande.statutPaiement !== "confirme" && (
        <Alerte ton="alerte" titre={`À encaisser à la remise du colis : ${fcfa(commande.total)}`}>
          Paiement à la livraison — l&apos;encaissement confirme automatiquement
          le paiement.
        </Alerte>
      )}

      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <form
              key={a.statut}
              action={changerStatutCommande.bind(null, commande.id, a.statut)}
            >
              <button
                className={bouton(a.statut === "annulee" ? "danger" : "primaire")}
              >
                {a.label}
              </button>
            </form>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panneau titre="Client">
          <p className="font-semibold">{commande.clientNom}</p>
          <p className="mt-1 text-sm tabular-nums">{commande.clientTelephone}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {commande.clientEmail || "Pas d'email"}
          </p>
        </Panneau>
        <Panneau titre="Livraison">
          <p className="font-semibold">
            {commande.communeNom}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {fcfa(commande.communeTarif)}
            </span>
          </p>
          <p className="mt-1 text-sm">{commande.adresseLivraison}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Délai annoncé : {commande.delaiLivraison ?? "non renseigné"}
          </p>
        </Panneau>
      </div>

      <Panneau titre="Articles" corps="p-0">
        <ul className="divide-y divide-border md:hidden">
          {commande.lignes.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{l.nom}</p>
                <p className="text-xs text-muted-foreground">
                  {l.varianteLabel || "—"} · {l.quantite} × {fcfa(l.prixUnitaire)}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums">
                {fcfa(l.total)}
              </p>
            </li>
          ))}
        </ul>
        <div className="hidden overflow-x-auto md:block">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Variante</th>
                <th className="num">Qté</th>
                <th className="num">P.U.</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {commande.lignes.map((l) => (
                <tr key={l.id}>
                  <td className="font-medium">{l.nom}</td>
                  <td className="text-muted-foreground">{l.varianteLabel || "—"}</td>
                  <td className="num">{l.quantite}</td>
                  <td className="num">{fcfa(l.prixUnitaire)}</td>
                  <td className="num font-semibold">{fcfa(l.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-[#fafbf9] text-sm">
                <td colSpan={4} className="px-5 py-2.5 text-right text-muted-foreground">
                  Sous-total
                </td>
                <td className="px-5 py-2.5 text-right tabular-nums">
                  {fcfa(commande.sousTotal)}
                </td>
              </tr>
              <tr className="border-t border-border bg-[#fafbf9] text-sm">
                <td colSpan={4} className="px-5 py-2.5 text-right text-muted-foreground">
                  Livraison
                </td>
                <td className="px-5 py-2.5 text-right tabular-nums">
                  {fcfa(commande.fraisLivraison)}
                </td>
              </tr>
              <tr className="border-t border-border bg-[#fafbf9]">
                <td colSpan={4} className="px-5 py-3 text-right font-semibold">
                  Total
                </td>
                <td className="px-5 py-3 text-right text-base font-bold tabular-nums">
                  {fcfa(commande.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Panneau>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panneau titre="Délai de livraison" description="Notifié au client (CDC 11.6)">
          <form
            action={definirDelaiLivraison.bind(null, commande.id)}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <Champ label="Délai affiché au client" className="flex-1">
              <input
                name="delaiLivraison"
                defaultValue={commande.delaiLivraison ?? ""}
                placeholder="Ex. livraison prévue jeudi 27 novembre"
                className={champ}
              />
            </Champ>
            <button className={`${bouton("primaire")} self-end`}>
              Enregistrer & notifier
            </button>
          </form>
        </Panneau>

        <Panneau
          titre="Note interne"
          description="Retours et échanges — visible uniquement ici (CDC 9.7)"
        >
          <form action={enregistrerNoteInterne.bind(null, commande.id)}>
            <textarea
              name="noteInterne"
              rows={3}
              defaultValue={commande.noteInterne}
              className={zoneTexte}
              placeholder="Décisions prises : retour accepté, échange, geste commercial…"
            />
            <button className={`${bouton("secondaire", "sm")} mt-3`}>
              Enregistrer la note
            </button>
          </form>
        </Panneau>
      </div>

      <Panneau titre="Paiements" description="Tentatives Jèko et journal des événements">
        {commande.paiements.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {livraison
              ? "Aucun paiement en ligne — encaissement prévu à la livraison."
              : "Aucune tentative de paiement enregistrée."}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {commande.paiements.map((p) => (
              <li key={p.id} className="py-3 text-sm first:pt-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-medium">{p.moyen ?? "—"}</span>
                  <span className="tabular-nums">{fcfa(p.montant)}</span>
                  <StatutPaiement statut={p.statut} />
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {dateHeureFr(p.createdAt)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  txn Jèko : {p.transactionJeko ?? "—"}
                </p>
                {p.evenements.length > 0 && (
                  <details className="mt-1.5 rounded-lg border border-border bg-[#fafbf9]">
                    <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-muted-foreground">
                      Journal — {p.evenements.length} événement
                      {p.evenements.length > 1 ? "s" : ""} (CDC 10.14)
                    </summary>
                    <ul className="space-y-1 border-t border-border px-3 py-2 text-xs">
                      {p.evenements.map((e) => (
                        <li key={e.id} className="flex flex-wrap gap-x-2">
                          <span className="text-muted-foreground tabular-nums">
                            {dateHeureFr(e.at)}
                          </span>
                          <span className="font-medium">{e.type}</span>
                          {e.message && (
                            <span className="text-muted-foreground">
                              {e.message}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panneau>
    </div>
  );
}
