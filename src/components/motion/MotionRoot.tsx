"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Révélation au scroll pour tout élément [data-reveal] de la page — y compris
// les composants serveur (il suffit d'ajouter l'attribut) :
//   data-reveal          → fondu + montée
//   data-reveal="left"   → glisse depuis la gauche
//   data-reveal="scale"  → zoom doux
// Priorité au CSS natif (animation-timeline: view()) quand le navigateur le
// permet. Sinon : desktop → repli GSAP ScrollTrigger ; mobile → repli léger
// IntersectionObserver + Web Animations API (iOS 13.4+, Chrome 51+, Firefox),
// mêmes distances que les keyframes rv-in-mobile de globals.css.
// Les éléments ajoutés plus tard sont pris en charge via MutationObserver.
// Sans JS ou en mouvement réduit : tout reste visible.
const FROM: Record<string, gsap.TweenVars> = {
  "": { y: 28 },
  left: { x: -28 },
  scale: { scale: 0.92 },
  blur: { scale: 0.97, filter: "blur(10px)" },
};

// États de départ du repli mobile — alignés sur rv-in-mobile(-left/-scale).
const FROM_MOBILE: Record<string, string> = {
  "": "translate3d(0, 14px, 0)",
  left: "translate3d(-14px, 0, 0)",
  scale: "scale(0.95)",
  blur: "scale(0.96)",
};

// Repli mobile : IntersectionObserver + WAAPI — transform/opacity uniquement,
// l'animation se joue une fois et court (550 ms) : la page ne bouge pas
// sous le doigt. Sans IO ni WAAPI : les éléments restent visibles (dégradé OK).
function repliMobile() {
  if (
    typeof IntersectionObserver === "undefined" ||
    !("animate" in Element.prototype)
  ) {
    return () => {};
  }

  const io = new IntersectionObserver(
    (entries) => {
      const visibles = entries.filter((e) => e.isIntersecting);
      visibles.forEach((entry, i) => {
        const el = entry.target as HTMLElement;
        io.unobserve(el);
        el.style.opacity = "";
        el.style.transform = "";
        el.animate(
          [
            {
              opacity: 0,
              transform: FROM_MOBILE[el.dataset.reveal ?? ""] ?? FROM_MOBILE[""],
            },
            { opacity: 1, transform: "none" },
          ],
          {
            duration: 550,
            delay: Math.min(i, 4) * 60,
            easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
            fill: "backwards",
          },
        );
      });
    },
    // Déclenche tôt (~8 % avant le bord bas) : l'animation est déjà finie
    // quand l'élément arrive vraiment sous le doigt.
    { rootMargin: "0px 0px -8% 0px" },
  );

  const scan = () => {
    document
      .querySelectorAll<HTMLElement>("[data-reveal]:not([data-io])")
      .forEach((el) => {
        el.dataset.io = "";
        el.style.opacity = "0";
        el.style.transform =
          FROM_MOBILE[el.dataset.reveal ?? ""] ?? FROM_MOBILE[""];
        io.observe(el);
      });
  };

  const mo = new MutationObserver(scan);
  let actif = false;
  const demarrer = () => {
    if (actif) return;
    actif = true;
    scan();
    mo.observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === "complete") demarrer();
  else window.addEventListener("load", demarrer, { once: true });

  return () => {
    window.removeEventListener("load", demarrer);
    io.disconnect();
    mo.disconnect();
  };
}

export function MotionRoot() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Révélation native par le navigateur (scroll-driven animations) :
    // le CSS anime déjà les [data-reveal], rien à faire côté JS.
    if (CSS.supports("animation-timeline: view()")) return;
    // Mobile sans support natif (iOS < 26, vieux Chrome, Firefox) :
    // repli léger, mêmes révélations que le CSS.
    if (!window.matchMedia("(min-width: 768px)").matches) return repliMobile();
    // Desktop sans support natif (Firefox…) : repli GSAP ScrollTrigger.
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
            filter: "blur(0px)",
            clearProps: "transform,filter",
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
            gsap.to(el, { opacity: 1, x: 0, y: 0, scale: 1, filter: "blur(0px)", duration: 0.4 });
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
