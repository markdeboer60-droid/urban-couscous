"use client";

/**
 * DocumentUpload — manage identity and KvK documents for a client.
 * Per upload: naamBetrokkene, functie, geboortedatum, verificatiemethode required.
 */

import { useState, useEffect } from "react";
import { Upload, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Document, DocumentType } from "@/types";

interface DocumentUploadProps {
  clientId: string;
  readOnly?: boolean;
}

const DOC_TYPES: { value: DocumentType; label: string }[] = [
  { value: "ID", label: "ID-bewijs" },
  { value: "UBO", label: "UBO ID-bewijs" },
  { value: "KVK", label: "KvK-uittreksel" },
  { value: "UBO_REGISTER", label: "UBO-register uittreksel" },
  { value: "OVERIG", label: "Overig" },
];

const VERIFICATIE_METHODEN = [
  "Fysiek gezien",
  "Videobellen",
  "Gewaarmerkt afschrift",
  "iDIN",
];

const FUNCTIES = ["Bestuurder", "UBO", "Gevolmachtigde", "Overig"];

export function DocumentUpload({ clientId, readOnly }: DocumentUploadProps) {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    type: "" as DocumentType | "",
    naamBetrokkene: "",
    functie: "",
    geboortedatum: "",
    verificatiemethode: "",
    file: null as File | null,
  });

  useEffect(() => {
    fetch(`/api/documents?clientId=${clientId}`)
      .then((r) => r.json())
      .then(setDocuments);
  }, [clientId]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!form.file || !form.type || !form.naamBetrokkene || !form.functie || !form.verificatiemethode) {
      toast({ title: "Alle velden verplicht", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("clientId", clientId);
      fd.append("type", form.type);
      fd.append("file", form.file);
      fd.append("naamBetrokkene", form.naamBetrokkene);
      fd.append("functie", form.functie);
      fd.append("geboortedatum", form.geboortedatum);
      fd.append("verificatiemethode", form.verificatiemethode);

      const res = await fetch("/api/documents", { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json()).error);
      const doc = await res.json();
      setDocuments((prev) => [doc, ...prev]);
      setForm({ type: "", naamBetrokkene: "", functie: "", geboortedatum: "", verificatiemethode: "", file: null });
      toast({ title: "Document geüpload" });
    } catch (err: unknown) {
      toast({ title: "Upload mislukt", description: String(err), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">Documenten</h3>

      {/* Existing documents */}
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 border rounded p-2 bg-gray-50 text-sm">
              <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{doc.bestandsnaam}</p>
                <p className="text-xs text-gray-500">
                  {doc.naamBetrokkene} · {doc.functie} · {doc.verificatiemethode}
                </p>
              </div>
              <span className="text-xs text-gray-400">{new Date(doc.uploadOp).toLocaleDateString("nl-NL")}</span>
            </div>
          ))}
        </div>
      )}

      {/* Upload form */}
      {!readOnly && (
        <form onSubmit={handleUpload} className="border rounded-md p-4 space-y-3 bg-white">
          <p className="text-sm font-medium text-gray-700">Document toevoegen</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Type *</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as DocumentType }))}>
                <SelectTrigger><SelectValue placeholder="Kies type…" /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Verificatiemethode *</Label>
              <Select value={form.verificatiemethode} onValueChange={(v) => setForm((f) => ({ ...f, verificatiemethode: v }))}>
                <SelectTrigger><SelectValue placeholder="Kies methode…" /></SelectTrigger>
                <SelectContent>
                  {VERIFICATIE_METHODEN.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Naam betrokkene *</Label>
              <Input value={form.naamBetrokkene} onChange={(e) => setForm((f) => ({ ...f, naamBetrokkene: e.target.value }))} placeholder="Volledige naam" />
            </div>
            <div className="space-y-1">
              <Label>Functie *</Label>
              <Select value={form.functie} onValueChange={(v) => setForm((f) => ({ ...f, functie: v }))}>
                <SelectTrigger><SelectValue placeholder="Kies functie…" /></SelectTrigger>
                <SelectContent>
                  {FUNCTIES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Geboortedatum</Label>
              <Input type="date" value={form.geboortedatum} onChange={(e) => setForm((f) => ({ ...f, geboortedatum: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Bestand *</Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }))}
              />
            </div>
          </div>
          <Button type="submit" disabled={uploading} size="sm" className="flex items-center gap-1">
            <Upload className="h-3 w-3" />
            {uploading ? "Uploaden…" : "Document uploaden"}
          </Button>
        </form>
      )}
    </div>
  );
}
