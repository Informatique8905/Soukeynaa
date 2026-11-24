"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LiquidTabBar, { type LiquidTab } from "@/components/ui/liquid-tab-bar";

const ITEMS: (LiquidTab & { href: string })[] = [
  { href: "/", label: "Accueil" },
  { href: "/femmes", label: "Univers" },
  { href: "/recherche", label: "Recherche" },
  { href: "/panier", label: "Panier" },
  { href: "/commandes", label: "Commandes" },
  { href: "/compte", label: "Compte" },
];

/** Barre de navigation mobile fixe en bas — bulle « liquide » animée. */
export function NavBas({ cartCount }: { cartCount: number }) {
  const pathname = usePathname();
  const index = Math.max(
    0,
    ITEMS.findIndex((it) =>
      it.href === "/" ? pathname === "/" : pathname.startsWith(it.href),
    ),
  );

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <LiquidTabBar
        items={ITEMS.map((it) => ({
          label: it.label,
          badge: it.href === "/panier" ? cartCount : undefined,
        }))}
        index={index}
        iconColor="#9aa1a8"
        activeIconColor="#1e7b4f"
        renderSlot={({ i, item, active, onPress }) => (
          <Link
            href={ITEMS[i].href}
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
