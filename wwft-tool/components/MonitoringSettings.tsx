"use client";

/**
 * MonitoringSettings — beheerders-UI voor het instellen van de automatische screeningplanning.
 * Toont alleen voor PARTNER-gebruikers op de admin-pagina.
 */

import { useState, useEffect } from "react";
import { Calendar, Clock, Mail, Bell, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface Settings {
  monitoringFrequentie: string;
  monitoringTijdstip: string;
  monitoringDagVanWeek: number;
  emailNotificaties: boolean;
  appNotificaties: boolean;
  volgendeMonitoringRun?: string | null;
}

const TIJDSTIPPEN = ["06:00", "07:00", "08:00", "09:00", "10:00", "18:00", "20:00", "22:00"];
const DAGEN = [
  { value: 1, label: "Maandag" },
  { value: 2, label: "Dinsdag" },
  { value: 3, label: "Woensdag" },
  { value: 4, label: "Donderdag" },
  { value: 5, label: "Vrijdag" },
  { value: 6, label: "Zaterdag" },
  { value: 7, label: "Zondag" },
];

export function MonitoringSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings>({
    monitoringFrequentie: "WEKELIJKS",
    monitoringTijdstip: "08:00",
    monitoringDagVanWeek: 1,
    emailNotificaties: true,
    appNotificaties: true,
  });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/monitoring-settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings(data);
        setLoaded(true);
      });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/monitoring-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const updated: Settings = await res.json();
      setSettings(updated);
      toast({
        title: "Instellingen opgeslagen",
        description: updated.volgendeMonitoringRun
          ? `Volgende screening: ${new Date(updated.volgendeMonitoringRun).toLocaleString("nl-NL", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}`
          : "",
      });
    } catch (err: unknown) {
      toast({ title: "Fout", description: String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return <p className="text-sm text-gray-400">Laden…</p>;

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <Calendar className="h-4 w-4 text-blue-600" />
        Automatische monitoring
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {/* Frequentie */}
        <div className="space-y-1">
          <Label className="text-xs">Frequentie</Label>
          <Select
            value={settings.monitoringFrequentie}
            onValueChange={(v) => setSettings((s) => ({ ...s, monitoringFrequentie: v }))}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="DAGELIJKS">Dagelijks</SelectItem>
              <SelectItem value="WEKELIJKS">Wekelijks</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tijdstip */}
        <div className="space-y-1">
          <Label className="text-xs flex items-center gap-1"><Clock className="h-3 w-3" /> Tijdstip (UTC)</Label>
          <Select
            value={settings.monitoringTijdstip}
            onValueChange={(v) => setSettings((s) => ({ ...s, monitoringTijdstip: v }))}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIJDSTIPPEN.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Dag van de week (alleen bij wekelijks) */}
        {settings.monitoringFrequentie === "WEKELIJKS" && (
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Dag van de week</Label>
            <Select
              value={String(settings.monitoringDagVanWeek)}
              onValueChange={(v) => setSettings((s) => ({ ...s, monitoringDagVanWeek: Number(v) }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DAGEN.map((d) => <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Notificatievoorkeuren */}
      <div className="border rounded-md p-3 space-y-2 bg-gray-50">
        <p className="text-xs font-medium text-gray-600">Meldingskanalen bij nieuwe hits</p>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.emailNotificaties}
            onChange={(e) => setSettings((s) => ({ ...s, emailNotificaties: e.target.checked }))}
            className="h-4 w-4 accent-blue-600"
          />
          <Mail className="h-3.5 w-3.5 text-gray-500" />
          <span className="text-xs">E-mailmelding naar alle partners</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.appNotificaties}
            onChange={(e) => setSettings((s) => ({ ...s, appNotificaties: e.target.checked }))}
            className="h-4 w-4 accent-blue-600"
          />
          <Bell className="h-3.5 w-3.5 text-gray-500" />
          <span className="text-xs">In-app notificatie (belletje)</span>
        </label>
      </div>

      {settings.volgendeMonitoringRun && (
        <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded p-2">
          <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
          Volgende automatische screening:{" "}
          <strong>
            {new Date(settings.volgendeMonitoringRun).toLocaleString("nl-NL", {
              weekday: "long",
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </strong>
        </div>
      )}

      <div className="flex items-start gap-2 text-xs text-gray-400 bg-gray-50 rounded p-2 border">
        <span>
          Alle screening gebeurt met gratis bronnen: OpenSanctions (sanctielijsten), KvK OpenData (wijzigingen/faillissement),
          Faillissementsdossier.nl (insolventieregister) en Rechtspraak.nl (uitspraken). Geen betaalde API-sleutels vereist.
        </span>
      </div>

      <Button type="submit" size="sm" disabled={saving}>
        {saving ? "Opslaan…" : "Instellingen opslaan"}
      </Button>
    </form>
  );
}
