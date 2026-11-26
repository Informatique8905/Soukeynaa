"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { User, Mail, Phone, Lock } from "lucide-react";
import { ChampAuth, EnTeteAuth } from "@/components/boutique/auth-ui";

export default function PageInscription() {
  const router = useRouter();
  const [form, setForm] = useState({
    nom: "",
    email: "",
    telephone: "",
    motDePasse: "",
    confirmation: "",
  });
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  const maj =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((f) => ({ ...f, [k]: e.target.value }));
      setErreur("");
    };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");
    if (form.motDePasse !== form.confirmation) {
      setErreur("Les mots de passe ne correspondent pas.");
      return;
    }
    setChargement(true);
    const res = await fetch("/api/auth/inscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nom: form.nom,
        email: form.email,
        telephone: form.telephone,
        motDePasse: form.motDePasse,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErreur(data.erreur ?? "Inscription impossible");
      setChargement(false);
      return;
    }
    // Connexion automatique après inscription
    await signIn("credentials", {
      email: form.email,
      motDePasse: form.motDePasse,
      redirect: false,
    });
    router.push("/compte");
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
          Créer votre compte
        </h1>
        <p className="mt-1 text-center text-sm text-gris-fonce">
          Suivi de commandes et coordonnées pré-remplies
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-3.5">
          <ChampAuth
            icone={User}
            required
            autoComplete="name"
            value={form.nom}
            onChange={maj("nom")}
            placeholder="Nom complet"
          />
          <ChampAuth
            icone={Mail}
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={maj("email")}
            placeholder="Email"
          />
          <ChampAuth
            icone={Phone}
            type="tel"
            autoComplete="tel"
            value={form.telephone}
            onChange={maj("telephone")}
            placeholder="Téléphone (optionnel)"
          />
          <ChampAuth
            icone={Lock}
            motDePasse
            required
            minLength={8}
            autoComplete="new-password"
            value={form.motDePasse}
            onChange={maj("motDePasse")}
            placeholder="Mot de passe (8 caractères min)"
          />
          <ChampAuth
            icone={Lock}
            motDePasse
            required
            minLength={8}
            autoComplete="new-password"
            value={form.confirmation}
            onChange={maj("confirmation")}
            placeholder="Confirmer le mot de passe"
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
                Création…
              </>
            ) : (
              "Créer mon compte"
            )}
          </button>
        </form>
      </div>

      <p className="mt-5 text-center text-sm text-gris-fonce">
        Déjà inscrit ?{" "}
        <Link href="/connexion" className="font-semibold text-vert">
          Se connecter
        </Link>
      </p>
    </main>
  );
}
