"use client";

import { useRouter } from "next/navigation";
import DishOrbitCarousel, { type Dish } from "@/components/ui/dish-orbit-carousel";

export function SelectionOrbit({ articles }: { articles: Dish[] }) {
  const router = useRouter();
  return (
    <DishOrbitCarousel
      dishes={articles}
      height="100svh"
      loop
      onOrder={(d) => {
        if (d.slug) router.push(`/produit/${d.slug}`);
      }}
    />
  );
}
