"use client";

import { useState } from "react";
import { Upload, X } from "lucide-react";

export interface ImageProduit {
  publicId: string;
  url: string;
  alt: string;
  ordre: number;
}

export function ImageUpload({
  images,
  onChange,
}: {
  images: ImageProduit[];
  onChange: (images: ImageProduit[]) => void;
}) {
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");

  async function envoyer(fichiers: FileList | null) {
    if (!fichiers?.length) return;
    setErreur("");
    setChargement(true);
    try {
      const sig = await fetch("/api/admin/upload-signature", {
        method: "POST",
      });
      if (!sig.ok) {
        const d = await sig.json().catch(() => ({}));
        throw new Error(d.erreur ?? "Signature impossible");
      }
      const { cloudName, apiKey, timestamp, signature, folder } =
        await sig.json();

      const nouvelles = [...images];
      for (const fichier of Array.from(fichiers)) {
        const fd = new FormData();
        fd.append("file", fichier);
        fd.append("api_key", apiKey);
        fd.append("timestamp", String(timestamp));
        fd.append("signature", signature);
        fd.append("folder", folder);
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          { method: "POST", body: fd }
        );
        if (!res.ok) throw new Error("Échec de l'envoi vers Cloudinary");
        const data = await res.json();
        nouvelles.push({
          publicId: data.public_id,
          url: data.secure_url,
          alt: fichier.name,
          ordre: nouvelles.length,
        });
      }
      onChange(nouvelles);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur d'envoi");
    } finally {
      setChargement(false);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
        {images.map((img, i) => (
          <div
            key={img.publicId}
            className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt={img.alt} className="size-full object-cover" />
            {i === 0 && (
              <span className="absolute bottom-1.5 left-1.5 rounded bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold text-foreground shadow-sm">
                Principale
              </span>
            )}
            <button
              type="button"
              onClick={() => onChange(images.filter((_, j) => j !== i))}
              aria-label="Retirer la photo"
              className="absolute right-1.5 top-1.5 grid size-7 cursor-pointer place-items-center rounded-md bg-white/95 text-foreground shadow-sm transition-colors hover:text-destructive"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
        <label
          className={`flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-input bg-[#fafbf9] p-2 text-center text-xs font-medium text-muted-foreground transition-colors hover:border-vert hover:text-vert ${chargement ? "pointer-events-none opacity-60" : ""}`}
        >
          <Upload className="size-4" />
          {chargement ? "Envoi…" : "Ajouter"}
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={chargement}
            onChange={(e) => envoyer(e.target.files)}
            className="sr-only"
          />
        </label>
      </div>
      {erreur && <p className="mt-2 text-sm text-destructive">{erreur}</p>}
    </div>
  );
}
