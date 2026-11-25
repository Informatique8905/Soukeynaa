import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getPrisma } from "@/lib/db";
import {
  initierPaiementJeko,
  journaliser,
} from "@/lib/paiement";
import { autorise, ipClient } from "@/lib/ratelimit";
import { Prisma } from "@/generated/prisma/client";
import type { MoyenPaiement } from "@/generated/prisma/enums";

// Moyens activés sur le compte Jèko (l'API exige paymentMethod)
const MOYENS_JEKO: Record<string, MoyenPaiement> = {
  wave: "wave",
  orange: "orange_money",
  mtn: "mtn_momo",
  moov: "moov_money",
  djamo: "carte",
};

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

  const prisma = getPrisma();
  let commandeId: number;
  let moyen: MoyenPaiement | undefined;
  let moyenJeko = "";
  try {
    const body = await req.json();
    commandeId = Number(body?.commandeId);
    moyenJeko = String(body?.moyen ?? "");
    moyen = MOYENS_JEKO[moyenJeko];
  } catch {
    return NextResponse.json({ erreur: "Requête invalide" }, { status: 400 });
  }
  if (!commandeId) {
    return NextResponse.json({ erreur: "commandeId requis" }, { status: 400 });
  }
  if (!moyen) {
    return NextResponse.json(
      { erreur: "Choisissez un moyen de paiement" },
      { status: 400 }
    );
  }

  const commande = await prisma.order.findUnique({
    where: { id: commandeId },
    include: { paiements: { orderBy: { createdAt: "desc" } } },
  });
  if (!commande) {
    return NextResponse.json({ erreur: "Commande introuvable" }, { status: 404 });
  }
  if (commande.statutPaiement === "confirme") {
    // Déjà payée — on renvoie l'URL de la commande, jamais une nouvelle session
    return NextResponse.json({ erreur: "Commande déjà payée" }, { status: 409 });
  }
  if (
    commande.statut !== "en_attente_paiement" ||
    commande.reservationExpireLe < new Date()
  ) {
    return NextResponse.json(
      { erreur: "Cette commande n'est plus payable" },
      { status: 410 }
    );
  }

  // Verrou commande : tentative active existante → la réutiliser
  const tentativeActive = commande.paiements.find(
    (p) => p.statut === "en_attente" || p.statut === "a_verifier"
  );
  if (tentativeActive) {
    return NextResponse.json(
      { erreur: "Un paiement est déjà en cours pour cette commande" },
      { status: 409 }
    );
  }

  // Nouvelle tentative — cleIdempotence unique (CDC 10.10)
  // Index unique partiel payments(commandeId WHERE statut actif) : deux
  // initiations concurrentes ne passent pas toutes les deux (P2002 → 409).
  let paiement;
  try {
    paiement = await prisma.payment.create({
      data: {
        commandeId: commande.id,
        referenceCommande: commande.reference,
        cleIdempotence: randomUUID(),
        montant: commande.total,
        moyen,
      },
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return NextResponse.json(
        { erreur: "Un paiement est déjà en cours pour cette commande" },
        { status: 409 }
      );
    }
    throw e;
  }
  await journaliser(prisma, paiement.id, "initiation", "Tentative créée");

  const reponse = await initierPaiementJeko({
    paiement,
    email: commande.clientEmail,
    telephone: commande.clientTelephone,
    moyen: moyenJeko,
  });

  if (!reponse.ok) {
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: paiement.id },
        data: { statut: "echoue" },
      });
      await journaliser(tx, paiement.id, "anomalie", reponse.erreur ?? "");
    });
    return NextResponse.json(
      { erreur: reponse.erreur ?? "Paiement indisponible" },
      { status: 503 }
    );
  }

  if (reponse.reference) {
    await prisma.payment.update({
      where: { id: paiement.id },
      data: { transactionJeko: reponse.reference },
    });
  }
  if (!reponse.url) {
    return NextResponse.json(
      { erreur: "Réponse Jèko incomplète" },
      { status: 502 }
    );
  }
  return NextResponse.json({ url: reponse.url });
}
