"use client";

/**
 * NewClientDialog — modal form to add a new client.
 * Includes land field with FATF/EU risk alert and optional KvK lookup.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LandRisicoAlert } from "@/components/LandRisicoAlert";
import { useToast } from "@/hooks/use-toast";

export function NewClientDialog() {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [naam, setNaam] = useState("");
  const [kvkNummer, setKvkNummer] = useState("");
  const [land, setLand] = useState("");
  const [loading, setLoading] = useState(false);
  const [kvkLooking, setKvkLooking] = useState(false);

  async function handleKvkLookup() {
    if (!kvkNummer.trim()) return;
    setKvkLooking(true);
    try {
      const res = await fetch(`/api/kvk?kvk=${encodeURIComponent(kvkNummer.trim())}`);
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      if (data.naam) setNaam(data.naam);
      if (data.land) setLand(data.land);
      toast({ title: "KvK-gegevens opgehaald", description: data.naam });
    } catch (err: unknown) {
      toast({ title: "KvK lookup mislukt", description: String(err), variant: "destructive" });
    } finally {
      setKvkLooking(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!naam.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          naam: naam.trim(),
          kvkNummer: kvkNummer.trim() || undefined,
          land: land.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const client = await res.json();
      toast({ title: "Cliënt aangemaakt", description: naam });
      setOpen(false);
      setNaam(""); setKvkNummer(""); setLand("");
      router.push(`/dossier/${client.id}/wizard`);
    } catch (err: unknown) {
      toast({ title: "Fout", description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="flex items-center gap-2">
        <PlusCircle className="h-4 w-4" />
        Nieuwe cliënt
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuwe cliënt toevoegen</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4">
            {/* KvK + lookup */}
            <div className="grid gap-1.5">
              <Label htmlFor="kvk">KvK-nummer</Label>
              <div className="flex gap-2">
                <Input
                  id="kvk"
                  value={kvkNummer}
                  onChange={(e) => setKvkNummer(e.target.value)}
                  placeholder="12345678"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!kvkNummer.trim() || kvkLooking}
                  onClick={handleKvkLookup}
                  className="flex items-center gap-1 whitespace-nowrap"
                >
                  <Search className="h-3 w-3" />
                  {kvkLooking ? "Opzoeken…" : "Opzoeken"}
                </Button>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="naam">Naam cliënt *</Label>
              <Input
                id="naam"
                value={naam}
                onChange={(e) => setNaam(e.target.value)}
                placeholder="Bedrijfsnaam of naam natuurlijk persoon"
                required
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="land">Land van vestiging</Label>
              <Input
                id="land"
                value={land}
                onChange={(e) => setLand(e.target.value)}
                placeholder="bijv. Nederland, Iran, Nigeria…"
              />
              <LandRisicoAlert land={land} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                Annuleren
              </Button>
              <Button type="submit" disabled={loading || !naam.trim()}>
                {loading ? "Aanmaken…" : "Aanmaken & wizard starten"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
