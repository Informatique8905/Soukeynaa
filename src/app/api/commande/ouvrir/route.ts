import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPrisma } from "@/lib/db";
import { autorise, ipClient } from "@/lib/ratelimit";
import {
  COOKIE_COMMANDES,
  signerIdsCommandes,
  verifierIdsCommandes,
  verifierJetonCommande,
} from "@/lib/ownership";

// Lien « Finaliser mon paiement » du mail (CDC 14.5) : le jeton signé
// prouve la propriété de la commande et équivaut au cookie invité — posé
// ici même, la page de suivi et /api/paiement/initier reconnaissent alors
// le visiteur comme propriétaire, quel que soit l'appareil.
export async function GET(req: Request) {
  if (!autorise(`ouvrir:${ipClient(req)}`, 30, 600_000)) {
    return NextResponse.json({ erreur: "Trop de tentatives" }, { status: 429 });
  }
  const { searchParams } = new URL(req.url);
  const reference = searchParams.get("ref") ?? "";
  const jeton = searchParams.get("jeton") ?? "";
  const site = process.env.AUTH_URL ?? new URL(req.url).origin;

  const commande = await getPrisma().order.findUnique({
    where: { reference },
    select: { id: true },
  });
  if (!commande || !verifierJetonCommande(commande.id, jeton)) {
    return NextResponse.redirect(`${site}/commandes`);
  }

  // Ajoute la commande au cookie signé existant (même format que checkout)
  const store = await cookies();
  const ids = verifierIdsCommandes(store.get(COOKIE_COMMANDES)?.value);
  if (!ids.includes(commande.id)) ids.push(commande.id);
  store.set(COOKIE_COMMANDES, signerIdsCommandes(ids), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 90 * 24 * 3600,
  });

  return NextResponse.redirect(`${site}/commande/${reference}`);
}
