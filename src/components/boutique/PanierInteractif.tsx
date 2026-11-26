"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { modifierQuantite, retirerLigne } from "@/app/(boutique)/panier/actions";
import { fcfa } from "@/lib/format";
import { cloud } from "@/lib/image";
import { EtatVide } from "@/components/motion/EtatVide";
import type { LignePanier } from "@/lib/cart";

type Action =
  | { type: "quantite"; ligneId: number; quantite: number }
  | { type: "retirer"; ligneId: number };

// Panier optimiste : quantités, suppression, totaux et barre mobile bougent
// immédiatement ; le serveur rattrape en arrière-plan (revalidatePath).
// En cas d'erreur, l'état optimiste revient automatiquement aux données
// serveur à la fin de la transition.
export function PanierInteractif({ lignes }: { lignes: LignePanier[] }) {
  const [optimistes, majOptimiste] = useOptimistic(
    lignes,
    (etat: LignePanier[], a: Action) => {
      if (a.type === "retirer") return etat.filter((l) => l.id !== a.ligneId);
      return etat.map((l) =>
        l.id === a.ligneId
          ? {
              ...l,
              quantite: a.quantite,
              total: l.prixUnitaire * a.quantite,
            }
          : l,
      );
    },
  );
  const [pending, start] = useTransition();

  const changer = (ligneId: number, quantite: number) =>
    start(async () => {
      majOptimiste({ type: "quantite", ligneId, quantite });
      await modifierQuantite(ligneId, quantite);
    });
  const retirer = (ligneId: number) =>
    start(async () => {
      majOptimiste({ type: "retirer", ligneId });
      await retirerLigne(ligneId);
    });

  if (optimistes.length === 0) {
    return (
      <EtatVide
        dessin="sac"
        titre="Votre panier est encore vide"
        texte="Nos pépites vous attendent. Commencez par le catalogue."
        action={{ href: "/", label: "Découvrir la boutique" }}
      />
    );
  }

  const sousTotal = optimistes.reduce((s, l) => s + l.total, 0);
  const economie = optimistes.reduce(
    (s, l) => s + Math.max(0, l.prixNormal - l.prixUnitaire) * l.quantite,
    0,
  );

  return (
    <div className="mt-5 md:grid md:grid-cols-5 md:gap-6">
      <div className="space-y-3 md:col-span-3" aria-busy={pending}>
        {optimistes.map((l) => (
          <div
            key={l.id}
            data-reveal
            className="group flex items-center gap-3.5 rounded-3xl bg-white p-3 shadow-sm ring-1 ring-black/5 transition-shadow hover:shadow-md"
          >
            <Link
              href={`/produit/${l.slug}`}
              className="size-24 shrink-0 overflow-hidden rounded-2xl bg-gris"
            >
              {l.image && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={cloud(l.image, 200) ?? l.image}
                  alt={l.nom}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href={`/produit/${l.slug}`}
                className="line-clamp-2 text-sm font-bold leading-snug text-noir hover:text-vert"
              >
                {l.nom}
              </Link>
              {l.varianteLabel && (
                <p className="mt-0.5 inline-block rounded-full bg-blanc-casse px-2 py-0.5 text-[11px] font-medium text-gris-fonce">
                  {l.varianteLabel}
                </p>
              )}
              <p className="mt-1 text-sm">
                <span className="font-extrabold text-vert">
                  {fcfa(l.prixUnitaire)}
                </span>
                {l.prixUnitaire < l.prixNormal && (
                  <span className="ml-2 text-xs text-gris-fonce line-through">
                    {fcfa(l.prixNormal)}
                  </span>
                )}
              </p>
              <div className="mt-2 sm:hidden">
                <Stepper l={l} changer={changer} retirer={retirer} />
              </div>
            </div>
            <div className="hidden sm:block">
              <Stepper l={l} changer={changer} retirer={retirer} />
            </div>
            <p className="hidden w-24 text-right text-sm font-extrabold tabular-nums sm:block">
              {fcfa(l.total)}
            </p>
          </div>
        ))}
      </div>

      {/* Récapitulatif — sticky sur tablette/desktop */}
      <div data-reveal="scale" className="mt-5 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 md:sticky md:top-24 md:col-span-2 md:mt-0 md:self-start">
        <h2 className="font-extrabold text-noir">Récapitulatif</h2>
        <div className="mt-3 space-y-1.5 text-sm text-gris-fonce">
          <div className="flex justify-between">
            <span>Sous-total</span>
            <span className="tabular-nums">{fcfa(sousTotal)}</span>
          </div>
          {economie > 0 && (
            <div className="flex justify-between font-semibold text-vert">
              <span>Vous économisez</span>
              <span className="tabular-nums">-{fcfa(economie)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Livraison</span>
            <span>Selon votre commune</span>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-3">
          <span className="font-semibold">Total estimé</span>
          <span className="text-2xl font-extrabold tabular-nums text-vert">
            {fcfa(sousTotal)}
          </span>
        </div>
        <Link
          href="/commander"
          className="press shine mt-4 hidden w-full items-center justify-center gap-2 rounded-full bg-vert px-6 py-4 font-bold text-white shadow-lg shadow-vert/25 hover:bg-vert-fonce md:flex"
        >
          Passer commande
        </Link>
        <ul className="mt-4 space-y-2 text-xs text-gris-fonce">
          <li className="flex items-center gap-2">
            Paiement à la livraison possible
          </li>
          <li className="flex items-center gap-2">
            Ou en ligne : Wave, Orange Money, MTN, Moov, carte
          </li>
          <li className="flex items-center gap-2">
            Livraison dans toutes les communes d&apos;Abidjan
          </li>
        </ul>
      </div>

      {/* Barre d'action mobile, posée au-dessus de la tab bar */}
      <div className="fixed inset-x-3 bottom-[118px] z-30 md:hidden">
        <Link
          href="/commander"
          className="press shine flex items-center justify-between gap-3 rounded-full bg-noir py-2 pl-5 pr-2 text-white shadow-2xl shadow-noir/30"
        >
          <span className="text-sm">
            <span className="block text-[10px] text-white/60">Total estimé</span>
            <span className="font-extrabold tabular-nums">
              {fcfa(sousTotal)}
            </span>
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-vert px-5 py-3 text-sm font-bold">
            Commander
          </span>
        </Link>
      </div>
      <div aria-hidden className="h-20 md:hidden" />
    </div>
  );
}

// Pas de disabled pendant la transition : les taps rapides se composent —
// chaque clic envoie la quantité absolue calculée depuis l'état optimiste.
function Stepper({
  l,
  changer,
  retirer,
}: {
  l: LignePanier;
  changer: (ligneId: number, quantite: number) => void;
  retirer: (ligneId: number) => void;
}) {
  const dernier = l.quantite <= 1;
  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="flex items-center rounded-full bg-gris">
          <button
            type="button"
            aria-label={dernier ? "Retirer l'article" : "Diminuer la quantité"}
            onClick={() =>
              dernier ? retirer(l.id) : changer(l.id, l.quantite - 1)
            }
            className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
              dernier ? "text-red-600 hover:bg-red-50" : "hover:bg-vert-clair"
            }`}
          >
            {dernier ? (
              <Trash2 className="size-4" aria-hidden />
            ) : (
              <Minus className="size-4" aria-hidden />
            )}
          </button>
          <span className="w-7 text-center text-sm font-semibold tabular-nums">
            {l.quantite}
          </span>
          <button
            type="button"
            aria-label="Augmenter la quantité"
            disabled={l.quantite >= l.stockDispo}
            onClick={() => changer(l.id, l.quantite + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-vert-clair disabled:opacity-30"
          >
            <Plus className="size-4" aria-hidden />
          </button>
        </div>
        <button
          type="button"
          aria-label="Retirer l'article"
          onClick={() => retirer(l.id)}
          className="press rounded-full p-2 text-gris-fonce transition hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>
      {l.stockDispo <= 5 && (
        <p className="text-[11px] font-medium text-orange-600">
          Plus que {l.stockDispo} en stock
        </p>
      )}
    </div>
  );
}
