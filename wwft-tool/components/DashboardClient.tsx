"use client";

/**
 * DashboardClient — client-side dashboard with KPI tiles, search/filter.
 */

import { useState } from "react";
import { Search, LogOut, Users, Shield, UserCircle } from "lucide-react";
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
import type { Client, Review, ClientStatus, UserRole } from "@/types";

interface DashboardClientProps {
  clients: (Client & { reviews?: Review[] })[];
  userName: string;
  userRol: UserRole;
}

export function DashboardClient({ clients, userName, userRol }: DashboardClientProps) {
  const [zoek, setZoek] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClientStatus | "ALLE">("ALLE");

  const filtered = clients.filter((c) => {
    const matchZoek =
      !zoek ||
      c.naam.toLowerCase().includes(zoek.toLowerCase()) ||
      (c.kvkNummer ?? "").includes(zoek);
    const matchStatus = statusFilter === "ALLE" || c.status === statusFilter;
    return matchZoek && matchStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-gray-900">Wwft Compliance</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={userRol === "PARTNER" ? "default" : "secondary"}>{userRol}</Badge>
            <span className="text-sm text-gray-600">{userName}</span>
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
              <LogOut className="h-4 w-4" /> Uitloggen
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

        {/* Monitoring alerts */}
        <div className="bg-white border rounded-lg p-4">
          <MonitoringPanel showRunButton />
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
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
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Alle statussen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALLE">Alle statussen</SelectItem>
              <SelectItem value="GESTART">Gestart</SelectItem>
              <SelectItem value="IN_BEHANDELING">In behandeling</SelectItem>
              <SelectItem value="AFGEROND">Afgerond</SelectItem>
              <SelectItem value="BEEINDIGD">Beëindigd</SelectItem>
            </SelectContent>
          </Select>
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
            {filtered.map((client) => (
              <ClientCard key={client.id} client={client} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
