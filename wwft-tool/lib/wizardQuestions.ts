/**
 * wizardQuestions.ts — Wwft / Standaard 4410 wizard question definitions.
 * Questions are tagged with clientTypes; if absent, the question applies to all types.
 * risicoIndicator marks which answer value warrants attention.
 */

import type { WizardStap, ClientType } from "@/types";

export type Vraag = {
  key: string;
  stap: WizardStap;
  categorie: string;
  tekst: string;
  risicoIndicator?: "JA" | "NEE";
  /** Restricts this question to specific client types. Absent = all types. */
  clientTypes?: ClientType[];
};

// ─── BEDRIJFSVERKENNING ───────────────────────────────────────────────────────

const BEDRIJFSVERKENNING: Vraag[] = [
  // Aard en activiteiten (alle typen)
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
    clientTypes: ["RECHTSPERSOON", "TRUST", "STICHTING"],
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

  // Structuur en eigendom (niet voor privépersoon)
  {
    key: "BV_05",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Structuur en eigendom",
    tekst: "Is de juridische structuur van de cliënt transparant?",
    risicoIndicator: "NEE",
    clientTypes: ["RECHTSPERSOON", "TRUST", "STICHTING"],
  },
  {
    key: "BV_06",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Structuur en eigendom",
    tekst: "Zijn er holdings, trusts of buitenlandse entiteiten in de structuur?",
    risicoIndicator: "JA",
    clientTypes: ["RECHTSPERSOON", "TRUST", "STICHTING"],
  },
  {
    key: "BV_07",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Structuur en eigendom",
    tekst: "Zijn alle UBO's geïdentificeerd en gedocumenteerd?",
    risicoIndicator: "NEE",
    clientTypes: ["RECHTSPERSOON", "TRUST"],
  },
  {
    key: "BV_08",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Structuur en eigendom",
    tekst: "Is er sprake van een complexe of ongebruikelijke eigendomsstructuur?",
    risicoIndicator: "JA",
    clientTypes: ["RECHTSPERSOON", "TRUST"],
  },

  // Bestuur en governance (niet voor privépersoon)
  {
    key: "BV_09",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Bestuur en governance",
    tekst: "Is de dagelijkse leiding helder belegd?",
    risicoIndicator: "NEE",
    clientTypes: ["RECHTSPERSOON", "TRUST", "STICHTING"],
  },
  {
    key: "BV_10",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Bestuur en governance",
    tekst: "Zijn er recente bestuurswisselingen geweest?",
    risicoIndicator: "JA",
    clientTypes: ["RECHTSPERSOON", "TRUST", "STICHTING"],
  },
  {
    key: "BV_11",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Bestuur en governance",
    tekst: "Is er een Raad van Commissarissen of toezichthoudend orgaan?",
    clientTypes: ["RECHTSPERSOON", "STICHTING"],
  },

  // Financiële positie
  {
    key: "BV_12",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Financiële positie",
    tekst: "Is de financiële administratie op orde en toegankelijk?",
    risicoIndicator: "NEE",
    clientTypes: ["RECHTSPERSOON", "TRUST", "STICHTING"],
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
    clientTypes: ["RECHTSPERSOON", "STICHTING"],
  },

  // Interne beheersing (niet voor privépersoon)
  {
    key: "BV_15",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Interne beheersing",
    tekst: "Beschikt de cliënt over basis interne beheersingsmaatregelen?",
    risicoIndicator: "NEE",
    clientTypes: ["RECHTSPERSOON", "TRUST", "STICHTING"],
  },
  {
    key: "BV_16",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Interne beheersing",
    tekst: "Wordt gebruik gemaakt van standaard boekhoudsoftware?",
    risicoIndicator: "NEE",
    clientTypes: ["RECHTSPERSOON", "STICHTING"],
  },
  {
    key: "BV_17",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Interne beheersing",
    tekst: "Zijn er ICT-risico's die de betrouwbaarheid van de administratie kunnen beïnvloeden?",
    risicoIndicator: "JA",
    clientTypes: ["RECHTSPERSOON", "STICHTING"],
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

  // ── Privépersoon-specifiek ─────────────────────────────────────────────────
  {
    key: "BV_PP_01",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Identiteit en persoonlijke gegevens",
    tekst: "Is een geldig identiteitsbewijs (paspoort, ID-kaart of rijbewijs) ontvangen en geverifieerd?",
    risicoIndicator: "NEE",
    clientTypes: ["PRIVEPERSOON"],
  },
  {
    key: "BV_PP_02",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Identiteit en persoonlijke gegevens",
    tekst: "Is het woonadres van de cliënt geverifieerd (bijv. uittreksel GBA of recente bankafschrift)?",
    risicoIndicator: "NEE",
    clientTypes: ["PRIVEPERSOON"],
  },
  {
    key: "BV_PP_03",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Identiteit en persoonlijke gegevens",
    tekst: "Is het beroep of de bron van inkomsten van de cliënt vastgelegd?",
    risicoIndicator: "NEE",
    clientTypes: ["PRIVEPERSOON"],
  },
  {
    key: "BV_PP_04",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Identiteit en persoonlijke gegevens",
    tekst: "Is de cliënt zelfstandig ondernemer of heeft hij/zij een dienstverband?",
    clientTypes: ["PRIVEPERSOON"],
  },

  // ── Trust-specifiek ────────────────────────────────────────────────────────
  {
    key: "BV_TR_01",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Truststructuur en documentatie",
    tekst: "Is de trustakte of trustdocumentatie ontvangen en beoordeeld?",
    risicoIndicator: "NEE",
    clientTypes: ["TRUST"],
  },
  {
    key: "BV_TR_02",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Truststructuur en documentatie",
    tekst: "Zijn alle betrokken partijen geïdentificeerd (settlor, trustee, protector en beneficiaries)?",
    risicoIndicator: "NEE",
    clientTypes: ["TRUST"],
  },
  {
    key: "BV_TR_03",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Truststructuur en documentatie",
    tekst: "Is de jurisdictie van de trust een low-tax of secrecyjurisdictie?",
    risicoIndicator: "JA",
    clientTypes: ["TRUST"],
  },
  {
    key: "BV_TR_04",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Truststructuur en documentatie",
    tekst: "Is de uiteindelijk economisch gerechtigde (UBO) van de trust bepaald?",
    risicoIndicator: "NEE",
    clientTypes: ["TRUST"],
  },

  // ── Stichting-specifiek ───────────────────────────────────────────────────
  {
    key: "BV_ST_01",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Statutaire doelstelling",
    tekst: "Zijn de doelstelling en statuten van de stichting ontvangen en beoordeeld?",
    risicoIndicator: "NEE",
    clientTypes: ["STICHTING"],
  },
  {
    key: "BV_ST_02",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Statutaire doelstelling",
    tekst: "Is het bestuur van de stichting geïdentificeerd en gedocumenteerd?",
    risicoIndicator: "NEE",
    clientTypes: ["STICHTING"],
  },
  {
    key: "BV_ST_03",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Statutaire doelstelling",
    tekst: "Beschikt de stichting over een RSIN-nummer en is dit gecontroleerd?",
    risicoIndicator: "NEE",
    clientTypes: ["STICHTING"],
  },
  {
    key: "BV_ST_04",
    stap: "BEDRIJFSVERKENNING",
    categorie: "Statutaire doelstelling",
    tekst: "Is de stichting ANBI-gecertificeerd (Algemeen Nut Beogende Instelling)?",
    clientTypes: ["STICHTING"],
  },
];

// ─── WWFT ─────────────────────────────────────────────────────────────────────

const WWFT: Vraag[] = [
  // Identiteit en rechtsvorm
  {
    key: "WWFT_01",
    stap: "WWFT",
    categorie: "Identiteit en rechtsvorm",
    tekst: "Is de identiteit van de cliënt vastgesteld op basis van een betrouwbare bron?",
    risicoIndicator: "NEE",
  },
  {
    key: "WWFT_02",
    stap: "WWFT",
    categorie: "Identiteit en rechtsvorm",
    tekst: "Is een recent KvK-uittreksel (max 3 maanden) aanwezig?",
    risicoIndicator: "NEE",
    clientTypes: ["RECHTSPERSOON", "STICHTING"],
  },
  {
    key: "WWFT_03",
    stap: "WWFT",
    categorie: "Identiteit en rechtsvorm",
    tekst: "Is de rechtsvorm eenvoudig en gebruikelijk?",
    risicoIndicator: "NEE",
    clientTypes: ["RECHTSPERSOON", "STICHTING"],
  },

  // UBO (niet voor privépersoon; stichting is vrijgesteld van UBO-register)
  {
    key: "WWFT_04",
    stap: "WWFT",
    categorie: "UBO",
    tekst: "Is elke UBO geïdentificeerd op basis van ID-bewijs?",
    risicoIndicator: "NEE",
    clientTypes: ["RECHTSPERSOON", "TRUST"],
  },
  {
    key: "WWFT_05",
    stap: "WWFT",
    categorie: "UBO",
    tekst: "Is een uittreksel uit het UBO-register opgevraagd?",
    risicoIndicator: "NEE",
    clientTypes: ["RECHTSPERSOON"],
  },
  {
    key: "WWFT_06",
    stap: "WWFT",
    categorie: "UBO",
    tekst: "Sluit het UBO-register aan bij de eigen vaststelling?",
    risicoIndicator: "NEE",
    clientTypes: ["RECHTSPERSOON"],
  },
  {
    key: "WWFT_07",
    stap: "WWFT",
    categorie: "UBO",
    tekst: "Is sprake van een pseudo-UBO (terugval op statutair bestuur)?",
    risicoIndicator: "JA",
    clientTypes: ["RECHTSPERSOON"],
  },

  // Privépersoon: zelf de UBO
  {
    key: "WWFT_PP_UBO",
    stap: "WWFT",
    categorie: "UBO",
    tekst: "Is de cliënt als natuurlijk persoon de UBO en is dit vastgelegd?",
    risicoIndicator: "NEE",
    clientTypes: ["PRIVEPERSOON"],
  },

  // Trust: beneficiaries als UBO
  {
    key: "WWFT_TR_01",
    stap: "WWFT",
    categorie: "UBO",
    tekst: "Zijn de beneficiaries geïdentificeerd of zijn zij een voldoende bepaalbare klasse?",
    risicoIndicator: "NEE",
    clientTypes: ["TRUST"],
  },
  {
    key: "WWFT_TR_02",
    stap: "WWFT",
    categorie: "UBO",
    tekst: "Is de truststructuur en het doel ervan begrijpelijk en gerechtvaardigd?",
    risicoIndicator: "NEE",
    clientTypes: ["TRUST"],
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
    tekst: "Is de herkomst van het vermogen (bij hoog-risicocliënten) onderzocht?",
    risicoIndicator: "NEE",
  },
  {
    key: "WWFT_12",
    stap: "WWFT",
    categorie: "Herkomst middelen en vermogen",
    tekst: "Zijn er ongebruikelijke kasstromen of contante transacties?",
    risicoIndicator: "JA",
  },
  // Privépersoon: extra bron-van-vermogen vraag
  {
    key: "WWFT_PP_01",
    stap: "WWFT",
    categorie: "Herkomst middelen en vermogen",
    tekst: "Is de herkomst van het privévermogen onderzocht en gedocumenteerd (erfenis, schenking, verkoop, etc.)?",
    risicoIndicator: "NEE",
    clientTypes: ["PRIVEPERSOON"],
  },
  {
    key: "WWFT_PP_02",
    stap: "WWFT",
    categorie: "Herkomst middelen en vermogen",
    tekst: "Zijn er aanwijzingen voor zwart geld of niet-opgegeven vermogen?",
    risicoIndicator: "JA",
    clientTypes: ["PRIVEPERSOON"],
  },

  // Stichting: geldstromen
  {
    key: "WWFT_ST_01",
    stap: "WWFT",
    categorie: "Herkomst middelen en vermogen",
    tekst: "Zijn de geldstromen van de stichting transparant en traceerbaar?",
    risicoIndicator: "NEE",
    clientTypes: ["STICHTING"],
  },
  {
    key: "WWFT_ST_02",
    stap: "WWFT",
    categorie: "Herkomst middelen en vermogen",
    tekst: "Zijn er donaties uit het buitenland en zo ja, zijn de donoren geïdentificeerd?",
    risicoIndicator: "JA",
    clientTypes: ["STICHTING"],
  },

  // PEP en sancties
  {
    key: "WWFT_13",
    stap: "WWFT",
    categorie: "PEP en sancties",
    tekst: "Is de cliënt, UBO of vertegenwoordiger een PEP (Politiek Prominent Persoon)?",
    risicoIndicator: "JA",
  },
  {
    key: "WWFT_14",
    stap: "WWFT",
    categorie: "PEP en sancties",
    tekst: "Is de cliënt, UBO of vertegenwoordiger familielid of naaste van een PEP?",
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
    tekst: "Is een OpenSanctions-screening uitgevoerd en gedocumenteerd?",
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
    tekst: "Vinden er transacties plaats met of via hoog-risicolanden?",
    risicoIndicator: "JA",
  },

  // Branche-risico (niet voor privépersoon)
  {
    key: "WWFT_19",
    stap: "WWFT",
    categorie: "Branche-risico",
    tekst: "Opereert de cliënt in een verhoogd-risicobranche (vastgoed, horeca, autohandel, crypto, kunsthandel)?",
    risicoIndicator: "JA",
    clientTypes: ["RECHTSPERSOON", "TRUST", "STICHTING"],
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
    tekst: "Is er eerder een melding gedaan bij de FIU over deze cliënt?",
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
];

// ─── BEOORDELING ──────────────────────────────────────────────────────────────

const BEOORDELING: Vraag[] = [
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

export const WIZARD_VRAGEN: Vraag[] = [
  ...BEDRIJFSVERKENNING,
  ...WWFT,
  ...BEOORDELING,
];

/** Return all questions for a wizard step, filtered by optional client type */
export function getVragenVoorStap(stap: WizardStap, clientType?: string): Vraag[] {
  return WIZARD_VRAGEN.filter(
    (v) =>
      v.stap === stap &&
      (!v.clientTypes || !clientType || v.clientTypes.includes(clientType as ClientType))
  );
}

/** Group questions by categorie within a step, filtered by optional client type */
export function getVragenPerCategorie(
  stap: WizardStap,
  clientType?: string
): Record<string, Vraag[]> {
  const vragen = getVragenVoorStap(stap, clientType);
  return vragen.reduce<Record<string, Vraag[]>>((acc, v) => {
    acc[v.categorie] = acc[v.categorie] ?? [];
    acc[v.categorie].push(v);
    return acc;
  }, {});
}
