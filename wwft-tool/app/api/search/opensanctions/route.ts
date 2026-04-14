/**
 * /api/search/opensanctions — search the OpenSanctions API.
 * API key optional (rate-limited without). Keys never sent to client.
 */

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser, OpenSanctionsHit } from "@/types";

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

  // Verify client belongs to org
  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId: user.organizationId },
  });
  if (!client) return Response.json({ error: "Niet gevonden" }, { status: 404 });

  // Build request to OpenSanctions
  const url = `https://api.opensanctions.org/search/default?q=${encodeURIComponent(naam)}&limit=5`;
  const headers: Record<string, string> = { "Accept": "application/json" };
  const apiKey = process.env.OPENSANCTIONS_API_KEY;
  if (apiKey) headers["Authorization"] = `ApiKey ${apiKey}`;

  let hits: OpenSanctionsHit[] = [];

  try {
    const res = await fetch(url, { headers, next: { revalidate: 0 } });
    if (res.ok) {
      const data = await res.json();
      hits = (data.results ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        naam: (r.caption as string) ?? naam,
        type: ((r.schema as string) ?? "Unknown"),
        geboortedatum: ((r.properties as Record<string, string[]>)?.birthDate?.[0]) ?? undefined,
        land: ((r.properties as Record<string, string[]>)?.country?.[0]) ?? undefined,
        datasets: (r.datasets as string[]) ?? [],
        profielLink: `https://www.opensanctions.org/entities/${r.id}/`,
      }));
    }
  } catch {
    // Network failure — return empty set, log was implicit
  }

  // Record search in audit trail
  await prisma.searchQuery.create({
    data: {
      clientId,
      zoeknaam: naam,
      bron: "OPENSANCTIONS",
      uitgevoerdDoor: user.id,
    },
  });

  return Response.json({ hits, queryId: null });
}
