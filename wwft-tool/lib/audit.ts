import { prisma } from "@/lib/prisma";

/** Fire-and-forget audit entry. Never throws. */
export async function logAudit(
  clientId: string,
  userId: string,
  actie: string,
  details?: Record<string, unknown>
) {
  await prisma.auditLog
    .create({
      data: {
        clientId,
        userId,
        actie,
        details: details ? JSON.stringify(details) : null,
      },
    })
    .catch(() => {});
}
