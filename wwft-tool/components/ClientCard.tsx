"use client";

/**
 * ClientCard — shows a client summary with status, risk, and review badges.
 */

import Link from "next/link";
import { Building2, Calendar, AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Client, Review } from "@/types";

interface ClientCardProps {
  client: Client & { reviews?: Review[] };
}

/** Map ClientStatus to a human-readable label */
const STATUS_LABEL: Record<string, string> = {
  GESTART: "Gestart",
  IN_BEHANDELING: "In behandeling",
  AFGEROND: "Afgerond",
};

const STATUS_VARIANT: Record<string, "default" | "warning" | "success" | "secondary"> = {
  GESTART: "secondary",
  IN_BEHANDELING: "warning",
  AFGEROND: "success",
};

const RISICO_VARIANT: Record<string, "laag" | "midden" | "hoog"> = {
  LAAG: "laag",
  MIDDEN: "midden",
  HOOG: "hoog",
};

function reviewBadge(reviews: Review[] | undefined) {
  if (!reviews || reviews.length === 0) return null;
  const next = reviews[0];
  const now = new Date();
  const due = new Date(next.volgendeReviewOp);
  const msLeft = due.getTime() - now.getTime();
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Review achterstallig</Badge>;
  }
  if (daysLeft <= 60) {
    return <Badge variant="warning" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Review over {daysLeft}d</Badge>;
  }
  return null;
}

export function ClientCard({ client }: ClientCardProps) {
  const badge = reviewBadge(client.reviews);

  return (
    <Link href={`/dossier/${client.id}`} className="block hover:no-underline">
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-snug">{client.naam}</CardTitle>
            <Badge variant={STATUS_VARIANT[client.status] ?? "secondary"}>
              {STATUS_LABEL[client.status]}
            </Badge>
          </div>
          {client.kvkNummer && (
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Building2 className="h-3 w-3" /> KvK {client.kvkNummer}
            </p>
          )}
        </CardHeader>
        <CardContent className="pb-2">
          <div className="flex flex-wrap gap-2">
            {client.risicoOordeel && (
              <Badge variant={RISICO_VARIANT[client.risicoOordeel]}>
                Risico: {client.risicoOordeel}
              </Badge>
            )}
            {badge}
          </div>
        </CardContent>
        <CardFooter className="text-xs text-gray-400 flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Aangemaakt {new Date(client.aangemaakt).toLocaleDateString("nl-NL")}
          {client.aanmaker && <span>door {client.aanmaker.naam}</span>}
        </CardFooter>
      </Card>
    </Link>
  );
}
