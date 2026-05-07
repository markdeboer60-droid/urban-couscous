"use client";

/**
 * ReviewPanel — shows review history and handles completing a review.
 */

import { useState, useEffect } from "react";
import { Calendar, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Review, RisicoOordeel } from "@/types";
import { cn } from "@/lib/utils";

interface ReviewPanelProps {
  clientId: string;
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  GEPLAND: "secondary",
  UITGEVOERD: "success",
  ACHTERSTALLIG: "destructive",
};

export function ReviewPanel({ clientId }: ReviewPanelProps) {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);
  const [bevindingen, setBevindingen] = useState("");
  const [risicoNa, setRisicoNa] = useState<RisicoOordeel | "">("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/reviews?clientId=${clientId}`)
      .then((r) => r.json())
      .then((data) => { setReviews(data); setLoaded(true); });
  }, [clientId]);

  async function handleComplete(reviewId: string) {
    if (bevindingen.trim().length < 10) {
      toast({ title: "Voer minimaal 10 tekens bevindingen in", variant: "destructive" });
      return;
    }
    if (!risicoNa) { toast({ title: "Selecteer risicoprofiel na review", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, bevindingen, risicoOordeelNa: risicoNa }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: "Review afgerond en volgende gepland" });
      setCompleting(null);
      setBevindingen("");
      setRisicoNa("");
      // Refresh
      const updated = await fetch(`/api/reviews?clientId=${clientId}`).then((r) => r.json());
      setReviews(updated);
    } catch (err: unknown) {
      toast({ title: "Fout", description: String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const next = reviews.find((r) => r.status === "GEPLAND" || r.status === "ACHTERSTALLIG");
  const past = reviews.filter((r) => r.status === "UITGEVOERD");

  if (!loaded) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-24 rounded-md bg-gray-100" />
        <div className="h-8 w-40 rounded bg-gray-100" />
      </div>
    );
  }

  if (loaded && !next && past.length === 0) {
    return (
      <p className="text-sm text-gray-400">Nog geen reviews gepland.</p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Next scheduled review */}
      {next && (
        <div className={cn("border rounded-md p-4 space-y-3", next.status === "ACHTERSTALLIG" ? "border-red-400 bg-red-50" : "border-blue-200 bg-blue-50")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="text-sm font-medium">
                Volgende review: {new Date(next.volgendeReviewOp).toLocaleDateString("nl-NL")}
              </span>
            </div>
            <Badge variant={STATUS_VARIANT[next.status]}>{next.status}</Badge>
          </div>
          {completing === next.id ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Bevindingen <span className="text-gray-400 font-normal">(min. 10 tekens)</span></Label>
                <Textarea value={bevindingen} onChange={(e) => setBevindingen(e.target.value)} placeholder="Bevindingen van de review…" />
              </div>
              <div className="space-y-1">
                <Label>Risicoprofiel na review *</Label>
                <Select value={risicoNa} onValueChange={(v) => setRisicoNa(v as RisicoOordeel)}>
                  <SelectTrigger><SelectValue placeholder="Kies risicoprofiel…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LAAG">Laag</SelectItem>
                    <SelectItem value="MIDDEN">Midden</SelectItem>
                    <SelectItem value="HOOG">Hoog</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleComplete(next.id)} disabled={saving}>
                  {saving ? "Opslaan…" : "Review afronden"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setCompleting(null)}>Annuleren</Button>
              </div>
            </div>
          ) : (
            <Button size="sm" onClick={() => setCompleting(next.id)} className="flex items-center gap-1">
              <ClipboardCheck className="h-3.5 w-3.5" /> Review uitvoeren
            </Button>
          )}
        </div>
      )}

      {/* Review history */}
      {past.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Reviewhistorie</p>
          {past.map((r) => (
            <div key={r.id} className="border rounded p-3 bg-gray-50 space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {r.uitgevoerdOp ? new Date(r.uitgevoerdOp).toLocaleDateString("nl-NL") : "—"}
                </span>
                {r.risicoOordeelNa && (
                  <Badge variant={r.risicoOordeelNa === "LAAG" ? "laag" : r.risicoOordeelNa === "MIDDEN" ? "midden" : "hoog"}>
                    {r.risicoOordeelNa}
                  </Badge>
                )}
              </div>
              {r.bevindingen && <p className="text-xs text-gray-600">{r.bevindingen}</p>}
              {r.uitvoerder && <p className="text-xs text-gray-400">Uitgevoerd door {r.uitvoerder.naam}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
