/**
 * /api/meldingen — create, retrieve and finalize unusual transaction reports.
 * Only PARTNER may finalize a FIU-melding.
 */

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser, CreateMeldingPayload, FinalizeMeldingPayload } from "@/types";

function unauthorized() {
  return Response.json({ error: "Niet geautoriseerd" }, { status: 401 });
}

/** GET /api/meldingen?clientId=xxx */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  const user = session.user as unknown as SessionUser;
  const clientId = new URL(req.url).searchParams.get("clientId");

  if (!clientId) return Response.json({ error: "clientId verplicht" }, { status: 400 });

  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId: user.organizationId },
  });
  if (!client) return Response.json({ error: "Niet gevonden" }, { status: 404 });

  const meldingen = await prisma.melding.findMany({
    where: { clientId },
    include: { afgerondByUser: { select: { naam: true } } },
    orderBy: { datumTransactie: "desc" },
  });

  return Response.json(meldingen);
}

/** POST /api/meldingen — create a new melding */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  const user = session.user as unknown as SessionUser;
  const body: CreateMeldingPayload = await req.json();

  const required = ["clientId", "datumTransactie", "bedrag", "omschrijving", "indicatorType", "motivatie", "beslissing", "onderbouwing"] as const;
  for (const f of required) {
    if (body[f] === undefined || body[f] === null || body[f] === "") {
      return Response.json({ error: `${f} verplicht` }, { status: 400 });
    }
  }

  const client = await prisma.client.findFirst({
    where: { id: body.clientId, organizationId: user.organizationId },
  });
  if (!client) return Response.json({ error: "Niet gevonden" }, { status: 404 });

  const melding = await prisma.melding.create({
    data: {
      clientId: body.clientId,
      datumTransactie: new Date(body.datumTransactie),
      bedrag: body.bedrag,
      omschrijving: body.omschrijving,
      indicatorType: body.indicatorType,
      motivatie: body.motivatie,
      beslissing: body.beslissing,
      onderbouwing: body.onderbouwing,
    },
  });

  return Response.json(melding, { status: 201 });
}

/** PATCH /api/meldingen — finalize a FIU-melding (PARTNER only) */
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  const user = session.user as unknown as SessionUser;

  if (user.rol !== "PARTNER") {
    return Response.json({ error: "Alleen partners mogen meldingen finaliseren" }, { status: 403 });
  }

  const body: FinalizeMeldingPayload = await req.json();

  if (!body.meldingId) {
    return Response.json({ error: "meldingId verplicht" }, { status: 400 });
  }

  const melding = await prisma.melding.findFirst({
    where: {
      id: body.meldingId,
      client: { organizationId: user.organizationId },
    },
  });
  if (!melding) return Response.json({ error: "Niet gevonden" }, { status: 404 });

  if (melding.afgerondOp) {
    return Response.json({ error: "Melding is al afgerond" }, { status: 409 });
  }

  const updated = await prisma.melding.update({
    where: { id: body.meldingId },
    data: {
      afgerondDoor: user.id,
      afgerondOp: new Date(),
      fiuReferentie: body.fiuReferentie,
    },
  });

  return Response.json(updated);
}
