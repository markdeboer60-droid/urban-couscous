"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ClipboardList, AlertTriangle, RotateCcw, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface OpenDossier {
  id: string;
  naam: string;
  status: string;
  risicoOordeel: string | null;
  aangemaakt: string;
}

interface Teruggestuurd {
  id: string;
  naam: string;
  interneReviewNotitie: string | null;
  interneReviewOp: string | null;
}

interface AchterstalligeReview {
  id: string;
  volgendeReviewOp: string;
  status: string;
  client: { id: string; naam: string };
}

interface TakenData {
  openDossiers: OpenDossier[];
  teruggestuurd: Teruggestuurd[];
  achterstalligeReviews: AchterstalligeReview[];
}

const RISICO_VARIANT: Record<string, "laag" | "midden" | "hoog"> = {
  LAAG: "laag", MIDDEN: "midden", HOOG: "hoog",
};

export function MijnTaken() {
  const [data, setData] = useState<TakenData | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    fetch("/api/taken")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {/* non-critical */});
  }, []);

  const totalCount = data
    ? data.teruggestuurd.length + data.achterstalligeReviews.length
    : 0;

  if (!data) return null;
  if (
    data.openDossiers.length === 0 &&
    data.teruggestuurd.length === 0 &&
    data.achterstalligeReviews.length === 0
  ) {
    return null;
  }

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-blue-600" />
          <span className="font-semibold text-sm text-gray-900">Mijn taken</span>
          {totalCount > 0 && (
            <Badge variant="destructive" className="text-xs h-5 px-1.5">{totalCount}</Badge>
          )}
        </div>
        {collapsed ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronUp className="h-4 w-4 text-gray-400" />}
      </button>

      {!collapsed && (
        <div className="border-t divide-y divide-gray-100">
          {/* Teruggestuurd */}
          {data.teruggestuurd.length > 0 && (
            <div className="px-4 py-3 space-y-2">
              <p className="text-xs font-semibold text-red-700 flex items-center gap-1">
                <RotateCcw className="h-3 w-3" /> Teruggestuurd na beoordeling ({data.teruggestuurd.length})
              </p>
              {data.teruggestuurd.map((d) => (
                <Link
                  key={d.id}
                  href={`/dossier/${d.id}`}
                  className="flex items-start justify-between gap-2 rounded p-2 hover:bg-red-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{d.naam}</p>
                    {d.interneReviewNotitie && (
                      <p className="text-xs text-red-600 mt-0.5 line-clamp-1">{d.interneReviewNotitie}</p>
                    )}
                  </div>
                  <Badge variant="destructive" className="text-xs flex-shrink-0">Teruggestuurd</Badge>
                </Link>
              ))}
            </div>
          )}

          {/* Achterstallige reviews */}
          {data.achterstalligeReviews.length > 0 && (
            <div className="px-4 py-3 space-y-2">
              <p className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Reviews binnenkort / achterstallig ({data.achterstalligeReviews.length})
              </p>
              {data.achterstalligeReviews.map((r) => {
                const due = new Date(r.volgendeReviewOp);
                const daysLeft = Math.ceil((due.getTime() - Date.now()) / 86_400_000);
                const isOverdue = daysLeft < 0;
                return (
                  <Link
                    key={r.id}
                    href={`/dossier/${r.client.id}`}
                    className="flex items-center justify-between gap-2 rounded p-2 hover:bg-amber-50 transition-colors"
                  >
                    <p className="text-sm text-gray-900">{r.client.naam}</p>
                    <Badge variant={isOverdue ? "destructive" : "warning"} className="text-xs flex-shrink-0">
                      {isOverdue ? `${Math.abs(daysLeft)}d te laat` : `${daysLeft}d`}
                    </Badge>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Open dossiers */}
          {data.openDossiers.length > 0 && (
            <div className="px-4 py-3 space-y-1">
              <p className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Mijn open dossiers ({data.openDossiers.length})
              </p>
              {data.openDossiers.map((d) => (
                <Link
                  key={d.id}
                  href={`/dossier/${d.id}`}
                  className="flex items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-gray-50 transition-colors"
                >
                  <p className="text-sm text-gray-800">{d.naam}</p>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {d.risicoOordeel && (
                      <Badge variant={RISICO_VARIANT[d.risicoOordeel]} className="text-xs">{d.risicoOordeel}</Badge>
                    )}
                    <Badge variant="warning" className="text-xs">
                      {d.status === "GESTART" ? "Gestart" : "In behandeling"}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
