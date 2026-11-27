import { NextResponse, after } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/db";
import {
  annulerTentativeClient,
  annulerCommandeClient,
} from "@/lib/paiement";
import { alerterAdmin } from "@/lib/email";
import { autorise, ipClient } from "@/lib/ratelimit";
import { verifierIdsCommandes, COOKIE_COMMANDES } from "@/lib/ownership";

// Annulation par le client (suivi de commande, CDC 10.5 « annule ») :
// - cible "tentative" : abandonne le paiement en cours → la commande reste
//   payable, le client peut choisir un autre moyen (retentative CDC 10.10).
// - cible "commande" : annule toute la commande tant qu'elle est
//   en_attente_paiement — tentative soldée + stock restitué.
// Propriété OBLIGATOIRE comme /api/paiement/initier : sans elle, n'importe
// qui pourrait annuler la commande d'un tiers (ids/références énumérables).
export async function POST(req: Request) {
  // Limitation : 10 annulations / 10 min / IP (CDC 14.4)
  if (!autorise(`annulation:${ipClient(req)}`, 10, 600_000)) {
    return NextResponse.json(
      { erreur: "Trop de tentatives — réessayez plus tard" },
      { status: 429 }
    );
  }

  let commandeId: number;
  let cible = "";
  try {
    const body = await req.json();
    commandeId = Number(body?.commandeId);
    cible = String(body?.cible ?? "");
  } catch {
    return NextResponse.json({ erreur: "Requête invalide" }, { status: 400 });
  }
  if (!commandeId || (cible !== "tentative" && cible !== "commande")) {
    return NextResponse.json({ erreur: "Requête invalide" }, { status: 400 });
  }

  const prisma = getPrisma();
  const commande = await prisma.order.findUnique({
    where: { id: commandeId },
    select: { id: true, clientUserId: true, reference: true },
  });
  if (!commande) {
    return NextResponse.json({ erreur: "Commande introuvable" }, { status: 404 });
  }

  const [session, store] = await Promise.all([auth(), cookies()]);
  const userId = session?.user?.id ? Number(session.user.id) : null;
  const proprietaire =
    verifierIdsCommandes(store.get(COOKIE_COMMANDES)?.value).includes(
      commande.id
    ) ||
    (userId !== null && commande.clientUserId === userId) ||
    session?.user?.role === "admin";
  if (!proprietaire) {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 403 });
  }

  const res =
    cible === "tentative"
      ? await annulerTentativeClient(commandeId)
      : await annulerCommandeClient(commandeId);
  if (!res.ok) {
    return NextResponse.json({ erreur: res.erreur }, { status: res.code });
  }

  if (cible === "commande") {
    // Alerte admin — la réservation de stock vient d'être libérée.
    // Pas d'email client : seul le délai de livraison notifie.
    after(async () => {
      await alerterAdmin(
        "alerte_admin_commande",
        `Commande annulée par le client ${commande.reference}`,
        `<p>La commande <strong>${commande.reference}</strong> a été annulée par le client avant paiement. Le stock réservé a été restitué.</p>`,
        commandeId
      ).catch(() => {});
    });
  }

  return NextResponse.json({ ok: true });
}
