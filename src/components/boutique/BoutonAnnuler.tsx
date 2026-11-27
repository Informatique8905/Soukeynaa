"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// Annulation par le client (CDC 10.5 « annule ») :
// - cible "tentative" : abandonne le paiement en cours pour choisir un
//   autre moyen — la commande reste payable.
// - cible "commande" : annule toute la commande impayée (stock restitué).
// Confirmation en deux temps : un clic unique ne doit jamais annuler une
// commande par accident.
export function BoutonAnnuler({
  commandeId,
  cible,
}: {
  commandeId: number;
  cible: "tentative" | "commande";
}) {
  const [confirmer, setConfirmer] = useState(false);
  const [erreur, setErreur] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  const libelle =
    cible === "tentative"
      ? "Annuler ce paiement et choisir un autre moyen"
      : "Annuler ma commande";

  function annuler() {
    setErreur("");
    start(async () => {
      try {
        const res = await fetch("/api/commande/annuler", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ commandeId, cible }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setConfirmer(false);
          router.refresh();
          return;
        }
        setErreur(data.erreur || "Annulation impossible pour le moment");
        // 409/410 : état réel côté serveur (payée, déjà annulée…) —
        // on recharge pour afficher le suivi à jour.
        if (res.status === 409 || res.status === 410) router.refresh();
      } catch {
        setErreur("Erreur réseau, réessayez");
      }
    });
  }

  if (confirmer) {
    return (
      <div className="page-in rounded-2xl bg-red-50 p-3 text-center">
        <p className="text-sm font-semibold text-red-700">
          {cible === "tentative"
            ? "Abandonner ce paiement ? Vous pourrez en choisir un autre."
            : "Annuler définitivement cette commande ?"}
        </p>
        <div className="mt-2.5 flex justify-center gap-2">
          <button
            type="button"
            onClick={annuler}
            disabled={pending}
            className="press rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {pending ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="size-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Annulation…
              </span>
            ) : (
              "Oui, annuler"
            )}
          </button>
          <button
            type="button"
            onClick={() => setConfirmer(false)}
            disabled={pending}
            className="press rounded-full bg-white px-4 py-2 text-xs font-bold text-noir ring-1 ring-black/10 hover:bg-blanc-casse"
          >
            Non, garder
          </button>
        </div>
        {erreur && (
          <p role="alert" className="mt-2 text-xs font-medium text-red-700">
            {erreur}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setErreur("");
          setConfirmer(true);
        }}
        className="press mx-auto flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
      >
        {libelle}
      </button>
      {erreur && (
        <p role="alert" className="mt-1 text-center text-xs font-medium text-red-700">
          {erreur}
        </p>
      )}
    </div>
  );
}
