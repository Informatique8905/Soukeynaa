"use client";

import { useRef, useState } from "react";

/** Rail de bannières à points de pagination : le point actif s'étire
 * (6px → 18px), un tap fait défiler jusqu'à la bannière. */
export function CarrouselBannieres({
  children,
  nombre,
}: {
  children: React.ReactNode;
  nombre: number;
}) {
  const rail = useRef<HTMLDivElement>(null);
  const [actif, setActif] = useState(0);

  const auScroll = () => {
    const el = rail.current;
    if (!el) return;
    const x = el.scrollLeft;
    let best = 0;
    let dist = Infinity;
    Array.from(el.children).forEach((c, k) => {
      const d = Math.abs((c as HTMLElement).offsetLeft - x);
      if (d < dist) {
        dist = d;
        best = k;
      }
    });
    setActif(best);
  };

  return (
    <section aria-label="Bannières" className="mt-4">
      <div
        ref={rail}
        onScroll={auScroll}
        className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1"
      >
        {children}
      </div>
      {nombre > 1 && (
        <div className="mt-1.5 flex items-center justify-center gap-1.5">
          {Array.from({ length: nombre }, (_, k) => (
            <button
              key={k}
              type="button"
              aria-label={`Aller à la bannière ${k + 1}`}
              aria-current={k === actif}
              onClick={() => {
                const el = rail.current;
                const slide = el?.children[k] as HTMLElement | undefined;
                if (el && slide)
                  el.scrollTo({ left: slide.offsetLeft, behavior: "smooth" });
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ease-out ${
                k === actif ? "w-[18px] bg-vert" : "w-1.5 bg-noir/20"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
