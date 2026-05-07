"use client";

import { useState, useEffect } from "react";
import { History, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AuditEntry {
  id: string;
  actie: string;
  details: string | null;
  aangemaakt: string;
  user: { naam: string; rol: string };
}

const ACTIE_CONFIG: Record<string, { label: string; color: string }> = {
  STATUS_GEWIJZIGD:  { label: "Status gewijzigd",   color: "bg-blue-100 text-blue-800" },
  RISICO_GEWIJZIGD:  { label: "Risico gewijzigd",    color: "bg-orange-100 text-orange-800" },
  GOEDGEKEURD:       { label: "Goedgekeurd",          color: "bg-green-100 text-green-800" },
  BEEINDIGD:         { label: "Beëindigd",            color: "bg-red-100 text-red-800" },
  REVIEW_VOLTOOID:   { label: "Review voltooid",      color: "bg-purple-100 text-purple-800" },
  EDD_GOEDGEKEURD:   { label: "EDD goedgekeurd",      color: "bg-purple-100 text-purple-800" },
};

function Details({ raw }: { raw: string | null }) {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as Record<string, string>;
    const parts: string[] = [];
    if (d.oud !== undefined && d.nieuw !== undefined) parts.push(`${d.oud} → ${d.nieuw}`);
    else if (d.reden) parts.push(d.reden);
    else if (d.risicoOordeelNa) parts.push(`Risico na: ${d.risicoOordeelNa}`);
    return parts.length ? <span className="text-gray-500">{parts.join(" · ")}</span> : null;
  } catch {
    return null;
  }
}

export function AuditLogPanel({ clientId }: { clientId: string }) {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open || loaded) return;
    fetch(`/api/audit?clientId=${clientId}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setLogs(data); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [open, loaded, clientId]);

  return (
    <div className="bg-white border rounded-lg">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
      >
        <span className="flex items-center gap-2">
          <History className="h-4 w-4 text-gray-400" />
          Auditlog
          {logs.length > 0 && (
            <span className="text-xs text-gray-400 font-normal">({logs.length} entries)</span>
          )}
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4">
          {!loaded ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3].map((i) => <div key={i} className="h-8 bg-gray-100 rounded" />)}
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-gray-400">Geen activiteit gelogd.</p>
          ) : (
            <ol className="relative border-l border-gray-200 space-y-4 ml-2">
              {logs.map((entry) => {
                const cfg = ACTIE_CONFIG[entry.actie] ?? { label: entry.actie, color: "bg-gray-100 text-gray-700" };
                return (
                  <li key={entry.id} className="ml-4">
                    <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-gray-300" />
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className={cn("rounded px-1.5 py-0.5 font-medium", cfg.color)}>{cfg.label}</span>
                      <Details raw={entry.details} />
                      <span className="text-gray-400 ml-auto">
                        {entry.user.naam}
                        {entry.user.rol === "PARTNER" && <span className="ml-1 text-[10px] text-gray-400">(partner)</span>}
                        {" · "}
                        {new Date(entry.aangemaakt).toLocaleString("nl-NL", {
                          day: "numeric", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
