"use client";

/**
 * RisicoScoreSuggestie — toont de indicatieve risicoscore op basis van wizardantwoorden.
 * Kan worden genegeerd door de gebruiker; het blijft een suggestie.
 */

import { useState } from "react";
import { ChevronDown, ChevronUp, AlertTriangle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RisicoScore } from "@/lib/risicoScore";

interface Props {
  score: RisicoScore;
  onOvernemen: (suggestie: "LAAG" | "MIDDEN" | "HOOG") => void;
}

const BADGE_VARIANT: Record<string, "laag" | "midden" | "hoog"> = {
  LAAG: "laag",
  MIDDEN: "midden",
  HOOG: "hoog",
};

const LABEL: Record<string, string> = {
  LAAG: "Laag risico",
  MIDDEN: "Midden risico",
  HOOG: "Hoog risico",
};

export function RisicoScoreSuggestie({ score, onOvernemen }: Props) {
  const [open, setOpen] = useState(false);

  const pct = score.totaal > 0 ? Math.round((score.beantwoord / score.totaal) * 100) : 0;
  const incomplete = pct < 60;

  return (
    <div className="rounded-lg border bg-blue-50 border-blue-200 p-3 space-y-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <Info className="h-4 w-4 text-blue-600 flex-shrink-0" />
          <span className="text-blue-800 font-medium">Indicatieve risicoscore:</span>
          <Badge variant={BADGE_VARIANT[score.suggestie]}>
            {LABEL[score.suggestie]}
          </Badge>
          {incomplete && (
            <span className="text-xs text-blue-500">({pct}% van vragen beantwoord)</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-100"
            onClick={() => onOvernemen(score.suggestie)}
          >
            Overnemen
          </Button>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="text-blue-600 hover:text-blue-800"
          >
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="pt-1 space-y-2 text-xs">
          {score.hoog.length > 0 && (
            <div>
              <p className="font-semibold text-red-700 flex items-center gap-1 mb-1">
                <AlertTriangle className="h-3 w-3" /> Hoog-risicofactoren ({score.hoog.length})
              </p>
              <ul className="space-y-0.5 pl-4 list-disc text-red-800">
                {score.hoog.map((f) => <li key={f}>{f}</li>)}
              </ul>
            </div>
          )}
          {score.midden.length > 0 && (
            <div>
              <p className="font-semibold text-orange-700 flex items-center gap-1 mb-1">
                <AlertTriangle className="h-3 w-3" /> Verhoogde-risicofactoren ({score.midden.length})
              </p>
              <ul className="space-y-0.5 pl-4 list-disc text-orange-800">
                {score.midden.map((f) => <li key={f}>{f}</li>)}
              </ul>
            </div>
          )}
          {score.hoog.length === 0 && score.midden.length === 0 && (
            <p className="text-blue-600">Geen risicofactoren gedetecteerd op basis van huidige antwoorden.</p>
          )}
          <p className="text-blue-500 pt-1">
            Dit is een automatische indicatie — het definitieve oordeel blijft de verantwoordelijkheid van de behandelaar.
          </p>
        </div>
      )}
    </div>
  );
}
