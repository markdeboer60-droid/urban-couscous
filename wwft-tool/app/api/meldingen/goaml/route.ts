/**
 * /api/meldingen/goaml?meldingId=xxx — export a single FIU-melding as goAML XML.
 * Only finalized FIU_MELDING records can be exported.
 */

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildGoamlXml } from "@/lib/goaml";
import type { SessionUser } from "@/types";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Niet geautoriseerd" }, { status: 401 });
  }

  const user = session.user as unknown as SessionUser;
  const meldingId = new URL(req.url).searchParams.get("meldingId");

  if (!meldingId) {
    return Response.json({ error: "meldingId verplicht" }, { status: 400 });
  }

  const melding = await prisma.melding.findFirst({
    where: {
      id: meldingId,
      beslissing: "FIU_MELDING",
      client: { organizationId: user.organizationId },
    },
    include: {
      client: {
        include: { organization: true },
      },
    },
  });

  if (!melding) {
    return Response.json({ error: "Niet gevonden of geen FIU-melding" }, { status: 404 });
  }

  if (!melding.afgerondOp) {
    return Response.json({ error: "Melding is nog niet gefinaliseerd" }, { status: 400 });
  }

  const xml = buildGoamlXml({
    fiuReferentie: melding.fiuReferentie,
    datumTransactie: melding.datumTransactie,
    bedrag: melding.bedrag,
    omschrijving: melding.omschrijving,
    indicatorType: melding.indicatorType as "SUBJECTIEF" | "OBJECTIEF",
    motivatie: melding.motivatie,
    onderbouwing: melding.onderbouwing,
    clientNaam: melding.client.naam,
    clientKvk: melding.client.kvkNummer,
    kantoorNaam: melding.client.organization.naam,
    kantoorKvk: melding.client.organization.kvkNummer,
    meldingId: melding.id,
    afgerondOp: melding.afgerondOp,
  });

  const filename = `goaml_${melding.id.slice(0, 8)}_${melding.client.naam.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30)}.xml`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
