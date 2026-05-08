/**
 * Wizard page — 4-step client acceptance wizard.
 */

import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser, UserRole } from "@/types";
import { WizardStepper } from "@/components/WizardStepper";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface Props {
  params: Promise<{ clientId: string }>;
}

export default async function WizardPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const user = session.user as unknown as SessionUser;
  const { clientId } = await params;

  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId: user.organizationId },
  });

  if (!client) notFound();

  const isReadOnly = client.status === "AFGEROND" || client.status === "BEEINDIGD";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href={`/dossier/${clientId}`} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-semibold text-gray-900">{client.naam}</h1>
            <p className="text-xs text-gray-500">Cliëntacceptatie wizard</p>
          </div>
          {isReadOnly && (
            <span className="ml-auto text-xs bg-gray-100 text-gray-500 rounded px-2 py-1">Alleen-lezen</span>
          )}
        </div>
      </div>
      <main className="max-w-3xl mx-auto px-4 py-6">
        <WizardStepper
          clientId={clientId}
          clientNaam={client.naam}
          clientType={client.clientType}
          isReadOnly={isReadOnly}
          userRol={user.rol as UserRole}
          eddData={{
            isEdd: client.isEdd,
            eddBronVermogen: client.eddBronVermogen ?? undefined,
            eddGoedgekeurdOp: client.eddGoedgekeurdOp?.toISOString() ?? undefined,
          }}
          initialRisicoOordeel={client.risicoOordeel ?? ""}
          initialRisicoMotivatie={client.risicoMotivatie ?? ""}
          initialEindOpmerkingen={client.eindOpmerkingen ?? ""}
        />
      </main>
    </div>
  );
}
