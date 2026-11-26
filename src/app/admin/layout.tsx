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

  const alertesPaiements = await prisma.payment.count({
    where: { statut: "a_verifier" },
  });

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
    >
      <NavProgress />
      <ActualisationAuto secondes={20} />
      <ViewTransition>{children}</ViewTransition>
    </AdminShell>
  );
}
