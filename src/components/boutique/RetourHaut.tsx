"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

/** Bouton flottant « retour en haut » : apparaît après un écran de scroll,
 * remontée douce. Au-dessus de la barre du bas sur mobile. */
export function RetourHaut() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let ticking = false;
    const auScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setVisible(window.scrollY > 640);
        ticking = false;
      });
    };
    window.addEventListener("scroll", auScroll, { passive: true });
    auScroll();
    return () => window.removeEventListener("scroll", auScroll);
  }, []);

  return (
    <button
      type="button"
      aria-label="Retour en haut de page"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={`press fixed bottom-[calc(100px+env(safe-area-inset-bottom))] right-4 z-40 grid size-11 place-items-center rounded-full bg-vert text-white shadow-lg shadow-vert/30 transition-all duration-300 ease-out md:bottom-6 md:right-6 ${
        visible
          ? "translate-y-0 scale-100 opacity-100"
          : "pointer-events-none translate-y-5 scale-90 opacity-0"
      }`}
    >
      <ArrowUp className="size-5" aria-hidden />
    </button>
  );
}
