/**
 * Profiel page — user profile and 2FA setup.
 */

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/types";
import { TwoFactorSetup } from "@/components/TwoFactorSetup";
import Link from "next/link";
import { ArrowLeft, UserCircle } from "lucide-react";

export default async function ProfielPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const user = session.user as unknown as SessionUser;
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, naam: true, email: true, rol: true, totpEnabled: true },
  });

  if (!dbUser) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <UserCircle className="h-5 w-5 text-blue-600" />
          <div>
            <h1 className="font-semibold text-gray-900">Mijn profiel</h1>
            <p className="text-xs text-gray-500">{dbUser.email} · {dbUser.rol}</p>
          </div>
        </div>
      </div>
      <main className="max-w-xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-white border rounded-lg p-4 space-y-2">
          <h2 className="text-sm font-semibold text-gray-700">Accountgegevens</h2>
          <p className="text-sm text-gray-600"><span className="font-medium">Naam:</span> {dbUser.naam}</p>
          <p className="text-sm text-gray-600"><span className="font-medium">E-mail:</span> {dbUser.email}</p>
          <p className="text-sm text-gray-600"><span className="font-medium">Rol:</span> {dbUser.rol}</p>
        </div>

        <TwoFactorSetup totpEnabled={dbUser.totpEnabled} />
      </main>
    </div>
  );
}
