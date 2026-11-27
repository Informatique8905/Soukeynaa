"use client";

import { useState, useTransition } from "react";
import { Check, ChevronDown, MapPin } from "lucide-react";
import { creerCommande } from "@/app/(boutique)/commander/actions";
import { fcfa } from "@/lib/format";
import { Compteur } from "@/components/motion/Compteur";

interface Commune {
  id: number;
  nom: string;
  quartiersInclus: string;
  tarif: number;
}

type Mode = "en_ligne" | "livraison";

const MOYENS_EN_LIGNE: readonly {
  v: "wave" | "orange" | "mtn" | "moov" | "djamo";
  label: string;
  logo: string | null;
  couleur: string;
}[] = [
  { v: "wave", label: "Wave", logo: "/paiements/wave.png", couleur: "#1dc4f2" },
  { v: "orange", label: "Orange Money", logo: "/paiements/orange.png", couleur: "#ff7900" },
  { v: "mtn", label: "MTN MoMo", logo: "/paiements/mtn.png", couleur: "#ffcb05" },
  { v: "moov", label: "Moov Money", logo: "/paiements/moov.png", couleur: "#005eb8" },
  { v: "djamo", label: "Djamo", logo: "/paiements/djamo.png", couleur: "#6e3aff" },
];
type Moyen = (typeof MOYENS_EN_LIGNE)[number]["v"];

const champ =
  "peer w-full rounded-2xl border border-black/10 bg-blanc-casse px-4 pb-2.5 pt-6 text-sm text-noir outline-none transition placeholder:text-transparent focus:border-vert focus:bg-white focus:ring-4 focus:ring-vert/10";
const etiquette =
  "pointer-events-none absolute left-4 top-2 text-[11px] font-semibold text-gris-fonce transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-focus:top-2 peer-focus:text-[11px] peer-focus:font-semibold peer-focus:text-vert";

type EtatChamp = "neutre" | "ok" | "ko";

// La bordure du champ reflète la validation au blur ; `secouer` rejoue la
// secousse à chaque passage en erreur.
function champEtat(base: string, etat: EtatChamp): string {
  const bordure =
    etat === "ok"
      ? "border-vert"
      : etat === "ko"
        ? "border-red-500 bg-red-50/50"
        : "border-black/10";
  return base.replace("border-black/10", bordure) + (etat === "ko" ? " secouer" : "");
}

function Champ({
  label,
  etat = "neutre",
  erreurMsg,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  etat?: EtatChamp;
  erreurMsg?: string;
}) {
  return (
    <div>
      <label className="relative block">
        <input {...props} placeholder={label} className={champEtat(champ, etat)} />
        <span className={etiquette}>{label}</span>
        {etat === "ok" && (
          <Check
            aria-hidden
            className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-vert"
          />
        )}
      </label>
      {etat === "ko" && erreurMsg && (
        <p role="alert" className="page-in mt-1 pl-1 text-xs font-medium text-red-600">
          {erreurMsg}
        </p>
      )}
    </div>
  );
}

function TitreEtape({
  n,
  titre,
  fait,
}: {
  n: number;
  titre: string;
  fait: boolean;
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span
        className={`grid size-9 place-items-center rounded-full text-sm font-bold transition-all duration-300 ${
          fait ? "scale-105 bg-vert text-white" : "bg-vert-clair text-vert"
        }`}
      >
        {fait ? "✓" : n}
      </span>
      <h2 className="text-base font-extrabold text-noir">{titre}</h2>
    </div>
  );
}

export function CheckoutForm({
  communes,
  sousTotal,
  defauts,
}: {
  communes: Commune[];
  sousTotal: number;
  defauts: {
    nom: string;
    email: string;
    telephone: string;
    adresse: string;
    communeId: number | null;
    /** Adresses enregistrées du compte — sélecteur rapide quand il y en a plusieurs. */
    adresses?: { communeId: number; detail: string }[];
  };
}) {
  const [communeId, setCommuneId] = useState<number | null>(
    defauts.communeId
  );
  const [listeOuverte, setListeOuverte] = useState(false);
  const [mode, setMode] = useState<Mode>("en_ligne");
  const [moyen, setMoyen] = useState<Moyen>("wave");
  const [infos, setInfos] = useState({
    nom: defauts.nom,
    email: defauts.email,
    telephone: defauts.telephone,
    adresse: defauts.adresse,
  });
  const [erreur, setErreur] = useState("");
  // Marque comme « touchés » les champs pré-remplis ET valides : le client
  // voit les coches vertes dès l'arrivée, sans faux rouge sur un champ vide.
  const [touche, setTouche] = useState<Record<string, boolean>>({
    nom: defauts.nom.trim().length >= 2,
    telephone: defauts.telephone.replace(/\D/g, "").length >= 8,
    email: /^\S+@\S+\.\S+$/.test(defauts.email),
    adresse: defauts.adresse.trim().length >= 5,
  });
  const [pending, start] = useTransition();

  const floute = (k: string) => () => setTouche((t) => ({ ...t, [k]: true }));
  const valide = {
    nom: infos.nom.trim().length >= 2,
    telephone: infos.telephone.replace(/\D/g, "").length >= 8,
    email: /^\S+@\S+\.\S+$/.test(infos.email),
    adresse: infos.adresse.trim().length >= 5,
  };
  const etatDe = (k: keyof typeof valide): EtatChamp =>
    touche[k] ? (valide[k] ? "ok" : "ko") : "neutre";

  const commune = communes.find((c) => c.id === communeId);
  const total = sousTotal + (commune?.tarif ?? 0);

  const coordonneesOk =
    infos.nom.trim().length >= 2 &&
    infos.telephone.replace(/\D/g, "").length >= 8 &&
    /^\S+@\S+\.\S+$/.test(infos.email);
  const livraisonOk = !!commune && infos.adresse.trim().length >= 5;
  const progression =
    (Number(coordonneesOk) + Number(livraisonOk) + Number(coordonneesOk && livraisonOk)) / 3;

  const maj =
    (k: keyof typeof infos) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setInfos((s) => ({ ...s, [k]: e.target.value }));
      // Le message d'erreur disparaît dès qu'on reprend la saisie
      setErreur("");
    };

  function soumettre(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur("");
    // L'autocomplétion Android remplit les champs sans déclencher onChange :
    // on lit les valeurs réelles du DOM (FormData), l'état React en secours.
    const fd = new FormData(e.currentTarget);
    const v = (k: string) => String(fd.get(k) ?? "");
    const nom = v("nom").trim() || infos.nom.trim();
    const telephone = v("telephone").trim() || infos.telephone;
    const email = v("email").trim() || infos.email;
    const adresse = v("adresse") || infos.adresse;
    const coords =
      nom.length >= 2 &&
      telephone.replace(/\D/g, "").length >= 8 &&
      /^\S+@\S+\.\S+$/.test(email);
    const livr = !!commune && adresse.trim().length >= 5;
    if (!coords) {
      setInfos((i) => ({ ...i, nom, telephone, email, adresse }));
      setTouche({ nom: true, telephone: true, email: true });
      setErreur(
        "Complétez vos coordonnées : nom, téléphone (8 chiffres min.) et email valide.",
      );
      document
        .getElementById("etape-coordonnees")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!livr) {
      setInfos((i) => ({ ...i, nom, telephone, email, adresse }));
      setTouche((t) => ({ ...t, adresse: true }));
      setErreur(
        commune
          ? "Indiquez un repère précis pour le livreur (5 caractères min.)."
          : "Choisissez votre commune de livraison.",
      );
      document
        .getElementById("etape-livraison")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setInfos((i) => ({ ...i, nom, telephone, email, adresse }));
    start(async () => {
      try {
        const res = await creerCommande({
          client: { nom, telephone, email },
          livraison: { communeId: Number(communeId), adresse },
          modePaiement: mode,
          moyenPaiement: mode === "en_ligne" ? moyen : undefined,
        });
        if ("erreur" in res) {
          setErreur(res.erreur);
        } else if (res.url) {
          // Paiement direct : la page du moyen choisi (Jèko) s'ouvre aussitôt.
          window.location.href = res.url;
        }
        // ok sans url => redirect() côté serveur
      } catch {
        // Sans ce catch, une exception de l'action laisserait le bouton
        // bloqué en « Redirection… » (pending jamais relâché).
        setErreur("Une erreur est survenue — vérifiez votre connexion puis réessayez.");
      }
    });
  }

  return (
    <form onSubmit={soumettre} className="flex flex-col gap-5">
      {/* Progression vivante */}
      <div className="sticky top-[68px] z-10 -mx-1 rounded-2xl bg-white/90 px-1 py-2 backdrop-blur md:static md:bg-transparent">
        <div className="flex items-center justify-between text-[11px] font-semibold text-gris-fonce">
          <span>
            {progression < 1 ? "Encore quelques infos…" : "Tout est prêt !"}
          </span>
          <span className="tabular-nums text-vert">{Math.round(progression * 100)}%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-vert-clair">
          <div
            className="h-full rounded-full bg-vert transition-[width] duration-500 ease-out"
            style={{ width: `${Math.max(6, progression * 100)}%` }}
          />
        </div>
      </div>

      {/* 1 — Coordonnées */}
      <section id="etape-coordonnees" data-reveal className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <TitreEtape n={1} titre="Vos coordonnées" fait={coordonneesOk} />
        <div className="grid gap-3">
          <Champ label="Nom complet" name="nom" required autoComplete="name" value={infos.nom} onChange={maj("nom")} onBlur={floute("nom")} etat={etatDe("nom")} erreurMsg="Indiquez votre nom complet." />
          <div className="grid gap-3 md:grid-cols-2">
            <Champ label="Téléphone (07 XX XX XX XX)" name="telephone" type="tel" required autoComplete="tel" inputMode="tel" value={infos.telephone} onChange={maj("telephone")} onBlur={floute("telephone")} etat={etatDe("telephone")} erreurMsg="Numéro trop court (8 chiffres min.)." />
            <Champ label="Email" name="email" type="email" required autoComplete="email" value={infos.email} onChange={maj("email")} onBlur={floute("email")} etat={etatDe("email")} erreurMsg="Adresse email invalide." />
          </div>
          <p className="text-xs text-gris-fonce">
            Le bon de commande vous est envoyé par email.
          </p>
        </div>
      </section>

      {/* 2 — Livraison : liste ouverte => section au premier plan (les
          animations data-reveal gardent un transform actif, ce qui
          créait un contexte de pile plaçant la liste derrière la
          section paiement) */}
      <section
        id="etape-livraison"
        data-reveal
        className={`rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 ${listeOuverte ? "relative z-30" : ""}`}
      >
        <TitreEtape n={2} titre="Où livrer ?" fait={livraisonOk} />
        {(defauts.adresses?.length ?? 0) > 1 && (
          <div className="mb-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gris-fonce">
              <MapPin className="size-3.5 text-vert" aria-hidden />
              Mes adresses enregistrées
            </p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Adresses enregistrées">
              {defauts.adresses!.map((a, i) => {
                const nomCommune =
                  communes.find((c) => c.id === a.communeId)?.nom ??
                  `Commune ${a.communeId}`;
                const actif =
                  a.communeId === communeId && a.detail === infos.adresse;
                return (
                  <button
                    key={i}
                    type="button"
                    aria-pressed={actif}
                    onClick={() => {
                      setCommuneId(a.communeId);
                      setInfos((x) => ({ ...x, adresse: a.detail }));
                      setTouche((t) => ({ ...t, adresse: true }));
                    }}
                    className={`press max-w-full truncate rounded-full border px-3.5 py-2 text-xs font-semibold transition ${
                      actif
                        ? "border-vert bg-vert-clair text-vert"
                        : "border-black/10 bg-blanc-casse text-noir hover:border-vert/40"
                    }`}
                  >
                    {nomCommune} · {a.detail}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div className="relative">
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={listeOuverte}
            onClick={() => setListeOuverte((o) => !o)}
            className="flex w-full items-center rounded-2xl border border-black/10 bg-blanc-casse px-4 pb-2.5 pt-6 text-left text-sm text-noir outline-none transition focus:border-vert focus:bg-white focus:ring-4 focus:ring-vert/10"
          >
            {commune ? (
              <>
                <span className="truncate font-semibold">{commune.nom}</span>
                <span className="ml-auto shrink-0 pl-3 tabular-nums font-bold text-vert">
                  {fcfa(commune.tarif)}
                </span>
              </>
            ) : (
              <span className="text-gris-fonce">Choisir votre commune…</span>
            )}
          </button>
          <span className={etiquette}>Commune de livraison</span>
          <ChevronDown
            aria-hidden
            className={`pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-gris-fonce transition-transform ${listeOuverte ? "rotate-180" : ""}`}
          />
          {listeOuverte && (
            <>
              <button
                type="button"
                aria-label="Fermer la liste"
                onClick={() => setListeOuverte(false)}
                className="fixed inset-0 z-10 cursor-default"
              />
              <ul
                role="listbox"
                aria-label="Commune de livraison"
                className="absolute inset-x-0 top-full z-20 mt-1.5 max-h-60 overflow-y-auto overscroll-contain rounded-2xl bg-white py-1.5 shadow-xl ring-1 ring-black/10"
              >
                {communes.map((c) => {
                  const actif = c.id === communeId;
                  return (
                    <li key={c.id} role="option" aria-selected={actif}>
                      <button
                        type="button"
                        onClick={() => {
                          setCommuneId(c.id);
                          setListeOuverte(false);
                        }}
                        className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition ${
                          actif
                            ? "bg-vert-clair/60 font-bold text-vert"
                            : "font-semibold text-noir hover:bg-vert-clair/40"
                        }`}
                      >
                        <span className="truncate">{c.nom}</span>
                        <span className="shrink-0 tabular-nums">
                          {fcfa(c.tarif)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
        {commune?.quartiersInclus && commune.quartiersInclus !== commune.nom && (
          <p className="page-in mt-2 text-xs text-gris-fonce">
            Quartiers couverts : {commune.quartiersInclus}
          </p>
        )}
        <div>
          <label className="relative mt-3 block">
            <textarea
              name="adresse"
              required
              autoComplete="street-address"
              rows={2}
              value={infos.adresse}
              onChange={maj("adresse")}
              onBlur={floute("adresse")}
              placeholder="Adresse / point de repère"
              className={champEtat(champ, etatDe("adresse")) + " resize-none"}
            />
            <span className={etiquette}>Adresse / point de repère pour le livreur</span>
            {etatDe("adresse") === "ok" && (
              <Check
                aria-hidden
                className="pointer-events-none absolute right-4 top-5 size-4 text-vert"
              />
            )}
          </label>
          {etatDe("adresse") === "ko" && (
            <p role="alert" className="page-in mt-1 pl-1 text-xs font-medium text-red-600">
              Indiquez un repère précis pour le livreur.
            </p>
          )}
        </div>
      </section>

      {/* 3 — Paiement */}
      <section data-reveal className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <TitreEtape n={3} titre="Comment payer ?" fait={coordonneesOk && livraisonOk} />
        <div role="radiogroup" aria-label="Mode de paiement" className="grid gap-3 sm:grid-cols-2">
          {(
            [
              {
                v: "en_ligne" as const,
                titre: "Payer maintenant",
                sous: "Mobile money ou carte bancaire, paiement sécurisé",
              },
              {
                v: "livraison" as const,
                titre: "Payer à la livraison",
                sous: "Espèces ou mobile money remis au livreur",
              },
            ]
          ).map((o) => {
            const actif = mode === o.v;
            return (
              <button
                key={o.v}
                type="button"
                role="radio"
                aria-checked={actif}
                onClick={() => setMode(o.v)}
                className={`press relative flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all duration-300 ${
                  actif
                    ? "border-vert bg-vert-clair/60 shadow-md shadow-vert/10"
                    : "border-black/8 bg-blanc-casse hover:border-vert/40"
                }`}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-extrabold text-noir">{o.titre}</span>
                  <span className="mt-0.5 block text-xs text-gris-fonce">{o.sous}</span>
                </span>
                <span
                  className={`absolute right-3 top-3 grid size-5 place-items-center rounded-full border-2 transition-all ${
                    actif ? "border-vert bg-vert" : "border-black/20"
                  }`}
                >
                  {actif && <span className="pop size-2 rounded-full bg-white" />}
                </span>
              </button>
            );
          })}
        </div>

        {/* Détail contextuel du mode choisi */}
        <div key={mode} className="page-in mt-3 rounded-2xl bg-blanc-casse p-3.5 text-xs text-gris-fonce">
          {mode === "en_ligne" ? (
            <>
              <p className="font-semibold text-noir">Choisissez votre moyen</p>
              <div
                role="radiogroup"
                aria-label="Moyen de paiement mobile"
                className="mt-2 flex flex-wrap justify-center gap-1.5"
              >
                {MOYENS_EN_LIGNE.map((m) => {
                  const actif = moyen === m.v;
                  return (
                    <button
                      key={m.v}
                      type="button"
                      role="radio"
                      aria-checked={actif}
                      onClick={() => setMoyen(m.v)}
                      className={`press flex items-center gap-1.5 rounded-full py-1.5 pl-1.5 pr-3 font-semibold transition ${
                        actif
                          ? "bg-vert text-white shadow-md shadow-vert/25"
                          : "bg-white text-noir ring-1 ring-black/5 hover:ring-vert/50"
                      }`}
                    >
                      {m.logo ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={m.logo}
                          alt=""
                          className="size-6 rounded-md object-cover"
                        />
                      ) : (
                        <span
                          aria-hidden
                          className="grid size-6 place-items-center rounded-md text-[11px] font-extrabold text-white"
                          style={{ backgroundColor: m.couleur }}
                        >
                          {m.label[0]}
                        </span>
                      )}
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <p>
              <span>
                Votre commande part directement en préparation. Préparez{" "}
                <strong className="text-noir">{fcfa(total)}</strong> à remettre
                au livreur à la réception{commune ? ` (${commune.nom})` : ""}.
              </span>
            </p>
          )}
        </div>
      </section>

      {/* Total + validation */}
      <div className="rounded-3xl bg-noir p-5 text-white shadow-xl shadow-noir/20">
        <div className="space-y-1.5 text-sm text-white/70">
          <div className="flex justify-between">
            <span>Articles</span>
            <span className="tabular-nums">{fcfa(sousTotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Livraison{commune ? ` (${commune.nom})` : ""}</span>
            <span className="tabular-nums">{commune ? fcfa(commune.tarif) : "Choisir une commune"}</span>
          </div>
        </div>
        <div className="mt-3 flex items-end justify-between border-t border-white/10 pt-3">
          <span className="text-sm font-semibold">
            {mode === "livraison" ? "À payer au livreur" : "Total à payer"}
          </span>
          <Compteur valeur={total} className="text-2xl font-extrabold tabular-nums" />
        </div>

        {erreur && (
          <p role="alert" className="page-in mt-3 rounded-xl bg-red-500/15 p-3 text-sm text-red-200">
            {erreur}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          aria-disabled={!coordonneesOk || !livraisonOk}
          className={`press shine mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-vert py-4 text-sm font-bold text-white transition hover:bg-[#24915d] disabled:opacity-60 ${
            coordonneesOk && livraisonOk ? "" : "opacity-50"
          }`}
        >
          {pending ? (
            <>
              <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Redirection sécurisée…
            </>
          ) : mode === "livraison" ? (
            <>
              Confirmer et payer à la livraison
            </>
          ) : (
            <>
              Payer {fcfa(total)} maintenant
            </>
          )}
        </button>
        {!livraisonOk && (
          <p className="mt-2 text-center text-[11px] text-white/50">
            Choisissez votre commune et indiquez un repère pour continuer.
          </p>
        )}
      </div>
    </form>
  );
}
