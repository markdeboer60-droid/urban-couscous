"use client";

/**
 * ResultCard — displays a single OSINT search result with
 * highlighted risk keywords and action buttons.
 */

import { ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionButtons } from "@/components/ActionButtons";
import { highlightRisicoWoorden } from "@/lib/highlight";

interface ResultCardProps {
  queryId: string;
  titel: string;
  url?: string | null;
  samenvatting: string;
  /** Extra badge shown on all results (e.g. ICIJ) */
  alwaysRed?: boolean;
  /** For GLEIF: highlight INACTIVE status */
  status?: string;
  onActionSaved?: () => void;
}

export function ResultCard({ queryId, titel, url, samenvatting, alwaysRed, status, onActionSaved }: ResultCardProps) {
  const highlightedSamenvatting = highlightRisicoWoorden(samenvatting);
  const isInactive = status === "INACTIVE";

  return (
    <Card className={alwaysRed || isInactive ? "border-red-400 bg-red-50" : ""}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-gray-900">{titel}</span>
            {alwaysRed && <Badge variant="destructive">ICIJ hit</Badge>}
            {isInactive && <Badge variant="destructive">INACTIVE</Badge>}
            {status && !isInactive && <Badge variant="secondary">{status}</Badge>}
          </div>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-700 flex-shrink-0"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
        {/* Highlighted summary — sanitized on server, using innerHTML is safe here */}
        <p
          className="text-sm text-gray-600 [&_mark]:bg-yellow-200 [&_mark]:px-0.5 [&_mark]:rounded"
          dangerouslySetInnerHTML={{ __html: highlightedSamenvatting }}
        />
        <ActionButtons
          queryId={queryId}
          hitTitel={titel}
          hitUrl={url}
          hitSamenvatting={samenvatting}
          onSaved={onActionSaved}
        />
      </CardContent>
    </Card>
  );
}
