"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fcfa } from "@/lib/format";

// Moyens activés sur le compte Jèko — l'API exige l'opérateur à l'initiation
const MOYENS = [
  { v: "wave", label: "Wave" },
  { v: "orange", label: "Orange Money" },
  { v: "mtn", label: "MTN MoMo" },
  { v: "moov", label: "Moov Money" },
  { v: "djamo", label: "Djamo" },
];

export function BoutonPayer({
  commandeId,
  montant,
}: {
  commandeId: number;
  montant?: number;
}) {
  const [erreur, setErreur] = useState("");
  const [moyen, setMoyen] = useState("wave");
  const [pending, start] = useTransition();

  function payer() {
    setErreur("");
    start(async () => {
      try {
        const res = await fetch("/api/paiement/initier", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ commandeId, moyen }),
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          setErreur(data.erreur || "Paiement indisponible pour le moment");
        }
      } catch {
        setErreur("Erreur réseau — réessayez");
      }
    });
  }

  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Moyen de paiement"
        className="mb-3 grid grid-cols-3 gap-1.5"
      >
        {MOYENS.map((m) => (
          <button
            key={m.v}
            type="button"
            role="radio"
            aria-checked={moyen === m.v}
            onClick={() => setMoyen(m.v)}
            className={`press rounded-xl border px-2 py-2 text-[11px] font-bold transition ${
              moyen === m.v
                ? "border-vert bg-vert text-white shadow-md shadow-vert/25"
                : "border-black/10 bg-blanc-casse text-noir hover:border-vert/50"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={payer}
        disabled={pending}
        className="press shine flex w-full items-center justify-center gap-2 rounded-full bg-vert py-4 text-sm font-bold text-white shadow-lg shadow-vert/25 hover:bg-vert-fonce disabled:opacity-60"
      >
        {pending ? (
          <>
            <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Redirection sécurisée…
          </>
        ) : (
          <>
            Payer {montant ? fcfa(montant) : "en ligne"}
          </>
        )}
      </button>
      {erreur && (
        <p role="alert" className="page-in mt-2 rounded-xl bg-red-50 p-2.5 text-center text-sm text-red-700">
          {erreur}
        </p>
      )}
    </div>
  );
}

/** Recharge les données serveur à intervalle tant que `actif` (attente webhook). */
export function RafraichirAuto({ actif, ms = 5000 }: { actif: boolean; ms?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!actif) return;
    const t = window.setInterval(() => router.refresh(), ms);
    return () => clearInterval(t);
  }, [actif, ms, router]);
  return null;
}
