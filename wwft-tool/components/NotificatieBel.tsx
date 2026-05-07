"use client";

/**
 * NotificatieBel — notificatiepictogram in de navigatiebalk.
 * Pollt elke 30 seconden voor ongelezen berichten.
 * Klik opent een dropdown met de laatste notificaties.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Bell, BellRing, CheckCheck, AlertTriangle, ShieldAlert, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Notificatie {
  id: string;
  type: string;
  titel: string;
  bericht: string;
  clientId?: string | null;
  gelezen: boolean;
  aangemaakt: string;
  client?: { naam: string } | null;
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  MONITORING_ALERT: <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />,
  REVIEW_DUE: <Clock className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" />,
  HOOG_RISICO: <ShieldAlert className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />,
};

export function NotificatieBel() {
  const [notificaties, setNotificaties] = useState<Notificatie[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotificaties = useCallback(async () => {
    try {
      const data = await fetch("/api/notificaties?unreadOnly=false").then((r) => r.json());
      if (Array.isArray(data)) setNotificaties(data.slice(0, 20));
    } catch {
      // silently ignore network errors
    }
  }, []);

  // Initial load + polling every 30s
  useEffect(() => {
    fetchNotificaties();
    const id = setInterval(fetchNotificaties, 30_000);
    return () => clearInterval(id);
  }, [fetchNotificaties]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const ongelezen = notificaties.filter((n) => !n.gelezen).length;

  async function markAllRead() {
    await fetch("/api/notificaties", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setNotificaties((prev) => prev.map((n) => ({ ...n, gelezen: true })));
  }

  async function markRead(id: string) {
    await fetch("/api/notificaties", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificatieId: id }),
    });
    setNotificaties((prev) => prev.map((n) => (n.id === id ? { ...n, gelezen: true } : n)));
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-1.5 rounded-md hover:bg-gray-100 transition-colors"
        aria-label="Notificaties"
      >
        {ongelezen > 0 ? (
          <BellRing className="h-5 w-5 text-gray-600" />
        ) : (
          <Bell className="h-5 w-5 text-gray-400" />
        )}
        {ongelezen > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {ongelezen > 9 ? "9+" : ongelezen}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-50 w-80 rounded-lg border bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-sm font-semibold text-gray-800">
              Notificaties {ongelezen > 0 && <Badge variant="destructive" className="ml-1 text-xs">{ongelezen}</Badge>}
            </span>
            {ongelezen > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Alle gelezen
              </button>
            )}
          </div>

          {/* Notificatielijst */}
          <div className="max-h-80 overflow-y-auto divide-y">
            {notificaties.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-400">Geen notificaties</p>
            ) : (
              notificaties.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "px-3 py-2.5 hover:bg-gray-50 transition-colors",
                    !n.gelezen && "bg-blue-50 hover:bg-blue-50/80"
                  )}
                  onClick={() => !n.gelezen && markRead(n.id)}
                >
                  <div className="flex items-start gap-2">
                    {TYPE_ICON[n.type] ?? <Bell className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs font-medium text-gray-800 leading-tight", !n.gelezen && "text-blue-900")}>
                        {n.titel}
                      </p>
                      {n.client && (
                        <p className="text-[10px] text-gray-500 mt-0.5">{n.client.naam}</p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(n.aangemaakt).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {n.clientId && (
                      <Link
                        href={`/dossier/${n.clientId}`}
                        className="text-[10px] text-blue-600 hover:underline flex-shrink-0"
                        onClick={() => setOpen(false)}
                      >
                        Open
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notificaties.length > 0 && (
            <div className="border-t px-3 py-2 text-center">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs w-full text-gray-500"
                onClick={() => setOpen(false)}
              >
                Sluiten
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
