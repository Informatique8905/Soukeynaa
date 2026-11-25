"use client";

import { Printer } from "lucide-react";

export function BoutonImprimerBon() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="press inline-flex items-center gap-2 rounded-full bg-noir px-4 py-2.5 text-xs font-bold text-white transition hover:bg-vert print:hidden"
    >
      <Printer className="size-4" aria-hidden />
      Imprimer / PDF
    </button>
  );
}
