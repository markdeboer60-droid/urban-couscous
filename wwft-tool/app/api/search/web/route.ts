/**
 * /api/search/web — Brave Search for negative news OSINT.
 * Falls back to mock snippets with risk words when no API key is configured.
 */

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser, WebSearchHit } from "@/types";

const MOCK_HITS: WebSearchHit[] = [
  {
    titel: "Voorbeeld: Fraude onderzoek geopend",
    url: "https://example.com/1",
    samenvatting: "Rechtbank Amsterdam opent onderzoek naar mogelijke fraude bij bedrijf. FIOD betrokken bij onderzoek.",
  },
  {
    titel: "Voorbeeld: Faillissement aangevraagd",
    url: "https://example.com/2",
    samenvatting: "Curator aangesteld na faillissementsaanvraag. Schuldeisers bijeen voor boedeluitkering.",
  },
  {
    titel: "Voorbeeld: Sanctielijst screening resultaat",
    url: "https://example.com/3",
    samenvatting: "Entiteit gevonden op EU-sanctielijst wegens terrorisme-financiering. Offshore constructies onderzocht.",
  },
  {
    titel: "Voorbeeld: Witwasverdachte aangehouden",
    url: "https://example.com/4",
    samenvatting: "Politie houdt verdachte aan voor witwassen van criminele opbrengsten. Corruptie en omkoping vermoed.",
  },
  {
    titel: "Voorbeeld: Geen negatieve berichten gevonden",
    url: "https://example.com/5",
    samenvatting: "Geen relevante negatieve berichtgeving aangetroffen in open bronnen voor deze zoekopdracht.",
  },
];

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

  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  let hits: WebSearchHit[];
  let isMock = false;

  if (!apiKey) {
    hits = MOCK_HITS;
    isMock = true;
  } else {
    try {
      const query = `${naam} fraude witwassen`;
      const res = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
        {
          headers: {
            Accept: "application/json",
            "X-Subscription-Token": apiKey,
          },
          next: { revalidate: 0 },
        }
      );

      if (res.ok) {
        const data = await res.json();
        hits = ((data.web?.results as Record<string, unknown>[]) ?? []).map((r) => ({
          titel: (r.title as string) ?? "",
          url: (r.url as string) ?? "",
          samenvatting: (r.description as string) ?? "",
        }));
      } else {
        hits = MOCK_HITS;
        isMock = true;
      }
    } catch {
      hits = MOCK_HITS;
      isMock = true;
    }
  }

  // Log the search
  const searchQuery = await prisma.searchQuery.create({
    data: {
      clientId,
      zoeknaam: naam,
      bron: "WEBSEARCH",
      uitgevoerdDoor: user.id,
    },
  });

  return Response.json({ hits, queryId: searchQuery.id, isMock });
}
