/**
 * Nieuwe melding page — create an unusual transaction report.
 */

import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/types";
import { MeldingForm } from "@/components/MeldingForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface Props {
  params: Promise<{ clientId: string }>;
}

export default async function NieuweMeldingPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const user = session.user as unknown as SessionUser;
  const { clientId } = await params;

  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId: user.organizationId },
  });

  if (!client) notFound();
  if (client.status === "AFGEROND") redirect(`/dossier/${clientId}`);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href={`/dossier/${clientId}`} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-semibold text-gray-900">Ongebruikelijke transactie</h1>
            <p className="text-xs text-gray-500">{client.naam}</p>
          </div>
        </div>
      </div>
      <main className="max-w-2xl mx-auto px-4 py-6">
        <MeldingForm clientId={clientId} />
      </main>
    </div>
  );
}
