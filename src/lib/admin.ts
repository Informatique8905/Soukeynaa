import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/db";

/** Exige une session admin — sinon redirection connexion (CDC 14.3).
 *  Le rôle est REVÉRIFIÉ en base : le JWT peut rester valide plusieurs
 *  jours après une rétrogradation, il ne fait pas foi seul. */
export async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    redirect("/connexion?callbackUrl=/admin");
  }
  const user = await getPrisma().user.findUnique({
    where: { id: Number(session.user.id) },
    select: { role: true },
  });
  if (user?.role !== "admin") {
    redirect("/");
  }
  return session;
}
