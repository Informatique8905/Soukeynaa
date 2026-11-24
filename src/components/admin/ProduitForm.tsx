"use client";

import { useState } from "react";
import { ImageUpload, type ImageProduit } from "./ImageUpload";
import { UNIVERSES, PRODUCT_STATUSES } from "@/lib/constants";

interface Categorie {
  id: number;
  nom: string;
  univers: string;
  parentId: number | null;
}

interface Variante {
  id?: number;
  taille?: string;
  couleur?: string;
  sku?: string;
  stock: number;
  prixReduit?: number | null;
}

export interface ProduitInitial {
  id?: number;
  nom: string;
  description: string;
  prix: number;
  prixReduit?: number | null;
  categorieId: number;
  univers: string;
  images: ImageProduit[];
  aVariantes: boolean;
  variantes: Variante[];
  stock: number;
  poids?: number | null;
  statut: string;
}

const STATUT_LABELS: Record<string, string> = {
  publie: "Publié",
  brouillon: "Brouillon",
  desactive: "Désactivé",
};

export function ProduitForm({
  categories,
  initial,
  action,
}: {
  categories: Categorie[];
  initial?: ProduitInitial;
  action: (formData: FormData) => Promise<void>;
}) {
  const [univers, setUnivers] = useState(initial?.univers ?? "femmes");
  const [aVariantes, setAVariantes] = useState(initial?.aVariantes ?? false);
  const [variantes, setVariantes] = useState<Variante[]>(
    initial?.variantes ?? []
  );
  const [images, setImages] = useState<ImageProduit[]>(initial?.images ?? []);
  const [erreur, setErreur] = useState("");

  const catsUnivers = categories.filter((c) => c.univers === univers);

  function ajouterVariante() {
    setVariantes([...variantes, { taille: "", couleur: "", sku: "", stock: 0 }]);
  }

  async function soumettre(formData: FormData) {
    setErreur("");
    formData.set("images", JSON.stringify(images));
    formData.set("variantes", JSON.stringify(variantes));
    try {
      await action(formData);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur");
    }
  }

  return (
    <form action={soumettre} className="mt-6 max-w-3xl space-y-4 text-sm">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1">
          Nom du produit *
          <input
            name="nom"
            required
            defaultValue={initial?.nom}
            className="rounded border px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1">
          Statut
          <select
            name="statut"
            defaultValue={initial?.statut ?? "brouillon"}
            className="rounded border px-2 py-1.5"
          >
            {PRODUCT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUT_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Univers *
          <select
            name="univers"
            value={univers}
            onChange={(e) => setUnivers(e.target.value)}
            className="rounded border px-2 py-1.5"
          >
            {UNIVERSES.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Catégorie *
          <select
            name="categorie"
            required
            defaultValue={initial?.categorieId}
            className="rounded border px-2 py-1.5"
          >
            <option value="">— choisir —</option>
            {catsUnivers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.parentId ? "↳ " : ""}
                {c.nom}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Prix (FCFA) *
          <input
            name="prix"
            type="number"
            min={0}
            required
            defaultValue={initial?.prix}
            className="rounded border px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1">
          Prix réduit (FCFA, optionnel)
          <input
            name="prixReduit"
            type="number"
            min={0}
            defaultValue={initial?.prixReduit ?? ""}
            className="rounded border px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1">
          Poids (g, optionnel)
          <input
            name="poids"
            type="number"
            min={0}
            defaultValue={initial?.poids ?? ""}
            className="rounded border px-2 py-1.5"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        Description
        <textarea
          name="description"
          rows={4}
          defaultValue={initial?.description}
          className="rounded border px-2 py-1.5"
        />
      </label>

      <div>
        <p className="mb-2 font-medium">Photos</p>
        <ImageUpload images={images} onChange={setImages} />
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="aVariantes"
          checked={aVariantes}
          onChange={(e) => setAVariantes(e.target.checked)}
        />
        Ce produit a des variantes (taille / couleur)
      </label>

      {!aVariantes ? (
        <label className="flex flex-col gap-1">
          Stock
          <input
            name="stock"
            type="number"
            min={0}
            defaultValue={initial?.stock ?? 0}
            className="w-32 rounded border px-2 py-1.5"
          />
        </label>
      ) : (
        <div className="rounded border bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="font-medium">Variantes</p>
            <button
              type="button"
              onClick={ajouterVariante}
              className="rounded bg-noir px-3 py-1 text-sm font-semibold"
            >
              + Variante
            </button>
          </div>
          {variantes.map((v, i) => (
            <div key={i} className="mt-3 flex flex-wrap items-end gap-2">
              <input
                placeholder="Taille"
                value={v.taille ?? ""}
                onChange={(e) =>
                  setVariantes(
                    variantes.map((x, j) =>
                      j === i ? { ...x, taille: e.target.value } : x
                    )
                  )
                }
                className="w-24 rounded border px-2 py-1"
              />
              <input
                placeholder="Couleur"
                value={v.couleur ?? ""}
                onChange={(e) =>
                  setVariantes(
                    variantes.map((x, j) =>
                      j === i ? { ...x, couleur: e.target.value } : x
                    )
                  )
                }
                className="w-28 rounded border px-2 py-1"
              />
              <input
                placeholder="SKU"
                value={v.sku ?? ""}
                onChange={(e) =>
                  setVariantes(
                    variantes.map((x, j) =>
                      j === i ? { ...x, sku: e.target.value } : x
                    )
                  )
                }
                className="w-28 rounded border px-2 py-1"
              />
              <label className="flex items-center gap-1">
                Stock
                <input
                  type="number"
                  min={0}
                  value={v.stock}
                  onChange={(e) =>
                    setVariantes(
                      variantes.map((x, j) =>
                        j === i
                          ? { ...x, stock: Number(e.target.value) }
                          : x
                      )
                    )
                  }
                  className="w-20 rounded border px-2 py-1"
                />
              </label>
              <button
                type="button"
                onClick={() => setVariantes(variantes.filter((_, j) => j !== i))}
                className="text-vert underline"
              >
                Retirer
              </button>
            </div>
          ))}
          {variantes.length === 0 && (
            <p className="mt-3 text-xs opacity-60">
              Ajoutez au moins une variante.
            </p>
          )}
        </div>
      )}

      {erreur && <p className="text-red-600">{erreur}</p>}

      <button className="rounded bg-vert px-6 py-2 font-semibold text-white">
        {initial?.id ? "Enregistrer" : "Créer le produit"}
      </button>
    </form>
  );
}
