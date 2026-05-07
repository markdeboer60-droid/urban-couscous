/**
 * /api/monitoring — fetch and resolve monitoring alerts.
 * GET  ?clientId=xxx   alerts for one client
 * GET  (no param)      all unresolved alerts for the org
 * PATCH                resolve an alert
 */

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/types";

function unauthorized() {
  return Response.json({ error: "Niet geautoriseerd" }, { status: 401 });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  const user = session.user as unknown as SessionUser;
  const clientId = req.nextUrl.searchParams.get("clientId");

  if (clientId) {
    const client = await prisma.client.findFirst({
      where: { id: clientId, organizationId: user.organizationId },
    });
    if (!client) return Response.json({ error: "Niet gevonden" }, { status: 404 });

    const alerts = await prisma.monitoringAlert.findMany({
      where: { clientId },
      orderBy: { aangemaakt: "desc" },
    });
    return Response.json(alerts);
  }

  // All unresolved alerts for the organisation
  const alerts = await prisma.monitoringAlert.findMany({
    where: {
      opgelost: false,
      client: { organizationId: user.organizationId },
    },
    orderBy: { aangemaakt: "desc" },
    include: { client: { select: { naam: true, id: true } } },
  });
  return Response.json(alerts);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  const user = session.user as unknown as SessionUser;
  const { alertId, herstel }: { alertId: string; herstel?: boolean } = await req.json();

  const alert = await prisma.monitoringAlert.findFirst({
    where: { id: alertId, client: { organizationId: user.organizationId } },
  });
  if (!alert) return Response.json({ error: "Niet gevonden" }, { status: 404 });

  const updated = await prisma.monitoringAlert.update({
    where: { id: alertId },
    data: herstel
      ? { opgelost: false, opgelostOp: null, opgelostDoor: null }
      : { opgelost: true, opgelostOp: new Date(), opgelostDoor: user.id },
  });
  return Response.json(updated);
}
