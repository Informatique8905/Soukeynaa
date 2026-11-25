"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { ImageUpload, type ImageProduit } from "./ImageUpload";
import { PRODUCT_STATUSES } from "@/lib/constants";
import {
  Alerte,
  CaseLibellee,
  Champ,
  Panneau,
  bouton,
  champ,
  lien,
  zoneTexte,
} from "./ui";

interface Categorie {
  id: number;
  nom: string;
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
  const [aVariantes, setAVariantes] = useState(initial?.aVariantes ?? false);
  const [variantes, setVariantes] = useState<Variante[]>(
    initial?.variantes ?? []
  );
  const [images, setImages] = useState<ImageProduit[]>(initial?.images ?? []);
  const [erreur, setErreur] = useState("");

  function ajouterVariante() {
    setVariantes([...variantes, { taille: "", couleur: "", sku: "", stock: 0 }]);
  }

  function majVariante(i: number, patch: Partial<Variante>) {
    setVariantes(variantes.map((x, j) => (j === i ? { ...x, ...patch } : x)));
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
    <form action={soumettre} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
        <Panneau titre="Informations" description="Nom et description visibles en boutique">
          <div className="grid gap-4">
            <Champ label="Nom du produit *">
              <input name="nom" required defaultValue={initial?.nom} className={champ} />
            </Champ>
            <Champ label="Description">
              <textarea
                name="description"
                rows={5}
                defaultValue={initial?.description}
                className={zoneTexte}
              />
            </Champ>
          </div>
        </Panneau>

        <Panneau titre="Photos" description="La première photo sert de visuel principal">
          <ImageUpload images={images} onChange={setImages} />
        </Panneau>

        <Panneau
          titre="Stock et variantes"
          description="Gérez un stock unique ou un stock par taille / couleur"
        >
          <CaseLibellee
            name="aVariantes"
            checked={aVariantes}
            onChange={(e) => setAVariantes(e.target.checked)}
          >
            Ce produit a des variantes (taille / couleur)
          </CaseLibellee>

          {!aVariantes ? (
            <Champ label="Quantité en stock" className="mt-4 max-w-40">
              <input
                name="stock"
                type="number"
                min={0}
                defaultValue={initial?.stock ?? 0}
                className={champ}
              />
            </Champ>
          ) : (
            <div className="mt-4">
              {variantes.length > 0 && (
                <div className="overflow-hidden rounded-lg border border-border">
                  <div className="hidden grid-cols-[1fr_1fr_1fr_6rem_2.5rem] gap-2 border-b border-border bg-[#fafbf9] px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:grid">
                    <span>Taille</span>
                    <span>Couleur</span>
                    <span>SKU</span>
                    <span>Stock</span>
                    <span />
                  </div>
                  <ul className="divide-y divide-border">
                    {variantes.map((v, i) => (
                      <li
                        key={i}
                        className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-[1fr_1fr_1fr_6rem_2.5rem] sm:items-center"
                      >
                        <input
                          aria-label="Taille"
                          placeholder="Taille"
                          value={v.taille ?? ""}
                          onChange={(e) => majVariante(i, { taille: e.target.value })}
                          className={champ}
                        />
                        <input
                          aria-label="Couleur"
                          placeholder="Couleur"
                          value={v.couleur ?? ""}
                          onChange={(e) => majVariante(i, { couleur: e.target.value })}
                          className={champ}
                        />
                        <input
                          aria-label="SKU"
                          placeholder="SKU"
                          value={v.sku ?? ""}
                          onChange={(e) => majVariante(i, { sku: e.target.value })}
                          className={champ}
                        />
                        <input
                          aria-label="Stock"
                          type="number"
                          min={0}
                          value={v.stock}
                          onChange={(e) => majVariante(i, { stock: Number(e.target.value) })}
                          className={champ}
                        />
                        <button
                          type="button"
                          onClick={() => setVariantes(variantes.filter((_, j) => j !== i))}
                          className={bouton("fantome", "md", "col-span-2 px-0 hover:text-destructive sm:col-span-1")}
                          aria-label="Retirer la variante"
                          title="Retirer la variante"
                        >
                          <Trash2 />
                          <span className="sm:sr-only">Retirer</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {variantes.length === 0 && (
                <p className="rounded-lg border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">
                  Ajoutez au moins une variante.
                </p>
              )}
              <button
                type="button"
                onClick={ajouterVariante}
                className={bouton("secondaire", "sm", "mt-3")}
              >
                <Plus />
                Ajouter une variante
              </button>
            </div>
          )}
        </Panneau>
      </div>

      <div className="flex min-w-0 flex-col gap-6">
        <Panneau titre="Publication">
          <Champ label="Statut">
            <select
              name="statut"
              defaultValue={initial?.statut ?? "brouillon"}
              className={champ}
            >
              {PRODUCT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUT_LABELS[s]}
                </option>
              ))}
            </select>
          </Champ>
        </Panneau>

        <Panneau titre="Organisation">
          <div className="grid gap-4">
            <Champ label="Catégorie *">
              <select
                name="categorie"
                required
                defaultValue={initial?.categorieId}
                disabled={categories.length === 0}
                className={champ}
              >
                <option value="">Choisir une catégorie</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parentId ? "\u00a0\u00a0\u00a0\u00a0" : ""}
                    {c.nom}
                  </option>
                ))}
              </select>
            </Champ>
            {categories.length === 0 && (
              <Alerte ton="alerte" titre="Aucune catégorie active">
                <Link href="/admin/categories" className={lien}>
                  Créez une catégorie
                </Link>{" "}
                puis revenez créer le produit.
              </Alerte>
            )}
          </div>
        </Panneau>

        <Panneau titre="Prix et expédition">
          <div className="grid gap-4">
            <Champ label="Prix (FCFA) *">
              <input name="prix" type="number" min={0} required defaultValue={initial?.prix} className={champ} />
            </Champ>
            <Champ label="Prix réduit (FCFA)" aide="Optionnel — affiché barré à côté du prix">
              <input name="prixReduit" type="number" min={0} defaultValue={initial?.prixReduit ?? ""} className={champ} />
            </Champ>
            <Champ label="Poids (g)" aide="Optionnel">
              <input name="poids" type="number" min={0} defaultValue={initial?.poids ?? ""} className={champ} />
            </Champ>
          </div>
        </Panneau>

        {erreur && <Alerte ton="danger">{erreur}</Alerte>}

        <div className="sticky bottom-4 z-10 flex gap-2 lg:static">
          <button
            className={bouton("primaire", "md", "flex-1 shadow-md lg:shadow-sm")}
            disabled={categories.length === 0}
          >
            {initial?.id ? "Enregistrer les modifications" : "Créer le produit"}
          </button>
        </div>
      </div>
    </form>
  );
}
