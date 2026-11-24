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
  { nom: "Cocody (Zone 1)", quartiersInclus: "Cocody (centre)", tarif: 1000 },
  {
    nom: "Cocody (Zone 2)",
    quartiersInclus: "II Plateaux, Palmeraie, Angré",
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

  // ================================================================
  // DONNÉES DE DÉMONSTRATION — catégories + produits illustrés
  // (remplacer par le vrai catalogue via /admin une fois en prod)
  // ================================================================
  const U = "https://images.unsplash.com/photo-";
  const Q = "?auto=format&fit=crop&w=900&q=80";
  const img = (id: string, alt: string, ordre = 0) => ({
    url: `${U}${id}${Q}`,
    alt,
    ordre,
  });

  // Catégories racines (un look par catégorie dans le défilé d'accueil)
  const CATEGORIES = [
    { nom: "Robes", slug: "robes", univers: "femmes" as const },
    { nom: "Sacs & Maroquinerie", slug: "sacs", univers: "femmes" as const },
    { nom: "Baskets", slug: "baskets", univers: "hommes" as const },
    { nom: "T-shirts", slug: "t-shirts", univers: "hommes" as const },
    { nom: "Vêtements enfants", slug: "vetements-enfants", univers: "enfants" as const },
    { nom: "Montres & Bijoux", slug: "montres", univers: "accessoires" as const },
    { nom: "Lunettes", slug: "lunettes", univers: "accessoires" as const },
  ];
  const catId: Record<string, number> = {};
  for (const [i, c] of CATEGORIES.entries()) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { nom: c.nom, univers: c.univers, ordre: i, active: true },
      create: { ...c, ordre: i, active: true },
    });
    catId[c.slug] = cat.id;
  }
  console.log(`${CATEGORIES.length} catégories de démo insérées/mises à jour`);

  const VARIANTES = (
    tailles: string[],
    couleurs: string[],
    stock: number
  ) => ({
    create: tailles.flatMap((taille) =>
      couleurs.map((couleur) => ({ taille, couleur, stock }))
    ),
  });

  const PRODUITS: {
    nom: string;
    slug: string;
    description: string;
    prix: number;
    prixReduit?: number;
    cat: string;
    univers: "femmes" | "hommes" | "enfants" | "accessoires";
    images: ReturnType<typeof img>[];
    aVariantes?: boolean;
    stock?: number;
    variantes?: ReturnType<typeof VARIANTES>;
  }[] = [
    {
      nom: "Robe Wax Élégante",
      slug: "robe-wax-elegante",
      description:
        "Robe en pagne wax premium, coupe fluide et finitions soignées. L'élégance ivoirienne par excellence.",
      prix: 25000,
      prixReduit: 18900,
      cat: "robes",
      univers: "femmes",
      images: [
        img("1595777457583-95e059d581b8", "Robe élégante"),
        img("1515372039744-b8f02a3ae446", "Robe portée"),
      ],
      aVariantes: true,
      variantes: VARIANTES(["S", "M", "L", "XL"], ["Rouge", "Noir"], 4),
    },
    {
      nom: "Baskets Urban Blanc",
      slug: "baskets-urban-blanc",
      description:
        "Baskets épurées en cuir souple — confort toute la journée, du bureau aux sorties.",
      prix: 32000,
      cat: "baskets",
      univers: "hommes",
      images: [
        img("1549298916-b41d501d3772", "Baskets blanches"),
        img("1600185365483-26d7a4cc7519", "Baskets détail"),
      ],
      aVariantes: true,
      variantes: VARIANTES(["40", "41", "42", "43", "44"], ["Blanc", "Noir"], 3),
    },
    {
      nom: "Baskets Speed Rouge",
      slug: "baskets-speed-rouge",
      description:
        "Modèle sportif léger, semelle amortissante. Pour celles et ceux qui courent le style.",
      prix: 36500,
      prixReduit: 29000,
      cat: "baskets",
      univers: "hommes",
      images: [img("1542291026-7eec264c27ff", "Baskets rouges")],
      aVariantes: true,
      variantes: VARIANTES(["40", "41", "42", "43"], ["Rouge"], 5),
    },
    {
      nom: "Sac à main Cuir Cognac",
      slug: "sac-main-cuir-cognac",
      description:
        "Sac à main en cuir véritable, doublure tissu, finitions dorées. Le compagnon chic de tous les jours.",
      prix: 18500,
      prixReduit: 15000,
      cat: "sacs",
      univers: "femmes",
      images: [
        img("1584917865442-de89df76afd3", "Sac à main cuir"),
        img("1548036328-c9fa89d128fa", "Sac en cuir porté"),
      ],
      stock: 7,
    },
    {
      nom: "Sac à dos Voyage",
      slug: "sac-a-dos-voyage",
      description:
        "Sac à dos robuste, nombreuses poches — parfait pour les trajets quotidiens à Abidjan.",
      prix: 22000,
      cat: "sacs",
      univers: "femmes",
      images: [img("1553062407-98eeb64c6a62", "Sac à dos")],
      stock: 10,
    },
    {
      nom: "T-shirt Essential",
      slug: "t-shirt-essential",
      description:
        "T-shirt coton premium, coupe droite. La base qui va avec tout.",
      prix: 8000,
      cat: "t-shirts",
      univers: "hommes",
      images: [
        img("1521572163474-6864f9cf17ab", "T-shirt blanc"),
        img("1618354691373-d851c5c3a990", "T-shirt détail"),
      ],
      aVariantes: true,
      variantes: VARIANTES(["S", "M", "L", "XL"], ["Blanc", "Noir", "Vert"], 8),
    },
    {
      nom: "Ensemble Enfant Soleil",
      slug: "ensemble-enfant-soleil",
      description:
        "Ensemble deux pièces confortable et coloré pour les petits — doux sur la peau, facile à laver.",
      prix: 12000,
      cat: "vetements-enfants",
      univers: "enfants",
      images: [
        img("1519238263530-99bdd11df2ea", "Ensemble enfant"),
        img("1622290291468-a28f7a7dc6a8", "Tenue enfant"),
      ],
      aVariantes: true,
      variantes: VARIANTES(["4 ans", "6 ans", "8 ans", "10 ans"], ["Jaune", "Bleu"], 5),
    },
    {
      nom: "Montre Classique Or",
      slug: "montre-classique-or",
      description:
        "Montre bracelet acier doré, cadran minimaliste. Un classique qui habille tous les poignets.",
      prix: 45000,
      cat: "montres",
      univers: "accessoires",
      images: [
        img("1523170335258-f5ed11844a49", "Montre dorée"),
        img("1524805444758-089113d48a6d", "Montre portée"),
      ],
      stock: 4,
    },
    {
      nom: "Lunettes Soleil Aviateur",
      slug: "lunettes-soleil-aviateur",
      description:
        "Monture aviateur intemporelle, verres UV400. Indispensable sous le soleil d'Abidjan.",
      prix: 15000,
      prixReduit: 9900,
      cat: "lunettes",
      univers: "accessoires",
      images: [
        img("1572635196237-14b3f281503f", "Lunettes de soleil"),
        img("1511499767150-a48a237f0083", "Lunettes détail"),
      ],
      stock: 12,
    },
  ];

  for (const p of PRODUITS) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {}, // ne pas écraser les modifs faites via l'admin
      create: {
        nom: p.nom,
        slug: p.slug,
        description: p.description,
        prix: p.prix,
        prixReduit: p.prixReduit ?? null,
        categorieId: catId[p.cat],
        univers: p.univers,
        images: p.images,
        aVariantes: p.aVariantes ?? false,
        stock: p.stock ?? 0,
        statut: "publie",
        variantes: p.variantes,
      },
    });
  }
  console.log(`${PRODUITS.length} produits de démo insérés/mis à jour`);
}

main()
  .then(() => console.log("Seed terminé"))
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
