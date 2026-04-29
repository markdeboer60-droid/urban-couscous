/**
 * fatf.ts — FATF grey/black list and EU high-risk third countries.
 * Sources: FATF (Feb 2024) + EU Delegated Regulation 2024/163
 * Update these arrays when new FATF plenary outcomes are published.
 */

/** FATF Black List (High-Risk Jurisdictions subject to a Call for Action) */
export const FATF_BLACKLIST: string[] = [
  "Iran",
  "Noord-Korea",
  "Myanmar",
  "Rusland",
];

/** FATF Grey List (Jurisdictions under Increased Monitoring) */
export const FATF_GREYLIST: string[] = [
  "Bulgarije",
  "Burkina Faso",
  "Kameroen",
  "Ivoorkust",
  "Kroatië",
  "Congo",
  "Haïti",
  "Kenia",
  "Mali",
  "Monaco",
  "Mozambique",
  "Namibië",
  "Nigeria",
  "Zuid-Afrika",
  "Syrië",
  "Tanzania",
  "Venezuela",
  "Vietnam",
  "Jemen",
];

/** EU High-Risk Third Countries (art. 9 AMLD / Delegated Regulation 2024/163) */
export const EU_HIGH_RISK: string[] = [
  "Afghanistan",
  "Barbados",
  "Burkina Faso",
  "Kameroen",
  "Cayman Islands",
  "Congo",
  "Haïti",
  "Iran",
  "Jamaica",
  "Jordanië",
  "Mali",
  "Marokko",
  "Mozambique",
  "Myanmar",
  "Nigeria",
  "Noord-Korea",
  "Panama",
  "Filipijnen",
  "Senegal",
  "Zuid-Afrika",
  "Syrië",
  "Tanzania",
  "Trinidad en Tobago",
  "Uganda",
  "Vanuatu",
  "Vietnam",
  "Jemen",
  "Zimbabwe",
];

export type LandRisicoNiveau = "ZWART" | "GRIJS" | "EU_HOOG" | "GEEN";

export interface LandRisicoResult {
  niveau: LandRisicoNiveau;
  bronnen: string[];
}

export function checkLandRisico(land: string): LandRisicoResult {
  if (!land?.trim()) return { niveau: "GEEN", bronnen: [] };

  const normalized = land.trim();
  const bronnen: string[] = [];
  let niveau: LandRisicoNiveau = "GEEN";

  if (FATF_BLACKLIST.some((l) => l.toLowerCase() === normalized.toLowerCase())) {
    niveau = "ZWART";
    bronnen.push("FATF Black List");
  } else if (FATF_GREYLIST.some((l) => l.toLowerCase() === normalized.toLowerCase())) {
    niveau = "GRIJS";
    bronnen.push("FATF Grey List");
  }

  if (EU_HIGH_RISK.some((l) => l.toLowerCase() === normalized.toLowerCase())) {
    if (niveau === "GEEN") niveau = "EU_HOOG";
    bronnen.push("EU High-Risk Third Countries");
  }

  return { niveau, bronnen };
}
