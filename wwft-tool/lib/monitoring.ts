/**
 * lib/monitoring.ts — centrale screeninglogica voor doorlopende monitoring.
 *
 * Gratis bronnen:
 *   1. OpenSanctions /match/sanctions  — sanctielijsten (EU, UN, OFAC, …)
 *   2. KvK OpenData basisbedrijfsgegevens — faillissement + KvK-wijzigingen
 *   3. Faillissementsdossier.nl API — officieel NL insolventieregister
 *   4. Rechtspraak.nl open data — rechtszaken / uitspraken
 *
 * Voor elke cliënt worden MonitoringAlert-records aangemaakt bij nieuwe bevindingen
 * en optioneel in-app Notificaties aangemaakt en e-mails verstuurd.
 */

import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/email";
import { getBaseUrl } from "@/lib/config";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScreeningResult {
  clientId: string;
  clientNaam: string;
  newAlerts: number;
}

interface KvkSnapshot {
  naam?: string;
  postcode?: string;
  vestigingsplaats?: string;
  sbiActiviteit?: string;
  rechtsvorm?: string;
  datumUitschrijving?: string;
  indicatieFaillissement?: string;
  indicatieInsolventie?: string;
}

// ─── 1. OpenSanctions matching API (gratis, rate-limited zonder key) ──────────

async function screenOpenSanctions(naam: string): Promise<string[]> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const apiKey = process.env.OPENSANCTIONS_API_KEY;
  if (apiKey) headers["Authorization"] = `ApiKey ${apiKey}`;

  try {
    const res = await fetch("https://api.opensanctions.org/match/sanctions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        queries: { q0: { schema: "Thing", properties: { name: [naam] } } },
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return ((data.responses?.q0?.results ?? []) as { caption: string; score: number; datasets: string[] }[])
      .filter((r) => r.score >= 0.8)
      .map((r) => `${r.caption} — score ${Math.round(r.score * 100)}% — ${r.datasets.join(", ")}`);
  } catch {
    return [];
  }
}

// ─── 2. KvK OpenData (gratis, CC BY 4.0) ─────────────────────────────────────

async function screenKvk(
  kvkNummer: string,
  prevSnapshot: KvkSnapshot | null
): Promise<{ alerts: string[]; snapshot: KvkSnapshot | null }> {
  try {
    const res = await fetch(
      `https://opendata.kvk.nl/api/v1/hvds/basisbedrijfsgegevens/${kvkNummer}`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return { alerts: [], snapshot: prevSnapshot };

    const data: KvkSnapshot = await res.json();
    const alerts: string[] = [];

    // Faillissement / insolventie
    if (data.indicatieFaillissement === "Ja" || data.indicatieInsolventie === "Ja") {
      alerts.push(`KvK ${kvkNummer} — faillissement of insolventie geregistreerd`);
    }
    if (data.datumUitschrijving) {
      alerts.push(`KvK ${kvkNummer} — uitgeschreven per ${data.datumUitschrijving}`);
    }

    // Wijzigingen t.o.v. vorig snapshot
    if (prevSnapshot) {
      if (data.naam && prevSnapshot.naam && data.naam !== prevSnapshot.naam) {
        alerts.push(`KvK-naam gewijzigd: "${prevSnapshot.naam}" → "${data.naam}"`);
      }
      if (data.vestigingsplaats && prevSnapshot.vestigingsplaats && data.vestigingsplaats !== prevSnapshot.vestigingsplaats) {
        alerts.push(`KvK-vestigingsplaats gewijzigd: ${prevSnapshot.vestigingsplaats} → ${data.vestigingsplaats}`);
      }
      if (data.postcode && prevSnapshot.postcode && data.postcode !== prevSnapshot.postcode) {
        alerts.push(`KvK-postcode gewijzigd: ${prevSnapshot.postcode} → ${data.postcode}`);
      }
      if (data.rechtsvorm && prevSnapshot.rechtsvorm && data.rechtsvorm !== prevSnapshot.rechtsvorm) {
        alerts.push(`KvK-rechtsvorm gewijzigd: ${prevSnapshot.rechtsvorm} → ${data.rechtsvorm}`);
      }
      if (data.sbiActiviteit && prevSnapshot.sbiActiviteit && data.sbiActiviteit !== prevSnapshot.sbiActiviteit) {
        alerts.push(`KvK-bedrijfsactiviteit gewijzigd: ${prevSnapshot.sbiActiviteit} → ${data.sbiActiviteit}`);
      }
    }

    return { alerts, snapshot: data };
  } catch {
    return { alerts: [], snapshot: prevSnapshot };
  }
}

// ─── 3. Faillissementsdossier.nl API (officieel NL insolventieregister) ───────

interface FaillissementRecord {
  naam?: string;
  uitgesprokenDatum?: string;
  soort?: string; // FAILLISSEMENT | SURSEANCE | SCHULDSANERING
  rechterlijkeMacht?: string;
  insolventienummer?: string;
}

async function screenFaillissementsdossier(naam: string): Promise<string[]> {
  try {
    const url = `https://www.faillissementsdossier.nl/nl/public/api/v1/insolvencies?q=${encodeURIComponent(naam)}&pageNumber=0&pageSize=5`;
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "WwftComplianceTool/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];

    const data = await res.json();
    const records: FaillissementRecord[] = data.content ?? data.results ?? data ?? [];

    // Build a match word: first word with >3 chars, or just the first word
    const words = naam.trim().toLowerCase().split(/\s+/);
    const matchWord = words.find((w) => w.length > 3) ?? words[0];

    return records
      .filter((r) => {
        if (!r.naam) return false;
        return r.naam.toLowerCase().includes(matchWord);
      })
      .map((r) => {
        const soort = r.soort ?? "Insolventie";
        const datum = r.uitgesprokenDatum ? ` (${r.uitgesprokenDatum})` : "";
        const nr = r.insolventienummer ? ` — nr. ${r.insolventienummer}` : "";
        const rb = r.rechterlijkeMacht ? ` — Rb. ${r.rechterlijkeMacht}` : "";
        return `${soort}${datum}${nr}${rb}: ${r.naam}`;
      });
  } catch {
    return [];
  }
}

// ─── 4. Rechtspraak.nl open data (uitspraken, gratis Atom-feed) ───────────────

async function screenRechtspraak(naam: string): Promise<string[]> {
  try {
    // Atom XML feed met uitspraken — zoek op naam + relevante termen
    const query = encodeURIComponent(`${naam} fraude OR faillissement OR oplichting OR witwassen OR veroordeling`);
    const url = `https://data.rechtspraak.nl/uitspraken/zoeken?q=${query}&max=5&sort=DESC`;
    const res = await fetch(url, {
      headers: { Accept: "application/atom+xml" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];

    const xml = await res.text();
    // Parse titles from Atom entries
    const titleMatches = [...xml.matchAll(/<title[^>]*>([^<]+)<\/title>/g)];
    const dateMatches = [...xml.matchAll(/<updated>([^<]+)<\/updated>/g)];

    // Build match word from name: first word with >3 chars, or first word
    const naamWords = naam.trim().toLowerCase().split(/\s+/);
    const naamMatchWord = naamWords.find((w) => w.length > 3) ?? naamWords[0];

    return titleMatches
      .slice(1) // skip feed title
      .filter((m) => {
        const title = m[1].trim().toLowerCase();
        return title.length > 10
          && !title.startsWith("rechtspraak")
          && title.includes(naamMatchWord);
      })
      .slice(0, 3)
      .map((m, i) => {
        const date = dateMatches[i + 1]?.[1]?.substring(0, 10) ?? "";
        return `Rechtspraak.nl uitspraak${date ? ` (${date})` : ""}: ${m[1].trim()}`;
      });
  } catch {
    return [];
  }
}

// ─── 5. Google News RSS (gratis, geen API-key) ────────────────────────────────

async function screenGoogleNieuws(naam: string): Promise<string[]> {
  try {
    const naamWords = naam.trim().toLowerCase().split(/\s+/);
    const matchWord = naamWords.find((w) => w.length > 3) ?? naamWords[0];

    const query = encodeURIComponent(`"${naam}" fraude OR faillissement OR oplichting OR witwassen`);
    const url = `https://news.google.com/rss/search?q=${query}&hl=nl&gl=NL&ceid=NL:nl`;
    const res = await fetch(url, {
      headers: { "User-Agent": "WwftComplianceTool/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];

    const xml = await res.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];

    return items
      .slice(0, 5)
      .map((m) => {
        const block = m[1];
        const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
          ?? block.match(/<title>(.*?)<\/title>/)?.[1]
          ?? "";
        const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? "";
        const dateStr = pubDate ? new Date(pubDate).toLocaleDateString("nl-NL") : "";
        return { title: title.replace(/&amp;/g, "&").trim(), dateStr };
      })
      .filter((h) => {
        const lower = h.title.toLowerCase();
        return h.title.length > 10 && lower.includes(matchWord);
      })
      .map((h) => `Nieuws${h.dateStr ? ` (${h.dateStr})` : ""}: ${h.title}`);
  } catch {
    return [];
  }
}

// ─── Helper: deduplicate against existing unresolved alerts ──────────────────

async function getExistingAlertKeys(clientId: string): Promise<Set<string>> {
  const existing = await prisma.monitoringAlert.findMany({
    where: { clientId, opgelost: false },
    select: { omschrijving: true },
  });
  return new Set(existing.map((a) => a.omschrijving));
}

// ─── 6. Document expiry (60-day warning window) ───────────────────────────────

async function screenDocumentVerloop(
  clientId: string
): Promise<string[]> {
  const now = new Date();
  const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  const docs = await prisma.document.findMany({
    where: {
      clientId,
      verloopDatum: { not: null, lte: in60Days },
    },
    select: { naamBetrokkene: true, type: true, verloopDatum: true },
  });

  return docs.map((d) => {
    const days = Math.ceil((new Date(d.verloopDatum!).getTime() - now.getTime()) / 86400000);
    const who = d.naamBetrokkene ?? "onbekend";
    const type = d.type.toLowerCase().replace("_", " ");
    return days < 0
      ? `Document verlopen: ${type} van ${who} — verlopen op ${d.verloopDatum!.toLocaleDateString("nl-NL")}`
      : `Document verloopt binnenkort: ${type} van ${who} — nog ${days} dag${days !== 1 ? "en" : ""}`;
  });
}

// ─── Core: screen one client, persist results ────────────────────────────────

export async function screenClient(
  client: { id: string; naam: string; kvkNummer: string | null; kvkSnapshot: string | null; organizationId: string }
): Promise<number> {
  let newAlerts = 0;
  const existing = await getExistingAlertKeys(client.id);
  let prevSnapshot: KvkSnapshot | null = null;
  if (client.kvkSnapshot) {
    try {
      prevSnapshot = JSON.parse(client.kvkSnapshot);
    } catch {
      // ignore malformed snapshot
    }
  }

  async function persist(omschrijving: string, type: string, bron: string) {
    if (existing.has(omschrijving)) return;
    await prisma.monitoringAlert.create({
      data: { clientId: client.id, type, bron, omschrijving },
    });
    newAlerts++;
  }

  // 1. OpenSanctions
  const osHits = await screenOpenSanctions(client.naam);
  for (const hit of osHits) {
    await persist(hit, "SANCTIONS_HIT", "OPENSANCTIONS");
  }

  // 2. KvK (alleen voor NL bedrijven met KvK-nummer)
  let newSnapshot = prevSnapshot;
  if (client.kvkNummer) {
    const { alerts: kvkAlerts, snapshot } = await screenKvk(client.kvkNummer, prevSnapshot);
    newSnapshot = snapshot;
    for (const hit of kvkAlerts) {
      const type = hit.includes("faillissement") || hit.includes("insolventie")
        ? "KVK_FAILLIET"
        : hit.includes("uitgeschreven")
        ? "KVK_INACTIEF"
        : "KVK_WIJZIGING";
      await persist(hit, type, "KVK_OPENDATA");
    }
  }

  // 3. Faillissementsdossier.nl
  const failHits = await screenFaillissementsdossier(client.naam);
  for (const hit of failHits) {
    await persist(hit, "KVK_FAILLIET", "FAILLISSEMENTSDOSSIER");
  }

  // 4. Rechtspraak.nl
  const rbHits = await screenRechtspraak(client.naam);
  for (const hit of rbHits) {
    await persist(hit, "RECHTSZAAK", "RECHTSPRAAK");
  }

  // 5. Google News RSS
  const nieuwsHits = await screenGoogleNieuws(client.naam);
  for (const hit of nieuwsHits) {
    await persist(hit, "NEGATIEF_NIEUWS", "GOOGLE_NEWS");
  }

  // 6. Document verloopdatum
  const verloopHits = await screenDocumentVerloop(client.id);
  for (const hit of verloopHits) {
    await persist(hit, "DOCUMENT_VERLOPEN", "DOCUMENTEN");
  }

  // Update lastScreenedOp + KvK snapshot
  await prisma.client.update({
    where: { id: client.id },
    data: {
      lastScreenedOp: new Date(),
      kvkSnapshot: newSnapshot ? JSON.stringify(newSnapshot) : undefined,
    },
  });

  return newAlerts;
}

// ─── Screen all active clients in an organisation ────────────────────────────

// Max clients to screen in a single cron invocation to stay within Vercel function timeout
const MAX_CLIENTS_PER_RUN = 20;

export async function screenOrganization(
  organizationId: string
): Promise<{ screened: number; newAlerts: number }> {
  const clients = await prisma.client.findMany({
    where: { organizationId, status: { not: "BEEINDIGD" } },
    select: { id: true, naam: true, kvkNummer: true, kvkSnapshot: true, organizationId: true },
    orderBy: { lastScreenedOp: { sort: "asc", nulls: "first" } },
    take: MAX_CLIENTS_PER_RUN,
  });

  let totalNew = 0;
  const alertsByClient: { naam: string; count: number; clientId: string }[] = [];

  for (const client of clients) {
    const count = await screenClient(client);
    totalNew += count;
    if (count > 0) alertsByClient.push({ naam: client.naam, count, clientId: client.id });
  }

  // In-app notificatie voor alle hits samen
  if (totalNew > 0) {
    const settings = await prisma.organizationSettings.findUnique({ where: { organizationId } });
    if (!settings || settings.appNotificaties) {
      const bericht = alertsByClient
        .map((a) => `• ${a.naam}: ${a.count} nieuw${a.count !== 1 ? "e" : ""} melding${a.count !== 1 ? "en" : ""}`)
        .join("\n");
      await prisma.notificatie.create({
        data: {
          organizationId,
          type: "MONITORING_ALERT",
          titel: `Monitoring: ${totalNew} nieuwe melding${totalNew !== 1 ? "en" : ""} gevonden`,
          bericht,
          clientId: alertsByClient.length === 1 ? alertsByClient[0].clientId : null,
        },
      });
    }

    // E-mailnotificatie
    if (!settings || settings.emailNotificaties) {
      const partners = await prisma.user.findMany({
        where: { organizationId, rol: "PARTNER" },
      });
      const baseUrl = getBaseUrl();
      for (const partner of partners) {
        await sendMail({
          to: partner.email,
          subject: `Wwft monitoring — ${totalNew} nieuwe melding${totalNew !== 1 ? "en" : ""}`,
          html: monitoringAlertMailHtml({
            partnerNaam: partner.naam,
            totalNew,
            alertsByClient: alertsByClient.map((a) => ({
              naam: a.naam,
              count: a.count,
              url: `${baseUrl}/dossier/${a.clientId}`,
            })),
          }),
        }).catch(() => {});
      }
    }
  }

  return { screened: clients.length, newAlerts: totalNew };
}

// ─── E-mailtemplate voor monitoring-alerts ────────────────────────────────────

function monitoringAlertMailHtml(params: {
  partnerNaam: string;
  totalNew: number;
  alertsByClient: { naam: string; count: number; url: string }[];
}): string {
  const rows = params.alertsByClient
    .map(
      (a) =>
        `<tr><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb">
          <a href="${a.url}" style="color:#1d4ed8;text-decoration:none;font-weight:500">${a.naam}</a>
         </td>
         <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right">
           ${a.count} melding${a.count !== 1 ? "en" : ""}
         </td></tr>`
    )
    .join("");

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#dc2626">Wwft Compliance — Monitoring melding${params.totalNew !== 1 ? "en" : ""}</h2>
      <p>Beste ${params.partnerNaam},</p>
      <p>De automatische screening heeft <strong>${params.totalNew} nieuwe melding${params.totalNew !== 1 ? "en" : ""}</strong> gevonden:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
        <thead><tr style="background:#f3f4f6">
          <th style="padding:8px;text-align:left;font-weight:600">Cliënt</th>
          <th style="padding:8px;text-align:right;font-weight:600">Meldingen</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p>Log in om de details te bekijken en meldingen op te lossen.</p>
      <hr style="margin-top:32px;border:none;border-top:1px solid #e5e7eb"/>
      <p style="font-size:12px;color:#6b7280">Wwft Compliance Tool — automatisch bericht</p>
    </div>
  `;
}

// ─── Schedule helpers ─────────────────────────────────────────────────────────

/** Bereken de volgende uitvoertijd op basis van de instellingen. */
export function berekenVolgendeRun(
  frequentie: string,
  tijdstip: string,        // "HH:MM" UTC
  dagVanWeek: number       // 1=ma … 7=zo
): Date {
  const [h, m] = tijdstip.split(":").map(Number);
  const now = new Date();

  if (frequentie === "DAGELIJKS") {
    const candidate = new Date(now);
    candidate.setUTCHours(h, m, 0, 0);
    if (candidate <= now) candidate.setUTCDate(candidate.getUTCDate() + 1);
    return candidate;
  }

  // WEKELIJKS — dayVanWeek 1=ma … 7=zo (ISO weekday)
  const targetIso = dagVanWeek; // 1–7
  const candidate = new Date(now);
  candidate.setUTCHours(h, m, 0, 0);
  // getUTCDay() returns 0=sun…6=sat; convert to ISO
  const currentIso = now.getUTCDay() === 0 ? 7 : now.getUTCDay();
  let daysAhead = targetIso - currentIso;
  if (daysAhead < 0 || (daysAhead === 0 && candidate <= now)) daysAhead += 7;
  candidate.setUTCDate(candidate.getUTCDate() + daysAhead);
  return candidate;
}
