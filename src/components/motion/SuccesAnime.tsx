import { Check } from "lucide-react";

// Marque de confirmation : disque qui pop puis coche qui se trace
// (animations .succes-pop / .anim-check définies dans globals.css,
// neutralisées par prefers-reduced-motion).
// (`taille`/`confettis` conservés pour compatibilité d'appel, ignorés.)
export function SuccesAnime({
  ton = "vert",
}: {
  taille?: number;
  ton?: "vert" | "ambre";
  confettis?: boolean;
}) {
  const ambre = ton === "ambre";
  return (
    <div
      aria-hidden="true"
      className={`succes-pop mx-auto grid size-[72px] place-items-center rounded-full ${
        ambre
          ? "bg-amber-100 text-amber-700 ring-8 ring-amber-50"
          : "bg-vert/10 text-vert ring-8 ring-vert/10"
      }`}
    >
      <Check className="anim-check size-9" strokeWidth={3} aria-hidden />
    </div>
  );
}
