import { Skeleton } from "@/components/ui/skeleton";

// Squelette aligné sur la fiche produit : barre du haut, stage visuel,
// carte d'infos, rail de vignettes — l'utilisateur voit la structure
// de la fiche arriver au lieu d'une grille générique.
export default function ChargementProduit() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6" aria-busy="true" aria-label="Chargement du produit">
      <div className="flex items-center justify-between">
        <Skeleton className="size-11 rounded-full" />
        <div className="flex gap-2">
          <Skeleton className="size-11 rounded-full" />
          <Skeleton className="size-11 rounded-full" />
        </div>
      </div>
      <div className="mt-4 flex flex-col items-center">
        <Skeleton className="h-8 w-56 max-w-[70%] rounded-lg" />
        <Skeleton className="mt-6 size-[54vw] max-w-72 rounded-3xl sm:size-64" />
        <div className="mt-6 w-full max-w-md space-y-3 rounded-3xl bg-white p-5 ring-1 ring-black/5">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="mt-2 h-12 w-full rounded-full" />
        </div>
        <div className="mt-5 flex gap-2.5">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="size-14 rounded-2xl" />
          ))}
        </div>
      </div>
    </main>
  );
}
