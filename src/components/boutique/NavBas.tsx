"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  Search,
  ShoppingBag,
  Package,
  User,
} from "lucide-react";
import LiquidTabBar, { type LiquidTab } from "@/components/ui/liquid-tab-bar";
import { useCompteurPanier } from "@/components/boutique/BadgePanier";

const ITEMS: (LiquidTab & { href: string })[] = [
  { href: "/", label: "Accueil", icon: <House /> },
  { href: "/recherche", label: "Recherche", icon: <Search /> },
  { href: "/panier", label: "Panier", icon: <ShoppingBag /> },
  { href: "/commandes", label: "Commandes", icon: <Package /> },
  { href: "/compte", label: "Compte", icon: <User /> },
];

/** Barre de navigation mobile fixe en bas — bulle « liquide » animée. */
export function NavBas({ cartCount }: { cartCount: number }) {
  const pathname = usePathname();
  const badgePanier = useCompteurPanier(cartCount);
  // Se masque en descendant, réapparaî en remontant : plus
  // d'écran pour le contenu, navigation toujours à portée.
  const [cachee, setCachee] = useState(false);
  useEffect(() => {
    let derniere = window.scrollY;
    let ticking = false;
    const auScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - derniere;
        derniere = y;
        ticking = false;
        if (y < 64) setCachee(false);
        else if (delta > 6) setCachee(true);
        else if (delta < -4) setCachee(false);
      });
    };
    window.addEventListener("scroll", auScroll, { passive: true });
    return () => window.removeEventListener("scroll", auScroll);
  }, []);
  const index = Math.max(
    0,
    ITEMS.findIndex((it) =>
      it.href === "/" ? pathname === "/" : pathname.startsWith(it.href),
    ),
  );

  return (
    <nav
      aria-label="Navigation principale"
      className={`fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] transition-transform duration-300 ease-out will-change-transform md:hidden ${cachee ? "translate-y-[110%]" : ""}`}
    >
      <LiquidTabBar
        items={ITEMS.map((it) => ({
          label: it.label,
          icon: it.icon,
          badge: it.href === "/panier" ? badgePanier || undefined : undefined,
        }))}
        index={index}
        iconColor="#9aa1a8"
        activeIconColor="#1e7b4f"
        renderSlot={({ i, item, active, onPress }) => (
          <Link
            href={ITEMS[i].href}
            prefetch={true}
            onClick={onPress}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
            className="ltb-hit"
          />
        )}
      />
    </nav>
  );
}
