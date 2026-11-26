"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { slugify } from "@/lib/format";
import { imageProduitSchema, produitSchema, varianteSchema } from "@/lib/validation";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";

interface ImageInput {
  publicId: string;
  url: string;
  alt: string;
  ordre: number;
}

interface VarianteInput {
  taille?: string;
  couleur?: string;
  sku?: string;
  stock: number;
  prixReduit?: number | null;
}

async function slugUnique(base: string, exclureId?: number) {
  const prisma = getPrisma();
  let slug = base;
  let i = 1;
  while (
    await prisma.product.findFirst({
      where: { slug, ...(exclureId ? { NOT: { id: exclureId } } : {}) },
    })
  ) {
    slug = `${base}-${++i}`;
  }
  return slug;
}

function lireFormulaire(formData: FormData) {
  const parsed = produitSchema.safeParse({
    nom: formData.get("nom"),
    description: formData.get("description") ?? "",
    prix: Number(formData.get("prix")),
    prixReduit: formData.get("prixReduit")
      ? Number(formData.get("prixReduit"))
      : undefined,
    categorie: Number(formData.get("categorie")),
    univers: formData.get("univers"),
    aVariantes: formData.get("aVariantes") === "on",
    variantes: [],
    stock: Number(formData.get("stock") ?? 0),
    poids: formData.get("poids") ? Number(formData.get("poids")) : undefined,
    statut: formData.get("statut"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
  // Chaque élément JSON est validé — le client peut envoyer n'importe quoi
  const images = z
    .array(imageProduitSchema)
    .max(15)
    .parse(JSON.parse(String(formData.get("images") ?? "[]"))) as ImageInput[];
  const variantes = z
    .array(varianteSchema)
    .max(60)
    .parse(JSON.parse(String(formData.get("variantes") ?? "[]")));
  return { data: parsed.data, images, variantes };
}

export async function creerProduit(formData: FormData) {
  await requireAdmin();
  const prisma = getPrisma();
  const { data, images, variantes } = lireFormulaire(formData);

  const produit = await prisma.product.create({
    data: {
      nom: data.nom,
      slug: await slugUnique(slugify(data.nom)),
      description: data.description,
      prix: data.prix,
      prixReduit: data.prixReduit ?? null,
      categorieId: data.categorie,
      univers: data.univers,
      images: images as unknown as Prisma.InputJsonValue,
      aVariantes: data.aVariantes,
      stock: data.aVariantes ? 0 : data.stock,
      poids: data.poids ?? null,
      statut: data.statut,
      variantes: data.aVariantes
        ? {
            create: variantes.map((v) => ({
              taille: v.taille || null,
              couleur: v.couleur || null,
              sku: v.sku || null,
              stock: v.stock,
              prixReduit: v.prixReduit ?? null,
            })),
          }
        : undefined,
    },
  });
  await logAudit({
    action: "produit.cree",
    entiteType: "Product",
    entiteId: produit.id,
    apres: { nom: data.nom, prix: data.prix },
  });
  revalidatePath("/admin/produits");
  redirect("/admin/produits");
}

export async function modifierProduit(id: number, formData: FormData) {
  await requireAdmin();
  const prisma = getPrisma();
  const avant = await prisma.product.findUniqueOrThrow({
    where: { id },
    include: { variantes: true },
  });
  const { data, images, variantes } = lireFormulaire(formData);

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        nom: data.nom,
        slug: await slugUnique(slugify(data.nom), id),
        description: data.description,
        prix: data.prix,
        prixReduit: data.prixReduit ?? null,
        categorieId: data.categorie,
        univers: data.univers,
        images: images as unknown as Prisma.InputJsonValue,
        aVariantes: data.aVariantes,
        stock: data.aVariantes ? 0 : data.stock,
        poids: data.poids ?? null,
        statut: data.statut,
      },
    });
    // Variantes déjà commandées : order_lines.varianteId est en Restrict,
    // suppression impossible — on les conserve (historique) et on fusionne.
    const ids = avant.variantes.map((v) => v.id);
    const referencees = new Set(
      (
        await tx.orderLine.findMany({
          where: { varianteId: { in: ids } },
          select: { varianteId: true },
          distinct: ["varianteId"],
        })
      ).map((l) => l.varianteId as number)
    );

    if (data.aVariantes) {
      const cle = (t?: string | null, c?: string | null) =>
        `${t ?? ""}|${c ?? ""}`;
      const parCle = new Map(
        avant.variantes.map((v) => [cle(v.taille, v.couleur), v])
      );
      const conservees = new Set<number>();
      const aCreer: VarianteInput[] = [];
      for (const v of variantes) {
        const ex = parCle.get(cle(v.taille, v.couleur));
        if (ex && referencees.has(ex.id)) {
          // Même combinaison conservée : mise à jour en place (id stable)
          conservees.add(ex.id);
          await tx.productVariant.update({
            where: { id: ex.id },
            data: {
              sku: v.sku || null,
              stock: v.stock,
              prixReduit: v.prixReduit ?? null,
            },
          });
        } else {
          aCreer.push(v);
        }
      }
      // Suppression limitée aux variantes jamais commandées
      await tx.productVariant.deleteMany({
        where: { produitId: id, id: { notIn: [...referencees] } },
      });
      // Référencées mais retirées du formulaire : neutralisées (stock 0,
      // SKU libéré) — elles restent en base pour l'historique des lignes
      await tx.productVariant.updateMany({
        where: { id: { in: [...referencees].filter((i) => !conservees.has(i)) } },
        data: { stock: 0, sku: null },
      });
      if (aCreer.length) {
        await tx.productVariant.createMany({
          data: aCreer.map((v) => ({
            produitId: id,
            taille: v.taille || null,
            couleur: v.couleur || null,
            sku: v.sku || null,
            stock: v.stock,
            prixReduit: v.prixReduit ?? null,
          })),
        });
      }
    } else {
      // Passage en produit simple : suppression si possible, sinon
      // neutralisation des variantes référencées par des commandes
      await tx.productVariant.deleteMany({
        where: { produitId: id, id: { notIn: [...referencees] } },
      });
      await tx.productVariant.updateMany({
        where: { id: { in: [...referencees] } },
        data: { stock: 0, sku: null },
      });
    }
  });

  await logAudit({
    action: "produit.modifie",
    entiteType: "Product",
    entiteId: id,
    avant: { prix: avant.prix, statut: avant.statut, stock: avant.stock },
    apres: { prix: data.prix, statut: data.statut, stock: data.stock },
  });
  revalidatePath("/admin/produits");
  redirect("/admin/produits");
}

export async function changerStatutProduit(
  id: number,
  statut: "publie" | "brouillon" | "desactive"
) {
  await requireAdmin();
  const prisma = getPrisma();
  const avant = await prisma.product.findUniqueOrThrow({ where: { id } });
  await prisma.product.update({ where: { id }, data: { statut } });
  await logAudit({
    action: `produit.${statut}`,
    entiteType: "Product",
    entiteId: id,
    avant: { statut: avant.statut },
    apres: { statut },
  });
  revalidatePath("/admin/produits");
}
