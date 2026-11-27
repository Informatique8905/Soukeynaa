// Constantes métier dérivées du cahier des charges v1.1

/** Rôles utilisateurs — section 14.3 */
export const ROLES = ["client", "admin"] as const;
export type Role = (typeof ROLES)[number];

/** Univers principaux — section 4.1 */
export const UNIVERSES = ["enfants", "hommes", "femmes", "accessoires"] as const;
export type Universe = (typeof UNIVERSES)[number];

/** Statuts produit — section 5.6 */
export const PRODUCT_STATUSES = ["publie", "brouillon", "desactive"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

/** Statuts de commande — section 11.8 */
export const ORDER_STATUSES = [
  "en_attente_paiement",
  "payee",
  "en_preparation",
  "expediee",
  "livree",
  "annulee",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Statuts de paiement — section 10.5 */
export const PAYMENT_STATUSES = [
  "en_attente",
  "confirme",
  "echoue",
  "annule",
  "expire",
  "a_verifier",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** Libellés français des statuts produit — section 5.6 */
export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  publie: "Publié",
  brouillon: "Brouillon",
  desactive: "Désactivé",
};

/** Libellés français des statuts de commande — section 11.8 */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  en_attente_paiement: "En attente de paiement",
  payee: "Payée",
  en_preparation: "En préparation",
  expediee: "Expédiée",
  livree: "Livrée",
  annulee: "Annulée",
};

/** Libellés français des statuts de paiement — section 10.5 */
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  en_attente: "En attente",
  confirme: "Confirmé",
  echoue: "Échoué",
  annule: "Annulé",
  expire: "Expiré",
  a_verifier: "À vérifier",
};

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

/** Variantes de Badge par statut de commande (admin + boutique) */
export const ORDER_BADGE_VARIANT: Record<OrderStatus, BadgeVariant> = {
  en_attente_paiement: "outline",
  payee: "default",
  en_preparation: "secondary",
  expediee: "outline",
  livree: "default",
  annulee: "destructive",
};

/** Variantes de Badge par statut produit */
export const PRODUCT_BADGE_VARIANT: Record<ProductStatus, BadgeVariant> = {
  publie: "default",
  brouillon: "secondary",
  desactive: "outline",
};

/** Variantes de Badge par statut de paiement */
export const PAYMENT_BADGE_VARIANT: Record<PaymentStatus, BadgeVariant> = {
  en_attente: "secondary",
  confirme: "default",
  echoue: "destructive",
  annule: "outline",
  expire: "outline",
  a_verifier: "destructive",
};

/** Mode de règlement choisi au checkout */
export const PAYMENT_MODES = ["en_ligne", "livraison"] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];
export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  en_ligne: "Paiement en ligne",
  livraison: "Paiement à la livraison",
};

/** Moyens de paiement — section 10.2 */
export const PAYMENT_METHODS = [
  "wave",
  "orange_money",
  "mtn_momo",
  "moov_money",
  "carte",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  wave: "Wave",
  orange_money: "Orange Money",
  mtn_momo: "MTN Mobile Money",
  moov_money: "Moov Money",
  carte: "Carte bancaire",
};

/** Devise — FCFA */
export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? "FCFA";

/** Durée de réservation du stock en minutes — section 5.8 */
export const STOCK_RESERVATION_MINUTES = Number(
  process.env.STOCK_RESERVATION_MINUTES ?? 30
);

/** Coordonnées publiques de la boutique — CDC 7.8 / 18.1 */
export const BOUTIQUE = {
  adresse:
    "Riviera Attoban, non loin de la pharmacie St Bernard, en face de la Sococe — Abidjan",
  horaires: "8h – 19h",
  tel: "07 87 87 07 93",
  whatsapp: "07 87 87 07 93",
  tiktok: "https://www.tiktok.com/@soukeynakid",
  tiktokLabel: "@soukeynakid",
} as const;
