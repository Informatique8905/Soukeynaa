import { Check } from "lucide-react";

// Marque de confirmation : disque qui pop, coche qui se trace, puis un
// anneau d'onde qui s'étend une fois (animations .succes-pop / .anim-check /
// .succes-onde dans globals.css, neutralisées par prefers-reduced-motion).
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
      className="relative mx-auto size-[72px]"
    >
      <span
        className={`succes-onde absolute inset-0 rounded-full ring-4 ${
          ambre ? "ring-amber-200" : "ring-vert/40"
        }`}
      />
      <span
        className={`succes-pop absolute inset-0 grid place-items-center rounded-full ${
          ambre
            ? "bg-amber-100 text-amber-700 ring-8 ring-amber-50"
            : "bg-vert/10 text-vert ring-8 ring-vert/10"
        }`}
      >
        <Check className="anim-check size-9" strokeWidth={3} aria-hidden />
      </span>
    </div>
  );
}
