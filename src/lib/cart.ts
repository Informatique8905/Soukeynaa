import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { getPrisma } from "@/lib/db";
import { auth } from "@/auth";
import { prixAvecPromos, promotionsActives } from "./pricing";

const COOKIE = "soukeyna_cart";

export interface LignePanier {
  id: number;
  produitId: number;
  varianteId: number | null;
  nom: string;
  slug: string;
  varianteLabel: string;
  quantite: number;
  prixUnitaire: number;
  prixNormal: number;
  total: number;
  image: string | null;
  stockDispo: number;
}

export interface Panier {
  lignes: LignePanier[];
  sousTotal: number;
  count: number;
}

async function cartIdCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE)?.value ?? null;
}

/** Panier courant : invité (cookie) ou compte connecté. */
export async function getCart() {
  const prisma = getPrisma();
  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;
  const cartId = userId ? null : await cartIdCookie();

  if (!userId && !cartId) return null;
  return prisma.cart.findFirst({
    where: userId ? { userId } : { cartId: cartId! },
    include: { items: true },
  });
}

/** Crée (ou récupère) le panier et pose le cookie invité si besoin. */
export async function getOrCreateCart() {
  const prisma = getPrisma();
  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;

  if (userId) {
    return prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  let cartId = await cartIdCookie();
  if (cartId) {
    const existant = await prisma.cart.findUnique({ where: { cartId } });
    if (existant) return existant;
  }
  cartId = randomUUID();
  const store = await cookies();
  store.set(COOKIE, cartId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 3600,
  });
  return prisma.cart.create({ data: { cartId } });
}

interface ImageJson {
  url?: string;
}

/** Panier enrichi : prix recalculés serveur + stock réel (CDC 6.6). */
export async function getPanierDetails(): Promise<Panier> {
  const cart = await getCart();
  if (!cart || cart.items.length === 0) {
    return { lignes: [], sousTotal: 0, count: 0 };
  }
  const prisma = getPrisma();
  // Batch : 1 requête produits + 1 requête promos pour tout le panier
  const [produits, promos] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: cart.items.map((i) => i.produitId) } },
      include: { variantes: true },
    }),
    promotionsActives(),
  ]);
  const parId = new Map(produits.map((p) => [p.id, p]));

  const lignes: LignePanier[] = [];
  let sousTotal = 0;

  for (const item of cart.items) {
    const produit = parId.get(item.produitId);
    if (!produit || produit.statut !== "publie") continue;
    const variante = item.varianteId
      ? produit.variantes.find((v) => v.id === item.varianteId)
      : null;
    const prix = prixAvecPromos(produit, promos, variante);
    const images = produit.images as unknown as ImageJson[];
    const stock = produit.aVariantes
      ? (variante?.stock ?? 0)
      : produit.stock;
    const total = prix * item.quantite;
    sousTotal += total;
    lignes.push({
      id: item.id,
      produitId: produit.id,
      varianteId: variante?.id ?? null,
      nom: produit.nom,
      slug: produit.slug,
      varianteLabel:
        [variante?.taille, variante?.couleur].filter(Boolean).join(" / ") ||
        "",
      quantite: item.quantite,
      prixUnitaire: prix,
      prixNormal: produit.prix,
      total,
      image: images?.[0]?.url ?? null,
      stockDispo: stock,
    });
  }
  return { lignes, sousTotal, count: lignes.reduce((s, l) => s + l.quantite, 0) };
}
