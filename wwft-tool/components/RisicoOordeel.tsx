"use client";

/**
 * RisicoOordeel — risk level dropdown with motivatie textarea.
 * Shows a colored badge next to the selection.
 */

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RisicoOordeel as RisicoOordeelType } from "@/types";

interface RisicoOordeelProps {
  value: string;
  motivatie: string;
  onChange: (value: RisicoOordeelType | "", motivatie: string) => void;
  readOnly?: boolean;
}

const OPTIONS: { value: RisicoOordeelType; label: string; variant: "laag" | "midden" | "hoog" }[] = [
  { value: "LAAG", label: "Laag risico", variant: "laag" },
  { value: "MIDDEN", label: "Midden risico", variant: "midden" },
  { value: "HOOG", label: "Hoog risico", variant: "hoog" },
];

export function RisicoOordeel({ value, motivatie, onChange, readOnly }: RisicoOordeelProps) {
  const selected = OPTIONS.find((o) => o.value === value);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 space-y-1">
          <Label>Risicoprofiel *</Label>
          {readOnly ? (
            <div className="h-9 flex items-center">
              {selected ? (
                <Badge variant={selected.variant}>{selected.label}</Badge>
              ) : (
                <span className="text-sm text-gray-400">Niet ingesteld</span>
              )}
            </div>
          ) : (
            <Select value={value} onValueChange={(v) => onChange(v as RisicoOordeelType, motivatie)}>
              <SelectTrigger>
                <SelectValue placeholder="Kies risicoprofiel…" />
              </SelectTrigger>
              <SelectContent>
                {OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    <span className="flex items-center gap-2">
                      <Badge variant={o.variant} className="text-xs">{o.label}</Badge>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {selected && !readOnly && (
          <Badge variant={selected.variant} className="mt-5">{selected.label}</Badge>
        )}
      </div>
      <div className="space-y-1">
        <Label>
          Motivatie risicoprofiel *{" "}
          <span className="text-xs text-gray-400">({motivatie.length}/50 min)</span>
        </Label>
        <Textarea
          placeholder="Onderbouw het risicoprofiel (minimaal 50 tekens)…"
          value={motivatie}
          onChange={(e) => onChange(value as RisicoOordeelType | "", e.target.value)}
          disabled={readOnly}
          className={motivatie.length > 0 && motivatie.length < 50 ? "border-orange-400" : ""}
        />
      </div>
    </div>
  );
}
