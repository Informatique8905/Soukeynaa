-- Verrous applicatifs renforcés côté base (conception R5, CDC 10.10)

-- Une seule tentative de paiement active (en_attente / a_verifier) par
-- commande : deux initiations concurrentes ne peuvent plus créer deux
-- sessions Jèko payables. L'application capture P2002 → 409.
CREATE UNIQUE INDEX "payments_commande_active_unique"
  ON "payments" ("commandeId")
  WHERE "statut" IN ('en_attente', 'a_verifier');

-- L'index @@unique(cartId, produitId, varianteId) n'empêche pas les doublons
-- quand varianteId IS NULL (NULLs distincts en Postgres). Index expression
-- sur COALESCE → une seule ligne par (panier, produit, variante).
CREATE UNIQUE INDEX "cart_items_dedup_unique"
  ON "cart_items" ("cartId", "produitId", COALESCE("varianteId", 0));
