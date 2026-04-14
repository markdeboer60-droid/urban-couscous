/**
 * PDF export route — generates a full dossier PDF with @react-pdf/renderer.
 * Returns the file as a download attachment.
 */

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/types";
import { renderToBuffer } from "@react-pdf/renderer";
import { DossierPDF } from "@/components/DossierPDF";
import React from "react";

interface Context {
  params: Promise<{ clientId: string }>;
}

export async function GET(req: NextRequest, { params }: Context) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Niet geautoriseerd" }, { status: 401 });
  }

  const user = session.user as unknown as SessionUser;
  const { clientId } = await params;

  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId: user.organizationId },
    include: {
      aanmaker: { select: { naam: true } },
      goedgekeurdeUser: { select: { naam: true } },
      wizardAnswers: { orderBy: [{ stap: "asc" }, { vraagKey: "asc" }] },
      documents: {
        include: { uploader: { select: { naam: true } } },
        orderBy: { uploadOp: "asc" },
      },
      reviews: {
        include: { uitvoerder: { select: { naam: true } } },
        orderBy: { volgendeReviewOp: "asc" },
      },
      meldingen: {
        include: { afgerondByUser: { select: { naam: true } } },
        orderBy: { datumTransactie: "desc" },
      },
      searchQueries: {
        include: {
          resultActions: {
            include: { gebruiker: { select: { naam: true } } },
          },
        },
        orderBy: { uitgevoerdOp: "desc" },
      },
    },
  });

  if (!client) {
    return Response.json({ error: "Niet gevonden" }, { status: 404 });
  }

  // Serialize all dates to ISO strings
  const data = JSON.parse(
    JSON.stringify(client, (_key, value) => {
      if (value instanceof Date) return value.toISOString();
      return value;
    })
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(DossierPDF, { client: data, exportedAt: new Date().toISOString() }) as any;
  const buffer = await renderToBuffer(element);

  const safeNaam = client.naam.replace(/[^a-zA-Z0-9_-]/g, "_");
  // Convert Node.js Buffer to Uint8Array for the Web Response API
  // Convert Buffer to ArrayBuffer for the Web Response API
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  return new Response(arrayBuffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="dossier_${safeNaam}.pdf"`,
    },
  });
}
