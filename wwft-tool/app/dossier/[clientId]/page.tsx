/**
 * Dossier page — full client file with OSINT tabs, reviews, and meldingen.
 */

import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser, InterneReviewStatus } from "@/types";
import { DossierClient } from "@/components/DossierClient";

interface Props {
  params: Promise<{ clientId: string }>;
}

export default async function DossierPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const user = session.user as unknown as SessionUser;
  const { clientId } = await params;

  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId: user.organizationId },
    include: {
      aanmaker: { select: { naam: true } },
      goedgekeurdeUser: { select: { naam: true } },
      terBeoordelingUser: { select: { naam: true } },
      interneReviewUser: { select: { naam: true } },
    },
  });

  if (!client) notFound();

  const serialized = {
    ...client,
    aangemaakt: client.aangemaakt.toISOString(),
    goedgekeurdOp: client.goedgekeurdOp?.toISOString() ?? null,
    eddGoedgekeurdOp: client.eddGoedgekeurdOp?.toISOString() ?? null,
    beeindigd: client.beeindigd?.toISOString() ?? null,
    verwijderDatum: client.verwijderDatum?.toISOString() ?? null,
    terBeoordelingOp: client.terBeoordelingOp?.toISOString() ?? null,
    interneReviewOp: client.interneReviewOp?.toISOString() ?? null,
    interneReviewStatus: (client.interneReviewStatus ?? null) as InterneReviewStatus | null,
  };

  return (
    <DossierClient
      client={serialized}
      currentUser={{ id: user.id, naam: user.naam, rol: user.rol }}
    />
  );
}
