/**
 * /api/users — user management (PARTNER only).
 * Lists, creates, and updates users within the organization.
 */

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { SessionUser, UserRole } from "@/types";
import { USER_ROLE_VALUES } from "@/types";

function unauthorized(msg = "Niet geautoriseerd") {
  return Response.json({ error: msg }, { status: 401 });
}

function forbidden() {
  return Response.json({ error: "Alleen partners hebben toegang" }, { status: 403 });
}

async function requirePartner(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const user = session.user as unknown as SessionUser;
  if (user.rol !== "PARTNER") return null;
  return user;
}

/** GET /api/users — list users in organization */
export async function GET() {
  const user = await requirePartner();
  if (!user) return forbidden();

  const users = await prisma.user.findMany({
    where: { organizationId: user.organizationId },
    select: { id: true, naam: true, email: true, rol: true, organizationId: true },
  });

  return Response.json(users);
}

/** POST /api/users — create a new user */
export async function POST(req: NextRequest) {
  const user = await requirePartner();
  if (!user) return forbidden();

  const body: { naam: string; email: string; wachtwoord: string; rol: UserRole } = await req.json();

  if (!body.naam || !body.email || !body.wachtwoord) {
    return Response.json({ error: "naam, email en wachtwoord verplicht" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) {
    return Response.json({ error: "E-mailadres al in gebruik" }, { status: 409 });
  }

  const wachtwoordHash = await bcrypt.hash(body.wachtwoord, 12);

  const newUser = await prisma.user.create({
    data: {
      naam: body.naam,
      email: body.email,
      wachtwoordHash,
      rol: body.rol ?? "MEDEWERKER",
      organizationId: user.organizationId,
    },
    select: { id: true, naam: true, email: true, rol: true, organizationId: true },
  });

  return Response.json(newUser, { status: 201 });
}

/** PATCH /api/users — update role or name */
export async function PATCH(req: NextRequest) {
  const user = await requirePartner();
  if (!user) return forbidden();

  const body: { userId: string; rol?: UserRole; naam?: string } = await req.json();

  if (!body.userId) {
    return Response.json({ error: "userId verplicht" }, { status: 400 });
  }

  if (body.rol !== undefined && !USER_ROLE_VALUES.includes(body.rol)) {
    return Response.json({ error: "Ongeldig roltype" }, { status: 400 });
  }

  const target = await prisma.user.findFirst({
    where: { id: body.userId, organizationId: user.organizationId },
  });
  if (!target) return Response.json({ error: "Niet gevonden" }, { status: 404 });

  const updated = await prisma.user.update({
    where: { id: body.userId },
    data: {
      ...(body.rol && { rol: body.rol }),
      ...(body.naam && { naam: body.naam }),
    },
    select: { id: true, naam: true, email: true, rol: true, organizationId: true },
  });

  return Response.json(updated);
}
