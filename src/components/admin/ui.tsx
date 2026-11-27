import { cn } from "@/lib/utils";
import type {
  OrderStatus,
  PaymentStatus,
  ProductStatus,
} from "@/lib/constants";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  PRODUCT_STATUS_LABELS,
} from "@/lib/constants";

// Primitives visuelles de l'espace admin — sobres, sans illustration.
// Utilisables côté serveur comme côté client (aucun hook).

/* ---------- Classes partagées ---------- */

export const champ =
  "h-10 w-full rounded-lg border border-input bg-white px-3 text-sm text-foreground shadow-[0_1px_1px_rgb(23_21_18/0.03)] placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60";

export const zoneTexte =
  "w-full rounded-lg border border-input bg-white px-3 py-2.5 text-sm text-foreground shadow-[0_1px_1px_rgb(23_21_18/0.03)] placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/15";

export const caseACocher =
  "size-4 shrink-0 cursor-pointer rounded border-input accent-vert";

type VarianteBouton = "primaire" | "secondaire" | "danger" | "fantome";

const VARIANTES_BOUTON: Record<VarianteBouton, string> = {
  primaire: "bg-vert text-white shadow-sm hover:bg-vert-fonce",
  secondaire:
    "border border-border bg-white text-foreground shadow-[0_1px_1px_rgb(23_21_18/0.04)] hover:bg-muted",
  danger:
    "border border-destructive/25 bg-white text-destructive hover:border-destructive/40 hover:bg-destructive/5",
  fantome: "text-muted-foreground hover:bg-muted hover:text-foreground",
};

export function bouton(
  variante: VarianteBouton = "primaire",
  taille: "md" | "sm" = "md",
  className?: string,
) {
  return cn(
    "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/25 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
    taille === "md" ? "h-10 px-4 text-sm" : "h-8 px-3 text-xs",
    VARIANTES_BOUTON[variante],
    className,
  );
}

export const lien =
  "font-medium text-vert underline-offset-4 transition-colors hover:text-vert-fonce hover:underline";

/* ---------- Mise en page ---------- */

export function EnTetePage({
  titre,
  description,
  actions,
  surTitre,
}: {
  titre: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  surTitre?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {surTitre && (
          <div className="mb-1.5 text-xs font-medium text-muted-foreground">
            {surTitre}
          </div>
        )}
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {titre}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

export function Panneau({
  titre,
  description,
  actions,
  children,
  className,
  corps,
}: {
  titre?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Classes du corps — passer "p-0" pour un tableau pleine largeur */
  corps?: string;
}) {
  return (
    <section
      className={cn(
        "min-w-0 overflow-hidden rounded-xl border border-border bg-white shadow-[0_1px_2px_rgb(23_21_18/0.04)]",
        className,
      )}
    >
      {(titre || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            {titre && (
              <h2 className="text-sm font-semibold text-foreground">{titre}</h2>
            )}
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn("p-5", corps)}>{children}</div>
    </section>
  );
}

export function Champ({
  label,
  aide,
  children,
  className,
}: {
  label: React.ReactNode;
  aide?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <span className="text-xs font-semibold text-foreground">{label}</span>
      {children}
      {aide && <span className="text-xs text-muted-foreground">{aide}</span>}
    </label>
  );
}

export function CaseLibellee({
  children,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  children: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "inline-flex cursor-pointer select-none items-center gap-2.5 text-sm text-foreground",
        className,
      )}
    >
      <input type="checkbox" className={caseACocher} {...props} />
      {children}
    </label>
  );
}

export function Vide({
  titre,
  children,
  className,
}: {
  titre: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-6 py-10 text-center", className)}>
      <p className="text-sm font-semibold text-foreground">{titre}</p>
      {children && (
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          {children}
        </p>
      )}
    </div>
  );
}

/* ---------- Avatar client (listes) ---------- */

const AVATARS = [
  "bg-vert-clair text-vert-fonce",
  "bg-dore-clair text-bordeaux",
  "bg-sky-50 text-sky-800",
  "bg-red-50 text-red-700",
  "bg-amber-50 text-amber-800",
] as const;

const initiales = (nom: string) =>
  nom
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((m) => m[0])
    .join("")
    .toUpperCase();

/** Avatar pastelle déterministe — la teinte cycle selon la graine (id). */
export function AvatarClient({ nom, graine }: { nom: string; graine: number }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-full text-xs font-bold",
        AVATARS[graine % AVATARS.length],
      )}
    >
      {initiales(nom)}
    </span>
  );
}

/** Carte de liste mobile (les tableaux sont réservés au desktop) */
export function CarteListe({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-white p-4 shadow-[0_1px_2px_rgb(23_21_18/0.04)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Indicateur({
  label,
  valeur,
  note,
  ton = "neutre",
  action,
}: {
  label: React.ReactNode;
  valeur: React.ReactNode;
  note?: React.ReactNode;
  ton?: "neutre" | "alerte" | "danger";
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col rounded-xl border bg-white p-5 shadow-[0_1px_2px_rgb(23_21_18/0.04)]",
        ton === "danger"
          ? "border-destructive/30"
          : ton === "alerte"
            ? "border-amber-300"
            : "border-border",
      )}
    >
      <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {ton !== "neutre" && (
          <span
            aria-hidden
            className={cn(
              "size-1.5 rounded-full",
              ton === "danger" ? "bg-destructive" : "bg-amber-500",
            )}
          />
        )}
        {label}
      </p>
      <p
        className={cn(
          "mt-2 truncate text-2xl font-bold tracking-tight tabular-nums",
          ton === "danger" && "text-destructive",
        )}
      >
        {valeur}
      </p>
      {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
      {action && <div className="mt-auto pt-3 text-xs">{action}</div>}
    </div>
  );
}

export function Alerte({
  ton = "alerte",
  titre,
  children,
  className,
}: {
  ton?: "alerte" | "danger" | "info";
  titre?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        ton === "alerte" && "border-amber-200 bg-amber-50 text-amber-900",
        ton === "danger" &&
          "border-destructive/25 bg-destructive/5 text-destructive",
        ton === "info" && "border-vert/20 bg-vert-clair/60 text-vert-fonce",
        className,
      )}
    >
      {titre && <p className="font-semibold">{titre}</p>}
      {children && (
        <div className={cn(titre && "mt-0.5", "opacity-90")}>{children}</div>
      )}
    </div>
  );
}

/* ---------- Pastilles de statut ---------- */

export type Ton = "neutre" | "vert" | "ambre" | "bleu" | "rouge" | "gris";

const TONS: Record<Ton, { fond: string; point: string }> = {
  neutre: {
    fond: "bg-white text-foreground ring-border",
    point: "bg-muted-foreground/60",
  },
  gris: {
    fond: "bg-muted text-muted-foreground ring-transparent",
    point: "bg-muted-foreground/50",
  },
  vert: {
    fond: "bg-vert-clair text-vert-fonce ring-vert/15",
    point: "bg-vert",
  },
  ambre: {
    fond: "bg-amber-50 text-amber-800 ring-amber-200",
    point: "bg-amber-500",
  },
  bleu: {
    fond: "bg-sky-50 text-sky-800 ring-sky-200",
    point: "bg-sky-500",
  },
  rouge: {
    fond: "bg-red-50 text-red-700 ring-red-200",
    point: "bg-red-500",
  },
};

export function Pastille({
  ton = "neutre",
  children,
  className,
}: {
  ton?: Ton;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        TONS[ton].fond,
        className,
      )}
    >
      <span
        aria-hidden
        className={cn("size-1.5 rounded-full", TONS[ton].point)}
      />
      {children}
    </span>
  );
}

const TON_COMMANDE: Record<OrderStatus, Ton> = {
  en_attente_paiement: "gris",
  payee: "bleu",
  en_preparation: "ambre",
  expediee: "neutre",
  livree: "vert",
  annulee: "rouge",
};

const TON_PAIEMENT: Record<PaymentStatus, Ton> = {
  en_attente: "gris",
  confirme: "vert",
  echoue: "rouge",
  annule: "gris",
  expire: "gris",
  a_verifier: "ambre",
};

const TON_PRODUIT: Record<ProductStatus, Ton> = {
  publie: "vert",
  brouillon: "gris",
  desactive: "rouge",
};

/** Statut en texte nu — point coloré + libellé, sans pastille
 * (style « Payment History »). */
export function StatutLigne({
  ton,
  children,
}: {
  ton: Ton;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm font-medium text-foreground">
      <span
        aria-hidden
        className={cn("size-2 rounded-full", TONS[ton].point)}
      />
      {children}
    </span>
  );
}

export function StatutCommandeLigne({ statut }: { statut: string }) {
  return (
    <StatutLigne ton={TON_COMMANDE[statut as OrderStatus] ?? "neutre"}>
      {ORDER_STATUS_LABELS[statut as OrderStatus] ?? statut}
    </StatutLigne>
  );
}

export function StatutPaiementLigne({ statut }: { statut: string }) {
  return (
    <StatutLigne ton={TON_PAIEMENT[statut as PaymentStatus] ?? "neutre"}>
      {PAYMENT_STATUS_LABELS[statut as PaymentStatus] ?? statut}
    </StatutLigne>
  );
}

export function StatutCommande({ statut }: { statut: string }) {
  return (
    <Pastille ton={TON_COMMANDE[statut as OrderStatus] ?? "neutre"}>
      {ORDER_STATUS_LABELS[statut as OrderStatus] ?? statut}
    </Pastille>
  );
}

export function StatutPaiement({ statut }: { statut: string }) {
  return (
    <Pastille ton={TON_PAIEMENT[statut as PaymentStatus] ?? "neutre"}>
      {PAYMENT_STATUS_LABELS[statut as PaymentStatus] ?? statut}
    </Pastille>
  );
}

export function StatutProduit({ statut }: { statut: string }) {
  return (
    <Pastille ton={TON_PRODUIT[statut as ProductStatus] ?? "neutre"}>
      {PRODUCT_STATUS_LABELS[statut as ProductStatus] ?? statut}
    </Pastille>
  );
}

export function ModeLivraison() {
  return <Pastille ton="ambre">À la livraison</Pastille>;
}
