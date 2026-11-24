-- CreateEnum
CREATE TYPE "Role" AS ENUM ('client', 'admin');

-- CreateEnum
CREATE TYPE "Univers" AS ENUM ('enfants', 'hommes', 'femmes', 'accessoires');

-- CreateEnum
CREATE TYPE "StatutProduit" AS ENUM ('publie', 'brouillon', 'desactive');

-- CreateEnum
CREATE TYPE "StatutCommande" AS ENUM ('en_attente_paiement', 'payee', 'en_preparation', 'expediee', 'livree', 'annulee');

-- CreateEnum
CREATE TYPE "StatutPaiement" AS ENUM ('en_attente', 'confirme', 'echoue', 'annule', 'expire', 'a_verifier');

-- CreateEnum
CREATE TYPE "MoyenPaiement" AS ENUM ('wave', 'orange_money', 'mtn_momo', 'moov_money', 'carte');

-- CreateEnum
CREATE TYPE "TypePromotion" AS ENUM ('pourcentage', 'montant');

-- CreateEnum
CREATE TYPE "PorteePromotion" AS ENUM ('produits', 'categories');

-- CreateEnum
CREATE TYPE "TypeNotification" AS ENUM ('bon_commande', 'delai_livraison', 'expediee', 'livree', 'annulation', 'alerte_admin_commande', 'alerte_admin_anomalie', 'rapport');

-- CreateEnum
CREATE TYPE "StatutNotification" AS ENUM ('en_file', 'envoye', 'erreur');

-- CreateEnum
CREATE TYPE "TypeRapport" AS ENUM ('ventes', 'produits', 'stock', 'livraisons', 'paiements', 'promotions');

-- CreateEnum
CREATE TYPE "Granularite" AS ENUM ('jour', 'semaine', 'mois', 'perso');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT,
    "motDePasseHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'client',
    "adresses" JSONB NOT NULL DEFAULT '[]',
    "tentativesEchec" INTEGER NOT NULL DEFAULT 0,
    "bloqueJusqua" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "univers" "Univers" NOT NULL,
    "parentId" INTEGER,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "prix" INTEGER NOT NULL,
    "prixReduit" INTEGER,
    "categorieId" INTEGER NOT NULL,
    "univers" "Univers" NOT NULL,
    "images" JSONB NOT NULL DEFAULT '[]',
    "aVariantes" BOOLEAN NOT NULL DEFAULT false,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "poids" INTEGER,
    "caracteristiques" JSONB NOT NULL DEFAULT '{}',
    "statut" "StatutProduit" NOT NULL DEFAULT 'brouillon',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" SERIAL NOT NULL,
    "produitId" INTEGER NOT NULL,
    "taille" TEXT,
    "couleur" TEXT,
    "sku" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "prixReduit" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communes" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "quartiersInclus" TEXT NOT NULL DEFAULT '',
    "tarif" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" SERIAL NOT NULL,
    "cartId" TEXT,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" SERIAL NOT NULL,
    "cartId" INTEGER NOT NULL,
    "produitId" INTEGER NOT NULL,
    "varianteId" INTEGER,
    "quantite" INTEGER NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "counters" (
    "cle" TEXT NOT NULL,
    "valeur" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "counters_pkey" PRIMARY KEY ("cle")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" SERIAL NOT NULL,
    "reference" TEXT NOT NULL,
    "clientUserId" INTEGER,
    "clientNom" TEXT NOT NULL,
    "clientTelephone" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "livraisonCommuneId" INTEGER NOT NULL,
    "communeNom" TEXT NOT NULL,
    "communeTarif" INTEGER NOT NULL,
    "adresseLivraison" TEXT NOT NULL,
    "sousTotal" INTEGER NOT NULL,
    "fraisLivraison" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "statut" "StatutCommande" NOT NULL DEFAULT 'en_attente_paiement',
    "statutPaiement" "StatutPaiement" NOT NULL DEFAULT 'en_attente',
    "reservationExpireLe" TIMESTAMP(3) NOT NULL,
    "delaiLivraison" TEXT,
    "noteInterne" TEXT NOT NULL DEFAULT '',
    "bonEnvoyeLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_lines" (
    "id" SERIAL NOT NULL,
    "commandeId" INTEGER NOT NULL,
    "produitId" INTEGER NOT NULL,
    "varianteId" INTEGER,
    "nom" TEXT NOT NULL,
    "varianteLabel" TEXT NOT NULL DEFAULT '',
    "quantite" INTEGER NOT NULL,
    "prixUnitaire" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,

    CONSTRAINT "order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "commandeId" INTEGER NOT NULL,
    "referenceCommande" TEXT NOT NULL,
    "cleIdempotence" TEXT NOT NULL,
    "transactionJeko" TEXT,
    "montant" INTEGER NOT NULL,
    "moyen" "MoyenPaiement",
    "statut" "StatutPaiement" NOT NULL DEFAULT 'en_attente',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_events" (
    "id" SERIAL NOT NULL,
    "paymentId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL DEFAULT '',
    "payload" JSONB,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "type" "TypePromotion" NOT NULL,
    "valeur" INTEGER NOT NULL,
    "portee" "PorteePromotion" NOT NULL,
    "produitIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "categorieIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "debut" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "cleDedup" TEXT NOT NULL,
    "type" "TypeNotification" NOT NULL,
    "destinataire" TEXT NOT NULL,
    "commandeId" INTEGER,
    "statut" "StatutNotification" NOT NULL DEFAULT 'en_file',
    "payload" JSONB,
    "envoyeLe" TIMESTAMP(3),
    "erreur" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" SERIAL NOT NULL,
    "type" "TypeRapport" NOT NULL,
    "periodeDebut" TIMESTAMP(3) NOT NULL,
    "periodeFin" TIMESTAMP(3) NOT NULL,
    "granularite" "Granularite" NOT NULL,
    "donnees" JSONB NOT NULL,
    "genereLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "auteurId" INTEGER NOT NULL,
    "auteurNom" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entiteType" TEXT NOT NULL,
    "entiteId" INTEGER NOT NULL,
    "avant" JSONB,
    "apres" JSONB,
    "motif" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" SERIAL NOT NULL,
    "cle" TEXT NOT NULL DEFAULT 'boutique',
    "nomBoutique" TEXT NOT NULL DEFAULT 'SOUKEYNA',
    "telephone" TEXT NOT NULL DEFAULT '',
    "whatsapp" TEXT NOT NULL DEFAULT '',
    "emailContact" TEXT NOT NULL DEFAULT '',
    "bannieres" JSONB NOT NULL DEFAULT '[]',
    "rapportEmailActif" BOOLEAN NOT NULL DEFAULT false,
    "rapportEmailDestinataire" TEXT NOT NULL DEFAULT '',
    "seuilStockFaible" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_univers_parentId_ordre_idx" ON "categories"("univers", "parentId", "ordre");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_categorieId_statut_idx" ON "products"("categorieId", "statut");

-- CreateIndex
CREATE INDEX "products_statut_createdAt_idx" ON "products"("statut", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "products_univers_idx" ON "products"("univers");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- CreateIndex
CREATE INDEX "product_variants_produitId_idx" ON "product_variants"("produitId");

-- CreateIndex
CREATE UNIQUE INDEX "communes_nom_key" ON "communes"("nom");

-- CreateIndex
CREATE INDEX "communes_active_ordre_idx" ON "communes"("active", "ordre");

-- CreateIndex
CREATE UNIQUE INDEX "carts_cartId_key" ON "carts"("cartId");

-- CreateIndex
CREATE UNIQUE INDEX "carts_userId_key" ON "carts"("userId");

-- CreateIndex
CREATE INDEX "carts_updatedAt_idx" ON "carts"("updatedAt");

-- CreateIndex
CREATE INDEX "cart_items_cartId_idx" ON "cart_items"("cartId");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cartId_produitId_varianteId_key" ON "cart_items"("cartId", "produitId", "varianteId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_reference_key" ON "orders"("reference");

-- CreateIndex
CREATE INDEX "orders_statutPaiement_reservationExpireLe_idx" ON "orders"("statutPaiement", "reservationExpireLe");

-- CreateIndex
CREATE INDEX "orders_statut_createdAt_idx" ON "orders"("statut", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "orders_clientEmail_idx" ON "orders"("clientEmail");

-- CreateIndex
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "orders_livraisonCommuneId_idx" ON "orders"("livraisonCommuneId");

-- CreateIndex
CREATE INDEX "order_lines_commandeId_idx" ON "order_lines"("commandeId");

-- CreateIndex
CREATE INDEX "order_lines_produitId_idx" ON "order_lines"("produitId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_cleIdempotence_key" ON "payments"("cleIdempotence");

-- CreateIndex
CREATE UNIQUE INDEX "payments_transactionJeko_key" ON "payments"("transactionJeko");

-- CreateIndex
CREATE INDEX "payments_commandeId_statut_idx" ON "payments"("commandeId", "statut");

-- CreateIndex
CREATE INDEX "payments_statut_createdAt_idx" ON "payments"("statut", "createdAt");

-- CreateIndex
CREATE INDEX "payment_events_paymentId_idx" ON "payment_events"("paymentId");

-- CreateIndex
CREATE INDEX "promotions_active_debut_fin_idx" ON "promotions"("active", "debut", "fin");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_cleDedup_key" ON "notifications"("cleDedup");

-- CreateIndex
CREATE INDEX "notifications_statut_createdAt_idx" ON "notifications"("statut", "createdAt");

-- CreateIndex
CREATE INDEX "reports_type_periodeDebut_idx" ON "reports"("type", "periodeDebut" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_entiteType_entiteId_idx" ON "audit_logs"("entiteType", "entiteId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "settings_cle_key" ON "settings"("cle");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_livraisonCommuneId_fkey" FOREIGN KEY ("livraisonCommuneId") REFERENCES "communes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
