"use client";

/**
 * KpiCards — dashboard statistics tiles fetched from /api/stats.
 */

import { useEffect, useState } from "react";
import { AlertTriangle, Clock, Users, FileWarning, Shield, ShieldAlert } from "lucide-react";

interface Stats {
  totalClients: number;
  perStatus: { GESTART: number; IN_BEHANDELING: number; AFGEROND: number; BEEINDIGD: number };
  perRisico: { LAAG: number; MIDDEN: number; HOOG: number };
  overdueReviews: number;
  upcomingReviews: number;
  openMeldingen: number;
  eddClients: number;
  pepDocuments: number;
}

interface Tile {
  label: string;
  value: number;
  sub?: string;
  icon: React.ReactNode;
  urgent?: boolean;
}

export function KpiCards() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {/* ignore */});
  }, []);

  if (!stats) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-20 rounded-lg border bg-white animate-pulse" />
        ))}
      </div>
    );
  }

  const tiles: Tile[] = [
    {
      label: "Totaal cliënten",
      value: stats.totalClients,
      sub: `${stats.perStatus.GESTART} gestart · ${stats.perStatus.IN_BEHANDELING} in behandeling`,
      icon: <Users className="h-5 w-5 text-blue-600" />,
    },
    {
      label: "Hoog risico",
      value: stats.perRisico.HOOG,
      sub: `${stats.perRisico.MIDDEN} midden · ${stats.perRisico.LAAG} laag`,
      icon: <ShieldAlert className="h-5 w-5 text-red-600" />,
      urgent: stats.perRisico.HOOG > 0,
    },
    {
      label: "Achterstallige reviews",
      value: stats.overdueReviews,
      sub: `${stats.upcomingReviews} binnen 60 dagen`,
      icon: <AlertTriangle className="h-5 w-5 text-orange-500" />,
      urgent: stats.overdueReviews > 0,
    },
    {
      label: "Reviews komende 60d",
      value: stats.upcomingReviews,
      sub: "gepland",
      icon: <Clock className="h-5 w-5 text-yellow-600" />,
    },
    {
      label: "Open FIU-meldingen",
      value: stats.openMeldingen,
      sub: "wachten op goedkeuring",
      icon: <FileWarning className="h-5 w-5 text-red-600" />,
      urgent: stats.openMeldingen > 0,
    },
    {
      label: "EDD-cliënten",
      value: stats.eddClients,
      sub: "verscherpt onderzoek",
      icon: <Shield className="h-5 w-5 text-purple-600" />,
    },
    {
      label: "PEP-betrokkenen",
      value: stats.pepDocuments,
      sub: "politiek prominent persoon",
      icon: <ShieldAlert className="h-5 w-5 text-purple-600" />,
      urgent: stats.pepDocuments > 0,
    },
    {
      label: "Afgerond",
      value: stats.perStatus.AFGEROND,
      sub: `${stats.perStatus.BEEINDIGD} beëindigd`,
      icon: <Users className="h-5 w-5 text-green-600" />,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className={`rounded-lg border bg-white p-4 space-y-1 ${
            tile.urgent ? "border-red-300 bg-red-50" : "border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between">
            {tile.icon}
            <span className={`text-2xl font-bold ${tile.urgent ? "text-red-700" : "text-gray-900"}`}>
              {tile.value}
            </span>
          </div>
          <p className={`text-xs font-medium ${tile.urgent ? "text-red-700" : "text-gray-700"}`}>
            {tile.label}
          </p>
          {tile.sub && <p className="text-xs text-gray-400">{tile.sub}</p>}
        </div>
      ))}
    </div>
  );
}
