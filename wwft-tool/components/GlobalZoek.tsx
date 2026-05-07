"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Search, X, FileText, MessageSquare, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchClient { id: string; naam: string; kvkNummer: string | null; status: string; risicoOordeel: string | null; }
interface SearchDoc { id: string; bestandsnaam: string; naamBetrokkene: string | null; functie: string | null; clientId: string; client: { naam: string }; }
interface SearchOpmerking { id: string; tekst: string; clientId: string; aangemaakt: string; client: { naam: string }; user: { naam: string }; }

const STATUS_COLOR: Record<string, string> = {
  GESTART: "text-gray-500", IN_BEHANDELING: "text-blue-600",
  AFGEROND: "text-green-600", BEEINDIGD: "text-red-600",
};
const RISICO_COLOR: Record<string, string> = {
  LAAG: "bg-green-100 text-green-800", MIDDEN: "bg-orange-100 text-orange-800", HOOG: "bg-red-100 text-red-800",
};

export function GlobalZoek() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ clients: SearchClient[]; documents: SearchDoc[]; opmerkingen: SearchOpmerking[] } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); return; }
    setLoading(true);
    try {
      const data = await fetch(`/api/search/global?q=${encodeURIComponent(q)}`).then((r) => r.json());
      setResults(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce input
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(query), 280);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, search]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const hasResults = results && (results.clients.length + results.documents.length + results.opmerkingen.length) > 0;

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Zoek cliënten, documenten…"
          className="h-9 pl-8 pr-7 text-sm border rounded-md bg-white w-56 focus:w-72 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {query && (
          <button onClick={() => { setQuery(""); setResults(null); }} className="absolute right-2 top-2.5">
            <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {open && query.length >= 2 && (
        <div className="absolute right-0 top-10 z-50 w-96 rounded-lg border bg-white shadow-xl max-h-[480px] overflow-y-auto">
          {loading ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">Zoeken…</div>
          ) : !hasResults ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              Geen resultaten voor &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="divide-y">
              {results!.clients.length > 0 && (
                <section className="p-2">
                  <p className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
                    <Users className="h-3 w-3" /> Cliënten
                  </p>
                  {results!.clients.map((c) => (
                    <Link
                      key={c.id}
                      href={`/dossier/${c.id}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{c.naam}</p>
                        <p className={cn("text-xs", STATUS_COLOR[c.status] ?? "text-gray-400")}>
                          {c.status.toLowerCase().replace("_", " ")}
                          {c.kvkNummer && ` · KvK ${c.kvkNummer}`}
                        </p>
                      </div>
                      {c.risicoOordeel && (
                        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", RISICO_COLOR[c.risicoOordeel] ?? "bg-gray-100 text-gray-600")}>
                          {c.risicoOordeel}
                        </span>
                      )}
                    </Link>
                  ))}
                </section>
              )}

              {results!.documents.length > 0 && (
                <section className="p-2">
                  <p className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
                    <FileText className="h-3 w-3" /> Documenten
                  </p>
                  {results!.documents.map((d) => (
                    <Link
                      key={d.id}
                      href={`/dossier/${d.clientId}/wizard`}
                      onClick={() => setOpen(false)}
                      className="block px-2 py-1.5 rounded hover:bg-gray-50 transition-colors"
                    >
                      <p className="text-sm text-gray-900 truncate">{d.bestandsnaam}</p>
                      <p className="text-xs text-gray-400">
                        {d.naamBetrokkene && `${d.naamBetrokkene}${d.functie ? ` (${d.functie})` : ""} · `}
                        {d.client.naam}
                      </p>
                    </Link>
                  ))}
                </section>
              )}

              {results!.opmerkingen.length > 0 && (
                <section className="p-2">
                  <p className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> Opmerkingen
                  </p>
                  {results!.opmerkingen.map((o) => (
                    <Link
                      key={o.id}
                      href={`/dossier/${o.clientId}`}
                      onClick={() => setOpen(false)}
                      className="block px-2 py-1.5 rounded hover:bg-gray-50 transition-colors"
                    >
                      <p className="text-xs text-gray-700 line-clamp-2">{o.tekst}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{o.user.naam} · {o.client.naam}</p>
                    </Link>
                  ))}
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
