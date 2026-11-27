import Link from "next/link";
import { Heart } from "lucide-react";
import { ListeFavoris } from "@/components/boutique/ListeFavoris";

export const metadata = { title: "Mes favoris" };

export default function FavorisPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <nav
        aria-label="Fil d'Ariane"
        className="flex items-center gap-1 text-xs text-gris-fonce"
      >
        <Link href="/" className="transition hover:text-vert">
          Accueil
        </Link>
        <span aria-hidden="true">›</span>
        <span>Favoris</span>
      </nav>

      <h1
        data-reveal="left"
        className="mt-3 flex items-center gap-2.5 font-display text-2xl font-bold tracking-tight text-noir"
      >
        <Heart className="size-6 fill-red-500 text-red-500" aria-hidden />
        Mes favoris
      </h1>

      <ListeFavoris />
    </main>
  );
}
