/**
 * Réécrit une URL Cloudinary avec transformation à la volée
 * (format auto, qualité auto, largeur cible) — indispensable sur mobile.
 * Renvoie l'URL d'origine si ce n'est pas une URL Cloudinary.
 */
export function cloud(
  url: string | null | undefined,
  largeur = 600
): string | null {
  if (!url) return null;
  if (url.includes("res.cloudinary.com") && url.includes("/upload/")) {
    return url.replace("/upload/", `/upload/f_auto,q_auto,w_${largeur}/`);
  }
  return url;
}
