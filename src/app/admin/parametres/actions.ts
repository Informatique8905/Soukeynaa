"use server";

import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { parametresSchema } from "@/lib/validation";
import type { Banniere } from "@/lib/settings";
import type { Prisma } from "@/generated/prisma/client";

// Paramètres boutique — ligne unique (décision D11). Bannières d'accueil
// administrables (CDC 7.1), seuil de stock faible, rapport email (CDC 13.8).
export async function enregistrerParametres(formData: FormData) {
  await requireAdmin();
  const prisma = getPrisma();

  let bannieres: Banniere[] = [];
  try {
    const brut = JSON.parse(String(formData.get("bannieres") ?? "[]"));
    if (Array.isArray(brut)) {
      bannieres = brut.map((b, i) => ({ ...b, ordre: i }));
    }
  } catch {
    throw new Error("Bannières invalides");
  }

  const parsed = parametresSchema.safeParse({
    nomBoutique: formData.get("nomBoutique"),
    telephone: formData.get("telephone") ?? "",
    whatsapp: formData.get("whatsapp") ?? "",
    emailContact: formData.get("emailContact") ?? "",
    seuilStockFaible: Number(formData.get("seuilStockFaible") ?? 5),
    rapportEmailActif: formData.get("rapportEmailActif") === "on",
    rapportEmailDestinataire:
      formData.get("rapportEmailDestinataire") ?? "",
    bannieres,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Paramètres invalides");
  }
  const data = parsed.data;
  if (data.rapportEmailActif && !data.rapportEmailDestinataire) {
    throw new Error("Destinataire requis pour le rapport automatique");
  }

  const avant = await prisma.settings.findUnique({ where: { cle: "boutique" } });
  await prisma.settings.upsert({
    where: { cle: "boutique" },
    update: data as unknown as Prisma.SettingsUpdateInput,
    create: { cle: "boutique", ...data } as unknown as Prisma.SettingsCreateInput,
  });
  await logAudit({
    action: "parametres.modifies",
    entiteType: "Settings",
    entiteId: avant?.id ?? 1,
    avant: avant
      ? {
          nomBoutique: avant.nomBoutique,
          seuilStockFaible: avant.seuilStockFaible,
          rapportEmailActif: avant.rapportEmailActif,
        }
      : undefined,
    apres: {
      nomBoutique: data.nomBoutique,
      seuilStockFaible: data.seuilStockFaible,
      rapportEmailActif: data.rapportEmailActif,
    },
  });
  revalidatePath("/admin/parametres");
  revalidatePath("/");
}
