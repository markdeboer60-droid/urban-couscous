/**
 * auth.ts — NextAuth configuration helpers
 * Exports authOptions for use in both the route handler and getServerSession calls.
 */

import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/types";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email en wachtwoord",
      credentials: {
        email: { label: "E-mailadres", type: "email" },
        password: { label: "Wachtwoord", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { organization: true },
        });

        if (!user) return null;

        const valid = await bcrypt.compare(
          credentials.password,
          user.wachtwoordHash
        );
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          naam: user.naam,
          rol: user.rol,
          organizationId: user.organizationId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Cast — authorize returns our extended user shape
        const u = user as unknown as SessionUser;
        token.id = u.id;
        token.naam = u.naam;
        token.rol = u.rol;
        token.organizationId = u.organizationId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          id: token.id as string,
          naam: token.naam as string,
          email: token.email as string,
          rol: token.rol as SessionUser["rol"],
          organizationId: token.organizationId as string,
        } as unknown as typeof session.user;
      }
      return session;
    },
  },
};

/**
 * Compute next review date based on risk level.
 * HOOG = +1 year, MIDDEN = +2 years, LAAG = +3 years
 */
export function berekenVolgendeReview(
  risicoOordeel: "LAAG" | "MIDDEN" | "HOOG"
): Date {
  const now = new Date();
  const years = risicoOordeel === "HOOG" ? 1 : risicoOordeel === "MIDDEN" ? 2 : 3;
  return new Date(now.setFullYear(now.getFullYear() + years));
}
