/**
 * /api/notificaties
 * GET   ?unreadOnly=true  — haal notificaties op voor de huidige organisatie
 * PATCH {notificatieId}   — markeer als gelezen (of alle als gelezen: {all: true})
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
  const unreadOnly = req.nextUrl.searchParams.get("unreadOnly") === "true";

  const notificaties = await prisma.notificatie.findMany({
    where: {
      organizationId: user.organizationId,
      ...(unreadOnly ? { gelezen: false } : {}),
    },
    orderBy: { aangemaakt: "desc" },
    take: 50,
    include: { client: { select: { naam: true } } },
  });

  return Response.json(notificaties);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  const user = session.user as unknown as SessionUser;
  const body: { notificatieId?: string; all?: boolean } = await req.json();

  if (body.all) {
    await prisma.notificatie.updateMany({
      where: { organizationId: user.organizationId, gelezen: false },
      data: { gelezen: true, gelezenOp: new Date() },
    });
    return Response.json({ ok: true });
  }

  if (!body.notificatieId) {
    return Response.json({ error: "notificatieId of all verplicht" }, { status: 400 });
  }

  const notificatie = await prisma.notificatie.findFirst({
    where: { id: body.notificatieId, organizationId: user.organizationId },
  });
  if (!notificatie) return Response.json({ error: "Niet gevonden" }, { status: 404 });

  await prisma.notificatie.update({
    where: { id: body.notificatieId },
    data: { gelezen: true, gelezenOp: new Date() },
  });

  return Response.json({ ok: true });
}
