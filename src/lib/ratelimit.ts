// Limitation de requêtes en mémoire (CDC 14.4) — fenêtre glissante par clé.
// Suffisant pour un déploiement mono-instance ; pour du multi-instance,
// brancher un store partagé (Upstash Redis, etc.).
const buckets = new Map<string, number[]>();

// Purge périodique des clés inactives pour éviter la fuite mémoire
let dernierePurge = 0;
function purger(fenetreMs: number) {
  const now = Date.now();
  if (now - dernierePurge < 60_000) return;
  dernierePurge = now;
  for (const [cle, hits] of buckets) {
    const actifs = hits.filter((t) => now - t < fenetreMs);
    if (actifs.length === 0) buckets.delete(cle);
    else buckets.set(cle, actifs);
  }
}

/**
 * Retourne true si la requête est dans la limite, false sinon.
 * @param cle  identifiant (IP + route)
 * @param max  nombre max de requêtes dans la fenêtre
 * @param fenetreMs  durée de la fenêtre en ms
 */
export function autorise(cle: string, max: number, fenetreMs: number): boolean {
  purger(fenetreMs);
  const now = Date.now();
  const hits = (buckets.get(cle) ?? []).filter((t) => now - t < fenetreMs);
  if (hits.length >= max) {
    buckets.set(cle, hits);
    return false;
  }
  hits.push(now);
  buckets.set(cle, hits);
  return true;
}

interface RequeteMin {
  headers: { get(name: string): string | null };
}

/**
 * IP du client. La valeur LA PLUS À DROITE de x-forwarded-for est celle
 * ajoutée par le proxy le plus proche (Railway, Vercel, nginx) — les
 * entrées à gauche sont client-contrôlées et spoofables. x-real-ip sert
 * de repli seulement : il n'est pas systématiquement réécrit par le
 * proxy et peut être forgé par le client.
 * Accepte une Request/Response-like ou directement l'objet Headers.
 */
export function ipClient(req: RequeteMin | Headers): string {
  const h = req instanceof Headers ? req : req.headers;
  const fwd = h.get("x-forwarded-for");
  if (fwd) {
    const dernier = fwd.split(",").pop()?.trim();
    if (dernier) return dernier;
  }
  return h.get("x-real-ip")?.trim() || "inconnue";
}
