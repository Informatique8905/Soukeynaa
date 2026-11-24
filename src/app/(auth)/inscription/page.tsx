"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function PageInscription() {
  const router = useRouter();
  const [form, setForm] = useState({
    nom: "",
    email: "",
    telephone: "",
    motDePasse: "",
  });
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");
    setChargement(true);
    const res = await fetch("/api/auth/inscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
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
          Créer votre compte
        </h1>
        <p className="mt-1 text-center text-sm text-gris-fonce">
          Suivi de commandes et coordonnées pré-remplies
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="group relative">
            <input
              required
              autoComplete="name"
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              placeholder="Nom complet"
              className={champ}
            />
          </div>
          <div className="group relative">
            <input
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Email"
              className={champ}
            />
          </div>
          <div className="group relative">
            <input
              type="tel"
              autoComplete="tel"
              value={form.telephone}
              onChange={(e) => setForm({ ...form, telephone: e.target.value })}
              placeholder="Téléphone (optionnel)"
              className={champ}
            />
          </div>
          <div className="group relative">
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={form.motDePasse}
              onChange={(e) => setForm({ ...form, motDePasse: e.target.value })}
              placeholder="Mot de passe (8 caractères min)"
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
            {chargement ? "Création…" : "Créer mon compte"}
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
