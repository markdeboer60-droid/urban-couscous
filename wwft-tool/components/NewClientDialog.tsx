"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Search, Building2, User, Globe, Landmark } from "lucide-react";
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
import type { ClientType } from "@/types";
import { cn } from "@/lib/utils";

const CLIENT_TYPES: {
  type: ClientType;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
}[] = [
  {
    type: "RECHTSPERSOON",
    label: "Rechtspersoon",
    sublabel: "BV, NV, VOF, maatschap…",
    icon: <Building2 className="h-5 w-5" />,
  },
  {
    type: "PRIVEPERSOON",
    label: "Privépersoon",
    sublabel: "Natuurlijk persoon",
    icon: <User className="h-5 w-5" />,
  },
  {
    type: "STICHTING",
    label: "Stichting / Vereniging",
    sublabel: "ANBI, ideel doel",
    icon: <Landmark className="h-5 w-5" />,
  },
  {
    type: "TRUST",
    label: "Trust / Buitenlandse stichting",
    sublabel: "Offshore, fundatie…",
    icon: <Globe className="h-5 w-5" />,
  },
];

export function NewClientDialog() {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [clientType, setClientType] = useState<ClientType>("RECHTSPERSOON");
  const [naam, setNaam] = useState("");
  const [kvkNummer, setKvkNummer] = useState("");
  const [land, setLand] = useState("");
  const [rechtsvorm, setRechtsvorm] = useState("");
  const [sbiCode, setSbiCode] = useState("");
  const [sbiOmschrijving, setSbiOmschrijving] = useState("");
  const [kvkWaarschuwing, setKvkWaarschuwing] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [kvkLooking, setKvkLooking] = useState(false);

  const showKvk = clientType === "RECHTSPERSOON" || clientType === "STICHTING";

  async function handleKvkLookup() {
    if (!kvkNummer.trim()) return;
    setKvkLooking(true);
    try {
      const res = await fetch(`/api/kvk?kvk=${encodeURIComponent(kvkNummer.trim())}`);
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      if (data.naam) setNaam(data.naam);
      if (data.land) setLand(data.land);
      if (data.rechtsvorm) setRechtsvorm(data.rechtsvorm);
      if (data.sbiCode) setSbiCode(data.sbiCode);
      if (data.sbiOmschrijving) setSbiOmschrijving(data.sbiOmschrijving);
      const warnings: string[] = [];
      if (data.isFailliet) warnings.push("Faillissement geregistreerd");
      if (data.isOpgeheven) warnings.push("Bedrijf is opgeheven");
      setKvkWaarschuwing(warnings.length > 0 ? warnings.join(" · ") : null);
      toast({ title: "KvK-gegevens opgehaald", description: data.naam });
    } catch (err: unknown) {
      toast({ title: "KvK lookup mislukt", description: String(err), variant: "destructive" });
    } finally {
      setKvkLooking(false);
    }
  }

  function reset() {
    setClientType("RECHTSPERSOON");
    setNaam(""); setKvkNummer(""); setLand("");
    setRechtsvorm(""); setSbiCode(""); setSbiOmschrijving("");
    setKvkWaarschuwing(null);
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
          clientType,
          rechtsvorm: rechtsvorm.trim() || undefined,
          sbiCode: sbiCode.trim() || undefined,
          sbiOmschrijving: sbiOmschrijving.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const client = await res.json();
      toast({ title: "Cliënt aangemaakt", description: naam });
      setOpen(false);
      reset();
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
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nieuwe cliënt toevoegen</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Client type selector */}
            <div className="space-y-2">
              <Label>Type cliënt</Label>
              <div className="grid grid-cols-2 gap-2">
                {CLIENT_TYPES.map((ct) => (
                  <button
                    key={ct.type}
                    type="button"
                    onClick={() => setClientType(ct.type)}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-3 text-left transition-all",
                      clientType === ct.type
                        ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    <span className={cn(
                      "mt-0.5 flex-shrink-0",
                      clientType === ct.type ? "text-blue-600" : "text-gray-400"
                    )}>
                      {ct.icon}
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-gray-900">{ct.label}</span>
                      <span className="block text-xs text-gray-500">{ct.sublabel}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* KvK lookup — only for RECHTSPERSOON / STICHTING */}
            {showKvk && (
              <div className="space-y-1.5">
                <Label htmlFor="kvk">KvK-nummer</Label>
                <div className="flex gap-2">
                  <Input
                    id="kvk"
                    value={kvkNummer}
                    onChange={(e) => setKvkNummer(e.target.value)}
                    onBlur={() => {
                      if (/^\d{8}$/.test(kvkNummer.trim())) handleKvkLookup();
                    }}
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
                    {kvkLooking ? "Zoeken…" : "Opzoeken"}
                  </Button>
                </div>
              </div>
            )}

            {/* Naam */}
            <div className="space-y-1.5">
              <Label htmlFor="naam">
                {clientType === "PRIVEPERSOON" ? "Naam cliënt *" : "Bedrijfsnaam *"}
              </Label>
              <Input
                id="naam"
                value={naam}
                onChange={(e) => setNaam(e.target.value)}
                placeholder={
                  clientType === "PRIVEPERSOON"
                    ? "Voor- en achternaam"
                    : clientType === "STICHTING"
                    ? "Naam stichting of vereniging"
                    : clientType === "TRUST"
                    ? "Naam trust of fundatie"
                    : "Bedrijfsnaam"
                }
                required
              />
            </div>

            {/* Rechtsvorm — auto-filled from KvK, editable */}
            {clientType !== "PRIVEPERSOON" && (
              <div className="space-y-1.5">
                <Label htmlFor="rechtsvorm">Rechtsvorm</Label>
                <Input
                  id="rechtsvorm"
                  value={rechtsvorm}
                  onChange={(e) => setRechtsvorm(e.target.value)}
                  placeholder={
                    clientType === "STICHTING"
                      ? "bijv. Stichting, Vereniging"
                      : clientType === "TRUST"
                      ? "bijv. Trust, Fundatie, Foundation"
                      : "bijv. Besloten Vennootschap, Maatschap"
                  }
                />
              </div>
            )}

            {/* Land */}
            <div className="space-y-1.5">
              <Label htmlFor="land">Land van vestiging</Label>
              <Input
                id="land"
                value={land}
                onChange={(e) => setLand(e.target.value)}
                placeholder="bijv. Nederland, Curaçao, Cayman Islands…"
              />
              <LandRisicoAlert land={land} />
            </div>

            {/* KvK status waarschuwing */}
            {kvkWaarschuwing && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 font-medium">
                ⚠ {kvkWaarschuwing}
              </div>
            )}

            {/* SBI — auto-filled from KvK */}
            {sbiOmschrijving && (
              <div className="rounded-md bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-600">
                <span className="font-medium">Branche:</span> {sbiOmschrijving}
                {sbiCode && <span className="ml-1 text-gray-400">(SBI {sbiCode})</span>}
              </div>
            )}

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
