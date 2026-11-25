"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/db";
import {
  profilSchema,
  adresseSchema,
  changementMotDePasseSchema,
} from "@/lib/validation";
import type { Prisma } from "@/generated/prisma/client";

export interface AdresseEnregistree {
  communeId: number;
  detail: string;
}

async function userIdRequis(): Promise<number> {
  const session = await auth();
  const id = Number(session?.user?.id);
  if (!id) throw new Error("Connexion requise");
  return id;
}

export type ResultatForm = { ok: true } | { erreur: string };

// Coordonnées du compte (CDC 8.5)
export async function enregistrerProfil(formData: FormData): Promise<ResultatForm> {
  const userId = await userIdRequis();
  const parsed = profilSchema.safeParse({
    nom: formData.get("nom"),
    telephone: formData.get("telephone") ?? "",
  });
  if (!parsed.success) return { erreur: "Informations invalides" };
  await getPrisma().user.update({
    where: { id: userId },
    data: { nom: parsed.data.nom, telephone: parsed.data.telephone || null },
  });
  revalidatePath("/compte");
  return { ok: true };
}

// Adresses enregistrées — tableau JSON [{ communeId, detail }] (CDC 8.5)
export async function ajouterAdresse(formData: FormData): Promise<ResultatForm> {
  const userId = await userIdRequis();
  const parsed = adresseSchema.safeParse({
    communeId: formData.get("communeId"),
    detail: formData.get("detail"),
  });
  if (!parsed.success) return { erreur: "Adresse invalide (5 caractères min)" };

  const prisma = getPrisma();
  const commune = await prisma.commune.findUnique({
    where: { id: parsed.data.communeId },
  });
  if (!commune) return { erreur: "Commune inconnue" };

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const adresses = (user.adresses as unknown as AdresseEnregistree[]) ?? [];
  adresses.push({
    communeId: parsed.data.communeId,
    detail: parsed.data.detail,
  });
  await prisma.user.update({
    where: { id: userId },
    data: { adresses: adresses as unknown as Prisma.InputJsonValue },
  });
  revalidatePath("/compte");
  return { ok: true };
}

export async function supprimerAdresse(index: number): Promise<ResultatForm> {
  const userId = await userIdRequis();
  const prisma = getPrisma();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const adresses = [...((user.adresses as unknown as AdresseEnregistree[]) ?? [])];
  if (index < 0 || index >= adresses.length) return { erreur: "Adresse inconnue" };
  adresses.splice(index, 1);
  await prisma.user.update({
    where: { id: userId },
    data: { adresses: adresses as unknown as Prisma.InputJsonValue },
  });
  revalidatePath("/compte");
  return { ok: true };
}

// Changement de mot de passe — vérifie l'actuel avant de hasher le nouveau
export async function changerMotDePasse(formData: FormData): Promise<ResultatForm> {
  const userId = await userIdRequis();
  const parsed = changementMotDePasseSchema.safeParse({
    actuel: formData.get("actuel"),
    nouveau: formData.get("nouveau"),
  });
  if (!parsed.success) {
    return { erreur: "Le nouveau mot de passe doit faire 8 caractères min" };
  }
  const prisma = getPrisma();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await bcrypt.compare(parsed.data.actuel, user.motDePasseHash))) {
    return { erreur: "Mot de passe actuel incorrect" };
  }
  await prisma.user.update({
    where: { id: userId },
    data: { motDePasseHash: await bcrypt.hash(parsed.data.nouveau, 12) },
  });
  return { ok: true };
}
