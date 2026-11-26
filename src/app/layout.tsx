import type { Metadata, Viewport } from "next";
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

// Mobile : largeur de l'appareil, pas de zoom (ni pincement, ni zoom auto
// iOS au focus d'un champ) — la page reste fixe. viewportFit pour les
// encoches (env(safe-area-inset-*) utilisés par la nav basse).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  title: {
    default: "Boutique SOUKEYNA",
    template: "%s | SOUKEYNA",
  },
  description:
    "Boutique en ligne SOUKEYNA : vêtements, chaussures, sacs et accessoires à Abidjan. Livraison dans toutes les communes.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Toutes les images viennent de Cloudinary : la connexion est
            préparée à l'avance — chaque image arrive plus tôt */}
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
