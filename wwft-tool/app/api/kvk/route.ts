/**
 * /api/kvk?kvk=12345678 — KvK company lookup.
 * Uses KVK_API_KEY env var to call the official KvK API.
 * Falls back to a realistic mock when no API key is set.
 */

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface KvkResult {
  naam: string;
  kvkNummer: string;
  rechtsvorm?: string;
  adres?: string;
  land: string;
  sbiCode?: string;
  sbiOmschrijving?: string;
  isActief?: boolean;
  isOpgeheven?: boolean;
  isFailliet?: boolean;
  isMock?: boolean;
}

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
  if (!session?.user) {
    return Response.json({ error: "Niet geautoriseerd" }, { status: 401 });
  }

  const kvk = new URL(req.url).searchParams.get("kvk")?.replace(/\s/g, "");
  if (!kvk || !/^\d{8}$/.test(kvk)) {
    return Response.json({ error: "Ongeldig KvK-nummer (8 cijfers verwacht)" }, { status: 400 });
  }

  const apiKey = process.env.KVK_API_KEY;

  if (apiKey) {
    try {
      const res = await fetch(
        `https://api.kvk.nl/api/v1/zoeken?kvkNummer=${kvk}`,
        {
          headers: {
            apikey: apiKey,
            Accept: "application/json",
          },
        }
      );
      if (!res.ok) throw new Error(`KvK API: ${res.status}`);
      const data = await res.json();
      const item = data.resultaten?.[0];
      if (!item) return Response.json({ error: "Niet gevonden in KvK-register" }, { status: 404 });

      const dossierType = (item.dossierType ?? item.type ?? "").toUpperCase();
      const indEntType = (item.indEntType ?? "").toUpperCase();
      return Response.json({
        naam: item.naam ?? item.handelsnaam ?? "",
        kvkNummer: kvk,
        rechtsvorm: item.rechtsvorm ?? null,
        adres: [item.straatnaam, item.huisnummer, item.postcode, item.plaats]
          .filter(Boolean)
          .join(" "),
        land: item.land ?? "Nederland",
        sbiCode: item.sbiActiviteiten?.[0]?.sbiCode ?? null,
        sbiOmschrijving: item.sbiActiviteiten?.[0]?.sbiOmschrijving ?? null,
        isActief: item.indActief === "Ja" || item.actief === true,
        isOpgeheven: dossierType.includes("OPGEHEVEN") || indEntType.includes("OPGEHEVEN") || item.indOpgeheven === "Ja",
        isFailliet: item.indFaillissement === "Ja" || item.faillissement === true,
      } satisfies KvkResult);
    } catch (err: unknown) {
      return Response.json({ error: String(err) }, { status: 502 });
    }
  }

  // Mock fallback
  const mock = MOCK_RESULTS[kvk] ?? {
    naam: `Bedrijf ${kvk} BV (voorbeeld)`,
    kvkNummer: kvk,
    rechtsvorm: "Besloten Vennootschap",
    adres: "Voorbeeldstraat 1, 1234 AB Amsterdam",
    land: "Nederland",
    sbiCode: null,
    sbiOmschrijving: null,
  };

  return Response.json({ ...mock, isMock: true });
}
