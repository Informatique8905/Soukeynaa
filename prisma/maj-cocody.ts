/**
 * Fusion des zones Cocody : « Cocody (Zone 1) » + « Cocody (Zone 2) »
 * deviennent une seule commune « Cocody » à 1500 FCFA.
 * Usage : npx tsx prisma/maj-cocody.ts
 */
import { config } from "dotenv";
config({ path: [".env.local", ".env"] });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const ANCIENNES = ["Cocody (Zone 1)", "Cocody (Zone 2)"];

async function main() {
  // 1. Commune fusionnée
  const cocody = await prisma.commune.upsert({
    where: { nom: "Cocody" },
    update: {
      quartiersInclus: "Cocody, II Plateaux, Palmeraie, Angré",
      tarif: 1500,
      ordre: 0,
      active: true,
    },
    create: {
      nom: "Cocody",
      quartiersInclus: "Cocody, II Plateaux, Palmeraie, Angré",
      tarif: 1500,
      ordre: 0,
      active: true,
    },
  });
  console.log(`OK « ${cocody.nom} » — ${cocody.tarif} F (id ${cocody.id})`);

  // 2. Suppression des zones — les commandes passées référencent la commune
  //    (FK Restrict) : si des commandes existent, on désactive à la place.
  for (const nom of ANCIENNES) {
    const c = await prisma.commune.findUnique({ where: { nom } });
    if (!c) {
      console.log(`— « ${nom} » absente`);
      continue;
    }
    try {
      await prisma.commune.delete({ where: { id: c.id } });
      console.log(`OK « ${nom} » supprimée`);
    } catch {
      await prisma.commune.update({
        where: { id: c.id },
        data: { active: false },
      });
      console.log(`OK « ${nom} » désactivée (référencée par des commandes)`);
    }
  }

  const restantes = await prisma.commune.findMany({
    where: { active: true },
    orderBy: { ordre: "asc" },
    select: { nom: true, tarif: true },
  });
  console.log("\nCommunes actives :");
  for (const c of restantes) console.log(`  ${c.nom} — ${c.tarif} F`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
