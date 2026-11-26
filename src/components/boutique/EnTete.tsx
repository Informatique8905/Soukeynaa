"use client";

import { useEffect, useState } from "react";

/** En-tête boutique : se masque en descendant (plus d'écran pour le contenu),
 * réapparaît dès qu'on remonte — même pattern que NavBas, avec hystérésis :
 * ~30 px cumulés dans un sens avant de basculer, pour ne pas scintiller
 * pendant le défilement. Signale son état via html[data-header-cache] pour
 * que les barres sticky remontent à sa place. */
export function EnTete({ children }: { children: React.ReactNode }) {
  const [cache, setCache] = useState(false);

  useEffect(() => {
    let derniere = window.scrollY;
    let cumul = 0;
    let sens: 1 | -1 = 1;
    let ticking = false;
    const auScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - derniere;
        derniere = y;
        ticking = false;
        if (y < 80) {
          cumul = 0;
          setCache(false);
          return;
        }
        const d = delta > 0 ? 1 : -1;
        if (d !== sens) {
          sens = d;
          cumul = 0;
        }
        cumul += Math.abs(delta);
        if (cumul < 30) return;
        cumul = 0;
        setCache(d === 1);
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
      className={`hdr-scroll sticky top-0 z-40 border-b border-black/5 bg-white/95 backdrop-blur-md transition-transform duration-300 ease-out will-change-transform print:hidden ${
        cache ? "-translate-y-full" : ""
      }`}
    >
      {children}
    </header>
  );
}
