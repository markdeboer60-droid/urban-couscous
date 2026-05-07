-- CreateTable
CREATE TABLE "ClientPortaalToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "gebruiktOp" DATETIME,
    "aangemaakt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientPortaalToken_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "naam" TEXT NOT NULL,
    "kvkNummer" TEXT,
    "land" TEXT,
    "risicoOordeel" TEXT,
    "risicoMotivatie" TEXT,
    "status" TEXT NOT NULL DEFAULT 'GESTART',
    "aangemaakt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aangemaaktDoor" TEXT NOT NULL,
    "goedgekeurdDoor" TEXT,
    "goedgekeurdOp" DATETIME,
    "eindOpmerkingen" TEXT,
    "isEdd" BOOLEAN NOT NULL DEFAULT false,
    "eddBronVermogen" TEXT,
    "eddGoedgekeurdDoor" TEXT,
    "eddGoedgekeurdOp" DATETIME,
    "beeindigd" DATETIME,
    "beeindigdReden" TEXT,
    "beeindigdDoor" TEXT,
    "verwijderDatum" DATETIME,
    "terBeoordelingDoor" TEXT,
    "terBeoordelingOp" DATETIME,
    "interneReviewDoor" TEXT,
    "interneReviewOp" DATETIME,
    "interneReviewNotitie" TEXT,
    "interneReviewStatus" TEXT,
    "lastScreenedOp" DATETIME,
    "kvkSnapshot" TEXT,
    CONSTRAINT "Client_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Client_aangemaaktDoor_fkey" FOREIGN KEY ("aangemaaktDoor") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Client_goedgekeurdDoor_fkey" FOREIGN KEY ("goedgekeurdDoor") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Client_eddGoedgekeurdDoor_fkey" FOREIGN KEY ("eddGoedgekeurdDoor") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Client_beeindigdDoor_fkey" FOREIGN KEY ("beeindigdDoor") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Client_terBeoordelingDoor_fkey" FOREIGN KEY ("terBeoordelingDoor") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Client_interneReviewDoor_fkey" FOREIGN KEY ("interneReviewDoor") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Client" ("aangemaakt", "aangemaaktDoor", "beeindigd", "beeindigdDoor", "beeindigdReden", "eddBronVermogen", "eddGoedgekeurdDoor", "eddGoedgekeurdOp", "eindOpmerkingen", "goedgekeurdDoor", "goedgekeurdOp", "id", "isEdd", "kvkNummer", "kvkSnapshot", "land", "lastScreenedOp", "naam", "organizationId", "risicoMotivatie", "risicoOordeel", "status", "verwijderDatum") SELECT "aangemaakt", "aangemaaktDoor", "beeindigd", "beeindigdDoor", "beeindigdReden", "eddBronVermogen", "eddGoedgekeurdDoor", "eddGoedgekeurdOp", "eindOpmerkingen", "goedgekeurdDoor", "goedgekeurdOp", "id", "isEdd", "kvkNummer", "kvkSnapshot", "land", "lastScreenedOp", "naam", "organizationId", "risicoMotivatie", "risicoOordeel", "status", "verwijderDatum" FROM "Client";
DROP TABLE "Client";
ALTER TABLE "new_Client" RENAME TO "Client";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ClientPortaalToken_token_key" ON "ClientPortaalToken"("token");
