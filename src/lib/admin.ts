import { auth } from "@/auth";
import { redirect } from "next/navigation";

/** Exige une session admin — sinon redirection connexion (CDC 14.3). */
export async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    redirect("/connexion?callbackUrl=/admin");
  }
  return session;
}
