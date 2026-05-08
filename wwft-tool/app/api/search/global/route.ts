/**
 * /api/search/global?q=xxx — zoek door cliënten, documenten en opmerkingen.
 */

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/types";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Niet geautoriseerd" }, { status: 401 });

  const user = session.user as unknown as SessionUser;
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) return Response.json({ clients: [], documents: [], opmerkingen: [] });

  const orgId = user.organizationId;

  const [clients, documents, opmerkingen] = await Promise.all([
    prisma.client.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { naam: { contains: q } },
          { kvkNummer: { contains: q } },
          { risicoMotivatie: { contains: q } },
          { rechtsvorm: { contains: q } },
          { sbiOmschrijving: { contains: q } },
        ],
      },
      select: { id: true, naam: true, kvkNummer: true, status: true, risicoOordeel: true, clientType: true },
      take: 8,
    }),

    prisma.document.findMany({
      where: {
        client: { organizationId: orgId },
        OR: [
          { naamBetrokkene: { contains: q } },
          { bestandsnaam: { contains: q } },
        ],
      },
      select: {
        id: true,
        bestandsnaam: true,
        naamBetrokkene: true,
        functie: true,
        clientId: true,
        client: { select: { naam: true } },
      },
      take: 6,
    }),

    prisma.opmerking.findMany({
      where: {
        client: { organizationId: orgId },
        tekst: { contains: q },
      },
      select: {
        id: true,
        tekst: true,
        clientId: true,
        aangemaakt: true,
        client: { select: { naam: true } },
        user: { select: { naam: true } },
      },
      orderBy: { aangemaakt: "desc" },
      take: 5,
    }),
  ]);

  return Response.json({ clients, documents, opmerkingen });
}
