import { NextResponse } from "next/server";
import { initierTentative } from "@/lib/paiement";
import { autorise, ipClient } from "@/lib/ratelimit";

// Initiation d'une tentative de paiement (CDC 10.2)
// Anti-double-paiement : verrou au niveau commande — une seule tentative
// active (en_attente / a_verifier) par commande.
export async function POST(req: Request) {
  // Limitation : 10 initiations / 10 min / IP (CDC 14.4)
  if (!autorise(`paiement:${ipClient(req)}`, 10, 600_000)) {
    return NextResponse.json(
      { erreur: "Trop de tentatives — réessayez plus tard" },
      { status: 429 }
    );
  }

  let commandeId: number;
  let moyenJeko = "";
  try {
    const body = await req.json();
    commandeId = Number(body?.commandeId);
    moyenJeko = String(body?.moyen ?? "");
  } catch {
    return NextResponse.json({ erreur: "Requête invalide" }, { status: 400 });
  }
  if (!commandeId) {
    return NextResponse.json({ erreur: "commandeId requis" }, { status: 400 });
  }

  const res = await initierTentative({ commandeId, moyenJeko });
  if (!res.ok) {
    return NextResponse.json({ erreur: res.erreur }, { status: res.code });
  }
  return NextResponse.json({ url: res.url });
}
