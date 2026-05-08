"use client";

import Link from "next/link";
import { Building2, Calendar, AlertTriangle, Globe, CheckSquare, Square } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { checkLandRisico } from "@/lib/fatf";
import { cn } from "@/lib/utils";
import type { Client, ClientType, Review } from "@/types";

interface ClientCardProps {
  client: Client & { reviews?: Review[] };
  selectMode?: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
}

const STATUS_LABEL: Record<string, string> = {
  GESTART: "Gestart",
  IN_BEHANDELING: "In behandeling",
  TER_BEOORDELING: "Ter beoordeling",
  AFGEROND: "Afgerond",
  BEEINDIGD: "Beëindigd",
};

const STATUS_VARIANT: Record<string, "default" | "warning" | "success" | "secondary" | "destructive"> = {
  GESTART: "secondary",
  IN_BEHANDELING: "warning",
  TER_BEOORDELING: "warning",
  AFGEROND: "success",
  BEEINDIGD: "destructive",
};

const RISICO_VARIANT: Record<string, "laag" | "midden" | "hoog"> = {
  LAAG: "laag", MIDDEN: "midden", HOOG: "hoog",
};

const CLIENT_TYPE_LABEL: Record<ClientType, string> = {
  RECHTSPERSOON: "Rechtspersoon",
  PRIVEPERSOON: "Privépersoon",
  TRUST: "Trust",
  STICHTING: "Stichting",
};

function reviewBadge(reviews: Review[] | undefined) {
  if (!reviews || reviews.length === 0) return null;
  const sorted = [...reviews].sort(
    (a, b) => new Date(a.volgendeReviewOp).getTime() - new Date(b.volgendeReviewOp).getTime()
  );
  const next = sorted[0];
  const daysLeft = Math.ceil((new Date(next.volgendeReviewOp).getTime() - Date.now()) / 86_400_000);
  if (daysLeft < 0) {
    return <Badge variant="destructive" className="flex items-center gap-1 text-xs"><AlertTriangle className="h-3 w-3" />Review achterstallig</Badge>;
  }
  if (daysLeft <= 60) {
    return <Badge variant="warning" className="flex items-center gap-1 text-xs"><AlertTriangle className="h-3 w-3" />Review over {daysLeft}d</Badge>;
  }
  return null;
}

const LAND_RISICO_VARIANT: Record<string, "destructive" | "warning" | "secondary"> = {
  ZWART: "destructive", GRIJS: "warning", EU_HOOG: "warning",
};
const LAND_RISICO_LABEL: Record<string, string> = {
  ZWART: "FATF zwart", GRIJS: "FATF grijs", EU_HOOG: "EU hoog risico",
};

export function ClientCard({ client, selectMode, selected, onSelect }: ClientCardProps) {
  const badge = reviewBadge(client.reviews);
  const landRisico = client.land ? checkLandRisico(client.land) : null;

  const cardContent = (
    <Card
      className={cn(
        "hover:shadow-md transition-shadow",
        selectMode && "cursor-pointer",
        selected && "ring-2 ring-blue-500 border-blue-400"
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {selectMode && (
              <span className="text-blue-600 flex-shrink-0">
                {selected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4 text-gray-300" />}
              </span>
            )}
            <CardTitle className="text-base leading-snug truncate">{client.naam}</CardTitle>
          </div>
          <Badge variant={STATUS_VARIANT[client.status] ?? "secondary"} className="flex-shrink-0 text-xs">
            {STATUS_LABEL[client.status]}
          </Badge>
        </div>
        {client.kvkNummer && (
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Building2 className="h-3 w-3" /> KvK {client.kvkNummer}
            {client.rechtsvorm && <span className="text-gray-400">· {client.rechtsvorm}</span>}
          </p>
        )}
        {client.land && (
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Globe className="h-3 w-3" /> {client.land}
          </p>
        )}
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex flex-wrap gap-2">
          {client.clientType && client.clientType !== "RECHTSPERSOON" && (
            <Badge variant="secondary" className="text-xs">{CLIENT_TYPE_LABEL[client.clientType as ClientType]}</Badge>
          )}
          {client.risicoOordeel && (
            <Badge variant={RISICO_VARIANT[client.risicoOordeel]}>Risico: {client.risicoOordeel}</Badge>
          )}
          {landRisico && landRisico.niveau !== "GEEN" && (
            <Badge variant={LAND_RISICO_VARIANT[landRisico.niveau]} className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {LAND_RISICO_LABEL[landRisico.niveau]}
            </Badge>
          )}
          {badge}
        </div>
      </CardContent>
      <CardFooter className="text-xs text-gray-400 flex items-center gap-1">
        <Calendar className="h-3 w-3" />
        {new Date(client.aangemaakt).toLocaleDateString("nl-NL")}
        {client.aanmaker && <span className="ml-1">· {client.aanmaker.naam}</span>}
      </CardFooter>
    </Card>
  );

  if (selectMode) {
    return (
      <div onClick={() => onSelect?.(client.id)} role="checkbox" aria-checked={selected}>
        {cardContent}
      </div>
    );
  }

  return (
    <Link href={`/dossier/${client.id}`} className="block hover:no-underline">
      {cardContent}
    </Link>
  );
}
