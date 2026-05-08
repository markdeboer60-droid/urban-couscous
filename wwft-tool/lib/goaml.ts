/**
 * goaml.ts — Generate goAML XML for FIU-NL unusual transaction reports.
 * Spec: FIU-NL goAML 4.x web schema (simplified for accountants / Wwft art. 16)
 */

import { escHtml } from "@/lib/utils";

interface GoamlMeldingParams {
  fiuReferentie?: string | null;
  datumTransactie: Date;
  bedrag: number;
  omschrijving: string;
  indicatorType: "SUBJECTIEF" | "OBJECTIEF";
  motivatie: string;
  onderbouwing: string;
  clientNaam: string;
  clientKvk?: string | null;
  kantoorNaam: string;
  kantoorKvk?: string | null;
  meldingId: string;
  afgerondOp: Date;
}



function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export function buildGoamlXml(p: GoamlMeldingParams): string {
  const indicatorCode = p.indicatorType === "OBJECTIEF" ? "O" : "S";
  const lines: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<report xmlns="http://www.fiu-nederland.nl/goaml/4"`,
    `        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"`,
    `        xsi:schemaLocation="http://www.fiu-nederland.nl/goaml/4 goAML_4.xsd">`,
    `  <rentity_id>${escHtml(p.kantoorKvk ?? p.meldingId)}</rentity_id>`,
    `  <rentity_branch>${escHtml(p.kantoorNaam)}</rentity_branch>`,
    `  <submission_code>E</submission_code>`,
    `  <report_code>STR</report_code>`,
    `  <submission_date>${isoDate(p.afgerondOp)}</submission_date>`,
    `  <currency_code_local>EUR</currency_code_local>`,
    `  <transaction>`,
    `    <transactionnumber>${escHtml(p.meldingId)}</transactionnumber>`,
    `    <transaction_location>NL</transaction_location>`,
    `    <date_transaction>${isoDate(p.datumTransactie)}</date_transaction>`,
    `    <teller>1</teller>`,
    `    <amount_local>${p.bedrag.toFixed(2)}</amount_local>`,
    `    <transaction_description>${escHtml(p.omschrijving)}</transaction_description>`,
    `    <reason>${escHtml(p.motivatie)}</reason>`,
    `    <indicator_type>${indicatorCode}</indicator_type>`,
    `    <additional_info>${escHtml(p.onderbouwing)}</additional_info>`,
    `    <t_from_my_client>`,
    `      <from_funds_code>U</from_funds_code>`,
    `      <from_country>NL</from_country>`,
    `      <entity>`,
    `        <name>${escHtml(p.clientNaam)}</name>`,
    p.clientKvk ? `        <registration_number>${escHtml(p.clientKvk)}</registration_number>` : "",
    `        <incorporation_legal_form>99</incorporation_legal_form>`,
    `        <incorporation_country_code>NL</incorporation_country_code>`,
    `      </entity>`,
    `    </t_from_my_client>`,
    `  </transaction>`,
    p.fiuReferentie
      ? `  <fiu_ref_number>${escHtml(p.fiuReferentie)}</fiu_ref_number>`
      : "",
    `</report>`,
  ];
  return lines.filter((l) => l !== "").join("\n");
}
