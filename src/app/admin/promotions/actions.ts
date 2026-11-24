"use server";

import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";

export async function creerPromotion(formData: FormData) {
  await requireAdmin();
  const prisma = getPrisma();
  const nom = String(formData.get("nom") ?? "").trim();
  const type = String(formData.get("type"));
  const valeur = Number(formData.get("valeur"));
  const portee = String(formData.get("portee"));
  const debut = new Date(String(formData.get("debut")));
  const fin = new Date(String(formData.get("fin")));

  if (!nom || isNaN(valeur) || valeur <= 0) throw new Error("Données invalides");
  if (type === "pourcentage" && valeur > 100)
    throw new Error("Pourcentage > 100");
  if (!(fin > debut)) throw new Error("La fin doit être après le début");
  if (type !== "pourcentage" && type !== "montant")
    throw new Error("Type invalide");
  if (portee !== "produits" && portee !== "categories")
    throw new Error("Portée invalide");

  const ids = String(formData.get("cibleIds") ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);

  const promo = await prisma.promotion.create({
    data: {
      nom,
      type: type as "pourcentage" | "montant",
      valeur,
      portee: portee as "produits" | "categories",
      produitIds: portee === "produits" ? ids : [],
      categorieIds: portee === "categories" ? ids : [],
      debut,
      fin,
      active: true,
    },
  });
  await logAudit({
    action: "promotion.creee",
    entiteType: "Promotion",
    entiteId: promo.id,
    apres: { nom, type, valeur, debut, fin },
  });
  revalidatePath("/admin/promotions");
}

export async function basculerPromotion(id: number) {
  await requireAdmin();
  const prisma = getPrisma();
  const p = await prisma.promotion.findUniqueOrThrow({ where: { id } });
  await prisma.promotion.update({
    where: { id },
    data: { active: !p.active },
  });
  await logAudit({
    action: p.active ? "promotion.arretee" : "promotion.activee",
    entiteType: "Promotion",
    entiteId: id,
    avant: { active: p.active },
    apres: { active: !p.active },
  });
  revalidatePath("/admin/promotions");
}
