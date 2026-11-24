import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import {
  signatureValide,
  transitionAutorisee,
  journaliser,
} from "@/lib/paiement";
import { libererStock } from "@/lib/stock";
import { envoyerBonCommande, alerterAdmin } from "@/lib/email";
import type { StatutPaiement } from "@/generated/prisma/enums";

// Mapping des statuts Jèko → statuts internes.
// Noms exacts À CONFIRMER avec la doc Jèko (CDC 10.4).
const STATUT_JEKO: Record<string, StatutPaiement> = {
  success: "confirme",
  succeeded: "confirme",
  completed: "confirme",
  failed: "echoue",
  cancelled: "annule",
  canceled: "annule",
  expired: "expire",
  pending: "en_attente",
};

// Webhook Jèko (CDC 10.3) — seule source de vérité du statut de paiement.
// Jamais le retour navigateur : il ne fait que rediriger vers /commande/[ref].
export async function POST(req: Request) {
  const prisma = getPrisma();
  const corpsBrut = await req.text();
  const signature =
    req.headers.get("x-jeko-signature") ?? req.headers.get("x-signature");

  // 1. Signature obligatoire (CDC 10.5) — corps brut, avant tout parsing
  if (!signatureValide(corpsBrut, signature)) {
    return NextResponse.json({ erreur: "Signature invalide" }, { status: 401 });
  }

  let event: {
    reference?: string;
    transaction_id?: string;
    id?: string;
    status?: string;
    amount?: number;
  };
  try {
    event = JSON.parse(corpsBrut);
  } catch {
    return NextResponse.json({ erreur: "Corps invalide" }, { status: 400 });
  }

  const transactionJeko = event.transaction_id ?? event.id;
  const statutCible = STATUT_JEKO[event.status ?? ""];
  if (!statutCible) {
    return NextResponse.json({ ok: true }); // événement non géré : 200 (pas de retry)
  }

  // 2. Retrouver la tentative par transactionJeko (unique) ou référence commande
  const paiement = transactionJeko
    ? await prisma.payment.findUnique({ where: { transactionJeko } })
    : await prisma.payment.findFirst({
        where: { referenceCommande: event.reference ?? "" },
        orderBy: { createdAt: "desc" },
      });
  if (!paiement) {
    // Transaction inconnue : journaliser dans un paiement fantôme n'a pas
    // de sens — on loggue côté serveur et on renvoie 200 pour stopper le retry
    console.error("[webhook] transaction inconnue", { transactionJeko, event });
    return NextResponse.json({ ok: true });
  }

  // 3. Idempotence (CDC 10.10) : statut terminal → ignoré silencieusement
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

  const statutFinal =
    typeof event.amount === "number" && event.amount !== paiement.montant
      ? ("a_verifier" as const) // montant divergent → revue admin (CDC 10.8)
      : statutCible;

  // 4. Transition contrôlée + effets de bord, en une transaction
  await prisma.$transaction(async (tx) => {
    await journaliser(tx, paiement.id, "webhook_recu", "", event);
    if (statutFinal === "a_verifier") {
      await journaliser(
        tx,
        paiement.id,
        "anomalie",
        `Montant divergent : reçu ${event.amount}, attendu ${paiement.montant}`
      );
    }
    await tx.payment.update({
      where: { id: paiement.id },
      data: {
        statut: statutFinal,
        ...(transactionJeko && !paiement.transactionJeko
          ? { transactionJeko }
          : {}),
      },
    });

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
  });

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
