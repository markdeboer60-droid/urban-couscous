/**
 * DossierPDF — React PDF document for dossier export.
 * Uses @react-pdf/renderer primitives only (no HTML/CSS).
 */

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// Register a standard font — Helvetica is built-in
const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: "Helvetica", color: "#111" },
  h1: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  h2: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 14, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: "#ccc", paddingBottom: 2 },
  h3: { fontSize: 9, fontFamily: "Helvetica-Bold", marginTop: 8, marginBottom: 2, color: "#444" },
  row: { flexDirection: "row", marginBottom: 2 },
  label: { width: 140, color: "#555", fontFamily: "Helvetica-Bold" },
  value: { flex: 1 },
  badge: { backgroundColor: "#dbeafe", color: "#1e40af", borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1, fontSize: 8 },
  badgeRed: { backgroundColor: "#fee2e2", color: "#991b1b", borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1, fontSize: 8 },
  badgeGreen: { backgroundColor: "#dcfce7", color: "#166534", borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1, fontSize: 8 },
  questionRow: { flexDirection: "row", marginBottom: 2, borderBottomWidth: 1, borderBottomColor: "#f0f0f0", paddingBottom: 2 },
  questionKey: { width: 70, color: "#777" },
  questionText: { flex: 1 },
  questionAnswer: { width: 30, fontFamily: "Helvetica-Bold" },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 7, color: "#999", borderTopWidth: 1, borderTopColor: "#ddd", paddingTop: 4, flexDirection: "row", justifyContent: "space-between" },
});

interface PDFClientData {
  naam: string;
  kvkNummer?: string | null;
  status: string;
  risicoOordeel?: string | null;
  risicoMotivatie?: string | null;
  eindOpmerkingen?: string | null;
  aangemaakt: string;
  goedgekeurdOp?: string | null;
  aanmaker?: { naam: string } | null;
  goedgekeurdeUser?: { naam: string } | null;
  wizardAnswers: Array<{ stap: string; vraagKey: string; antwoord: string; toelichting?: string | null }>;
  documents: Array<{ type: string; bestandsnaam: string; naamBetrokkene?: string | null; functie?: string | null; verificatiemethode?: string | null; uploadOp: string }>;
  reviews: Array<{ status: string; volgendeReviewOp: string; uitgevoerdOp?: string | null; bevindingen?: string | null; risicoOordeelNa?: string | null; uitvoerder?: { naam: string } | null }>;
  meldingen: Array<{ beslissing: string; bedrag: number; datumTransactie: string; omschrijving: string; indicatorType: string; afgerondOp?: string | null; fiuReferentie?: string | null }>;
  searchQueries: Array<{ bron: string; zoeknaam: string; uitgevoerdOp: string; resultActions: Array<{ hitTitel: string; beslissing: string; notitie?: string | null; timestamp: string; gebruiker?: { naam: string } | null }> }>;
}

interface DossierPDFProps {
  client: PDFClientData;
  exportedAt: string;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("nl-NL");
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("nl-NL");
}

const STAP_LABELS: Record<string, string> = {
  BEDRIJFSVERKENNING: "Bedrijfsverkenning",
  WWFT: "Wwft",
  IDENTIFICATIE: "Identificatie",
  BEOORDELING: "Beoordeling",
};

export function DossierPDF({ client, exportedAt }: DossierPDFProps) {
  const answersByStap = client.wizardAnswers.reduce<Record<string, typeof client.wizardAnswers>>((acc, a) => {
    acc[a.stap] = acc[a.stap] ?? [];
    acc[a.stap].push(a);
    return acc;
  }, {});

  return (
    <Document title={`Dossier ${client.naam}`} author="Wwft Compliance Tool">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={{ marginBottom: 16 }}>
          <Text style={styles.h1}>Dossier: {client.naam}</Text>
          <Text style={{ fontSize: 8, color: "#777" }}>Gegenereerd op {fmt(exportedAt)}</Text>
        </View>

        {/* Client info */}
        <Text style={styles.h2}>Cliëntgegevens</Text>
        <View style={styles.row}><Text style={styles.label}>Naam</Text><Text style={styles.value}>{client.naam}</Text></View>
        {client.kvkNummer && <View style={styles.row}><Text style={styles.label}>KvK-nummer</Text><Text style={styles.value}>{client.kvkNummer}</Text></View>}
        <View style={styles.row}><Text style={styles.label}>Status</Text><Text style={styles.value}>{client.status}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Risicoprofiel</Text><Text style={styles.value}>{client.risicoOordeel ?? "—"}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Aangemaakt</Text><Text style={styles.value}>{fmtDate(client.aangemaakt)}{client.aanmaker ? ` door ${client.aanmaker.naam}` : ""}</Text></View>
        {client.goedgekeurdOp && <View style={styles.row}><Text style={styles.label}>Goedgekeurd</Text><Text style={styles.value}>{fmtDate(client.goedgekeurdOp)}{client.goedgekeurdeUser ? ` door ${client.goedgekeurdeUser.naam}` : ""}</Text></View>}
        {client.risicoMotivatie && (
          <View style={{ marginTop: 4 }}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 8, marginBottom: 1 }}>Motivatie risicoprofiel</Text>
            <Text style={{ color: "#444" }}>{client.risicoMotivatie}</Text>
          </View>
        )}
        {client.eindOpmerkingen && (
          <View style={{ marginTop: 4 }}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 8, marginBottom: 1 }}>Eindopmerkingen</Text>
            <Text style={{ color: "#444" }}>{client.eindOpmerkingen}</Text>
          </View>
        )}

        {/* Wizard answers */}
        {Object.entries(answersByStap).map(([stap, answers]) => (
          <View key={stap} wrap={false}>
            <Text style={styles.h2}>{STAP_LABELS[stap] ?? stap}</Text>
            {answers.map((a) => (
              <View key={a.vraagKey} style={styles.questionRow}>
                <Text style={styles.questionKey}>{a.vraagKey}</Text>
                <Text style={styles.questionAnswer}>{a.antwoord}</Text>
                {a.toelichting ? <Text style={[styles.questionText, { color: "#555" }]}>{a.toelichting}</Text> : <Text style={styles.questionText} />}
              </View>
            ))}
          </View>
        ))}

        {/* Documents */}
        {client.documents.length > 0 && (
          <View wrap={false}>
            <Text style={styles.h2}>Documenten ({client.documents.length})</Text>
            {client.documents.map((d, i) => (
              <View key={i} style={styles.row}>
                <Text style={styles.label}>{d.type} — {d.bestandsnaam}</Text>
                <Text style={styles.value}>{d.naamBetrokkene ?? ""}{d.functie ? ` (${d.functie})` : ""}{d.verificatiemethode ? ` · ${d.verificatiemethode}` : ""} · {fmtDate(d.uploadOp)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* OSINT actions */}
        {client.searchQueries.some((q) => q.resultActions.length > 0) && (
          <View>
            <Text style={styles.h2}>OSINT-bevindingen</Text>
            {client.searchQueries.filter((q) => q.resultActions.length > 0).map((q, qi) => (
              <View key={qi} style={{ marginBottom: 6 }}>
                <Text style={styles.h3}>{q.bron} — {q.zoeknaam} ({fmtDate(q.uitgevoerdOp)})</Text>
                {q.resultActions.map((a, ai) => (
                  <View key={ai} style={styles.row}>
                    <Text style={[styles.label, { width: 200 }]}>{a.hitTitel}</Text>
                    <Text style={a.beslissing === "RISICO" ? styles.badgeRed : styles.badgeGreen}>{a.beslissing}</Text>
                    {a.notitie && <Text style={[styles.value, { color: "#555", marginLeft: 4 }]}>{a.notitie}</Text>}
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Reviews */}
        {client.reviews.length > 0 && (
          <View wrap={false}>
            <Text style={styles.h2}>Reviews</Text>
            {client.reviews.map((r, i) => (
              <View key={i} style={styles.row}>
                <Text style={styles.label}>{r.status} — volgende {fmtDate(r.volgendeReviewOp)}</Text>
                <Text style={styles.value}>
                  {r.uitgevoerdOp ? `Uitgevoerd ${fmtDate(r.uitgevoerdOp)}${r.uitvoerder ? ` door ${r.uitvoerder.naam}` : ""}` : ""}
                  {r.risicoOordeelNa ? ` · ${r.risicoOordeelNa}` : ""}
                  {r.bevindingen ? ` · ${r.bevindingen}` : ""}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Meldingen */}
        {client.meldingen.length > 0 && (
          <View wrap={false}>
            <Text style={styles.h2}>Ongebruikelijke transacties</Text>
            {client.meldingen.map((m, i) => (
              <View key={i} style={{ marginBottom: 4 }}>
                <View style={styles.row}>
                  <Text style={styles.label}>€{m.bedrag.toFixed(2)} — {fmtDate(m.datumTransactie)}</Text>
                  <Text style={m.beslissing === "FIU_MELDING" ? styles.badgeRed : styles.badgeGreen}>{m.beslissing}</Text>
                </View>
                <Text style={{ color: "#444", marginLeft: 140 }}>{m.omschrijving}</Text>
                {m.fiuReferentie && <Text style={{ color: "#777", marginLeft: 140 }}>FIU-ref: {m.fiuReferentie}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Wwft Compliance Tool — vertrouwelijk</Text>
          <Text render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} van ${totalPages}`} />
          <Text>{fmt(exportedAt)}</Text>
        </View>
      </Page>
    </Document>
  );
}
