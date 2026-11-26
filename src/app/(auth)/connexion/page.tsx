"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";
import { Mail, Lock } from "lucide-react";
import { ChampAuth, EnTeteAuth } from "@/components/boutique/auth-ui";

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

  return (
    <main className="mx-auto max-w-md px-4 pb-10 pt-3">
      <EnTeteAuth />

      {/* Carte qui chevauche le bandeau visuel */}
      <div
        data-reveal="scale"
        className="relative z-10 -mt-10 rounded-[1.75rem] bg-white p-6 shadow-xl shadow-noir/10 ring-1 ring-black/5"
      >
        <h1 className="text-center text-xl font-extrabold text-noir">
          Ravi de vous revoir
        </h1>
        <p className="mt-1 text-center text-sm text-gris-fonce">
          Connectez-vous pour suivre vos commandes
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-3.5">
          <ChampAuth
            icone={Mail}
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErreur("");
            }}
            placeholder="Email"
          />
          <ChampAuth
            icone={Lock}
            motDePasse
            required
            autoComplete="current-password"
            value={motDePasse}
            onChange={(e) => {
              setMotDePasse(e.target.value);
              setErreur("");
            }}
            placeholder="Mot de passe"
          />
          {erreur && (
            <p
              role="alert"
              className="page-in rounded-xl bg-red-50 p-3 text-sm text-red-700"
            >
              {erreur}
            </p>
          )}
          <button
            type="submit"
            disabled={chargement}
            className="press shine flex w-full items-center justify-center gap-2 rounded-full bg-vert py-4 text-[15px] font-bold text-white shadow-lg shadow-vert/25 hover:bg-vert-fonce disabled:opacity-50"
          >
            {chargement ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Connexion…
              </>
            ) : (
              "Se connecter"
            )}
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
