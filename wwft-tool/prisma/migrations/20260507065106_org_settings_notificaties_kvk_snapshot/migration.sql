-- AlterTable
ALTER TABLE "Client" ADD COLUMN "kvkSnapshot" TEXT;

-- CreateTable
CREATE TABLE "OrganizationSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "monitoringFrequentie" TEXT NOT NULL DEFAULT 'WEKELIJKS',
    "monitoringTijdstip" TEXT NOT NULL DEFAULT '08:00',
    "monitoringDagVanWeek" INTEGER NOT NULL DEFAULT 1,
    "volgendeMonitoringRun" DATETIME,
    "emailNotificaties" BOOLEAN NOT NULL DEFAULT true,
    "appNotificaties" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "OrganizationSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notificatie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "titel" TEXT NOT NULL,
    "bericht" TEXT NOT NULL,
    "clientId" TEXT,
    "gelezen" BOOLEAN NOT NULL DEFAULT false,
    "gelezenOp" DATETIME,
    "aangemaakt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notificatie_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Notificatie_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSettings_organizationId_key" ON "OrganizationSettings"("organizationId");
