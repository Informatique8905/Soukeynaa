"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Barre de progression en haut de page pendant les navigations internes :
 * démarre au clic sur un lien interne (ou bouton retour), file vers ~90 %
 * puis se termine au changement de route. Zéro dépendance, CSS pur.
 */
export function NavProgress() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<"repos" | "charge" | "fin">("repos");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const premiere = useRef(true);

  useEffect(() => {
    const demarre = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey || e.ctrlKey || e.shiftKey || e.altKey
      )
        return;
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const href = a.getAttribute("href") ?? "";
      if (!href.startsWith("/")) return;
      // Même page (ancre ou rechargement du chemin courant) : pas de barre
      const url = new URL(href, window.location.origin);
      if (url.pathname === window.location.pathname) return;
      setPhase("charge");
    };
    const retour = () => setPhase("charge");
    document.addEventListener("click", demarre, true);
    window.addEventListener("popstate", retour);
    return () => {
      document.removeEventListener("click", demarre, true);
      window.removeEventListener("popstate", retour);
    };
  }, []);

  useEffect(() => {
    if (premiere.current) {
      premiere.current = false;
      return;
    }
    // La route a changé : terminer puis masquer
    setPhase("fin");
    timer.current = setTimeout(() => setPhase("repos"), 400);
    return () => clearTimeout(timer.current);
  }, [pathname]);

  if (phase === "repos") return null;
  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-x-0 top-0 z-[70] h-[3px] ${
        phase === "fin" ? "nvp-fin" : ""
      }`}
    >
      <div
        className={`h-full origin-left bg-gradient-to-r from-vert via-vert to-vert-clair shadow-[0_0_8px_rgba(30,123,79,.45)] ${
          phase === "charge" ? "nvp-charge" : "scale-x-100"
        }`}
      />
    </div>
  );
}
