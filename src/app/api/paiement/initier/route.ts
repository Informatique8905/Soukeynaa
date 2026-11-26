import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/db";
import { initierTentative } from "@/lib/paiement";
import { autorise, ipClient } from "@/lib/ratelimit";
import { verifierIdsCommandes, COOKIE_COMMANDES } from "@/lib/ownership";

// Initiation d'une tentative de paiement (CDC 10.2)
// Anti-double-paiement : verrou au niveau commande — une seule tentative
// active (en_attente / a_verifier) par commande.
// Propriété OBLIGATOIRE : sans elle, n'importe qui peut créer une tentative
// `en_attente` sur la commande d'un tiers (ids séquentiels) et bloquer son
// paiement réel (409 « paiement déjà en cours »).
export async function POST(req: Request) {
  // Limitation : 10 initiations / 10 min / IP (CDC 14.4)
  if (!autorise(`paiement:${ipClient(req)}`, 10, 600_000)) {
    return NextResponse.json(
      { erreur: "Trop de tentatives — réessayez plus tard" },
      { status: 429 }
    );
  }

  let commandeId: number;
  let moyenJeko = "";
  try {
    const body = await req.json();
    commandeId = Number(body?.commandeId);
    moyenJeko = String(body?.moyen ?? "");
  } catch {
    return NextResponse.json({ erreur: "Requête invalide" }, { status: 400 });
  }
  if (!commandeId) {
    return NextResponse.json({ erreur: "commandeId requis" }, { status: 400 });
  }

  const prisma = getPrisma();
  const commande = await prisma.order.findUnique({
    where: { id: commandeId },
    select: { id: true, clientUserId: true },
  });
  if (!commande) {
    return NextResponse.json({ erreur: "Commande introuvable" }, { status: 404 });
  }

  // Propriétaire = session liée à la commande, cookie signé contenant l'id,
  // ou admin. Le cookie invité est invérifiable sans signature (CDC 14.5).
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

  const res = await initierTentative({ commandeId, moyenJeko });
  if (!res.ok) {
    return NextResponse.json({ erreur: res.erreur }, { status: res.code });
  }
  return NextResponse.json({ url: res.url });
}
