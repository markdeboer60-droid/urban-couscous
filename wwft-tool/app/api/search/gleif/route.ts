/**
 * /api/search/gleif — GLEIF LEI lookup (no API key needed).
 * INACTIVE entities are flagged with a red badge.
 */

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser, GleifHit } from "@/types";

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

  let hits: GleifHit[] = [];

  try {
    const res = await fetch(
      `https://api.gleif.org/api/v1/fuzzycompletions?q=${encodeURIComponent(naam)}&pageSize=5`,
      { next: { revalidate: 0 } }
    );

    if (res.ok) {
      const data = await res.json();
      hits = ((data.data as Record<string, unknown>[]) ?? []).map((r) => {
        const attrs = r.attributes as Record<string, unknown>;
        const entity = (attrs?.entity as Record<string, unknown>) ?? {};
        const reg = (attrs?.registration as Record<string, unknown>) ?? {};
        return {
          bedrijfsnaam: (entity?.legalName as Record<string, string>)?.name ?? (attrs?.value as string) ?? naam,
          lei: (attrs?.lei as string) ?? "",
          rechtsvorm: (entity?.legalForm as Record<string, string>)?.id ?? undefined,
          land: (entity?.legalAddress as Record<string, string>)?.country ?? undefined,
          status: (reg?.status as string) ?? "UNKNOWN",
        };
      });
    }
  } catch {
    // Network failure — empty result set
  }

  // Log search
  const searchQuery = await prisma.searchQuery.create({
    data: {
      clientId,
      zoeknaam: naam,
      bron: "GLEIF",
      uitgevoerdDoor: user.id,
    },
  });

  return Response.json({ hits, queryId: searchQuery.id });
}
