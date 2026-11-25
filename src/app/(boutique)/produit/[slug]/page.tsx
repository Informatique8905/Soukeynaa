import { notFound } from "next/navigation";
import Link from "next/link";
import { getPrisma } from "@/lib/db";
import { prixEffectif } from "@/lib/pricing";
import { FicheProduit } from "@/components/boutique/FicheProduit";

interface ImageJson {
  url?: string;
  alt?: string;
}

export default async function ProduitPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const prisma = getPrisma();
  const produit = await prisma.product.findUnique({
    where: { slug },
    include: { variantes: { orderBy: { id: "asc" } }, categorie: true },
  });
  if (!produit || produit.statut !== "publie") notFound();

  const prix = await prixEffectif(produit);

  return (
    <main className="motion-safe:animate-entree">
      <nav
        aria-label="Fil d'Ariane"
        className="mx-auto flex max-w-7xl items-center gap-1 px-4 pt-4 text-xs text-gris-fonce"
      >
        <Link href="/" className="transition hover:text-vert">
          Accueil
        </Link>
        <span aria-hidden="true">›</span>
        <Link
          href={`/categorie/${produit.categorie.slug}`}
          className="transition hover:text-vert"
        >
          {produit.categorie.nom}
        </Link>
      </nav>

      <FicheProduit
        produitId={produit.id}
        nom={produit.nom}
        description={produit.description}
        categorie={produit.categorie.nom}
        prix={prix}
        prixBase={produit.prix}
        images={(produit.images as ImageJson[]) ?? []}
        aVariantes={produit.aVariantes}
        stock={produit.stock}
        variantes={produit.variantes.map((v) => ({
          id: v.id,
          taille: v.taille,
          couleur: v.couleur,
          stock: v.stock,
        }))}
      />
    </main>
  );
}
