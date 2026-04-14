"use client";

/**
 * NewClientDialog — modal form to add a new client.
 * Triggers redirect to the wizard on success.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";

export function NewClientDialog() {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [naam, setNaam] = useState("");
  const [kvkNummer, setKvkNummer] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!naam.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naam: naam.trim(), kvkNummer: kvkNummer.trim() || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const client = await res.json();
      toast({ title: "Cliënt aangemaakt", description: naam, variant: "default" });
      setOpen(false);
      setNaam("");
      setKvkNummer("");
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
              <Label htmlFor="kvk">KvK-nummer</Label>
              <Input
                id="kvk"
                value={kvkNummer}
                onChange={(e) => setKvkNummer(e.target.value)}
                placeholder="12345678"
              />
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
