import { auth } from "@/auth";
import { getPrisma } from "@/lib/db";
import { dateHeureFr } from "@/lib/format";
import type { OrderStatus } from "@/lib/constants";
import {
  DashboardAdmin,
  type DonneesDashboard,
} from "@/components/admin/dashboard";

const PROGRESSION_STATUT: Partial<Record<OrderStatus, number>> = {
  payee: 30,
  en_preparation: 60,
  expediee: 85,
};

function lundiSemaine(d: Date): Date {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  x.setHours(0, 0, 0, 0);
  return x;
}

export default async function AdminDashboard() {
  const session = await auth();
  const prisma = getPrisma();
  const debutJour = new Date();
  debutJour.setHours(0, 0, 0, 0);

  const premierLundi = lundiSemaine(new Date());
  premierLundi.setDate(premierLundi.getDate() - 7 * 7);

  const [
    commandesJour,
    caJour,
    aPreparer,
    paiementsAVerifier,
    ruptures,
    commandes8Semaines,
    enCours,
    journal,
  ] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: debutJour } } }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: { statutPaiement: "confirme", createdAt: { gte: debutJour } },
    }),
    prisma.order.count({
      where: { statut: { in: ["payee", "en_preparation"] } },
    }),
    prisma.payment.count({ where: { statut: "a_verifier" } }),
    prisma.product.count({
      where: {
        statut: "publie",
        OR: [
          { aVariantes: false, stock: { lte: 0 } },
          { aVariantes: true, variantes: { every: { stock: { lte: 0 } } } },
        ],
      },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: premierLundi } },
      select: { createdAt: true, statutPaiement: true },
    }),
    prisma.order.findMany({
      where: { statut: { in: ["payee", "en_preparation", "expediee"] } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        reference: true,
        clientNom: true,
        total: true,
        statut: true,
        communeNom: true,
      },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        auteurNom: true,
        action: true,
        entiteType: true,
        entiteId: true,
        createdAt: true,
      },
    }),
  ]);

  const semaines = Array.from({ length: 8 }, (_, i) => {
    const debut = new Date(premierLundi);
    debut.setDate(debut.getDate() + i * 7);
    return {
      debut,
      semaine: debut.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
      }),
      commandes: 0,
      payees: 0,
    };
  });

  for (const commande of commandes8Semaines) {
    const index = Math.floor(
      (commande.createdAt.getTime() - premierLundi.getTime()) /
        (7 * 24 * 60 * 60 * 1000),
    );
    if (index < 0 || index > 7) continue;
    semaines[index].commandes += 1;
    if (commande.statutPaiement === "confirme") {
      semaines[index].payees += 1;
    }
  }

  const donnees: DonneesDashboard = {
    stats: {
      commandesJour,
      caJour: caJour._sum.total ?? 0,
      aPreparer,
      paiementsAVerifier,
      ruptures,
    },
    ventes: semaines.map(({ semaine, commandes, payees }) => ({
      semaine,
      commandes,
      payees,
    })),
    enCours: enCours.map((c) => ({
      id: c.id,
      reference: c.reference,
      clientNom: c.clientNom,
      total: c.total,
      statut: c.statut,
      progression: PROGRESSION_STATUT[c.statut] ?? 0,
      commune: c.communeNom,
    })),
    activite: journal.map((e) => ({
      id: e.id,
      auteur: e.auteurNom,
      action: e.action.replace(/[._]/g, " "),
      entite: `${e.entiteType} n°${e.entiteId}`,
      date: dateHeureFr(e.createdAt),
    })),
  };

  return (
    <DashboardAdmin
      donnees={donnees}
      utilisateur={session?.user?.name ?? session?.user?.email ?? "Administrateur"}
    />
  );
}
