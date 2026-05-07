/**
 * Wwft Compliance Tool — shared TypeScript types
 * All Prisma enum strings are repeated here for client-side use
 * without importing from the server-only Prisma client.
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserRole = "MEDEWERKER" | "SENIOR" | "PARTNER";
export type RisicoOordeel = "LAAG" | "MIDDEN" | "HOOG";
export type ClientStatus = "GESTART" | "IN_BEHANDELING" | "TER_BEOORDELING" | "AFGEROND" | "BEEINDIGD";
export type InterneReviewStatus = "GOEDGEKEURD" | "TERUGGESTUURD";

export const USER_ROLE_VALUES: UserRole[] = ["MEDEWERKER", "SENIOR", "PARTNER"];
export const RISICO_OORDEEL_VALUES: RisicoOordeel[] = ["LAAG", "MIDDEN", "HOOG"];
export const CLIENT_STATUS_VALUES: ClientStatus[] = ["GESTART", "IN_BEHANDELING", "TER_BEOORDELING", "AFGEROND", "BEEINDIGD"];
export type WizardStap =
  | "BEDRIJFSVERKENNING"
  | "WWFT"
  | "IDENTIFICATIE"
  | "BEOORDELING";
export type WizardAntwoord = "JA" | "NEE" | "NVT";
export type DocumentType = "ID" | "UBO" | "KVK" | "UBO_REGISTER" | "OVERIG";
export type ReviewStatus = "GEPLAND" | "UITGEVOERD" | "ACHTERSTALLIG";
export type MeldingBeslissing = "NIET_MELDEN" | "FIU_MELDING";
export type IndicatorType = "SUBJECTIEF" | "OBJECTIEF";
export type ZoekBron = "OPENSANCTIONS" | "WEBSEARCH" | "GLEIF" | "ICIJ";
export type SearchBeslissing = "RISICO" | "FALSE_POSITIVE";

// ─── Domain types ─────────────────────────────────────────────────────────────

export interface Organization {
  id: string;
  naam: string;
  kvkNummer?: string | null;
  aangemaakt: string;
}

export interface User {
  id: string;
  organizationId: string;
  email: string;
  naam: string;
  rol: UserRole;
}

export interface Client {
  id: string;
  organizationId: string;
  naam: string;
  kvkNummer?: string | null;
  land?: string | null;
  risicoOordeel?: RisicoOordeel | null;
  risicoMotivatie?: string | null;
  status: ClientStatus;
  aangemaakt: string;
  aangemaaktDoor: string;
  goedgekeurdDoor?: string | null;
  goedgekeurdOp?: string | null;
  eindOpmerkingen?: string | null;
  // EDD
  isEdd?: boolean;
  eddBronVermogen?: string | null;
  eddGoedgekeurdDoor?: string | null;
  eddGoedgekeurdOp?: string | null;
  // Beëindiging
  beeindigd?: string | null;
  beeindigdReden?: string | null;
  beeindigdDoor?: string | null;
  verwijderDatum?: string | null;
  // Interne review
  terBeoordelingDoor?: string | null;
  terBeoordelingOp?: string | null;
  interneReviewDoor?: string | null;
  interneReviewOp?: string | null;
  interneReviewNotitie?: string | null;
  interneReviewStatus?: InterneReviewStatus | null;
  /** Populated in list queries */
  aanmaker?: Pick<User, "naam">;
  reviews?: Review[];
  terBeoordelingUser?: Pick<User, "naam"> | null;
  interneReviewUser?: Pick<User, "naam"> | null;
}

export interface ClientPortaalToken {
  id: string;
  token: string;
  clientId: string;
  expiresAt: string;
  gebruiktOp?: string | null;
  aangemaakt: string;
}

export interface WizardAnswer {
  id: string;
  clientId: string;
  stap: WizardStap;
  vraagKey: string;
  antwoord: WizardAntwoord;
  toelichting?: string | null;
}

export interface Document {
  id: string;
  clientId: string;
  type: DocumentType;
  bestandsnaam: string;
  bestandspad: string;
  naamBetrokkene?: string | null;
  functie?: string | null;
  geboortedatum?: string | null;
  verificatiemethode?: string | null;
  isPep?: boolean;
  pepBronVermelding?: string | null;
  uploadOp: string;
  uploadDoor: string;
  uploader?: Pick<User, "naam">;
}

export interface Review {
  id: string;
  clientId: string;
  uitgevoerdOp?: string | null;
  uitgevoerdDoor?: string | null;
  volgendeReviewOp: string;
  status: ReviewStatus;
  bevindingen?: string | null;
  risicoOordeelNa?: RisicoOordeel | null;
  uitvoerder?: Pick<User, "naam">;
}

export interface Melding {
  id: string;
  clientId: string;
  datumTransactie: string;
  bedrag: number;
  omschrijving: string;
  indicatorType: IndicatorType;
  motivatie: string;
  beslissing: MeldingBeslissing;
  onderbouwing: string;
  afgerondDoor?: string | null;
  afgerondOp?: string | null;
  fiuReferentie?: string | null;
  afgerondByUser?: Pick<User, "naam">;
}

export interface SearchQuery {
  id: string;
  clientId: string;
  zoeknaam: string;
  bron: ZoekBron;
  uitgevoerdOp: string;
  uitgevoerdDoor: string;
  uitvoerder?: Pick<User, "naam">;
  resultActions?: SearchResultAction[];
}

export interface SearchResultAction {
  id: string;
  searchQueryId: string;
  hitTitel: string;
  hitUrl?: string | null;
  hitSamenvatting: string;
  beslissing: SearchBeslissing;
  notitie?: string | null;
  timestamp: string;
  gebruikerId: string;
  gebruiker?: Pick<User, "naam">;
}

// ─── API payload types ────────────────────────────────────────────────────────

export interface CreateClientPayload {
  naam: string;
  kvkNummer?: string;
  land?: string;
}

export interface UpdateClientPayload {
  status?: ClientStatus;
  risicoOordeel?: RisicoOordeel;
  risicoMotivatie?: string;
  eindOpmerkingen?: string;
  goedkeuren?: boolean;
}

export interface SaveWizardAnswerPayload {
  clientId: string;
  stap: WizardStap;
  vraagKey: string;
  antwoord: WizardAntwoord;
  toelichting?: string;
}

export interface SaveActionPayload {
  searchQueryId: string;
  hitTitel: string;
  hitUrl?: string;
  hitSamenvatting: string;
  beslissing: SearchBeslissing;
  notitie?: string;
}

export interface CreateMeldingPayload {
  clientId: string;
  datumTransactie: string;
  bedrag: number;
  omschrijving: string;
  indicatorType: IndicatorType;
  motivatie: string;
  beslissing: MeldingBeslissing;
  onderbouwing: string;
}

export interface FinalizeMeldingPayload {
  meldingId: string;
  fiuReferentie?: string;
}

export interface CompleteReviewPayload {
  reviewId: string;
  bevindingen: string;
  risicoOordeelNa: RisicoOordeel;
}

// ─── OSINT search result types ────────────────────────────────────────────────

export interface OpenSanctionsHit {
  id: string;
  naam: string;
  type: string;
  geboortedatum?: string;
  land?: string;
  datasets: string[];
  profielLink: string;
}

export interface WebSearchHit {
  titel: string;
  url: string;
  samenvatting: string;
}

export interface GleifHit {
  bedrijfsnaam: string;
  lei: string;
  rechtsvorm?: string;
  land?: string;
  status: string;
}

export interface IcijHit {
  naam: string;
  dataset: string;
  land?: string;
  rol?: string;
}

export interface MonitoringAlert {
  id: string;
  clientId: string;
  type: string;
  bron: string;
  omschrijving: string;
  aangemaakt: string;
  opgelost: boolean;
  opgelostOp?: string | null;
  opgelostDoor?: string | null;
  client?: { naam: string; id: string };
}

export interface UboNode {
  id: string;
  clientId: string;
  type: "BEDRIJF" | "PERSOON";
  naam: string;
  kvkNummer?: string | null;
  geboortedatum?: string | null;
  land?: string | null;
  isPep: boolean;
  notities?: string | null;
  posX: number;
  posY: number;
  aangemaakt: string;
}

export interface UboEdge {
  id: string;
  clientId: string;
  vanId: string;
  naarId: string;
  type?: string | null;
  belang?: number | null;
}

export interface Opmerking {
  id: string;
  clientId: string;
  userId: string;
  tekst: string;
  aangemaakt: string;
  user: { naam: string; rol: string };
}

// ─── Session extension ────────────────────────────────────────────────────────

/** Extended NextAuth session user */
export interface SessionUser {
  id: string;
  naam: string;
  email: string;
  rol: UserRole;
  organizationId: string;
}
