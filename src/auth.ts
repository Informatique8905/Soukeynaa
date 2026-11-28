import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getPrisma } from "@/lib/db";
import { autorise, ipClient } from "@/lib/ratelimit";

const MAX_TENTATIVES = 5;
const BLOCAGE_MINUTES = 15;

export const { handlers, auth, signIn, signOut } = NextAuth({
  // JWT court : un rôle rétrogradé cesse d'être valide au plus tard à
  // l'expiration du token (7 j au lieu des 30 j par défaut).
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: "/connexion" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        motDePasse: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials, request) {
        // Limitation par IP : 30 tentatives / 15 min — complète le blocage
        // par compte (anti-force-brute distribuée n'est que partiellement
        // couverte par le blocage seul).
        if (!autorise(`login:${ipClient(request)}`, 30, 15 * 60_000)) {
          return null;
        }

        const email = String(credentials?.email ?? "")
          .toLowerCase()
          .trim();
        const motDePasse = String(credentials?.motDePasse ?? "");
        if (!email || !motDePasse) return null;

        const prisma = getPrisma();
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const ok = await bcrypt.compare(motDePasse, user.motDePasseHash);
        if (!ok) {
          // Fenêtre de blocage active : échec rejeté sans incrémenter,
          // sinon chaque tentative prolongerait indéfiniment la sanction.
          if (user.bloqueJusqua && user.bloqueJusqua > new Date()) {
            return null;
          }
          const tentatives = user.tentativesEchec + 1;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              tentativesEchec: tentatives,
              bloqueJusqua:
                tentatives >= MAX_TENTATIVES
                  ? new Date(Date.now() + BLOCAGE_MINUTES * 60_000)
                  : null,
            },
          });
          return null;
        }

        // Le blocage rejette les MAUVAISES tentatives — pas le titulaire :
        // le bon mot de passe passe même pendant la fenêtre de blocage,
        // sinon n'importe qui peut verrouiller le compte d'un tiers en
        // boucle (déni de service ciblé, ex. sur le compte admin).
        if (user.tentativesEchec > 0 || user.bloqueJusqua) {
          await prisma.user.update({
            where: { id: user.id },
            data: { tentativesEchec: 0, bloqueJusqua: null },
          });
        }

        return {
          id: String(user.id),
          email: user.email,
          name: user.nom,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      if (token.role) session.user.role = token.role as "client" | "admin";
      return session;
    },
  },
});
