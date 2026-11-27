"use client";

import { useRouter } from "next/navigation";

/** Ligne de tableau entièrement cliquable : n'importe quel point de la
 * ligne ouvre la cible (préchargée au survol pour une ouverture
 * quasi instantanée). Le contenu reste rendu côté serveur. */
export function LigneCliquable({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const ouvrir = () => router.push(href);
  const amorcer = () => router.prefetch(href);
  return (
    <tr
      role="link"
      tabIndex={0}
      onClick={ouvrir}
      onMouseEnter={amorcer}
      onFocus={amorcer}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          ouvrir();
        }
      }}
      className={`cursor-pointer ${className}`}
    >
      {children}
    </tr>
  );
}
