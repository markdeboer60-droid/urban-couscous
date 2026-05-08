"use client";

import { useState, useCallback } from "react";
import { Search, LogOut, Users, Shield, UserCircle, FileBarChart, CheckSquare, Square } from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClientCard } from "@/components/ClientCard";
import { NewClientDialog } from "@/components/NewClientDialog";
import { KpiCards } from "@/components/KpiCards";
import { MonitoringPanel } from "@/components/MonitoringPanel";
import { NotificatieBel } from "@/components/NotificatieBel";
import { GlobalZoek } from "@/components/GlobalZoek";
import { MijnTaken } from "@/components/MijnTaken";
import { BulkActiesBalk } from "@/components/BulkActiesBalk";
import type { Client, Review, ClientStatus, UserRole } from "@/types";

interface DashboardClientProps {
  clients: (Client & { reviews?: Review[] })[];
  userName: string;
  userRol: UserRole;
  userId: string;
}

const ROL_VARIANT: Record<UserRole, "default" | "secondary" | "warning"> = {
  PARTNER: "default",
  SENIOR: "warning",
  MEDEWERKER: "secondary",
};
const ROL_LABEL: Record<UserRole, string> = {
  PARTNER: "Partner",
  SENIOR: "Senior",
  MEDEWERKER: "Medewerker",
};

export function DashboardClient({ clients, userName, userRol }: DashboardClientProps) {
  const [zoek, setZoek] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClientStatus | "ALLE">("ALLE");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [localStatuses, setLocalStatuses] = useState<Record<string, ClientStatus>>({});

  const filtered = clients.filter((c) => {
    const matchZoek =
      !zoek ||
      c.naam.toLowerCase().includes(zoek.toLowerCase()) ||
      (c.kvkNummer ?? "").includes(zoek);
    const effectiveStatus = localStatuses[c.id] ?? c.status;
    const matchStatus = statusFilter === "ALLE" || effectiveStatus === statusFilter;
    return matchZoek && matchStatus;
  });

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((c) => c.id)));
    }
  }

  const handleBulkComplete = useCallback((ids: string[], newStatus: ClientStatus) => {
    setLocalStatuses((prev) => {
      const next = { ...prev };
      ids.forEach((id) => { next[id] = newStatus; });
      return next;
    });
    setSelectedIds(new Set());
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Shield className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-gray-900 hidden sm:block">Wwft Compliance</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <GlobalZoek />
            <Badge variant={ROL_VARIANT[userRol]}>{ROL_LABEL[userRol]}</Badge>
            <span className="text-sm text-gray-600 hidden md:block">{userName}</span>
            {(userRol === "PARTNER" || userRol === "SENIOR") && (
              <Link href="/rapport" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
                <FileBarChart className="h-4 w-4" /> Rapport
              </Link>
            )}
            {userRol === "PARTNER" && (
              <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
                <Users className="h-4 w-4" /> Beheer
              </Link>
            )}
            <Link href="/profiel" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
              <UserCircle className="h-4 w-4" /> Profiel
            </Link>
            <NotificatieBel />
            <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/login" })} className="flex items-center gap-1">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:block">Uitloggen</span>
            </Button>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Cliënten</h1>
          <NewClientDialog />
        </div>

        {/* KPI tiles */}
        <KpiCards />

        {/* Mijn taken */}
        <MijnTaken />

        {/* Monitoring alerts */}
        <div className="bg-white border rounded-lg p-4">
          <MonitoringPanel showRunButton />
        </div>

        {/* Filters row */}
        <div className="flex gap-3 flex-wrap items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Zoek op naam of KvK…"
              value={zoek}
              onChange={(e) => setZoek(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ClientStatus | "ALLE")}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Alle statussen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALLE">Alle statussen</SelectItem>
              <SelectItem value="GESTART">Gestart</SelectItem>
              <SelectItem value="IN_BEHANDELING">In behandeling</SelectItem>
              <SelectItem value="TER_BEOORDELING">Ter beoordeling</SelectItem>
              <SelectItem value="AFGEROND">Afgerond</SelectItem>
              <SelectItem value="BEEINDIGD">Beëindigd</SelectItem>
            </SelectContent>
          </Select>

          {/* Selecteer-modus toggle */}
          <Button
            variant={selectMode ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setSelectMode((v) => !v);
              setSelectedIds(new Set());
            }}
            className="flex items-center gap-1"
          >
            {selectMode ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
            {selectMode ? "Selecteren aan" : "Selecteren"}
          </Button>

          {selectMode && filtered.length > 0 && (
            <button
              onClick={toggleAll}
              className="text-sm text-blue-600 hover:text-blue-800 whitespace-nowrap"
            >
              {selectedIds.size === filtered.length ? "Alles deselecteren" : "Alles selecteren"}
            </button>
          )}
        </div>

        {/* Client grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Shield className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Geen cliënten gevonden</p>
            <p className="text-sm mt-1">Voeg een nieuwe cliënt toe om te beginnen.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((client) => {
              const effectiveStatus = (localStatuses[client.id] ?? client.status) as ClientStatus;
              const isSelected = selectedIds.has(client.id);
              return (
                <ClientCard
                  key={client.id}
                  client={{ ...client, status: effectiveStatus }}
                  selectMode={selectMode}
                  selected={isSelected}
                  onSelect={toggleSelect}
                />
              );
            })}
          </div>
        )}
      </main>

      {/* Bulk actions bar */}
      {selectMode && selectedIds.size > 0 && (
        <BulkActiesBalk
          selectedIds={Array.from(selectedIds)}
          userRol={userRol}
          onDeselect={() => setSelectedIds(new Set())}
          onComplete={handleBulkComplete}
        />
      )}
    </div>
  );
}
