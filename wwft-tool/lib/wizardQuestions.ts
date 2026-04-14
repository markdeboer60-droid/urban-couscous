/**
 * wizardQuestions.ts — Wwft / Standaard 4410 wizard question definitions
 * Each question maps to a WizardAnswer record in the database.
 * risicoIndicator marks which answer value warrants attention.
 */

import type { WizardStap } from "@/types";

export type Vraag = {
  /** Unique key that maps to WizardAnswer.vraagKey */
  key: string;
  stap: WizardStap;
  categorie: string;
  tekst: string;
  /** Which answer value should draw visual attention */
  risicoIndicator?: "JA" | "NEE";
};

export const WIZARD_VRAGEN: Vraag[] = [
  // ── Bedrijfsverkenning — Standaard 4410 ──────────────────────────────────
  // Aard en activiteiten
  {
    key: "BV_01",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Aard en activiteiten",
    tekst: "Zijn de kernactiviteiten van de cliënt duidelijk en begrijpelijk?",
    risicoIndicator: "NEE",
  },
  {
    key: "BV_02",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Aard en activiteiten",
    tekst: "Is de branche waarin de cliënt opereert bekend bij het kantoor?",
    risicoIndicator: "NEE",
  },
  {
    key: "BV_03",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Aard en activiteiten",
    tekst: "Wijken de activiteiten af van wat gebruikelijk is in de branche?",
    risicoIndicator: "JA",
  },
  {
    key: "BV_04",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Aard en activiteiten",
    tekst: "Is de cliënt actief in meerdere landen of jurisdicties?",
    risicoIndicator: "JA",
  },

  // Structuur en eigendom
  {
    key: "BV_05",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Structuur en eigendom",
    tekst: "Is de juridische structuur van de cliënt transparant?",
    risicoIndicator: "NEE",
  },
  {
    key: "BV_06",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Structuur en eigendom",
    tekst: "Zijn er holdings, trusts of buitenlandse entiteiten in de structuur?",
    risicoIndicator: "JA",
  },
  {
    key: "BV_07",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Structuur en eigendom",
    tekst: "Zijn alle UBO's geïdentificeerd en gedocumenteerd?",
    risicoIndicator: "NEE",
  },
  {
    key: "BV_08",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Structuur en eigendom",
    tekst: "Is er sprake van een complexe of ongebruikelijke eigendomsstructuur?",
    risicoIndicator: "JA",
  },

  // Bestuur en governance
  {
    key: "BV_09",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Bestuur en governance",
    tekst: "Is de dagelijkse leiding helder belegd?",
    risicoIndicator: "NEE",
  },
  {
    key: "BV_10",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Bestuur en governance",
    tekst: "Zijn er recente bestuurswisselingen geweest?",
    risicoIndicator: "JA",
  },
  {
    key: "BV_11",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Bestuur en governance",
    tekst: "Is er een Raad van Commissarissen of toezichthoudend orgaan?",
  },

  // Financiële positie
  {
    key: "BV_12",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Financiële positie",
    tekst: "Is de financiële administratie op orde en toegankelijk?",
    risicoIndicator: "NEE",
  },
  {
    key: "BV_13",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Financiële positie",
    tekst: "Zijn er signalen van financiële problemen of discontinuïteit?",
    risicoIndicator: "JA",
  },
  {
    key: "BV_14",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Financiële positie",
    tekst: "Is er een accountantscontrole van voorgaand jaar beschikbaar?",
    risicoIndicator: "NEE",
  },

  // Interne beheersing
  {
    key: "BV_15",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Interne beheersing",
    tekst: "Beschikt de cliënt over basis interne beheersingsmaatregelen?",
    risicoIndicator: "NEE",
  },
  {
    key: "BV_16",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Interne beheersing",
    tekst: "Wordt gebruik gemaakt van standaard boekhoudsoftware?",
    risicoIndicator: "NEE",
  },
  {
    key: "BV_17",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Interne beheersing",
    tekst: "Zijn er ICT-risico's die de betrouwbaarheid van de administratie kunnen beïnvloeden?",
    risicoIndicator: "JA",
  },

  // Opdrachtgerelateerd
  {
    key: "BV_18",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Opdrachtgerelateerd",
    tekst: "Is de reden voor wisseling van accountant (indien van toepassing) bekend en plausibel?",
    risicoIndicator: "NEE",
  },
  {
    key: "BV_19",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Opdrachtgerelateerd",
    tekst: "Heeft contact met de vorige accountant plaatsgevonden?",
    risicoIndicator: "NEE",
  },
  {
    key: "BV_20",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Opdrachtgerelateerd",
    tekst: "Passen de gevraagde werkzaamheden binnen de expertise van het kantoor?",
    risicoIndicator: "NEE",
  },

  // ── Wwft cliëntenonderzoek ────────────────────────────────────────────────
  // Identiteit en rechtsvorm
  {
    key: "WWFT_01",
    stap: "WWFT",
    categorie: "Identiteit en rechtsvorm",
    tekst: "Is de identiteit van de cliënt vastgesteld op basis van betrouwbare bron?",
    risicoIndicator: "NEE",
  },
  {
    key: "WWFT_02",
    stap: "WWFT",
    categorie: "Identiteit en rechtsvorm",
    tekst: "Is een recent KvK-uittreksel (max 3 maanden) aanwezig?",
    risicoIndicator: "NEE",
  },
  {
    key: "WWFT_03",
    stap: "WWFT",
    categorie: "Identiteit en rechtsvorm",
    tekst: "Is de rechtsvorm eenvoudig en gebruikelijk?",
    risicoIndicator: "NEE",
  },

  // UBO
  {
    key: "WWFT_04",
    stap: "WWFT",
    categorie: "UBO",
    tekst: "Is elke UBO geïdentificeerd op basis van ID-bewijs?",
    risicoIndicator: "NEE",
  },
  {
    key: "WWFT_05",
    stap: "WWFT",
    categorie: "UBO",
    tekst: "Is een uittreksel uit het UBO-register opgevraagd?",
    risicoIndicator: "NEE",
  },
  {
    key: "WWFT_06",
    stap: "WWFT",
    categorie: "UBO",
    tekst: "Sluit het UBO-register aan bij eigen vaststelling?",
    risicoIndicator: "NEE",
  },
  {
    key: "WWFT_07",
    stap: "WWFT",
    categorie: "UBO",
    tekst: "Is sprake van een pseudo-UBO (terugval op statutair bestuur)?",
    risicoIndicator: "JA",
  },

  // Doel en aard relatie
  {
    key: "WWFT_08",
    stap: "WWFT",
    categorie: "Doel en aard relatie",
    tekst: "Is het doel van de zakelijke relatie vastgelegd?",
    risicoIndicator: "NEE",
  },
  {
    key: "WWFT_09",
    stap: "WWFT",
    categorie: "Doel en aard relatie",
    tekst: "Past de aard van de opdracht bij de activiteiten van de cliënt?",
    risicoIndicator: "NEE",
  },

  // Herkomst middelen en vermogen
  {
    key: "WWFT_10",
    stap: "WWFT",
    categorie: "Herkomst middelen en vermogen",
    tekst: "Is de herkomst van de middelen plausibel en onderbouwd?",
    risicoIndicator: "NEE",
  },
  {
    key: "WWFT_11",
    stap: "WWFT",
    categorie: "Herkomst middelen en vermogen",
    tekst: "Is de herkomst van het vermogen (bij hoog-risicoklanten) onderzocht?",
    risicoIndicator: "NEE",
  },
  {
    key: "WWFT_12",
    stap: "WWFT",
    categorie: "Herkomst middelen en vermogen",
    tekst: "Zijn er ongebruikelijke kasstromen of contante transacties?",
    risicoIndicator: "JA",
  },

  // PEP en sancties
  {
    key: "WWFT_13",
    stap: "WWFT",
    categorie: "PEP en sancties",
    tekst: "Is de cliënt, UBO of vertegenwoordiger een PEP?",
    risicoIndicator: "JA",
  },
  {
    key: "WWFT_14",
    stap: "WWFT",
    categorie: "PEP en sancties",
    tekst: "Is de cliënt, UBO of vertegenwoordiger familielid/naaste van een PEP?",
    risicoIndicator: "JA",
  },
  {
    key: "WWFT_15",
    stap: "WWFT",
    categorie: "PEP en sancties",
    tekst: "Komt de cliënt of UBO voor op een sanctielijst (EU, VN, OFAC)?",
    risicoIndicator: "JA",
  },
  {
    key: "WWFT_16",
    stap: "WWFT",
    categorie: "PEP en sancties",
    tekst: "Is OpenSanctions-screening uitgevoerd en gedocumenteerd?",
    risicoIndicator: "NEE",
  },

  // Geografisch risico
  {
    key: "WWFT_17",
    stap: "WWFT",
    categorie: "Geografisch risico",
    tekst: "Is de cliënt of een UBO gevestigd in een hoog-risicoland (EU-lijst, FATF)?",
    risicoIndicator: "JA",
  },
  {
    key: "WWFT_18",
    stap: "WWFT",
    categorie: "Geografisch risico",
    tekst: "Vinden er transacties plaats met hoog-risicolanden?",
    risicoIndicator: "JA",
  },

  // Branche-risico
  {
    key: "WWFT_19",
    stap: "WWFT",
    categorie: "Branche-risico",
    tekst: "Opereert de cliënt in een verhoogd-risicobranche (vastgoed, horeca, autohandel, coffeeshop, crypto, kunsthandel)?",
    risicoIndicator: "JA",
  },
  {
    key: "WWFT_20",
    stap: "WWFT",
    categorie: "Branche-risico",
    tekst: "Worden veel contante transacties verwerkt?",
    risicoIndicator: "JA",
  },

  // Negatieve signalen
  {
    key: "WWFT_21",
    stap: "WWFT",
    categorie: "Negatieve signalen",
    tekst: "Zijn er negatieve berichten in open bronnen (fraude, faillissement, strafrecht)?",
    risicoIndicator: "JA",
  },
  {
    key: "WWFT_22",
    stap: "WWFT",
    categorie: "Negatieve signalen",
    tekst: "Is er eerder een melding gedaan bij FIU over deze cliënt?",
    risicoIndicator: "JA",
  },
  {
    key: "WWFT_23",
    stap: "WWFT",
    categorie: "Negatieve signalen",
    tekst: "Is de cliënt eerder geweigerd of opgezegd door een andere dienstverlener?",
    risicoIndicator: "JA",
  },

  // Type onderzoek
  {
    key: "WWFT_24",
    stap: "WWFT",
    categorie: "Type onderzoek",
    tekst: "Is vereenvoudigd cliëntenonderzoek toegestaan en toegepast?",
  },
  {
    key: "WWFT_25",
    stap: "WWFT",
    categorie: "Type onderzoek",
    tekst: "Is verscherpt cliëntenonderzoek vereist en toegepast?",
    risicoIndicator: "NEE",
  },

  // ── Beoordeling en afronding ──────────────────────────────────────────────
  {
    key: "BEOORD_01",
    stap: "BEOORDELING",
    categorie: "Beoordeling en afronding",
    tekst: "Zijn alle onderdelen van het cliëntenonderzoek afgerond?",
    risicoIndicator: "NEE",
  },
  {
    key: "BEOORD_02",
    stap: "BEOORDELING",
    categorie: "Beoordeling en afronding",
    tekst: "Zijn alle openstaande punten uit stap 1 en 2 opgevolgd?",
    risicoIndicator: "NEE",
  },
  {
    key: "BEOORD_03",
    stap: "BEOORDELING",
    categorie: "Beoordeling en afronding",
    tekst: "Is verscherpt cliëntenonderzoek uitgevoerd indien vereist?",
    risicoIndicator: "NEE",
  },
  {
    key: "BEOORD_04",
    stap: "BEOORDELING",
    categorie: "Beoordeling en afronding",
    tekst: "Is er aanleiding tot melding van een ongebruikelijke transactie?",
    risicoIndicator: "JA",
  },
  {
    key: "BEOORD_05",
    stap: "BEOORDELING",
    categorie: "Beoordeling en afronding",
    tekst: "Accepteert het kantoor de opdracht?",
    risicoIndicator: "NEE",
  },
];

/** Return questions filtered by wizard step */
export function getVragenVoorStap(stap: WizardStap): Vraag[] {
  return WIZARD_VRAGEN.filter((v) => v.stap === stap);
}

/** Group questions by categorie within a step */
export function getVragenPerCategorie(
  stap: WizardStap
): Record<string, Vraag[]> {
  const vragen = getVragenVoorStap(stap);
  return vragen.reduce<Record<string, Vraag[]>>((acc, v) => {
    acc[v.categorie] = acc[v.categorie] ?? [];
    acc[v.categorie].push(v);
    return acc;
  }, {});
}
