import Link from "next/link";
import { cookies } from "next/headers";
import { EtatVide } from "@/components/motion/EtatVide";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/db";
import { fcfa, dateFr } from "@/lib/format";
import { cloud } from "@/lib/image";
import { ORDER_STATUS_LABELS, ORDER_BADGE_VARIANT } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { RechercheCommande } from "@/components/boutique/RechercheCommande";
import { BoutonAnnuler } from "@/components/boutique/BoutonAnnuler";
import { RafraichirAuto } from "@/components/boutique/BoutonPayer";
import { verifierIdsCommandes, COOKIE_COMMANDES } from "@/lib/ownership";
import type { Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Mes commandes" };

const SELECT = {
  id: true,
  reference: true,
  total: true,
  statut: true,
  modePaiement: true,
  delaiLivraison: true,
  reservationExpireLe: true,
  createdAt: true,
  // Tentatives actives : « a_verifier » bloque l'annulation
  // (argent possiblement reçu — revue admin, CDC 10.12)
  paiements: {
    where: { statut: { in: ["en_attente", "a_verifier"] } },
    select: { statut: true },
  },
  lignes: {
    take: 3,
    select: {
      nom: true,
      quantite: true,
      produit: { select: { images: true } },
    },
  },
  _count: { select: { lignes: true } },
} satisfies Prisma.OrderSelect;

type CommandeResume = Prisma.OrderGetPayload<{ select: typeof SELECT }>;

const ETAPES_EN_LIGNE = [
  "en_attente_paiement",
  "payee",
  "en_preparation",
  "expediee",
  "livree",
];
const ETAPES_LIVRAISON = ["en_preparation", "expediee", "livree"];

function CarteCommande({
  c,
  maintenant,
}: {
  c: CommandeResume;
  maintenant: number;
}) {
  const aLaLivraison = c.modePaiement === "livraison";
  const annulee = c.statut === "annulee";
  const livree = c.statut === "livree";
  const attentePaiement = c.statut === "en_attente_paiement";
  const aVerifier = c.paiements.some((p) => p.statut === "a_verifier");
  const tentativeEnCours = c.paiements.some((p) => p.statut === "en_attente");
  // Annulable par le client : commande impayée en ligne, sans paiement
  // en revue admin (CDC 10.12).
  const annulable = attentePaiement && !aVerifier;
  const reservationActive =
    attentePaiement && c.reservationExpireLe.getTime() > maintenant;
  const heureLimite = c.reservationExpireLe.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const etapes = aLaLivraison ? ETAPES_LIVRAISON : ETAPES_EN_LIGNE;
  const progression =
    annulee || livree ? 0 : (etapes.indexOf(c.statut) + 1) / etapes.length;

  // Info actionnable affichée sous les articles
  const info = annulee
    ? null
    : aVerifier
      ? "Paiement en cours de vérification…"
      : tentativeEnCours
        ? "Paiement en cours…"
        : reservationActive
          ? `À régler avant ${heureLimite}`
          : attentePaiement
            ? "En attente de paiement"
            : aLaLivraison && !livree
              ? "À régler à la livraison"
              : null;

  return (
    <li
      data-reveal
      className={`rounded-3xl bg-white shadow-sm ${
        attentePaiement ? "ring-2 ring-vert/40" : "ring-1 ring-black/5"
      } ${annulee ? "opacity-70" : ""}`}
    >
      <Link
        href={`/commande/${c.reference}`}
        transitionTypes={["nav-forward"]}
        className="lift press group flex items-center gap-4 p-4"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-bold text-noir">
              {c.reference}
            </span>
            <Badge variant={ORDER_BADGE_VARIANT[c.statut]}>
              {ORDER_STATUS_LABELS[c.statut]}
            </Badge>
          </div>
          {/* Articles de la commande : vignettes + noms */}
          <div className="mt-2.5 flex items-center gap-2">
            <div className="flex -space-x-2">
              {c.lignes.map((l, i) => {
                const img = (
                  l.produit?.images as { url?: string }[] | null
                )?.[0]?.url;
                return (
                  <span
                    key={i}
                    className="h-9 w-9 overflow-hidden rounded-full bg-gris ring-2 ring-white"
                  >
                    {img ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={cloud(img, 120) ?? img}
                        alt={l.nom}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-gris-fonce">
                        {l.nom.slice(0, 1)}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
            <p className="min-w-0 flex-1 truncate text-xs text-gris-fonce">
              {c.lignes.map((l) => `${l.quantite}× ${l.nom}`).join(" · ")}
              {c._count.lignes > c.lignes.length &&
                ` +${c._count.lignes - c.lignes.length}`}
            </p>
          </div>
          {info && (
            <p className="mt-2 text-[11px] font-semibold text-amber-700">
              {info}
            </p>
          )}
          {!annulee && !livree && (
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progression * 100)}
              className="mt-2 h-1 overflow-hidden rounded-full bg-gris/50"
            >
              <div
                className="h-full rounded-full bg-vert transition-all"
                style={{ width: `${progression * 100}%` }}
              />
            </div>
          )}
          <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-gris-fonce">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="shrink-0">{dateFr(c.createdAt)}</span>
              {c.delaiLivraison && !annulee && !livree && (
                <span className="truncate rounded-full bg-vert-clair px-2 py-0.5 text-[10px] font-semibold text-vert">
                  {c.delaiLivraison}
                </span>
              )}
            </span>
            <span className="shrink-0 text-sm font-bold text-vert">
              {fcfa(c.total)}
            </span>
          </div>
        </div>
        <span className="shrink-0 text-gris-fonce transition-transform group-hover:translate-x-1 group-hover:text-vert">
          →
        </span>
      </Link>
      {annulable && (
        <div className="border-t border-black/5 px-4 py-1">
          <BoutonAnnuler commandeId={c.id} cible="commande" />
        </div>
      )}
    </li>
  );
}

export default async function CommandesPage() {
  const [session, store] = await Promise.all([auth(), cookies()]);
  const userId = session?.user?.id ? Number(session.user.id) : null;
  // Commandes invité passées depuis ce navigateur (cookie signé, CDC 14.5) :
  // la commande apparaît ici juste après le checkout, sans compte requis.
  const idsInvites = verifierIdsCommandes(store.get(COOKIE_COMMANDES)?.value);

  const commandes =
    userId !== null || idsInvites.length > 0
      ? await getPrisma().order.findMany({
          where: userId
            ? { OR: [{ clientUserId: userId }, { id: { in: idsInvites } }] }
            : { id: { in: idsInvites } },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: SELECT,
        })
      : [];

  // En cours d'abord, historique (livrées/annulées) en bas de page
  const maintenant = new Date().getTime();
  const actives = commandes.filter(
    (c) => c.statut !== "livree" && c.statut !== "annulee"
  );
  const terminees = commandes.filter(
    (c) => c.statut === "livree" || c.statut === "annulee"
  );

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      {/* Statuts à jour sans rechargement manuel (commandes en cours) */}
      <RafraichirAuto actif={actives.length > 0} ms={20000} />
      <div data-reveal="left">
        <h1 className="font-display text-2xl font-bold tracking-tight text-noir">Vos commandes</h1>
        <p className="mt-1 text-sm text-gris-fonce">
          Suivi en temps réel, de la commande à la livraison
        </p>
      </div>

      {/* Recherche par référence — commande invité (CDC 8.2) */}
      <div data-reveal className="mt-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <p className="mb-2.5 text-xs font-semibold text-gris-fonce">
          Retrouver une commande par sa référence
        </p>
        <RechercheCommande />
      </div>

      {commandes.length > 0 ? (
        <>
          {!session?.user && (
            <p
              data-reveal
              className="mt-4 rounded-2xl bg-vert-clair px-4 py-3 text-xs font-medium text-vert-fonce"
            >
              Commandes passées sur cet appareil —{" "}
              <Link
                href="/connexion?callbackUrl=/commandes"
                className="font-bold underline"
              >
                connectez-vous
              </Link>{" "}
              pour les retrouver sur tous vos appareils.
            </p>
          )}
          <ul className="mt-5 space-y-3">
            {actives.map((c) => (
              <CarteCommande key={c.id} c={c} maintenant={maintenant} />
            ))}
          </ul>
          {terminees.length > 0 && (
            <>
              <h2
                data-reveal
                className="mt-8 text-[11px] font-bold uppercase tracking-wider text-gris-fonce"
              >
                Historique
              </h2>
              <ul className="mt-3 space-y-3">
                {terminees.map((c) => (
                  <CarteCommande key={c.id} c={c} maintenant={maintenant} />
                ))}
              </ul>
            </>
          )}
        </>
      ) : session?.user ? (
        <EtatVide
          dessin="colis"
          titre="Aucune commande pour le moment"
          texte="Vos futures commandes apparaîtront ici, avec leur suivi."
          action={{ href: "/", label: "Découvrir la boutique" }}
        />
      ) : (
        <EtatVide
          dessin="colis"
          titre="Tout votre historique, au même endroit"
          texte="Connectez-vous pour retrouver toutes vos commandes et leur suivi."
          action={{ href: "/connexion?callbackUrl=/commandes", label: "Se connecter" }}
        />
      )}
    </main>
  );
}
