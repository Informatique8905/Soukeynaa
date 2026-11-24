import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { journaliser } from "@/lib/paiement";
import { alerterAdmin } from "@/lib/email";

// Réconciliation (CDC 10.11) : paiements restés "en_attente" au-delà du délai
// de réservation sans webhook → signalés "a_verifier" pour revue admin.
// À terme : interroger l'API Jèko pour le statut réel de chaque transaction
// (endpoint de statut À CONFIRMER avec la doc Jèko).
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
    where: { statut: "en_attente", createdAt: { lt: limite } },
    include: { commande: { select: { reference: true } } },
  });

  const signales: string[] = [];
  for (const p of enAttente) {
    const r = await prisma.payment.updateMany({
      where: { id: p.id, statut: "en_attente" },
      data: { statut: "a_verifier" },
    });
    if (r.count === 0) continue; // webhook arrivé entre-temps
    await journaliser(
      prisma,
      p.id,
      "anomalie",
      "Réconciliation : pas de webhook reçu dans le délai"
    );
    signales.push(p.commande.reference);
  }

  // Purge des paniers inactifs (> 30 j) — équivalent du TTL MongoDB
  const purge = await prisma.cart.deleteMany({
    where: { updatedAt: { lt: new Date(Date.now() - 30 * 24 * 3600_000) } },
  });

  if (signales.length > 0) {
    alerterAdmin(
      "alerte_admin_anomalie",
      `${signales.length} paiement(s) à vérifier`,
      `<p>Paiements sans retour webhook : ${signales.join(", ")}. Revue admin requise (CDC 10.11).</p>`
    ).catch(() => {});
  }

  return NextResponse.json({
    ok: true,
    aVerifier: signales,
    paniersPurge: purge.count,
  });
}
