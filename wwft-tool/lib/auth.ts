/**
 * auth.ts — NextAuth configuration helpers
 * Exports authOptions for use in both the route handler and getServerSession calls.
 * Supports optional TOTP 2FA via totpCode credential field.
 */

import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifyTotpToken } from "@/lib/totp";
import type { SessionUser } from "@/types";

const isProduction = process.env.NODE_ENV === "production";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  cookies: {
    sessionToken: {
      name: isProduction ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: isProduction,
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: "Email en wachtwoord",
      credentials: {
        email: { label: "E-mailadres", type: "email" },
        password: { label: "Wachtwoord", type: "password" },
        totpCode: { label: "2FA-code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { organization: true },
        });

        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.wachtwoordHash);
        if (!valid) return null;

        // If 2FA is enabled, require a valid TOTP code
        if (user.totpEnabled && user.totpSecret) {
          const code = credentials.totpCode ?? "";
          if (!code || !verifyTotpToken(user.totpSecret, code, user.id)) return null;
        }

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

export function berekenVolgendeReview(
  risicoOordeel: "LAAG" | "MIDDEN" | "HOOG"
): Date {
  const now = new Date();
  const years = risicoOordeel === "HOOG" ? 1 : risicoOordeel === "MIDDEN" ? 2 : 3;
  return new Date(now.setFullYear(now.getFullYear() + years));
}
