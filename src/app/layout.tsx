import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Toute l'app est dynamique (catalogue, panier, compte, admin) — les requêtes
// Prisma ne marquent pas une route dynamique, donc on force le rendu à la demande.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "SOUKEYNA — Boutique",
    template: "%s | SOUKEYNA",
  },
  description:
    "Boutique en ligne SOUKEYNA — vêtements, chaussures, sacs et accessoires à Abidjan. Livraison dans toutes les communes.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
