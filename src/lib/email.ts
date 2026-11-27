import { getPrisma } from "@/lib/db";
import { jetonCommande } from "@/lib/ownership";
import { fcfa, dateFr, dateHeureFr } from "./format";
import { BOUTIQUE } from "@/lib/constants";

// Envoi d'emails (CDC 12). Déduplication garantie par Notification.cleDedup
// unique : deux appels concurrents → un seul email part (P2002 = déjà fait).
//
// Fournisseurs (dans l'ordre de priorité) :
//   1. Brevo   — BREVO_API_KEY : envoi possible vers n'importe quel client
//                dès que l'expéditeur EMAIL_FROM est validé (clic dans le
//                mail de vérification, pas de DNS à configurer).
//   2. Resend  — RESEND_API_KEY : exige un domaine vérifié pour écrire aux
//                clients ; "onboarding@resend.dev" = sandbox, n'atteint que
//                l'adresse du compte Resend.

const MAIL_REGEX = /^(?:"([^"]+)"|([^<]*?))\s*<([^>\s]+)>$/;

function parseFrom(): { email: string; name: string } | null {
  const brut = (process.env.EMAIL_FROM ?? "")
    .trim()
    .replace(/^"+|"+$/g, "")
    .trim();
  if (!brut) return null;
  const m = MAIL_REGEX.exec(brut);
  if (m) return { email: m[3], name: (m[1] ?? m[2] ?? "SOUKEYNA").trim() };
  return { email: brut, name: "SOUKEYNA" };
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function envoyerBrevo(
  destinataire: string,
  sujet: string,
  html: string
): Promise<{ ok: boolean; erreur?: string }> {
  const key = process.env.BREVO_API_KEY;
  const from = parseFrom();
  if (!key || !from) return { ok: false, erreur: "Brevo non configuré" };
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": key },
      body: JSON.stringify({
        sender: { email: from.email, name: from.name },
        to: [{ email: destinataire }],
        subject: sujet,
        htmlContent: html,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, erreur: data?.message ?? `Brevo ${res.status}` };
    }
    return { ok: true };
  } catch {
    return { ok: false, erreur: "Service email injoignable" };
  }
}

async function envoyerResend(
  destinataire: string,
  sujet: string,
  html: string
): Promise<{ ok: boolean; erreur?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return { ok: false, erreur: "Resend non configuré" };
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

async function envoyerEmail(
  destinataire: string,
  sujet: string,
  html: string
): Promise<{ ok: boolean; erreur?: string }> {
  if (process.env.BREVO_API_KEY) return envoyerBrevo(destinataire, sujet, html);
  return envoyerResend(destinataire, sujet, html);
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
    // P2002 : la notification existe déjà. Un échec passé ne doit pas
    // bloquer définitivement l'envoi — on le réclame atomiquement et on
    // retente ; un envoi réussi ou en cours reste, lui, dédupliqué.
    const r = await prisma.notification.updateMany({
      where: { cleDedup, statut: "erreur" },
      data: { statut: "en_file", erreur: null, destinataire, commandeId },
    });
    if (r.count === 0) return false; // envoyée ou en cours (CDC 12.2)
  }
  const resultat = await envoyerEmail(destinataire, sujet, html);
  await prisma.notification.update({
    where: { cleDedup },
    data: resultat.ok
      ? { statut: "envoye", envoyeLe: new Date(), payload: { sujet, html } }
      : { statut: "erreur", erreur: resultat.erreur, payload: { sujet, html } },
  });
  return resultat.ok;
}

// Alertes email admin : désactivées par défaut — le tableau de bord
// suffit (CDC 12.4 couvert côté interface). Définir ALERTES_ADMIN_EMAIL=on
// pour les réactiver.
function alertesAdminActives(): boolean {
  return process.env.ALERTES_ADMIN_EMAIL === "on";
}

// Signale à l'admin qu'un email client n'a pas pu partir (ex. expéditeur
// non vérifié). Dédupliqué par clé : un seul signal par échec.
async function signalerEchecEmail(
  cle: string,
  sujet: string,
  detail: string,
  commandeId?: number
) {
  const admin = process.env.ADMIN_EMAIL;
  if (!admin || !alertesAdminActives()) return;
  await notifier(
    cle,
    "alerte_admin_anomalie",
    admin,
    `[SOUKEYNA] ${sujet}`,
    `<p>${detail}</p><p style="font-size:12px;color:#888">Cause fréquente : l'expéditeur EMAIL_FROM n'est pas vérifié chez le fournisseur (domaine Resend à valider, ou configurez BREVO_API_KEY avec un expéditeur Brevo validé).</p>`,
    commandeId
  );
}

interface BonHtml {
  reference: string;
  createdAt: Date;
  clientNom: string;
  clientTelephone: string;
  communeNom: string;
  adresseLivraison: string;
  fraisLivraison: number;
  sousTotal: number;
  total: number;
  delaiLivraison: string | null;
  modePaiement: string;
  statutPaiement: string;
  lignes: {
    nom: string;
    varianteLabel: string | null;
    quantite: number;
    prixUnitaire: number;
    total: number;
  }[];
}

// Carte « bon » au format du site — tableaux + styles inline (compatible
// messageries). titreDoc : « BON DE COMMANDE » ou « BON DE LIVRAISON ».
function carteBon(c: BonHtml, titreDoc: string): string {
  const base = (process.env.AUTH_URL ?? "").replace(/\/+$/, "");
  const logo = `${base}/logo-soukeyna.png`;
  const aLaLivraison = c.modePaiement === "livraison";
  const aRegler = aLaLivraison && c.statutPaiement !== "confirme";

  const lignes = c.lignes
    .map(
      (l) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #eee;vertical-align:top">
            <div style="font-size:14px;font-weight:600;color:#1a1a1a">${esc(l.nom)}</div>
            <div style="font-size:12px;color:#777">${l.varianteLabel ? esc(l.varianteLabel) + " · " : ""}${l.quantite} × ${fcfa(l.prixUnitaire)}</div>
          </td>
          <td align="right" style="padding:12px 0;border-bottom:1px solid #eee;font-size:14px;font-weight:700;color:#1a1a1a;white-space:nowrap;vertical-align:top">${fcfa(l.total)}</td>
        </tr>`
    )
    .join("");

  const delai = c.delaiLivraison
    ? `<tr><td style="padding:0 24px 16px">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="background:#e3f0e9;border-radius:14px;padding:12px 16px">
            <span style="display:inline-block;background:#1e7b4f;color:#fff;border-radius:999px;width:24px;height:24px;line-height:24px;text-align:center;font-size:13px">✓</span>
            <span style="font-size:14px;font-weight:700;color:#15613d;padding-left:8px">${esc(c.delaiLivraison)}</span>
          </td>
        </tr></table>
      </td></tr>`
    : "";

  const badge = aLaLivraison
    ? `<span style="display:inline-block;background:#fef3c7;color:#92400e;border-radius:999px;padding:5px 12px;font-size:11px;font-weight:700">Paiement à la livraison</span>`
    : `<span style="display:inline-block;background:#e3f0e9;color:#15613d;border-radius:999px;padding:5px 12px;font-size:11px;font-weight:700">Paiement en ligne${c.statutPaiement === "confirme" ? " · confirmé" : ""}</span>`;

  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #eee">
    <tr>
      <td style="background:#3f0d1e;padding:18px 22px">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td>
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="background:#ffffff;border-radius:10px;padding:5px 9px">
                <img src="${logo}" alt="SOUKEYNA" height="28" style="display:block;height:28px;width:auto"/>
              </td>
              <td style="padding-left:10px">
                <div style="font-size:14px;font-weight:800;color:#ffffff;letter-spacing:1px">SOUKEYNA</div>
                <div style="font-size:11px;color:rgba(255,255,255,.7)">Abidjan · Côte d'Ivoire</div>
              </td>
            </tr></table>
          </td>
          <td align="right" style="vertical-align:middle">
            <div style="font-size:10px;font-weight:700;letter-spacing:3px;color:rgba(255,255,255,.6)">${titreDoc}</div>
            <div style="font-size:14px;font-weight:800;color:#ffffff">${esc(c.reference)}</div>
            <div style="font-size:11px;color:rgba(255,255,255,.7)">${dateHeureFr(c.createdAt)}</div>
          </td>
        </tr></table>
      </td>
    </tr>
    <tr><td style="padding:18px 22px 8px">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td width="48%" style="vertical-align:top">
          <div style="font-size:10px;font-weight:700;letter-spacing:2px;color:#888">CLIENT</div>
          <div style="font-size:14px;font-weight:700;color:#1a1a1a;padding-top:4px">${esc(c.clientNom)}</div>
          <div style="font-size:13px;color:#777">${esc(c.clientTelephone)}</div>
        </td>
        <td width="4%"></td>
        <td width="48%" style="vertical-align:top">
          <div style="font-size:10px;font-weight:700;letter-spacing:2px;color:#888">LIVRAISON</div>
          <div style="font-size:14px;font-weight:700;color:#1a1a1a;padding-top:4px">${esc(c.communeNom)}</div>
          <div style="font-size:13px;color:#777">${esc(c.adresseLivraison)}</div>
        </td>
      </tr></table>
    </td></tr>
    ${delai}
    <tr><td style="padding:8px 22px 0">
      <table width="100%" cellpadding="0" cellspacing="0">${lignes}</table>
    </td></tr>
    <tr><td style="padding:14px 22px 16px;border-top:1px solid #eee">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:13px;color:#777;padding:3px 0">Sous-total</td>
          <td align="right" style="font-size:13px;color:#777;padding:3px 0;white-space:nowrap">${fcfa(c.sousTotal)}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:#777;padding:3px 0">Livraison à ${esc(c.communeNom)}</td>
          <td align="right" style="font-size:13px;color:#777;padding:3px 0;white-space:nowrap">${fcfa(c.fraisLivraison)}</td>
        </tr>
        <tr>
          <td style="font-size:15px;font-weight:800;color:#1a1a1a;padding-top:8px">${aRegler ? "À payer au livreur" : "Total"}</td>
          <td align="right" style="font-size:17px;font-weight:800;color:#1e7b4f;padding-top:8px;white-space:nowrap">${fcfa(c.total)}</td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="background:#f6f4ef;border-top:1px solid #eee;padding:12px 22px">
      ${badge}${aRegler ? `<span style="font-size:11px;color:#777;padding-left:8px">Préparez le montant exact</span>` : ""}
    </td></tr>
  </table>`;
}

// Cadre commun : fond crème, message d'intro, carte bon, bouton, pied.
function cadreMail(
  intro: string,
  corps: string,
  cta?: { url: string; label: string }
): string {
  const bouton = cta
    ? `<tr><td align="center" style="padding:20px 0 4px">
        <a href="${cta.url}" style="display:inline-block;background:#1e7b4f;color:#ffffff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px">${cta.label}</a>
      </td></tr>`
    : "";
  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4ef;font-family:Arial,Helvetica,sans-serif">
    <tr><td align="center" style="padding:24px 12px">
      <table width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px">
        <tr><td style="padding:0 6px 16px;font-size:14px;color:#333;line-height:1.55">${intro}</td></tr>
        <tr><td>${corps}</td></tr>
        ${bouton}
        <tr><td align="center" style="padding:18px 10px 0;font-size:11px;color:#999">
          Merci de votre confiance. SOUKEYNA, Abidjan. Pour tout retour ou échange, contactez-nous par téléphone ou WhatsApp.
        </td></tr>
      </table>
    </td></tr>
  </table>`;
}

// Bon de commande — envoyé UNE SEULE FOIS à la création de la commande,
// avec un message de prise en charge, avant toute confirmation admin.
// Lien de suivi envoyé par email : passe par /api/commande/ouvrir qui
// pose le cookie de propriété signé — le client peut payer/voir le bon
// depuis n'importe quel appareil (CDC 14.5).
function lienCommande(c: { id: number; reference: string }): string {
  const site = process.env.AUTH_URL ?? "";
  return `${site}/api/commande/ouvrir?ref=${encodeURIComponent(
    c.reference
  )}&jeton=${jetonCommande(c.id)}`;
}

export async function envoyerBonCommande(
  commandeId: number,
  opts?: { manuel?: boolean }
) {
  const prisma = getPrisma();
  const c = await prisma.order.findUnique({
    where: { id: commandeId },
    include: { lignes: true },
  });
  if (!c || !c.clientEmail) return;
  if (c.bonEnvoyeLe && !opts?.manuel) return;

  const enAttentePaiement =
    c.modePaiement !== "livraison" && c.statutPaiement !== "confirme";
  const suite =
    c.modePaiement === "livraison"
      ? `Vous réglerez <strong>${fcfa(c.total)}</strong> au livreur à la réception.`
      : enAttentePaiement
        ? "Finalisez le paiement pour lancer la préparation."
        : "Votre paiement est confirmé.";

  const lien = lienCommande(c);
  const html = cadreMail(
    `Bonjour <strong>${esc(c.clientNom)}</strong>,<br/>
     <strong>Nous traitons votre commande.</strong> ${suite}<br/>
     Voici votre bon de commande :`,
    carteBon(c, "BON DE COMMANDE"),
    {
      url: lien,
      label: enAttentePaiement
        ? "Finaliser mon paiement"
        : "Voir mon bon de commande en ligne",
    }
  );

  const envoye = await notifier(
    opts?.manuel
      ? `bonrenvoi:${c.reference}:${Date.now()}`
      : `bon_commande:${c.reference}`,
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
    const n = await prisma.notification.findUnique({
      where: { cleDedup: `bon_commande:${c.reference}` },
    });
    await signalerEchecEmail(
      `echec_email:${c.reference}`,
      `Bon de commande ${c.reference} non envoyé`,
      `Le bon de commande destiné à <strong>${esc(c.clientEmail)}</strong> n'a pas pu être envoyé. Le client n'a rien reçu — prévenez-le par téléphone/WhatsApp.${n?.erreur ? `<br/>Motif : ${esc(n.erreur)}` : ""}`,
      c.id
    );
  }
}

// Copie du bon à la boutique : même document que le client, envoyé dès
// qu'une commande devient ferme — à la livraison à la création, en ligne
// après paiement confirmé (décision métier, CDC 12.4).
export async function envoyerBonAdmin(commandeId: number) {
  const admin = process.env.ADMIN_EMAIL || BOUTIQUE.email;
  const prisma = getPrisma();
  const c = await prisma.order.findUnique({
    where: { id: commandeId },
    include: { lignes: true },
  });
  if (!c) return;
  const site = (process.env.AUTH_URL ?? "").replace(/\/+$/, "");
  await notifier(
    `bon_admin:${c.reference}`,
    "alerte_admin_commande",
    admin,
    `[SOUKEYNA] Nouvelle commande ${c.reference} — ${c.clientNom}`,
    cadreMail(
      `Une commande a été effectuée par <strong>${esc(c.clientNom)}</strong> (${esc(c.clientTelephone)}, ${esc(c.communeNom)}).${c.modePaiement === "livraison" ? " Paiement à la livraison." : " Paiement en ligne confirmé."}`,
      carteBon(c, "BON DE COMMANDE"),
      {
        url: `${site}/admin/commandes/${c.id}`,
        label: "Voir la commande dans l'admin",
      }
    ),
    c.id
  );
}

// Pas d'emails de changement de statut au client (préparation, expédition,
// livraison, annulation) — décision métier : seul le délai de livraison
// notifie le client, avec le bon de commande joint (envoyerDelaiLivraison).

// Alertes admin (CDC 12.4) — commande payée ou anomalie de paiement
export async function alerterAdmin(
  type: "alerte_admin_commande" | "alerte_admin_anomalie",
  sujet: string,
  html: string,
  commandeId?: number
) {
  const admin = process.env.ADMIN_EMAIL;
  if (!admin || !alertesAdminActives()) return;
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
// l'admin renseigne le créneau : le client reçoit le bon de livraison.
// La clé contient la valeur du délai : une correction déclenche un nouvel
// envoi, un double appel non.
export async function envoyerDelaiLivraison(commandeId: number): Promise<boolean> {
  const prisma = getPrisma();
  const c = await prisma.order.findUnique({
    where: { id: commandeId },
    include: { lignes: true },
  });
  if (!c?.delaiLivraison || !c.clientEmail) return false;
  const lien = lienCommande(c);
  const ok = !!(await notifier(
    `delai:${c.reference}:${c.delaiLivraison.trim().toLowerCase()}`,
    "delai_livraison",
    c.clientEmail,
    `Livraison prévue : ${c.delaiLivraison} · commande ${c.reference}`,
    cadreMail(
      `Bonjour <strong>${esc(c.clientNom)}</strong>,<br/>
       bonne nouvelle : votre commande <strong>${esc(c.reference)}</strong> arrive bientôt.
       Voici votre bon de livraison :`,
      carteBon(c, "BON DE LIVRAISON"),
      { url: lien, label: "Voir mon bon de commande" }
    ),
    c.id
  ));
  if (!ok) {
    await signalerEchecEmail(
      `echec_email_delai:${c.reference}`,
      `Email client non envoyé (commande ${c.reference})`,
      `L'email destiné à <strong>${esc(c.clientEmail)}</strong> n'a pas pu partir.`,
      c.id
    );
  }
  return ok;
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
    .map((p) => `<li>${p.quantite} × ${esc(p.nom)}</li>`)
    .join("");
  return envoyerEmail(
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
