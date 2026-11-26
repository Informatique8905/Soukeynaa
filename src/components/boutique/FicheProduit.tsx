"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DishOrbitCarousel, { type Dish } from "@/components/ui/dish-orbit-carousel";
import { ajouterAuPanier } from "@/app/(boutique)/panier/actions";
import { deltaPanier } from "@/components/boutique/BadgePanier";
import { cloud } from "@/lib/image";

export interface LigneVariante {
  id: number;
  taille: string | null;
  couleur: string | null;
  stock: number;
}

// Nuancier : noms de couleurs fréquents → hex de pastille
const NUANCIER: Record<string, string> = {
  noir: "#111111",
  blanc: "#f5f5f5",
  rouge: "#b91c1c",
  bordeaux: "#7b1e3b",
  bleu: "#1d4ed8",
  "bleu marine": "#1e3a5f",
  marine: "#1e3a5f",
  vert: "#15803d",
  "vert olive": "#556b2f",
  olive: "#556b2f",
  kaki: "#6b7040",
  jaune: "#eab308",
  orange: "#ea580c",
  rose: "#ec4899",
  violet: "#7c3aed",
  mauve: "#a855f7",
  gris: "#9ca3af",
  beige: "#d6c9b0",
  camel: "#b07d4f",
  marron: "#6b4226",
  chocolat: "#4a2c1a",
  doré: "#c9a227",
  or: "#c9a227",
  argent: "#c0c0c0",
  argenté: "#c0c0c0",
  turquoise: "#14b8a6",
  ciel: "#38bdf8",
  fuchsia: "#d946ef",
  lilas: "#c4b5fd",
  corail: "#fb7185",
};

function swatch(couleur: string | null): string | undefined {
  if (!couleur) return undefined;
  return NUANCIER[couleur.trim().toLowerCase()] ?? "#64748b";
}

// Pastel de l'accent pour le badge prix et la bande d'orbite (reste lisible sur le thème)
function pastel(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "#e3d3d9";
  const v = parseInt(m[1], 16);
  const mix = (c: number) => Math.round(c + (255 - c) * 0.55);
  return `#${(
    (mix((v >> 16) & 255) << 16) |
    (mix((v >> 8) & 255) << 8) |
    mix(v & 255)
  )
    .toString(16)
    .padStart(6, "0")}`;
}

// Des tailles toutes numériques (38, 42.5…) = des pointures
const NUMERIQUE = /^\d{1,2}([.,]\d)?$/;

// Pastilles d'info et points « Ce qui est inclus » affichés dans la carte détail
const CHIPS = ["Livraison Abidjan", "Paiement sécurisé"];
const CHECKS = [
  "Article authentique SOUKEYNA",
  "Échange ou retour via WhatsApp",
];

export function FicheProduit({
  nom,
  description,
  categorie,
  prix,
  prixBase,
  images,
  aVariantes,
  stock,
  variantes,
  produitId,
}: {
  nom: string;
  description: string;
  categorie: string;
  prix: number;
  prixBase?: number;
  images: { url?: string; alt?: string }[];
  aVariantes: boolean;
  stock: number;
  variantes: LigneVariante[];
  produitId: number;
}) {
  const router = useRouter();
  const [fav, setFav] = useState(false);

  // État favori chargé après montage (localStorage indisponible côté serveur)
  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        const l: number[] = JSON.parse(
          localStorage.getItem("soukeyna_fav") ?? "[]"
        );
        setFav(l.includes(produitId));
      } catch {
        /* stockage indisponible */
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, [produitId]);

  const toggleFav = () => {
    const suivant = !fav;
    setFav(suivant);
    try {
      const l: number[] = JSON.parse(
        localStorage.getItem("soukeyna_fav") ?? "[]"
      );
      localStorage.setItem(
        "soukeyna_fav",
        JSON.stringify(
          suivant
            ? [...new Set([...l, produitId])]
            : l.filter((x) => x !== produitId)
        )
      );
    } catch {
      /* stockage indisponible */
    }
  };

  const { dishes, couleurParSlide, cles } = useMemo(() => {
    const cles: Record<string, number | null> = {};
    for (const v of variantes) {
      cles[`${v.couleur ?? "Standard"}|${v.taille ?? "Unique"}`] = v.id;
    }
    const urls = images
      .filter((i) => i.url)
      .map((i) => cloud(i.url, 800) ?? i.url!);
    const img = (k: number) => (urls.length ? urls[k % urls.length] : "");
    const barre = prixBase && prixBase > prix ? prixBase : undefined;

    // Article sans variantes : l'orbite fait défiler ses vues, pas de sélecteur.
    if (!aVariantes || variantes.length === 0) {
      cles["Standard|Unique"] = null;
      const views = urls.length ? urls : [""];
      return {
        cles,
        couleurParSlide: views.map(() => "Standard"),
        dishes: views.map(
          (u, k): Dish => ({
            title: nom,
            subtitle: views.length > 1 ? `Vue ${k + 1}` : categorie,
            image: u,
            alt: images[k]?.alt || nom,
            eyebrow: categorie,
            label: nom,
            prix,
            prixBarre: barre,
            categorie,
            boutique: "SOUKEYNA · Abidjan",
            description,
            chips: CHIPS,
            checks: CHECKS,
            accent: pastel("#7b1e3b"),
          }),
        ),
      };
    }

    const couleurs = [...new Set(variantes.map((v) => v.couleur ?? "Standard"))];
    const taillesAll = [
      ...new Set(variantes.map((v) => v.taille ?? "Unique")),
    ].sort();
    const tailleLabel = taillesAll.every((t) => NUMERIQUE.test(t.trim()))
      ? "Pointure"
      : "Taille";
    const taillesPour = (couleur: string) =>
      taillesAll.map((t) => ({
        label: t,
        stock:
          variantes.find(
            (v) =>
              (v.couleur ?? "Standard") === couleur &&
              (v.taille ?? "Unique") === t,
          )?.stock ?? 0,
      }));

    const slide = (
      couleur: string,
      image: string,
      alt: string,
      subtitle: string,
    ): Dish => {
      const hex = swatch(
        variantes.find((v) => (v.couleur ?? "Standard") === couleur)
          ?.couleur ?? null,
      );
      return {
        title: nom,
        subtitle,
        image,
        alt,
        eyebrow: categorie,
        label: couleur === "Standard" ? nom : `${nom} · ${couleur}`,
        prix,
        prixBarre: barre,
        categorie,
        boutique: "SOUKEYNA · Abidjan",
        description,
        chips: CHIPS,
        checks: CHECKS,
        accent: hex ? pastel(hex) : pastel("#7b1e3b"),
        swatch: hex,
        tailles: taillesPour(couleur),
        tailleLabel,
      };
    };

    // Plusieurs couleurs : chaque couleur orbite ; une seule : les vues orbitent.
    if (couleurs.length > 1) {
      return {
        cles,
        couleurParSlide: couleurs,
        dishes: couleurs.map((c, i) =>
          slide(
            c,
            img(i),
            images[i]?.alt || (c === "Standard" ? nom : `${nom} ${c}`),
            c === "Standard" ? categorie : c,
          ),
        ),
      };
    }
    const c0 = couleurs[0];
    const views = urls.length ? urls : [""];
    return {
      cles,
      couleurParSlide: views.map(() => c0),
      dishes: views.map((u, k) =>
        slide(
          c0,
          u,
          images[k]?.alt || nom,
          c0 === "Standard" ? `Vue ${k + 1}` : c0,
        ),
      ),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aVariantes, stock, produitId]);

  return (
    // --navh : hauteur de la barre de nav mobile — le stage s'arrête au-dessus
    <div className="[--navh:118px] md:[--navh:0px]">
      <DishOrbitCarousel
        dishes={dishes}
        height="calc(100svh - var(--navh))"
      loop={false}
      bibliotheque
      vtName={`produit-${produitId}`}
      onRetour={() => router.back()}
      onPartager={() => {
        const url = window.location.href;
        if (navigator.share) {
          navigator.share({ title: nom, url }).catch(() => {});
        } else {
          navigator.clipboard?.writeText(url).catch(() => {});
        }
      }}
      favori={{ actif: fav, onToggle: toggleFav }}
      onAddToCart={async (dish, index, taille) => {
        const varianteId =
          cles[`${couleurParSlide[index]}|${taille ?? "Unique"}`] ?? null;
        deltaPanier(1);
        const res = await ajouterAuPanier(produitId, varianteId, 1);
        if (res?.erreur) {
          deltaPanier(-1);
          throw new Error(res.erreur);
        }
        router.refresh();
      }}
      />
    </div>
  );
}
