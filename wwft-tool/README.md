# Wwft Compliance Tool

SaaS-tool voor accountants — cliëntacceptatie (Standaard 4410), Wwft-cliëntenonderzoek, doorlopende monitoring en FIU-meldingen.

## Tech stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS** + shadcn/ui-stijl componenten
- **SQLite + Prisma 7** (ORM met libsql adapter; migreerbaar naar PostgreSQL)
- **NextAuth.js v4** (credentials, JWT, multi-tenant)
- **@react-pdf/renderer** (PDF-export)
- **bcryptjs** (wachtwoord hashing)

## Snel starten

```bash
cd wwft-tool

# 1. Omgevingsvariabelen instellen
cp .env.example .env.local
# Bewerk .env.local: vul NEXTAUTH_SECRET in (openssl rand -base64 32)

# 2. Database initialiseren
DATABASE_URL="file:./dev.db" npx prisma migrate dev

# 3. Demo-accounts aanmaken
DATABASE_URL="file:./dev.db" npm run db:seed

# 4. Ontwikkelserver starten
DATABASE_URL="file:./dev.db" npm run dev
```

Open http://localhost:3000

**Demo-accounts:**
| E-mail | Wachtwoord | Rol |
|---|---|---|
| partner@demo.nl | partner123 | PARTNER |
| medewerker@demo.nl | medewerker123 | MEDEWERKER |

## API-sleutels (optioneel)

Voeg toe aan `.env.local`:

```env
OPENSANCTIONS_API_KEY=   # https://www.opensanctions.org/api/
BRAVE_SEARCH_API_KEY=    # https://brave.com/search/api/ (gratis tier)
```

Zonder sleutels: OpenSanctions werkt rate-limited, Brave Search toont demo-snippets.

## Functionaliteiten

- **Multi-tenant**: elk kantoor is een `Organization`; data volledig gescheiden
- **Wizard** (4 stappen): Bedrijfsverkenning → Wwft → Identificatie → Beoordeling
- **OSINT**: OpenSanctions · Brave Web Search · GLEIF LEI · ICIJ Offshore Leaks
- **Risicowoord-highlighting**: automatische markering van Wwft-risicowoorden
- **Audit trail**: alle beslissingen op zoekresultaten vastgelegd
- **Periodieke review**: automatisch gepland (HOOG=1j, MIDDEN=2j, LAAG=3j)
- **FIU-meldingen**: workflow met PARTNER-goedkeuring; exporteerbaar als PDF
- **PDF-export**: volledig dossier inclusief wizard, OSINT, reviews, meldingen
- **Rolbeveiliging**: PARTNER/MEDEWERKER server-side afgedwongen

## Databasemigratie naar PostgreSQL

Vervang in `prisma.config.ts` de datasource URL en gebruik `@prisma/adapter-pg` i.p.v. `@prisma/adapter-libsql`.
