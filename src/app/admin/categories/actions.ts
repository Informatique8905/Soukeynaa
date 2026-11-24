"use server";

import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { slugify } from "@/lib/format";
import { categorieSchema } from "@/lib/validation";

async function slugUnique(base: string, exclureId?: number) {
  const prisma = getPrisma();
  let slug = base;
  let i = 1;
  while (
    await prisma.category.findFirst({
      where: { slug, ...(exclureId ? { NOT: { id: exclureId } } : {}) },
    })
  ) {
    slug = `${base}-${++i}`;
  }
  return slug;
}

export async function creerCategorie(formData: FormData) {
  await requireAdmin();
  const prisma = getPrisma();
  const parsed = categorieSchema.safeParse({
    nom: formData.get("nom"),
    univers: formData.get("univers"),
    parent: formData.get("parent") || null,
    ordre: Number(formData.get("ordre") ?? 0),
    active: formData.get("active") === "on",
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
  const { nom, univers, parent, ordre, active } = parsed.data;

  // Max 2 niveaux sous l'univers (CDC 4.6)
  if (parent) {
    const p = await prisma.category.findUnique({ where: { id: parent } });
    if (!p || p.univers !== univers || p.parentId) {
      throw new Error("Sous-catégorie invalide (univers différent ou trop de niveaux)");
    }
  }

  const cat = await prisma.category.create({
    data: {
      nom,
      slug: await slugUnique(slugify(nom)),
      univers,
      parentId: parent,
      ordre,
      active,
    },
  });
  await logAudit({
    action: "categorie.creee",
    entiteType: "Category",
    entiteId: cat.id,
    apres: { nom, univers, parent },
  });
  revalidatePath("/admin/categories");
}

export async function modifierCategorie(id: number, formData: FormData) {
  await requireAdmin();
  const prisma = getPrisma();
  const avant = await prisma.category.findUniqueOrThrow({ where: { id } });
  const parsed = categorieSchema.safeParse({
    nom: formData.get("nom"),
    univers: formData.get("univers"),
    parent: formData.get("parent") || null,
    ordre: Number(formData.get("ordre") ?? 0),
    active: formData.get("active") === "on",
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
  const { nom, univers, parent, ordre, active } = parsed.data;

  if (parent) {
    if (parent === id) throw new Error("Une catégorie ne peut pas être son propre parent");
    const p = await prisma.category.findUnique({ where: { id: parent } });
    if (!p || p.univers !== univers || p.parentId) {
      throw new Error("Sous-catégorie invalide");
    }
  }

  await prisma.category.update({
    where: { id },
    data: {
      nom,
      slug: await slugUnique(slugify(nom), id),
      univers,
      parentId: parent,
      ordre,
      active,
    },
  });
  await logAudit({
    action: "categorie.modifiee",
    entiteType: "Category",
    entiteId: id,
    avant: { nom: avant.nom, univers: avant.univers, active: avant.active },
    apres: { nom, univers, active },
  });
  revalidatePath("/admin/categories");
}

export async function basculerCategorie(id: number) {
  await requireAdmin();
  const prisma = getPrisma();
  const cat = await prisma.category.findUniqueOrThrow({ where: { id } });
  await prisma.category.update({
    where: { id },
    data: { active: !cat.active },
  });
  await logAudit({
    action: cat.active ? "categorie.desactivee" : "categorie.activee",
    entiteType: "Category",
    entiteId: id,
    avant: { active: cat.active },
    apres: { active: !cat.active },
  });
  revalidatePath("/admin/categories");
}
