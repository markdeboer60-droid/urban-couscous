/**
 * Managementrapport — overzicht van het volledige cliëntenportfolio.
 * Alleen toegankelijk voor PARTNER-rol.
 * Printbaar via Ctrl+P / "Afdrukken" knop.
 */

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/types";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

export default async function RapportPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const user = session.user as unknown as SessionUser;
  if (user.rol !== "PARTNER") redirect("/");

  const orgId = user.organizationId;
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    totaalClienten,
    perStatus,
    perRisico,
    hoogrisicoClienten,
    achtertalligeReviews,
    komendReviews,
    openMeldingen,
    openAlerts,
    eddClienten,
    organization,
  ] = await Promise.all([
    prisma.client.count({ where: { organizationId: orgId } }),

    prisma.client.groupBy({ by: ["status"], where: { organizationId: orgId }, _count: true }),

    prisma.client.groupBy({
      by: ["risicoOordeel"],
      where: { organizationId: orgId, risicoOordeel: { not: null } },
      _count: true,
    }),

    prisma.client.findMany({
      where: { organizationId: orgId, risicoOordeel: "HOOG", status: { not: "BEEINDIGD" } },
      select: { id: true, naam: true, status: true, aangemaakt: true, lastScreenedOp: true },
      orderBy: { aangemaakt: "asc" },
    }),

    prisma.review.findMany({
      where: {
        client: { organizationId: orgId },
        status: { in: ["GEPLAND", "ACHTERSTALLIG"] },
        volgendeReviewOp: { lt: now },
      },
      include: { client: { select: { id: true, naam: true, risicoOordeel: true } } },
      orderBy: { volgendeReviewOp: "asc" },
      take: 25,
    }),

    prisma.review.findMany({
      where: {
        client: { organizationId: orgId },
        status: "GEPLAND",
        volgendeReviewOp: { gte: now, lte: in30Days },
      },
      include: { client: { select: { id: true, naam: true, risicoOordeel: true } } },
      orderBy: { volgendeReviewOp: "asc" },
      take: 25,
    }),

    prisma.melding.findMany({
      where: {
        client: { organizationId: orgId },
        beslissing: "FIU_MELDING",
        afgerondOp: null,
      },
      include: { client: { select: { id: true, naam: true } } },
      orderBy: { datumTransactie: "desc" },
      take: 25,
    }),

    prisma.monitoringAlert.findMany({
      where: { client: { organizationId: orgId }, opgelost: false },
      include: { client: { select: { id: true, naam: true } } },
      orderBy: { aangemaakt: "desc" },
      take: 25,
    }),

    prisma.client.findMany({
      where: { organizationId: orgId, isEdd: true, status: { not: "BEEINDIGD" } },
      select: { id: true, naam: true, eddGoedgekeurdOp: true, status: true },
      orderBy: { naam: "asc" },
    }),

    prisma.organization.findUnique({
      where: { id: orgId },
      select: { naam: true, kvkNummer: true },
    }),
  ]);

  const statusMap = Object.fromEntries(perStatus.map((r) => [r.status, r._count]));
  const risicoMap = Object.fromEntries(perRisico.map((r) => [r.risicoOordeel as string, r._count]));

  const exportDate = now.toLocaleDateString("nl-NL", {
    day: "numeric", month: "long", year: "numeric",
  });

  const RISICO_COLOR: Record<string, string> = {
    LAAG: "text-green-700 bg-green-50",
    MIDDEN: "text-orange-700 bg-orange-50",
    HOOG: "text-red-700 bg-red-50",
  };

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      {/* Nav — hidden when printing */}
      <div className="print:hidden bg-white border-b px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="font-semibold text-gray-900">Managementrapport</h1>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border rounded px-3 py-1.5"
          >
            <Printer className="h-4 w-4" />
            Afdrukken / PDF
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8 print:px-0 print:py-6">

        {/* Header */}
        <div className="border-b pb-6 print:border-gray-300">
          <h1 className="text-2xl font-bold text-gray-900">Wwft Compliance — Managementrapport</h1>
          <p className="text-sm text-gray-500 mt-1">
            {organization?.naam}{organization?.kvkNummer ? ` · KvK ${organization.kvkNummer}` : ""} · Gegenereerd op {exportDate}
          </p>
        </div>

        {/* Portfolio samenvatting */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Portfolio samenvatting</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Totaal cliënten", value: totaalClienten, color: "bg-blue-50 text-blue-800" },
              { label: "In behandeling", value: statusMap["IN_BEHANDELING"] ?? 0, color: "bg-yellow-50 text-yellow-800" },
              { label: "Afgerond", value: statusMap["AFGEROND"] ?? 0, color: "bg-green-50 text-green-800" },
              { label: "Beëindigd", value: statusMap["BEEINDIGD"] ?? 0, color: "bg-gray-50 text-gray-600" },
            ].map((t) => (
              <div key={t.label} className={`rounded-lg p-4 ${t.color}`}>
                <p className="text-2xl font-bold">{t.value}</p>
                <p className="text-xs font-medium mt-0.5">{t.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Risicoverdeling */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Risicoverdeling</h2>
          <div className="grid grid-cols-3 gap-4">
            {(["LAAG", "MIDDEN", "HOOG"] as const).map((r) => {
              const count = risicoMap[r] ?? 0;
              const pct = totaalClienten > 0 ? Math.round((count / totaalClienten) * 100) : 0;
              return (
                <div key={r} className={`rounded-lg p-4 ${RISICO_COLOR[r]}`}>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs font-medium">{r.charAt(0) + r.slice(1).toLowerCase()} risico</p>
                  <div className="mt-2 h-1.5 bg-white/60 rounded-full overflow-hidden">
                    <div className="h-full bg-current opacity-40 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs mt-1 opacity-70">{pct}% van portfolio</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Actiepunten */}
        <section className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-800">Actiepunten</h2>

          {/* Achterstallige reviews */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center justify-between">
              <h3 className="font-medium text-red-800 text-sm">Achterstallige periodieke reviews</h3>
              <span className="text-sm font-bold text-red-700">{achtertalligeReviews.length}</span>
            </div>
            {achtertalligeReviews.length === 0 ? (
              <p className="text-sm text-gray-400 px-4 py-3">Geen achterstallige reviews.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="text-left px-4 py-2">Cliënt</th>
                    <th className="text-left px-4 py-2">Risico</th>
                    <th className="text-left px-4 py-2">Vervallen op</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {achtertalligeReviews.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{r.client.naam}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${RISICO_COLOR[r.client.risicoOordeel ?? ""] ?? "bg-gray-50 text-gray-600"}`}>
                          {r.client.risicoOordeel ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-red-600">
                        {new Date(r.volgendeReviewOp).toLocaleDateString("nl-NL")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Komende reviews */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center justify-between">
              <h3 className="font-medium text-yellow-800 text-sm">Reviews komende 30 dagen</h3>
              <span className="text-sm font-bold text-yellow-700">{komendReviews.length}</span>
            </div>
            {komendReviews.length === 0 ? (
              <p className="text-sm text-gray-400 px-4 py-3">Geen komende reviews.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="text-left px-4 py-2">Cliënt</th>
                    <th className="text-left px-4 py-2">Risico</th>
                    <th className="text-left px-4 py-2">Vervaldatum</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {komendReviews.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-2 font-medium">{r.client.naam}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${RISICO_COLOR[r.client.risicoOordeel ?? ""] ?? "bg-gray-50 text-gray-600"}`}>
                          {r.client.risicoOordeel ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {new Date(r.volgendeReviewOp).toLocaleDateString("nl-NL")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Open FIU-meldingen */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center justify-between">
              <h3 className="font-medium text-red-800 text-sm">Niet-gefinaliseerde FIU-meldingen</h3>
              <span className="text-sm font-bold text-red-700">{openMeldingen.length}</span>
            </div>
            {openMeldingen.length === 0 ? (
              <p className="text-sm text-gray-400 px-4 py-3">Geen openstaande FIU-meldingen.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="text-left px-4 py-2">Cliënt</th>
                    <th className="text-left px-4 py-2">Bedrag</th>
                    <th className="text-left px-4 py-2">Transactiedatum</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {openMeldingen.map((m) => (
                    <tr key={m.id}>
                      <td className="px-4 py-2 font-medium">{m.client.naam}</td>
                      <td className="px-4 py-2">€{m.bedrag.toFixed(2)}</td>
                      <td className="px-4 py-2">{new Date(m.datumTransactie).toLocaleDateString("nl-NL")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Monitoring alerts */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-orange-50 border-b border-orange-200 px-4 py-2 flex items-center justify-between">
              <h3 className="font-medium text-orange-800 text-sm">Onopgeloste monitoring-alerts</h3>
              <span className="text-sm font-bold text-orange-700">{openAlerts.length}</span>
            </div>
            {openAlerts.length === 0 ? (
              <p className="text-sm text-gray-400 px-4 py-3">Geen openstaande monitoring-alerts.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="text-left px-4 py-2">Cliënt</th>
                    <th className="text-left px-4 py-2">Type</th>
                    <th className="text-left px-4 py-2">Melding</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {openAlerts.map((a) => (
                    <tr key={a.id}>
                      <td className="px-4 py-2 font-medium whitespace-nowrap">{a.client.naam}</td>
                      <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">{a.bron}</td>
                      <td className="px-4 py-2 text-xs">{a.omschrijving}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Hoog-risico cliënten */}
        {hoogrisicoClienten.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Hoog-risico cliënten ({hoogrisicoClienten.length})
            </h2>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="text-left px-4 py-2">Naam</th>
                    <th className="text-left px-4 py-2">Status</th>
                    <th className="text-left px-4 py-2">Aangemaakt</th>
                    <th className="text-left px-4 py-2">Laatste screening</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {hoogrisicoClienten.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-2 font-medium">{c.naam}</td>
                      <td className="px-4 py-2 text-xs text-gray-500">{c.status}</td>
                      <td className="px-4 py-2">{new Date(c.aangemaakt).toLocaleDateString("nl-NL")}</td>
                      <td className="px-4 py-2">
                        {c.lastScreenedOp
                          ? new Date(c.lastScreenedOp).toLocaleDateString("nl-NL")
                          : <span className="text-gray-400">Nooit</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* EDD cliënten */}
        {eddClienten.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Verscherpt cliëntenonderzoek (EDD) — {eddClienten.length}
            </h2>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="text-left px-4 py-2">Naam</th>
                    <th className="text-left px-4 py-2">Status</th>
                    <th className="text-left px-4 py-2">EDD goedgekeurd op</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {eddClienten.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-2 font-medium">{c.naam}</td>
                      <td className="px-4 py-2 text-xs text-gray-500">{c.status}</td>
                      <td className="px-4 py-2">
                        {c.eddGoedgekeurdOp
                          ? new Date(c.eddGoedgekeurdOp).toLocaleDateString("nl-NL")
                          : <span className="text-gray-400">Nog niet goedgekeurd</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Footer */}
        <div className="border-t pt-6 text-xs text-gray-400 flex items-center justify-between">
          <span>Wwft Compliance Tool — vertrouwelijk intern document</span>
          <span>{exportDate}</span>
        </div>
      </main>

      <style>{`
        @media print {
          nav, .print\\:hidden { display: none !important; }
          body { background: white; }
          table { page-break-inside: avoid; }
          h2 { page-break-after: avoid; }
        }
      `}</style>
    </div>
  );
}
