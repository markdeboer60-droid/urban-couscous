-- AlterTable
ALTER TABLE "Client" ADD COLUMN "lastScreenedOp" DATETIME;

-- CreateTable
CREATE TABLE "MonitoringAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "bron" TEXT NOT NULL,
    "omschrijving" TEXT NOT NULL,
    "aangemaakt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "opgelost" BOOLEAN NOT NULL DEFAULT false,
    "opgelostOp" DATETIME,
    "opgelostDoor" TEXT,
    CONSTRAINT "MonitoringAlert_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UboNode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "naam" TEXT NOT NULL,
    "kvkNummer" TEXT,
    "geboortedatum" TEXT,
    "land" TEXT,
    "isPep" BOOLEAN NOT NULL DEFAULT false,
    "notities" TEXT,
    "posX" REAL NOT NULL DEFAULT 0,
    "posY" REAL NOT NULL DEFAULT 0,
    "aangemaakt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UboNode_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UboEdge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "vanId" TEXT NOT NULL,
    "naarId" TEXT NOT NULL,
    "type" TEXT,
    "belang" REAL,
    CONSTRAINT "UboEdge_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UboEdge_vanId_fkey" FOREIGN KEY ("vanId") REFERENCES "UboNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UboEdge_naarId_fkey" FOREIGN KEY ("naarId") REFERENCES "UboNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
