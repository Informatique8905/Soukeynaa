import { NextResponse } from "next/server";
import crypto from "crypto";
import { requireAdmin } from "@/lib/admin";

// Signature pour upload direct vers Cloudinary (CDC 5.2)
// Le secret ne quitte jamais le serveur (CDC 14.6)
export async function POST(req: Request) {
  await requireAdmin();

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { erreur: "Cloudinary non configuré — renseignez les variables CLOUDINARY_* dans .env.local" },
      { status: 503 }
    );
  }

  // Le dossier signé doit être EXACTEMENT celui envoyé à Cloudinary —
  // tout écart invalide la signature (rejet 401 côté Cloudinary).
  const body = await req.json().catch(() => ({}));
  const demande = typeof body?.folder === "string" ? body.folder : "";
  const folder = /^soukeyna\/[a-z0-9/_-]{1,60}$/.test(demande)
    ? demande
    : "soukeyna/produits";

  const timestamp = Math.round(Date.now() / 1000);
  const signature = crypto
    .createHash("sha1")
    .update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`)
    .digest("hex");

  return NextResponse.json({ cloudName, apiKey, timestamp, signature, folder });
}
