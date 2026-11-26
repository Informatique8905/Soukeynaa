"use client";

import { useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

/** Pilule « Réf. XXXX » cliquable : copie la référence de commande dans le
 * presse-papiers et confirme « Copié ! » pendant 2 s. */
export function CopierReference({ reference }: { reference: string }) {
  const [ok, setOk] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  async function copier() {
    try {
      await navigator.clipboard.writeText(reference);
    } catch {
      // Clipboard indisponible (contexte non sécurisé) : repli manuel.
      const ta = document.createElement("textarea");
      ta.value = reference;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setOk(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOk(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copier}
      aria-label={`Copier la référence ${reference}`}
      className={`press inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
        ok
          ? "bg-vert-clair text-vert ring-vert/30"
          : "bg-white text-gris-fonce ring-black/5 hover:text-vert hover:ring-vert/30"
      }`}
    >
      <span className="tabular-nums">
        {ok ? "Copié !" : `Réf. ${reference}`}
      </span>
      {ok ? (
        <Check className="size-3.5" aria-hidden />
      ) : (
        <Copy className="size-3.5" aria-hidden />
      )}
    </button>
  );
}
