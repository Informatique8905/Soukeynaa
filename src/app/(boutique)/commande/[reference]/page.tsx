import { notFound } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { getPrisma } from "@/lib/db";
import { auth } from "@/auth";
import { fcfa } from "@/lib/format";
import { cloud } from "@/lib/image";
import { BoutonPayer, RafraichirAuto } from "@/components/boutique/BoutonPayer";
import { TrajetLivraison } from "@/components/motion/TrajetLivraison";

const ETAPES_EN_LIGNE = ["en_attente_paiement", "payee", "en_preparation", "expediee", "livree"] as const;
const LABELS_EN_LIGNE = ["Commandée", "Payée", "Préparation", "En route", "Livrée"];
const ETAPES_LIVRAISON = ["en_preparation", "expediee", "livree"] as const;
const LABELS_LIVRAISON = ["Commandée", "Préparation", "En route", "Livrée & payée"];

interface ImageJson {
  url?: string;
}

export default async function CommandePage({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ moyen?: string }>;
}) {
  const [{ reference }, { moyen }] = await Promise.all([params, searchParams]);
  const prisma = getPrisma();
  const commande = await prisma.order.findUnique({
    where: { reference },
    include: {
      lignes: { include: { produit: { select: { images: true } } } },
      paiements: { select: { statut: true } },
    },
  });
  if (!commande) notFound();

  // Coordonnées visibles uniquement pour le vrai propriétaire (session,
  // cookie posé à la commande) ou l'admin — la référence est séquentielle
  // et sinon énumérable (CDC 14.5).
  const [session, store] = await Promise.all([auth(), cookies()]);
  const idsCommandes: number[] = (() => {
    try {
      const v = JSON.parse(store.get("soukeyna_orders")?.value ?? "[]");
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  })();
  const proprietaire =
    idsCommandes.includes(commande.id) ||
    (session?.user?.id !== undefined &&
      commande.clientUserId === Number(session.user.id)) ||
    session?.user?.role === "admin";

  const nomAffiche = proprietaire
    ? commande.clientNom
    : `${commande.clientNom.split(/\s+/)[0]} •`;
  const adresseAffichee = proprietaire
    ? commande.adresseLivraison
    : "Adresse complète dans votre email de confirmation";
  const telAffiche = proprietaire
    ? commande.clientTelephone
    : `•• •• •• ${commande.clientTelephone.replace(/\D/g, "").slice(-2)}`;

  const aLaLivraison = commande.modePaiement === "livraison";
  const annulee = commande.statut === "annulee";
  const etapeCourante = annulee
    ? -1
    : aLaLivraison
      ? ETAPES_LIVRAISON.indexOf(commande.statut as never) + 1
      : ETAPES_EN_LIGNE.indexOf(commande.statut as never);
  const enAttente =
    !aLaLivraison &&
    commande.statut === "en_attente_paiement" &&
    commande.reservationExpireLe > new Date();
  // CDC 10.8 : tentative en cours → plus de bouton, on affiche l'état réel
  const tentativeActive = commande.paiements.some(
    (p) => p.statut === "en_attente" || p.statut === "a_verifier"
  );
  const enVerification = enAttente && tentativeActive;
  const payable =
    enAttente && !tentativeActive && commande.statutPaiement === "en_attente";

  const expire = commande.reservationExpireLe.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });


  return (
    <main className="mx-auto max-w-5xl px-4 py-6 md:py-10">
      <RafraichirAuto actif={enVerification} />
      <div className="flex items-center justify-between">
        <Link
          href="/commandes"
          className="press inline-flex items-center rounded-full bg-white px-4 py-2 text-xs font-semibold text-noir ring-1 ring-black/10 hover:bg-vert-clair"
        >
          ← Mes commandes
        </Link>
        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-gris-fonce ring-1 ring-black/5">
          Réf. {commande.reference}
        </span>
      </div>

      <div className="mt-5 md:grid md:grid-cols-5 md:gap-6">
        <div className="flex flex-col gap-4 md:col-span-3">
          {/* Suivi */}
          {!annulee && (
            <section data-reveal className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-noir">Suivi</h2>
                {commande.delaiLivraison && (
                  <span className="rounded-full bg-vert-clair px-2.5 py-1 text-[11px] font-semibold text-vert">
                    {commande.delaiLivraison}
                  </span>
                )}
              </div>
              <TrajetLivraison
                etapes={aLaLivraison ? LABELS_LIVRAISON : LABELS_EN_LIGNE}
                courant={etapeCourante}
              />
            </section>
          )}

          {/* Adresse */}
          <section data-reveal className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <p className="text-sm font-bold text-noir">
              Livraison à {commande.communeNom}
            </p>
            <p className="mt-2 text-sm text-gris-fonce">
              {nomAffiche}
              <br />
              {adresseAffichee}
            </p>
            <p className="mt-2 text-xs font-medium text-gris-fonce">
              Tél : {telAffiche}
            </p>
          </section>
        </div>

        {/* Récapitulatif + action */}
        <aside className="mt-4 md:col-span-2 md:mt-0">
          <div data-reveal className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 md:sticky md:top-24">
            <h2 className="font-extrabold text-noir">Récapitulatif</h2>
            <ul className="mt-3 space-y-3">
              {commande.lignes.map((l) => {
                const img = (l.produit.images as ImageJson[])?.[0]?.url;
                return (
                  <li key={l.id} className="flex items-center gap-3">
                    <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-gris">
                      <span className="absolute right-0 top-0 z-10 grid size-5 place-items-center rounded-bl-lg bg-noir text-[10px] font-bold text-white">
                        {l.quantite}
                      </span>
                      {img && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={cloud(img, 120) ?? img} alt={l.nom} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-noir">{l.nom}</span>
                      {l.varianteLabel && <span className="text-xs text-gris-fonce">{l.varianteLabel}</span>}
                    </span>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-noir">{fcfa(l.total)}</span>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 space-y-1.5 border-t border-black/5 pt-3 text-sm">
              <div className="flex justify-between text-gris-fonce">
                <span>Sous-total</span>
                <span className="tabular-nums">{fcfa(commande.sousTotal)}</span>
              </div>
              <div className="flex justify-between text-gris-fonce">
                <span>Livraison à {commande.communeNom}</span>
                <span className="tabular-nums">{fcfa(commande.fraisLivraison)}</span>
              </div>
              <div className="flex justify-between pt-1.5 text-base font-extrabold text-noir">
                <span>{aLaLivraison && commande.statutPaiement !== "confirme" ? "À payer au livreur" : "Total"}</span>
                <span className="tabular-nums text-vert">{fcfa(commande.total)}</span>
              </div>
            </div>

            {payable && (
              <div className="mt-5">
                <BoutonPayer
                  commandeId={commande.id}
                  montant={commande.total}
                  moyenInitial={moyen}
                />
                <p className="mt-2 text-center text-xs text-gris-fonce">
                  Panier réservé jusqu&apos;à {expire}
                </p>
              </div>
            )}
          </div>

          <Link
            href="/"
            className="press mt-4 flex items-center justify-center rounded-full py-2 text-sm font-semibold text-vert hover:bg-vert-clair"
          >
            Continuer mes achats →
          </Link>
        </aside>
      </div>
    </main>
  );
}
