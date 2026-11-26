"use client";

import { useEffect, useState } from "react";

/** En-tête boutique : se masque en descendant (plus d'écran pour le contenu),
 * réapparaît dès qu'on remonte — même pattern que NavBas. Signale son état
 * via html[data-header-cache] pour que les barres sticky remontent à sa place. */
export function EnTete({ children }: { children: React.ReactNode }) {
  const [cache, setCache] = useState(false);

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
        if (y < 80) setCache(false);
        else if (delta > 6) setCache(true);
        else if (delta < -4) setCache(false);
      });
    };
    window.addEventListener("scroll", auScroll, { passive: true });
    return () => window.removeEventListener("scroll", auScroll);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.headerCache = cache ? "1" : "";
    return () => {
      delete document.documentElement.dataset.headerCache;
    };
  }, [cache]);

  return (
    <header
      className={`hdr-scroll sticky top-0 z-40 border-b border-black/5 bg-white/95 backdrop-blur-md transition-transform duration-300 ease-out print:hidden ${
        cache ? "-translate-y-full" : ""
      }`}
    >
      {children}
    </header>
  );
}
