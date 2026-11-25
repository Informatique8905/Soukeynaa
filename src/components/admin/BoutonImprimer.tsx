"use client";

import { Printer } from "lucide-react";
import { bouton } from "./ui";

export function BoutonImprimer() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={bouton("secondaire")}
    >
      <Printer />
      Imprimer / PDF
    </button>
  );
}
