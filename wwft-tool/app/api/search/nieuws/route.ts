/**
 * /api/search/nieuws — zoekt via Google News RSS-feed.
 * Gratis, geen API-key vereist.
 * POST { naam, clientId }
 */

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/types";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Niet geautoriseerd" }, { status: 401 });

  const user = session.user as unknown as SessionUser;
  const { naam, clientId } = await req.json();
  if (!naam?.trim()) return Response.json({ error: "naam vereist" }, { status: 400 });

  // Verify client belongs to organization
  if (clientId) {
    const client = await prisma.client.findFirst({
      where: { id: clientId, organizationId: user.organizationId },
      select: { id: true },
    });
    if (!client) return Response.json({ error: "Niet gevonden" }, { status: 404 });
  }

  try {
    const query = encodeURIComponent(`"${naam.trim()}"`);
    const url = `https://news.google.com/rss/search?q=${query}&hl=nl&gl=NL&ceid=NL:nl`;
    const res = await fetch(url, {
      headers: { "User-Agent": "WwftComplianceTool/1.0 (RSS reader)" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return Response.json({ hits: [], isMock: false });
    }

    const xml = await res.text();

    // Extract <item> blocks
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];

    const hits = items.slice(0, 8).map((m) => {
      const block = m[1];
      const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
        ?? block.match(/<title>(.*?)<\/title>/)?.[1]
        ?? "";
      const link = block.match(/<link>(.*?)<\/link>/)?.[1]
        ?? block.match(/<guid[^>]*>(.*?)<\/guid>/)?.[1]
        ?? "";
      const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? "";
      const source = block.match(/<source[^>]*>(.*?)<\/source>/)?.[1]
        ?? block.match(/url="([^"]+)"/)?.[1]
        ?? "";

      const dateStr = pubDate
        ? new Date(pubDate).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })
        : "";

      return {
        titel: title.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim(),
        url: link.trim(),
        samenvatting: [source, dateStr].filter(Boolean).join(" · "),
      };
    }).filter((h) => h.titel.length > 0);

    return Response.json({ hits, isMock: false });
  } catch {
    return Response.json({ hits: [], isMock: false });
  }
}
