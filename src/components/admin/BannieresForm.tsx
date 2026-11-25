"use client";

import { useState } from "react";
import type { Banniere } from "@/lib/settings";

// Gestion des bannières d'accueil (CDC 7.1) — upload signé Cloudinary,
// titre et lien optionnels. La liste est sérialisée dans le champ caché
// `bannieres` pour le formulaire serveur parent.
export function BannieresForm({ initiales }: { initiales: Banniere[] }) {
  const [bannieres, setBannieres] = useState<Banniere[]>(initiales);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");

  async function envoyer(fichiers: FileList | null) {
    if (!fichiers?.length) return;
    setErreur("");
    setChargement(true);
    try {
      const sig = await fetch("/api/admin/upload-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: "soukeyna/bannieres" }),
      });
      if (!sig.ok) {
        const d = await sig.json().catch(() => ({}));
        throw new Error(d.erreur ?? "Signature impossible");
      }
      const { cloudName, apiKey, timestamp, signature, folder } =
        await sig.json();

      const nouvelles = [...bannieres];
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
          titre: "",
          lien: "",
          ordre: nouvelles.length,
        });
      }
      setBannieres(nouvelles);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur d'envoi");
    } finally {
      setChargement(false);
    }
  }

  function maj(i: number, champ: "titre" | "lien", valeur: string) {
    setBannieres(
      bannieres.map((b, j) => (j === i ? { ...b, [champ]: valeur } : b))
    );
  }

  return (
    <div>
      <input
        type="hidden"
        name="bannieres"
        value={JSON.stringify(bannieres)}
      />
      <div className="space-y-3">
        {bannieres.map((b, i) => (
          <div key={b.publicId ?? i} className="flex items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={b.url}
              alt={b.titre ?? `Bannière ${i + 1}`}
              className="h-16 w-28 shrink-0 rounded-lg border border-black/10 object-cover"
            />
            <div className="grid flex-1 gap-1.5">
              <input
                value={b.titre ?? ""}
                onChange={(e) => maj(i, "titre", e.target.value)}
                placeholder="Titre (optionnel)"
                className="rounded border px-2 py-1 text-xs"
              />
              <input
                value={b.lien ?? ""}
                onChange={(e) => maj(i, "lien", e.target.value)}
                placeholder="Lien au clic — ex. /femmes (optionnel)"
                className="rounded border px-2 py-1 text-xs"
              />
            </div>
            <button
              type="button"
              onClick={() => setBannieres(bannieres.filter((_, j) => j !== i))}
              className="mt-1 h-6 w-6 shrink-0 rounded-full bg-red-50 text-xs font-bold text-red-600 ring-1 ring-red-200"
              aria-label="Retirer la bannière"
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
        disabled={chargement || bannieres.length >= 10}
        onChange={(e) => envoyer(e.target.files)}
        className="mt-3 text-sm"
      />
      {chargement && <p className="text-sm opacity-70">Envoi en cours…</p>}
      {erreur && <p className="text-sm text-red-600">{erreur}</p>}
      {bannieres.length === 0 && (
        <p className="mt-2 text-xs opacity-50">
          Aucune bannière — la bannière promo automatique s&apos;affiche à la
          place.
        </p>
      )}
    </div>
  );
}
