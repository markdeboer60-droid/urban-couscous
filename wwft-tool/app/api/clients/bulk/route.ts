/**
 * /api/clients/bulk — bulk status update for multiple clients.
 * PATCH { clientIds: string[], status: ClientStatus }
 */

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { SessionUser, ClientStatus } from "@/types";
import { CLIENT_STATUS_VALUES } from "@/types";

function unauthorized() {
  return Response.json({ error: "Niet geautoriseerd" }, { status: 401 });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  const user = session.user as unknown as SessionUser;
  const body: { clientIds: string[]; status: ClientStatus } = await req.json();

  if (!Array.isArray(body.clientIds) || body.clientIds.length === 0) {
    return Response.json({ error: "clientIds verplicht" }, { status: 400 });
  }
  if (body.clientIds.length > 50) {
    return Response.json({ error: "Maximaal 50 cliënten tegelijk" }, { status: 400 });
  }
  if (!CLIENT_STATUS_VALUES.includes(body.status)) {
    return Response.json({ error: "Ongeldige status" }, { status: 400 });
  }

  // Only PARTNERs can finalize or terminate in bulk
  if ((body.status === "AFGEROND" || body.status === "BEEINDIGD") && user.rol !== "PARTNER") {
    return Response.json({ error: "Alleen partners mogen afsluiten of beëindigen" }, { status: 403 });
  }

  // Scope to user's org
  const updated = await prisma.client.updateMany({
    where: {
      id: { in: body.clientIds },
      organizationId: user.organizationId,
      status: { notIn: ["AFGEROND", "BEEINDIGD"] },
    },
    data: { status: body.status },
  });

  // Audit each
  for (const clientId of body.clientIds) {
    logAudit(clientId, user.id, "STATUS_GEWIJZIGD", { bulk: true, nieuw: body.status });
  }

  return Response.json({ updated: updated.count });
}
