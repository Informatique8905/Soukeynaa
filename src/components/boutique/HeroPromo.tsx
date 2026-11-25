"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";

/** Bannière promo de l’accueil, animée à l’entrée. */
export function HeroPromo({
  reduction,
  visuel,
}: {
  reduction: number;
  visuel: string | null;
}) {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Téléphone : bannière statique (page fixe)
    if (!window.matchMedia("(min-width: 768px)").matches) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.15 });
      tl.from(".hp-txt > *", { y: 18, opacity: 0, duration: 0.6, stagger: 0.09, ease: "power3.out" })
        .from(".hp-img", { scale: 0.7, rotation: -8, opacity: 0, duration: 0.8, ease: "back.out(1.6)" }, 0.1);
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      className="relative mt-5 overflow-hidden rounded-[2rem] bg-gradient-to-br from-vert via-[#1a7046] to-vert-fonce text-white shadow-xl shadow-vert/25"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_85%_-10%,rgba(255,255,255,0.14),transparent_60%)]"
      />
      <div className="relative flex items-center gap-4 p-5 sm:p-7">
        <div className="hp-txt min-w-0 flex-1">
          {reduction > 0 && (
            <span className="inline-block rounded-full bg-white px-3 py-1 text-xs font-extrabold text-vert shadow">
              Jusqu&apos;à -{reduction}%
            </span>
          )}
          <h2 className="mt-2.5 text-[1.4rem] font-extrabold leading-tight sm:text-3xl">
            Les prix fondent,
            <br />
            <span className="underline decoration-[#e3b341] decoration-4 underline-offset-4">
              le style reste
            </span>
          </h2>
          <Link
            href="#offres"
            className="press shine mt-5 inline-flex items-center gap-1.5 rounded-full bg-noir px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-black"
          >
            Voir les offres
          </Link>
        </div>
        {visuel && (
          <div className="float relative shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={visuel}
              alt="Article en promotion"
              className="hp-img h-36 w-28 rounded-3xl object-cover shadow-2xl ring-4 ring-white/20 sm:h-44 sm:w-36"
            />
          </div>
        )}
      </div>
    </section>
  );
}
