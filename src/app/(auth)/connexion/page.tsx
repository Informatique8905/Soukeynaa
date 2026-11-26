"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";

function FormulaireConnexion() {
  const router = useRouter();
  const params = useSearchParams();
  // Anti-open-redirect : seuls les chemins internes sont acceptés —
  // « //evil.com » (URL scheme-relative) et les URL absolues sont rejetés.
  const cb = params.get("callbackUrl") ?? "";
  const callbackUrl = cb.startsWith("/") && !cb.startsWith("//") ? cb : "/compte";
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");
    setChargement(true);
    const res = await signIn("credentials", {
      email,
      motDePasse,
      redirect: false,
    });
    setChargement(false);
    if (res?.error) {
      setErreur(
        "Email ou mot de passe incorrect, ou compte temporairement bloqué",
      );
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  const champ =
    "w-full rounded-xl border border-black/10 bg-blanc-casse py-3 pr-4 text-sm outline-none transition focus:border-vert focus:bg-white focus:ring-4 focus:ring-vert/10";

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <div data-reveal="scale" className="rounded-[2rem] bg-white/90 p-6 shadow-xl shadow-vert/10 ring-1 ring-black/5 backdrop-blur-xl sm:p-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-soukeyna.png"
          alt="Soukeyna Styl'"
          className="mx-auto h-14 w-auto"
        />
        <h1 className="mt-4 text-center text-xl font-extrabold text-noir">
          Ravi de vous revoir
        </h1>
        <p className="mt-1 text-center text-sm text-gris-fonce">
          Connectez-vous pour suivre vos commandes
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="group relative">
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className={champ}
            />
          </div>
          <div className="group relative">
            <input
              type="password"
              required
              autoComplete="current-password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              placeholder="Mot de passe"
              className={champ}
            />
          </div>
          {erreur && (
            <p role="alert" className="page-in rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {erreur}
            </p>
          )}
          <button
            type="submit"
            disabled={chargement}
            className="press shine flex w-full items-center justify-center gap-2 rounded-full bg-vert py-4 font-bold text-white shadow-lg shadow-vert/25 hover:bg-vert-fonce disabled:opacity-50"
          >
            {chargement ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      </div>

      <p className="mt-5 text-center text-sm text-gris-fonce">
        Pas de compte ?{" "}
        <Link href="/inscription" className="font-semibold text-vert">
          Créer un compte
        </Link>
        <br />
        ou commandez directement, sans compte.
      </p>
    </main>
  );
}

export default function PageConnexion() {
  return (
    <Suspense>
      <FormulaireConnexion />
    </Suspense>
  );
}
