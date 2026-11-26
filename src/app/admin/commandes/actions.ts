"use server";

import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { restituerStockCommande } from "@/lib/stock";
import {
  notifierStatutCommande,
  envoyerDelaiLivraison,
  envoyerBonCommandeMaj,
} from "@/lib/email";
import type { StatutCommande } from "@/generated/prisma/enums";
import { noteInterneSchema } from "@/lib/validation";

// Transitions autorisées (CDC 11.8) — une commande payee ne revient jamais en arrière
const TRANSITIONS: Record<StatutCommande, StatutCommande[]> = {
  en_attente_paiement: ["annulee"],
  payee: ["en_preparation", "annulee"],
  en_preparation: ["expediee"],
  expediee: ["livree"],
  livree: [],
  annulee: [],
};

// Paiement à la livraison : rien n'est encaissé avant la remise, donc
// annulation possible tant que le colis n'est pas livré (refus du client)
const TRANSITIONS_LIVRAISON: Record<StatutCommande, StatutCommande[]> = {
  ...TRANSITIONS,
  en_preparation: ["expediee", "annulee"],
  expediee: ["livree", "annulee"],
};

export async function changerStatutCommande(
  id: number,
  nouveau: StatutCommande
) {
  await requireAdmin();
  const prisma = getPrisma();

  const result = await prisma.$transaction(async (tx) => {
    const commande = await tx.order.findUniqueOrThrow({ where: { id } });
    const livraison = commande.modePaiement === "livraison";
    const autorisees = (livraison ? TRANSITIONS_LIVRAISON : TRANSITIONS)[
      commande.statut
    ];
    if (!autorisees.includes(nouveau)) {
      throw new Error(`Transition ${commande.statut} → ${nouveau} interdite`);
    }
    // Transition conditionnelle (CDC 10.10) ; à la livraison, « livrée »
    // vaut encaissement. Toute annulation d'une commande non encaissée
    // (livraison ou en ligne impayée) clôt le statutPaiement.
    const r = await tx.order.updateMany({
      where: { id, statut: commande.statut },
      data: {
        statut: nouveau,
        ...(livraison && nouveau === "livree"
          ? { statutPaiement: "confirme", encaisseLe: new Date() }
          : nouveau === "annulee" && commande.statutPaiement !== "confirme"
            ? { statutPaiement: "annule" }
            : {}),
      },
    });
    if (r.count === 0) throw new Error("La commande a changé entre-temps");
    // Annulation → restitution du stock (CDC 5.8) ; la transition
    // conditionnelle ci-dessus garantit une seule restitution
    if (nouveau === "annulee") await restituerStockCommande(tx, id);
    return commande;
  });

  await logAudit({
    action: "commande.statut",
    entiteType: "Order",
    entiteId: id,
    avant: { statut: result.statut },
    apres: { statut: nouveau },
  });
  // Email au client (dédupliqué, CDC 12.3). À la validation (passage en
  // préparation), le client reçoit le bon de commande mis à jour — délai
  // inclus s'il a été renseigné — plutôt qu'un simple avis de statut.
  if (nouveau === "en_preparation") {
    await envoyerBonCommandeMaj(id).catch(() => false);
  } else {
    notifierStatutCommande(id).catch(() => {});
  }
  revalidatePath(`/admin/commandes/${id}`);
  revalidatePath("/admin/commandes");
}

export async function definirDelaiLivraison(
  id: number,
  delai: string
): Promise<{ ok: boolean; erreur?: string; notifie?: boolean }> {
  await requireAdmin();
  const prisma = getPrisma();
  const valeur = String(delai ?? "").trim();
  if (valeur.length < 2 || valeur.length > 200) {
    return { ok: false, erreur: "Délai invalide (2 à 200 caractères)" };
  }
  const avant = await prisma.order.findUniqueOrThrow({ where: { id } });
  await prisma.order.update({
    where: { id },
    data: { delaiLivraison: valeur },
  });
  await logAudit({
    action: "commande.delai_livraison",
    entiteType: "Order",
    entiteId: id,
    avant: { delaiLivraison: avant.delaiLivraison },
    apres: { delaiLivraison: valeur },
  });
  revalidatePath(`/admin/commandes/${id}`);
  // Email du délai au client (CDC 12.3) — await nécessaire : en serverless,
  // un envoi « fire-and-forget » peut être tué avant d'aboutir
  const notifie = await envoyerDelaiLivraison(id).catch(() => false);
  return { ok: true, notifie };
}

export async function enregistrerNoteInterne(id: number, formData: FormData) {
  await requireAdmin();
  const prisma = getPrisma();
  const parsed = noteInterneSchema.safeParse({
    noteInterne: formData.get("noteInterne"),
  });
  if (!parsed.success) throw new Error("Note invalide (2000 caractères max)");
  const note = parsed.data.noteInterne;
  await prisma.order.update({
    where: { id },
    data: { noteInterne: note },
  });
  revalidatePath(`/admin/commandes/${id}`);
}
