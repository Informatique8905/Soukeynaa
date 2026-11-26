"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fcfa } from "@/lib/format";
import { cloud } from "@/lib/image";

export interface OffreBiblio {
  slug: string;
  nom: string;
  categorie?: string;
  image: string | null;
  prix: number;
  prixAffiche: number;
  enPromo: boolean;
}

function reductionOf(p: OffreBiblio): number {
  return p.enPromo && p.prix > 0
    ? Math.round(((p.prix - p.prixAffiche) / p.prix) * 100)
    : 0;
}

/**
 * Bibliothèque 3D des offres : le produit actif est centré et agrandi,
 * les voisins s'alignent en perspective avec profondeur progressive.
 * Clic sur un voisin → il vient au centre ; clic sur le central → fiche produit.
 */
export function OffresBibliotheque({ offres }: { offres: OffreBiblio[] }) {
  const router = useRouter();
  const n = offres.length;
  const [actif, setActif] = useState(0);
  const glisse = useRef<{ x: number; y: number; bouge: boolean } | null>(null);

  const suivant = () => setActif((a) => (a + 1) % n);
  const precedent = () => setActif((a) => (a - 1 + n) % n);

  /** Distance signée la plus courte sur la boucle (actif = 0). */
  const distance = (i: number) => {
    let d = i - actif;
    if (d > n / 2) d -= n;
    if (d < -n / 2) d += n;
    return d;
  };

  const choisir = (i: number) => {
    if (glisse.current?.bouge) return;
    if (i === actif) router.push(`/produit/${offres[i].slug}`);
    else setActif(i);
  };

  const clavier = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); suivant(); }
    if (e.key === "ArrowLeft") { e.preventDefault(); precedent(); }
  };

  if (n === 0) return null;
  const o = offres[actif];

  return (
    <div
      className="ob3d mt-5 select-none outline-none"
      tabIndex={0}
      role="region"
      aria-roledescription="carrousel"
      aria-label="Offres du moment"
      onKeyDown={clavier}
    >
      <style>{`
        .ob3d{--esp:96px}
        @media(min-width:640px){.ob3d{--esp:150px}}
        @media(min-width:1024px){.ob3d{--esp:190px}}
        .ob3d-item{
          transition:transform .7s cubic-bezier(.22,1,.36,1),opacity .55s ease;
          will-change:transform;
        }
        .ob3d-titre{animation:ob3d-fondu .35s ease-out both}
        @keyframes ob3d-fondu{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @media (prefers-reduced-motion:reduce){
          .ob3d-item{transition:none}
          .ob3d-titre{animation:none}
        }
      `}</style>

      {/* Scène 3D */}
      <div
        className="relative mx-auto h-64 max-w-4xl overflow-hidden [perspective:1100px] sm:h-72 md:h-80 [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]"
        onPointerDown={(e) => {
          glisse.current = { x: e.clientX, y: e.clientY, bouge: false };
        }}
        onPointerMove={(e) => {
          const g = glisse.current;
          if (g && Math.abs(e.clientX - g.x) > 12) g.bouge = true;
        }}
        onPointerUp={(e) => {
          const g = glisse.current;
          glisse.current = null;
          if (!g) return;
          const dx = e.clientX - g.x;
          const dy = e.clientY - g.y;
          if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
            if (dx < 0) suivant();
            else precedent();
          }
        }}
        onPointerCancel={() => { glisse.current = null; }}
        style={{ touchAction: "pan-y" }}
      >
        {offres.map((p, i) => {
          const d = distance(i);
          const ad = Math.abs(d);
          const cache = ad > 3;
          const rot = Math.min(ad * 42, 52) * (d > 0 ? 1 : -1);
          return (
            <button
              key={p.slug}
              type="button"
              onClick={() => choisir(i)}
              aria-label={
                i === actif
                  ? `${p.nom} — voir la fiche produit`
                  : `Afficher ${p.nom}`
              }
              aria-current={i === actif ? "true" : undefined}
              tabIndex={-1}
              className="ob3d-item group absolute left-1/2 top-1/2 block aspect-[3/4] w-40 cursor-pointer sm:w-48 md:w-56"
              style={{
                transform: `translate(-50%,-50%) translateX(calc(${d} * var(--esp))) translateZ(${-ad * 110}px) rotateY(${rot}deg) scale(${1 - Math.min(ad * 0.07, 0.22)})`,
                opacity: cache ? 0 : 1 - ad * 0.14,
                zIndex: 20 - ad,
                pointerEvents: cache ? "none" : "auto",
              }}
            >
              <span
                className={`block h-full w-full overflow-hidden rounded-2xl bg-white ring-1 ring-black/10 transition-shadow duration-700 ${
                  i === actif
                    ? "shadow-[0_26px_50px_-16px_rgb(23_21_18/0.4)]"
                    : "shadow-[0_14px_28px_-14px_rgb(23_21_18/0.3)]"
                }`}
              >
                {p.image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={cloud(p.image, 420) ?? p.image}
                    alt={p.nom}
                    loading={ad <= 1 ? "eager" : "lazy"}
                    decoding="async"
                    draggable={false}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-vert to-vert-fonce text-4xl font-extrabold text-white/60">
                    {p.nom.charAt(0)}
                  </span>
                )}
              </span>
              {reductionOf(p) > 0 && (
                <span className="absolute -left-1.5 top-3 rounded-full bg-vert px-2 py-0.5 text-[11px] font-extrabold text-white shadow-md">
                  -{reductionOf(p)}%
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Titre + infos du produit actif */}
      <div key={actif} className="ob3d-titre mt-5 text-center">
        <p className="mx-auto max-w-md truncate px-4 text-base font-extrabold text-vert sm:text-lg">
          {o.nom}
        </p>
        <p className="mt-0.5 text-xs text-gris-fonce">
          {o.categorie ? `${o.categorie} · ` : ""}
          <span className="font-bold text-noir">{fcfa(o.prixAffiche)}</span>
          {o.prixAffiche < o.prix && (
            <span className="ml-1.5 line-through opacity-60">
              {fcfa(o.prix)}
            </span>
          )}
        </p>
      </div>

      {/* Commandes */}
      {n > 1 && (
        <div className="mt-3 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={precedent}
            aria-label="Offre précédente"
            className="press grid size-9 place-items-center rounded-full bg-white text-noir shadow-sm ring-1 ring-black/10 transition hover:bg-vert-clair hover:text-vert"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="flex items-center gap-1.5">
            {offres.map((p, i) => (
              <button
                key={p.slug}
                type="button"
                onClick={() => setActif(i)}
                aria-label={`Aller à l'offre ${i + 1} : ${p.nom}`}
                aria-current={i === actif ? "true" : undefined}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i === actif
                    ? "w-6 bg-vert"
                    : "w-1.5 bg-noir/15 hover:bg-noir/30"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={suivant}
            aria-label="Offre suivante"
            className="press grid size-9 place-items-center rounded-full bg-white text-noir shadow-sm ring-1 ring-black/10 transition hover:bg-vert-clair hover:text-vert"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
