/**
 * Dashboard — shows all clients for the user's organization.
 * Includes filtering, search, and review alerts.
 */

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/types";
import { DashboardClient } from "@/components/DashboardClient";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const user = session.user as unknown as SessionUser;

  const clients = await prisma.client.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { aangemaakt: "desc" },
    include: {
      aanmaker: { select: { naam: true } },
      reviews: {
        orderBy: { volgendeReviewOp: "asc" },
        take: 1,
      },
    },
  });

  // Serialize dates to strings for client components
  const serialized = clients.map((c) => ({
    ...c,
    aangemaakt: c.aangemaakt.toISOString(),
    goedgekeurdOp: c.goedgekeurdOp?.toISOString() ?? null,
    eddGoedgekeurdOp: c.eddGoedgekeurdOp?.toISOString() ?? null,
    beeindigd: c.beeindigd?.toISOString() ?? null,
    verwijderDatum: c.verwijderDatum?.toISOString() ?? null,
    reviews: c.reviews.map((r) => ({
      ...r,
      volgendeReviewOp: r.volgendeReviewOp.toISOString(),
      uitgevoerdOp: r.uitgevoerdOp?.toISOString() ?? null,
    })),
  }));

  return <DashboardClient clients={serialized} userName={user.naam} userRol={user.rol} />;
}
