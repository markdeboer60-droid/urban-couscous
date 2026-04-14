-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "naam" TEXT NOT NULL,
    "kvkNummer" TEXT,
    "aangemaakt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "wachtwoordHash" TEXT NOT NULL,
    "naam" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'MEDEWERKER',
    CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "naam" TEXT NOT NULL,
    "kvkNummer" TEXT,
    "risicoOordeel" TEXT,
    "risicoMotivatie" TEXT,
    "status" TEXT NOT NULL DEFAULT 'GESTART',
    "aangemaakt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aangemaaktDoor" TEXT NOT NULL,
    "goedgekeurdDoor" TEXT,
    "goedgekeurdOp" DATETIME,
    "eindOpmerkingen" TEXT,
    CONSTRAINT "Client_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Client_aangemaaktDoor_fkey" FOREIGN KEY ("aangemaaktDoor") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Client_goedgekeurdDoor_fkey" FOREIGN KEY ("goedgekeurdDoor") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WizardAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "stap" TEXT NOT NULL,
    "vraagKey" TEXT NOT NULL,
    "antwoord" TEXT NOT NULL,
    "toelichting" TEXT,
    CONSTRAINT "WizardAnswer_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "bestandsnaam" TEXT NOT NULL,
    "bestandspad" TEXT NOT NULL,
    "naamBetrokkene" TEXT,
    "functie" TEXT,
    "geboortedatum" TEXT,
    "verificatiemethode" TEXT,
    "uploadOp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadDoor" TEXT NOT NULL,
    CONSTRAINT "Document_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Document_uploadDoor_fkey" FOREIGN KEY ("uploadDoor") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "uitgevoerdOp" DATETIME,
    "uitgevoerdDoor" TEXT,
    "volgendeReviewOp" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'GEPLAND',
    "bevindingen" TEXT,
    "risicoOordeelNa" TEXT,
    CONSTRAINT "Review_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Review_uitgevoerdDoor_fkey" FOREIGN KEY ("uitgevoerdDoor") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Melding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "datumTransactie" DATETIME NOT NULL,
    "bedrag" REAL NOT NULL,
    "omschrijving" TEXT NOT NULL,
    "indicatorType" TEXT NOT NULL,
    "motivatie" TEXT NOT NULL,
    "beslissing" TEXT NOT NULL,
    "onderbouwing" TEXT NOT NULL,
    "afgerondDoor" TEXT,
    "afgerondOp" DATETIME,
    "fiuReferentie" TEXT,
    CONSTRAINT "Melding_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Melding_afgerondDoor_fkey" FOREIGN KEY ("afgerondDoor") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SearchQuery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "zoeknaam" TEXT NOT NULL,
    "bron" TEXT NOT NULL,
    "uitgevoerdOp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uitgevoerdDoor" TEXT NOT NULL,
    CONSTRAINT "SearchQuery_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SearchQuery_uitgevoerdDoor_fkey" FOREIGN KEY ("uitgevoerdDoor") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SearchResultAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "searchQueryId" TEXT NOT NULL,
    "hitTitel" TEXT NOT NULL,
    "hitUrl" TEXT,
    "hitSamenvatting" TEXT NOT NULL,
    "beslissing" TEXT NOT NULL,
    "notitie" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gebruikerId" TEXT NOT NULL,
    CONSTRAINT "SearchResultAction_searchQueryId_fkey" FOREIGN KEY ("searchQueryId") REFERENCES "SearchQuery" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SearchResultAction_gebruikerId_fkey" FOREIGN KEY ("gebruikerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "WizardAnswer_clientId_vraagKey_key" ON "WizardAnswer"("clientId", "vraagKey");
