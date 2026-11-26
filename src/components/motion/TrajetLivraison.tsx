"use client";

import { useLayoutEffect, useRef } from "react";

// Suivi de commande : frise typographique sobre (points + ligne, pas
// d'illustration). La progression se remplit en douceur.
export function TrajetLivraison({
  etapes,
  courant,
}: {
  etapes: string[];
  /** index de l'étape atteinte (0-based) */
  courant: number;
}) {
  const barre = useRef<HTMLDivElement>(null);
  const n = etapes.length;
  const frac = n > 1 ? Math.max(0, courant) / (n - 1) : 1;

  useLayoutEffect(() => {
    const el = barre.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let mort = false;
    let tween: { kill(): void } | null = null;
    void import("gsap").then(({ gsap }) => {
      if (mort) return;
      tween = gsap.fromTo(
        el,
        { scaleX: 0 },
        { scaleX: frac, duration: 1 + frac, ease: "power2.inOut" }
      );
    });
    return () => {
      mort = true;
      tween?.kill();
    };
  }, [frac]);

  return (
    <div aria-label="Progression de la commande">
      <div className="relative mx-2 h-0.5 rounded-full bg-black/10">
        <div
          ref={barre}
          className="absolute inset-0 origin-left rounded-full bg-vert"
          style={{ transform: `scaleX(${frac})` }}
        />
      </div>
      <ol className="mt-3 flex justify-between gap-1">
        {etapes.map((e, i) => {
          const atteinte = i <= courant;
          const actuelle = i === courant;
          return (
            <li
              key={e}
              aria-current={actuelle ? "step" : undefined}
              className={`flex flex-1 flex-col items-center gap-1 text-center text-[10px] font-semibold leading-tight sm:text-xs ${
                atteinte ? "text-vert" : "text-gris-fonce/60"
              }`}
            >
              <span
                className={`size-2 rounded-full ${
                  actuelle
                    ? "bg-vert halo-pulse"
                    : atteinte
                      ? "bg-vert"
                      : "bg-black/15"
                }`}
              />
              {e}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
