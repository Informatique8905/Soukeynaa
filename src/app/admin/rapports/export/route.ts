import { getPrisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import {
  rapportVentes,
  rapportStock,
  rapportPromotions,
} from "@/lib/rapports";
import { getSettings } from "@/lib/settings";
import {
  construirePdf,
  construireXlsx,
  type CommandeExport,
} from "@/lib/export-rapport";

// Export du rapport d'activité (CDC 13.7) — formats :
//   ?format=xlsx (défaut) : classeur Excel natif, cellules exploitables
//   ?format=pdf           : document mis en page pour impression/partage
//   ?format=csv           : brut, rétrocompatibilité
export async function GET(req: Request) {
  await requireAdmin();
  const url = new URL(req.url);
  const debut = url.searchParams.get("debut");
  const fin = url.searchParams.get("fin");
  const format = url.searchParams.get("format") ?? "xlsx";
  const periode = {
    debut: debut ? new Date(debut + "T00:00:00") : new Date(0),
    fin: fin ? new Date(fin + "T23:59:59") : new Date(),
  };

  const [commandes, settings, ventes, promos] = await Promise.all([
    getPrisma().order.findMany({
      where: {
        statutPaiement: "confirme",
        createdAt: { gte: periode.debut, lte: periode.fin },
      },
      include: { lignes: true },
      orderBy: { createdAt: "desc" },
    }),
    getSettings(),
    rapportVentes(periode),
    rapportPromotions(periode),
  ]);
  const stock = await rapportStock(settings.seuilStockFaible);
  const nom = `rapport-soukeyna-${debut ?? ""}_${fin ?? ""}`;

  const lignesExport: CommandeExport[] = commandes.map((c) => ({
    reference: c.reference,
    createdAt: c.createdAt,
    clientNom: c.clientNom,
    clientTelephone: c.clientTelephone,
    communeNom: c.communeNom,
    adresseLivraison: c.adresseLivraison,
    modePaiement: c.modePaiement,
    statut: c.statut,
    sousTotal: c.sousTotal,
    fraisLivraison: c.fraisLivraison,
    total: c.total,
    articles: c.lignes.map((l) => `${l.quantite}x ${l.nom}`).join(" | "),
  }));
  const donnees = {
    periode,
    ventes,
    stock,
    promos,
    seuilStock: settings.seuilStockFaible,
    commandes: lignesExport,
  };

  if (format === "pdf") {
    const pdf = await construirePdf(donnees);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${nom}.pdf"`,
      },
    });
  }

  if (format === "csv") {
    const lignes = [
      "reference;date;client;telephone;commune;articles;sous_total;livraison;total;statut",
      ...lignesExport.map((c) =>
        [
          c.reference,
          c.createdAt.toISOString().slice(0, 10),
          csv(c.clientNom),
          csv(c.clientTelephone),
          csv(c.communeNom),
          csv(c.articles),
          c.sousTotal,
          c.fraisLivraison,
          c.total,
          c.statut,
        ].join(";")
      ),
    ];
    return new Response(lignes.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${nom}.csv"`,
      },
    });
  }

  const xlsx = await construireXlsx(donnees);
  return new Response(new Uint8Array(xlsx), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nom}.xlsx"`,
    },
  });
}

// Anti-injection de formules : une cellule commençant par = + - @ ou une
// tabulation est interprétée comme formule par Excel/LibreOffice — on la
// neutralise par une apostrophe initiale.
function csv(v: string) {
  const s = /^[=+\-@\t]/.test(v) ? `'${v}` : v;
  return `"${s.replace(/"/g, '""')}"`;
}
