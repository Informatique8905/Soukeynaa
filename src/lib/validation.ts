import { z } from "zod";
import {
  ORDER_STATUSES,
  PRODUCT_STATUSES,
  UNIVERSES,
} from "./constants";

// Numéro ivoirien : +225 optionnel puis 8 à 10 chiffres
const telephoneCI = z
  .string()
  .regex(/^\+?225?\d{8,10}$|^\d{8,10}$/, "Numéro de téléphone invalide");

// Identifiant PostgreSQL (entier auto-incrémenté)
const id = z.coerce.number().int().positive();

// ===== Commande (CDC 8.3, 9.2) — email obligatoire même en invité (CDC 8.4)
export const checkoutSchema = z.object({
  client: z.object({
    nom: z.string().trim().min(2).max(120),
    telephone: telephoneCI,
    email: z.string().trim().toLowerCase().email(),
  }),
  livraison: z.object({
    communeId: id,
    adresse: z.string().trim().min(5).max(500),
  }),
  modePaiement: z.enum(["en_ligne", "livraison"]).default("en_ligne"),
  // Opérateur choisi au checkout — repris sur la page de paiement Jèko
  moyenPaiement: z.enum(["wave", "orange", "mtn", "moov", "djamo"]).optional(),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

// ===== Produit (admin)
export const varianteSchema = z.object({
  taille: z.string().trim().max(40).optional(),
  couleur: z.string().trim().max(40).optional(),
  sku: z.string().trim().max(60).optional(),
  stock: z.number().int().min(0),
  prixReduit: z.number().int().min(0).optional(),
});

export const produitSchema = z
  .object({
    nom: z.string().trim().min(2).max(200),
    description: z.string().max(5000).default(""),
    prix: z.number().int().min(0),
    prixReduit: z.number().int().min(0).optional(),
    categorie: id,
    univers: z.enum(UNIVERSES).default("femmes"),
    aVariantes: z.boolean().default(false),
    variantes: z.array(varianteSchema).default([]),
    stock: z.number().int().min(0).default(0),
    poids: z.number().min(0).optional(),
    statut: z.enum(PRODUCT_STATUSES).default("brouillon"),
  })
  .refine((p) => (p.prixReduit == null ? true : p.prixReduit < p.prix), {
    message: "Le prix réduit doit être inférieur au prix normal",
    path: ["prixReduit"],
  });
export type ProduitInput = z.infer<typeof produitSchema>;

// ===== Catégorie (admin, CDC 4.6)
export const categorieSchema = z.object({
  nom: z.string().trim().min(2).max(120),
  univers: z.enum(UNIVERSES).default("femmes"),
  parent: id.nullable().default(null),
  ordre: z.number().int().default(0),
  active: z.boolean().default(true),
});

// ===== Commune (admin, CDC 11.4)
export const communeSchema = z.object({
  nom: z.string().trim().min(2).max(120),
  quartiersInclus: z.string().trim().max(300).default(""),
  tarif: z.number().int().min(0),
  active: z.boolean().default(true),
  ordre: z.number().int().default(0),
});

// ===== Promotion (admin, CDC 6.2)
export const promotionSchema = z
  .object({
    nom: z.string().trim().min(2).max(160),
    type: z.enum(["pourcentage", "montant"]),
    valeur: z.number().min(0),
    cible: z.object({
      portee: z.enum(["produits", "categories"]),
      produits: z.array(id).default([]),
      categories: z.array(id).default([]),
    }),
    debut: z.coerce.date(),
    fin: z.coerce.date(),
    active: z.boolean().default(true),
  })
  .refine((p) => p.fin > p.debut, {
    message: "La date de fin doit être après la date de début",
    path: ["fin"],
  })
  .refine((p) => (p.type === "pourcentage" ? p.valeur <= 100 : true), {
    message: "Le pourcentage ne peut pas dépasser 100",
    path: ["valeur"],
  });

// ===== Actions admin
export const delaiLivraisonSchema = z.object({
  delaiLivraison: z.string().trim().min(2).max(200),
});

export const noteInterneSchema = z.object({
  noteInterne: z.string().trim().max(2000),
});

export const statutCommandeSchema = z.object({
  statut: z.enum(ORDER_STATUSES),
});

// Validation manuelle d'un paiement : motif obligatoire (CDC 10.13)
export const validationPaiementSchema = z.object({
  motif: z.string().trim().min(10).max(500),
});

// ===== Inscription / connexion
export const inscriptionSchema = z.object({
  nom: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  telephone: telephoneCI.optional(),
  motDePasse: z.string().min(8).max(100),
});

export const connexionSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  motDePasse: z.string().min(1),
});

// ===== Paramètres boutique (admin, décision D11)
// URL d'image ou de lien : https:// absolue ou chemin interne — jamais
// javascript:/data: (XSS stockée via les paramètres admin).
const urlSure = z
  .string()
  .trim()
  .refine((v) => /^https:\/\//i.test(v) || /^\/(?!\/)/.test(v), {
    message: "URL invalide (https://… ou chemin interne /…)",
  });

export const banniereSchema = z.object({
  url: urlSure.max(1000),
  publicId: z.string().trim().max(300).optional(),
  titre: z.string().trim().max(120).optional(),
  lien: urlSure.max(500).optional(),
  ordre: z.number().int().min(0).default(0),
});

// Image produit issue du formulaire admin (upload Cloudinary signé)
export const imageProduitSchema = z.object({
  publicId: z.string().trim().max(300),
  url: urlSure.max(1000),
  alt: z.string().trim().max(200).default(""),
  ordre: z.number().int().min(0).default(0),
});

export const parametresSchema = z.object({
  nomBoutique: z.string().trim().min(2).max(80),
  telephone: z.string().trim().max(30).default(""),
  whatsapp: z.string().trim().max(30).default(""),
  emailContact: z
    .union([z.literal(""), z.string().trim().toLowerCase().email()])
    .default(""),
  seuilStockFaible: z.number().int().min(0).max(1000).default(5),
  rapportEmailActif: z.boolean().default(false),
  rapportEmailDestinataire: z
    .union([z.literal(""), z.string().trim().toLowerCase().email()])
    .default(""),
  bannieres: z.array(banniereSchema).max(10).default([]),
});
export type ParametresInput = z.infer<typeof parametresSchema>;

// ===== Compte client (CDC 8.5)
export const profilSchema = z.object({
  nom: z.string().trim().min(2).max(120),
  telephone: z.union([telephoneCI, z.literal("")]).default(""),
});

export const adresseSchema = z.object({
  communeId: id,
  detail: z.string().trim().min(5).max(500),
});

export const changementMotDePasseSchema = z.object({
  actuel: z.string().min(1),
  nouveau: z.string().min(8).max(100),
});
