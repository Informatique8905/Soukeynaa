/**
 * Seed initial — Boutique SOUKEYNA
 * Usage : npm run seed  (ou npx prisma db seed)
 * Requiert DATABASE_URL dans .env.local
 * Optionnel : SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD pour l'admin initial
 */
import { config } from "dotenv";
config({ path: [".env.local", ".env"] });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Communes et tarifs fournis par le propriétaire (CDC 11)
const COMMUNES = [
  {
    nom: "Cocody",
    quartiersInclus: "Cocody, II Plateaux, Palmeraie, Angré",
    tarif: 1500,
  },
  { nom: "Plateau", quartiersInclus: "Plateau", tarif: 1500 },
  { nom: "Abobo", quartiersInclus: "Abobo", tarif: 1500 },
  { nom: "Koumassi", quartiersInclus: "Koumassi", tarif: 2000 },
  { nom: "Treichville", quartiersInclus: "Treichville", tarif: 2000 },
  { nom: "Marcory", quartiersInclus: "Marcory", tarif: 2000 },
  { nom: "Port-Bouët", quartiersInclus: "Port-Bouët", tarif: 2000 },
  { nom: "Yopougon", quartiersInclus: "Yopougon", tarif: 2000 },
  { nom: "Bingerville", quartiersInclus: "Bingerville", tarif: 2000 },
  { nom: "Grand-Bassam", quartiersInclus: "Bassam", tarif: 3000 },
  { nom: "Songon", quartiersInclus: "Songon", tarif: 3000 },
];

async function main() {
  // --- Communes : upsert par nom (idempotent)
  for (const [i, c] of COMMUNES.entries()) {
    await prisma.commune.upsert({
      where: { nom: c.nom },
      update: { ...c, ordre: i, active: true },
      create: { ...c, ordre: i, active: true },
    });
  }
  console.log(`${COMMUNES.length} communes insérées/mises à jour`);

  // --- Settings : ligne unique
  await prisma.settings.upsert({
    where: { cle: "boutique" },
    update: {},
    create: {
      cle: "boutique",
      nomBoutique: "SOUKEYNA",
      telephone: process.env.NEXT_PUBLIC_SHOP_PHONE ?? "",
      whatsapp: process.env.NEXT_PUBLIC_SHOP_WHATSAPP ?? "",
      emailContact: process.env.ADMIN_EMAIL ?? "",
    },
  });
  console.log("Paramètres boutique (SOUKEYNA) initialisés");

  // --- Admin initial (uniquement si email + mot de passe fournis)
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (email && password) {
    const existe = await prisma.user.findUnique({ where: { email } });
    if (!existe) {
      await prisma.user.create({
        data: {
          nom: "Administrateur",
          email,
          motDePasseHash: await bcrypt.hash(password, 12),
          role: "admin",
        },
      });
      console.log(`Compte admin créé : ${email}`);
    } else {
      console.log(`Compte admin déjà existant : ${email}`);
    }
  } else {
    console.log(
      "Pas d'admin créé — définissez SEED_ADMIN_EMAIL et SEED_ADMIN_PASSWORD puis relancez"
    );
  }

  // Catalogue : à créer via /admin (produits, catégories, images
  // Cloudinary réelles) — aucune donnée de démonstration n'est insérée.
}

main()
  .then(() => console.log("Seed terminé"))
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
