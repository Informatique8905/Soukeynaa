import { createHmac, timingSafeEqual } from "crypto";

// Preuve de propriété des commandes invité (CDC 14.5) : le cookie
// `soukeyna_orders` est une liste d'ids SIGNÉE par HMAC-SHA256 (AUTH_SECRET).
// Un visiteur qui forge `soukeyna_orders=[1,2,...]` obtient une signature
// invalide → vue masquée. Format : `${ids.join(",")}.${hmac}`.
const COOKIE = "soukeyna_orders";

function cle(): string | null {
  return process.env.AUTH_SECRET ?? null;
}

function hmac(ids: number[]): string {
  return createHmac("sha256", cle()!)
    .update(`orders:${ids.join(",")}`)
    .digest("base64url");
}

/** Sérialise la liste d'ids signée à poser dans le cookie. */
export function signerIdsCommandes(ids: number[]): string {
  const nettoyes = ids.filter((n) => Number.isInteger(n) && n > 0).slice(-20);
  return `${nettoyes.join(",")}.${hmac(nettoyes)}`;
}

/** Lit le cookie et renvoie les ids si la signature est valide, sinon []. */
export function verifierIdsCommandes(valeur: string | undefined): number[] {
  if (!valeur || !cle()) return [];
  const i = valeur.lastIndexOf(".");
  if (i < 0) return [];
  const idsBrut = valeur.slice(0, i);
  const sig = valeur.slice(i + 1);
  const ids = idsBrut === "" ? [] : idsBrut.split(",").map(Number);
  if (!ids.every((n) => Number.isInteger(n) && n > 0)) return [];
  const attendu = hmac(ids);
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(attendu))) return [];
  } catch {
    return [];
  }
  return ids;
}

// Jeton de propriété par commande : embarqué dans le lien « Finaliser mon
// paiement » du mail — prouve la détention de la commande depuis n'importe
// quel appareil, sans session ni cookie (CDC 14.5). Lien-porteur : comme le
// mail lui-même, quiconque le détient est traité en propriétaire.
export function jetonCommande(commandeId: number): string {
  return createHmac("sha256", cle()!)
    .update(`order:${commandeId}`)
    .digest("base64url");
}

export function verifierJetonCommande(
  commandeId: number,
  jeton: string | undefined
): boolean {
  if (!jeton || !cle() || !Number.isInteger(commandeId)) return false;
  try {
    return timingSafeEqual(
      Buffer.from(jeton),
      Buffer.from(jetonCommande(commandeId))
    );
  } catch {
    return false;
  }
}

export const COOKIE_COMMANDES = COOKIE;
