import { createHmac, timingSafeEqual } from "crypto";
import { getPrisma } from "@/lib/db";
import type { Payment } from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";
import type { StatutPaiement } from "@/generated/prisma/enums";

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
// Méthode : HMAC-SHA256 du corps brut, encodé hex — À CONFIRMER avec la doc
// Jèko sandbox (nom exact de l'en-tête et schéma de signature).
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

// ===== Initiation Jèko =====
// Endpoint/payload exacts À CONFIRMER avec la doc Jèko (section 10.2).
export interface ReponseInitiation {
  ok: boolean;
  url?: string;
  reference?: string; // transactionJeko
  erreur?: string;
}

export async function initierPaiementJeko(params: {
  paiement: Payment;
  email: string;
  telephone: string;
}): Promise<ReponseInitiation> {
  const base = process.env.JEKO_API_BASE_URL;
  const key = process.env.JEKO_API_KEY;
  if (!base || !key) {
    return { ok: false, erreur: "Paiement en ligne non configuré" };
  }
  try {
    const res = await fetch(`${base}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        amount: params.paiement.montant,
        currency: "XOF", // FCFA
        reference: params.paiement.referenceCommande,
        idempotency_key: params.paiement.cleIdempotence,
        customer: {
          email: params.email,
          phone: params.telephone,
        },
        callback_url: `${process.env.AUTH_URL}/api/paiement/webhook`,
        return_url: `${process.env.AUTH_URL}/commande/${params.paiement.referenceCommande}`,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        erreur: data?.message ?? `Erreur Jèko (${res.status})`,
      };
    }
    return {
      ok: true,
      url: data?.checkout_url ?? data?.url,
      reference: data?.reference ?? data?.id,
    };
  } catch {
    return { ok: false, erreur: "Jèko injoignable — réessayez" };
  }
}
