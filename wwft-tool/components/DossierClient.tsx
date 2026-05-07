"use client";

/**
 * DossierClient — full client dossier with tabbed OSINT search,
 * review panel, meldingen overview, and approval flow.
 */

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Download, FileWarning, Shield, CheckCircle, Clock, FileCode, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusStepper } from "@/components/StatusStepper";
import { ReviewPanel } from "@/components/ReviewPanel";
import { ResultCard } from "@/components/ResultCard";
import { BeeindigingDialog } from "@/components/BeeindigingDialog";
import { LandRisicoAlert } from "@/components/LandRisicoAlert";
import { MonitoringPanel } from "@/components/MonitoringPanel";
import { UboStructuurEditor } from "@/components/UboStructuurEditor";
import { OpmerkingThread } from "@/components/OpmerkingThread";
import { AuditLogPanel } from "@/components/AuditLogPanel";
import { useToast } from "@/hooks/use-toast";
import type { Client, ClientStatus, UserRole, OpenSanctionsHit, WebSearchHit, GleifHit, IcijHit, Melding } from "@/types";
import { cn } from "@/lib/utils";

interface NieuwsHit { titel: string; url: string; samenvatting: string; }

interface DossierClientProps {
  client: Client & {
    aanmaker?: { naam: string } | null;
    goedgekeurdeUser?: { naam: string } | null;
  };
  currentUser: { id: string; naam: string; rol: UserRole };
}

export function DossierClient({ client: initialClient, currentUser }: DossierClientProps) {
  const { toast } = useToast();
  const [client, setClient] = useState(initialClient);
  const [zoekNaam, setZoekNaam] = useState(initialClient.naam);
  const [loadingSource, setLoadingSource] = useState<string | null>(null);

  // OSINT results
  const [opensanctionsHits, setOpensanctionsHits] = useState<(OpenSanctionsHit & { queryId: string })[]>([]);
  const [webHits, setWebHits] = useState<(WebSearchHit & { queryId: string })[]>([]);
  const [gleifHits, setGleifHits] = useState<(GleifHit & { queryId: string })[]>([]);
  const [icijHits, setIcijHits] = useState<(IcijHit & { queryId: string })[]>([]);
  const [webIsMock, setWebIsMock] = useState(false);

  const isReadOnly = client.status === "AFGEROND" || client.status === "BEEINDIGD";
  const [activeTab, setActiveTab] = useState<"osint" | "nieuws" | "ubo" | "monitoring">("osint");
  const [nieuwsHits, setNieuwsHits] = useState<NieuwsHit[]>([]);
  const [nieuwsLoading, setNieuwsLoading] = useState(false);

  async function search(source: string) {
    if (!zoekNaam.trim()) return;
    setLoadingSource(source);
    try {
      const res = await fetch(`/api/search/${source}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naam: zoekNaam.trim(), clientId: client.id }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      const qId = data.queryId;

      if (source === "opensanctions") {
        setOpensanctionsHits(data.hits.map((h: OpenSanctionsHit) => ({ ...h, queryId: qId })));
      } else if (source === "web") {
        setWebHits(data.hits.map((h: WebSearchHit) => ({ ...h, queryId: qId })));
        setWebIsMock(data.isMock);
      } else if (source === "gleif") {
        setGleifHits(data.hits.map((h: GleifHit) => ({ ...h, queryId: qId })));
      } else if (source === "icij") {
        setIcijHits(data.hits.map((h: IcijHit) => ({ ...h, queryId: qId })));
      }
    } catch (err: unknown) {
      toast({ title: "Zoekfout", description: String(err), variant: "destructive" });
    } finally {
      setLoadingSource(null);
    }
  }

  async function searchAll() {
    for (const src of ["opensanctions", "web", "gleif", "icij"]) {
      await search(src);
    }
  }

  async function searchNieuws() {
    if (!zoekNaam.trim()) return;
    setNieuwsLoading(true);
    try {
      const res = await fetch("/api/search/nieuws", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naam: zoekNaam.trim(), clientId: client.id }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      setNieuwsHits(data.hits ?? []);
    } catch (err: unknown) {
      toast({ title: "Nieuwszoekopdracht mislukt", description: String(err), variant: "destructive" });
    } finally {
      setNieuwsLoading(false);
    }
  }

  async function handleApprove() {
    try {
      const res = await fetch("/api/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: client.id, goedkeuren: true }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const updated = await res.json();
      setClient((c) => ({ ...c, ...updated, goedgekeurdOp: updated.goedgekeurdOp ?? null }));
      toast({ title: "Dossier goedgekeurd en afgesloten" });
    } catch (err: unknown) {
      toast({ title: "Fout", description: String(err), variant: "destructive" });
    }
  }

  function handleStatusUpdate(status: ClientStatus) {
    setClient((c) => ({ ...c, status }));
  }

  const risicoVariant = client.risicoOordeel === "LAAG" ? "laag" : client.risicoOordeel === "MIDDEN" ? "midden" : "hoog";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <Link href="/" className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-lg font-bold text-gray-900">{client.naam}</h1>
            {client.kvkNummer && <span className="text-sm text-gray-500">KvK {client.kvkNummer}</span>}
            {(client as Client & { land?: string }).land && (
              <span className="text-sm text-gray-500">{(client as Client & { land?: string }).land}</span>
            )}
            {client.risicoOordeel && <Badge variant={risicoVariant}>{client.risicoOordeel}</Badge>}
            {client.status === "AFGEROND" && <Badge variant="success" className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Afgerond</Badge>}
            {client.status === "BEEINDIGD" && <Badge variant="destructive" className="flex items-center gap-1">Beëindigd</Badge>}
          </div>
          {(client as Client & { land?: string }).land && (
            <div className="mb-2">
              <LandRisicoAlert land={(client as Client & { land?: string }).land ?? ""} />
            </div>
          )}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <StatusStepper
              clientId={client.id}
              current={client.status}
              isReadOnly={isReadOnly}
              onUpdate={handleStatusUpdate}
            />
            <div className="flex items-center gap-2">
              <Link href={`/dossier/${client.id}/wizard`}>
                <Button variant="outline" size="sm">Wizard</Button>
              </Link>
              {!isReadOnly && (
                <Link href={`/dossier/${client.id}/melding/nieuw`}>
                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                    <FileWarning className="h-3.5 w-3.5" /> Melding
                  </Button>
                </Link>
              )}
              <a href={`/dossier/${client.id}/export`} target="_blank">
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <Download className="h-3.5 w-3.5" /> PDF
                </Button>
              </a>
              {currentUser.rol === "PARTNER" && !isReadOnly && client.status === "IN_BEHANDELING" && (
                <Button size="sm" onClick={handleApprove} className="flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5" /> Goedkeuren
                </Button>
              )}
              {currentUser.rol === "PARTNER" && client.status !== "BEEINDIGD" && (
                <BeeindigingDialog
                  clientId={client.id}
                  clientNaam={client.naam}
                  onBeeindigd={(verwijderDatum) =>
                    setClient((c) => ({
                      ...c,
                      status: "BEEINDIGD" as ClientStatus,
                      verwijderDatum,
                    } as typeof c))
                  }
                />
              )}
            </div>
          </div>
          {isReadOnly && client.goedgekeurdOp && (
            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Goedgekeurd op {new Date(client.goedgekeurdOp).toLocaleString("nl-NL")}
              {client.goedgekeurdeUser && <> door {client.goedgekeurdeUser.naam}</>}
            </p>
          )}
        </div>
      </div>

      {/* verwijderDatum banner */}
      {client.status === "BEEINDIGD" && client.verwijderDatum && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2">
          <div className="max-w-5xl mx-auto flex items-center gap-2 text-sm text-red-700">
            <Trash2 className="h-4 w-4 flex-shrink-0" />
            <span>
              Cliëntrelatie beëindigd. Dit dossier wordt automatisch verwijderd op{" "}
              <strong>{new Date(client.verwijderDatum).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}</strong>
              {" "}(art. 33 Wwft — 5 jaar bewaarplicht).
              {client.beeindigdReden && <span className="ml-1">Reden: {client.beeindigdReden}.</span>}
            </span>
          </div>
        </div>
      )}

      {/* Body */}
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Section tabs */}
        <div className="flex gap-1 border-b border-gray-200 pb-0 overflow-x-auto">
          {(["osint", "nieuws", "ubo", "monitoring"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab as typeof activeTab);
                if (tab === "nieuws" && nieuwsHits.length === 0) searchNieuws();
              }}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-t border-b-2 -mb-px transition-colors whitespace-nowrap",
                activeTab === tab
                  ? "border-blue-600 text-blue-700 bg-white"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              {tab === "osint" && "OSINT & Zoeken"}
              {tab === "nieuws" && (
                <span className="flex items-center gap-1">
                  Negatief nieuws
                  {nieuwsHits.length > 0 && (
                    <span className="text-xs bg-orange-100 text-orange-700 rounded px-1">{nieuwsHits.length}</span>
                  )}
                </span>
              )}
              {tab === "ubo" && "UBO-structuur"}
              {tab === "monitoring" && "Monitoring"}
            </button>
          ))}
        </div>

        {/* Nieuws tab */}
        {activeTab === "nieuws" && (
          <div className="bg-white border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Negatief nieuws — Google News</h2>
              <button
                onClick={searchNieuws}
                disabled={nieuwsLoading}
                className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                {nieuwsLoading ? "Zoeken…" : "↻ Vernieuwen"}
              </button>
            </div>
            {nieuwsLoading ? (
              <p className="text-sm text-gray-400">Ophalen…</p>
            ) : nieuwsHits.length === 0 ? (
              <p className="text-sm text-gray-400">Geen nieuwsartikelen gevonden voor &quot;{zoekNaam}&quot;.</p>
            ) : (
              <div className="space-y-2">
                {nieuwsHits.map((h, i) => (
                  <a
                    key={i}
                    href={h.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block border rounded p-3 hover:bg-gray-50 transition-colors space-y-0.5"
                  >
                    <p className="text-sm font-medium text-gray-900 leading-snug">{h.titel}</p>
                    {h.samenvatting && (
                      <p className="text-xs text-gray-500">{h.samenvatting}</p>
                    )}
                  </a>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-400">Bron: Google News RSS · Altijd kritisch beoordelen op relevantie.</p>
          </div>
        )}

        {/* UBO structuur tab */}
        {activeTab === "ubo" && (
          <div className="bg-white border rounded-lg p-4">
            <h2 className="text-base font-semibold mb-3">Eigendomsstructuur & UBO</h2>
            <UboStructuurEditor clientId={client.id} readOnly={isReadOnly} />
          </div>
        )}

        {/* Monitoring tab */}
        {activeTab === "monitoring" && (
          <div className="bg-white border rounded-lg p-4">
            <MonitoringPanel clientId={client.id} />
          </div>
        )}

        {/* OSINT search bar */}
        {activeTab === "osint" && (
        <div className="bg-white border rounded-lg p-4 space-y-3">
          <div className="flex gap-2">
            <Input
              value={zoekNaam}
              onChange={(e) => setZoekNaam(e.target.value)}
              placeholder="Zoeknaam voor OSINT…"
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && searchAll()}
            />
            <Button onClick={searchAll} disabled={!!loadingSource} className="flex items-center gap-1">
              <Search className="h-4 w-4" />
              {loadingSource ? "Zoeken…" : "Alle bronnen"}
            </Button>
          </div>

          {/* Source tabs */}
          <Tabs defaultValue="opensanctions">
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="opensanctions" onClick={() => search("opensanctions")} disabled={!!loadingSource}>
                OpenSanctions {opensanctionsHits.length > 0 && <span className="ml-1 text-xs bg-blue-100 text-blue-700 rounded px-1">{opensanctionsHits.length}</span>}
              </TabsTrigger>
              <TabsTrigger value="web" onClick={() => search("web")} disabled={!!loadingSource}>
                Web {webIsMock && <span className="text-xs ml-1 text-orange-500">(demo)</span>}
                {webHits.length > 0 && <span className="ml-1 text-xs bg-blue-100 text-blue-700 rounded px-1">{webHits.length}</span>}
              </TabsTrigger>
              <TabsTrigger value="gleif" onClick={() => search("gleif")} disabled={!!loadingSource}>
                GLEIF {gleifHits.length > 0 && <span className="ml-1 text-xs bg-blue-100 text-blue-700 rounded px-1">{gleifHits.length}</span>}
              </TabsTrigger>
              <TabsTrigger value="icij" onClick={() => search("icij")} disabled={!!loadingSource}>
                ICIJ {icijHits.length > 0 && <span className="ml-1 text-xs bg-red-100 text-red-700 rounded px-1">{icijHits.length}</span>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="opensanctions" className="space-y-2 mt-3">
              {opensanctionsHits.length === 0 ? (
                <p className="text-sm text-gray-400">Geen resultaten. Klik op de tab om te zoeken.</p>
              ) : (
                opensanctionsHits.map((h) => (
                  <ResultCard key={h.id} queryId={h.queryId} titel={`${h.naam} (${h.type})`} url={h.profielLink}
                    samenvatting={`Datasets: ${h.datasets.join(", ")}${h.land ? ` · Land: ${h.land}` : ""}${h.geboortedatum ? ` · Geb. ${h.geboortedatum}` : ""}`} />
                ))
              )}
            </TabsContent>

            <TabsContent value="web" className="space-y-2 mt-3">
              {webHits.length === 0 ? (
                <p className="text-sm text-gray-400">Geen resultaten. Klik op de tab om te zoeken.</p>
              ) : (
                webHits.map((h, i) => (
                  <ResultCard key={i} queryId={h.queryId} titel={h.titel} url={h.url} samenvatting={h.samenvatting} />
                ))
              )}
            </TabsContent>

            <TabsContent value="gleif" className="space-y-2 mt-3">
              {gleifHits.length === 0 ? (
                <p className="text-sm text-gray-400">Geen resultaten. Klik op de tab om te zoeken.</p>
              ) : (
                gleifHits.map((h, i) => (
                  <ResultCard key={i} queryId={h.queryId} titel={h.bedrijfsnaam} status={h.status}
                    samenvatting={`LEI: ${h.lei}${h.rechtsvorm ? ` · Rechtsvorm: ${h.rechtsvorm}` : ""}${h.land ? ` · Land: ${h.land}` : ""}`} />
                ))
              )}
            </TabsContent>

            <TabsContent value="icij" className="space-y-2 mt-3">
              {icijHits.length === 0 ? (
                <p className="text-sm text-gray-400">Geen resultaten. Klik op de tab om te zoeken.</p>
              ) : (
                icijHits.map((h, i) => (
                  <ResultCard key={i} queryId={h.queryId} titel={h.naam} alwaysRed
                    samenvatting={`Dataset: ${h.dataset}${h.land ? ` · Land: ${h.land}` : ""}${h.rol ? ` · Rol: ${h.rol}` : ""}`} />
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
        )}

        {/* Review panel — always visible */}
        <div className="bg-white border rounded-lg p-4">
          <h2 className="text-base font-semibold mb-3">Periodieke review</h2>
          <ReviewPanel clientId={client.id} />
        </div>

        {/* Meldingen — always visible */}
        <MeldingenSection clientId={client.id} isReadOnly={isReadOnly} currentUserRol={currentUser.rol} />

        {/* Interne opmerkingen — always visible */}
        <OpmerkingThread
          clientId={client.id}
          currentUserId={currentUser.id}
          currentUserRol={currentUser.rol}
        />

        {/* Auditlog — collapsible, always visible */}
        <AuditLogPanel clientId={client.id} />
      </main>
    </div>
  );
}

// ─── Inline meldingen section ─────────────────────────────────────────────────

function MeldingenSection({
  clientId,
  isReadOnly,
  currentUserRol,
}: {
  clientId: string;
  isReadOnly: boolean;
  currentUserRol: UserRole;
}) {
  const { toast } = useToast();
  const [meldingen, setMeldingen] = useState<Melding[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [finalizingId, setFinalizingId] = useState<string | null>(null);
  const [fiuRef, setFiuRef] = useState("");

  const load = useCallback(async () => {
    const data = await fetch(`/api/meldingen?clientId=${clientId}`).then((r) => r.json());
    setMeldingen(data);
    setLoaded(true);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  async function handleFinalize(meldingId: string) {
    try {
      const res = await fetch("/api/meldingen", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meldingId, fiuReferentie: fiuRef || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: "FIU-melding gefinaliseerd" });
      setFinalizingId(null);
      load();
    } catch (err: unknown) {
      toast({ title: "Fout", description: String(err), variant: "destructive" });
    }
  }

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">Ongebruikelijke transacties</h2>
        {!isReadOnly && (
          <Link href={`/dossier/${clientId}/melding/nieuw`}>
            <Button size="sm" variant="outline" className="flex items-center gap-1">
              <FileWarning className="h-3.5 w-3.5" /> Nieuwe melding
            </Button>
          </Link>
        )}
      </div>
      {!loaded ? (
        <p className="text-sm text-gray-400">Laden…</p>
      ) : meldingen.length === 0 ? (
        <p className="text-sm text-gray-400">Geen meldingen vastgelegd.</p>
      ) : (
        <div className="space-y-3">
          {meldingen.map((m) => (
            <div key={m.id} className={cn("border rounded p-3 space-y-1", m.beslissing === "FIU_MELDING" ? "border-red-300 bg-red-50" : "border-gray-200")}>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">€{m.bedrag.toFixed(2)}</span>
                  <span className="text-gray-500">{new Date(m.datumTransactie).toLocaleDateString("nl-NL")}</span>
                  <Badge variant={m.beslissing === "FIU_MELDING" ? "destructive" : "success"}>
                    {m.beslissing === "FIU_MELDING" ? "FIU-melding" : "Niet gemeld"}
                  </Badge>
                  {m.afgerondOp && <Badge variant="secondary">Gefinaliseerd</Badge>}
                </div>
              </div>
              <p className="text-xs text-gray-600">{m.omschrijving}</p>
              {m.beslissing === "FIU_MELDING" && !m.afgerondOp && currentUserRol === "PARTNER" && (
                finalizingId === m.id ? (
                  <div className="flex items-center gap-2 mt-2">
                    <Input placeholder="FIU-referentienummer (optioneel)" value={fiuRef} onChange={(e) => setFiuRef(e.target.value)} className="h-7 text-xs" />
                    <Button size="sm" onClick={() => handleFinalize(m.id)}>Finaliseren</Button>
                    <Button size="sm" variant="outline" onClick={() => setFinalizingId(null)}>✕</Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setFinalizingId(m.id)} className="mt-1">
                    FIU-melding finaliseren
                  </Button>
                )
              )}
              {m.beslissing === "FIU_MELDING" && m.afgerondOp && (
                <a href={`/api/meldingen/goaml?meldingId=${m.id}`} download>
                  <Button size="sm" variant="outline" className="mt-1 flex items-center gap-1 text-xs">
                    <FileCode className="h-3 w-3" /> goAML XML
                  </Button>
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
