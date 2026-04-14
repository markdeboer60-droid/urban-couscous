"use client";

/**
 * QuestionRow — renders a single wizard question with JA/NEE/NVT radio
 * buttons and an optional toelichting field.
 * Highlights the risky answer value with an orange border.
 */

import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import type { WizardAntwoord } from "@/types";
import type { Vraag } from "@/lib/wizardQuestions";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface QuestionRowProps {
  vraag: Vraag;
  initial?: { antwoord: WizardAntwoord; toelichting?: string | null };
  onChange: (key: string, antwoord: WizardAntwoord, toelichting: string) => void;
  readOnly?: boolean;
}

const OPTIONS: WizardAntwoord[] = ["JA", "NEE", "NVT"];

export function QuestionRow({ vraag, initial, onChange, readOnly }: QuestionRowProps) {
  const [antwoord, setAntwoord] = useState<WizardAntwoord | "">(initial?.antwoord ?? "");
  const [toelichting, setToelichting] = useState(initial?.toelichting ?? "");

  useEffect(() => {
    if (initial?.antwoord) setAntwoord(initial.antwoord);
    if (initial?.toelichting) setToelichting(initial.toelichting);
  }, [initial]);

  const isRisico = antwoord !== "" && antwoord === vraag.risicoIndicator;

  function handleSelect(v: WizardAntwoord) {
    if (readOnly) return;
    setAntwoord(v);
    onChange(vraag.key, v, toelichting);
  }

  function handleToelichting(v: string) {
    if (readOnly) return;
    setToelichting(v);
    if (antwoord) onChange(vraag.key, antwoord as WizardAntwoord, v);
  }

  return (
    <div className={cn("border rounded-md p-3 space-y-2 bg-white", isRisico && "border-orange-400 bg-orange-50")}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm text-gray-500 font-mono">{vraag.key}</span>
        {isRisico && <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />}
      </div>
      <p className="text-sm text-gray-800">{vraag.tekst}</p>
      <div className="flex gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => handleSelect(opt)}
            disabled={readOnly}
            className={cn(
              "px-3 py-1 rounded text-xs font-semibold border transition-colors",
              antwoord === opt
                ? opt === "JA"
                  ? "bg-blue-600 text-white border-blue-600"
                  : opt === "NEE"
                  ? "bg-gray-700 text-white border-gray-700"
                  : "bg-gray-200 text-gray-600 border-gray-300"
                : "bg-white text-gray-500 border-gray-300 hover:border-blue-400",
              readOnly && "cursor-default"
            )}
          >
            {opt}
          </button>
        ))}
      </div>
      {antwoord && (
        <Textarea
          placeholder="Toelichting (optioneel)…"
          value={toelichting}
          onChange={(e) => handleToelichting(e.target.value)}
          disabled={readOnly}
          className="text-sm min-h-[60px]"
        />
      )}
    </div>
  );
}
