/**
 * /api/cron/monitoring — automatisch geplande screening (Vercel Cron).
 * Vercel roept dit elk uur aan; de handler beslist welke organisaties aan de beurt zijn.
 *
 * Beveiliging: CRON_SECRET is altijd vereist. x-vercel-cron header is niet voldoende
 * omdat deze header door elke HTTP-client kan worden nagebootst.
 * Stel CRON_SECRET=<willekeurige string> in als omgevingsvariabele.
 */

import { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { screenOrganization, berekenVolgendeRun } from "@/lib/monitoring";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  // Accept secret only via header to prevent it from appearing in server logs
  const provided = req.headers.get("x-cron-secret") ?? "";

  const secretMissing = !cronSecret || !provided;
  const secretMismatch =
    !secretMissing &&
    !timingSafeEqual(Buffer.from(cronSecret!), Buffer.from(provided));

  if (secretMissing || secretMismatch) {
    return Response.json({ error: "Niet geautoriseerd" }, { status: 401 });
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
