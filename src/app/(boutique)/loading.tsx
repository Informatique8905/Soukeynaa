import { Skeleton } from "@/components/ui/skeleton";

export default function Chargement() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <Skeleton className="h-7 w-40 rounded-full" />
      <Skeleton className="mt-4 h-12 w-full rounded-full" />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="rounded-2xl bg-white p-2.5 ring-1 ring-black/5">
            <Skeleton className="aspect-square w-full rounded-xl" />
            <Skeleton className="mx-1 mt-2 h-4 w-3/4" />
            <Skeleton className="mx-1 mb-1 mt-1.5 h-4 w-1/2" />
          </div>
        ))}
      </div>
    </main>
  );
}
