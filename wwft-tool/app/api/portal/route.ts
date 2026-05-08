/**
 * /api/portal — client portal token management.
 * POST  — generate a portal token for a client (requires auth)
 * GET   ?token=xxx — fetch portal info by token (public, token-gated)
 * PATCH — submit a message or file via the portal (public, token-gated)
 */

import { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/types";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { isAllowedMime, validateMagicBytes, MIME_ERROR, SIZE_ERROR, MAX_BYTES } from "@/lib/fileValidation";

function unauthorized() {
  return Response.json({ error: "Niet geautoriseerd" }, { status: 401 });
}

/** POST /api/portal — generate a new portal token for a client */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  const user = session.user as unknown as SessionUser;
  const body: { clientId: string; geldigDagen?: number } = await req.json();

  if (!body.clientId) return Response.json({ error: "clientId verplicht" }, { status: 400 });

  const client = await prisma.client.findFirst({
    where: { id: body.clientId, organizationId: user.organizationId },
  });
  if (!client) return Response.json({ error: "Niet gevonden" }, { status: 404 });

  const days = Math.min(Math.max(body.geldigDagen ?? 14, 1), 90);
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  // Use cryptographically random token instead of cuid to prevent guessing attacks
  const token = randomBytes(32).toString("hex");

  const portaalToken = await prisma.clientPortaalToken.create({
    data: { clientId: body.clientId, expiresAt, token },
    select: { id: true, token: true, clientId: true, expiresAt: true, aangemaakt: true },
  });

  return Response.json(portaalToken, { status: 201 });
}

/** GET /api/portal?token=xxx — fetch portal data for a token */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return Response.json({ error: "token verplicht" }, { status: 400 });

  const record = await prisma.clientPortaalToken.findUnique({
    where: { token },
    include: { client: { select: { id: true, naam: true, status: true, kvkNummer: true } } },
  });

  if (!record) return Response.json({ error: "Ongeldig token" }, { status: 404 });
  if (record.expiresAt < new Date()) return Response.json({ error: "Token verlopen" }, { status: 410 });

  return Response.json({
    clientId: record.clientId,
    clientNaam: record.client.naam,
    clientStatus: record.client.status,
    expiresAt: record.expiresAt,
  });
}

/** PATCH /api/portal — upload document via portal token */
export async function PATCH(req: NextRequest) {
  const formData = await req.formData();
  const token = formData.get("token") as string | null;
  const bericht = formData.get("bericht") as string | null;
  const file = formData.get("file") as File | null;

  if (!token) return Response.json({ error: "token verplicht" }, { status: 400 });

  const record = await prisma.clientPortaalToken.findUnique({
    where: { token },
    include: { client: { select: { id: true, organizationId: true, status: true } } },
  });

  if (!record) return Response.json({ error: "Ongeldig token" }, { status: 404 });
  if (record.expiresAt < new Date()) return Response.json({ error: "Token verlopen" }, { status: 410 });
  if (record.client.status === "AFGEROND" || record.client.status === "BEEINDIGD") {
    return Response.json({ error: "Dossier is gesloten" }, { status: 409 });
  }

  // Find a PARTNER user to attribute the portal upload to (predictable, not derived from a mutable sort).
  // Fall back to any user in the org if no PARTNER exists.
  const systemUser =
    (await prisma.user.findFirst({
      where: { organizationId: record.client.organizationId, rol: "PARTNER" },
      orderBy: { id: "asc" },
    })) ??
    (await prisma.user.findFirst({
      where: { organizationId: record.client.organizationId },
      orderBy: { id: "asc" },
    }));
  if (!systemUser) return Response.json({ error: "Organisatie niet gevonden" }, { status: 500 });

  if (!file) {
    if (!bericht?.trim()) return Response.json({ error: "Bericht of bestand verplicht" }, { status: 400 });

    const opmerking = await prisma.opmerking.create({
      data: {
        clientId: record.clientId,
        userId: systemUser.id,
        tekst: `[Cliëntenportaal] ${bericht.trim().slice(0, 2000)}`,
      },
    });
    await prisma.clientPortaalToken.update({
      where: { token },
      data: { gebruiktOp: new Date() },
    });
    return Response.json({ ok: true, opmerkingId: opmerking.id });
  }

  if (file.size > MAX_BYTES) return Response.json({ error: SIZE_ERROR }, { status: 413 });

  if (!isAllowedMime(file.type)) {
    return Response.json({ error: MIME_ERROR }, { status: 415 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  if (!validateMagicBytes(buffer, file.type)) {
    return Response.json({ error: MIME_ERROR }, { status: 415 });
  }

  const safeFilename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  // Store relative path to avoid exposing filesystem layout
  const relPath = path.join("uploads", record.client.organizationId, record.clientId, "portaal", safeFilename);
  const absPath = path.join(process.cwd(), relPath);

  await mkdir(path.dirname(absPath), { recursive: true });
  await writeFile(absPath, buffer);

  const doc = await prisma.document.create({
    data: {
      clientId: record.clientId,
      type: "OVERIG",
      bestandsnaam: file.name,
      bestandspad: relPath,
      naamBetrokkene: bericht?.trim() || null,
      uploadDoor: systemUser.id,
    },
    select: { id: true },
  });

  await prisma.clientPortaalToken.update({
    where: { token },
    data: { gebruiktOp: new Date() },
  });

  return Response.json({ ok: true, documentId: doc.id }, { status: 201 });
}
