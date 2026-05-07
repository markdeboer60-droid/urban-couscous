"use client";

/**
 * IdentificatieOnderzoek — OSINT-onderzoek op bedrijf + UBOs/bestuurders.
 * Triggered manually via "Start onderzoek" button. Results include risk-word
 * highlighting and per-result relevance documentation (ActionButtons).
 */

import { useState, useEffect } from "react";
import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResultCard } from "@/components/ResultCard";
import { useToast } from "@/hooks/use-toast";
import type { Document, WebSearchHit } from "@/types";

interface IdentificatieOnderzoekProps {
  clientId: string;
  clientNaam: string;
  readOnly?: boolean;
}

interface SubjectResult {
  subject: string;
  hits: (WebSearchHit & { queryId: string })[];
  isMock: boolean;
}

export function IdentificatieOnderzoek({ clientId, clientNaam, readOnly }: IdentificatieOnderzoekProps) {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set([clientNaam]));
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SubjectResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    fetch(`/api/documents?clientId=${clientId}`)
      .then((r) => r.json())
      .then((docs: Document[]) => setDocuments(docs))
      .catch(() => {/* ignore */});
  }, [clientId]);

  // Company name + unique naamBetrokkene values from uploaded documents
  const allSubjects = Array.from(
    new Set([
      clientNaam,
      ...documents
        .map((d) => d.naamBetrokkene)
        .filter((n): n is string => Boolean(n)),
    ])
  );

  function toggleSubject(name: string) {
    setSelectedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  async function startOnderzoek() {
    if (selectedSubjects.size === 0) {
      toast({ title: "Selecteer minimaal één naam", variant: "destructive" });
      return;
    }

    setSearching(true);
    const newResults: SubjectResult[] = [];

    for (const subject of Array.from(selectedSubjects)) {
      try {
        const res = await fetch("/api/search/web", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            naam: subject,
            clientId,
            extraKeywords: "fraude rechtszaak politie rechtbank witwassen sanctie faillissement",
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        const data = await res.json();
        newResults.push({
          subject,
          hits: (data.hits as WebSearchHit[]).map((h) => ({ ...h, queryId: data.queryId as string })),
          isMock: data.isMock as boolean,
        });
      } catch (err: unknown) {
        toast({
          title: `Zoekfout voor "${subject}"`,
          description: String(err),
          variant: "destructive",
        });
      }
    }

    setResults(newResults);
    setHasSearched(true);
    setSearching(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-1">OSINT-onderzoek</h3>
        <p className="text-xs text-gray-500">
          Selecteer de namen die onderzocht moeten worden en klik op "Start onderzoek". Het systeem
          zoekt via open bronnen naar negatieve berichtgeving. Markeer elk resultaat als relevant of
          als false positive om de bevinding te documenteren.
        </p>
      </div>

      {/* Subject selection */}
      <div className="border rounded-md p-4 bg-white space-y-3">
        <p className="text-sm font-medium text-gray-700">Te onderzoeken namen</p>

        {allSubjects.length === 0 ? (
          <p className="text-xs text-gray-400 italic">
            Nog geen namen beschikbaar. Upload eerst een document met een betrokkene.
          </p>
        ) : (
          <div className="space-y-2">
            {allSubjects.map((subject) => {
              const doc = documents.find((d) => d.naamBetrokkene === subject);
              const isCompany = subject === clientNaam;
              return (
                <label key={subject} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 accent-blue-600"
                    checked={selectedSubjects.has(subject)}
                    onChange={() => toggleSubject(subject)}
                    disabled={readOnly || searching}
                  />
                  <span className="text-sm text-gray-800 flex-1">{subject}</span>
                  {isCompany ? (
                    <Badge variant="secondary" className="text-xs">Bedrijf</Badge>
                  ) : doc ? (
                    <Badge variant="secondary" className="text-xs">{doc.functie ?? "Persoon"}</Badge>
                  ) : null}
                </label>
              );
            })}
          </div>
        )}

        {!readOnly && (
          <Button
            onClick={startOnderzoek}
            disabled={searching || selectedSubjects.size === 0}
            className="flex items-center gap-2 mt-1"
          >
            {searching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Onderzoek loopt…
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Start onderzoek
              </>
            )}
          </Button>
        )}
      </div>

      {/* Results per subject */}
      {hasSearched && (
        <div className="space-y-8">
          {results.length === 0 && !searching && (
            <p className="text-sm text-gray-500 italic">
              Geen resultaten gevonden voor de geselecteerde namen.
            </p>
          )}

          {results.map(({ subject, hits, isMock }) => (
            <div key={subject} className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-semibold text-gray-800">{subject}</h4>
                {isMock && (
                  <Badge variant="secondary" className="text-xs">
                    Voorbeeldresultaten — voeg Brave API-sleutel toe voor echte resultaten
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  {hits.length} {hits.length === 1 ? "resultaat" : "resultaten"}
                </Badge>
              </div>

              {hits.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Geen resultaten gevonden.</p>
              ) : (
                <div className="space-y-3">
                  {hits.map((hit, i) => (
                    <ResultCard
                      key={`${subject}-${i}`}
                      queryId={hit.queryId}
                      titel={hit.titel}
                      url={hit.url}
                      samenvatting={hit.samenvatting}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
