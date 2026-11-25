"use server";

import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/db";
import { getOrCreateCart, getCart } from "@/lib/cart";
import { Prisma } from "@/generated/prisma/client";

// Ajout au panier — vérifie produit publié + stock réel avant d'insérer
export async function ajouterAuPanier(produitId: number, varianteId: number | null, quantite: number) {
  const prisma = getPrisma();
  const produit = await prisma.product.findUnique({
    where: { id: produitId },
    include: { variantes: true },
  });
  if (!produit || produit.statut !== "publie") {
    throw new Error("Produit indisponible");
  }
  if (produit.aVariantes && !varianteId) {
    throw new Error("Choisissez une taille/couleur");
  }
  const stock = produit.aVariantes
    ? (produit.variantes.find((v) => v.id === varianteId)?.stock ?? 0)
    : produit.stock;
  if (quantite < 1 || quantite > stock) {
    throw new Error("Quantité indisponible");
  }

  const cart = await getOrCreateCart();
  // Déduplication : même produit + même variante = même ligne
  const existante = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, produitId, varianteId },
  });
  if (existante) {
    const nouvelle = Math.min(existante.quantite + quantite, stock);
    await prisma.cartItem.update({
      where: { id: existante.id },
      data: { quantite: nouvelle },
    });
  } else {
    try {
      await prisma.cartItem.create({
        data: { cartId: cart.id, produitId, varianteId, quantite },
      });
    } catch (e) {
      // Index unique sur COALESCE(varianteId,0) : ajout concurrent → la
      // ligne existe désormais, on incrémente au lieu de dupliquer
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        const ex = await prisma.cartItem.findFirst({
          where: { cartId: cart.id, produitId, varianteId },
        });
        if (ex) {
          await prisma.cartItem.update({
            where: { id: ex.id },
            data: { quantite: Math.min(ex.quantite + quantite, stock) },
          });
        }
      } else {
        throw e;
      }
    }
  }
  revalidatePath("/panier");
}

export async function modifierQuantite(ligneId: number, quantite: number) {
  const prisma = getPrisma();
  const cart = await getCart();
  if (!cart) return;
  const ligne = await prisma.cartItem.findFirst({
    where: { id: ligneId, cartId: cart.id },
  });
  if (!ligne) return;
  if (quantite < 1) {
    await prisma.cartItem.delete({ where: { id: ligneId } });
  } else {
    await prisma.cartItem.update({
      where: { id: ligneId },
      data: { quantite },
    });
  }
  revalidatePath("/panier");
}

export async function retirerLigne(ligneId: number) {
  const prisma = getPrisma();
  const cart = await getCart();
  if (!cart) return;
  await prisma.cartItem.deleteMany({
    where: { id: ligneId, cartId: cart.id },
  });
  revalidatePath("/panier");
}
