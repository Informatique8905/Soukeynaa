"use server";

import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { envoyerBonCommande } from "@/lib/email";

// Résolution manuelle d'un paiement `a_verifier` après contrôle sur le
// portail Jèko (CDC 10.13) : motif obligatoire + journalisation.
export async function resoudrePaiement(
  id: number,
  resolution: "confirme" | "rejete",
  formData: FormData
) {
  await requireAdmin();
  const prisma = getPrisma();
  const motif = String(formData.get("motif") ?? "").trim();
  if (motif.length < 10) {
    throw new Error("Motif obligatoire (10 caractères minimum) — CDC 10.13");
  }

  const paiement = await prisma.$transaction(async (tx) => {
    const paiement = await tx.payment.findUniqueOrThrow({ where: { id } });
    if (paiement.statut !== "a_verifier") {
      throw new Error("Seuls les paiements « à vérifier » sont résolubles ici");
    }

    const nouveau = resolution === "confirme" ? "confirme" : "echoue";
    const r = await tx.payment.updateMany({
      where: { id, statut: "a_verifier" },
      data: { statut: nouveau },
    });
    if (r.count === 0) throw new Error("Paiement déjà traité");

    await tx.paymentEvent.create({
      data: {
        paymentId: id,
        type: "resolution_manuelle",
        message: `Résolution admin : ${nouveau} — ${motif}`,
      },
    });

    if (resolution === "confirme") {
      // Transition conditionnelle : uniquement si pas déjà confirmée (CDC 10.10)
      const commande = await tx.order.updateMany({
        where: {
          id: paiement.commandeId,
          statut: "en_attente_paiement",
          statutPaiement: { not: "confirme" },
        },
        data: { statut: "payee", statutPaiement: "confirme" },
      });
      if (commande.count === 0) {
        throw new Error(
          "Commande déjà payée ou annulée — ne pas confirmer ce paiement"
        );
      }
    }

    return paiement;
  });

  // Bon de commande au client quand la confirmation est manuelle (CDC 12.2)
  if (resolution === "confirme") {
    envoyerBonCommande(paiement.commandeId).catch(() => {});
  }

  await logAudit({
    action: `paiement.${resolution === "confirme" ? "valide_manuellement" : "rejete_manuellement"}`,
    entiteType: "Payment",
    entiteId: id,
    apres: { resolution },
    motif,
  });
  revalidatePath("/admin/paiements");
}
