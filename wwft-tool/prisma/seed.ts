/**
 * seed.ts — seeds initial organization, partner, and medewerker accounts.
 * Run with: npx ts-node prisma/seed.ts
 * Or add to package.json: "prisma": { "seed": "ts-node prisma/seed.ts" }
 */

import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL ?? "file:./dev.db";
const adapter = new PrismaLibSql({ url });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create demo organization
  const org = await prisma.organization.upsert({
    where: { id: "demo-org" },
    update: {},
    create: {
      id: "demo-org",
      naam: "Demo Accountantskantoor B.V.",
      kvkNummer: "12345678",
    },
  });

  // Partner account
  const partnerHash = await bcrypt.hash("partner123", 12);
  await prisma.user.upsert({
    where: { email: "partner@demo.nl" },
    update: {},
    create: {
      naam: "Jan de Partner",
      email: "partner@demo.nl",
      wachtwoordHash: partnerHash,
      rol: "PARTNER",
      organizationId: org.id,
    },
  });

  // Medewerker account
  const medewerkerHash = await bcrypt.hash("medewerker123", 12);
  await prisma.user.upsert({
    where: { email: "medewerker@demo.nl" },
    update: {},
    create: {
      naam: "Maria de Medewerker",
      email: "medewerker@demo.nl",
      wachtwoordHash: medewerkerHash,
      rol: "MEDEWERKER",
      organizationId: org.id,
    },
  });

  console.log("Seed completed!");
  console.log("Login: partner@demo.nl / partner123 (PARTNER)");
  console.log("Login: medewerker@demo.nl / medewerker123 (MEDEWERKER)");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
