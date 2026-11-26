"use client";

import { useTransition } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
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
  const dernier = quantite <= 1;
  return (
    <div className="flex flex-col items-end gap-1.5" aria-busy={pending}>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <div
          className={`flex items-center rounded-full bg-gris transition-opacity ${
            pending ? "opacity-60" : ""
          }`}
        >
          <button
            type="button"
            aria-label={dernier ? "Retirer l'article" : "Diminuer la quantité"}
            disabled={pending}
            onClick={() =>
              start(() =>
                dernier
                  ? retirerLigne(ligneId)
                  : modifierQuantite(ligneId, quantite - 1)
              )
            }
            className={`flex h-8 w-8 items-center justify-center rounded-full transition disabled:opacity-30 ${
              dernier
                ? "text-red-600 hover:bg-red-50"
                : "hover:bg-vert-clair"
            }`}
          >
            {dernier ? (
              <Trash2 className="size-4" aria-hidden />
            ) : (
              <Minus className="size-4" aria-hidden />
            )}
          </button>
          <span
            className={`w-7 text-center text-sm font-semibold tabular-nums transition-opacity ${
              pending ? "opacity-50" : ""
            }`}
          >
            {quantite}
          </span>
          <button
            type="button"
            aria-label="Augmenter la quantité"
            disabled={pending || quantite >= stockDispo}
            onClick={() => start(() => modifierQuantite(ligneId, quantite + 1))}
            className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-vert-clair disabled:opacity-30"
          >
            <Plus className="size-4" aria-hidden />
          </button>
        </div>
        <button
          type="button"
          aria-label="Retirer l'article"
          disabled={pending}
          onClick={() => start(() => retirerLigne(ligneId))}
          className="flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-full px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-40"
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
