"use client";

import { useState } from "react";
import { CheckCircle, RotateCcw, Send, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { Client, UserRole } from "@/types";
import { cn } from "@/lib/utils";

interface InterneReviewPanelProps {
  client: Pick<Client,
    "id" | "status" | "terBeoordelingOp" | "interneReviewOp" |
    "interneReviewStatus" | "interneReviewNotitie" |
    "terBeoordelingUser" | "interneReviewUser"
  >;
  currentUserRol: UserRole;
  onUpdate: (patch: Partial<Client>) => void;
}

export function InterneReviewPanel({ client, currentUserRol, onUpdate }: InterneReviewPanelProps) {
  const { toast } = useToast();
  const [notitie, setNotitie] = useState("");
  const [loading, setLoading] = useState(false);

  const canIndienen = currentUserRol === "MEDEWERKER" && client.status === "IN_BEHANDELING";
  const canReview = (currentUserRol === "SENIOR" || currentUserRol === "PARTNER") && client.status === "TER_BEOORDELING";
  const isTermBeoordeling = client.status === "TER_BEOORDELING";

  async function handleIndienen() {
    setLoading(true);
    try {
      const res = await fetch("/api/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: client.id, indienen: true }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const updated = await res.json();
      onUpdate(updated);
      toast({ title: "Dossier ingediend ter beoordeling" });
    } catch (err: unknown) {
      toast({ title: "Fout", description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleReview(status: "GOEDGEKEURD" | "TERUGGESTUURD") {
    setLoading(true);
    try {
      const res = await fetch("/api/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: client.id,
          interneReview: true,
          interneReviewStatus: status,
          interneReviewNotitie: notitie.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const updated = await res.json();
      onUpdate(updated);
      setNotitie("");
      toast({
        title: status === "GOEDGEKEURD" ? "Intern goedgekeurd" : "Teruggestuurd naar medewerker",
      });
    } catch (err: unknown) {
      toast({ title: "Fout", description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border rounded-lg p-4 space-y-3">
      <h2 className="text-base font-semibold">Interne beoordeling</h2>

      {/* Current state indicator */}
      <div className="flex items-center gap-2 flex-wrap">
        {isTermBeoordeling && (
          <Badge variant="outline" className="flex items-center gap-1 border-amber-400 text-amber-700 bg-amber-50">
            <Clock className="h-3 w-3" /> Ter beoordeling
          </Badge>
        )}
        {client.interneReviewStatus === "GOEDGEKEURD" && (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" /> Intern goedgekeurd
          </Badge>
        )}
        {client.interneReviewStatus === "TERUGGESTUURD" && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <RotateCcw className="h-3 w-3" /> Teruggestuurd
          </Badge>
        )}
      </div>

      {/* Timeline */}
      {(client.terBeoordelingOp || client.interneReviewOp) && (
        <div className="text-xs text-gray-500 space-y-1">
          {client.terBeoordelingOp && (
            <p>
              Ingediend op{" "}
              {new Date(client.terBeoordelingOp).toLocaleString("nl-NL")}
              {client.terBeoordelingUser && <> door {client.terBeoordelingUser.naam}</>}
            </p>
          )}
          {client.interneReviewOp && (
            <p>
              Beoordeeld op{" "}
              {new Date(client.interneReviewOp).toLocaleString("nl-NL")}
              {client.interneReviewUser && <> door {client.interneReviewUser.naam}</>}
            </p>
          )}
        </div>
      )}

      {/* Reviewer feedback */}
      {client.interneReviewNotitie && (
        <div className={cn(
          "rounded border p-3 text-sm",
          client.interneReviewStatus === "TERUGGESTUURD"
            ? "border-red-200 bg-red-50 text-red-800"
            : "border-green-200 bg-green-50 text-green-800"
        )}>
          <p className="font-medium mb-0.5">
            {client.interneReviewStatus === "TERUGGESTUURD" ? "Reden terugsturen:" : "Opmerking reviewer:"}
          </p>
          <p>{client.interneReviewNotitie}</p>
        </div>
      )}

      {/* Medewerker: submit button */}
      {canIndienen && (
        <Button
          size="sm"
          onClick={handleIndienen}
          disabled={loading}
          className="flex items-center gap-1"
        >
          <Send className="h-3.5 w-3.5" />
          Indienen ter beoordeling
        </Button>
      )}

      {/* SENIOR / PARTNER: review actions */}
      {canReview && (
        <div className="space-y-2">
          <Textarea
            placeholder="Notitie bij beoordeling (optioneel)…"
            value={notitie}
            onChange={(e) => setNotitie(e.target.value)}
            rows={3}
            className="text-sm"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => handleReview("GOEDGEKEURD")}
              disabled={loading}
              className="flex items-center gap-1"
            >
              <CheckCircle className="h-3.5 w-3.5" /> Goedkeuren
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleReview("TERUGGESTUURD")}
              disabled={loading}
              className="flex items-center gap-1 text-red-700 border-red-300 hover:bg-red-50"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Terugsturen
            </Button>
          </div>
        </div>
      )}

      {/* Neutral state: no action available */}
      {!canIndienen && !canReview && !isTermBeoordeling && !client.interneReviewStatus && (
        <p className="text-sm text-gray-400">
          Nog niet ingediend voor interne beoordeling.
        </p>
      )}
    </div>
  );
}
