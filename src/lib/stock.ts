import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";

type Db = Prisma.TransactionClient | ReturnType<typeof getPrisma>;

// Libère le stock réservé d'une commande (CDC 5.8) : ré-incrémente chaque
// ligne. Idempotent via le statut de la commande — à appeler uniquement
// quand la commande passe à un état non payé/terminal.
export async function libererStock(db: Db, commandeId: number) {
  const commande = await db.order.findUnique({
    where: { id: commandeId },
    include: { lignes: true },
  });
  if (!commande || commande.statutPaiement === "confirme") return;
  // Déjà libéré ? (annulée avec stock restitué)
  if (commande.statut === "annulee") return;
  await restituerLignes(db, commande.lignes);
}

// Restitution inconditionnelle — à appeler UNIQUEMENT juste après une
// transition conditionnelle réussie vers « annulee » (updateMany count = 1),
// qui garantit à elle seule l'exécution unique.
export async function restituerStockCommande(db: Db, commandeId: number) {
  const lignes = await db.orderLine.findMany({ where: { commandeId } });
  await restituerLignes(db, lignes);
}

async function restituerLignes(
  db: Db,
  lignes: { varianteId: number | null; produitId: number; quantite: number }[]
) {
  for (const l of lignes) {
    if (l.varianteId) {
      await db.productVariant.update({
        where: { id: l.varianteId },
        data: { stock: { increment: l.quantite } },
      });
    } else {
      await db.product.update({
        where: { id: l.produitId },
        data: { stock: { increment: l.quantite } },
      });
    }
  }
}
