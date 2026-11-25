import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getPrisma } from "@/lib/db";
import { inscriptionSchema } from "@/lib/validation";
import { autorise, ipClient } from "@/lib/ratelimit";

export async function POST(req: Request) {
  // Limitation : 5 inscriptions / heure / IP (CDC 14.4)
  if (!autorise(`inscription:${ipClient(req)}`, 5, 3600_000)) {
    return NextResponse.json(
      { erreur: "Trop de tentatives — réessayez plus tard" },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = inscriptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { erreur: parsed.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 }
    );
  }

  const { nom, email, telephone, motDePasse } = parsed.data;
  const prisma = getPrisma();

  const existe = await prisma.user.findUnique({ where: { email } });
  if (existe) {
    return NextResponse.json(
      { erreur: "Un compte existe déjà avec cet email" },
      { status: 409 }
    );
  }

  await prisma.user.create({
    data: {
      nom,
      email,
      telephone: telephone ?? null,
      motDePasseHash: await bcrypt.hash(motDePasse, 12),
      role: "client",
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
