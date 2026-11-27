import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/db";
import { verifierIdsCommandes, COOKIE_COMMANDES } from "@/lib/ownership";
import { autorise, ipClient } from "@/lib/ratelimit";

// Sonde d'actualisation : renvoie une « empreinte » des données qui
// intéressent l'écran courant. Le client l'interroge périodiquement et ne
// déclenche router.refresh() QUE si l'empreinte a changé — plus de
// rechargement à intervalle quand rien n'a bougé.
//
// scope=admin     : max(updatedAt) commandes+paiements + compteurs shell
// scope=commandes : max(updatedAt) des commandes du client (session ou
//                   cookie signé invité — même règle de propriété que
//                   /api/paiement/initier)
export async function GET(req: Request) {
  // Appelée toutes les 5–20 s par onglet ouvert : quota large mais borné
  if (!autorise(`etat:${ipClient(req)}`, 120, 60_000)) {
    return NextResponse.json({ v: "limite" }, { status: 429 });
  }
  const scope = new URL(req.url).searchParams.get("scope");
  const prisma = getPrisma();

  if (scope === "admin") {
    const session = await auth();
    if (session?.user?.role !== "admin") {
      return NextResponse.json({ erreur: "Non autorisé" }, { status: 403 });
    }
    const [ord, pay, aVerifier, aTraiter] = await Promise.all([
      prisma.order.aggregate({ _max: { updatedAt: true } }),
      prisma.payment.aggregate({ _max: { updatedAt: true } }),
      prisma.payment.count({ where: { statut: "a_verifier" } }),
      prisma.order.count({
        where: {
          statut: { in: ["en_attente_paiement", "payee", "en_preparation"] },
        },
      }),
    ]);
    const v = `${ord._max.updatedAt?.getTime() ?? 0}:${pay._max.updatedAt?.getTime() ?? 0}:${aVerifier}:${aTraiter}`;
    return NextResponse.json({ v });
  }

  if (scope === "commandes") {
    const [session, store] = await Promise.all([auth(), cookies()]);
    const userId = session?.user?.id ? Number(session.user.id) : null;
    const ids = verifierIdsCommandes(store.get(COOKIE_COMMANDES)?.value);
    if (userId === null && ids.length === 0) {
      return NextResponse.json({ v: "0" });
    }
    const where =
      userId !== null
        ? { OR: [{ clientUserId: userId }, { id: { in: ids } }] }
        : { id: { in: ids } };
    const [ord, enAttente] = await Promise.all([
      prisma.order.aggregate({ _max: { updatedAt: true }, where }),
      prisma.order.count({
        where: { ...where, statut: "en_attente_paiement" },
      }),
    ]);
    return NextResponse.json({
      v: `${ord._max.updatedAt?.getTime() ?? 0}:${enAttente}`,
    });
  }

  return NextResponse.json({ erreur: "scope invalide" }, { status: 400 });
}
