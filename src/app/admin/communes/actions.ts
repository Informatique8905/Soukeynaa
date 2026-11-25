"use server";

import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { communeSchema } from "@/lib/validation";

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

// Ajout d'une zone de livraison (CDC 11.4) — nom unique (P2002 = doublon)
export async function creerCommune(formData: FormData) {
  await requireAdmin();
  const prisma = getPrisma();
  const parsed = communeSchema.safeParse({
    nom: formData.get("nom"),
    quartiersInclus: formData.get("quartiersInclus") ?? "",
    tarif: Number(formData.get("tarif")),
    active: true,
    ordre: Number(formData.get("ordre") ?? 0),
  });
  if (!parsed.success) throw new Error("Commune invalide");
  try {
    const c = await prisma.commune.create({ data: parsed.data });
    await logAudit({
      action: "commune.creee",
      entiteType: "Commune",
      entiteId: c.id,
      apres: parsed.data,
    });
  } catch {
    throw new Error("Une commune porte déjà ce nom");
  }
  revalidatePath("/admin/communes");
}
