import { getPrisma } from "@/lib/db";

// Paramètres boutique — ligne unique `cle = "boutique"` (décision D11)
// Créée au seed ; upsert de secours si la base a été remise à zéro.
export async function getSettings() {
  const prisma = getPrisma();
  return prisma.settings.upsert({
    where: { cle: "boutique" },
    update: {},
    create: { cle: "boutique" },
  });
}

export interface Banniere {
  url: string;
  publicId?: string;
  titre?: string;
  lien?: string;
  ordre?: number;
}

export function bannieresDe(settings: { bannieres: unknown }): Banniere[] {
  const b = settings.bannieres as Banniere[] | null;
  if (!Array.isArray(b)) return [];
  return b
    .filter((x) => x && typeof x.url === "string" && x.url.length > 0)
    .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
}
