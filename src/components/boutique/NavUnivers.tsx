"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const UNIVERS_NAV = [
  { slug: "enfants", label: "Enfants" },
  { slug: "hommes", label: "Hommes" },
  { slug: "femmes", label: "Femmes" },
  { slug: "accessoires", label: "Accessoires" },
];

/** Navigation desktop : pastille active qui suit l'univers courant. */
export function NavUnivers() {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-1 rounded-full bg-gris/70 p-1 text-sm font-semibold md:flex">
      {UNIVERS_NAV.map((u) => {
        const actif = pathname === `/${u.slug}`;
        return (
          <Link
            key={u.slug}
            href={`/${u.slug}`}
            aria-current={actif ? "page" : undefined}
            className={`press rounded-full px-4 py-1.5 transition-colors duration-300 ${
              actif
                ? "bg-white text-vert shadow-sm"
                : "text-gris-fonce hover:bg-white/60 hover:text-noir"
            }`}
          >
            {u.label}
          </Link>
        );
      })}
    </nav>
  );
}
