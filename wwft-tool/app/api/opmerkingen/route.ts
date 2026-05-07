/**
 * /api/opmerkingen — interne commentaarthread per cliënt.
 * GET  ?clientId=xxx  — laad alle opmerkingen
 * POST               — nieuwe opmerking aanmaken
 * DELETE ?id=xxx     — verwijder eigen opmerking
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

  const opmerkingen = await prisma.opmerking.findMany({
    where: { clientId },
    include: { user: { select: { naam: true, rol: true } } },
    orderBy: { aangemaakt: "asc" },
  });

  return Response.json(opmerkingen);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Niet geautoriseerd" }, { status: 401 });

  const user = session.user as unknown as SessionUser;
  const { clientId, tekst } = await req.json();

  if (!clientId || !tekst?.trim()) {
    return Response.json({ error: "clientId en tekst vereist" }, { status: 400 });
  }
  if (tekst.trim().length > 2000) {
    return Response.json({ error: "Maximaal 2000 tekens" }, { status: 400 });
  }

  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId: user.organizationId },
    select: { id: true },
  });
  if (!client) return Response.json({ error: "Niet gevonden" }, { status: 404 });

  const opmerking = await prisma.opmerking.create({
    data: { clientId, userId: user.id, tekst: tekst.trim() },
    include: { user: { select: { naam: true, rol: true } } },
  });

  return Response.json(opmerking, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Niet geautoriseerd" }, { status: 401 });

  const user = session.user as unknown as SessionUser;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return Response.json({ error: "id vereist" }, { status: 400 });

  const opmerking = await prisma.opmerking.findFirst({
    where: { id },
    include: { client: { select: { organizationId: true } } },
  });
  if (!opmerking || opmerking.client.organizationId !== user.organizationId) {
    return Response.json({ error: "Niet gevonden" }, { status: 404 });
  }
  // Only own comments or PARTNER can delete
  if (opmerking.userId !== user.id && user.rol !== "PARTNER") {
    return Response.json({ error: "Geen toegang" }, { status: 403 });
  }

  await prisma.opmerking.delete({ where: { id } });
  return Response.json({ ok: true });
}
