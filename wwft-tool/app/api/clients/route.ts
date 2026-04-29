/**
 * /api/clients — list, create, update clients.
 * All queries scoped to the session user's organizationId.
 */

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, berekenVolgendeReview } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendMail, reviewReminderHtml, highRiskAlertHtml } from "@/lib/email";
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
  const body: CreateClientPayload & { land?: string } = await req.json();

  if (!body.naam?.trim()) {
    return Response.json({ error: "Naam verplicht" }, { status: 400 });
  }

  const client = await prisma.client.create({
    data: {
      naam: body.naam.trim(),
      kvkNummer: body.kvkNummer?.trim() || null,
      land: body.land?.trim() || null,
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
  const body: UpdateClientPayload & {
    clientId: string;
    land?: string;
    isEdd?: boolean;
    eddBronVermogen?: string;
    eddGoedkeuren?: boolean;
    beeindigen?: boolean;
    beeindigdReden?: string;
  } = await req.json();

  if (!body.clientId) {
    return Response.json({ error: "clientId verplicht" }, { status: 400 });
  }

  const existing = await prisma.client.findFirst({
    where: { id: body.clientId, organizationId: user.organizationId },
  });
  if (!existing) {
    return Response.json({ error: "Niet gevonden" }, { status: 404 });
  }

  if (body.goedkeuren && user.rol !== "PARTNER") {
    return Response.json({ error: "Alleen partners mogen goedkeuren" }, { status: 403 });
  }
  if (body.eddGoedkeuren && user.rol !== "PARTNER") {
    return Response.json({ error: "Alleen partners mogen EDD goedkeuren" }, { status: 403 });
  }
  if (body.beeindigen && user.rol !== "PARTNER") {
    return Response.json({ error: "Alleen partners mogen een cliëntrelatie beëindigen" }, { status: 403 });
  }

  const updateData: Record<string, unknown> = {};
  if (body.status) updateData.status = body.status;
  if (body.risicoOordeel) updateData.risicoOordeel = body.risicoOordeel;
  if (body.risicoMotivatie !== undefined) updateData.risicoMotivatie = body.risicoMotivatie;
  if (body.eindOpmerkingen !== undefined) updateData.eindOpmerkingen = body.eindOpmerkingen;
  if (body.land !== undefined) updateData.land = body.land?.trim() || null;
  if (body.isEdd !== undefined) updateData.isEdd = body.isEdd;
  if (body.eddBronVermogen !== undefined) updateData.eddBronVermogen = body.eddBronVermogen;

  if (body.goedkeuren) {
    updateData.goedgekeurdDoor = user.id;
    updateData.goedgekeurdOp = new Date();
    updateData.status = "AFGEROND";
  }

  if (body.eddGoedkeuren) {
    updateData.eddGoedgekeurdDoor = user.id;
    updateData.eddGoedgekeurdOp = new Date();
  }

  if (body.beeindigen) {
    if (!body.beeindigdReden?.trim()) {
      return Response.json({ error: "Reden voor beëindiging verplicht" }, { status: 400 });
    }
    const nu = new Date();
    const verwijderDatum = new Date(nu);
    verwijderDatum.setFullYear(verwijderDatum.getFullYear() + 5);
    updateData.status = "BEEINDIGD";
    updateData.beeindigd = nu;
    updateData.beeindigdReden = body.beeindigdReden.trim();
    updateData.beeindigdDoor = user.id;
    updateData.verwijderDatum = verwijderDatum;
  }

  const updated = await prisma.client.update({
    where: { id: body.clientId },
    data: updateData,
  });

  // On finalization: create first review + send notifications
  if (body.goedkeuren && existing.risicoOordeel) {
    const volgende = berekenVolgendeReview(existing.risicoOordeel);
    const review = await prisma.review.create({
      data: {
        clientId: body.clientId,
        volgendeReviewOp: volgende,
        status: "GEPLAND",
      },
    });

    // Send review reminder email to creator
    const aanmaker = await prisma.user.findUnique({ where: { id: existing.aangemaaktDoor } });
    if (aanmaker?.email) {
      const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
      await sendMail({
        to: aanmaker.email,
        subject: `Review gepland — ${existing.naam}`,
        html: reviewReminderHtml({
          clientNaam: existing.naam,
          volgendeReviewOp: review.volgendeReviewOp,
          medewerkerNaam: aanmaker.naam,
          dossierUrl: `${baseUrl}/dossier/${body.clientId}`,
        }),
      }).catch(() => {/* non-blocking */});
    }
  }

  // Alert partners when a HOOG-risk client is submitted for review
  if (body.risicoOordeel === "HOOG" && existing.risicoOordeel !== "HOOG") {
    const partners = await prisma.user.findMany({
      where: { organizationId: user.organizationId, rol: "PARTNER" },
    });
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    for (const partner of partners) {
      await sendMail({
        to: partner.email,
        subject: `Hoog risico cliënt ter goedkeuring — ${existing.naam}`,
        html: highRiskAlertHtml({
          clientNaam: existing.naam,
          medewerkerNaam: user.naam,
          partnerNaam: partner.naam,
          dossierUrl: `${baseUrl}/dossier/${body.clientId}`,
        }),
      }).catch(() => {/* non-blocking */});
    }
  }

  return Response.json(updated);
}
