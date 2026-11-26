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

interface BonHtml {
  reference: string;
  clientNom: string;
  clientTelephone: string;
  communeNom: string;
  adresseLivraison: string;
  fraisLivraison: number;
  total: number;
  delaiLivraison: string | null;
  lignes: {
    nom: string;
    varianteLabel: string | null;
    quantite: number;
    total: number;
  }[];
}

// Corps « bon de commande » partagé : tableau des articles, totaux, livraison
// — réutilisé par le bon initial, le bon mis à jour et l'email de délai.
function blocBon(c: BonHtml): string {
  const lignesHtml = c.lignes
    .map(
      (l) =>
        `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${l.quantite} × ${l.nom}${l.varianteLabel ? ` <small>(${l.varianteLabel})</small>` : ""}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">${fcfa(l.total)}</td></tr>`
    )
    .join("");
  return `
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        ${lignesHtml}
        <tr><td style="padding:6px 12px">Livraison à ${c.communeNom}</td><td style="text-align:right;padding:6px 12px">${fcfa(c.fraisLivraison)}</td></tr>
        <tr><td style="padding:10px 12px;font-weight:bold">Total</td><td style="text-align:right;padding:10px 12px;font-weight:bold;color:#6b1226">${fcfa(c.total)}</td></tr>
      </table>
      <h3>Livraison</h3>
      <p>${c.adresseLivraison}, ${c.communeNom}<br/>Tél : ${c.clientTelephone}</p>`;
}

// Bon de commande — envoyé UNE SEULE FOIS à la création de la commande,
// avec un message de prise en charge, avant toute confirmation admin.
export async function envoyerBonCommande(commandeId: number) {
  const prisma = getPrisma();
  const c = await prisma.order.findUnique({
    where: { id: commandeId },
    include: { lignes: true },
  });
  if (!c || c.bonEnvoyeLe) return;

  const enAttentePaiement =
    c.modePaiement !== "livraison" && c.statutPaiement !== "confirme";
  const suite = c.modePaiement === "livraison"
    ? `Vous réglerez <strong>${fcfa(c.total)}</strong> au livreur à la réception.`
    : enAttentePaiement
      ? "Finalisez le paiement pour lancer la préparation."
      : "Votre paiement est confirmé.";

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:auto">
      <h1 style="color:#6b1226;letter-spacing:2px">SOUKEYNA</h1>
      <h2>Bon de commande ${c.reference}</h2>
      <p>Bonjour ${c.clientNom},</p>
      <p><strong>Nous traitons votre commande.</strong> ${suite} Voici votre bon de commande.</p>
      ${blocBon(c)}
      <p><a href="${process.env.AUTH_URL ?? ""}/commande/${c.reference}" style="display:inline-block;background:#1e7b4f;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">${enAttentePaiement ? "Finaliser mon paiement" : "Voir mon bon de commande en ligne"}</a></p>
      <p style="font-size:12px;color:#888">Passée le ${dateFr(c.createdAt)}. Pour tout retour ou échange, contactez-nous par téléphone ou WhatsApp.</p>
    </div>`;

  const envoye = await notifier(
    `bon_commande:${c.reference}`,
    "bon_commande",
    c.clientEmail,
    `Votre bon de commande ${c.reference}`,
    html,
    c.id
  );
  if (envoye) {
    await prisma.order.update({
      where: { id: c.id },
      data: { bonEnvoyeLe: new Date() },
    });
  } else {
    await signalerEchecEmail(
      `echec_email:${c.reference}`,
      `Bon de commande ${c.reference} non envoyé`,
      `Le bon de commande destiné à <strong>${c.clientEmail}</strong> n'a pas pu être envoyé. Le client n'a rien reçu — prévenez-le par téléphone/WhatsApp.`,
      c.id
    );
  }
}

// Bon de commande mis à jour — envoyé quand l'admin valide la commande
// (passage en préparation). Même référence ; le délai annoncé est inclus
// s'il a été renseigné. Dédoublonné par (statut, délai) : un nouvel état
// renvoie le bon, un double appel non.
export async function envoyerBonCommandeMaj(commandeId: number): Promise<boolean> {
  const prisma = getPrisma();
  const c = await prisma.order.findUnique({
    where: { id: commandeId },
    include: { lignes: true },
  });
  if (!c || !c.clientEmail) return false;
  const lien = `${process.env.AUTH_URL ?? ""}/commande/${c.reference}`;
  const ok = !!(await notifier(
    `bonmaj:${c.reference}:${c.statut}:${(c.delaiLivraison ?? "").trim().toLowerCase()}`,
    "bon_commande",
    c.clientEmail,
    `Commande ${c.reference} validée`,
    `<div style="font-family:sans-serif;max-width:560px;margin:auto">
      <h1 style="color:#6b1226;letter-spacing:2px">SOUKEYNA</h1>
      <h2>Bon de commande ${c.reference}</h2>
      <p>Bonjour ${c.clientNom},<br/>votre commande est validée et passe en préparation. Voici votre bon de commande mis à jour.</p>
      ${c.delaiLivraison ? `<p style="background:#e3f0e9;color:#15613d;padding:10px 14px;border-radius:8px;font-weight:bold">${c.delaiLivraison}</p>` : ""}
      ${blocBon(c)}
      <p><a href="${lien}" style="display:inline-block;background:#1e7b4f;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Voir mon bon de commande</a></p>
      <p style="font-size:12px;color:#888">Une question ? Répondez à cet email ou contactez-nous par téléphone/WhatsApp.</p>
    </div>`,
    c.id
  ));
  if (!ok) {
    await signalerEchecEmail(
      `echec_email_maj:${c.reference}:${c.statut}`,
      `Email client non envoyé (commande ${c.reference})`,
      `L'email destiné à <strong>${c.clientEmail}</strong> n'a pas pu partir.`,
      c.id
    );
  }
  return ok;
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
    `Commande ${c.reference} ${info.libelle}`,
    `<div style="font-family:sans-serif;max-width:560px;margin:auto">
      <h1 style="color:#6b1226;letter-spacing:2px">SOUKEYNA</h1>
      <p>Bonjour ${c.clientNom},<br/>votre commande <strong>${c.reference}</strong> est <strong>${info.libelle}</strong>.</p>
      <p><a href="${process.env.AUTH_URL ?? ""}/commande/${c.reference}" style="display:inline-block;background:#1e7b4f;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Suivre ma commande / voir le bon</a></p>
      <p>Merci de votre confiance.</p>
    </div>`,
    c.id
  );
}

// Signale à l'admin qu'un email client n'a pas pu partir (ex. domaine
// expéditeur non vérifié chez Resend). Dédupliqué par clé : un seul signal
// par échec distinct.
async function signalerEchecEmail(
  cle: string,
  sujet: string,
  detail: string,
  commandeId?: number
) {
  const admin = process.env.ADMIN_EMAIL;
  if (!admin) return;
  await notifier(
    cle,
    "alerte_admin_anomalie",
    admin,
    `[SOUKEYNA] ${sujet}`,
    `<p>${detail}</p><p style="font-size:12px;color:#888">Cause fréquente : l'expéditeur EMAIL_FROM n'est pas un domaine vérifié dans Resend — vérifiez le domaine sur resend.com/domains puis mettez à jour EMAIL_FROM.</p>`,
    commandeId
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

// Email du délai prévisionnel de livraison (CDC 11.7, 12.3) — envoyé quand
// l'admin renseigne le délai. La clé contient la valeur du délai : une
// correction déclenche un nouvel envoi, un double appel non.
export async function envoyerDelaiLivraison(commandeId: number): Promise<boolean> {
  const prisma = getPrisma();
  const c = await prisma.order.findUnique({
    where: { id: commandeId },
    include: { lignes: true },
  });
  if (!c?.delaiLivraison || !c.clientEmail) return false;
  const lien = `${process.env.AUTH_URL ?? ""}/commande/${c.reference}`;
  return !!(await notifier(
    `delai:${c.reference}:${c.delaiLivraison.trim().toLowerCase()}`,
    "delai_livraison",
    c.clientEmail,
    `Livraison prévue : ${c.delaiLivraison} · commande ${c.reference}`,
    `<div style="font-family:sans-serif;max-width:560px;margin:auto">
      <h1 style="color:#6b1226;letter-spacing:2px">SOUKEYNA</h1>
      <h2>Bon de commande ${c.reference}</h2>
      <p>Bonjour ${c.clientNom},<br/>bonne nouvelle : votre commande <strong>${c.reference}</strong> arrive bientôt. Voici votre bon de commande mis à jour.</p>
      <p style="background:#e3f0e9;color:#15613d;padding:10px 14px;border-radius:8px;font-weight:bold">${c.delaiLivraison}</p>
      ${blocBon(c)}
      <p><a href="${lien}" style="display:inline-block;background:#1e7b4f;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Voir mon bon de commande</a></p>
      <p style="font-size:12px;color:#888">Une question ? Répondez à cet email ou contactez-nous par téléphone/WhatsApp.</p>
    </div>`,
    c.id
  ));
}

// Récapitulatif de rapport automatique (CDC 13.8) — envoyé à l'admin si
// `rapportEmailActif`. Dédoublonné en amont par notifications.cleDedup.
export async function envoyerRapport(
  destinataire: string,
  granularite: string,
  periode: { debut: Date; fin: Date },
  v: {
    commandes: number;
    chiffreAffaires: number;
    panierMoyen: number;
    fraisLivraison: number;
    topProduits: { nom: string; quantite: number }[];
  }
): Promise<{ ok: boolean; erreur?: string }> {
  const label =
    granularite === "jour"
      ? "du jour"
      : granularite === "semaine"
        ? "de la semaine"
        : "du mois";
  const top = v.topProduits
    .slice(0, 5)
    .map((p) => `<li>${p.quantite} × ${p.nom}</li>`)
    .join("");
  return envoyerResend(
    destinataire,
    `Rapport ${label} du ${dateFr(periode.debut)} au ${dateFr(periode.fin)}`,
    `<div style="font-family:sans-serif;max-width:560px;margin:auto">
      <h1 style="color:#6b1226;letter-spacing:2px">SOUKEYNA</h1>
      <h2>Rapport des ventes ${label}</h2>
      <p>Période : du ${dateFr(periode.debut)} au ${dateFr(periode.fin)}</p>
      <table style="font-size:14px">
        <tr><td style="padding:4px 12px 4px 0">Commandes payées</td><td><strong>${v.commandes}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0">Chiffre d'affaires</td><td><strong>${fcfa(v.chiffreAffaires)}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0">Panier moyen</td><td><strong>${fcfa(v.panierMoyen)}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0">Frais de livraison</td><td><strong>${fcfa(v.fraisLivraison)}</strong></td></tr>
      </table>
      ${top ? `<h3>Top ventes</h3><ul>${top}</ul>` : ""}
      <p style="font-size:12px;color:#888">Rapport complet disponible dans l'administration → Rapports.</p>
    </div>`
  );
}
