"use client";

/**
 * LandRisicoAlert — shows a color-coded badge when a country is on
 * FATF or EU high-risk lists. Import checkLandRisico from lib/fatf.
 */

import { AlertTriangle, AlertOctagon, Info } from "lucide-react";
import { checkLandRisico } from "@/lib/fatf";

interface LandRisicoAlertProps {
  land: string;
}

export function LandRisicoAlert({ land }: LandRisicoAlertProps) {
  if (!land?.trim()) return null;

  const { niveau, bronnen } = checkLandRisico(land);
  if (niveau === "GEEN") return null;

  const config = {
    ZWART: {
      bg: "bg-red-50 border-red-400 text-red-800",
      icon: <AlertOctagon className="h-4 w-4 text-red-600 flex-shrink-0" />,
      label: "FATF Black List — hoog risico",
    },
    GRIJS: {
      bg: "bg-orange-50 border-orange-400 text-orange-800",
      icon: <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0" />,
      label: "FATF Grey List — verhoogd toezicht",
    },
    EU_HOOG: {
      bg: "bg-yellow-50 border-yellow-400 text-yellow-800",
      icon: <Info className="h-4 w-4 text-yellow-600 flex-shrink-0" />,
      label: "EU hoog-risico derde land",
    },
    GEEN: { bg: "", icon: null, label: "" },
  }[niveau];

  return (
    <div className={`flex items-start gap-2 rounded border p-2 text-xs ${config.bg}`}>
      {config.icon}
      <div>
        <p className="font-semibold">{config.label}</p>
        <p className="text-xs opacity-80">Bron: {bronnen.join(", ")} — verscherpt onderzoek vereist (art. 8 Wwft)</p>
      </div>
    </div>
  );
}
