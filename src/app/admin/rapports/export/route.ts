import { getPrisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

// Export CSV des commandes payées de la période (CDC 13.7)
export async function GET(req: Request) {
  await requireAdmin();
  const url = new URL(req.url);
  const debut = url.searchParams.get("debut");
  const fin = url.searchParams.get("fin");
  const periode = {
    gte: debut ? new Date(debut + "T00:00:00") : new Date(0),
    lte: fin ? new Date(fin + "T23:59:59") : new Date(),
  };

  const commandes = await getPrisma().order.findMany({
    where: { statutPaiement: "confirme", createdAt: periode },
    include: { lignes: true },
    orderBy: { createdAt: "desc" },
  });

  const lignes = [
    "reference;date;client;telephone;commune;articles;sous_total;livraison;total;statut",
    ...commandes.map((c) =>
      [
        c.reference,
        c.createdAt.toISOString().slice(0, 10),
        csv(c.clientNom),
        csv(c.clientTelephone),
        csv(c.communeNom),
        c.lignes.map((l) => `${l.quantite}x ${csv(l.nom)}`).join(" | "),
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
      "Content-Disposition": `attachment; filename="rapport-soukeyna-${debut ?? ""}_${fin ?? ""}.csv"`,
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
