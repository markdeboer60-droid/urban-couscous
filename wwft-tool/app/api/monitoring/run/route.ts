/**
 * /api/monitoring/run — re-screen all active clients in the organisation.
 * Uses free APIs only:
 *   - OpenSanctions /match/sanctions  (free, rate-limited without API key)
 *   - KvK OpenData basisbedrijfsgegevens (free, Creative Commons BY 4.0)
 *
 * Creates MonitoringAlert records for new findings.
 * Returns { screened, newAlerts }.
 */

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/types";

function unauthorized() {
  return Response.json({ error: "Niet geautoriseerd" }, { status: 401 });
}

// ─── OpenSanctions matching API (free tier) ────────────────────────────────────

interface OsMatchResult {
  id: string;
  caption: string;
  score: number;
  datasets: string[];
}

async function checkOpenSanctions(naam: string): Promise<OsMatchResult[]> {
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  const apiKey = process.env.OPENSANCTIONS_API_KEY;
  if (apiKey) headers["Authorization"] = `ApiKey ${apiKey}`;

  try {
    const res = await fetch("https://api.opensanctions.org/match/sanctions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        queries: { q0: { schema: "Thing", properties: { name: [naam] } } },
      }),
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const results: OsMatchResult[] = (data.responses?.q0?.results ?? []).filter(
      (r: OsMatchResult) => r.score >= 0.8
    );
    return results;
  } catch {
    return [];
  }
}

// ─── KvK OpenData (free, no API key required) ─────────────────────────────────

interface KvkOpenDataResponse {
  datumUitschrijving?: string;
  indicatieFaillissement?: string;  // "Ja" | "Nee"
  indicatieInsolventie?: string;
}

async function checkKvkStatus(kvkNummer: string): Promise<{ inactief: boolean; failliet: boolean } | null> {
  try {
    const res = await fetch(
      `https://opendata.kvk.nl/api/v1/hvds/basisbedrijfsgegevens/${kvkNummer}`,
      { headers: { Accept: "application/json" }, next: { revalidate: 0 } }
    );
    if (!res.ok) return null;
    const data: KvkOpenDataResponse = await res.json();
    const inactief = Boolean(data.datumUitschrijving);
    const failliet =
      data.indicatieFaillissement === "Ja" || data.indicatieInsolventie === "Ja";
    return { inactief, failliet };
  } catch {
    return null;
  }
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  const user = session.user as unknown as SessionUser;

  // Fetch all non-beëindigd clients for this org
  const clients = await prisma.client.findMany({
    where: {
      organizationId: user.organizationId,
      status: { not: "BEEINDIGD" },
    },
    select: { id: true, naam: true, kvkNummer: true },
  });

  let newAlerts = 0;

  for (const client of clients) {
    const existingAlertNames = await prisma.monitoringAlert.findMany({
      where: { clientId: client.id, opgelost: false },
      select: { omschrijving: true },
    });
    const existingSet = new Set(existingAlertNames.map((a) => a.omschrijving));

    // 1. OpenSanctions screening
    const osHits = await checkOpenSanctions(client.naam);
    for (const hit of osHits) {
      const omschrijving = `${hit.caption} — score ${Math.round(hit.score * 100)}% — datasets: ${hit.datasets.join(", ")}`;
      if (!existingSet.has(omschrijving)) {
        await prisma.monitoringAlert.create({
          data: {
            clientId: client.id,
            type: "SANCTIONS_HIT",
            bron: "OPENSANCTIONS",
            omschrijving,
          },
        });
        newAlerts++;
      }
    }

    // 2. KvK status check (only for Dutch companies with kvkNummer)
    if (client.kvkNummer) {
      const kvkStatus = await checkKvkStatus(client.kvkNummer);
      if (kvkStatus) {
        if (kvkStatus.failliet) {
          const omschrijving = `KvK ${client.kvkNummer} — faillissement of insolventie geregistreerd`;
          if (!existingSet.has(omschrijving)) {
            await prisma.monitoringAlert.create({
              data: { clientId: client.id, type: "KVK_FAILLIET", bron: "KVK_OPENDATA", omschrijving },
            });
            newAlerts++;
          }
        } else if (kvkStatus.inactief) {
          const omschrijving = `KvK ${client.kvkNummer} — uitgeschreven uit het handelsregister`;
          if (!existingSet.has(omschrijving)) {
            await prisma.monitoringAlert.create({
              data: { clientId: client.id, type: "KVK_INACTIEF", bron: "KVK_OPENDATA", omschrijving },
            });
            newAlerts++;
          }
        }
      }
    }

    // Update lastScreenedOp
    await prisma.client.update({
      where: { id: client.id },
      data: { lastScreenedOp: new Date() },
    });
  }

  return Response.json({ screened: clients.length, newAlerts });
}
