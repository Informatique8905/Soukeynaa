"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink } from "lucide-react";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  AdminSidebar,
  NAV_ADMIN,
  estActif,
} from "@/components/admin/admin-sidebar";

export function AdminShell({
  utilisateur,
  initiales,
  alertesPaiements,
  children,
}: {
  utilisateur: string;
  initiales: string;
  alertesPaiements: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const section = NAV_ADMIN.find((s) =>
    s.liens.some((l) => estActif(pathname, l.href)),
  );
  const page = section?.liens.find((l) => estActif(pathname, l.href));

  return (
    <SidebarProvider className="bg-[#f6f7f5]">
      <AdminSidebar
        utilisateur={utilisateur}
        initiales={initiales}
        alertesPaiements={alertesPaiements}
      />
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-white/90 px-4 backdrop-blur-md print:hidden sm:px-6 lg:px-8">
          <SidebarTrigger aria-label="Ouvrir la navigation" className="-ml-2" />
          <nav
            aria-label="Fil d'Ariane"
            className="flex min-w-0 items-center gap-2 text-sm"
          >
            <span className="hidden text-muted-foreground sm:inline">
              {section?.groupe ?? "Administration"}
            </span>
            <span aria-hidden className="hidden text-border sm:inline">
              /
            </span>
            <Link
              href={page?.href ?? "/admin"}
              className="truncate font-semibold text-foreground"
            >
              {page?.label ?? "Tableau de bord"}
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {alertesPaiements > 0 && (
              <Link
                href="/admin/paiements"
                className="inline-flex h-8 items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100"
              >
                <span aria-hidden className="size-1.5 rounded-full bg-amber-500" />
                <span className="sm:hidden">{alertesPaiements}</span>
                <span className="hidden sm:inline">
                  {alertesPaiements} paiement{alertesPaiements > 1 ? "s" : ""} à
                  vérifier
                </span>
              </Link>
            )}
            <Link
              href="/"
              className="hidden h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:inline-flex"
            >
              Boutique
              <ExternalLink className="size-3.5" />
            </Link>
          </div>
        </header>
        <div className="admin-zone flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
