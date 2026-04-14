/**
 * /api/wizard — save and retrieve wizard answers per client per step.
 */

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser, SaveWizardAnswerPayload } from "@/types";

function unauthorized() {
  return Response.json({ error: "Niet geautoriseerd" }, { status: 401 });
}

/** GET /api/wizard?clientId=xxx — return all answers for a client */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  const user = session.user as unknown as SessionUser;
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");

  if (!clientId) {
    return Response.json({ error: "clientId verplicht" }, { status: 400 });
  }

  // Verify ownership
  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId: user.organizationId },
  });
  if (!client) return Response.json({ error: "Niet gevonden" }, { status: 404 });

  const answers = await prisma.wizardAnswer.findMany({
    where: { clientId },
  });

  return Response.json(answers);
}

/** POST /api/wizard — upsert a single wizard answer */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  const user = session.user as unknown as SessionUser;
  const body: SaveWizardAnswerPayload = await req.json();

  if (!body.clientId || !body.vraagKey || !body.antwoord || !body.stap) {
    return Response.json({ error: "Verplichte velden ontbreken" }, { status: 400 });
  }

  // Verify ownership
  const client = await prisma.client.findFirst({
    where: { id: body.clientId, organizationId: user.organizationId },
  });
  if (!client) return Response.json({ error: "Niet gevonden" }, { status: 404 });

  // Prevent edits on finalized clients
  if (client.status === "AFGEROND") {
    return Response.json({ error: "Dossier is afgesloten" }, { status: 403 });
  }

  const answer = await prisma.wizardAnswer.upsert({
    where: {
      clientId_vraagKey: { clientId: body.clientId, vraagKey: body.vraagKey },
    },
    create: {
      clientId: body.clientId,
      stap: body.stap,
      vraagKey: body.vraagKey,
      antwoord: body.antwoord,
      toelichting: body.toelichting,
    },
    update: {
      antwoord: body.antwoord,
      toelichting: body.toelichting,
    },
  });

  return Response.json(answer);
}
