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

/** IP du client depuis les en-têtes de proxy (Vercel, nginx). */
export function ipClient(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "inconnue";
}
