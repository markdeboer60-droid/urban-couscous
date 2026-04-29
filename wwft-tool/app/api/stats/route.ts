/**
 * /api/stats — dashboard KPI aggregates for the logged-in organization.
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/types";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Niet geautoriseerd" }, { status: 401 });
  }

  const user = session.user as unknown as SessionUser;
  const orgId = user.organizationId;
  const now = new Date();

  const [
    totalClients,
    perStatus,
    perRisico,
    overdueReviews,
    upcomingReviews,
    openMeldingen,
    eddClients,
    pepDocuments,
  ] = await Promise.all([
    prisma.client.count({ where: { organizationId: orgId } }),

    prisma.client.groupBy({
      by: ["status"],
      where: { organizationId: orgId },
      _count: true,
    }),

    prisma.client.groupBy({
      by: ["risicoOordeel"],
      where: { organizationId: orgId, risicoOordeel: { not: null } },
      _count: true,
    }),

    // Overdue: gepland reviews past due date
    prisma.review.count({
      where: {
        client: { organizationId: orgId },
        status: "GEPLAND",
        volgendeReviewOp: { lt: now },
      },
    }),

    // Upcoming in 60 days
    prisma.review.count({
      where: {
        client: { organizationId: orgId },
        status: "GEPLAND",
        volgendeReviewOp: {
          gte: now,
          lte: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
        },
      },
    }),

    // FIU-meldingen not yet finalized (afgerondOp is null)
    prisma.melding.count({
      where: {
        client: { organizationId: orgId },
        beslissing: "FIU_MELDING",
        afgerondOp: null,
      },
    }),

    // Clients requiring EDD
    prisma.client.count({
      where: { organizationId: orgId, isEdd: true },
    }),

    // Documents flagged as PEP
    prisma.document.count({
      where: { client: { organizationId: orgId }, isPep: true },
    }),
  ]);

  // Mark overdue reviews as ACHTERSTALLIG (best-effort, non-blocking)
  await prisma.review.updateMany({
    where: {
      client: { organizationId: orgId },
      status: "GEPLAND",
      volgendeReviewOp: { lt: now },
    },
    data: { status: "ACHTERSTALLIG" },
  }).catch(() => {/* ignore */});

  const statusMap = Object.fromEntries(
    perStatus.map((r) => [r.status, r._count])
  );
  const risicoMap = Object.fromEntries(
    perRisico.map((r) => [r.risicoOordeel as string, r._count])
  );

  return Response.json({
    totalClients,
    perStatus: {
      GESTART: statusMap["GESTART"] ?? 0,
      IN_BEHANDELING: statusMap["IN_BEHANDELING"] ?? 0,
      AFGEROND: statusMap["AFGEROND"] ?? 0,
      BEEINDIGD: statusMap["BEEINDIGD"] ?? 0,
    },
    perRisico: {
      LAAG: risicoMap["LAAG"] ?? 0,
      MIDDEN: risicoMap["MIDDEN"] ?? 0,
      HOOG: risicoMap["HOOG"] ?? 0,
    },
    overdueReviews,
    upcomingReviews,
    openMeldingen,
    eddClients,
    pepDocuments,
  });
}
