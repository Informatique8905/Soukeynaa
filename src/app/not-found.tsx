import Link from "next/link";

export default function Introuvable() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-blanc-casse px-4 text-center">
      
      <h1 className="mt-4 text-2xl font-extrabold text-noir">
        Page introuvable
      </h1>
      <p className="mt-2 text-sm text-gris-fonce">
        L&apos;adresse demandée n&apos;existe pas ou n&apos;est plus disponible.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-vert px-6 py-3 text-sm font-semibold text-white transition hover:bg-vert-fonce"
      >
        Retour à la boutique
      </Link>
    </main>
  );
}
