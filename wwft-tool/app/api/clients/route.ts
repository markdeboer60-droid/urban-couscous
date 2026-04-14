/**
 * /api/clients — list clients and create new ones.
 * All queries scoped to the session user's organizationId.
 */

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, berekenVolgendeReview } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser, CreateClientPayload, UpdateClientPayload } from "@/types";

function unauthorized() {
  return Response.json({ error: "Niet geautoriseerd" }, { status: 401 });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

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

  return Response.json(clients);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  const user = session.user as unknown as SessionUser;
  const body: CreateClientPayload = await req.json();

  if (!body.naam?.trim()) {
    return Response.json({ error: "Naam verplicht" }, { status: 400 });
  }

  const client = await prisma.client.create({
    data: {
      naam: body.naam.trim(),
      kvkNummer: body.kvkNummer?.trim() || null,
      organizationId: user.organizationId,
      aangemaaktDoor: user.id,
      status: "GESTART",
    },
  });

  return Response.json(client, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  const user = session.user as unknown as SessionUser;
  const body: UpdateClientPayload & { clientId: string } = await req.json();

  if (!body.clientId) {
    return Response.json({ error: "clientId verplicht" }, { status: 400 });
  }

  // Verify the client belongs to the user's organization
  const existing = await prisma.client.findFirst({
    where: { id: body.clientId, organizationId: user.organizationId },
  });
  if (!existing) {
    return Response.json({ error: "Niet gevonden" }, { status: 404 });
  }

  // Only PARTNER can approve (goedkeuren)
  if (body.goedkeuren && user.rol !== "PARTNER") {
    return Response.json({ error: "Alleen partners mogen goedkeuren" }, { status: 403 });
  }

  const updateData: Record<string, unknown> = {};
  if (body.status) updateData.status = body.status;
  if (body.risicoOordeel) updateData.risicoOordeel = body.risicoOordeel;
  if (body.risicoMotivatie !== undefined) updateData.risicoMotivatie = body.risicoMotivatie;
  if (body.eindOpmerkingen !== undefined) updateData.eindOpmerkingen = body.eindOpmerkingen;
  if (body.goedkeuren) {
    updateData.goedgekeurdDoor = user.id;
    updateData.goedgekeurdOp = new Date();
    updateData.status = "AFGEROND";
  }

  const updated = await prisma.client.update({
    where: { id: body.clientId },
    data: updateData,
  });

  // If being finalized with a risk profile, create a review
  if (body.goedkeuren && existing.risicoOordeel) {
    const volgende = berekenVolgendeReview(existing.risicoOordeel);
    await prisma.review.create({
      data: {
        clientId: body.clientId,
        volgendeReviewOp: volgende,
        status: "GEPLAND",
      },
    });
  }

  return Response.json(updated);
}
