import { auth } from "@/auth";
import { getPrisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

interface AuditParams {
  action: string;
  entiteType: string;
  entiteId: number;
  avant?: unknown;
  apres?: unknown;
  motif?: string;
}

/** Journalisation des actions admin sensibles (CDC 10.13, 14.7). */
export async function logAudit({
  action,
  entiteType,
  entiteId,
  avant,
  apres,
  motif,
}: AuditParams) {
  const session = await auth();
  if (!session?.user) throw new Error("Action non authentifiée");
  const prisma = getPrisma();
  await prisma.auditLog.create({
    data: {
      auteurId: Number(session.user.id),
      auteurNom: session.user.name ?? "",
      action,
      entiteType,
      entiteId,
      avant: (avant ?? undefined) as Prisma.InputJsonValue | undefined,
      apres: (apres ?? undefined) as Prisma.InputJsonValue | undefined,
      motif: motif ?? null,
    },
  });
}
