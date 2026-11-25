import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import {
  journaliser,
  statutJekoReel,
  appliquerTransition,
} from "@/lib/paiement";
import { envoyerBonCommande, alerterAdmin } from "@/lib/email";

// Réconciliation (CDC 10.11) : Jèko n'envoie PAS de webhook pour les
// paiements échoués — on interroge GET /payment_requests/{id} pour chaque
// tentative restée "en_attente" trop longtemps.
//   success → confirme (ou a_verifier si la commande n'est plus payable)
//   error   → echoue + stock libéré
//   pending au-delà de 2× la réservation → a_verifier (revue admin)
// À appeler périodiquement avec : Authorization: Bearer $CRON_SECRET
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const prisma = getPrisma();
  const limite = new Date(
    Date.now() -
      Number(process.env.STOCK_RESERVATION_MINUTES ?? 30) * 60_000 * 2
  );
  const enAttente = await prisma.payment.findMany({
    where: {
      statut: "en_attente",
      transactionJeko: { not: null },
    },
    include: {
      commande: {
        select: { id: true, reference: true, statut: true },
      },
    },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  const resolus: string[] = [];
  const signales: string[] = [];
  for (const p of enAttente) {
    const statut = await statutJekoReel(p.transactionJeko!);

    if (statut === "success" || statut === "error") {
      const cible = statut === "success" ? ("confirme" as const) : ("echoue" as const);
      // Succès alors que la commande n'est plus payable → revue admin
      const final =
        cible === "confirme" && p.commande.statut !== "en_attente_paiement"
          ? ("a_verifier" as const)
          : cible;
      const appliquee = await prisma.$transaction(async (tx) => {
        await journaliser(
          tx,
          p.id,
          "reconciliation",
          `Statut réel Jèko : ${statut} → ${final}`
        );
        return appliquerTransition(tx, p, final);
      });
      if (appliquee) {
        resolus.push(p.referenceCommande);
        if (final === "confirme") {
          envoyerBonCommande(p.commandeId).catch(() => {});
        } else if (final === "a_verifier") {
          signales.push(p.commande.reference);
        }
      }
    } else if (p.createdAt < limite) {
      // Toujours en attente au-delà de 2× la réservation → revue admin
      const r = await prisma.payment.updateMany({
        where: { id: p.id, statut: "en_attente" },
        data: { statut: "a_verifier" },
      });
      if (r.count === 0) continue; // webhook arrivé entre-temps
      await journaliser(
        prisma,
        p.id,
        "anomalie",
        "Réconciliation : pas de retour Jèko dans le délai"
      );
      signales.push(p.commande.reference);
    }
  }

  // Purge des paniers inactifs (> 30 j)
  const purge = await prisma.cart.deleteMany({
    where: { updatedAt: { lt: new Date(Date.now() - 30 * 24 * 3600_000) } },
  });

  if (signales.length > 0) {
    alerterAdmin(
      "alerte_admin_anomalie",
      `${signales.length} paiement(s) à vérifier`,
      `<p>Paiements nécessitant une revue : ${signales.join(", ")} (CDC 10.11).</p>`
    ).catch(() => {});
  }

  return NextResponse.json({
    ok: true,
    resolus,
    aVerifier: signales,
    paniersPurge: purge.count,
  });
}
