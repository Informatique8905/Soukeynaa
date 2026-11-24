import Link from "next/link";

// État vide typographique — sobre, sans illustration.
export function EtatVide({
  titre,
  texte,
  action,
}: {
  /** @deprecated conservé pour compatibilité — ignoré */
  dessin?: string;
  titre: string;
  texte?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mt-8 rounded-[2rem] bg-white px-6 py-12 text-center shadow-sm ring-1 ring-black/5">
      <p className="text-lg font-extrabold text-noir">{titre}</p>
      {texte && (
        <p className="mx-auto mt-2 max-w-xs text-sm text-gris-fonce">{texte}</p>
      )}
      {action && (
        <Link
          href={action.href}
          className="press shine mt-6 inline-block rounded-full bg-vert px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-vert/25 hover:bg-vert-fonce"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
