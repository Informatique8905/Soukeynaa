import { fcfa, dateHeureFr } from "@/lib/format";
import { BoutonImprimerBon } from "./BoutonImprimerBon";

export interface BonCommandeData {
  reference: string;
  createdAt: Date;
  clientNom: string;
  clientTelephone: string;
  communeNom: string;
  fraisLivraison: number;
  adresseLivraison: string;
  delaiLivraison: string | null;
  modePaiement: string;
  statutPaiement: string;
  sousTotal: number;
  total: number;
  lignes: {
    nom: string;
    varianteLabel: string | null;
    quantite: number;
    prixUnitaire: number;
    total: number;
  }[];
}

// Document « Bon de commande » affiché au client une fois sa commande
// validée — reprend la référence exacte, les articles et la livraison.
export function BonCommande({ c }: { c: BonCommandeData }) {
  const aLaLivraison = c.modePaiement === "livraison";
  const aRegler = aLaLivraison && c.statutPaiement !== "confirme";

  return (
    <section
      aria-label="Bon de commande"
      className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5 print:rounded-none print:shadow-none print:ring-0"
    >
      {/* En-tête du document */}
      <div className="bg-[#3f0d1e] px-5 py-5 text-white sm:px-7">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid shrink-0 place-items-center rounded-xl bg-white px-2 py-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-soukeyna.png" alt="SOUKEYNA" className="h-8 w-auto" />
            </span>
            <div>
              <p className="text-sm font-extrabold tracking-wide">SOUKEYNA</p>
              <p className="text-[11px] text-white/70">
                Abidjan · Côte d&apos;Ivoire
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/60">
              Bon de commande
            </p>
            <p className="mt-0.5 text-sm font-extrabold tabular-nums">
              {c.reference}
            </p>
            <p className="text-[11px] text-white/70">
              {dateHeureFr(c.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Client & livraison */}
      <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-7">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gris-fonce">
            Client
          </p>
          <p className="mt-1.5 text-sm font-bold text-noir">{c.clientNom}</p>
          <p className="text-sm text-gris-fonce tabular-nums">
            {c.clientTelephone}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gris-fonce">
            Livraison
          </p>
          <p className="mt-1.5 text-sm font-bold text-noir">{c.communeNom}</p>
          <p className="text-sm text-gris-fonce">{c.adresseLivraison}</p>
        </div>
      </div>

      {c.delaiLivraison && (
        <div className="mx-5 mb-5 flex items-center gap-2.5 rounded-2xl bg-vert-clair px-4 py-3 sm:mx-7">
          <span
            aria-hidden
            className="grid size-8 shrink-0 place-items-center rounded-full bg-vert text-sm text-white"
          >
            ✓
          </span>
          <p className="text-sm font-bold text-vert-fonce">
            {c.delaiLivraison}
          </p>
        </div>
      )}

      {/* Articles */}
      <div className="border-t border-black/5 px-5 sm:px-7">
        <ul className="divide-y divide-black/5">
          {c.lignes.map((l, i) => (
            <li key={i} className="flex items-baseline justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-noir">{l.nom}</p>
                <p className="text-xs text-gris-fonce">
                  {l.varianteLabel ? `${l.varianteLabel} · ` : ""}
                  {l.quantite} × {fcfa(l.prixUnitaire)}
                </p>
              </div>
              <p className="shrink-0 text-sm font-bold tabular-nums text-noir">
                {fcfa(l.total)}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {/* Totaux */}
      <div className="space-y-1.5 border-t border-black/5 px-5 py-4 text-sm sm:px-7">
        <div className="flex justify-between text-gris-fonce">
          <span>Sous-total</span>
          <span className="tabular-nums">{fcfa(c.sousTotal)}</span>
        </div>
        <div className="flex justify-between text-gris-fonce">
          <span>Livraison — {c.communeNom}</span>
          <span className="tabular-nums">{fcfa(c.fraisLivraison)}</span>
        </div>
        <div className="flex justify-between pt-1.5 text-base font-extrabold text-noir">
          <span>{aRegler ? "À payer au livreur" : "Total"}</span>
          <span className="tabular-nums text-vert">{fcfa(c.total)}</span>
        </div>
      </div>

      {/* Pied du document */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/5 bg-blanc-casse px-5 py-4 sm:px-7">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-bold ${
              aLaLivraison
                ? "bg-amber-100 text-amber-800"
                : "bg-vert-clair text-vert-fonce"
            }`}
          >
            {aLaLivraison ? "Paiement à la livraison" : "Paiement en ligne"}
          </span>
          {aRegler && (
            <span className="text-[11px] font-medium text-gris-fonce">
              Préparez le montant exact
            </span>
          )}
        </div>
        <BoutonImprimerBon />
      </div>

      <p className="px-5 pb-4 pt-3 text-center text-[11px] text-gris-fonce sm:px-7">
        Merci de votre confiance — SOUKEYNA, Abidjan. Pour tout retour ou
        échange, contactez-nous par téléphone ou WhatsApp.
      </p>
    </section>
  );
}
