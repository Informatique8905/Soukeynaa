import { createHmac, timingSafeEqual } from "crypto";
import { getPrisma } from "@/lib/db";
import { libererStock } from "@/lib/stock";
import type { Payment } from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";
import type { StatutPaiement, MoyenPaiement } from "@/generated/prisma/enums";

type Db = Prisma.TransactionClient | ReturnType<typeof getPrisma>;

// Transitions autorisées (CDC 10.4) — hors de cette liste = rejet + journal
const TRANSITIONS: Record<string, StatutPaiement[]> = {
  en_attente: ["confirme", "echoue", "annule", "expire", "a_verifier"],
  a_verifier: ["confirme", "echoue", "annule"],
  confirme: [], // terminal : jamais réécrit (anti-double-webhook)
  echoue: [],
  annule: [],
  expire: [],
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
    // Libération immédiate du stock réservé (CDC 5.8)
    await libererStock(tx, paiement.commandeId);
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
      { headers: { "X-API-KEY": apiKey, "X-API-KEY-ID": keyId } }
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
