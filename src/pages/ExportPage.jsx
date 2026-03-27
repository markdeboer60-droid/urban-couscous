import { useState } from 'react';
import { ArrowLeft, FileText, FileDown, Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function ExportPage({ exportData, navigeer }) {
  const { docxPad, templateNaam } = exportData;
  const [pdfPad, setPdfPad] = useState(null);
  const [status, setStatus] = useState({});
  const standaardNaam = templateNaam.replace(/[^a-zA-Z0-9]/g, '_');

  async function voerUit(actie, label, fn) {
    setStatus(s => ({ ...s, [actie]: { bezig: true, fout: null, klaar: false } }));
    try {
      await fn();
      setStatus(s => ({ ...s, [actie]: { bezig: false, fout: null, klaar: true } }));
    } catch (e) {
      setStatus(s => ({ ...s, [actie]: { bezig: false, fout: e.message || 'Fout opgetreden', klaar: false } }));
    }
  }

  async function handleOpenInWord() {
    await voerUit('word', 'Open in Word', async () => {
      await window.api.export.openInWord(docxPad);
    });
  }

  async function handleOpslaanDocx() {
    const pad = await window.api.export.saveDocxAs({ srcPath: docxPad, standaardNaam: `${standaardNaam}.docx` });
    if (!pad) return;
    await voerUit('opslaanDocx', 'Opslaan', async () => { /* pad al opgeslagen */ });
  }

  async function handleExportPdf() {
    await voerUit('pdf', 'PDF exporteren', async () => {
      const pad = await window.api.export.exportPdf(docxPad);
      setPdfPad(pad);
    });
  }

  async function handleOpslaanPdf() {
    if (!pdfPad) return;
    const pad = await window.api.export.savePdfAs({ srcPath: pdfPad, standaardNaam: `${standaardNaam}.pdf` });
    if (!pad) return;
    await voerUit('opslaanPdf', 'PDF opslaan', async () => { /* pad al opgeslagen */ });
  }

  async function handleEmail(bijlagePad, statusSleutel) {
    await voerUit(statusSleutel, 'E-mail', async () => {
      await window.api.export.sendEmail({ bijlagePad });
    });
  }

  return (
    <div className="p-8 max-w-xl mx-auto">
      <button
        onClick={() => navigeer('browser')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Terug naar overzicht
      </button>

      <div className="mb-8">
        <div className="flex items-center justify-center w-14 h-14 bg-green-100 rounded-full mb-4">
          <CheckCircle size={28} className="text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Document klaar</h1>
        <p className="text-gray-500 mt-1 text-sm">
          <span className="font-medium text-gray-700">{templateNaam}</span> is gegenereerd.
          Kies hieronder wat je wilt doen.
        </p>
      </div>

      {/* Word sectie */}
      <Sectie titel="Word-document" icoon={<FileText size={18} className="text-blue-600" />}>
        <ActieKnop
          label="Openen in Word"
          beschrijving="Bewerk het document verder in Microsoft Word"
          onClick={handleOpenInWord}
          staat={status.word}
          variant="primair"
        />
        <ActieKnop
          label="Opslaan als .docx"
          beschrijving="Sla het Word-bestand op een locatie naar keuze op"
          onClick={handleOpslaanDocx}
          staat={status.opslaanDocx}
        />
        <ActieKnop
          label="Versturen als bijlage (Word)"
          beschrijving="Opent Outlook of Gmail met dit bestand als bijlage"
          onClick={() => handleEmail(docxPad, 'emailDocx')}
          staat={status.emailDocx}
          icoon={<Mail size={14} />}
        />
      </Sectie>

      {/* PDF sectie */}
      <Sectie titel="PDF" icoon={<FileDown size={18} className="text-red-500" />} className="mt-4">
        {!pdfPad ? (
          <ActieKnop
            label="Converteren naar PDF"
            beschrijving="Gebruikt Microsoft Word om de PDF te genereren"
            onClick={handleExportPdf}
            staat={status.pdf}
            variant="primair"
          />
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-4 py-2.5 rounded-lg mb-3">
              <CheckCircle size={15} />
              PDF aangemaakt
            </div>
            <ActieKnop
              label="Opslaan als PDF"
              beschrijving="Sla de PDF op een locatie naar keuze op"
              onClick={handleOpslaanPdf}
              staat={status.opslaanPdf}
            />
            <ActieKnop
              label="Versturen als bijlage (PDF)"
              beschrijving="Opent Outlook of Gmail met de PDF als bijlage"
              onClick={() => handleEmail(pdfPad, 'emailPdf')}
              staat={status.emailPdf}
              icoon={<Mail size={14} />}
            />
          </>
        )}
      </Sectie>

      <button
        onClick={() => navigeer('browser')}
        className="mt-8 w-full py-2.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
      >
        Nieuw document starten
      </button>
    </div>
  );
}

function Sectie({ titel, icoon, children, className = '' }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-gray-700">
        {icoon}
        {titel}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function ActieKnop({ label, beschrijving, onClick, staat = {}, variant = 'secundair', icoon }) {
  const { bezig, fout, klaar } = staat;

  return (
    <div>
      <button
        onClick={onClick}
        disabled={bezig}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
          variant === 'primair'
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
        }`}
      >
        {bezig ? (
          <Loader2 size={15} className="animate-spin shrink-0" />
        ) : klaar ? (
          <CheckCircle size={15} className="shrink-0 text-green-500" />
        ) : icoon ? (
          <span className="shrink-0">{icoon}</span>
        ) : null}
        <div className="flex-1 text-left">
          <div>{label}</div>
          {beschrijving && (
            <div className={`text-xs mt-0.5 font-normal ${variant === 'primair' ? 'text-blue-200' : 'text-gray-400'}`}>
              {beschrijving}
            </div>
          )}
        </div>
      </button>
      {fout && (
        <div className="flex items-center gap-2 mt-1.5 text-xs text-red-600">
          <AlertCircle size={13} />
          {fout}
        </div>
      )}
    </div>
  );
}
