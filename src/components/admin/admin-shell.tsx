"use client";

import Link from "next/link";
import { CreditCard } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

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
  return (
    <SidebarProvider>
      <AdminSidebar utilisateur={utilisateur} />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur-md sm:px-6">
          <SidebarTrigger aria-label="Ouvrir la navigation" />
          <h1 className="truncate text-lg font-semibold">
            Bonjour, {utilisateur.split(" ")[0]}
          </h1>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" asChild className="relative rounded-full px-3 text-xs">
              <Link href="/admin/paiements" className="press">
                <CreditCard className="size-4" />
                Paiements
                {alertesPaiements > 0 && (
                  <span className="ml-1 flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {alertesPaiements > 9 ? "9+" : alertesPaiements}
                  </span>
                )}
              </Link>
            </Button>
            <Avatar className="ml-1 size-8">
              <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                {initiales}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>
        <main className="admin-zone flex-1 p-4 motion-safe:animate-entree sm:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
