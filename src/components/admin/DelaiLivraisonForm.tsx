"use client";

import { useState, useTransition } from "react";
import { definirDelaiLivraison } from "@/app/admin/commandes/actions";
import { bouton, champ } from "./ui";

const DELAIS = [
  { jours: 1, valeur: "Livraison prévue dans 1 jour" },
  { jours: 2, valeur: "Livraison prévue dans 2 jours" },
  { jours: 3, valeur: "Livraison prévue dans 3 jours" },
];

export function DelaiLivraisonForm({
  commandeId,
  valeurInitiale,
}: {
  commandeId: number;
  valeurInitiale: string | null;
}) {
  // Une ancienne valeur hors liste reste proposée pour ne pas la perdre
  const options =
    DELAIS.some((d) => d.valeur === valeurInitiale) || !valeurInitiale
      ? DELAIS
      : [...DELAIS, { jours: 0, valeur: valeurInitiale }];
  const [choix, setChoix] = useState(valeurInitiale ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; texte: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!choix || pending) return;
        setMsg(null);
        start(async () => {
          const r = await definirDelaiLivraison(commandeId, choix);
          setMsg(
            r.ok
              ? {
                  ok: true,
                  texte: r.notifie
                    ? "Enregistré. Le client a été notifié par email."
                    : "Enregistré, ce délai avait déjà été notifié ou l'email n'a pas pu partir.",
                }
              : {
                  ok: false,
                  texte: r.erreur ?? "Erreur lors de l'enregistrement",
                },
          );
        });
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-xs font-semibold text-foreground">
            Délai affiché au client
          </span>
          <select
            name="delaiLivraison"
            value={choix}
            onChange={(e) => setChoix(e.target.value)}
            className={champ}
            required
          >
            <option value="" disabled>
              Choisir un délai…
            </option>
            {options.map((d) => (
              <option key={d.valeur} value={d.valeur}>
                {d.jours > 0
                  ? `Dans ${d.jours} jour${d.jours > 1 ? "s" : ""}`
                  : d.valeur}
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={pending || !choix}
          className={`${bouton("primaire")} self-end`}
        >
          {pending ? "Envoi…" : "Enregistrer & notifier"}
        </button>
      </div>
      {msg && (
        <p
          role="status"
          className={
            msg.ok
              ? "rounded-lg bg-vert-clair px-3 py-2 text-xs font-semibold text-vert-fonce"
              : "rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
          }
        >
          {msg.texte}
        </p>
      )}
    </form>
  );
}
