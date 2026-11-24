import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getPrisma } from "@/lib/db";

const MAX_TENTATIVES = 5;
const BLOCAGE_MINUTES = 15;

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/connexion" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        motDePasse: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "")
          .toLowerCase()
          .trim();
        const motDePasse = String(credentials?.motDePasse ?? "");
        if (!email || !motDePasse) return null;

        const prisma = getPrisma();
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        // Blocage temporaire après échecs répétés (CDC 14.2)
        if (user.bloqueJusqua && user.bloqueJusqua > new Date()) {
          return null;
        }

        const ok = await bcrypt.compare(motDePasse, user.motDePasseHash);
        if (!ok) {
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
