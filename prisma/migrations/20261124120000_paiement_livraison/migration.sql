-- CreateEnum
CREATE TYPE "ModePaiement" AS ENUM ('en_ligne', 'livraison');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "encaisseLe" TIMESTAMP(3),
ADD COLUMN     "modePaiement" "ModePaiement" NOT NULL DEFAULT 'en_ligne';
