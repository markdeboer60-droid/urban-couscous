/**
 * Admin page — partner-only user management.
 */

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import type { SessionUser } from "@/types";
import { UserManagement } from "@/components/UserManagement";
import { MonitoringSettings } from "@/components/MonitoringSettings";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const user = session.user as unknown as SessionUser;
  if (user.rol !== "PARTNER") redirect("/");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="font-semibold text-gray-900">Beheer</h1>
        </div>
      </div>
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        <UserManagement />
        <div className="border rounded-lg p-4 bg-white space-y-4">
          <MonitoringSettings />
        </div>
      </main>
    </div>
  );
}
