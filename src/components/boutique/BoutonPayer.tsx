"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fcfa } from "@/lib/format";

export function BoutonPayer({
  commandeId,
  montant,
}: {
  commandeId: number;
  montant?: number;
}) {
  const [erreur, setErreur] = useState("");
  const [pending, start] = useTransition();

  function payer() {
    setErreur("");
    start(async () => {
      try {
        const res = await fetch("/api/paiement/initier", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ commandeId }),
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
      <div className="mt-2.5 flex flex-wrap justify-center gap-1.5 text-[10px] font-semibold text-gris-fonce">
        {["Wave", "Orange Money", "MTN", "Moov", "Carte"].map((m) => (
          <span key={m} className="rounded-full bg-blanc-casse px-2 py-0.5 ring-1 ring-black/5">
            {m}
          </span>
        ))}
      </div>
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
