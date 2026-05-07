"use client";

/**
 * OpmerkingThread — interne commentaarthread per cliëntdossier.
 * Medewerkers en partners kunnen opmerkingen plaatsen; eigen opmerkingen
 * kunnen worden verwijderd (partners kunnen alles verwijderen).
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { UserRole } from "@/types";
import { cn } from "@/lib/utils";

interface Opmerking {
  id: string;
  tekst: string;
  aangemaakt: string;
  userId: string;
  user: { naam: string; rol: string };
}

interface Props {
  clientId: string;
  currentUserId: string;
  currentUserRol: UserRole;
}

export function OpmerkingThread({ clientId, currentUserId, currentUserRol }: Props) {
  const { toast } = useToast();
  const [opmerkingen, setOpmerkingen] = useState<Opmerking[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tekst, setTekst] = useState("");
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const data = await fetch(`/api/opmerkingen?clientId=${clientId}`).then((r) => r.json());
    setOpmerkingen(Array.isArray(data) ? data : []);
    setLoaded(true);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  // Scroll to bottom after load/new message
  useEffect(() => {
    if (loaded) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [opmerkingen.length, loaded]);

  async function handleSend() {
    if (!tekst.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/opmerkingen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, tekst }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const nieuw = await res.json();
      setOpmerkingen((prev) => [...prev, nieuw]);
      setTekst("");
    } catch (err: unknown) {
      toast({ title: "Fout bij plaatsen opmerking", description: String(err), variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/opmerkingen?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      setOpmerkingen((prev) => prev.filter((o) => o.id !== id));
    } catch (err: unknown) {
      toast({ title: "Fout bij verwijderen", description: String(err), variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="bg-white border rounded-lg p-4 space-y-4">
      <h2 className="text-base font-semibold flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-gray-500" />
        Interne opmerkingen
        {opmerkingen.length > 0 && (
          <span className="text-xs text-gray-400 font-normal">({opmerkingen.length})</span>
        )}
      </h2>

      {/* Thread */}
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {!loaded ? (
          <p className="text-sm text-gray-400">Laden…</p>
        ) : opmerkingen.length === 0 ? (
          <p className="text-sm text-gray-400">Nog geen opmerkingen. Wees de eerste.</p>
        ) : (
          opmerkingen.map((o) => {
            const isOwn = o.userId === currentUserId;
            const canDelete = isOwn || currentUserRol === "PARTNER";
            return (
              <div
                key={o.id}
                className={cn(
                  "flex gap-2 group",
                  isOwn ? "flex-row-reverse" : "flex-row"
                )}
              >
                {/* Avatar */}
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5",
                  isOwn ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                )}>
                  {o.user.naam.charAt(0).toUpperCase()}
                </div>
                {/* Bubble */}
                <div className={cn("max-w-[75%] space-y-0.5", isOwn ? "items-end" : "items-start")}>
                  <div className={cn(
                    "flex items-center gap-1.5 text-xs text-gray-500",
                    isOwn ? "justify-end" : "justify-start"
                  )}>
                    <span className="font-medium text-gray-700">{o.user.naam}</span>
                    {o.user.rol === "PARTNER" && (
                      <Badge variant="default" className="text-[9px] px-1 py-0 h-4">Partner</Badge>
                    )}
                    <span>{new Date(o.aangemaakt).toLocaleString("nl-NL", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                    })}</span>
                  </div>
                  <div className={cn(
                    "rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words",
                    isOwn
                      ? "bg-blue-600 text-white rounded-tr-sm"
                      : "bg-gray-100 text-gray-900 rounded-tl-sm"
                  )}>
                    {o.tekst}
                  </div>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(o.id)}
                      disabled={deletingId === o.id}
                      className={cn(
                        "opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-red-400 hover:text-red-600 flex items-center gap-0.5",
                        isOwn ? "justify-end" : "justify-start"
                      )}
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                      {deletingId === o.id ? "Verwijderen…" : "Verwijder"}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 items-end border-t pt-3">
        <Textarea
          value={tekst}
          onChange={(e) => setTekst(e.target.value)}
          placeholder="Typ een interne opmerking… (alleen zichtbaar voor collega's)"
          className="flex-1 min-h-[60px] max-h-32 resize-none text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={sending}
        />
        <Button
          size="sm"
          onClick={handleSend}
          disabled={sending || !tekst.trim()}
          className="flex items-center gap-1"
        >
          <Send className="h-3.5 w-3.5" />
          {sending ? "…" : "Sturen"}
        </Button>
      </div>
      <p className="text-[10px] text-gray-400">Ctrl+Enter om te sturen</p>
    </div>
  );
}
