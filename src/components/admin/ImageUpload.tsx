"use client";

import { useState } from "react";

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
      <div className="flex flex-wrap gap-3">
        {images.map((img, i) => (
          <div key={img.publicId} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.alt}
              className="h-24 w-24 rounded border object-cover"
            />
            <button
              type="button"
              onClick={() => onChange(images.filter((_, j) => j !== i))}
              className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-vert text-xs text-white"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <input
        type="file"
        accept="image/*"
        multiple
        disabled={chargement}
        onChange={(e) => envoyer(e.target.files)}
        className="mt-3 text-sm"
      />
      {chargement && <p className="text-sm opacity-70">Envoi en cours…</p>}
      {erreur && <p className="text-sm text-red-600">{erreur}</p>}
    </div>
  );
}
