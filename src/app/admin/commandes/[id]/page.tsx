import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/db";
import { fcfa, dateHeureFr } from "@/lib/format";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  ORDER_BADGE_VARIANT,
  PAYMENT_BADGE_VARIANT,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import {
  changerStatutCommande,
  definirDelaiLivraison,
  enregistrerNoteInterne,
} from "../actions";
import type { StatutCommande } from "@/generated/prisma/enums";

// Transitions proposées selon le statut — pour le paiement à la livraison,
// l'annulation reste possible jusqu'à la livraison (refus du client)
const SUIVANT_EN_LIGNE: Partial<
  Record<StatutCommande, { statut: StatutCommande; label: string }[]>
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
    <div className="max-w-4xl">
      {/* En-tête */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">
          Commande {commande.reference}
        </h1>
        <Badge variant={ORDER_BADGE_VARIANT[commande.statut as OrderStatus]}>
          {ORDER_STATUS_LABELS[commande.statut as OrderStatus] ??
            commande.statut}
        </Badge>
        <Badge variant={PAYMENT_BADGE_VARIANT[commande.statutPaiement as PaymentStatus]}>
          {PAYMENT_STATUS_LABELS[commande.statutPaiement as PaymentStatus] ??
            commande.statutPaiement}
        </Badge>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ${
            livraison
              ? "bg-amber-50 text-amber-800 ring-amber-200"
              : "bg-vert/10 text-vert ring-vert/20"
          }`}
        >
          {livraison ? "Paiement à la livraison" : "Paiement en ligne (Jèko)"}
        </span>
      </div>
      <p className="mt-1.5 text-sm text-gris-fonce">
        Passée le {dateHeureFr(commande.createdAt)}
      </p>

      {/* À encaisser — rappel visible pour le livreur */}
      {livraison && commande.statutPaiement !== "confirme" && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
          <span aria-hidden className="mt-1 size-2.5 shrink-0 rounded-full bg-amber-500" />
          <p className="text-sm font-semibold text-amber-900">
            À encaisser à la remise du colis :{" "}
            <span className="text-base font-extrabold">
              {fcfa(commande.total)}
            </span>
          </p>
        </div>
      )}

      {/* Actions */}
      {actions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {actions.map((a) => (
            <form
              key={a.statut}
              action={changerStatutCommande.bind(null, commande.id, a.statut)}
            >
              <button
                className={`rounded-full px-5 py-2.5 text-sm font-bold shadow-sm transition hover:-translate-y-px hover:shadow ${
                  a.statut === "annulee"
                    ? "bg-red-50 text-red-700 ring-1 ring-red-200 hover:bg-red-100"
                    : "bg-vert text-white shadow-vert/25 hover:bg-vert-fonce"
                }`}
              >
                {a.label}
              </button>
            </form>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl bg-white p-4 text-sm shadow-sm ring-1 ring-black/5">
          <h2 className="flex items-center gap-2 font-bold">
            Client
          </h2>
          <p className="mt-2 font-semibold">{commande.clientNom}</p>
          <p>{commande.clientTelephone}</p>
          <p className="text-xs text-gris-fonce">{commande.clientEmail}</p>
        </section>
        <section className="rounded-2xl bg-white p-4 text-sm shadow-sm ring-1 ring-black/5">
          <h2 className="flex items-center gap-2 font-bold">
            Livraison
          </h2>
          <p className="mt-2 font-semibold">
            {commande.communeNom} — {fcfa(commande.communeTarif)}
          </p>
          <p>{commande.adresseLivraison}</p>
          <p className="mt-1 text-xs text-gris-fonce">
            Délai annoncé : {commande.delaiLivraison ?? "non renseigné"}
          </p>
        </section>
      </div>

      <section className="mt-4 rounded-2xl bg-white p-4 text-sm shadow-sm ring-1 ring-black/5">
        <h2 className="flex items-center gap-2 font-bold">
          Articles
        </h2>
        <table className="mt-2 w-full">
          <thead className="text-left text-xs text-gris-fonce">
            <tr>
              <th>Produit</th>
              <th>Variante</th>
              <th>Qté</th>
              <th>P.U.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {commande.lignes.map((l) => (
              <tr key={l.id}>
                <td>{l.nom}</td>
                <td>{l.varianteLabel || "—"}</td>
                <td>{l.quantite}</td>
                <td>{fcfa(l.prixUnitaire)}</td>
                <td>{fcfa(l.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 space-y-0.5 text-right">
          <p className="text-gris-fonce">
            Sous-total : {fcfa(commande.sousTotal)}
          </p>
          <p className="text-gris-fonce">
            Livraison : {fcfa(commande.fraisLivraison)}
          </p>
          <p className="text-lg font-extrabold">
            Total : {fcfa(commande.total)}
          </p>
        </div>
      </section>

      <section className="mt-4 rounded-2xl bg-white p-4 text-sm shadow-sm ring-1 ring-black/5">
        <h2 className="font-bold">Délai de livraison (CDC 11.6)</h2>
        <form
          action={definirDelaiLivraison.bind(null, commande.id)}
          className="mt-2 flex gap-2"
        >
          <input
            name="delaiLivraison"
            defaultValue={commande.delaiLivraison ?? ""}
            placeholder="Ex. livraison prévue jeudi 27 novembre"
            className="flex-1 rounded-xl border border-black/10 px-3 py-2 text-sm outline-none transition focus:border-vert focus:ring-4 focus:ring-vert/10"
          />
          <button className="rounded-full bg-noir px-4 py-2 text-sm font-semibold text-white transition hover:bg-vert">
            Enregistrer & notifier
          </button>
        </form>
      </section>

      <section className="mt-4 rounded-2xl bg-white p-4 text-sm shadow-sm ring-1 ring-black/5">
        <h2 className="font-bold">Paiements</h2>
        {commande.paiements.length === 0 && (
          <p className="mt-2 text-gris-fonce">
            {livraison
              ? "Aucun paiement en ligne — encaissement prévu à la livraison."
              : "Aucune tentative de paiement enregistrée."}
          </p>
        )}
        {commande.paiements.map((p) => (
          <div key={p.id} className="mt-2 border-t border-black/5 pt-2 text-xs">
            {p.moyen ?? "?"} — {fcfa(p.montant)} —{" "}
            <strong>{p.statut}</strong> — {dateHeureFr(p.createdAt)}
            <span className="block text-gris-fonce">
              txn Jèko : {p.transactionJeko ?? "—"}
            </span>
            {p.evenements.length > 0 && (
              <details className="mt-1">
                <summary className="cursor-pointer text-gris-fonce">
                  Journal ({p.evenements.length} événement(s), CDC 10.14)
                </summary>
                <ul className="mt-1 space-y-0.5 border-l-2 border-black/5 pl-2">
                  {p.evenements.map((e) => (
                    <li key={e.id}>
                      <span className="opacity-60">
                        {dateHeureFr(e.at)}
                      </span>{" "}
                      <strong>{e.type}</strong>
                      {e.message && ` — ${e.message}`}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        ))}
      </section>

      <section className="mt-4 rounded-2xl bg-white p-4 text-sm shadow-sm ring-1 ring-black/5">
        <h2 className="font-bold">
          Note interne (retours/échanges, CDC 9.7)
        </h2>
        <form action={enregistrerNoteInterne.bind(null, commande.id)}>
          <textarea
            name="noteInterne"
            rows={3}
            defaultValue={commande.noteInterne}
            className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none transition focus:border-vert focus:ring-4 focus:ring-vert/10"
            placeholder="Décisions prises : retour accepté, échange, geste commercial…"
          />
          <button className="mt-2 rounded-full bg-white px-4 py-2 text-sm font-semibold ring-1 ring-black/10 transition hover:bg-gris">
            Enregistrer la note
          </button>
        </form>
      </section>
    </div>
  );
}
