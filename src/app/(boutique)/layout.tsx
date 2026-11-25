import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/db";
import { getCart } from "@/lib/cart";
import { NavBas } from "@/components/boutique/NavBas";
import { Splash } from "@/components/boutique/Splash";
import { MotionRoot } from "@/components/motion/MotionRoot";

export default async function BoutiqueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, cart, settings] = await Promise.all([
    auth(),
    getCart(),
    getPrisma().settings.findUnique({ where: { cle: "boutique" } }),
  ]);
  // Badge : simple somme des quantités, sans enrichir chaque ligne
  const panierCount =
    cart?.items.reduce((s, i) => s + i.quantite, 0) ?? 0;
  const tel = settings?.telephone || process.env.NEXT_PUBLIC_SHOP_PHONE;
  const wa = settings?.whatsapp || process.env.NEXT_PUBLIC_SHOP_WHATSAPP;

  return (
    <div className="flex min-h-screen flex-col bg-blanc-casse">
      <Splash />
      <MotionRoot />
      {/* En-tête façon app : se compacte et prend une ombre au scroll */}
      <header className="hdr-scroll sticky top-0 z-40 border-b border-black/5 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5">
          <Link href="/" aria-label="Accueil SOUKEYNA" className="press shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-soukeyna.png"
              alt="Soukeyna Styl'"
              className="h-10 w-auto"
            />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/recherche"
              className="press hidden rounded-full bg-gris px-3.5 py-2.5 text-xs font-semibold text-noir hover:bg-vert-clair hover:text-vert md:block"
            >
              Recherche
            </Link>
            {session?.user ? (
              <Link
                href="/compte"
                className="press hidden rounded-full bg-gris px-3.5 py-2.5 text-xs font-semibold text-noir hover:bg-vert-clair hover:text-vert md:block"
              >
                Compte
              </Link>
            ) : (
              <Link
                href="/connexion"
                className="press hidden rounded-full bg-noir px-4 py-2.5 text-xs font-semibold text-white hover:bg-vert md:block"
              >
                Connexion
              </Link>
            )}
            {session?.user?.role === "admin" && (
              <Link
                href="/admin"
                className="hidden rounded-full border border-vert px-3 py-1.5 text-xs font-semibold text-vert md:inline"
              >
                Admin
              </Link>
            )}
            <Link
              href="/panier"
              className="press relative rounded-full bg-vert px-3.5 py-2.5 text-xs font-bold text-white shadow-md shadow-vert/25 hover:bg-vert-fonce"
            >
              Panier
              {panierCount > 0 && (
                <span
                  key={panierCount}
                  className="pop absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-noir px-1 text-[10px] font-bold text-white ring-2 ring-white"
                >
                  {panierCount > 99 ? "99+" : panierCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 pb-[100px] md:pb-0">{children}</div>

      <NavBas cartCount={panierCount} />

      <footer className="relative mt-10 overflow-hidden rounded-t-[1.5rem] bg-noir text-white md:mt-16 md:rounded-t-[2rem]">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-vert/25 blur-3xl" />

        {/* Mobile : footer compact, sections repliables */}
        <div className="relative px-4 pb-[calc(96px+env(safe-area-inset-bottom))] pt-5 text-xs md:hidden">
          <div className="flex items-center gap-3">
            <span className="inline-block shrink-0 rounded-lg bg-white px-2 py-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-soukeyna.png"
                alt="Soukeyna Styl'"
                className="h-6 w-auto"
              />
            </span>
            <p className="opacity-60">
              L&apos;élégance ivoirienne, livrée chez vous.
            </p>
          </div>

          <details className="group mt-3 border-t border-white/10">
            <summary className="flex cursor-pointer list-none items-center justify-between py-3 font-semibold [&::-webkit-details-marker]:hidden">
              Contact &amp; retours
              <ChevronDown className="size-4 opacity-60 transition group-open:rotate-180" />
            </summary>
            <div className="space-y-1 pb-3 opacity-80">
              {tel && <p>Tél : {tel}</p>}
              {wa && <p>WhatsApp : {wa}</p>}
              <p className="opacity-70">
                Retours/échanges : par appel ou message (CDC 9.7).
              </p>
            </div>
          </details>

          <details className="group border-t border-white/10">
            <summary className="flex cursor-pointer list-none items-center justify-between py-3 font-semibold [&::-webkit-details-marker]:hidden">
              Livraison &amp; paiement
              <ChevronDown className="size-4 opacity-60 transition group-open:rotate-180" />
            </summary>
            <div className="pb-3 opacity-80">
              <p>
                Abidjan et environs, tarif fixe selon la commune. Paiement en
                ligne (Wave, Orange Money, MTN, Moov, carte) ou à la livraison.
              </p>
              <Link
                href="/commandes"
                className="mt-2 inline-block rounded-full bg-white/10 px-3 py-1.5 font-semibold"
              >
                Suivre ma commande
              </Link>
            </div>
          </details>

          <p className="border-t border-white/10 pt-3 text-center text-[11px] opacity-50">
            © SOUKEYNA, Abidjan, Côte d&apos;Ivoire
          </p>
        </div>

        {/* Desktop : grille 3 colonnes */}
        <div className="relative mx-auto hidden max-w-7xl gap-8 px-4 py-12 text-sm md:grid md:grid-cols-3">
          <div data-reveal>
            <span className="inline-block rounded-xl bg-white px-3 py-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-soukeyna.png"
                alt="Soukeyna Styl'"
                className="h-9 w-auto"
              />
            </span>
            <p className="mt-3 opacity-70">
              L&apos;élégance ivoirienne, livrée chez vous à Abidjan, Côte
              d&apos;Ivoire.
            </p>
          </div>
          <div data-reveal>
            <p className="font-semibold">Contact & retours</p>
            {tel && <p className="mt-2">Tél : {tel}</p>}
            {wa && <p>WhatsApp : {wa}</p>}
            <p className="mt-2 text-xs opacity-70">
              Pour tout retour ou échange, contactez-nous par appel ou message
              (CDC 9.7).
            </p>
          </div>
          <div data-reveal>
            <p className="font-semibold">Livraison & paiement</p>
            <p className="mt-2 opacity-70">
              Abidjan et environs, tarif fixe selon la commune. Payez en ligne
              (Wave, Orange Money, MTN, Moov, carte) ou à la livraison.
            </p>
            <Link
              href="/commandes"
              className="mt-2 inline-block rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/20"
            >
              Suivre ma commande
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
