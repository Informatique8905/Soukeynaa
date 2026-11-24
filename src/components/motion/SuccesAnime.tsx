// Marque de confirmation typographique — disque vert + « ✓ », sobre.
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
      className={`mx-auto grid size-20 place-items-center rounded-full text-3xl font-bold ${
        ambre
          ? "bg-amber-100 text-amber-700 ring-8 ring-amber-50"
          : "bg-vert text-white ring-8 ring-vert/10"
      }`}
    >
      ✓
    </div>
  );
}
