import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { getPrisma } from "@/lib/db";
import { libererStock, restituerStockCommande } from "@/lib/stock";
import { envoyerBonAdmin, envoyerBonCommande, alerterAdmin } from "@/lib/email";
import type { Payment } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import type { StatutPaiement, MoyenPaiement } from "@/generated/prisma/enums";

type Db = Prisma.TransactionClient | ReturnType<typeof getPrisma>;

// Transitions autorisées (CDC 10.4) — hors de cette liste = rejet + journal.
// Les statuts soldés n'acceptent que « a_verifier » : un succès reçu après
// échec/annulation/expiration est une anomalie à revue admin (CDC 10.12).
const TRANSITIONS: Record<string, StatutPaiement[]> = {
  en_attente: ["confirme", "echoue", "annule", "expire", "a_verifier"],
  a_verifier: ["confirme", "echoue", "annule"],
  confirme: [], // terminal : jamais réécrit (anti-double-webhook)
  echoue: ["a_verifier"],
  annule: ["a_verifier"],
  expire: ["a_verifier"],
};

export function transitionAutorisee(
  avant: StatutPaiement,
  apres: StatutPaiement
): boolean {
  return TRANSITIONS[avant]?.includes(apres) ?? false;
}

export async function journaliser(
  db: Db,
  paymentId: number,
  type: string,
  message = "",
  payload?: unknown
) {
  await db.paymentEvent.create({
    data: {
      paymentId,
      type,
      message,
      payload: payload === undefined ? undefined : (payload as object),
    },
  });
}

// ===== Vérification de signature webhook (CDC 10.5) =====
// Doc Jèko : en-tête `Jeko-Signature` = HMAC-SHA256 du corps brut en hex,
// avec JEKO_WEBHOOK_SECRET (copié à la création du webhook sur le dashboard).
export function signatureValide(
  corpsBrut: string,
  signature: string | null
): boolean {
  const secret = process.env.JEKO_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const attendue = createHmac("sha256", secret).update(corpsBrut).digest("hex");
  try {
    return timingSafeEqual(
      Buffer.from(signature, "utf8"),
      Buffer.from(attendue, "utf8")
    );
  } catch {
    return false;
  }
}

// ===== Transition de paiement partagée (webhook + réconciliation) =====
// Mise à jour CONDITIONNELLE sur le statut courant : deux appels
// concurrents n'appliquent les effets qu'une fois (anti-double-traitement).
// Retourne true si la transition a été appliquée.
export async function appliquerTransition(
  tx: Prisma.TransactionClient,
  paiement: Payment,
  statutFinal: StatutPaiement,
  extra: { transactionJeko?: string; moyen?: MoyenPaiement } = {}
): Promise<boolean> {
  const r = await tx.payment.updateMany({
    where: { id: paiement.id, statut: paiement.statut },
    data: {
      statut: statutFinal,
      ...(extra.transactionJeko && !paiement.transactionJeko
        ? { transactionJeko: extra.transactionJeko }
        : {}),
      ...(extra.moyen && !paiement.moyen ? { moyen: extra.moyen } : {}),
    },
  });
  if (r.count === 0) {
    await journaliser(
      tx,
      paiement.id,
      "transition",
      `Ignoré : ${paiement.statut} → ${statutFinal} déjà appliquée ailleurs`
    );
    return false;
  }

  if (statutFinal === "confirme") {
    await tx.order.update({
      where: { id: paiement.commandeId },
      data: { statutPaiement: "confirme", statut: "payee" },
    });
  } else if (["echoue", "annule", "expire"].includes(statutFinal)) {
    // Échec/abandon d'une tentative : la réservation de stock est CONSERVÉE
    // — le client peut relancer un paiement jusqu'à reservationExpireLe
    // (CDC 10.10). Seule l'expiration libère ici ; l'annulation de commande
    // passe par restituerStockCommande, l'expiration de réservation par le
    // cron liberer-reservations.
    if (statutFinal === "expire") {
      await libererStock(tx, paiement.commandeId);
    }
    await tx.order.update({
      where: { id: paiement.commandeId },
      data: { statutPaiement: statutFinal },
    });
  }
  await journaliser(tx, paiement.id, "transition", `→ ${statutFinal}`);
  return true;
}

// ===== Initiation Jèko — POST /partner_api/payment_requests =====
// Auth : X-API-KEY (secret `jeko_…` = JEKO_API_SECRET) + X-API-KEY-ID
// (UUID = JEKO_API_KEY). Montant en centimes (FCFA × 100, multiple de 100).
// `redirect` → l'API renvoie `redirectUrl`, page hébergée où le client
// choisit lui-même Wave/OM/MTN/Moov/carte.
export interface ReponseInitiation {
  ok: boolean;
  url?: string;
  reference?: string; // id payment_request Jèko → transactionJeko
  erreur?: string;
}

export async function initierPaiementJeko(params: {
  paiement: Payment;
  email: string;
  telephone: string;
  moyen: string; // wave | orange | mtn | moov | djamo — requis par l'API
}): Promise<ReponseInitiation> {
  const base = process.env.JEKO_API_BASE_URL;
  const apiKey = process.env.JEKO_API_SECRET;
  const keyId = process.env.JEKO_API_KEY;
  const storeId = process.env.JEKO_STORE_ID;
  const site = process.env.AUTH_URL;
  if (!base || !apiKey || !keyId || !storeId || !site) {
    return { ok: false, erreur: "Paiement en ligne non configuré" };
  }
  const urlRetour = `${site}/commande/${params.paiement.referenceCommande}`;
  try {
    const res = await fetch(`${base}/partner_api/payment_requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
        "X-API-KEY-ID": keyId,
      },
      body: JSON.stringify({
        storeId,
        amountCents: params.paiement.montant * 100, // FCFA → centimes
        currency: "XOF",
        reference: params.paiement.cleIdempotence, // unique par tentative
        description: `Commande ${params.paiement.referenceCommande} — SOUKEYNA`,
        paymentDetails: {
          type: "redirect",
          data: {
            paymentMethod: params.moyen,
            successUrl: urlRetour,
            errorUrl: urlRetour,
          },
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        erreur:
          data?.message ?? data?.error?.message ?? `Erreur de paiement (${res.status})`,
      };
    }
    return {
      ok: true,
      url: data?.redirectUrl,
      reference: data?.id,
    };
  } catch {
    return { ok: false, erreur: "Service de paiement injoignable, réessayez" };
  }
}

// ===== Statut réel d'une demande (réconciliation, CDC 10.11) =====
// GET /partner_api/payment_requests/{id} → "pending" | "success" | "error".
// Indispensable : Jèko n'envoie PAS de webhook pour les paiements échoués.
export async function statutJekoReel(
  paymentRequestId: string
): Promise<"pending" | "success" | "error" | null> {
  const base = process.env.JEKO_API_BASE_URL;
  const apiKey = process.env.JEKO_API_SECRET;
  const keyId = process.env.JEKO_API_KEY;
  if (!base || !apiKey || !keyId) return null;
  try {
    const res = await fetch(
      `${base}/partner_api/payment_requests/${paymentRequestId}`,
      {
        headers: { "X-API-KEY": apiKey, "X-API-KEY-ID": keyId },
        signal: AbortSignal.timeout(10_000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({}));
    const statut = data?.status;
    return statut === "success" || statut === "error" || statut === "pending"
      ? statut
      : null;
  } catch {
    return null;
  }
}

// ===== Réconciliation ponctuelle d'une tentative (suivi + retentative) =====
// Jèko n'envoie PAS de webhook pour les paiements échoués (CDC 10.11) :
// une tentative restée « en_attente » doit être vérifiée auprès de l'API,
// sinon elle bloque tout nouveau paiement jusqu'au passage du cron.
// Retourne le statut après réconciliation — inchangé si encore « pending »,
// si l'API est injoignable ou si la tentative n'a pas d'id Jèko.
export async function reconcilierTentative(
  paiement: Payment,
  commandeStatut: string,
  forcer = false
): Promise<StatutPaiement> {
  if (paiement.statut !== "en_attente" || !paiement.transactionJeko) {
    return paiement.statut;
  }
  const prisma = getPrisma();
  // Throttle : la page de suivi se rafraîchit toutes les 5 s — on borne
  // l'interrogation de l'API Jèko à une fois par 30 s par tentative.
  // `forcer` le contourne pour une action explicite du client (annulation).
  const derniereVerif = await prisma.paymentEvent.findFirst({
    where: { paymentId: paiement.id, type: "reconciliation" },
    orderBy: { at: "desc" },
    select: { at: true },
  });
  if (
    !forcer &&
    derniereVerif &&
    derniereVerif.at > new Date(Date.now() - 30_000)
  ) {
    return paiement.statut;
  }
  const reel = await statutJekoReel(paiement.transactionJeko);
  if (reel !== "success" && reel !== "error") return paiement.statut;

  // Succès alors que la commande n'est plus payable → revue admin (CDC 10.12)
  const cible: StatutPaiement =
    reel === "error"
      ? "echoue"
      : commandeStatut !== "en_attente_paiement"
        ? "a_verifier"
        : "confirme";

  const appliquee = await prisma.$transaction(async (tx) => {
    await journaliser(
      tx,
      paiement.id,
      "reconciliation",
      `Statut réel : ${reel} → ${cible}`
    );
    return appliquerTransition(tx, paiement, cible);
  });

  if (!appliquee) {
    // Transition appliquée entre-temps (webhook, cron) : statut réel en base
    const actuel = await prisma.payment.findUnique({
      where: { id: paiement.id },
      select: { statut: true },
    });
    return actuel?.statut ?? paiement.statut;
  }
  if (cible === "confirme") {
    envoyerBonCommande(paiement.commandeId).catch(() => {});
    envoyerBonAdmin(paiement.commandeId).catch(() => {});
  } else if (cible === "a_verifier") {
    alerterAdmin(
      "alerte_admin_anomalie",
      `Paiement à vérifier ${paiement.referenceCommande}`,
      `<p>Paiement confirmé par l'agrégateur alors que la commande <strong>${paiement.referenceCommande}</strong> n'est plus payable. Revue admin requise (CDC 10.12).</p>`,
      paiement.commandeId
    ).catch(() => {});
  }
  return cible;
}

// Lien hébergé Jèko d'une tentative encore payable (~30 min après sa
// création) : repris de l'événement « lien_jeko » stocké à l'initiation,
// sinon reconstruit depuis l'id de la demande (pay.jeko.africa/pr/{id}).
async function urlSessionJeko(paiement: Payment): Promise<string | null> {
  if (!paiement.transactionJeko) return null;
  const evt = await getPrisma().paymentEvent.findFirst({
    where: { paymentId: paiement.id, type: "lien_jeko" },
    orderBy: { at: "desc" },
    select: { payload: true },
  });
  const url = (evt?.payload as { url?: string } | null)?.url;
  return (
    url ??
    `${process.env.JEKO_PAY_BASE_URL ?? "https://pay.jeko.africa"}/pr/${paiement.transactionJeko}`
  );
}

// ===== Tentative de paiement complète (checkout + retentative) =====
// Vérifs commande, verrou anti-double-paiement, création Payment avec clé
// d'idempotence unique (CDC 10.10), puis appel Jèko. Partagée par la route
// /api/paiement/initier (retentative depuis le suivi) et le checkout
// (paiement direct à la création de la commande).

// Moyens activés sur le compte Jèko (l'API exige paymentMethod)
const MOYENS_JEKO: Record<string, MoyenPaiement> = {
  wave: "wave",
  orange: "orange_money",
  mtn: "mtn_momo",
  moov: "moov_money",
  djamo: "carte",
};

export type ResultatTentative =
  | { ok: true; url: string }
  | { ok: false; erreur: string; code: number };

export async function initierTentative(params: {
  commandeId: number;
  moyenJeko: string;
}): Promise<ResultatTentative> {
  const moyen = MOYENS_JEKO[params.moyenJeko];
  if (!moyen) {
    return { ok: false, erreur: "Choisissez un moyen de paiement", code: 400 };
  }
  const prisma = getPrisma();
  const commande = await prisma.order.findUnique({
    where: { id: params.commandeId },
    include: { paiements: { orderBy: { createdAt: "desc" } } },
  });
  if (!commande) {
    return { ok: false, erreur: "Commande introuvable", code: 404 };
  }
  if (commande.statutPaiement === "confirme") {
    // Déjà payée — jamais de nouvelle session (anti-double-paiement)
    return { ok: false, erreur: "Commande déjà payée", code: 409 };
  }
  if (
    commande.statut !== "en_attente_paiement" ||
    commande.reservationExpireLe < new Date()
  ) {
    return { ok: false, erreur: "Cette commande n'est plus payable", code: 410 };
  }

  // Verrou commande : une seule tentative active (en_attente / a_verifier)
  let tentativeActive = commande.paiements.find(
    (p) => p.statut === "en_attente" || p.statut === "a_verifier"
  );
  // Jèko ne notifie pas les échecs : une tentative « en_attente » peut déjà
  // être soldée côté agrégateur — on vérifie avant de bloquer le client.
  if (tentativeActive?.statut === "en_attente") {
    const resolu = await reconcilierTentative(
      tentativeActive,
      commande.statut
    );
    if (resolu === "confirme") {
      return { ok: false, erreur: "Commande déjà payée", code: 409 };
    }
    if (resolu === "a_verifier") {
      // Paiement possible en revue admin : jamais de nouvelle tentative
      return {
        ok: false,
        erreur: "Un paiement est en cours de vérification",
        code: 409,
      };
    }
    if (resolu === "en_attente") {
      // Tentative toujours payable chez Jèko : on renvoie le client vers la
      // MÊME session plutôt qu'un nouveau paiement — pas de doublon possible.
      const url = await urlSessionJeko(tentativeActive);
      if (url) return { ok: true, url };
      return {
        ok: false,
        erreur: "Un paiement est déjà en cours pour cette commande",
        code: 409,
      };
    }
    // Retentative uniquement après échec/annulation/expiration (CDC 10.10)
    tentativeActive = undefined;
  }
  if (tentativeActive) {
    // a_verifier ou en_attente sans transactionJeko (initiation interrompue)
    return {
      ok: false,
      erreur: "Un paiement est déjà en cours pour cette commande",
      code: 409,
    };
  }

  // Index unique partiel payments(commandeId WHERE statut actif) : deux
  // initiations concurrentes ne passent pas toutes les deux (P2002 → 409).
  let paiement;
  try {
    paiement = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          commandeId: commande.id,
          referenceCommande: commande.reference,
          cleIdempotence: randomUUID(),
          montant: commande.total,
          moyen,
        },
      });
      // La commande repasse « en attente » de paiement : elle avait pu être
      // marquée echoue/annule par la tentative précédente (R5).
      await tx.order.update({
        where: { id: commande.id },
        data: { statutPaiement: "en_attente" },
      });
      return p;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return {
        ok: false,
        erreur: "Un paiement est déjà en cours pour cette commande",
        code: 409,
      };
    }
    throw e;
  }
  await journaliser(prisma, paiement.id, "initiation", "Tentative créée");

  const reponse = await initierPaiementJeko({
    paiement,
    email: commande.clientEmail,
    telephone: commande.clientTelephone,
    moyen: params.moyenJeko,
  });

  if (!reponse.ok) {
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: paiement.id },
        data: { statut: "echoue" },
      });
      await journaliser(tx, paiement.id, "anomalie", reponse.erreur ?? "");
    });
    return {
      ok: false,
      erreur: reponse.erreur ?? "Paiement indisponible",
      code: 503,
    };
  }

  if (reponse.reference) {
    await prisma.payment.update({
      where: { id: paiement.id },
      data: { transactionJeko: reponse.reference },
    });
  }
  if (!reponse.url) {
    return {
      ok: false,
      erreur: "Réponse du service de paiement incomplète",
      code: 502,
    };
  }
  // Lien conservé pour la reprise de session (tentative payable ~30 min)
  await journaliser(prisma, paiement.id, "lien_jeko", "", {
    url: reponse.url,
  });
  return { ok: true, url: reponse.url };
}

// ===== Annulation par le client (suivi de commande) =====
// Deux niveaux : abandonner la tentative en cours (la commande reste
// payable, un autre moyen peut être choisi) ou annuler toute la commande
// tant qu'elle n'est pas payée (statut en_attente_paiement uniquement,
// stock restitué — une commande payée/livrée ne revient jamais en arrière).

export class ConflitCommande extends Error {}

export type ResultatAnnulation =
  | { ok: true }
  | { ok: false; erreur: string; code: number };

const VERIFIER = "Un paiement est en cours de vérification — contactez la boutique";

// La tentative `en_attente` peut être déjà soldée chez Jèko (pas de webhook
// d'échec, CDC 10.11) : réconciliation FORCÉE avant toute annulation, sinon
// on risque d'annuler un paiement en fait réussi.
async function verifierTentativeAvantAnnulation(
  tentative: Payment,
  commandeStatut: string
): Promise<ResultatAnnulation | null> {
  const resolu = await reconcilierTentative(tentative, commandeStatut, true);
  if (resolu === "confirme") {
    return { ok: false, erreur: "Cette commande est déjà payée", code: 409 };
  }
  if (resolu === "a_verifier") {
    return { ok: false, erreur: VERIFIER, code: 409 };
  }
  return null;
}

/** Annule la tentative de paiement en cours — la commande reste payable. */
export async function annulerTentativeClient(
  commandeId: number
): Promise<ResultatAnnulation> {
  const prisma = getPrisma();
  const commande = await prisma.order.findUnique({
    where: { id: commandeId },
    include: {
      paiements: { where: { statut: { in: ["en_attente", "a_verifier"] } } },
    },
  });
  if (!commande) {
    return { ok: false, erreur: "Commande introuvable", code: 404 };
  }
  if (commande.statut !== "en_attente_paiement") {
    return { ok: false, erreur: "Aucun paiement en cours à annuler", code: 409 };
  }
  if (commande.paiements.some((p) => p.statut === "a_verifier")) {
    return { ok: false, erreur: VERIFIER, code: 409 };
  }
  const tentative = commande.paiements.find((p) => p.statut === "en_attente");
  if (!tentative) {
    return { ok: false, erreur: "Aucun paiement en cours à annuler", code: 409 };
  }
  const refuse = await verifierTentativeAvantAnnulation(
    tentative,
    commande.statut
  );
  if (refuse) return refuse;

  // Transition conditionnelle (en_attente → annule) : si un webhook a
  // confirmé entre-temps, count = 0 et on n'écrase rien (CDC 10.10).
  const appliquee = await prisma.$transaction(async (tx) => {
    await journaliser(tx, tentative.id, "annulation", "Abandonnée par le client");
    return appliquerTransition(tx, tentative, "annule");
  });
  if (!appliquee) {
    return {
      ok: false,
      erreur: "Le paiement a changé d'état entre-temps — rechargez la page",
      code: 409,
    };
  }
  return { ok: true };
}

/** Annule toute la commande (impayée) : tentative soldée + stock restitué. */
export async function annulerCommandeClient(
  commandeId: number
): Promise<ResultatAnnulation> {
  const prisma = getPrisma();
  const commande = await prisma.order.findUnique({
    where: { id: commandeId },
    include: {
      paiements: { where: { statut: { in: ["en_attente", "a_verifier"] } } },
    },
  });
  if (!commande) {
    return { ok: false, erreur: "Commande introuvable", code: 404 };
  }
  if (commande.statut !== "en_attente_paiement") {
    return {
      ok: false,
      erreur: "Cette commande ne peut plus être annulée — contactez la boutique",
      code: 410,
    };
  }
  if (commande.paiements.some((p) => p.statut === "a_verifier")) {
    return { ok: false, erreur: VERIFIER, code: 409 };
  }
  const tentative = commande.paiements.find((p) => p.statut === "en_attente");
  if (tentative) {
    const refuse = await verifierTentativeAvantAnnulation(
      tentative,
      commande.statut
    );
    if (refuse) return refuse;
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Transition conditionnelle : si la commande a été payée entre-temps,
      // count = 0 → rollback, rien n'est annulé (CDC 10.10).
      const r = await tx.order.updateMany({
        where: { id: commande.id, statut: "en_attente_paiement" },
        data: { statut: "annulee", statutPaiement: "annule" },
      });
      if (r.count === 0) throw new ConflitCommande();
      // Solde la tentative ouverte — si Jèko la confirme plus tard, le
      // webhook la passera « a_verifier » (CDC 10.12).
      const soldes = await tx.payment.updateMany({
        where: { commandeId: commande.id, statut: "en_attente" },
        data: { statut: "annule" },
      });
      if (tentative && soldes.count > 0) {
        await journaliser(
          tx,
          tentative.id,
          "annulation",
          "Commande annulée par le client"
        );
      }
      await restituerStockCommande(tx, commande.id);
    });
  } catch (e) {
    if (e instanceof ConflitCommande) {
      return {
        ok: false,
        erreur: "La commande a changé d'état entre-temps — rechargez la page",
        code: 409,
      };
    }
    throw e;
  }
  return { ok: true };
}
