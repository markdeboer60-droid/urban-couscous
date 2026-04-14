"use client";

/**
 * ActionButtons — RISICO / FALSE_POSITIVE decision buttons + note field.
 * Saved to SearchResultAction for audit trail.
 */

import { useState } from "react";
import { ShieldAlert, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { SearchBeslissing } from "@/types";

interface ActionButtonsProps {
  queryId: string;
  hitTitel: string;
  hitUrl?: string | null;
  hitSamenvatting: string;
  onSaved?: () => void;
}

export function ActionButtons({ queryId, hitTitel, hitUrl, hitSamenvatting, onSaved }: ActionButtonsProps) {
  const { toast } = useToast();
  const [beslissing, setBeslissing] = useState<SearchBeslissing | null>(null);
  const [notitie, setNotitie] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave(b: SearchBeslissing) {
    setBeslissing(b);
    setSaving(true);
    try {
      const res = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          searchQueryId: queryId,
          hitTitel,
          hitUrl,
          hitSamenvatting,
          beslissing: b,
          notitie: notitie.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSaved(true);
      toast({ title: b === "RISICO" ? "Gemarkeerd als risico" : "Gemarkeerd als false positive", variant: b === "RISICO" ? "destructive" : "default" });
      onSaved?.();
    } catch (err: unknown) {
      toast({ title: "Fout bij opslaan", description: String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant={beslissing === "RISICO" ? "destructive" : "success"}>
          {beslissing === "RISICO" ? <ShieldAlert className="h-3 w-3 mr-1 inline" /> : <CheckCircle className="h-3 w-3 mr-1 inline" />}
          {beslissing === "RISICO" ? "Risico gedocumenteerd" : "False positive gedocumenteerd"}
        </Badge>
      </div>
    );
  }

  return (
    <div className="space-y-2 pt-1">
      <Textarea
        placeholder="Notitie (optioneel)…"
        value={notitie}
        onChange={(e) => setNotitie(e.target.value)}
        className="text-xs min-h-[50px]"
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="destructive"
          disabled={saving}
          onClick={() => handleSave("RISICO")}
          className="flex items-center gap-1"
        >
          <ShieldAlert className="h-3 w-3" /> Markeer als risico
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={saving}
          onClick={() => handleSave("FALSE_POSITIVE")}
          className="flex items-center gap-1"
        >
          <CheckCircle className="h-3 w-3" /> False positive
        </Button>
      </div>
    </div>
  );
}
