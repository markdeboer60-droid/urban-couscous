"use client";

import { useState, useEffect } from "react";
import { Upload, MessageSquare, CheckCircle, AlertTriangle, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface PortaalInfo {
  clientId: string;
  clientNaam: string;
  clientStatus: string;
  expiresAt: string;
}

export function PortaalClient({ token }: { token: string }) {
  const [info, setInfo] = useState<PortaalInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<"bericht" | "bestand">("bericht");
  const [bericht, setBericht] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/portal?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); } else { setInfo(data); }
      })
      .catch(() => setError("Kan portaal niet laden. Probeer het later opnieuw."))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit() {
    if (tab === "bericht" && !bericht.trim()) return;
    if (tab === "bestand" && !file) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const formData = new FormData();
      formData.append("token", token);
      if (bericht.trim()) formData.append("bericht", bericht.trim());
      if (file) formData.append("file", file);

      const res = await fetch("/api/portal", { method: "PATCH", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Versturen mislukt");
      setSuccess(true);
    } catch (err: unknown) {
      setSubmitError(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white border rounded-lg p-6 max-w-md w-full text-center space-y-3">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto" />
          <h1 className="text-lg font-semibold text-gray-900">Portaal niet beschikbaar</h1>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white border rounded-lg p-6 max-w-md w-full text-center space-y-3">
          <CheckCircle className="h-8 w-8 text-green-500 mx-auto" />
          <h1 className="text-lg font-semibold text-gray-900">Verzonden</h1>
          <p className="text-sm text-gray-500">
            Uw {tab === "bestand" ? "document" : "bericht"} is ontvangen en toegevoegd aan uw dossier.
          </p>
          <Button variant="outline" size="sm" onClick={() => { setSuccess(false); setBericht(""); setFile(null); }}>
            Nog iets toevoegen
          </Button>
        </div>
      </div>
    );
  }

  const geldigTot = info ? new Date(info.expiresAt).toLocaleDateString("nl-NL", {
    day: "numeric", month: "long", year: "numeric",
  }) : "";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="bg-white border rounded-lg p-5 space-y-1">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <h1 className="text-lg font-bold text-gray-900">Cliëntenportaal</h1>
          </div>
          <p className="text-sm text-gray-600">
            Dossier: <strong>{info?.clientNaam}</strong>
          </p>
          <p className="text-xs text-gray-400">Geldig tot {geldigTot}</p>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          Via dit portaal kunt u documenten of berichten toevoegen aan uw dossier. Uw kantoor ontvangt
          een melding zodra u iets heeft ingediend.
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 border-b border-gray-200">
          {(["bericht", "bestand"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                "px-4 py-2 text-sm font-medium rounded-t border-b-2 -mb-px transition-colors",
                tab === t
                  ? "border-blue-600 text-blue-700 bg-white"
                  : "border-transparent text-gray-500 hover:text-gray-700",
              ].join(" ")}
            >
              {t === "bericht" ? (
                <span className="flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" />Bericht</span>
              ) : (
                <span className="flex items-center gap-1.5"><Upload className="h-3.5 w-3.5" />Document uploaden</span>
              )}
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="bg-white border rounded-lg p-4 space-y-3">
          {tab === "bericht" ? (
            <>
              <label className="text-sm font-medium text-gray-700">Uw bericht</label>
              <Textarea
                placeholder="Typ hier uw bericht of toelichting…"
                value={bericht}
                onChange={(e) => setBericht(e.target.value)}
                rows={6}
                maxLength={2000}
                className="text-sm"
              />
              <p className="text-xs text-gray-400 text-right">{bericht.length}/2000</p>
            </>
          ) : (
            <>
              <label className="text-sm font-medium text-gray-700">Document (PDF, JPG of PNG, max 10 MB)</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-gray-700 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {file && (
                <>
                  <p className="text-xs text-gray-500">{file.name} ({(file.size / 1024).toFixed(0)} KB)</p>
                  <label className="text-sm font-medium text-gray-700">Omschrijving (optioneel)</label>
                  <Textarea
                    placeholder="Korte toelichting bij dit document…"
                    value={bericht}
                    onChange={(e) => setBericht(e.target.value)}
                    rows={2}
                    maxLength={300}
                    className="text-sm"
                  />
                </>
              )}
            </>
          )}

          {submitError && (
            <p className="text-sm text-red-600">{submitError}</p>
          )}

          <Button
            onClick={handleSubmit}
            disabled={submitting || (tab === "bericht" ? !bericht.trim() : !file)}
            className="w-full"
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Versturen…</>
            ) : (
              tab === "bericht" ? "Bericht versturen" : "Document uploaden"
            )}
          </Button>
        </div>

        <p className="text-center text-xs text-gray-400">
          Dit portaal is beveiligd met een persoonlijke link. Deel de link niet met anderen.
        </p>
      </div>
    </div>
  );
}
