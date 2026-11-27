import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { signalerChangement } from "@/lib/events";
import { restituerStockCommande } from "@/lib/stock";

// Tâche planifiée (CDC 5.8, 10.11) : commandes dont la réservation de stock
// a expiré sans paiement → stock restitué, commande annulée, tentative expirée.
// À appeler périodiquement (cron Vercel / planificateur VPS) avec :
//   Authorization: Bearer $CRON_SECRET
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const prisma = getPrisma();
  const expirees = await prisma.order.findMany({
    where: {
      // echoue/annule inclus : la réservation survit à une tentative
      // soldée (retentative, CDC 10.10) et doit être libérée à l'échéance.
      statut: "en_attente_paiement",
      statutPaiement: { in: ["en_attente", "a_verifier", "echoue", "annule"] },
      reservationExpireLe: { lt: new Date() },
    },
    select: { id: true, reference: true },
  });

  const traitees: string[] = [];
  for (const c of expirees) {
    await prisma.$transaction(async (tx) => {
      // Transition conditionnelle : si déjà traitée entre-temps, on saute
      const r = await tx.order.updateMany({
        where: { id: c.id, statut: "en_attente_paiement" },
        data: { statut: "annulee", statutPaiement: "expire" },
      });
      if (r.count === 0) return;
      await restituerStockCommande(tx, c.id);
      // Seules les tentatives "en_attente" expirent : un paiement
      // "a_verifier" reste résoluble par l'admin (resoudrePaiement)
      await tx.payment.updateMany({
        where: {
          commandeId: c.id,
          statut: "en_attente",
        },
        data: { statut: "expire" },
      });
    });
    traitees.push(c.reference);
    signalerChangement({ commandeId: c.id });
  }
  return NextResponse.json({ ok: true, liberees: traitees });
}
