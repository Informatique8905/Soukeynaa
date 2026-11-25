"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, X } from "lucide-react";
import type { Banniere } from "@/lib/settings";
import { bouton, champ } from "./ui";

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

  function deplacer(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= bannieres.length) return;
    const copie = [...bannieres];
    [copie[i], copie[j]] = [copie[j], copie[i]];
    setBannieres(copie.map((b, k) => ({ ...b, ordre: k })));
  }

  const plein = bannieres.length >= 10;

  return (
    <div>
      <input type="hidden" name="bannieres" value={JSON.stringify(bannieres)} />
      <ul className="space-y-3">
        {bannieres.map((b, i) => (
          <li
            key={b.publicId ?? i}
            className="flex items-start gap-3 rounded-lg border border-border p-3"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={b.url}
              alt={b.titre ?? `Bannière ${i + 1}`}
              className="h-14 w-24 shrink-0 rounded-md border border-border object-cover"
            />
            <div className="grid min-w-0 flex-1 gap-2">
              <input
                value={b.titre ?? ""}
                onChange={(e) => maj(i, "titre", e.target.value)}
                placeholder="Titre (optionnel)"
                className={`${champ} h-8 text-xs`}
              />
              <input
                value={b.lien ?? ""}
                onChange={(e) => maj(i, "lien", e.target.value)}
                placeholder="Lien au clic (optionnel)"
                className={`${champ} h-8 text-xs`}
              />
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              <button
                type="button"
                onClick={() => deplacer(i, -1)}
                disabled={i === 0}
                aria-label="Monter"
                className={bouton("fantome", "sm", "size-8 px-0")}
              >
                <ArrowUp />
              </button>
              <button
                type="button"
                onClick={() => deplacer(i, 1)}
                disabled={i === bannieres.length - 1}
                aria-label="Descendre"
                className={bouton("fantome", "sm", "size-8 px-0")}
              >
                <ArrowDown />
              </button>
              <button
                type="button"
                onClick={() => setBannieres(bannieres.filter((_, j) => j !== i))}
                aria-label="Retirer la bannière"
                className={bouton("danger", "sm", "size-8 px-0")}
              >
                <X />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <label
        className={`mt-3 inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-input px-4 text-sm font-medium text-muted-foreground transition-colors hover:border-vert hover:text-vert ${chargement || plein ? "pointer-events-none opacity-50" : ""}`}
      >
        <ImagePlus className="size-4" />
        {chargement
          ? "Envoi en cours…"
          : plein
            ? "Maximum atteint (10)"
            : "Ajouter des images"}
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={chargement || plein}
          onChange={(e) => envoyer(e.target.files)}
          className="sr-only"
        />
      </label>
      {erreur && <p className="mt-2 text-sm text-destructive">{erreur}</p>}
      {bannieres.length === 0 && !erreur && (
        <p className="mt-2 text-xs text-muted-foreground">
          Aucune bannière. La bannière promo automatique s&apos;affiche à la
          place.
        </p>
      )}
    </div>
  );
}
