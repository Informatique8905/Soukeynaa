import { NextResponse } from "next/server";
import crypto from "crypto";
import { requireAdmin } from "@/lib/admin";

// Signature pour upload direct vers Cloudinary (CDC 5.2)
// Le secret ne quitte jamais le serveur (CDC 14.6)
export async function POST() {
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

  const timestamp = Math.round(Date.now() / 1000);
  const folder = "soukeyna/produits";
  const signature = crypto
    .createHash("sha1")
    .update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`)
    .digest("hex");

  return NextResponse.json({ cloudName, apiKey, timestamp, signature, folder });
}
