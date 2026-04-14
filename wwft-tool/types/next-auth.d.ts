/**
 * NextAuth type augmentation to include custom session user fields.
 */

import type { DefaultSession } from "next-auth";
import type { UserRole } from "@/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      naam: string;
      rol: UserRole;
      organizationId: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    naam: string;
    rol: UserRole;
    organizationId: string;
  }
}
