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
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { deconnexion } from "@/app/admin/actions";

const NAV = [
  { href: "/admin", label: "Tableau de bord", court: "Accueil", icon: LayoutDashboard },
  { href: "/admin/categories", label: "Catégories", court: "Catég.", icon: FolderTree },
  { href: "/admin/produits", label: "Produits", court: "Produits", icon: Shirt },
  { href: "/admin/promotions", label: "Promotions", court: "Promo", icon: Percent },
  { href: "/admin/communes", label: "Communes & livraison", court: "Livraison", icon: Truck },
  { href: "/admin/commandes", label: "Commandes", court: "Cmdes", icon: Package },
  { href: "/admin/paiements", label: "Paiements", court: "Paies", icon: CreditCard },
  { href: "/admin/rapports", label: "Rapports", court: "Rapports", icon: BarChart3 },
  { href: "/admin/parametres", label: "Paramètres", court: "Param.", icon: Settings },
];

export function AdminSidebar({ utilisateur }: { utilisateur: string }) {
  const pathname = usePathname();
  const { setOpenMobile, isMobile } = useSidebar();
  const rail = !isMobile; // desktop : barre latérale compacte

  const initiales =
    utilisateur
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "A";

  const boutonRail = (actif: boolean) =>
    `press justify-center rounded-xl px-2 py-2 text-[11px] font-semibold ${
      actif
        ? "bg-vert text-white shadow-sm hover:bg-vert hover:text-white"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`;

  return (
    <Sidebar
      className="md:border-r md:border-black/5 md:bg-white md:text-foreground"
      style={{ width: rail ? "7rem" : "15rem" }}
    >
      <SidebarHeader className={rail ? "items-center px-2 pb-1" : undefined}>
        {rail ? (
          <Link href="/admin" aria-label="Tableau de bord" title="SOUKEYNA">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-soukeyna.png"
              alt="Soukeyna Styl'"
              className="size-10 rounded-xl bg-white object-contain p-1 ring-1 ring-black/5"
            />
          </Link>
        ) : (
          <Link
            href="/admin"
            className="flex items-center gap-3"
            onClick={() => setOpenMobile(false)}
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/95 p-1.5 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-soukeyna.png"
                alt="Soukeyna Styl'"
                className="max-h-full w-auto"
              />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold tracking-widest">
                SOUKEYNA
              </span>
              <span className="block text-[11px] text-sidebar-foreground/70">
                Administration
              </span>
            </span>
          </Link>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className={rail ? "px-0" : undefined}>
          <SidebarMenu className={rail ? "items-center gap-1.5 px-2" : undefined}>
            {NAV.map((item) => {
              const actif =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              return (
                <SidebarMenuItem key={item.href} className={rail ? "w-full" : undefined}>
                  <SidebarMenuButton
                    asChild
                    isActive={rail ? undefined : actif}
                    title={rail ? item.label : undefined}
                    className={rail ? boutonRail(actif) : undefined}
                    onClick={() => setOpenMobile(false)}
                  >
                    <Link href={item.href}>
                      {rail ? (
                        <span className="flex flex-col items-center gap-1">
                          <item.icon className="size-5" />
                          <span className="w-full truncate text-center">
                            {item.court}
                          </span>
                        </span>
                      ) : (
                        <>
                          <item.icon className="size-4" />
                          <span>{item.label}</span>
                        </>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter
        className={rail ? "items-center gap-2 border-black/5 px-2" : undefined}
      >
        {rail ? (
          <>
            <span
              className="grid size-9 place-items-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground"
              title={utilisateur}
            >
              {initiales}
            </span>
            <SidebarMenu className="w-full items-center gap-1.5">
              <SidebarMenuItem className="w-full">
                <SidebarMenuButton
                  asChild
                  className={boutonRail(false)}
                >
                  <Link href="/">
                    <span className="flex flex-col items-center gap-1">
                      <Store className="size-5" />
                      <span className="w-full truncate text-center">Boutique</span>
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem className="w-full">
                <form action={deconnexion} className="w-full">
                  <SidebarMenuButton
                    asChild
                    className={boutonRail(false)}
                  >
                    <button type="submit" className="w-full">
                      <span className="flex flex-col items-center gap-1">
                        <LogOut className="size-5" />
                        <span className="w-full truncate text-center">Quitter</span>
                      </span>
                    </button>
                  </SidebarMenuButton>
                </form>
              </SidebarMenuItem>
            </SidebarMenu>
          </>
        ) : (
          <>
            <div className="mx-1 flex items-center gap-2.5 rounded-xl bg-white/10 px-3 py-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/20 text-xs font-bold">
                {initiales}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold">{utilisateur}</p>
                <p className="text-[10px] text-sidebar-foreground/60">
                  Administrateur
                </p>
              </div>
            </div>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/">
                    <Store className="size-4" />
                    <span>Voir la boutique</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <form action={deconnexion}>
                  <SidebarMenuButton asChild>
                    <button type="submit" className="w-full">
                      <LogOut className="size-4" />
                      <span>Se déconnecter</span>
                    </button>
                  </SidebarMenuButton>
                </form>
              </SidebarMenuItem>
            </SidebarMenu>
          </>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
