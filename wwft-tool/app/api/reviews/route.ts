/**
 * /api/reviews — list reviews and complete / schedule reviews.
 */

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, berekenVolgendeReview } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { SessionUser, CompleteReviewPayload } from "@/types";

function unauthorized() {
  return Response.json({ error: "Niet geautoriseerd" }, { status: 401 });
}

/** GET /api/reviews?clientId=xxx  OR  GET /api/reviews?achterstallig=1 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  const user = session.user as unknown as SessionUser;
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  const achterstallig = searchParams.get("achterstallig");

  if (clientId) {
    // Verify ownership
    const client = await prisma.client.findFirst({
      where: { id: clientId, organizationId: user.organizationId },
    });
    if (!client) return Response.json({ error: "Niet gevonden" }, { status: 404 });

    const reviews = await prisma.review.findMany({
      where: { clientId },
      include: { uitvoerder: { select: { naam: true } } },
      orderBy: { volgendeReviewOp: "desc" },
    });
    return Response.json(reviews);
  }

  if (achterstallig) {
    // All overdue or upcoming reviews for organization
    const now = new Date();
    const in60 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const reviews = await prisma.review.findMany({
      where: {
        client: { organizationId: user.organizationId },
        status: { in: ["GEPLAND", "ACHTERSTALLIG"] },
        volgendeReviewOp: { lte: in60 },
      },
      include: {
        client: { select: { naam: true, id: true } },
        uitvoerder: { select: { naam: true } },
      },
      orderBy: { volgendeReviewOp: "asc" },
    });
    return Response.json(reviews);
  }

  return Response.json({ error: "clientId of achterstallig parameter vereist" }, { status: 400 });
}

/** POST /api/reviews — complete a review and schedule the next one */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  const user = session.user as unknown as SessionUser;
  const body: CompleteReviewPayload = await req.json();

  if (!body.reviewId || !body.risicoOordeelNa) {
    return Response.json({ error: "reviewId en risicoOordeelNa verplicht" }, { status: 400 });
  }

  // Verify the review belongs to a client in the user's org
  const review = await prisma.review.findFirst({
    where: {
      id: body.reviewId,
      client: { organizationId: user.organizationId },
    },
    include: { client: true },
  });
  if (!review) return Response.json({ error: "Niet gevonden" }, { status: 404 });

  // Mark review as completed
  const updated = await prisma.review.update({
    where: { id: body.reviewId },
    data: {
      status: "UITGEVOERD",
      uitgevoerdOp: new Date(),
      uitgevoerdDoor: user.id,
      bevindingen: body.bevindingen,
      risicoOordeelNa: body.risicoOordeelNa,
    },
  });

  // Create next scheduled review
  const volgende = berekenVolgendeReview(body.risicoOordeelNa);
  await prisma.review.create({
    data: {
      clientId: review.clientId,
      volgendeReviewOp: volgende,
      status: "GEPLAND",
    },
  });

  // Update client risk level if changed
  if (review.client.risicoOordeel !== body.risicoOordeelNa) {
    await prisma.client.update({
      where: { id: review.clientId },
      data: { risicoOordeel: body.risicoOordeelNa },
    });
  }

  logAudit(review.clientId, user.id, "REVIEW_VOLTOOID", {
    risicoOordeelNa: body.risicoOordeelNa,
    bevindingen: body.bevindingen?.slice(0, 120),
  });

  return Response.json(updated);
}
