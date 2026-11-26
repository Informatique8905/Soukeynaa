"use client";

import { useEffect, useRef } from "react";
import { fcfa } from "@/lib/format";

/** Montant qui « roule » jusqu'à sa nouvelle valeur (FCFA par défaut). */
export function Compteur({
  valeur,
  format = fcfa,
  className,
}: {
  valeur: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const el = useRef<HTMLSpanElement>(null);
  const courant = useRef(valeur);

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    let mort = false;
    let tw: { kill(): void } | null = null;
    void import("gsap").then(({ gsap }) => {
      if (mort) return;
      const obj = { v: courant.current };
      tw = gsap.to(obj, {
        v: valeur,
        duration: 0.6,
        ease: "power3.out",
        onUpdate: () => {
          courant.current = obj.v;
          node.textContent = format(Math.round(obj.v));
        },
      });
    });
    return () => {
      mort = true;
      tw?.kill();
    };
  }, [valeur, format]);

  return (
    <span ref={el} className={className}>
      {format(valeur)}
    </span>
  );
}
