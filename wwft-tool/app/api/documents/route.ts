/**
 * /api/documents — document upload (multipart) and listing.
 * Files are stored at /uploads/{organizationId}/{clientId}/
 */

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/types";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

function unauthorized() {
  return Response.json({ error: "Niet geautoriseerd" }, { status: 401 });
}

/** GET /api/documents?clientId=xxx */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  const user = session.user as unknown as SessionUser;
  const clientId = new URL(req.url).searchParams.get("clientId");

  if (!clientId) return Response.json({ error: "clientId verplicht" }, { status: 400 });

  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId: user.organizationId },
  });
  if (!client) return Response.json({ error: "Niet gevonden" }, { status: 404 });

  const docs = await prisma.document.findMany({
    where: { clientId },
    include: { uploader: { select: { naam: true } } },
    orderBy: { uploadOp: "desc" },
  });

  return Response.json(docs);
}

/** POST /api/documents — multipart form data upload */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  const user = session.user as unknown as SessionUser;

  const formData = await req.formData();
  const clientId = formData.get("clientId") as string;
  const type = formData.get("type") as string;
  const naamBetrokkene = formData.get("naamBetrokkene") as string | null;
  const functie = formData.get("functie") as string | null;
  const geboortedatum = formData.get("geboortedatum") as string | null;
  const verloopDatumRaw = formData.get("verloopDatum") as string | null;
  const verloopDatum = verloopDatumRaw ? new Date(verloopDatumRaw) : null;
  const verificatiemethode = formData.get("verificatiemethode") as string | null;
  const isPep = formData.get("isPep") === "true";
  const pepBronVermelding = (formData.get("pepBronVermelding") as string | null) || null;
  const file = formData.get("file") as File | null;

  if (!clientId || !type || !file) {
    return Response.json({ error: "clientId, type en file verplicht" }, { status: 400 });
  }

  const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "Bestand is te groot (max 10 MB)" }, { status: 413 });
  }

  // Verify ownership
  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId: user.organizationId },
  });
  if (!client) return Response.json({ error: "Niet gevonden" }, { status: 404 });

  // Store the file
  const uploadDir = path.join(
    process.cwd(),
    "uploads",
    user.organizationId,
    clientId
  );
  await mkdir(uploadDir, { recursive: true });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const safeFilename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const filePath = path.join(uploadDir, safeFilename);
  await writeFile(filePath, buffer);

  const doc = await prisma.document.create({
    data: {
      clientId,
      type: type as import("@prisma/client").DocumentType,
      bestandsnaam: file.name,
      bestandspad: filePath,
      naamBetrokkene,
      functie,
      geboortedatum,
      verloopDatum,
      verificatiemethode,
      isPep,
      pepBronVermelding,
      uploadDoor: user.id,
    },
  });

  return Response.json(doc, { status: 201 });
}
