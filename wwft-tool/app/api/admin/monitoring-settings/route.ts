/**
 * /api/admin/monitoring-settings
 * GET  — haal instellingen op (of defaults als nog niet ingesteld)
 * POST — sla instellingen op + bereken volgende run
 * Alleen toegankelijk voor PARTNER.
 */

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { berekenVolgendeRun } from "@/lib/monitoring";
import type { SessionUser } from "@/types";

function unauthorized() {
  return Response.json({ error: "Niet geautoriseerd" }, { status: 401 });
}

const DEFAULTS = {
  monitoringFrequentie: "WEKELIJKS",
  monitoringTijdstip: "08:00",
  monitoringDagVanWeek: 1,
  emailNotificaties: true,
  appNotificaties: true,
};

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  const user = session.user as unknown as SessionUser;
  if (user.rol !== "PARTNER") return unauthorized();

  const settings = await prisma.organizationSettings.findUnique({
    where: { organizationId: user.organizationId },
  });

  return Response.json(settings ?? { ...DEFAULTS, organizationId: user.organizationId, volgendeMonitoringRun: null });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  const user = session.user as unknown as SessionUser;
  if (user.rol !== "PARTNER") return Response.json({ error: "Alleen partners" }, { status: 403 });

  const body: {
    monitoringFrequentie: string;
    monitoringTijdstip: string;
    monitoringDagVanWeek: number;
    emailNotificaties: boolean;
    appNotificaties: boolean;
  } = await req.json();

  if (!["DAGELIJKS", "WEKELIJKS"].includes(body.monitoringFrequentie)) {
    return Response.json({ error: "Ongeldige frequentie" }, { status: 400 });
  }

  const volgendeMonitoringRun = berekenVolgendeRun(
    body.monitoringFrequentie,
    body.monitoringTijdstip,
    body.monitoringDagVanWeek
  );

  const settings = await prisma.organizationSettings.upsert({
    where: { organizationId: user.organizationId },
    create: { organizationId: user.organizationId, ...body, volgendeMonitoringRun },
    update: { ...body, volgendeMonitoringRun },
  });

  return Response.json(settings);
}
