/**
 * /api/search/icij — ICIJ Offshore Leaks search (no API key needed).
 * Every hit is flagged with a red badge.
 */

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser, IcijHit } from "@/types";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Niet geautoriseerd" }, { status: 401 });
  }

  const user = session.user as unknown as SessionUser;
  const { naam, clientId }: { naam: string; clientId: string } = await req.json();

  if (!naam || !clientId) {
    return Response.json({ error: "naam en clientId verplicht" }, { status: 400 });
  }

  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId: user.organizationId },
  });
  if (!client) return Response.json({ error: "Niet gevonden" }, { status: 404 });

  let hits: IcijHit[] = [];

  try {
    const res = await fetch(
      `https://offshoreleaks.icij.org/api/v1/search?q=${encodeURIComponent(naam)}`,
      { next: { revalidate: 0 } }
    );

    if (res.ok) {
      const data = await res.json();
      const nodes = (data.nodes as Record<string, unknown>[]) ?? [];
      hits = nodes.map((n) => ({
        naam: (n.name as string) ?? naam,
        dataset: (n.sourceID as string) ?? "",
        land: (n.countries as string[])?.join(", ") ?? undefined,
        rol: (n.node_id as string) ?? undefined,
      }));
    }
  } catch {
    // Network failure — empty result set
  }

  const searchQuery = await prisma.searchQuery.create({
    data: {
      clientId,
      zoeknaam: naam,
      bron: "ICIJ",
      uitgevoerdDoor: user.id,
    },
  });

  return Response.json({ hits, queryId: searchQuery.id });
}
