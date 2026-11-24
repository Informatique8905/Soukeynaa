"use server";

import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";

export async function modifierCommune(id: number, formData: FormData) {
  await requireAdmin();
  const prisma = getPrisma();
  const avant = await prisma.commune.findUniqueOrThrow({ where: { id } });
  const tarif = Number(formData.get("tarif"));
  const active = formData.get("active") === "on";
  if (!Number.isInteger(tarif) || tarif < 0) {
    throw new Error("Tarif invalide");
  }

  await prisma.commune.update({
    where: { id },
    data: { tarif, active },
  });
  await logAudit({
    action: "tarif_commune.modifie",
    entiteType: "Commune",
    entiteId: id,
    avant: { tarif: avant.tarif, active: avant.active },
    apres: { tarif, active },
  });
  revalidatePath("/admin/communes");
}
