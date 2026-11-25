"use client";

import { useRouter } from "next/navigation";
import RunwayLookbook, { type RunwayLook } from "@/components/ui/runway-lookbook";

export interface LookCategorie extends RunwayLook {
  /** Lien de la catégorie affichée par ce look. */
  href: string;
}

export function AccueilHero({
  looks,
  nav,
  cartCount,
  connecte,
}: {
  looks: LookCategorie[];
  nav: { label: string; href: string }[];
  cartCount: number;
  connecte: boolean;
}) {
  const router = useRouter();

  return (
    <RunwayLookbook
      looks={looks}
      brand="SOUKEYNA"
      tabs={[]}
      nav={nav}
      activeNav={-1}
      title="L'élégance ivoirienne"
      blurb="Des pièces choisies avec soin pour toute la famille, livrées dans tout Abidjan."
      ctaLabel="Découvrir"
      cartCount={cartCount}
      ariaLabel="Collection SOUKEYNA"
      height="100svh"
      onShopLook={(i) => {
        const href = looks[i]?.href;
        if (href) router.push(href);
      }}
      onNavigate={({ kind, index }) => {
        if (kind === "nav" && index != null && nav[index]) {
          router.push(nav[index].href);
        } else if (kind === "search") {
          router.push("/recherche");
        } else if (kind === "cart") {
          router.push("/panier");
        } else if (kind === "login") {
          router.push(connecte ? "/compte" : "/connexion");
        } else if (kind === "wishlist") {
          router.push("/panier");
        }
      }}
    />
  );
}
