"use client";


export default function Erreur({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      
      <h1 className="mt-4 text-xl font-extrabold text-noir">
        Un petit souci technique
      </h1>
      <p className="mt-2 text-sm text-gris-fonce">
        La page n&apos;a pas pu se charger. Réessayez dans un instant.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-vert px-6 py-3 text-sm font-semibold text-white transition hover:bg-vert-fonce"
      >
        Réessayer
      </button>
    </main>
  );
}
