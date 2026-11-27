/** Gabarit des pages légales / info boutique (CGV, confidentialité…). */
export function PageLegale({
  titre,
  children,
}: {
  titre: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1
        data-reveal="left"
        className="font-display text-2xl font-bold tracking-tight text-noir"
      >
        {titre}
      </h1>
      <div className="mt-4 space-y-3">{children}</div>
    </main>
  );
}

export function SectionLegale({
  titre,
  children,
}: {
  titre: string;
  children: React.ReactNode;
}) {
  return (
    <section
      data-reveal
      className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5"
    >
      <h2 className="text-sm font-extrabold text-noir">{titre}</h2>
      <div className="mt-2 space-y-1.5 text-sm leading-relaxed text-gris-fonce">
        {children}
      </div>
    </section>
  );
}
