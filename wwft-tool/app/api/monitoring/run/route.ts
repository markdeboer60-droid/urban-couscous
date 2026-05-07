/**
 * /api/monitoring/run — direct trigger: screen all clients for the current org.
 * Called manually from the dashboard ("Herscreen alle cliënten").
 * Also updates the schedule so the next cron run is recalculated.
 */

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { screenOrganization, berekenVolgendeRun } from "@/lib/monitoring";
import type { SessionUser } from "@/types";

export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Niet geautoriseerd" }, { status: 401 });

  const user = session.user as unknown as SessionUser;

  if (user.rol !== "PARTNER") {
    return Response.json({ error: "Alleen partners mogen een screening starten" }, { status: 403 });
  }

  const result = await screenOrganization(user.organizationId);

  // Recalculate next scheduled run if settings exist
  const settings = await prisma.organizationSettings.findUnique({
    where: { organizationId: user.organizationId },
  });
  if (settings) {
    const next = berekenVolgendeRun(
      settings.monitoringFrequentie,
      settings.monitoringTijdstip,
      settings.monitoringDagVanWeek
    );
    await prisma.organizationSettings.update({
      where: { organizationId: user.organizationId },
      data: { volgendeMonitoringRun: next },
    });
  }

  return Response.json(result);
}
