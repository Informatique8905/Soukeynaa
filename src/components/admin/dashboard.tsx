"use client";

import Link from "next/link";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/constants";
import { fcfa } from "@/lib/format";

export type DonneesDashboard = {
  stats: {
    commandesJour: number;
    caJour: number;
    aPreparer: number;
    paiementsAVerifier: number;
    ruptures: number;
  };
  ventes: { semaine: string; commandes: number; payees: number }[];
  enCours: {
    id: number;
    reference: string;
    clientNom: string;
    total: number;
    statut: OrderStatus;
    progression: number;
    commune: string;
  }[];
  activite: {
    id: number;
    auteur: string;
    action: string;
    entite: string;
    date: string;
  }[];
};

const chartConfig = {
  commandes: { label: "Commandes", color: "#a9d5bb" },
  payees: { label: "Payées", color: "#1e7b4f" },
} satisfies ChartConfig;

const STATUT_VARIANT: Record<
  OrderStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  en_attente_paiement: "outline",
  payee: "default",
  en_preparation: "secondary",
  expediee: "outline",
  livree: "default",
  annulee: "destructive",
};

function initiales(nom: string) {
  return nom
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

const carteBlanche =
  "rounded-3xl border border-black/5 bg-white shadow-sm transition-shadow hover:shadow-md";

export function DashboardAdmin({
  donnees,
  utilisateur = "Administrateur",
}: {
  donnees: DonneesDashboard;
  utilisateur?: string;
}) {
  const { stats, ventes, enCours, activite } = donnees;
  const prenom = utilisateur.split(" ")[0];
  const aujourdhui = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const semPrecedente = ventes[ventes.length - 2]?.commandes ?? 0;
  const semCourante = ventes[ventes.length - 1]?.commandes ?? 0;
  const tendance =
    semPrecedente > 0
      ? Math.round(((semCourante - semPrecedente) / semPrecedente) * 100)
      : null;

  return (
    <div className="flex flex-1 flex-col gap-5">
      {/* ── En-tête : salutation + période + action ── */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Bonjour, {prenom}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Voici l&apos;activité de la boutique.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-black/8 bg-white px-4 py-2 text-xs font-medium text-muted-foreground">
            {aujourdhui}
          </span>
          <Link
            href="/admin/produits/nouveau"
            className="rounded-full bg-vert px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-vert-fonce"
          >
            + Nouveau produit
          </Link>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        {/* ── Colonne gauche : carte héro CA + mini-stats ── */}
        <div className="flex flex-col gap-5 xl:col-span-3">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-vert via-[#17683f] to-vert-fonce p-5 text-white shadow-lg">
            <p className="text-xs font-medium text-white/70">CA du jour</p>
            <p className="mt-1 text-[11px] uppercase tracking-wider text-white/50">
              Paiements confirmés
            </p>
            <p className="mt-6 text-3xl font-extrabold tabular-nums tracking-tight">
              {fcfa(stats.caJour)}
            </p>
            <div className="mt-7 flex items-end justify-between text-[11px] font-medium tracking-wider text-white/60">
              <span>SOUKEYNA</span>
              <span>JÈKO</span>
            </div>
          </div>

          <div className={carteBlanche + " p-4"}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                Commandes du jour
              </p>
              {tendance !== null && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    tendance >= 0
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {tendance >= 0 ? "▲" : "▼"}
                  {tendance >= 0 ? "+" : ""}
                  {tendance}%
                </span>
              )}
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums">
              {stats.commandesJour}
            </p>
            <p className="text-xs text-muted-foreground">Depuis minuit</p>
          </div>

          <div className={carteBlanche + " p-4"}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                Produits en rupture
              </p>
              <span
                aria-hidden
                className={`size-2.5 rounded-full ${stats.ruptures > 0 ? "bg-destructive" : "bg-muted-foreground/40"}`}
              />
            </div>
            <p
              className={`mt-2 text-2xl font-bold tabular-nums ${stats.ruptures > 0 ? "text-destructive" : ""}`}
            >
              {stats.ruptures}
            </p>
            <Link
              href="/admin/produits"
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-vert hover:underline"
            >
              Gérer le stock →
            </Link>
          </div>
        </div>

        {/* ── Centre : activité des ventes (barres) ── */}
        <Card className={carteBlanche + " xl:col-span-5"}>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Activité des ventes</CardTitle>
              <CardDescription>
                Commandes créées vs payées — 8 dernières semaines
              </CardDescription>
            </div>
            <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold text-secondary-foreground">
              8 semaines
            </span>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <BarChart
                data={ventes}
                margin={{ left: 4, right: 4, top: 8 }}
                barGap={6}
                accessibilityLayer
              >
                <defs>
                  <pattern
                    id="hatchCmd"
                    width="7"
                    height="7"
                    patternTransform="rotate(45)"
                    patternUnits="userSpaceOnUse"
                  >
                    <rect width="7" height="7" fill="#e2f0e7" />
                    <line
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="7"
                      stroke="#9ccfae"
                      strokeWidth="2.5"
                    />
                  </pattern>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="semaine"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={11}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={28}
                  allowDecimals={false}
                  fontSize={11}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="commandes"
                  fill="url(#hatchCmd)"
                  radius={[8, 8, 8, 8]}
                  maxBarSize={26}
                />
                <Bar
                  dataKey="payees"
                  fill="var(--color-payees)"
                  radius={[8, 8, 8, 8]}
                  maxBarSize={26}
                />
              </BarChart>
            </ChartContainer>
            <div className="mt-1 flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-2.5 rounded-sm bg-[#9ccfae]" />
                Commandes
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-2.5 rounded-sm bg-vert" />
                Payées
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ── Colonne droite : actions rapides ── */}
        <div className="flex flex-col gap-5 xl:col-span-4">
          <div className={carteBlanche + " flex-1 p-5"}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                À préparer / expédier
              </p>
              <span aria-hidden className="size-2.5 rounded-full bg-vert" />
            </div>
            <p className="mt-3 text-3xl font-extrabold tabular-nums">
              {stats.aPreparer}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Commandes payées ou en préparation
            </p>
            <Link
              href="/admin/commandes"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-vert px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-vert-fonce"
            >
              Traiter →
            </Link>
          </div>

          <div
            className={`flex-1 rounded-3xl border p-5 shadow-sm transition-shadow hover:shadow-md ${
              stats.paiementsAVerifier > 0
                ? "border-destructive/30 bg-destructive/[0.03]"
                : "border-black/5 bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                Paiements à vérifier
              </p>
              <span
                aria-hidden
                className={`size-2.5 rounded-full ${stats.paiementsAVerifier > 0 ? "bg-destructive" : "bg-vert"}`}
              />
            </div>
            <p
              className={`mt-3 text-3xl font-extrabold tabular-nums ${stats.paiementsAVerifier > 0 ? "text-destructive" : ""}`}
            >
              {stats.paiementsAVerifier}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Anomalies Jèko (CDC 10.12)
            </p>
            <Link
              href="/admin/paiements"
              className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold shadow-sm transition ${
                stats.paiementsAVerifier > 0
                  ? "bg-destructive text-white hover:bg-destructive/90"
                  : "bg-vert text-white hover:bg-vert-fonce"
              }`}
            >
              Vérifier →
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        {/* ── Historique des commandes (style table du design) ── */}
        <Card className={carteBlanche + " xl:col-span-8"}>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Commandes en cours</CardTitle>
              <CardDescription>
                Avancement des commandes payées jusqu&apos;à la livraison
              </CardDescription>
            </div>
            <Link
              href="/admin/commandes"
              className="text-xs font-semibold text-vert hover:underline"
            >
              Tout voir
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col">
            {enCours.map((commande) => (
              <Link
                key={commande.id}
                href={`/admin/commandes/${commande.id}`}
                className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-muted/50"
              >
                <Avatar className="size-9 shrink-0">
                  <AvatarFallback className="bg-secondary text-xs font-bold text-secondary-foreground">
                    {initiales(commande.clientNom)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {commande.reference}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {commande.clientNom} — {commande.commune}
                  </p>
                </div>
                <div className="hidden w-28 sm:block">
                  <Progress
                    value={commande.progression}
                    aria-label={`Progression ${commande.reference}`}
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground tabular-nums">
                    {commande.progression}%
                  </p>
                </div>
                <Badge
                  variant={STATUT_VARIANT[commande.statut]}
                  className="hidden shrink-0 sm:inline-flex"
                >
                  {ORDER_STATUS_LABELS[commande.statut]}
                </Badge>
                <span className="w-24 shrink-0 text-right text-sm font-bold tabular-nums">
                  {fcfa(commande.total)}
                </span>
              </Link>
            ))}
            {enCours.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Aucune commande en cours de traitement.
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Journal d'activité ── */}
        <Card className={carteBlanche + " xl:col-span-4"}>
          <CardHeader>
            <CardTitle>Activité récente</CardTitle>
            <CardDescription>
              Dernières opérations journalisées (CDC 14.7)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col">
              {activite.map((entree) => (
                <li
                  key={entree.id}
                  className="-mx-2 flex items-start gap-3 rounded-xl p-2 transition-colors hover:bg-muted/50"
                >
                  <Avatar className="size-8 shrink-0">
                    <AvatarFallback className="bg-secondary text-xs text-secondary-foreground">
                      {initiales(entree.auteur)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug">
                      <span className="font-medium">{entree.auteur}</span>{" "}
                      <span className="text-muted-foreground">
                        {entree.action} — {entiteRaccourcie(entree.entite)}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entree.date}
                    </p>
                  </div>
                </li>
              ))}
              {activite.length === 0 && (
                <li className="py-6 text-center text-sm text-muted-foreground">
                  Aucune opération journalisée pour le moment.
                </li>
              )}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function entiteRaccourcie(entite: string) {
  return entite.length > 30 ? entite.slice(0, 30) + "…" : entite;
}
