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
    CONSTRAINT "Client_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Client_aangemaaktDoor_fkey" FOREIGN KEY ("aangemaaktDoor") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Client_goedgekeurdDoor_fkey" FOREIGN KEY ("goedgekeurdDoor") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Client_eddGoedgekeurdDoor_fkey" FOREIGN KEY ("eddGoedgekeurdDoor") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Client_beeindigdDoor_fkey" FOREIGN KEY ("beeindigdDoor") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Client" ("aangemaakt", "aangemaaktDoor", "eindOpmerkingen", "goedgekeurdDoor", "goedgekeurdOp", "id", "kvkNummer", "naam", "organizationId", "risicoMotivatie", "risicoOordeel", "status") SELECT "aangemaakt", "aangemaaktDoor", "eindOpmerkingen", "goedgekeurdDoor", "goedgekeurdOp", "id", "kvkNummer", "naam", "organizationId", "risicoMotivatie", "risicoOordeel", "status" FROM "Client";
DROP TABLE "Client";
ALTER TABLE "new_Client" RENAME TO "Client";
CREATE TABLE "new_Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "bestandsnaam" TEXT NOT NULL,
    "bestandspad" TEXT NOT NULL,
    "naamBetrokkene" TEXT,
    "functie" TEXT,
    "geboortedatum" TEXT,
    "verificatiemethode" TEXT,
    "isPep" BOOLEAN NOT NULL DEFAULT false,
    "pepBronVermelding" TEXT,
    "uploadOp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadDoor" TEXT NOT NULL,
    CONSTRAINT "Document_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Document_uploadDoor_fkey" FOREIGN KEY ("uploadDoor") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Document" ("bestandsnaam", "bestandspad", "clientId", "functie", "geboortedatum", "id", "naamBetrokkene", "type", "uploadDoor", "uploadOp", "verificatiemethode") SELECT "bestandsnaam", "bestandspad", "clientId", "functie", "geboortedatum", "id", "naamBetrokkene", "type", "uploadDoor", "uploadOp", "verificatiemethode" FROM "Document";
DROP TABLE "Document";
ALTER TABLE "new_Document" RENAME TO "Document";
CREATE TABLE "new_Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "uitgevoerdOp" DATETIME,
    "uitgevoerdDoor" TEXT,
    "volgendeReviewOp" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'GEPLAND',
    "bevindingen" TEXT,
    "risicoOordeelNa" TEXT,
    "emailVerstuurd" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Review_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Review_uitgevoerdDoor_fkey" FOREIGN KEY ("uitgevoerdDoor") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Review" ("bevindingen", "clientId", "id", "risicoOordeelNa", "status", "uitgevoerdDoor", "uitgevoerdOp", "volgendeReviewOp") SELECT "bevindingen", "clientId", "id", "risicoOordeelNa", "status", "uitgevoerdDoor", "uitgevoerdOp", "volgendeReviewOp" FROM "Review";
DROP TABLE "Review";
ALTER TABLE "new_Review" RENAME TO "Review";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "wachtwoordHash" TEXT NOT NULL,
    "naam" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'MEDEWERKER',
    "totpSecret" TEXT,
    "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_User" ("email", "id", "naam", "organizationId", "rol", "wachtwoordHash") SELECT "email", "id", "naam", "organizationId", "rol", "wachtwoordHash" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
