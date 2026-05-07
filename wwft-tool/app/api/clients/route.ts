/**
 * /api/clients — list, create, update clients.
 * All queries scoped to the session user's organizationId.
 */

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, berekenVolgendeReview } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendMail, sanitizeHeader, reviewReminderHtml, highRiskAlertHtml, dossierGoedgekeurdHtml } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import type { SessionUser, CreateClientPayload, UpdateClientPayload } from "@/types";
import { RISICO_OORDEEL_VALUES, CLIENT_STATUS_VALUES } from "@/types";

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
    indienen?: boolean;
    interneReview?: boolean;
    interneReviewStatus?: "GOEDGEKEURD" | "TERUGGESTUURD";
    interneReviewNotitie?: string;
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
  if (body.interneReview && user.rol !== "SENIOR" && user.rol !== "PARTNER") {
    return Response.json({ error: "Alleen seniors en partners mogen intern beoordelen" }, { status: 403 });
  }

  if (body.status && !CLIENT_STATUS_VALUES.includes(body.status)) {
    return Response.json({ error: "Ongeldige status" }, { status: 400 });
  }
  if (body.risicoOordeel && !RISICO_OORDEEL_VALUES.includes(body.risicoOordeel)) {
    return Response.json({ error: "Ongeldig risico-oordeel" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (body.status) updateData.status = body.status;
  if (body.risicoOordeel) updateData.risicoOordeel = body.risicoOordeel;
  if (body.risicoMotivatie !== undefined) updateData.risicoMotivatie = body.risicoMotivatie;
  if (body.eindOpmerkingen !== undefined) updateData.eindOpmerkingen = body.eindOpmerkingen;
  if (body.land !== undefined) updateData.land = body.land?.trim() || null;
  if (body.isEdd !== undefined) updateData.isEdd = body.isEdd;
  if (body.eddBronVermogen !== undefined) updateData.eddBronVermogen = body.eddBronVermogen;

  // Medewerker submits dossier for internal review → TER_BEOORDELING
  if (body.indienen) {
    if (existing.status !== "IN_BEHANDELING") {
      return Response.json({ error: "Dossier moet in behandeling zijn om in te dienen" }, { status: 422 });
    }
    updateData.status = "TER_BEOORDELING";
    updateData.terBeoordelingDoor = user.id;
    updateData.terBeoordelingOp = new Date();
    updateData.interneReviewStatus = null;
    updateData.interneReviewNotitie = null;
  }

  // SENIOR / PARTNER performs internal review → approved or returned
  if (body.interneReview) {
    if (existing.status !== "TER_BEOORDELING") {
      return Response.json({ error: "Dossier staat niet ter beoordeling" }, { status: 422 });
    }
    if (!body.interneReviewStatus) {
      return Response.json({ error: "interneReviewStatus verplicht" }, { status: 400 });
    }
    updateData.interneReviewDoor = user.id;
    updateData.interneReviewOp = new Date();
    updateData.interneReviewStatus = body.interneReviewStatus;
    updateData.interneReviewNotitie = body.interneReviewNotitie ?? null;
    if (body.interneReviewStatus === "TERUGGESTUURD") {
      updateData.status = "IN_BEHANDELING";
    }
    // GOEDGEKEURD keeps TER_BEOORDELING; partner still needs to finalize with goedkeuren
  }

  if (body.goedkeuren) {
    if (!existing.risicoOordeel) {
      return Response.json(
        { error: "Stel eerst een risico-oordeel in voordat u het dossier goedkeurt" },
        { status: 422 }
      );
    }
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

  // Audit log
  if (body.beeindigen) {
    logAudit(body.clientId, user.id, "BEEINDIGD", { reden: body.beeindigdReden });
  } else if (body.goedkeuren) {
    logAudit(body.clientId, user.id, "GOEDGEKEURD");
  } else if (body.eddGoedkeuren) {
    logAudit(body.clientId, user.id, "EDD_GOEDGEKEURD");
  } else if (body.indienen) {
    logAudit(body.clientId, user.id, "TER_BEOORDELING_INGEDIEND");
  } else if (body.interneReview) {
    logAudit(body.clientId, user.id, "INTERNE_REVIEW", {
      status: body.interneReviewStatus,
      notitie: body.interneReviewNotitie?.slice(0, 120),
    });
  } else {
    if (body.status && body.status !== existing.status) {
      logAudit(body.clientId, user.id, "STATUS_GEWIJZIGD", { oud: existing.status, nieuw: body.status });
    }
    if (body.risicoOordeel && body.risicoOordeel !== existing.risicoOordeel) {
      logAudit(body.clientId, user.id, "RISICO_GEWIJZIGD", { oud: existing.risicoOordeel, nieuw: body.risicoOordeel });
    }
  }

  // On finalization: create first review + send notifications
  if (body.goedkeuren && (existing.risicoOordeel || body.risicoOordeel)) {
    const risicoForReview = (body.risicoOordeel ?? existing.risicoOordeel)!;
    const volgende = berekenVolgendeReview(risicoForReview);
    const review = await prisma.review.create({
      data: {
        clientId: body.clientId,
        volgendeReviewOp: volgende,
        status: "GEPLAND",
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const aanmaker = await prisma.user.findUnique({ where: { id: existing.aangemaaktDoor } });
    const safeNaam = sanitizeHeader(existing.naam);

    if (aanmaker?.email && aanmaker.id !== user.id) {
      await sendMail({
        to: aanmaker.email,
        subject: `Dossier goedgekeurd — ${safeNaam}`,
        html: dossierGoedgekeurdHtml({
          clientNaam: existing.naam,
          medewerkerNaam: aanmaker.naam,
          partnerNaam: user.naam,
          risicoOordeel: risicoForReview,
          dossierUrl: `${baseUrl}/dossier/${body.clientId}`,
        }),
      }).catch(() => {/* non-blocking */});
    }

    // Send review reminder email to creator
    if (aanmaker?.email) {
      await sendMail({
        to: aanmaker.email,
        subject: `Review gepland — ${safeNaam}`,
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
    const safeNaam = sanitizeHeader(existing.naam);
    for (const partner of partners) {
      await sendMail({
        to: partner.email,
        subject: `Hoog risico cliënt ter goedkeuring — ${safeNaam}`,
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
