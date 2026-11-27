"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderTree,
  Shirt,
  Percent,
  Truck,
  Package,
  CreditCard,
  BarChart3,
  Settings,
  Store,
  LogOut,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { deconnexion } from "@/app/admin/actions";

export const NAV_ADMIN = [
  {
    groupe: "Pilotage",
    liens: [
      { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
      { href: "/admin/rapports", label: "Rapports", icon: BarChart3 },
    ],
  },
  {
    groupe: "Ventes",
    liens: [
      { href: "/admin/commandes", label: "Commandes", icon: Package },
      { href: "/admin/paiements", label: "Paiements", icon: CreditCard },
    ],
  },
  {
    groupe: "Catalogue",
    liens: [
      { href: "/admin/produits", label: "Produits", icon: Shirt },
      { href: "/admin/categories", label: "Catégories", icon: FolderTree },
      { href: "/admin/promotions", label: "Promotions", icon: Percent },
    ],
  },
  {
    groupe: "Configuration",
    liens: [
      { href: "/admin/communes", label: "Communes & livraison", icon: Truck },
      { href: "/admin/parametres", label: "Paramètres", icon: Settings },
    ],
  },
];

export function estActif(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

export function AdminSidebar({
  utilisateur,
  initiales,
  alertesPaiements,
  commandesATraiter,
}: {
  utilisateur: string;
  initiales: string;
  alertesPaiements: number;
  commandesATraiter: number;
}) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const fermer = () => setOpenMobile(false);

  return (
    <Sidebar>
      <SidebarHeader className="h-16 flex-row items-center border-b border-sidebar-border px-4 py-0">
        <Link href="/admin" className="flex items-center gap-3" onClick={fermer}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-soukeyna.png"
            alt="Soukeyna Styl'"
            className="size-9 shrink-0 rounded-lg border border-sidebar-border bg-white object-contain p-1"
          />
          <span className="min-w-0 leading-tight">
            <span className="block text-sm font-bold tracking-[0.14em]">
              SOUKEYNA
            </span>
            <span className="block text-[11px] text-sidebar-foreground/55">
              Administration
            </span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="py-2">
        {NAV_ADMIN.map((section) => (
          <SidebarGroup key={section.groupe} className="px-3 py-1">
            <SidebarGroupLabel>{section.groupe}</SidebarGroupLabel>
            <SidebarMenu>
              {section.liens.map((item) => {
                const compteur =
                  item.href === "/admin/paiements"
                    ? alertesPaiements
                    : item.href === "/admin/commandes"
                      ? commandesATraiter
                      : 0;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={estActif(pathname, item.href)}
                      onClick={fermer}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span className="flex-1 truncate">{item.label}</span>
                        {compteur > 0 && (
                          <span
                            className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-white tabular-nums"
                            aria-label={`${compteur} à traiter`}
                          >
                            {compteur > 99 ? "99+" : compteur}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/" onClick={fermer}>
                <Store />
                <span>Voir la boutique</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="mt-1 flex items-center gap-3 rounded-lg px-2 py-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-vert text-xs font-semibold text-white">
            {initiales}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{utilisateur}</p>
            <p className="text-[11px] text-sidebar-foreground/55">
              Administrateur
            </p>
          </div>
          <form action={deconnexion}>
            <button
              type="submit"
              title="Se déconnecter"
              aria-label="Se déconnecter"
              className="grid size-8 cursor-pointer place-items-center rounded-lg text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-destructive"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
