import { getPrisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

// Calcul des rapports (CDC 13.8) — seules les commandes au paiement
// `confirme` entrent dans le chiffre d'affaires. Montants figés (CDC 9.5).
type Db = Prisma.TransactionClient | ReturnType<typeof getPrisma>;

export interface Periode {
  debut: Date;
  fin: Date;
}

export interface RapportVentes {
  commandes: number;
  chiffreAffaires: number;
  fraisLivraison: number;
  panierMoyen: number;
  parJour: { jour: string; commandes: number; ca: number }[];
  parUnivers: { univers: string; quantite: number; ca: number }[];
  topProduits: { nom: string; quantite: number; ca: number }[];
  parCommune: { commune: string; commandes: number; frais: number }[];
  paiements: { statut: string; nombre: number }[];
  parMoyen: { moyen: string; nombre: number; montant: number }[];
}

export async function rapportVentes(periode: Periode, db?: Db): Promise<RapportVentes> {
  const prisma = db ?? getPrisma();
  const where = {
    statutPaiement: "confirme" as const,
    createdAt: { gte: periode.debut, lte: periode.fin },
  };

  const [agg, commandes, lignes, parCommune, paiements, parMoyen] =
    await Promise.all([
      prisma.order.aggregate({
        where,
        _sum: { total: true, fraisLivraison: true },
        _count: true,
      }),
      // Détail par jour : on agrège en mémoire (volumes modestes, mono-boutique)
      prisma.order.findMany({
        where,
        select: { createdAt: true, total: true },
      }),
      prisma.orderLine.groupBy({
        by: ["nom", "produitId"],
        where: { commande: where },
        _sum: { quantite: true, total: true },
      }),
      prisma.order.groupBy({
        by: ["communeNom"],
        where,
        _count: true,
        _sum: { fraisLivraison: true },
        orderBy: { _count: { communeNom: "desc" } },
      }),
      prisma.payment.groupBy({
        by: ["statut"],
        where: { createdAt: { gte: periode.debut, lte: periode.fin } },
        _count: true,
      }),
      prisma.payment.groupBy({
        by: ["moyen"],
        where: {
          createdAt: { gte: periode.debut, lte: periode.fin },
          moyen: { not: null },
        },
        _count: true,
        _sum: { montant: true },
      }),
    ]);

  // Univers : rejointe produit par produitId
  const produitIds = [...new Set(lignes.map((l) => l.produitId))];
  const universMap = new Map<number, string>();
  if (produitIds.length) {
    const produits = await prisma.product.findMany({
      where: { id: { in: produitIds } },
      select: { id: true, univers: true },
    });
    for (const p of produits) universMap.set(p.id, p.univers);
  }
  const parUnivers = new Map<string, { quantite: number; ca: number }>();
  for (const l of lignes) {
    const u = universMap.get(l.produitId) ?? "—";
    const e = parUnivers.get(u) ?? { quantite: 0, ca: 0 };
    e.quantite += l._sum.quantite ?? 0;
    e.ca += l._sum.total ?? 0;
    parUnivers.set(u, e);
  }

  const parJour = new Map<string, { commandes: number; ca: number }>();
  for (const c of commandes) {
    const jour = c.createdAt.toISOString().slice(0, 10);
    const e = parJour.get(jour) ?? { commandes: 0, ca: 0 };
    e.commandes += 1;
    e.ca += c.total;
    parJour.set(jour, e);
  }

  const ca = agg._sum.total ?? 0;
  return {
    commandes: agg._count,
    chiffreAffaires: ca,
    fraisLivraison: agg._sum.fraisLivraison ?? 0,
    panierMoyen: agg._count ? Math.round(ca / agg._count) : 0,
    parJour: [...parJour.entries()]
      .map(([jour, e]) => ({ jour, ...e }))
      .sort((a, b) => a.jour.localeCompare(b.jour)),
    parUnivers: [...parUnivers.entries()]
      .map(([univers, e]) => ({ univers, ...e }))
      .sort((a, b) => b.ca - a.ca),
    topProduits: lignes
      .map((l) => ({
        nom: l.nom,
        quantite: l._sum.quantite ?? 0,
        ca: l._sum.total ?? 0,
      }))
      .sort((a, b) => b.quantite - a.quantite)
      .slice(0, 20),
    parCommune: parCommune.map((c) => ({
      commune: c.communeNom,
      commandes: c._count,
      frais: c._sum.fraisLivraison ?? 0,
    })),
    paiements: paiements.map((p) => ({ statut: p.statut, nombre: p._count })),
    parMoyen: parMoyen.map((p) => ({
      moyen: p.moyen ?? "—",
      nombre: p._count,
      montant: p._sum.montant ?? 0,
    })),
  };
}

export interface RapportStock {
  ruptures: { nom: string; variante: string }[];
  faibles: { nom: string; variante: string; stock: number }[];
  valeurStock: number;
  articles: number;
}

// Rapport stock (CDC 13.8) : ruptures, stock faible (seuil paramétrable),
// valeur du stock au prix courant.
export async function rapportStock(seuil: number, db?: Db): Promise<RapportStock> {
  const prisma = db ?? getPrisma();
  const produits = await prisma.product.findMany({
    where: { statut: { not: "desactive" } },
    include: { variantes: true },
  });

  const ruptures: RapportStock["ruptures"] = [];
  const faibles: RapportStock["faibles"] = [];
  let valeurStock = 0;
  let articles = 0;

  for (const p of produits) {
    if (p.aVariantes) {
      for (const v of p.variantes) {
        const label = [v.taille, v.couleur].filter(Boolean).join(" / ") || "—";
        articles += 1;
        valeurStock += (v.prixReduit ?? p.prixReduit ?? p.prix) * v.stock;
        if (v.stock <= 0) ruptures.push({ nom: p.nom, variante: label });
        else if (v.stock <= seuil)
          faibles.push({ nom: p.nom, variante: label, stock: v.stock });
      }
    } else {
      articles += 1;
      valeurStock += (p.prixReduit ?? p.prix) * p.stock;
      if (p.stock <= 0) ruptures.push({ nom: p.nom, variante: "—" });
      else if (p.stock <= seuil)
        faibles.push({ nom: p.nom, variante: "—", stock: p.stock });
    }
  }
  return { ruptures, faibles, valeurStock, articles };
}

export interface RapportPromotions {
  promos: {
    nom: string;
    type: string;
    valeur: number;
    debut: Date;
    fin: Date;
    ventes: number;
    ca: number;
  }[];
}

// Ventes réalisées sur les produits/catégories couverts par une promotion
// pendant sa période d'activité (CDC 13.8).
export async function rapportPromotions(periode: Periode, db?: Db): Promise<RapportPromotions> {
  const prisma = db ?? getPrisma();
  const promos = await prisma.promotion.findMany({
    where: { debut: { lte: periode.fin }, fin: { gte: periode.debut } },
    orderBy: { debut: "desc" },
  });

  const resultat: RapportPromotions["promos"] = [];
  for (const p of promos) {
    const cibleProduitIds =
      p.portee === "produits"
        ? p.produitIds
        : (
            await prisma.product.findMany({
              where: { categorieId: { in: p.categorieIds } },
              select: { id: true },
            })
          ).map((x) => x.id);
    if (cibleProduitIds.length === 0) {
      resultat.push({
        nom: p.nom, type: p.type, valeur: p.valeur,
        debut: p.debut, fin: p.fin, ventes: 0, ca: 0,
      });
      continue;
    }
    const agg = await prisma.orderLine.aggregate({
      where: {
        produitId: { in: cibleProduitIds },
        commande: {
          statutPaiement: "confirme",
          createdAt: {
            gte: p.debut > periode.debut ? p.debut : periode.debut,
            lte: p.fin < periode.fin ? p.fin : periode.fin,
          },
        },
      },
      _sum: { quantite: true, total: true },
    });
    resultat.push({
      nom: p.nom,
      type: p.type,
      valeur: p.valeur,
      debut: p.debut,
      fin: p.fin,
      ventes: agg._sum.quantite ?? 0,
      ca: agg._sum.total ?? 0,
    });
  }
  return { promos: resultat };
}

// Fenêtres de génération automatique (CDC 13.8)
export function fenetre(
  granularite: "jour" | "semaine" | "mois",
  maintenant = new Date()
): Periode {
  const fin = new Date(maintenant);
  const debut = new Date(maintenant);
  if (granularite === "jour") {
    // Hier complet : [hier 00:00, aujourd'hui 00:00[
    debut.setHours(0, 0, 0, 0);
    debut.setDate(debut.getDate() - 1);
    fin.setHours(0, 0, 0, 0);
    fin.setMilliseconds(-1);
  } else if (granularite === "semaine") {
    // Semaine écoulée : lundi 00:00 → dimanche 23:59
    debut.setHours(0, 0, 0, 0);
    debut.setDate(debut.getDate() - ((debut.getDay() + 6) % 7) - 7);
    fin.setHours(0, 0, 0, 0);
    fin.setDate(fin.getDate() - ((fin.getDay() + 6) % 7));
    fin.setMilliseconds(-1);
  } else {
    // Mois écoulé : 1er → dernier jour
    debut.setDate(1);
    debut.setMonth(debut.getMonth() - 1);
    debut.setHours(0, 0, 0, 0);
    fin.setDate(1);
    fin.setHours(0, 0, 0, 0);
    fin.setMilliseconds(-1);
  }
  return { debut, fin };
}
