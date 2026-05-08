/**
 * /api/kvk?kvk=12345678 — KvK bedrijfsopzoeking.
 *
 * Bronnen (in volgorde geprobeerd):
 * 1. overheid.io OpenKVK — gratis na registratie op overheid.io/register
 *    Instellen: OVERHEID_IO_API_KEY in .env.local
 *    Retourneert: handelsnaam, adres, actief-status
 *
 * 2. KvK officieel open dataset (opendata.kvk.nl) — altijd gratis, geen sleutel nodig
 *    Retourneert: naam, rechtsvorm, SBI-activiteit, faillissement, uitschrijving
 *
 * 3. Mock-fallback voor ontwikkeling (als beide bronnen niet beschikbaar zijn)
 */

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface KvkResult {
  naam: string;
  kvkNummer: string;
  rechtsvorm?: string | null;
  adres?: string | null;
  land: string;
  sbiCode?: string | null;
  sbiOmschrijving?: string | null;
  isActief?: boolean;
  isOpgeheven?: boolean;
  isFailliet?: boolean;
  isMock?: boolean;
}

// ─── 1. overheid.io OpenKVK ───────────────────────────────────────────────────
// Gratis API-sleutel: https://overheid.io/register
// Retourneert: handelsnaam, adres, actief-status
async function fetchOverheidIo(kvk: string): Promise<Partial<KvkResult> | null> {
  const apiKey = process.env.OVERHEID_IO_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(`https://overheid.io/api/kvk/${kvk}`, {
      headers: { "ovio-api-key": apiKey, Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const c = data._embedded?.rechtspersoon?.[0];
    if (!c) return null;

    return {
      naam: c.handelsnaam ?? c.statutairehandelsnaam ?? c.bestaandehandelsnaam ?? "",
      kvkNummer: kvk,
      adres: [c.straat, c.huisnummer, c.huisnummertoevoeging, c.postcode, c.plaats]
        .filter(Boolean)
        .join(" ") || null,
      land: "Nederland",
      isActief: c.actief === true,
    };
  } catch {
    return null;
  }
}

// ─── 2. KvK officieel open dataset ───────────────────────────────────────────
// Altijd gratis, geen sleutel. Beperkte data: naam, rechtsvorm, SBI, faillissement.
async function fetchKvkOpenData(kvk: string): Promise<Partial<KvkResult>> {
  try {
    const res = await fetch(
      `https://opendata.kvk.nl/api/v1/hvds/basisbedrijfsgegevens/kvknummer/${kvk}`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return {};

    const data = await res.json();

    // sbiActiviteit is een string zoals "6920 Administratiekantoren en belastingadviseurs"
    const sbiRaw: string | undefined = data.sbiActiviteit;
    const sbiMatch = sbiRaw?.match(/^(\d{3,5})\s+(.*)/);
    const sbiCode = sbiMatch?.[1] ?? null;
    const sbiOmschrijving = sbiMatch?.[2] ?? sbiRaw ?? null;

    return {
      naam: data.naam ?? undefined,
      rechtsvorm: data.rechtsvorm ?? null,
      sbiCode,
      sbiOmschrijving,
      isOpgeheven: Boolean(data.datumUitschrijving),
      isFailliet: data.indicatieFaillissement === "Ja" || data.indicatieInsolventie === "Ja",
    };
  } catch {
    return {};
  }
}

// ─── Mock-fallback ────────────────────────────────────────────────────────────
const MOCK_RESULTS: Record<string, KvkResult> = {
  "12345678": {
    naam: "Voorbeeld BV",
    kvkNummer: "12345678",
    rechtsvorm: "Besloten Vennootschap",
    adres: "Keizersgracht 1, 1015 CN Amsterdam",
    land: "Nederland",
    sbiCode: "6920",
    sbiOmschrijving: "Administratiekantoren en belastingadviseurs",
    isActief: true,
    isOpgeheven: false,
    isFailliet: false,
  },
  "87654321": {
    naam: "Test Holding NV",
    kvkNummer: "87654321",
    rechtsvorm: "Naamloze Vennootschap",
    adres: "Blaak 16, 3011 TA Rotterdam",
    land: "Nederland",
    sbiCode: "6420",
    sbiOmschrijving: "Financiële holdings",
    isActief: true,
    isOpgeheven: false,
    isFailliet: false,
  },
};

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Niet geautoriseerd" }, { status: 401 });

  const kvk = new URL(req.url).searchParams.get("kvk")?.replace(/\s/g, "");
  if (!kvk || !/^\d{8}$/.test(kvk)) {
    return Response.json({ error: "Ongeldig KvK-nummer (8 cijfers verwacht)" }, { status: 400 });
  }

  // Haal beide bronnen parallel op — open dataset werkt altijd, overheid.io alleen met sleutel
  const [overheidData, openData] = await Promise.all([
    fetchOverheidIo(kvk),
    fetchKvkOpenData(kvk),
  ]);

  // Als één van beide echte data heeft, combineer en retourneer
  if (overheidData || openData.naam) {
    const result: KvkResult = {
      naam: overheidData?.naam ?? openData.naam ?? `Bedrijf ${kvk}`,
      kvkNummer: kvk,
      land: "Nederland",
      adres: overheidData?.adres ?? null,
      rechtsvorm: openData.rechtsvorm ?? null,
      sbiCode: openData.sbiCode ?? null,
      sbiOmschrijving: openData.sbiOmschrijving ?? null,
      // Actief: overheid.io is betrouwbaarder; open dataset gebruikt uitschrijfdatum als proxy
      isActief: overheidData?.isActief ?? !openData.isOpgeheven,
      isOpgeheven: openData.isOpgeheven ?? (overheidData ? !overheidData.isActief : false),
      isFailliet: openData.isFailliet ?? false,
    };
    return Response.json(result);
  }

  // Geen van beide bronnen beschikbaar — mock-fallback
  const mock = MOCK_RESULTS[kvk] ?? {
    naam: `Bedrijf ${kvk} BV (voorbeeld)`,
    kvkNummer: kvk,
    rechtsvorm: "Besloten Vennootschap",
    adres: "Voorbeeldstraat 1, 1234 AB Amsterdam",
    land: "Nederland",
    sbiCode: null,
    sbiOmschrijving: null,
    isActief: true,
    isOpgeheven: false,
    isFailliet: false,
  };
  return Response.json({ ...mock, isMock: true });
}
