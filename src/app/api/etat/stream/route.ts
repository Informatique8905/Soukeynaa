import { cookies } from "next/headers";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/db";
import { verifierIdsCommandes, COOKIE_COMMANDES } from "@/lib/ownership";
import { bus, EVT, type Changement } from "@/lib/events";

export const dynamic = "force-dynamic";

// Flux SSE d'actualisation temps réel : le serveur pousse « maj » dès
// qu'une commande ou un paiement change — l'écran se rafraîchit en <1 s.
// Filtrage par portée : scope=admin (rôle admin) reçoit tout ;
// scope=commandes ne reçoit que les événements des commandes du client
// (session ou cookie signé — même règle de propriété que /api/etat).
// Heartbeat 25 s + borne 10 min (le client EventSource reconnecte seul).
export async function GET(req: Request) {
  const scope = new URL(req.url).searchParams.get("scope");
  const prisma = getPrisma();

  let concerne: (e: Changement) => Promise<boolean>;

  if (scope === "admin") {
    const session = await auth();
    if (session?.user?.role !== "admin") {
      return new Response("Non autorisé", { status: 403 });
    }
    concerne = async () => true;
  } else if (scope === "commandes") {
    const [session, store] = await Promise.all([auth(), cookies()]);
    const userId = session?.user?.id ? Number(session.user.id) : null;
    const ids = new Set(
      verifierIdsCommandes(store.get(COOKIE_COMMANDES)?.value)
    );
    concerne = async (e) => {
      if (e.clientUserId != null && userId !== null) {
        return e.clientUserId === userId;
      }
      if (e.commandeId == null) return false;
      if (ids.has(e.commandeId)) return true;
      // Événement sans clientUserId : vérification ponctuelle en base
      if (userId === null) return false;
      const o = await prisma.order.findUnique({
        where: { id: e.commandeId },
        select: { clientUserId: true },
      });
      return o?.clientUserId === userId;
    };
  } else {
    return new Response("scope invalide", { status: 400 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      const push = (d: string) => {
        try {
          controller.enqueue(enc.encode(`data: ${d}\n\n`));
        } catch {
          /* flux déjà fermé */
        }
      };
      push("pret");

      const abonne = (e: Changement) => {
        concerne(e)
          .then((ok) => {
            if (ok) push("maj");
          })
          .catch(() => {});
      };
      bus.on(EVT, abonne);

      const ping = setInterval(() => push("ping"), 25_000);
      const fin = setTimeout(menage, 10 * 60 * 1000);
      function menage() {
        clearInterval(ping);
        clearTimeout(fin);
        bus.off(EVT, abonne);
        try {
          controller.close();
        } catch {
          /* déjà fermé */
        }
      }
      req.signal.addEventListener("abort", menage);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // pas de tampon proxy (Railway/nginx)
    },
  });
}
