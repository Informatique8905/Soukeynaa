import Link from "next/link";

export default function Introuvable() {
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      
      <h1 className="mt-4 text-xl font-extrabold text-noir">
        Page introuvable
      </h1>
      <p className="mt-2 text-sm text-gris-fonce">
        Cette page n&apos;existe pas ou le produit n&apos;est plus disponible.
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
