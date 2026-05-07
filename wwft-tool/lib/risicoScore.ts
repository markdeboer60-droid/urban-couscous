/**
 * risicoScore.ts — berekent een indicatief risicoprofiel op basis van wizardantwoorden.
 * Gebaseerd op FATF-risicofactoren en Wwft-indicatoren.
 */

import type { WizardAntwoord } from "@/types";
import { WIZARD_VRAGEN } from "./wizardQuestions";

export interface RisicoScore {
  suggestie: "LAAG" | "MIDDEN" | "HOOG";
  hoogscore: number;
  middenScore: number;
  hoog: string[];
  midden: string[];
  beantwoord: number;
  totaal: number;
}

// 3 punten elk — automatisch HOOG bij ≥1
const HOOG_KEYS: Record<string, string> = {
  WWFT_13: "PEP aanwezig (cliënt, UBO of vertegenwoordiger)",
  WWFT_14: "Familielid of naaste van PEP",
  WWFT_15: "Staat op sanctielijst (EU / VN / OFAC)",
  WWFT_17: "Gevestigd in hoog-risicoland (FATF / EU)",
  WWFT_22: "Eerder FIU-melding voor deze cliënt",
  WWFT_23: "Eerder geweigerd door andere dienstverlener",
};

// 1 punt elk — MIDDEN bij ≥3 punten totaal
const MIDDEN_KEYS: Record<string, string> = {
  BV_03: "Afwijkende activiteiten voor de branche",
  BV_04: "Actief in meerdere landen of jurisdicties",
  BV_06: "Holdings, trusts of buitenlandse entiteiten aanwezig",
  BV_08: "Complexe of ongebruikelijke eigendomsstructuur",
  BV_10: "Recente bestuurswisselingen",
  BV_13: "Signalen van financiële problemen of discontinuïteit",
  WWFT_07: "Pseudo-UBO (terugval op statutair bestuur)",
  WWFT_12: "Ongebruikelijke kasstromen of contante transacties",
  WWFT_18: "Transacties met hoog-risicolanden",
  WWFT_19: "Actief in hoog-risicobranche (vastgoed, horeca, crypto…)",
  WWFT_20: "Veel contante transacties",
  WWFT_21: "Negatieve berichten in open bronnen",
};

const VRAGEN_MAP = Object.fromEntries(WIZARD_VRAGEN.map((v) => [v.key, v]));

export function berekenRisicoScore(
  antwoorden: Record<string, { antwoord: WizardAntwoord }>
): RisicoScore {
  const hoog: string[] = [];
  const midden: string[] = [];

  for (const [key, label] of Object.entries(HOOG_KEYS)) {
    const vraag = VRAGEN_MAP[key];
    if (!vraag?.risicoIndicator) continue;
    if (antwoorden[key]?.antwoord === vraag.risicoIndicator) hoog.push(label);
  }

  for (const [key, label] of Object.entries(MIDDEN_KEYS)) {
    const vraag = VRAGEN_MAP[key];
    if (!vraag?.risicoIndicator) continue;
    if (antwoorden[key]?.antwoord === vraag.risicoIndicator) midden.push(label);
  }

  const hoogscore = hoog.length;
  const middenScore = midden.length;
  const beantwoord = Object.keys(antwoorden).length;
  const totaal = WIZARD_VRAGEN.length;

  let suggestie: "LAAG" | "MIDDEN" | "HOOG";
  if (hoogscore >= 1 || middenScore >= 6) {
    suggestie = "HOOG";
  } else if (middenScore >= 3) {
    suggestie = "MIDDEN";
  } else {
    suggestie = "LAAG";
  }

  return { suggestie, hoogscore, middenScore, hoog, midden, beantwoord, totaal };
}
