"use client";

import { useTransition } from "react";
import {
  modifierQuantite,
  retirerLigne,
} from "@/app/(boutique)/panier/actions";

export function LignePanierControles({
  ligneId,
  quantite,
  stockDispo,
}: {
  ligneId: number;
  quantite: number;
  stockDispo: number;
}) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-full bg-gris">
          <button
            type="button"
            aria-label="Diminuer la quantité"
            disabled={pending || quantite <= 1}
            onClick={() => start(() => modifierQuantite(ligneId, quantite - 1))}
            className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-vert-clair disabled:opacity-30"
          >
            −
          </button>
          <span className="w-7 text-center text-sm font-semibold tabular-nums">
            {quantite}
          </span>
          <button
            type="button"
            aria-label="Augmenter la quantité"
            disabled={pending || quantite >= stockDispo}
            onClick={() => start(() => modifierQuantite(ligneId, quantite + 1))}
            className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-vert-clair disabled:opacity-30"
          >
            +
          </button>
        </div>
        <button
          type="button"
          aria-label="Retirer l'article"
          disabled={pending}
          onClick={() => start(() => retirerLigne(ligneId))}
          className="flex h-8 w-8 items-center justify-center rounded-full text-red-600 transition hover:bg-red-50 disabled:opacity-40"
        >
          Retirer
        </button>
      </div>
      {quantite > stockDispo && (
        <p className="text-xs text-red-600">Stock insuffisant</p>
      )}
    </div>
  );
}
