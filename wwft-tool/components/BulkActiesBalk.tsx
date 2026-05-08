"use client";

import { useState } from "react";
import { X, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { ClientStatus, UserRole } from "@/types";

interface BulkActiesBalkProps {
  selectedIds: string[];
  userRol: UserRole;
  onDeselect: () => void;
  onComplete: (updatedIds: string[], newStatus: ClientStatus) => void;
}

export function BulkActiesBalk({ selectedIds, userRol, onDeselect, onComplete }: BulkActiesBalkProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<ClientStatus>("IN_BEHANDELING");
  const [loading, setLoading] = useState(false);

  const allowedStatuses: { value: ClientStatus; label: string }[] = [
    { value: "IN_BEHANDELING", label: "In behandeling" },
    { value: "TER_BEOORDELING", label: "Ter beoordeling" },
    ...(userRol === "PARTNER" ? [{ value: "AFGEROND" as ClientStatus, label: "Afgerond" }] : []),
  ];

  async function handleBulkUpdate() {
    setLoading(true);
    try {
      const res = await fetch("/api/clients/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientIds: selectedIds, status }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      toast({ title: `${data.updated} dossier${data.updated !== 1 ? "s" : ""} bijgewerkt` });
      onComplete(selectedIds, status);
    } catch (err: unknown) {
      toast({ title: "Fout", description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white rounded-xl px-4 py-3 shadow-2xl border border-gray-700">
      <CheckSquare className="h-4 w-4 text-blue-400 flex-shrink-0" />
      <span className="text-sm font-medium whitespace-nowrap">
        {selectedIds.length} geselecteerd
      </span>

      <div className="h-4 w-px bg-gray-600" />

      <Select value={status} onValueChange={(v) => setStatus(v as ClientStatus)}>
        <SelectTrigger className="w-44 h-8 bg-gray-800 border-gray-600 text-white text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {allowedStatuses.map((s) => (
            <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        size="sm"
        onClick={handleBulkUpdate}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-8"
      >
        {loading ? "Bijwerken…" : "Toepassen"}
      </Button>

      <button
        onClick={onDeselect}
        className="text-gray-400 hover:text-white transition-colors"
        title="Selectie wissen"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
