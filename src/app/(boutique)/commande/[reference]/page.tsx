import { notFound } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { getPrisma } from "@/lib/db";
import { auth } from "@/auth";
import { verifierIdsCommandes, COOKIE_COMMANDES } from "@/lib/ownership";
import { reconcilierTentative } from "@/lib/paiement";
import { BoutonPayer, RafraichirAuto } from "@/components/boutique/BoutonPayer";
import { BonCommande } from "@/components/boutique/BonCommande";
import { TrajetLivraison } from "@/components/motion/TrajetLivraison";

const ETAPES_EN_LIGNE = ["en_attente_paiement", "payee", "en_preparation", "expediee", "livree"] as const;
const LABELS_EN_LIGNE = ["Commandée", "Payée", "Préparation", "En route", "Livrée"];
const ETAPES_LIVRAISON = ["en_preparation", "expediee", "livree"] as const;
const LABELS_LIVRAISON = ["Commandée", "Préparation", "En route", "Livrée & payée"];

export default async function CommandePage({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ moyen?: string }>;
}) {
  const [{ reference }, { moyen }] = await Promise.all([params, searchParams]);
  const prisma = getPrisma();
  let commande = await prisma.order.findUnique({
    where: { reference },
    include: {
      lignes: true,
      paiements: {
        where: { statut: { in: ["en_attente", "a_verifier"] } },
      },
    },
  });
  if (!commande) notFound();

  // Jèko n'envoie PAS de webhook pour les paiements échoués (CDC 10.11) :
  // sans vérification en temps réel, une tentative restée « en_attente »
  // bloquerait le bouton de paiement jusqu'au passage du cron.
  let resolue = false;
  for (const p of commande.paiements) {
    if (
      p.statut === "en_attente" &&
      (await reconcilierTentative(p, commande.statut)) !== "en_attente"
    ) {
      resolue = true;
    }
  }
  if (resolue) {
    commande = await prisma.order.findUniqueOrThrow({
      where: { id: commande.id },
      include: {
        lignes: true,
        paiements: {
          where: { statut: { in: ["en_attente", "a_verifier"] } },
        },
      },
    });
  }

  // Coordonnées visibles uniquement pour le vrai propriétaire (session,
  // cookie SIGNÉ posé à la commande) ou l'admin — la référence est
  // séquentielle et sinon énumérable (CDC 14.5).
  const [session, store] = await Promise.all([auth(), cookies()]);
  const idsCommandes = verifierIdsCommandes(store.get(COOKIE_COMMANDES)?.value);
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
  const tentativeEnCours = commande.paiements.some(
    (p) => p.statut === "en_attente"
  );
  const tentativeAVerifier = commande.paiements.some(
    (p) => p.statut === "a_verifier"
  );
  const tentativeActive = tentativeEnCours || tentativeAVerifier;
  const enVerification = enAttente && tentativeActive;
  // Tentative encore ouverte chez Jèko (~30 min) : le client peut la
  // reprendre — même session, aucun doublon possible (CDC 10.10).
  const reprendre =
    proprietaire && enAttente && tentativeEnCours && !tentativeAVerifier;
  // Retentative autorisée après échec/abandon/expiration d'une tentative
  // (CDC 10.10) — jamais pour une commande payée ou en vérification.
  const payable =
    proprietaire &&
    enAttente &&
    !tentativeActive &&
    ["en_attente", "echoue", "annule"].includes(commande.statutPaiement);
  const tentativePrecedente =
    commande.statutPaiement === "echoue" ||
    commande.statutPaiement === "annule";

  const expire = commande.reservationExpireLe.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  // Bon de commande : visible dès que la commande est validée ou qu'un délai
  // a été annoncé — réservé au propriétaire (données complètes, CDC 14.5)
  const bonVisible =
    proprietaire &&
    !annulee &&
    (commande.delaiLivraison !== null || etapeCourante >= 1);


  return (
    <main className="mx-auto max-w-5xl px-4 py-6 md:py-10">
      <RafraichirAuto actif={enVerification} />
      <div className="flex items-center justify-between print:hidden">
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

      <div className="mt-5 flex max-w-2xl flex-col gap-4">
          {/* Suivi */}
          {!annulee && (
            <section data-reveal className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 print:hidden">
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
          <section data-reveal className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5 print:hidden">
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

          {bonVisible && <BonCommande c={commande} />}

          {payable && (
            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 print:hidden">
              {tentativePrecedente && (
                <p className="mb-3 rounded-xl bg-red-50 p-2.5 text-center text-sm font-semibold text-red-700">
                  {commande.statutPaiement === "echoue"
                    ? "Le paiement précédent a échoué — réessayez ou choisissez un autre moyen."
                    : "Le paiement précédent a été abandonné — vous pouvez le relancer."}
                </p>
              )}
              <BoutonPayer
                commandeId={commande.id}
                montant={commande.total}
                moyenInitial={moyen}
              />
              <p className="mt-2 text-center text-xs text-gris-fonce">
                Panier réservé jusqu&apos;à {expire}
              </p>
            </section>
          )}

          {reprendre && (
            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 print:hidden">
              <p className="mb-3 text-center text-sm font-semibold text-noir">
                Un paiement est déjà en cours pour cette commande.
              </p>
              <BoutonPayer
                commandeId={commande.id}
                montant={commande.total}
                reprendre
              />
              <p className="mt-2 text-center text-xs text-gris-fonce">
                Quitté sans payer ? Reprenez la session — la page se met à
                jour automatiquement.
              </p>
            </section>
          )}

          {proprietaire && enAttente && tentativeAVerifier && (
            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 print:hidden">
              <p className="text-center text-sm font-semibold text-noir">
                Paiement en cours de vérification — la page se met à jour
                automatiquement.
              </p>
            </section>
          )}

          <Link
            href="/"
            className="press flex items-center justify-center rounded-full py-2 text-sm font-semibold text-vert hover:bg-vert-clair print:hidden"
          >
            Continuer mes achats →
          </Link>
        </div>
    </main>
  );
}
