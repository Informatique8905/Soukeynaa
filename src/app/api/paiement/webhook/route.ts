import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import {
  signatureValide,
  transitionAutorisee,
  journaliser,
  appliquerTransition,
} from "@/lib/paiement";
import { envoyerBonCommande, alerterAdmin } from "@/lib/email";
import type { StatutPaiement, MoyenPaiement } from "@/generated/prisma/enums";

// Mapping statuts Jèko → statuts internes (doc : pending | success | error)
const STATUT_JEKO: Record<string, StatutPaiement> = {
  success: "confirme",
  error: "echoue",
  pending: "en_attente",
};

// Moyen de paiement renvoyé par Jèko → enum interne (CDC 10.2)
const MOYENS: Record<string, MoyenPaiement> = {
  wave: "wave",
  orange: "orange_money",
  orange_money: "orange_money",
  mtn: "mtn_momo",
  mtn_momo: "mtn_momo",
  moov: "moov_money",
  moov_money: "moov_money",
  djamo: "carte",
  carte: "carte",
  card: "carte",
};

// Webhook Jèko (CDC 10.3) — seule source de vérité du statut de paiement.
// En-têtes : Jeko-Signature (HMAC-SHA256 hex du corps brut), Jeko-Event.
// Note : les paiements ÉCHOUÉS n'envoient pas de webhook — traités par le
// cron de réconciliation qui interroge l'API (GET payment_requests/{id}).
export async function POST(req: Request) {
  const prisma = getPrisma();
  const corpsBrut = await req.text();

  // 1. Signature obligatoire (CDC 10.5) — corps brut, avant tout parsing
  const signature = req.headers.get("jeko-signature");
  if (!signatureValide(corpsBrut, signature)) {
    return NextResponse.json({ erreur: "Signature invalide" }, { status: 401 });
  }

  // 2. Seul TRANSACTION_COMPLETED nous intéresse (payment_method, montant…)
  if (req.headers.get("jeko-event") !== "TRANSACTION_COMPLETED") {
    return NextResponse.json({ ok: true });
  }

  let event: {
    id?: string;
    status?: string;
    amount?: { amount?: number; currency?: string };
    paymentMethod?: string;
    transactionType?: string;
    transactionDetails?: { id?: string; reference?: string };
  };
  try {
    event = JSON.parse(corpsBrut);
  } catch {
    return NextResponse.json({ erreur: "Corps invalide" }, { status: 400 });
  }

  if (event.transactionType && event.transactionType !== "payment") {
    return NextResponse.json({ ok: true }); // transferts : non gérés ici
  }

  const transactionJeko = event.transactionDetails?.id;
  const statutCible = STATUT_JEKO[event.status ?? ""];
  if (!statutCible) {
    return NextResponse.json({ ok: true });
  }
  const moyen = MOYENS[event.paymentMethod ?? ""];

  // 3. Retrouver la tentative : par id payment_request (stocké à
  // l'initiation) ou par notre référence unique (= cleIdempotence)
  const paiement = transactionJeko
    ? await prisma.payment.findUnique({ where: { transactionJeko } })
    : event.transactionDetails?.reference
      ? await prisma.payment.findUnique({
          where: { cleIdempotence: event.transactionDetails.reference },
        })
      : null;
  if (!paiement) {
    console.error("[webhook] transaction inconnue", { transactionJeko, event });
    return NextResponse.json({ ok: true });
  }

  // 4. Idempotence (CDC 10.10) : statut terminal → ignoré silencieusement
  if (!transitionAutorisee(paiement.statut, statutCible)) {
    await journaliser(
      prisma,
      paiement.id,
      "webhook_recu",
      `Ignoré : ${paiement.statut} → ${statutCible} non autorisé`,
      event
    );
    return NextResponse.json({ ok: true });
  }

  // Montant reçu en CENTIMES → comparé au montant attendu × 100 (CDC 10.8)
  const statutFinal =
    typeof event.amount?.amount === "number" &&
    event.amount.amount !== paiement.montant * 100
      ? ("a_verifier" as const)
      : statutCible;

  // 5. Transition contrôlée + effets de bord, en une transaction
  const appliquee = await prisma.$transaction(async (tx) => {
    await journaliser(tx, paiement.id, "webhook_recu", "", event);
    if (statutFinal === "a_verifier") {
      await journaliser(
        tx,
        paiement.id,
        "anomalie",
        `Montant divergent : reçu ${event.amount?.amount} centimes, attendu ${paiement.montant * 100}`
      );
    }
    return appliquerTransition(tx, paiement, statutFinal, {
      transactionJeko,
      moyen,
    });
  });

  if (!appliquee) return NextResponse.json({ ok: true });

  // Effets post-transaction (emails dédupliqués, non bloquants)
  if (statutFinal === "confirme") {
    envoyerBonCommande(paiement.commandeId).catch(() => {});
    alerterAdmin(
      "alerte_admin_commande",
      `Nouvelle commande payée ${paiement.referenceCommande}`,
      `<p>La commande <strong>${paiement.referenceCommande}</strong> vient d'être payée (${paiement.montant} FCFA).</p>`,
      paiement.commandeId
    ).catch(() => {});
  } else if (statutFinal === "a_verifier") {
    alerterAdmin(
      "alerte_admin_anomalie",
      `Anomalie paiement ${paiement.referenceCommande}`,
      `<p>Montant divergent sur la commande <strong>${paiement.referenceCommande}</strong>. Revue admin requise (CDC 10.8).</p>`,
      paiement.commandeId
    ).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
