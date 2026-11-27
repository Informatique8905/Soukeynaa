import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { dateFr, dateHeureFr } from "./format";
import type {
  RapportVentes,
  RapportStock,
  RapportPromotions,
  Periode,
} from "./rapports";

// Export administrateur du rapport d'activité (CDC 13.7) — deux formats :
//   xlsx : classeur natif (nombres exploitables, filtres, plusieurs feuilles)
//   pdf  : document mis en page, lisible et présentable à l'impression

export interface CommandeExport {
  reference: string;
  createdAt: Date;
  clientNom: string;
  clientTelephone: string;
  communeNom: string;
  adresseLivraison: string;
  modePaiement: string;
  statut: string;
  sousTotal: number;
  fraisLivraison: number;
  total: number;
  articles: string;
}

export interface DonneesRapport {
  periode: Periode;
  ventes: RapportVentes;
  stock: RapportStock;
  promos: RapportPromotions;
  seuilStock: number;
  commandes: CommandeExport[];
}

const BORDEAUX = "FF3F0D1E";
const FOND_CLAIR = "FFF6F4EF";
const NUMFMT_FCFA = '#,##0 "FCFA"';

const STATUT_LABELS: Record<string, string> = {
  en_attente_paiement: "En attente de paiement",
  payee: "Payée",
  en_preparation: "En préparation",
  expediee: "Expédiée",
  livree: "Livrée",
  annulee: "Annulée",
};

const MOYEN_LABELS: Record<string, string> = {
  wave: "Wave",
  orange_money: "Orange Money",
  mtn_momo: "MTN MoMo",
  moov_money: "Moov Money",
  carte: "Carte bancaire",
};

/* ============================== XLSX ============================== */

function styleEntete(row: ExcelJS.Row) {
  row.height = 20;
  row.eachCell((c) => {
    c.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BORDEAUX } };
    c.border = { bottom: { style: "thin", color: { argb: "FFDDDDDD" } } };
  });
}

function titreSection(ws: ExcelJS.Worksheet, texte: string, colCount: number) {
  const row = ws.addRow([texte]);
  row.getCell(1).font = { bold: true, size: 12, color: { argb: BORDEAUX } };
  ws.mergeCells(row.number, 1, row.number, colCount);
  return row;
}

export async function construireXlsx(d: DonneesRapport): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "SOUKEYNA";
  wb.created = new Date();

  /* ---------- Feuille « Commandes » ---------- */
  const wcmd = wb.addWorksheet("Commandes");
  wcmd.columns = [
    { header: "Référence", key: "reference", width: 20 },
    { header: "Date", key: "date", width: 11 },
    { header: "Client", key: "client", width: 24 },
    { header: "Téléphone", key: "tel", width: 16 },
    { header: "Commune", key: "commune", width: 18 },
    { header: "Articles", key: "articles", width: 46 },
    { header: "Sous-total", key: "sousTotal", width: 14 },
    { header: "Livraison", key: "livraison", width: 13 },
    { header: "Total", key: "total", width: 14 },
    { header: "Paiement", key: "mode", width: 15 },
    { header: "Statut", key: "statut", width: 20 },
  ];
  styleEntete(wcmd.getRow(1));
  wcmd.views = [{ state: "frozen", ySplit: 1 }];
  for (const c of d.commandes) {
    const r = wcmd.addRow({
      reference: c.reference,
      date: c.createdAt,
      client: c.clientNom,
      tel: c.clientTelephone,
      commune: c.communeNom,
      articles: c.articles,
      sousTotal: c.sousTotal,
      livraison: c.fraisLivraison,
      total: c.total,
      mode: c.modePaiement === "livraison" ? "À la livraison" : "En ligne",
      statut: STATUT_LABELS[c.statut] ?? c.statut,
    });
    for (const key of ["sousTotal", "livraison", "total"])
      r.getCell(key).numFmt = NUMFMT_FCFA;
    r.getCell("date").numFmt = "DD/MM/YYYY";
  }
  wcmd.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: 11 },
  };
  // Ligne de total en pied
  const t = wcmd.addRow({
    reference: "TOTAL",
    articles: `${d.commandes.length} commande(s)`,
    sousTotal: d.commandes.reduce((s, c) => s + c.sousTotal, 0),
    livraison: d.commandes.reduce((s, c) => s + c.fraisLivraison, 0),
    total: d.commandes.reduce((s, c) => s + c.total, 0),
  });
  t.font = { bold: true };
  t.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FOND_CLAIR } };
    c.border = { top: { style: "thin" } };
  });
  for (const key of ["sousTotal", "livraison", "total"])
    t.getCell(key).numFmt = NUMFMT_FCFA;

  /* ---------- Feuille « Résumé » ---------- */
  const ws = wb.addWorksheet("Résumé");
  ws.columns = [{ width: 38 }, { width: 20 }, { width: 20 }, { width: 20 }];

  const t0 = ws.addRow(["Rapport d'activité SOUKEYNA"]);
  t0.getCell(1).font = { bold: true, size: 16, color: { argb: BORDEAUX } };
  ws.addRow([
    `Période du ${dateFr(d.periode.debut)} au ${dateFr(d.periode.fin)}`,
  ]).getCell(1).font = { size: 10, color: { argb: "FF666666" } };
  ws.addRow([`Généré le ${dateHeureFr(new Date())}`]).getCell(1).font = {
    size: 10,
    color: { argb: "FF666666" },
  };
  ws.addRow([]);

  titreSection(ws, "Indicateurs", 4);
  styleEntete(ws.addRow(["Indicateur", "Valeur", "", ""]));
  const kpis: [string, string | number][] = [
    ["Commandes payées", d.ventes.commandes],
    ["Chiffre d'affaires", d.ventes.chiffreAffaires],
    ["Panier moyen", d.ventes.panierMoyen],
    ["Frais de livraison", d.ventes.fraisLivraison],
    ["Valeur du stock", d.stock.valeurStock],
    ["Ruptures de stock", d.stock.ruptures.length],
    ["Stock faible", d.stock.faibles.length],
  ];
  for (const [label, v] of kpis) {
    const r = ws.addRow([label, v]);
    r.getCell(1).font = { size: 11 };
    if (typeof v === "number" && label !== "Commandes payées" && !label.startsWith("Stock faible") && label !== "Ruptures de stock")
      r.getCell(2).numFmt = NUMFMT_FCFA;
    r.getCell(2).font = { bold: true };
  }
  ws.addRow([]);

  titreSection(ws, "Détail par jour", 4);
  styleEntete(ws.addRow(["Jour", "Commandes", "CA", ""]));
  for (const j of d.ventes.parJour) {
    const r = ws.addRow([dateFr(j.jour), j.commandes, j.ca]);
    r.getCell(3).numFmt = NUMFMT_FCFA;
  }
  ws.addRow([]);

  titreSection(ws, "Produits les plus vendus", 4);
  styleEntete(ws.addRow(["Produit", "Quantité", "CA", ""]));
  for (const p of d.ventes.topProduits) {
    const r = ws.addRow([p.nom, p.quantite, p.ca]);
    r.getCell(3).numFmt = NUMFMT_FCFA;
  }
  ws.addRow([]);

  titreSection(ws, "Livraisons par commune", 4);
  styleEntete(ws.addRow(["Commune", "Commandes", "Frais", ""]));
  for (const c of d.ventes.parCommune) {
    const r = ws.addRow([c.commune, c.commandes, c.frais]);
    r.getCell(3).numFmt = NUMFMT_FCFA;
  }
  ws.addRow([]);

  titreSection(ws, "Paiements par moyen", 4);
  styleEntete(ws.addRow(["Moyen", "Nombre", "Montant", ""]));
  for (const m of d.ventes.parMoyen) {
    const r = ws.addRow([MOYEN_LABELS[m.moyen] ?? m.moyen, m.nombre, m.montant]);
    r.getCell(3).numFmt = NUMFMT_FCFA;
  }
  if (d.promos.promos.length > 0) {
    ws.addRow([]);
    titreSection(ws, "Promotions", 4);
    styleEntete(ws.addRow(["Nom", "Réduction", "Ventes", "CA"]));
    for (const p of d.promos.promos) {
      const r = ws.addRow([
        p.nom,
        p.type === "pourcentage" ? `-${p.valeur} %` : -p.valeur,
        p.ventes,
        p.ca,
      ]);
      if (p.type !== "pourcentage") r.getCell(2).numFmt = NUMFMT_FCFA;
      r.getCell(4).numFmt = NUMFMT_FCFA;
    }
  }

  /* ---------- Feuille « Stock » ---------- */
  const wst = wb.addWorksheet("Stock");
  wst.columns = [{ width: 40 }, { width: 24 }, { width: 14 }];
  const st0 = wst.addRow([
    `Stock au ${dateFr(new Date())} — seuil « faible » : ${d.seuilStock}`,
  ]);
  st0.getCell(1).font = { bold: true, size: 12, color: { argb: BORDEAUX } };
  wst.addRow([]);
  titreSection(wst, `Ruptures (${d.stock.ruptures.length})`, 3);
  styleEntete(wst.addRow(["Produit", "Variante", ""]));
  for (const r of d.stock.ruptures) wst.addRow([r.nom, r.variante]);
  wst.addRow([]);
  titreSection(wst, `Stock faible (${d.stock.faibles.length})`, 3);
  styleEntete(wst.addRow(["Produit", "Variante", "Restant"]));
  for (const f of d.stock.faibles) wst.addRow([f.nom, f.variante, f.stock]);

  return Buffer.from(await wb.xlsx.writeBuffer());
}

/* ============================== PDF =============================== */

const MARGE = 46;
const LARGEUR = 595.28 - 2 * MARGE; // A4
const FCFA_PDF = (v: number) => `${v.toLocaleString("fr-FR")} FCFA`;

// En-tête de page : bandeau bordeaux + titre + période
function entetePdf(doc: PDFKit.PDFDocument, d: DonneesRapport, suite = false) {
  doc.rect(0, 0, 595.28, 86).fill("#3f0d1e");
  doc
    .fillColor("#ffffff")
    .fontSize(19)
    .font("Helvetica-Bold")
    .text("SOUKEYNA", MARGE, 22)
    .fontSize(9.5)
    .font("Helvetica")
    .fillColor("#d8b8c0")
    .text("Rapport d'activité — boutique en ligne", MARGE, 48);
  doc
    .fontSize(9.5)
    .fillColor("#ffffff")
    .text(
      `${dateFr(d.periode.debut)} → ${dateFr(d.periode.fin)}${suite ? " (suite)" : ""}`,
      MARGE,
      30,
      { width: LARGEUR, align: "right" }
    );
  doc.y = 108;
}

// Titre de section avec trait bordeaux
function sectionTitre(doc: PDFKit.PDFDocument, texte: string, y: number): number {
  doc
    .fontSize(12)
    .font("Helvetica-Bold")
    .fillColor("#3f0d1e")
    .text(texte, MARGE, y);
  doc
    .moveTo(MARGE, y + 14)
    .lineTo(MARGE + 26, y + 14)
    .lineWidth(1.5)
    .strokeColor("#c9a227")
    .stroke();
  return y + 22;
}

interface ColPdf {
  label: string;
  width: number;
  num?: boolean;
}

function enteteTableau(doc: PDFKit.PDFDocument, cols: ColPdf[], y: number) {
  const h = 18;
  doc.rect(MARGE, y, LARGEUR, h).fill("#3f0d1e");
  let x = MARGE;
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#ffffff");
  for (const c of cols) {
    doc.text(c.label, x + 5, y + 5, {
      width: c.width - 10,
      align: c.num ? "right" : "left",
    });
    x += c.width;
  }
}

// Tableau paginé : répète l'en-tête à chaque saut de page
function tableau(
  doc: PDFKit.PDFDocument,
  d: DonneesRapport,
  cols: ColPdf[],
  lignes: (string | number)[][],
  y: number
): number {
  const h = 17;
  const nouvPage = () => {
    doc.addPage();
    entetePdf(doc, d, true);
    y = 102;
    enteteTableau(doc, cols, y);
    y += h;
  };
  enteteTableau(doc, cols, y);
  y += h;
  doc.font("Helvetica").fontSize(9);
  lignes.forEach((l, i) => {
    if (y + h > 790) nouvPage();
    if (i % 2 === 0) doc.rect(MARGE, y, LARGEUR, h).fill("#faf9f6");
    let x = MARGE;
    l.forEach((v, j) => {
      const c = cols[j];
      doc.fillColor("#333333").text(
        typeof v === "number" ? (c.num ? FCFA_PDF(v) : String(v)) : v,
        x + 5,
        y + 4.5,
        { width: c.width - 10, align: c.num ? "right" : "left", lineBreak: false }
      );
      x += c.width;
    });
    y += h;
  });
  doc
    .moveTo(MARGE, y)
    .lineTo(MARGE + LARGEUR, y)
    .lineWidth(0.5)
    .strokeColor("#cccccc")
    .stroke();
  return y + 14;
}

function piedDePage(doc: PDFKit.PDFDocument, page: number, total: number) {
  const bas = 812;
  doc
    .moveTo(MARGE, bas - 8)
    .lineTo(MARGE + LARGEUR, bas - 8)
    .lineWidth(0.5)
    .strokeColor("#e5e5e5")
    .stroke();
  doc
    .fontSize(7.5)
    .font("Helvetica")
    .fillColor("#999999")
    .text(
      `SOUKEYNA · Rapport d'activité · généré le ${dateHeureFr(new Date())} — page ${page}/${total}`,
      MARGE,
      bas,
      { width: LARGEUR, align: "center" }
    );
}

export async function construirePdf(d: DonneesRapport): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 40, bottom: 40, left: MARGE, right: MARGE },
    bufferPages: true,
    info: {
      Title: `Rapport SOUKEYNA ${dateFr(d.periode.debut)} – ${dateFr(d.periode.fin)}`,
      Author: "SOUKEYNA",
    },
  });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const pret = new Promise<Buffer>((resolve) =>
    doc.on("end", () => resolve(Buffer.concat(chunks)))
  );

  entetePdf(doc, d);
  let y = doc.y;

  // Bandeau indicateurs : 4 cases
  const indicateurs: [string, string][] = [
    ["Commandes payées", String(d.ventes.commandes)],
    ["Chiffre d'affaires", FCFA_PDF(d.ventes.chiffreAffaires)],
    ["Panier moyen", FCFA_PDF(d.ventes.panierMoyen)],
    ["Frais de livraison", FCFA_PDF(d.ventes.fraisLivraison)],
  ];
  const wCase = (LARGEUR - 3 * 10) / 4;
  indicateurs.forEach(([label, val], i) => {
    const x = MARGE + i * (wCase + 10);
    doc.rect(x, y, wCase, 46).fill("#f6f4ef");
    doc
      .fontSize(7.5)
      .font("Helvetica")
      .fillColor("#777777")
      .text(label.toUpperCase(), x + 8, y + 8, { width: wCase - 16 });
    doc
      .fontSize(13)
      .font("Helvetica-Bold")
      .fillColor("#3f0d1e")
      .text(val, x + 8, y + 24, { width: wCase - 16 });
  });
  y += 62;

  y = sectionTitre(doc, "Détail par jour", y);
  y = tableau(
    doc,
    d,
    [
      { label: "Jour", width: LARGEUR * 0.4 },
      { label: "Commandes", width: LARGEUR * 0.3, num: true },
      { label: "CA", width: LARGEUR * 0.3, num: true },
    ],
    d.ventes.parJour.map((j) => [dateFr(j.jour), j.commandes, j.ca]),
    y
  );

  y = sectionTitre(doc, "Produits les plus vendus", y);
  y = tableau(
    doc,
    d,
    [
      { label: "Produit", width: LARGEUR * 0.55 },
      { label: "Qté", width: LARGEUR * 0.15, num: true },
      { label: "CA", width: LARGEUR * 0.3, num: true },
    ],
    d.ventes.topProduits.map((p) => [p.nom, p.quantite, p.ca]),
    y
  );

  y = sectionTitre(doc, "Livraisons par commune", y);
  y = tableau(
    doc,
    d,
    [
      { label: "Commune", width: LARGEUR * 0.4 },
      { label: "Commandes", width: LARGEUR * 0.3, num: true },
      { label: "Frais", width: LARGEUR * 0.3, num: true },
    ],
    d.ventes.parCommune.map((c) => [c.commune, c.commandes, c.frais]),
    y
  );

  y = sectionTitre(doc, "Paiements par moyen", y);
  y = tableau(
    doc,
    d,
    [
      { label: "Moyen", width: LARGEUR * 0.4 },
      { label: "Nombre", width: LARGEUR * 0.3, num: true },
      { label: "Montant", width: LARGEUR * 0.3, num: true },
    ],
    d.ventes.parMoyen.map((m) => [
      MOYEN_LABELS[m.moyen] ?? m.moyen,
      m.nombre,
      m.montant,
    ]),
    y
  );

  y = sectionTitre(doc, `Stock (au ${dateFr(new Date())})`, y);
  y = tableau(
    doc,
    d,
    [
      { label: "Indicateur", width: LARGEUR * 0.6 },
      { label: "Valeur", width: LARGEUR * 0.4, num: true },
    ],
    [
      ["Articles suivis", d.stock.articles],
      ["Valeur du stock", d.stock.valeurStock],
      ["Ruptures", d.stock.ruptures.length],
      [`Stock faible (seuil ${d.seuilStock})`, d.stock.faibles.length],
    ],
    y
  );
  if (d.stock.ruptures.length > 0) {
    if (y > 760) { doc.addPage(); entetePdf(doc, d, true); y = 102; }
    doc
      .fontSize(8)
      .fillColor("#b45309")
      .text(
        `Ruptures : ${d.stock.ruptures
          .map((r) => r.nom + (r.variante !== "—" ? ` (${r.variante})` : ""))
          .join(", ")}`,
        MARGE,
        y,
        { width: LARGEUR }
      );
    y = doc.y + 10;
  }

  // Commandes détaillées en dernière section (longueur variable)
  doc.addPage();
  entetePdf(doc, d, true);
  y = sectionTitre(
    doc,
    `Commandes payées de la période (${d.commandes.length})`,
    108
  );
  tableau(
    doc,
    d,
    [
      { label: "Réf.", width: LARGEUR * 0.17 },
      { label: "Date", width: LARGEUR * 0.11 },
      { label: "Client", width: LARGEUR * 0.24 },
      { label: "Commune", width: LARGEUR * 0.16 },
      { label: "Total", width: LARGEUR * 0.16, num: true },
      { label: "Statut", width: LARGEUR * 0.16 },
    ],
    d.commandes.map((c) => [
      c.reference,
      c.createdAt.toISOString().slice(0, 10),
      c.clientNom,
      c.communeNom,
      c.total,
      STATUT_LABELS[c.statut] ?? c.statut,
    ]),
    y
  );

  // Numérotation de toutes les pages (bufferPages)
  const total = doc.bufferedPageRange().count;
  for (let i = 0; i < total; i++) {
    doc.switchToPage(i);
    piedDePage(doc, i + 1, total);
  }
  doc.end();
  return pret;
}
