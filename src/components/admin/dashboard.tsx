"use client";

import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import type { OrderStatus } from "@/lib/constants";
import { fcfa } from "@/lib/format";
import {
  EnTetePage,
  Indicateur,
  Panneau,
  StatutCommande,
  Vide,
  bouton,
  lien,
} from "@/components/admin/ui";

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
  commandes: { label: "Commandes", color: "#c9e3d4" },
  payees: { label: "Payées", color: "#1e7b4f" },
} satisfies ChartConfig;

function LienAction({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={`${lien} inline-flex items-center gap-1`}>
      {children}
      <ArrowRight className="size-3.5" />
    </Link>
  );
}

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
    weekday: "long",
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
    <div className="flex flex-col gap-6">
      <EnTetePage
        surTitre={<span className="capitalize">{aujourdhui}</span>}
        titre={`Bonjour, ${prenom}`}
        description="Vue d'ensemble de l'activité de la boutique."
        actions={
          <Link href="/admin/produits/nouveau" className={bouton("primaire")}>
            <Plus />
            Nouveau produit
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Indicateur
          label="Chiffre d'affaires du jour"
          valeur={fcfa(stats.caJour)}
          note="Paiements confirmés depuis minuit"
        />
        <Indicateur
          label="Commandes du jour"
          valeur={stats.commandesJour}
          note={
            tendance === null
              ? "Depuis minuit"
              : `${tendance >= 0 ? "+" : ""}${tendance} % cette semaine vs précédente`
          }
        />
        <Indicateur
          label="À préparer / expédier"
          valeur={stats.aPreparer}
          note="Payées ou en préparation"
          action={<LienAction href="/admin/commandes?statut=payee">Traiter</LienAction>}
        />
        <Indicateur
          label="Paiements à vérifier"
          valeur={stats.paiementsAVerifier}
          ton={stats.paiementsAVerifier > 0 ? "alerte" : "neutre"}
          note="Anomalies de paiement (CDC 10.12)"
          action={<LienAction href="/admin/paiements">Vérifier</LienAction>}
        />
        <Indicateur
          label="Produits en rupture"
          valeur={stats.ruptures}
          ton={stats.ruptures > 0 ? "danger" : "neutre"}
          note="Produits publiés sans stock"
          action={<LienAction href="/admin/produits">Gérer le stock</LienAction>}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Panneau
          className="xl:col-span-2"
          titre="Activité des ventes"
          description="Commandes créées et payées (8 dernières semaines)"
          actions={
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-[#c9e3d4]" />
                Créées
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-vert" />
                Payées
              </span>
            </div>
          }
        >
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <BarChart
              data={ventes}
              margin={{ left: 0, right: 0, top: 8 }}
              barGap={4}
              accessibilityLayer
            >
              <CartesianGrid vertical={false} stroke="#eceee9" />
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
              <ChartTooltip cursor={{ fill: "#f3f5f1" }} content={<ChartTooltipContent />} />
              <Bar dataKey="commandes" fill="var(--color-commandes)" radius={[4, 4, 0, 0]} maxBarSize={22} />
              <Bar dataKey="payees" fill="var(--color-payees)" radius={[4, 4, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ChartContainer>
        </Panneau>

        <Panneau
          titre="Activité récente"
          description="Dernières opérations journalisées (CDC 14.7)"
          corps="p-0"
        >
          {activite.length === 0 ? (
            <Vide titre="Aucune opération">
              Les actions des administrateurs apparaîtront ici.
            </Vide>
          ) : (
            <ol className="divide-y divide-border">
              {activite.map((e) => (
                <li key={e.id} className="px-5 py-3">
                  <p className="text-sm leading-snug">
                    <span className="font-medium">{e.auteur}</span>{" "}
                    <span className="text-muted-foreground">{e.action}</span>
                  </p>
                  <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                    <span className="truncate">{e.entite}</span>
                    <span aria-hidden>·</span>
                    <span className="tabular-nums">{e.date}</span>
                  </p>
                </li>
              ))}
            </ol>
          )}
        </Panneau>
      </div>

      <Panneau
        titre="Commandes en cours"
        description="Avancement des commandes payées jusqu'à la livraison"
        actions={<LienAction href="/admin/commandes">Tout voir</LienAction>}
        corps="p-0"
      >
        {enCours.length === 0 ? (
          <Vide titre="Aucune commande en cours">
            Les commandes payées à traiter s&apos;afficheront ici.
          </Vide>
        ) : (
          <>
            <ul className="divide-y divide-border md:hidden">
              {enCours.map((c) => (
                <li key={c.id}>
                  <Link href={`/admin/commandes/${c.id}`} className="block px-5 py-3.5 hover:bg-[#fafbf9]">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-semibold">{c.reference}</p>
                      <p className="shrink-0 text-sm font-semibold tabular-nums">{fcfa(c.total)}</p>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <p className="truncate text-xs text-muted-foreground">
                        {c.clientNom} · {c.commune}
                      </p>
                      <StatutCommande statut={c.statut} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Référence</th>
                    <th>Client</th>
                    <th>Commune</th>
                    <th>Avancement</th>
                    <th>Statut</th>
                    <th className="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {enCours.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/admin/commandes/${c.id}`} className={lien}>
                          {c.reference}
                        </Link>
                      </td>
                      <td className="font-medium">{c.clientNom}</td>
                      <td className="text-muted-foreground">{c.commune}</td>
                      <td>
                        <div className="flex w-36 items-center gap-2">
                          <Progress value={c.progression} className="h-1.5" aria-label={`Avancement ${c.reference}`} />
                          <span className="w-8 text-right text-xs text-muted-foreground tabular-nums">
                            {c.progression}%
                          </span>
                        </div>
                      </td>
                      <td>
                        <StatutCommande statut={c.statut} />
                      </td>
                      <td className="num font-semibold">{fcfa(c.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Panneau>
    </div>
  );
}
