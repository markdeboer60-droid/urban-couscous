/**
 * /api/actions — persist a risk assessment action on a search hit.
 * Records whether a hit is a real risk or a false positive.
 */

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser, SaveActionPayload } from "@/types";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Niet geautoriseerd" }, { status: 401 });
  }

  const user = session.user as unknown as SessionUser;
  const body: SaveActionPayload = await req.json();

  if (!body.searchQueryId || !body.hitTitel || !body.hitSamenvatting || !body.beslissing) {
    return Response.json({ error: "Verplichte velden ontbreken" }, { status: 400 });
  }

  // Verify the searchQuery belongs to the user's organization
  const query = await prisma.searchQuery.findFirst({
    where: {
      id: body.searchQueryId,
      client: { organizationId: user.organizationId },
    },
  });
  if (!query) {
    return Response.json({ error: "Niet gevonden" }, { status: 404 });
  }

  const action = await prisma.searchResultAction.create({
    data: {
      searchQueryId: body.searchQueryId,
      hitTitel: body.hitTitel,
      hitUrl: body.hitUrl,
      hitSamenvatting: body.hitSamenvatting,
      beslissing: body.beslissing,
      notitie: body.notitie,
      gebruikerId: user.id,
    },
  });

  return Response.json(action, { status: 201 });
}
