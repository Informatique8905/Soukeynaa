"use client";

import { useState } from "react";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";

const champBase =
  "w-full rounded-2xl border border-black/8 bg-blanc-casse py-3.5 pl-11 pr-4 text-[15px] text-noir outline-none transition placeholder:text-gris-fonce/70 focus:border-vert focus:bg-white focus:ring-4 focus:ring-vert/10";

/** Champ d'authentification : icône à gauche, œil afficher/masquer à droite
 * pour les mots de passe. */
export function ChampAuth({
  icone: Icone,
  motDePasse = false,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  icone: LucideIcon;
  motDePasse?: boolean;
}) {
  const [voir, setVoir] = useState(false);
  return (
    <div className="relative">
      <Icone
        aria-hidden
        className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-gris-fonce/70"
      />
      <input
        {...props}
        type={motDePasse ? (voir ? "text" : "password") : props.type}
        className={`${champBase} ${motDePasse ? "pr-11" : ""}`}
      />
      {motDePasse && (
        <button
          type="button"
          tabIndex={-1}
          aria-label={voir ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          aria-pressed={voir}
          onClick={() => setVoir((v) => !v)}
          className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-gris-fonce/70 transition hover:bg-gris hover:text-noir"
        >
          {voir ? (
            <EyeOff className="size-[18px]" aria-hidden />
          ) : (
            <Eye className="size-[18px]" aria-hidden />
          )}
        </button>
      )}
    </div>
  );
}

/** Bandeau visuel des pages auth : dégradé vert + décors doux, le logo
 * SOUKEYNA posé dans un badge blanc (le lettrage est sur fond blanc). */
export function EnTeteAuth() {
  return (
    <div
      data-reveal
      className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-vert-fonce via-vert to-[#2e9d66] px-6 pb-16 pt-10 text-center shadow-lg shadow-vert/20"
    >
      {/* Décors doux — bulles floutées, aucune image externe */}
      <div
        aria-hidden
        className="absolute -left-16 -top-16 size-48 rounded-full bg-vert-clair/15 blur-2xl"
      />
      <div
        aria-hidden
        className="absolute -bottom-20 -right-14 size-56 rounded-full bg-dore/20 blur-2xl"
      />
      <div
        aria-hidden
        className="absolute right-8 top-10 size-20 rounded-full border border-white/15"
      />
      <div
        aria-hidden
        className="absolute bottom-6 left-10 size-12 rounded-full border border-white/10"
      />
      <span className="relative mx-auto block w-fit rounded-2xl bg-white p-3 shadow-xl shadow-noir/20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-soukeyna.png"
          alt="SOUKEYNA"
          className="h-10 w-auto"
        />
      </span>
      <p className="relative mt-4 text-sm font-medium text-white/85">
        L&apos;élégance ivoirienne, livrée chez vous.
      </p>
    </div>
  );
}
