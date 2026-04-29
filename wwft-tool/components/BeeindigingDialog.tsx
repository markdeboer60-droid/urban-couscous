"use client";

/**
 * BeeindigingDialog — PARTNER-only dialog to terminate a client relationship.
 * Sets status to BEEINDIGD, records reason, and sets a 5-year deletion date.
 */

import { useState } from "react";
import { AlertOctagon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface BeeindigingDialogProps {
  clientId: string;
  clientNaam: string;
  onBeeindigd: (verwijderDatum: string) => void;
}

export function BeeindigingDialog({ clientId, clientNaam, onBeeindigd }: BeeindigingDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reden, setReden] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (reden.trim().length < 10) {
      toast({ title: "Reden minimaal 10 tekens", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, beeindigen: true, beeindigdReden: reden.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      toast({ title: "Cliëntrelatie beëindigd", description: `Dossier bewaard tot ${new Date(data.verwijderDatum).toLocaleDateString("nl-NL")}` });
      setOpen(false);
      onBeeindigd(data.verwijderDatum);
    } catch (err: unknown) {
      toast({ title: "Fout", description: String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        className="border-red-300 text-red-700 hover:bg-red-50 flex items-center gap-2"
        onClick={() => setOpen(true)}
      >
        <AlertOctagon className="h-4 w-4" />
        Cliëntrelatie beëindigen
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertOctagon className="h-5 w-5" />
              Cliëntrelatie beëindigen
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              U staat op het punt de cliëntrelatie met <strong>{clientNaam}</strong> te beëindigen.
            </p>
            <div className="rounded border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-800 space-y-1">
              <p className="font-semibold">Bewaarplicht (art. 33 Wwft)</p>
              <p>Het dossier wordt bewaard voor een periode van 5 jaar na beëindiging en daarna automatisch gemarkeerd voor verwijdering.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3 pt-1">
              <div className="space-y-1">
                <Label htmlFor="reden">Reden beëindiging *</Label>
                <Textarea
                  id="reden"
                  value={reden}
                  onChange={(e) => setReden(e.target.value)}
                  placeholder="bijv. Te hoog risico, geen medewerking CDD, eigen verzoek cliënt, overlijden, liquidatie…"
                  className="min-h-[80px]"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                  Annuleren
                </Button>
                <Button type="submit" variant="destructive" disabled={saving || reden.trim().length < 10}>
                  {saving ? "Beëindigen…" : "Bevestig beëindiging"}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
