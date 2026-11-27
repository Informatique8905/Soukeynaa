import { ViewTransition } from "react";
import { requireAdmin } from "@/lib/admin";
import { getPrisma } from "@/lib/db";
import { AdminShell } from "@/components/admin/admin-shell";
import { NavProgress } from "@/components/motion/NavProgress";
import { ActualisationAuto } from "@/components/admin/ActualisationAuto";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();
  const prisma = getPrisma();

  const [alertesPaiements, commandesATraiter] = await Promise.all([
    prisma.payment.count({ where: { statut: "a_verifier" } }),
    prisma.order.count({
      where: { statut: { in: ["en_attente_paiement", "payee", "en_preparation"] } },
    }),
  ]);

  const utilisateur = session.user?.name ?? session.user?.email ?? "Admin";
  const initiales = utilisateur
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <AdminShell
      utilisateur={utilisateur}
      initiales={initiales || "A"}
      alertesPaiements={alertesPaiements}
      commandesATraiter={commandesATraiter}
    >
      <NavProgress />
      <ActualisationAuto secondes={4} />
      <ViewTransition>{children}</ViewTransition>
    </AdminShell>
  );
}
