import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { fenetre, rapportVentes, rapportStock } from "@/lib/rapports";
import { getSettings } from "@/lib/settings";
import { envoyerRapport } from "@/lib/email";
import { dateFr } from "@/lib/format";
type Granularite = "jour" | "semaine" | "mois";

// Génération automatique des rapports (CDC 13.8) : instantanés ventes
// jour / semaine / mois + rapport stock, persistés dans `reports`.
// Appel : Authorization: Bearer $CRON_SECRET  —  ?granularite=jour|semaine|mois|tous
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const url = new URL(req.url);
  const demande = url.searchParams.get("granularite") ?? "jour";
  const granularites: Granularite[] =
    demande === "tous"
      ? ["jour", "semaine", "mois"]
      : demande === "semaine" || demande === "mois"
        ? [demande]
        : ["jour"];

  const prisma = getPrisma();
  const settings = await getSettings();
  const generes: string[] = [];

  for (const g of granularites) {
    const periode = fenetre(g);
    const donnees = await rapportVentes(periode);
    // Un instantané par (type, granularité, période) — remplace l'ancien
    await prisma.report.deleteMany({
      where: { type: "ventes", granularite: g, periodeDebut: periode.debut },
    });
    await prisma.report.create({
      data: {
        type: "ventes",
        granularite: g,
        periodeDebut: periode.debut,
        periodeFin: periode.fin,
        donnees: donnees as unknown as object,
      },
    });
    generes.push(`ventes/${g} ${dateFr(periode.debut)}`);

    // Rapport stock associé aux rapports hebdo/mensuels
    if (g !== "jour") {
      const stock = await rapportStock(settings.seuilStockFaible);
      await prisma.report.create({
        data: {
          type: "stock",
          granularite: g,
          periodeDebut: periode.debut,
          periodeFin: periode.fin,
          donnees: stock as unknown as object,
        },
      });
      generes.push(`stock/${g}`);
    }

    // Récapitulatif par email si activé (CDC 13.8) — clé dédup par période
    if (settings.rapportEmailActif && settings.rapportEmailDestinataire) {
      const cleDedup = `rapport:${g}:${periode.debut.toISOString().slice(0, 10)}`;
      try {
        await prisma.notification.create({
          data: {
            cleDedup,
            type: "rapport",
            destinataire: settings.rapportEmailDestinataire,
            payload: {
              granularite: g,
              debut: periode.debut.toISOString(),
              fin: periode.fin.toISOString(),
            },
          },
        });
      } catch {
        continue; // P2002 : déjà envoyé pour cette période
      }
      const res = await envoyerRapport(
        settings.rapportEmailDestinataire,
        g,
        periode,
        donnees
      );
      await prisma.notification.update({
        where: { cleDedup },
        data: res.ok
          ? { statut: "envoye", envoyeLe: new Date() }
          : { statut: "erreur", erreur: res.erreur },
      });
    }
  }

  return NextResponse.json({ ok: true, generes });
}
