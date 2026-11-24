import { config } from "dotenv";
config({ path: [".env.local", ".env"] });
import { getPrisma } from "../src/lib/db";

async function main() {
  const prisma = getPrisma();
  const communes = await prisma.commune.findMany({
    orderBy: { ordre: "asc" },
    select: { nom: true, tarif: true, active: true },
  });
  console.table(communes);
  const settings = await prisma.settings.findUnique({
    where: { cle: "boutique" },
  });
  console.log("settings:", settings?.nomBoutique);
  await prisma.$disconnect();
}

main();
