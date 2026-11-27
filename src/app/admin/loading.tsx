import { Skeleton } from "@/components/ui/skeleton";

// Retour visuel immédiat pendant le chargement d'une page admin :
// en-tête + pilules de filtre + lignes de tableau en cours d'arrivée.
export default function ChargementAdmin() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Chargement">
      <div>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="mt-2 h-4 w-72 max-w-full" />
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-lg" />
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <div className="border-b border-border px-5 py-4">
          <Skeleton className="h-4 w-44" />
        </div>
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-b border-border/60 px-5 py-3.5 last:border-0"
          >
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="mt-1.5 h-3 w-1/4" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
