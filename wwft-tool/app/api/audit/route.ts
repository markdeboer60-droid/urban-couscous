/**
 * /api/audit?clientId=xxx — chronologische auditlog per cliënt.
 */

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/types";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Niet geautoriseerd" }, { status: 401 });

  const user = session.user as unknown as SessionUser;
  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId) return Response.json({ error: "clientId vereist" }, { status: 400 });

  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId: user.organizationId },
    select: { id: true },
  });
  if (!client) return Response.json({ error: "Niet gevonden" }, { status: 404 });

  const logs = await prisma.auditLog.findMany({
    where: { clientId },
    include: { user: { select: { naam: true, rol: true } } },
    orderBy: { aangemaakt: "desc" },
    take: 100,
  });

  return Response.json(logs);
}
