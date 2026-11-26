"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ajouterAuPanier } from "@/app/(boutique)/panier/actions";
import { deltaPanier } from "@/components/boutique/BadgePanier";
import { fcfa } from "@/lib/format";

interface Variante {
  id: number;
  taille: string | null;
  couleur: string | null;
  stock: number;
  prixReduit: number | null;
}

export function AjoutPanier({
  produitId,
  aVariantes,
  stockProduit,
  variantes,
}: {
  produitId: number;
  aVariantes: boolean;
  stockProduit: number;
  variantes: Variante[];
}) {
  const [varianteId, setVarianteId] = useState<number | null>(null);
  const [quantite, setQuantite] = useState(1);
  const [erreur, setErreur] = useState("");
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();

  const stock = aVariantes
    ? (variantes.find((v) => v.id === varianteId)?.stock ?? null)
    : stockProduit;

  function ajouter() {
    setErreur("");
    setOk(false);
    if (aVariantes && !varianteId) {
      setErreur("Choisissez une taille/couleur");
      return;
    }
    start(async () => {
      try {
        deltaPanier(quantite);
        const res = await ajouterAuPanier(produitId, varianteId, quantite);
        if (res?.erreur) {
          deltaPanier(-quantite);
          setErreur(res.erreur);
        } else setOk(true);
      } catch {
        deltaPanier(-quantite);
        setErreur("Erreur");
      }
    });
  }

  if (stock === 0) {
    return (
      <p className="rounded bg-gris p-3 text-sm font-medium text-vert">
        Rupture de stock. Contactez-nous sur WhatsApp pour la disponibilité.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {aVariantes && (
        <div>
          <p className="mb-1 text-sm font-medium">Taille / couleur</p>
          <div className="flex flex-wrap gap-2">
            {variantes.map((v) => (
              <button
                key={v.id}
                type="button"
                disabled={v.stock === 0}
                onClick={() => setVarianteId(v.id)}
                className={`rounded border px-3 py-1.5 text-sm ${
                  varianteId === v.id
                    ? "border-vert bg-vert text-white"
                    : v.stock === 0
                      ? "cursor-not-allowed opacity-30 line-through"
                      : "hover:border-noir"
                }`}
              >
                {[v.taille, v.couleur].filter(Boolean).join(" / ") || "Standard"}
                {v.stock > 0 && v.stock <= 3 && (
                  <span className="ml-1 text-xs">({v.stock})</span>
                )}
              </button>
            ))}
          </div>
          {varianteId && stock !== null && stock <= 5 && (
            <p className="mt-1 text-xs text-vert">
              Plus que {stock} en stock
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Quantité</label>
        <input
          type="number"
          min={1}
          max={stock ?? 1}
          value={quantite}
          onChange={(e) => setQuantite(Math.max(1, Number(e.target.value)))}
          className="w-20 rounded border px-2 py-1.5 text-sm"
        />
      </div>

      {erreur && <p className="text-sm text-red-600">{erreur}</p>}
      {ok && (
        <p className="text-sm font-medium text-green-700">
          Ajouté au panier.{" "}
          <Link href="/panier" className="underline">
            Voir le panier
          </Link>
        </p>
      )}

      <button
        type="button"
        onClick={ajouter}
        disabled={pending || (aVariantes && !varianteId)}
        className="w-full rounded bg-vert py-3 font-semibold text-white transition hover:bg-vert-fonce disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Ajout…" : "Ajouter au panier"}
      </button>
    </div>
  );
}

export function PrixAffichage({ prix, prixAffiche }: { prix: number; prixAffiche: number }) {
  return (
    <p className="text-2xl font-bold text-vert">
      {fcfa(prixAffiche)}
      {prixAffiche < prix && (
        <span className="ml-3 text-base font-normal line-through opacity-50">
          {fcfa(prix)}
        </span>
      )}
    </p>
  );
}
