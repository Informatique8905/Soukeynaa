"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Révélation au scroll pour tout élément [data-reveal] de la page — y compris
// les composants serveur (il suffit d'ajouter l'attribut) :
//   data-reveal          → fondu + montée
//   data-reveal="left"   → glisse depuis la gauche
//   data-reveal="scale"  → zoom doux
// Les éléments ajoutés plus tard (navigation, filtres) sont pris en charge
// via un MutationObserver. Sans JS ou en mouvement réduit : tout reste visible.
const FROM: Record<string, gsap.TweenVars> = {
  "": { y: 28 },
  left: { x: -28 },
  scale: { scale: 0.92 },
};

export function MotionRoot() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Téléphone : pas de révélation au scroll (page stable)
    if (!window.matchMedia("(min-width: 768px)").matches) return;
    // Révélation native par le navigateur (scroll-driven animations) :
    // le CSS anime déjà les [data-reveal], rien à faire côté JS.
    if (CSS.supports("animation-timeline: view()")) return;
    gsap.registerPlugin(ScrollTrigger);
    const root = document.documentElement;

    let raf = 0;
    const triggers: ScrollTrigger[] = [];
    const scan = () => {
      raf = 0;
      const els = Array.from(
        document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-revealed])")
      );
      if (!els.length) return;
      els.forEach((el) => {
        el.dataset.revealed = "";
        gsap.set(el, { opacity: 0, ...FROM[el.dataset.reveal ?? ""] });
      });
      triggers.push(...ScrollTrigger.batch(els, {
        start: "top 92%",
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, {
            opacity: 1,
            x: 0,
            y: 0,
            scale: 1,
            duration: 0.7,
            ease: "power3.out",
            stagger: 0.07,
            overwrite: true,
            clearProps: "transform",
          }),
      }));
    };
    const planifier = () => {
      if (!raf) raf = requestAnimationFrame(scan);
    };

    // Attendre la fin de l'hydratation : avec cacheComponents, le contenu
    // dynamique (Suspense) s'hydrate après le shell statique — toucher à un
    // élément pas encore hydraté provoque un avertissement de mismatch.
    const mo = new MutationObserver(planifier);
    let observeurActif = false;
    const demarrer = () => {
      if (observeurActif) return;
      observeurActif = true;
      root.classList.add("js-motion");
      planifier();
      mo.observe(document.body, { childList: true, subtree: true });
    };
    if (document.readyState === "complete") demarrer();
    else window.addEventListener("load", demarrer, { once: true });

    // Filet de sécurité : rien ne doit rester invisible si un trigger rate
    const secours = window.setInterval(() => {
      document
        .querySelectorAll<HTMLElement>("[data-revealed]")
        .forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.top < innerHeight && r.bottom > 0 && getComputedStyle(el).opacity === "0") {
            gsap.to(el, { opacity: 1, x: 0, y: 0, scale: 1, duration: 0.4 });
          }
        });
    }, 1500);

    return () => {
      window.removeEventListener("load", demarrer);
      mo.disconnect();
      cancelAnimationFrame(raf);
      clearInterval(secours);
      triggers.forEach((t) => t.kill());
      root.classList.remove("js-motion");
    };
  }, []);

  return null;
}
