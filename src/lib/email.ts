import { getPrisma } from "@/lib/db";
import { fcfa, dateFr } from "./format";

// Envoi via Resend (CDC 12). Déduplication garantie par Notification.cleDedup
// unique : deux appels concurrents → un seul email part (P2002 = déjà fait).

async function envoyerResend(
  destinataire: string,
  sujet: string,
  html: string
): Promise<{ ok: boolean; erreur?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return { ok: false, erreur: "Email non configuré" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ from, to: [destinataire], subject: sujet, html }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, erreur: data?.message ?? `Resend ${res.status}` };
    }
    return { ok: true };
  } catch {
    return { ok: false, erreur: "Service email injoignable" };
  }
}

/** Envoie une notification dédupliquée. Retourne false si déjà envoyée. */
async function notifier(
  cleDedup: string,
  type:
    | "bon_commande"
    | "delai_livraison"
    | "expediee"
    | "livree"
    | "annulation"
    | "alerte_admin_commande"
    | "alerte_admin_anomalie"
    | "rapport",
  destinataire: string,
  sujet: string,
  html: string,
  commandeId?: number
) {
  const prisma = getPrisma();
  try {
    await prisma.notification.create({
      data: { cleDedup, type, destinataire, commandeId },
    });
  } catch {
    return false; // P2002 : déjà en file/envoyée (CDC 12.2)
  }
  const resultat = await envoyerResend(destinataire, sujet, html);
  await prisma.notification.update({
    where: { cleDedup },
    data: resultat.ok
      ? { statut: "envoye", envoyeLe: new Date(), payload: { sujet, html } }
      : { statut: "erreur", erreur: resultat.erreur, payload: { sujet, html } },
  });
  return resultat.ok;
}

// Bon de commande — envoyé UNE SEULE FOIS après paiement confirmé (CDC 12.2)
export async function envoyerBonCommande(commandeId: number) {
  const prisma = getPrisma();
  const c = await prisma.order.findUnique({
    where: { id: commandeId },
    include: { lignes: true },
  });
  if (!c || c.bonEnvoyeLe) return;

  const lignesHtml = c.lignes
    .map(
      (l) =>
        `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${l.quantite} × ${l.nom}${l.varianteLabel ? ` <small>(${l.varianteLabel})</small>` : ""}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">${fcfa(l.total)}</td></tr>`
    )
    .join("");

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:auto">
      <h1 style="color:#6b1226;letter-spacing:2px">SOUKEYNA</h1>
      <h2>Bon de commande ${c.reference}</h2>
      <p>Bonjour ${c.clientNom},<br/>${
        c.modePaiement === "livraison"
          ? `votre commande est confirmée. Vous réglerez <strong>${fcfa(c.total)}</strong> au livreur à la réception.`
          : "votre paiement est confirmé."
      } Voici votre bon de commande.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        ${lignesHtml}
        <tr><td style="padding:6px 12px">Livraison — ${c.communeNom}</td><td style="text-align:right;padding:6px 12px">${fcfa(c.fraisLivraison)}</td></tr>
        <tr><td style="padding:10px 12px;font-weight:bold">Total</td><td style="text-align:right;padding:10px 12px;font-weight:bold;color:#6b1226">${fcfa(c.total)}</td></tr>
      </table>
      <h3>Livraison</h3>
      <p>${c.adresseLivraison}, ${c.communeNom}<br/>Tél : ${c.clientTelephone}</p>
      <p style="font-size:12px;color:#888">Passée le ${dateFr(c.createdAt)}. Pour tout retour ou échange, contactez-nous par téléphone ou WhatsApp.</p>
    </div>`;

  const envoye = await notifier(
    `bon_commande:${c.reference}`,
    "bon_commande",
    c.clientEmail,
    `Votre bon de commande ${c.reference} — SOUKEYNA`,
    html,
    c.id
  );
  if (envoye) {
    await prisma.order.update({
      where: { id: c.id },
      data: { bonEnvoyeLe: new Date() },
    });
  }
}

// Notification de changement de statut (CDC 12.3)
export async function notifierStatutCommande(commandeId: number) {
  const prisma = getPrisma();
  const c = await prisma.order.findUnique({ where: { id: commandeId } });
  if (!c) return;
  const STATUTS: Record<string, { libelle: string; type: Parameters<typeof notifier>[1] }> = {
    en_preparation: { libelle: "en préparation", type: "delai_livraison" },
    expediee: { libelle: "en cours de livraison", type: "expediee" },
    livree: { libelle: "livrée", type: "livree" },
    annulee: { libelle: "annulée", type: "annulation" },
  };
  const info = STATUTS[c.statut];
  if (!info) return;
  await notifier(
    `statut:${c.reference}:${c.statut}`,
    info.type,
    c.clientEmail,
    `Commande ${c.reference} ${info.libelle} — SOUKEYNA`,
    `<div style="font-family:sans-serif;max-width:560px;margin:auto">
      <h1 style="color:#6b1226;letter-spacing:2px">SOUKEYNA</h1>
      <p>Bonjour ${c.clientNom},<br/>votre commande <strong>${c.reference}</strong> est <strong>${info.libelle}</strong>.</p>
      <p>Merci de votre confiance.</p>
    </div>`,
    c.id
  );
}

// Alertes admin (CDC 12.4) — commande payée ou anomalie de paiement
export async function alerterAdmin(
  type: "alerte_admin_commande" | "alerte_admin_anomalie",
  sujet: string,
  html: string,
  commandeId?: number
) {
  const admin = process.env.ADMIN_EMAIL;
  if (!admin) return;
  await notifier(
    `${type}:${sujet}:${Date.now()}`,
    type,
    admin,
    `[SOUKEYNA] ${sujet}`,
    html,
    commandeId
  );
}
