/**
 * /api/cron/monitoring — automatisch geplande screening (Vercel Cron).
 * Vercel roept dit elk uur aan; de handler beslist welke organisaties aan de beurt zijn.
 *
 * Beveiliging: controleer CRON_SECRET header of Vercel's eigen x-vercel-cron header.
 * Stel CRON_SECRET=<willekeurige string> in als omgevingsvariabele.
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { screenOrganization, berekenVolgendeRun } from "@/lib/monitoring";

export async function GET(req: NextRequest) {
  // Vercel zet automatisch x-vercel-cron: 1 bij cron-aanroepen
  const isCron = req.headers.get("x-vercel-cron") === "1";
  const cronSecret = process.env.CRON_SECRET;
  const providedSecret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");

  if (!isCron) {
    // Handmatige aanroep vereist het geheim
    if (!cronSecret || providedSecret !== cronSecret) {
      return Response.json({ error: "Niet geautoriseerd" }, { status: 401 });
    }
  }

  const now = new Date();

  // Vind alle organisaties waarvan de volgende run <= nu is
  const dueSettings = await prisma.organizationSettings.findMany({
    where: {
      volgendeMonitoringRun: { lte: now },
    },
    select: {
      organizationId: true,
      monitoringFrequentie: true,
      monitoringTijdstip: true,
      monitoringDagVanWeek: true,
    },
  });

  const results: { organizationId: string; screened: number; newAlerts: number }[] = [];

  for (const s of dueSettings) {
    try {
      const result = await screenOrganization(s.organizationId);
      results.push({ organizationId: s.organizationId, ...result });

      // Plan de volgende run in
      const next = berekenVolgendeRun(
        s.monitoringFrequentie,
        s.monitoringTijdstip,
        s.monitoringDagVanWeek
      );
      await prisma.organizationSettings.update({
        where: { organizationId: s.organizationId },
        data: { volgendeMonitoringRun: next },
      });
    } catch (err) {
      console.error(`[cron] screening mislukt voor org ${s.organizationId}:`, err);
    }
  }

  return Response.json({
    checked: dueSettings.length,
    ran: results.length,
    results,
  });
}
