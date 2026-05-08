/**
 * /api/taken — personal task list for the logged-in user.
 * Returns: open dossiers I created, overdue reviews, returned internal reviews.
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/types";

function unauthorized() {
  return Response.json({ error: "Niet geautoriseerd" }, { status: 401 });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  const user = session.user as unknown as SessionUser;
  const now = new Date();
  const in14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const [openDossiers, teruggestuurd, achterstalligeReviews] = await Promise.all([
    // My open dossiers (created by me, still in progress)
    prisma.client.findMany({
      where: {
        aangemaaktDoor: user.id,
        status: { in: ["GESTART", "IN_BEHANDELING"] },
      },
      select: { id: true, naam: true, status: true, risicoOordeel: true, aangemaakt: true },
      orderBy: { aangemaakt: "desc" },
      take: 20,
    }),

    // Dossiers returned to me after internal review
    prisma.client.findMany({
      where: {
        aangemaaktDoor: user.id,
        interneReviewStatus: "TERUGGESTUURD",
        status: "IN_BEHANDELING",
      },
      select: { id: true, naam: true, interneReviewNotitie: true, interneReviewOp: true },
      orderBy: { interneReviewOp: "desc" },
      take: 10,
    }),

    // Overdue or soon-due reviews for my clients
    prisma.review.findMany({
      where: {
        status: { in: ["GEPLAND", "ACHTERSTALLIG"] },
        volgendeReviewOp: { lte: in14 },
        client: { aangemaaktDoor: user.id, organizationId: user.organizationId },
      },
      include: { client: { select: { id: true, naam: true } } },
      orderBy: { volgendeReviewOp: "asc" },
      take: 10,
    }),
  ]);

  return Response.json({ openDossiers, teruggestuurd, achterstalligeReviews });
}
