"use client";

/**
 * EddPanel — Enhanced Due Diligence section for high-risk / PEP clients.
 * Shown at the bottom of the Beoordeling wizard step.
 * PARTNER approval required to complete EDD.
 */

import { useState } from "react";
import { ShieldAlert, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { UserRole } from "@/types";

interface EddPanelProps {
  clientId: string;
  isEdd: boolean;
  eddBronVermogen?: string | null;
  eddGoedgekeurdDoor?: string | null;
  eddGoedgekeurdOp?: string | null;
  userRol: UserRole;
  readOnly?: boolean;
  onUpdated?: (data: { isEdd: boolean; eddBronVermogen?: string; eddGoedgekeurdOp?: string }) => void;
}

export function EddPanel({
  clientId,
  isEdd: initialIsEdd,
  eddBronVermogen: initialBron,
  eddGoedgekeurdDoor,
  eddGoedgekeurdOp: initialGoedgekeurdOp,
  userRol,
  readOnly,
  onUpdated,
}: EddPanelProps) {
  const { toast } = useToast();
  const [isEdd, setIsEdd] = useState(initialIsEdd);
  const [bronVermogen, setBronVermogen] = useState(initialBron ?? "");
  const [goedgekeurdOp, setGoedgekeurdOp] = useState(initialGoedgekeurdOp ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, isEdd, eddBronVermogen: bronVermogen }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: "EDD opgeslagen" });
      onUpdated?.({ isEdd, eddBronVermogen: bronVermogen });
    } catch (err: unknown) {
      toast({ title: "Fout", description: String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove() {
    if (bronVermogen.trim().length < 20) {
      toast({ title: "Herkomst vermogen minimaal 20 tekens", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, isEdd: true, eddBronVermogen: bronVermogen, eddGoedkeuren: true }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      const op = data.eddGoedgekeurdOp ?? new Date().toISOString();
      setGoedgekeurdOp(op);
      toast({ title: "EDD goedgekeurd" });
      onUpdated?.({ isEdd: true, eddBronVermogen: bronVermogen, eddGoedgekeurdOp: op });
    } catch (err: unknown) {
      toast({ title: "Fout", description: String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-purple-200 rounded-md p-4 bg-purple-50 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-purple-700" />
        <h4 className="text-sm font-semibold text-purple-900">Verscherpt Cliëntenonderzoek (EDD)</h4>
        {goedgekeurdOp && (
          <Badge className="bg-green-100 text-green-800 border-green-300 text-xs flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Goedgekeurd {new Date(goedgekeurdOp).toLocaleDateString("nl-NL")}
          </Badge>
        )}
      </div>

      <p className="text-xs text-purple-700">
        Verplicht bij hoog-risicoclients, PEP-betrokkenen of cliënten in hoog-risico landen (art. 8 Wwft).
        Documenteer de herkomst van vermogen en de bron van middelen.
      </p>

      {!readOnly && (
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 accent-purple-700"
            checked={isEdd}
            onChange={(e) => setIsEdd(e.target.checked)}
            disabled={!!goedgekeurdOp}
          />
          <span className="text-sm text-purple-900">EDD van toepassing op deze cliënt</span>
        </label>
      )}

      {isEdd && (
        <div className="space-y-2">
          <Label className="text-purple-900">Herkomst vermogen (Source of Funds / Wealth) *</Label>
          <Textarea
            value={bronVermogen}
            onChange={(e) => setBronVermogen(e.target.value)}
            placeholder="Beschrijf de herkomst van het vermogen: ondernemersinkomsten, erfenis, onroerend goed, etc. Vermeld bronnen en documentatie."
            className="min-h-[80px] text-sm"
            disabled={readOnly || !!goedgekeurdOp}
          />
        </div>
      )}

      {!readOnly && !goedgekeurdOp && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Opslaan…" : "Opslaan"}
          </Button>
          {userRol === "PARTNER" && isEdd && (
            <Button
              size="sm"
              onClick={handleApprove}
              disabled={saving || bronVermogen.trim().length < 20}
              className="bg-purple-700 hover:bg-purple-800 text-white"
            >
              EDD goedkeuren (PARTNER)
            </Button>
          )}
          {userRol !== "PARTNER" && isEdd && (
            <p className="text-xs text-purple-600 self-center">
              EDD-goedkeuring vereist een PARTNER
            </p>
          )}
        </div>
      )}
    </div>
  );
}
