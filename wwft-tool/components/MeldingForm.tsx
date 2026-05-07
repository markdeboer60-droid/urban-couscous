"use client";

/**
 * MeldingForm — form for creating an unusual transaction report.
 * Decision: NIET_MELDEN (with mandatory justification) or FIU_MELDING.
 * FIU-meldingen can only be finalized by a PARTNER.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { IndicatorType, MeldingBeslissing } from "@/types";

interface MeldingFormProps {
  clientId: string;
}

export function MeldingForm({ clientId }: MeldingFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [form, setForm] = useState({
    datumTransactie: "",
    bedrag: "",
    omschrijving: "",
    indicatorType: "" as IndicatorType | "",
    motivatie: "",
    beslissing: "" as MeldingBeslissing | "",
    onderbouwing: "",
  });
  const [saving, setSaving] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const bedragVal = parseFloat(form.bedrag);
    if (!form.beslissing || !form.datumTransactie || !form.bedrag || !form.omschrijving || !form.indicatorType || !form.motivatie || !form.onderbouwing) {
      toast({ title: "Alle velden verplicht", variant: "destructive" });
      return;
    }
    if (isNaN(bedragVal) || bedragVal <= 0) {
      toast({ title: "Voer een geldig positief bedrag in", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/meldingen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          datumTransactie: form.datumTransactie,
          bedrag: bedragVal,
          omschrijving: form.omschrijving,
          indicatorType: form.indicatorType,
          motivatie: form.motivatie,
          beslissing: form.beslissing,
          onderbouwing: form.onderbouwing,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({
        title: form.beslissing === "FIU_MELDING" ? "FIU-melding aangemaakt — wacht op partner-goedkeuring" : "Beslissing gedocumenteerd",
        variant: "default",
      });
      router.push(`/dossier/${clientId}`);
    } catch (err: unknown) {
      toast({ title: "Fout", description: String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Datum transactie *</Label>
          <Input type="date" value={form.datumTransactie} onChange={(e) => update("datumTransactie", e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label>Bedrag (€) *</Label>
          <Input type="number" step="0.01" value={form.bedrag} onChange={(e) => update("bedrag", e.target.value)} placeholder="0.00" required />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Omschrijving transactie *</Label>
        <Textarea value={form.omschrijving} onChange={(e) => update("omschrijving", e.target.value)} placeholder="Beschrijf de transactie en betrokken partijen…" required />
      </div>

      <div className="space-y-1">
        <Label>Indicatortype *</Label>
        <Select value={form.indicatorType} onValueChange={(v) => update("indicatorType", v)}>
          <SelectTrigger><SelectValue placeholder="Kies type indicator…" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="SUBJECTIEF">Subjectief (eigen oordeel dienstverlener)</SelectItem>
            <SelectItem value="OBJECTIEF">Objectief (wettelijke indicatorenlijst)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label>Motivatie (koppeling Wwft-indicatoren) *</Label>
        <Textarea value={form.motivatie} onChange={(e) => update("motivatie", e.target.value)} placeholder="Welke Wwft-indicatoren zijn van toepassing en waarom?" required />
      </div>

      <div className="border-t pt-4 space-y-3">
        <Label className="text-base font-semibold flex items-center gap-2">
          <FileWarning className="h-4 w-4" /> Beslissing *
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => update("beslissing", "NIET_MELDEN")}
            className={`border rounded-md p-3 text-left transition-colors ${form.beslissing === "NIET_MELDEN" ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300"}`}
          >
            <p className="font-medium text-sm">Niet melden</p>
            <p className="text-xs text-gray-500 mt-0.5">Geen meldplicht van toepassing</p>
          </button>
          <button
            type="button"
            onClick={() => update("beslissing", "FIU_MELDING")}
            className={`border rounded-md p-3 text-left transition-colors ${form.beslissing === "FIU_MELDING" ? "border-red-500 bg-red-50" : "border-gray-200 hover:border-gray-300"}`}
          >
            <p className="font-medium text-sm text-red-700">FIU-melding voorbereiden</p>
            <p className="text-xs text-gray-500 mt-0.5">Vereist goedkeuring partner</p>
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <Label>
          {form.beslissing === "NIET_MELDEN"
            ? "Onderbouwing waarom geen meldplicht *"
            : "Toelichting voor goAML-melding *"}
        </Label>
        <Textarea
          value={form.onderbouwing}
          onChange={(e) => update("onderbouwing", e.target.value)}
          placeholder={
            form.beslissing === "NIET_MELDEN"
              ? "Beschrijf waarom er geen meldplicht is onder de Wwft-indicatoren…"
              : "Beschrijf de relevante feiten, betrokkenen en indicatoren voor de FIU-melding…"
          }
          className="min-h-[120px]"
          required
        />
      </div>

      <Button type="submit" disabled={saving || !form.beslissing}>
        {saving ? "Opslaan…" : "Vastleggen"}
      </Button>
    </form>
  );
}
