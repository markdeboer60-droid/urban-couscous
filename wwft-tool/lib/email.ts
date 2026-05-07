/**
 * email.ts — nodemailer wrapper with SMTP config from env.
 * Falls back to console.log when SMTP is not configured.
 */

import nodemailer from "nodemailer";

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail(opts: MailOptions): Promise<void> {
  const from = process.env.SMTP_FROM ?? "Wwft Compliance <noreply@wwft.local>";
  const transporter = getTransporter();

  if (!transporter) {
    // No SMTP configured — log to console for development
    console.log("[EMAIL] No SMTP configured. Would have sent:");
    console.log(`  To: ${opts.to}`);
    console.log(`  Subject: ${opts.subject}`);
    return;
  }

  await transporter.sendMail({ from, ...opts });
}

export function reviewReminderHtml(params: {
  clientNaam: string;
  volgendeReviewOp: Date;
  medewerkerNaam: string;
  dossierUrl: string;
}): string {
  const datum = params.volgendeReviewOp.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#1d4ed8">Wwft Compliance Tool — Periodieke review</h2>
      <p>Beste ${params.medewerkerNaam},</p>
      <p>Er is een periodieke review gepland voor cliënt <strong>${params.clientNaam}</strong>.</p>
      <p><strong>Uiterste reviewdatum:</strong> ${datum}</p>
      <p>
        <a href="${params.dossierUrl}"
           style="background:#1d4ed8;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;display:inline-block;margin-top:8px">
          Open dossier
        </a>
      </p>
      <hr style="margin-top:32px;border:none;border-top:1px solid #e5e7eb"/>
      <p style="font-size:12px;color:#6b7280">Wwft Compliance Tool — automatisch bericht</p>
    </div>
  `;
}

export function dossierGoedgekeurdHtml(params: {
  clientNaam: string;
  medewerkerNaam: string;
  partnerNaam: string;
  risicoOordeel: string;
  dossierUrl: string;
}): string {
  const risicoKleur = params.risicoOordeel === "HOOG" ? "#dc2626" : params.risicoOordeel === "MIDDEN" ? "#d97706" : "#16a34a";
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#16a34a">Wwft Compliance Tool — Dossier goedgekeurd</h2>
      <p>Beste ${params.medewerkerNaam},</p>
      <p>Partner <strong>${params.partnerNaam}</strong> heeft het dossier van cliënt
         <strong>${params.clientNaam}</strong> goedgekeurd en afgesloten.</p>
      <p>Vastgesteld risicoprofiel: <strong style="color:${risicoKleur}">${params.risicoOordeel}</strong></p>
      <p>
        <a href="${params.dossierUrl}"
           style="background:#16a34a;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;display:inline-block;margin-top:8px">
          Dossier bekijken
        </a>
      </p>
      <hr style="margin-top:32px;border:none;border-top:1px solid #e5e7eb"/>
      <p style="font-size:12px;color:#6b7280">Wwft Compliance Tool — automatisch bericht</p>
    </div>
  `;
}

export function highRiskAlertHtml(params: {
  clientNaam: string;
  medewerkerNaam: string;
  partnerNaam: string;
  dossierUrl: string;
}): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#dc2626">Wwft Compliance Tool — Hoog risico cliënt ter goedkeuring</h2>
      <p>Beste ${params.partnerNaam},</p>
      <p>Medewerker <strong>${params.medewerkerNaam}</strong> heeft cliënt <strong>${params.clientNaam}</strong>
         beoordeeld als <strong>HOOG risico</strong>. Uw goedkeuring is vereist.</p>
      <p>
        <a href="${params.dossierUrl}"
           style="background:#dc2626;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;display:inline-block;margin-top:8px">
          Beoordelen en goedkeuren
        </a>
      </p>
      <hr style="margin-top:32px;border:none;border-top:1px solid #e5e7eb"/>
      <p style="font-size:12px;color:#6b7280">Wwft Compliance Tool — automatisch bericht</p>
    </div>
  `;
}
