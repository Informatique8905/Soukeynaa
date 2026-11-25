"use client";

import { useActionState } from "react";
import {
  enregistrerProfil,
  ajouterAdresse,
  supprimerAdresse,
  changerMotDePasse,
  type ResultatForm,
  type AdresseEnregistree,
} from "@/app/(boutique)/compte/actions";

const champ =
  "w-full rounded-2xl border border-black/10 bg-blanc-casse px-4 py-3 text-sm text-noir outline-none transition focus:border-vert focus:bg-white focus:ring-4 focus:ring-vert/10";

function Message({ r }: { r: ResultatForm | null }) {
  if (!r) return null;
  return (
    <p
      className={`mt-2 text-xs font-semibold ${
        "erreur" in r ? "text-red-600" : "text-vert"
      }`}
      role="status"
    >
      {"erreur" in r ? r.erreur : "Enregistré ✓"}
    </p>
  );
}

export function CompteForms({
  nom,
  telephone,
  adresses,
  communes,
}: {
  nom: string;
  telephone: string;
  adresses: AdresseEnregistree[];
  communes: { id: number; nom: string }[];
}) {
  const [rProfil, aProfil, pProfil] = useActionState(
    async (_: ResultatForm | null, fd: FormData) => enregistrerProfil(fd),
    null
  );
  const [rAdr, aAdr, pAdr] = useActionState(
    async (_: ResultatForm | null, fd: FormData) => ajouterAdresse(fd),
    null
  );
  const [rMdp, aMdp, pMdp] = useActionState(
    async (_: ResultatForm | null, fd: FormData) => changerMotDePasse(fd),
    null
  );

  const communeNom = (id: number) =>
    communes.find((c) => c.id === id)?.nom ?? `Commune ${id}`;

  return (
    <div className="mt-8 grid gap-4 md:grid-cols-2">
      {/* Profil */}
      <section data-reveal className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h2 className="font-extrabold text-noir">Mes informations</h2>
        <form action={aProfil} className="mt-3 space-y-3">
          <input
            name="nom"
            required
            defaultValue={nom}
            placeholder="Nom complet"
            className={champ}
          />
          <input
            name="telephone"
            defaultValue={telephone}
            placeholder="Téléphone (ex. 0707000000)"
            className={champ}
          />
          <button
            disabled={pProfil}
            className="press rounded-full bg-vert px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {pProfil ? "Enregistrement…" : "Enregistrer"}
          </button>
          <Message r={rProfil} />
        </form>
      </section>

      {/* Mot de passe */}
      <section data-reveal className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h2 className="font-extrabold text-noir">Mot de passe</h2>
        <form action={aMdp} className="mt-3 space-y-3">
          <input
            name="actuel"
            type="password"
            required
            placeholder="Mot de passe actuel"
            className={champ}
            autoComplete="current-password"
          />
          <input
            name="nouveau"
            type="password"
            required
            minLength={8}
            placeholder="Nouveau (8 caractères min)"
            className={champ}
            autoComplete="new-password"
          />
          <button
            disabled={pMdp}
            className="press rounded-full bg-noir px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {pMdp ? "Modification…" : "Changer le mot de passe"}
          </button>
          <Message r={rMdp} />
        </form>
      </section>

      {/* Adresses */}
      <section data-reveal className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 md:col-span-2">
        <h2 className="font-extrabold text-noir">Mes adresses</h2>
        {adresses.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {adresses.map((a, i) => (
              <li
                key={i}
                className="flex items-center gap-3 rounded-2xl bg-blanc-casse px-4 py-3 text-sm"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-noir">
                    {communeNom(a.communeId)}
                  </span>
                  <span className="text-xs text-gris-fonce">{a.detail}</span>
                </span>
                <form
                  action={async () => {
                    await supprimerAdresse(i);
                  }}
                >
                  <button
                    className="press rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-red-600 ring-1 ring-red-200"
                    aria-label="Supprimer l'adresse"
                  >
                    Retirer
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-gris-fonce">
            Enregistrez une adresse pour commander plus vite.
          </p>
        )}
        <form action={aAdr} className="mt-4 grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
          <select name="communeId" required className={champ} defaultValue="">
            <option value="" disabled>
              Commune…
            </option>
            {communes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
          <input
            name="detail"
            required
            minLength={5}
            placeholder="Adresse / point de repère"
            className={champ}
          />
          <button
            disabled={pAdr}
            className="press rounded-full bg-vert px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            Ajouter
          </button>
        </form>
        <Message r={rAdr} />
      </section>
    </div>
  );
}
