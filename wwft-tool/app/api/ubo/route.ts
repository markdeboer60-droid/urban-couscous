/**
 * /api/ubo — UBO ownership structure: nodes (companies/persons) and edges (relationships).
 * GET    ?clientId=xxx   — load full structure
 * POST                   — replace full structure (upsert nodes/edges, delete removed ones)
 */

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/types";

function unauthorized() {
  return Response.json({ error: "Niet geautoriseerd" }, { status: 401 });
}

async function verifyClient(clientId: string, organizationId: string) {
  return prisma.client.findFirst({ where: { id: clientId, organizationId } });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  const user = session.user as unknown as SessionUser;
  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId) return Response.json({ error: "clientId verplicht" }, { status: 400 });

  if (!await verifyClient(clientId, user.organizationId))
    return Response.json({ error: "Niet gevonden" }, { status: 404 });

  const [nodes, edges] = await Promise.all([
    prisma.uboNode.findMany({ where: { clientId }, orderBy: { aangemaakt: "asc" } }),
    prisma.uboEdge.findMany({ where: { clientId } }),
  ]);

  return Response.json({ nodes, edges });
}

interface NodePayload {
  id: string;
  type: string;
  naam: string;
  kvkNummer?: string;
  geboortedatum?: string;
  land?: string;
  isPep?: boolean;
  notities?: string;
  posX?: number;
  posY?: number;
}

interface EdgePayload {
  id: string;
  vanId: string;
  naarId: string;
  type?: string;
  belang?: number;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  const user = session.user as unknown as SessionUser;
  const body: { clientId: string; nodes: NodePayload[]; edges: EdgePayload[] } = await req.json();

  if (!body.clientId) return Response.json({ error: "clientId verplicht" }, { status: 400 });
  if (!await verifyClient(body.clientId, user.organizationId))
    return Response.json({ error: "Niet gevonden" }, { status: 404 });

  // Upsert all nodes — updateMany scoped to clientId prevents cross-org IDOR; batched in parallel
  await Promise.all(body.nodes.map(async (node) => {
    const nodeData = {
      type: node.type,
      naam: node.naam,
      kvkNummer: node.kvkNummer ?? null,
      geboortedatum: node.geboortedatum ?? null,
      land: node.land ?? null,
      isPep: node.isPep ?? false,
      notities: node.notities ?? null,
      posX: node.posX ?? 0,
      posY: node.posY ?? 0,
    };
    const { count } = await prisma.uboNode.updateMany({
      where: { id: node.id, clientId: body.clientId },
      data: nodeData,
    });
    if (count === 0) {
      await prisma.uboNode.create({ data: { id: node.id, clientId: body.clientId, ...nodeData } });
    }
  }));

  // Delete removed nodes (cascades edges automatically)
  const incomingNodeIds = body.nodes.map((n) => n.id);
  await prisma.uboNode.deleteMany({
    where: { clientId: body.clientId, id: { notIn: incomingNodeIds } },
  });

  // Upsert all edges — scoped to clientId; batched in parallel
  await Promise.all(body.edges.map(async (edge) => {
    const edgeData = { type: edge.type ?? null, belang: edge.belang ?? null };
    const { count } = await prisma.uboEdge.updateMany({
      where: { id: edge.id, clientId: body.clientId },
      data: edgeData,
    });
    if (count === 0) {
      await prisma.uboEdge.create({
        data: { id: edge.id, clientId: body.clientId, vanId: edge.vanId, naarId: edge.naarId, ...edgeData },
      });
    }
  }));

  // Delete removed edges
  const incomingEdgeIds = body.edges.map((e) => e.id);
  await prisma.uboEdge.deleteMany({
    where: { clientId: body.clientId, id: { notIn: incomingEdgeIds } },
  });

  return Response.json({ ok: true });
}
