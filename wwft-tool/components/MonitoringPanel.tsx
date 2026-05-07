"use client";

/**
 * MonitoringPanel — shows monitoring alerts for a client or across the organisation.
 * Also has a "Run screening" button that triggers /api/monitoring/run.
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle, RefreshCw, ShieldCheck, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Alert {
  id: string;
  clientId: string;
  type: string;
  bron: string;
  omschrijving: string;
  aangemaakt: string;
  opgelost: boolean;
  client?: { naam: string; id: string };
}

interface MonitoringPanelProps {
  /** If set, show alerts for this client only. Otherwise shows org-wide alerts. */
  clientId?: string;
  /** Whether to show the "Run all" button (only on dashboard). */
  showRunButton?: boolean;
}

const TYPE_CONFIG: Record<string, { label: string; variant: "destructive" | "warning"; icon: React.ReactNode }> = {
  SANCTIONS_HIT:   { label: "Sanctielijst hit",      variant: "destructive", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  KVK_FAILLIET:    { label: "Faillissement",          variant: "destructive", icon: <Building2 className="h-3.5 w-3.5" /> },
  KVK_INACTIEF:    { label: "Uitgeschreven KvK",      variant: "warning",     icon: <Building2 className="h-3.5 w-3.5" /> },
  KVK_WIJZIGING:   { label: "KvK-wijziging",          variant: "warning",     icon: <Building2 className="h-3.5 w-3.5" /> },
  RECHTSZAAK:      { label: "Rechtszaak gevonden",    variant: "warning",     icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  NEGATIEF_NIEUWS: { label: "Negatief nieuws",        variant: "warning",     icon: <AlertTriangle className="h-3.5 w-3.5" /> },
};

export function MonitoringPanel({ clientId, showRunButton }: MonitoringPanelProps) {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    const url = clientId ? `/api/monitoring?clientId=${clientId}` : "/api/monitoring";
    const data = await fetch(url).then((r) => r.json());
    setAlerts(Array.isArray(data) ? data : []);
    setLoaded(true);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  async function runScreening() {
    setRunning(true);
    try {
      const res = await fetch("/api/monitoring/run", { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error);
      const { screened, newAlerts } = await res.json();
      toast({
        title: "Screening voltooid",
        description: `${screened} cliënten gescreend, ${newAlerts} nieuwe melding${newAlerts !== 1 ? "en" : ""}`,
      });
      load();
    } catch (err: unknown) {
      toast({ title: "Screening mislukt", description: String(err), variant: "destructive" });
    } finally {
      setRunning(false);
    }
  }

  async function resolveAlert(alertId: string) {
    try {
      await fetch("/api/monitoring", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId }),
      });
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, opgelost: true } : a)));
      toast({ title: "Melding opgelost" });
    } catch {
      toast({ title: "Fout", variant: "destructive" });
    }
  }

  const open = alerts.filter((a) => !a.opgelost);
  const resolved = alerts.filter((a) => a.opgelost);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-700">Doorlopende monitoring</h3>
          {open.length > 0 && (
            <Badge variant="destructive" className="text-xs">{open.length} open</Badge>
          )}
        </div>
        {showRunButton && (
          <Button size="sm" variant="outline" onClick={runScreening} disabled={running} className="flex items-center gap-1 text-xs">
            <RefreshCw className={cn("h-3.5 w-3.5", running && "animate-spin")} />
            {running ? "Screenen…" : "Herscreen alle cliënten"}
          </Button>
        )}
      </div>

      {!loaded ? (
        <p className="text-sm text-gray-400">Laden…</p>
      ) : open.length === 0 && resolved.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
          <CheckCircle className="h-4 w-4" />
          Geen openstaande meldingen
        </div>
      ) : (
        <div className="space-y-2">
          {open.map((alert) => {
            const cfg = TYPE_CONFIG[alert.type] ?? { label: alert.type, variant: "warning" as const, icon: <AlertTriangle className="h-3.5 w-3.5" /> };
            return (
              <div key={alert.id} className="border border-red-200 bg-red-50 rounded p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={cfg.variant} className="flex items-center gap-1 text-xs">
                        {cfg.icon}{cfg.label}
                      </Badge>
                      <span className="text-xs text-gray-500">{alert.bron}</span>
                      {alert.client && (
                        <Link href={`/dossier/${alert.client.id}`} className="text-xs text-blue-600 hover:underline font-medium">
                          {alert.client.naam}
                        </Link>
                      )}
                    </div>
                    <p className="text-xs text-gray-700">{alert.omschrijving}</p>
                    <p className="text-xs text-gray-400">{new Date(alert.aangemaakt).toLocaleString("nl-NL")}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => resolveAlert(alert.id)} className="text-xs flex-shrink-0">
                    Oplossen
                  </Button>
                </div>
              </div>
            );
          })}
          {resolved.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-gray-400 hover:text-gray-600">{resolved.length} opgeloste melding{resolved.length !== 1 ? "en" : ""}</summary>
              <div className="mt-2 space-y-1">
                {resolved.map((alert) => (
                  <div key={alert.id} className="border rounded p-2 bg-gray-50 opacity-60 text-xs text-gray-500">
                    {alert.omschrijving}
                    {alert.client && <span className="ml-2 font-medium">{alert.client.naam}</span>}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
