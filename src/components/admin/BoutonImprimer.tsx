"use client";

export function BoutonImprimer() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full bg-white px-5 py-2 text-sm font-semibold ring-1 ring-black/10 transition hover:bg-gris"
    >
      Imprimer / PDF
    </button>
  );
}
