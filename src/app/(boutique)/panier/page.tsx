import { getPanierDetails } from "@/lib/cart";
import { PanierInteractif } from "@/components/boutique/PanierInteractif";
import { EtatVide } from "@/components/motion/EtatVide";

export const metadata = { title: "Panier" };

export default async function PanierPage() {
  const panier = await getPanierDetails();
  const nb = panier.lignes.reduce((s, l) => s + l.quantite, 0);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 md:py-10">
      <div data-reveal="left" className="flex items-end justify-between">
        <h1 className="font-display text-2xl font-bold tracking-tight text-noir md:text-3xl">
          Votre panier
        </h1>
        {nb > 0 && (
          <span className="rounded-full bg-vert-clair px-3 py-1 text-xs font-bold text-vert">
            {nb} article{nb > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {panier.lignes.length === 0 ? (
        <EtatVide
          dessin="sac"
          titre="Votre panier est encore vide"
          texte="Nos pépites vous attendent. Commencez par le catalogue."
          action={{ href: "/", label: "Découvrir la boutique" }}
        />
      ) : (
        <PanierInteractif lignes={panier.lignes} />
      )}
    </main>
  );
}
