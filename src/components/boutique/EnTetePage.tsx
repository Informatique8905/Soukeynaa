import Link from "next/link";

/** En-tête de page catalogue : fil d'Ariane, titre, compteur, puces de filtre. */
export function EnTetePage({
  titre,
  sousTitre,
  compteur,
  ariane,
  puces,
}: {
  titre: string;
  sousTitre?: string;
  compteur?: number;
  ariane?: { href: string; label: string }[];
  puces?: { href: string; label: string; actif?: boolean }[];
}) {
  return (
    <header>
      {ariane && ariane.length > 0 && (
        <nav aria-label="Fil d'Ariane" data-reveal="left" className="flex items-center gap-1 text-xs text-gris-fonce">
          {ariane.map((a) => (
            <span key={a.href} className="flex items-center gap-1">
              <Link href={a.href} transitionTypes={["nav-back"]} className="capitalize transition hover:text-vert">
                {a.label}
              </Link>
              <span aria-hidden="true">›</span>
            </span>
          ))}
          <span className="font-semibold text-noir">{titre}</span>
        </nav>
      )}
      <div data-reveal className="relative mt-3 overflow-hidden rounded-[2rem] bg-gradient-to-br from-vert-clair via-white to-white p-5 ring-1 ring-black/5">
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-vert/10 blur-2xl" />
        <div className="relative flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold tracking-tight text-noir md:text-3xl">{titre}</h1>
            {sousTitre && <p className="mt-1 text-sm text-gris-fonce">{sousTitre}</p>}
          </div>
          {typeof compteur === "number" && (
            <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-vert shadow-sm ring-1 ring-black/5">
              {compteur} article{compteur > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
      {puces && puces.length > 0 && (
        <nav aria-label="Filtres" className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
          {puces.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              data-reveal="scale"
              aria-current={p.actif ? "page" : undefined}
              className={`press shrink-0 rounded-full px-4 py-2 text-xs font-semibold ${
                p.actif
                  ? "bg-vert text-white shadow-md shadow-vert/25"
                  : "bg-white text-noir ring-1 ring-black/10 hover:bg-vert-clair hover:text-vert"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
