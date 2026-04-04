import { useEffect, useState } from 'react';
import {
  ArrowLeft, FileText, FileDown, Mail, Loader2, CheckCircle,
  AlertCircle, ExternalLink, Cloud, ArrowRight, Printer, PenLine, User,
} from 'lucide-react';

function berekenBestandsnaam(patroon, templateNaam, values) {
  const sanitize = s => s
    .replace(/[<>:"/\\|?*]/g, '')  // verboden tekens
    .replace(/\s+/g, '_')          // spaties → underscore
    .replace(/_+/g, '_')           // meerdere underscores samenvoegen
    .replace(/^_|_$/g, '')         // leading/trailing underscore weg
    .trim();

  if (!patroon) return sanitize(templateNaam) || 'document';

  const datum = new Date().toISOString().slice(0, 10);
  let naam = patroon
    .replace(/\{datum\}/g, datum)
    .replace(/\{templatenaam\}/g, sanitize(templateNaam));
  // Vervang veldsleutels; ontbrekende waarden → lege string
  naam = naam.replace(/\{(\w+)\}/g, (_, key) => {
    const val = values[key];
    return val != null && val !== '' ? sanitize(String(val)) : '';
  });
  return sanitize(naam) || sanitize(templateNaam) || 'document';
}

export default function ExportPage({ exportData, navigeer }) {
  const { templateId, templateNaam, values = {}, bestandsnaamPatroon } = exportData;
  const [docxPad, setDocxPad] = useState(exportData.docxPad);
  const [pdfPad, setPdfPad] = useState(null);
  const [status, setStatus] = useState({});
  const [opgeslagenDocxPad, setOpgeslagenDocxPad] = useState(null);
  const [opgeslagenPdfPad, setOpgeslagenPdfPad] = useState(null);
  const [oneDrivePad, setOneDrivePad] = useState(null);
  const [alleTemplates, setAlleTemplates] = useState([]);
  const [vervolgTemplate, setVervolgTemplate] = useState('');
  const [ondertekenaars, setOndertekenaars] = useState([]);
  const [handtekeningPaden, setHandtekeningPaden] = useState({});
  const [getekendDoor, setGetekendDoor] = useState(null);
  const [tekeningBezig, setTekeningBezig] = useState(false);
  const standaardNaam = berekenBestandsnaam(bestandsnaamPatroon, templateNaam, values);

  useEffect(() => {
    window.api.settings.getOneDrivePad().then(p => setOneDrivePad(p));
    window.api.templates.getAll().then(setAlleTemplates);
    window.api.settings.get().then(s => {
      setOndertekenaars(s.ondertekenaars || []);
      setHandtekeningPaden(s.handtekeningPaden || {});
    });
  }, []);

  async function tekenDocument(naam) {
    if (!templateId) return;
    setTekeningBezig(true);
    try {
      const nieuwPad = await window.api.export.tekenDocument({ templateId, values, ondertekekenaarNaam: naam });
      setDocxPad(nieuwPad);
      setPdfPad(null); // PDF opnieuw genereren na tekenen
      setGetekendDoor(naam);
      setStatus({});
    } catch (e) {
      alert('Ondertekenen mislukt: ' + (e.message || e));
    } finally {
      setTekeningBezig(false);
    }
  }

  async function voerUit(actie, fn) {
    setStatus(s => ({ ...s, [actie]: { bezig: true, fout: null, klaar: false } }));
    try {
      await fn();
      setStatus(s => ({ ...s, [actie]: { bezig: false, fout: null, klaar: true } }));
    } catch (e) {
      setStatus(s => ({ ...s, [actie]: { bezig: false, fout: e.message || 'Fout opgetreden', klaar: false } }));
    }
  }

  async function handleOpenInWord() {
    await voerUit('word', () => window.api.export.openInWord(docxPad));
  }

  async function handleOpslaanDocx(defaultDir = null) {
    const pad = await window.api.export.saveDocxAs({
      srcPath: docxPad,
      standaardNaam: `${standaardNaam}.docx`,
      defaultDir,
    });
    if (!pad) return;
    setOpgeslagenDocxPad(pad);
    await voerUit(defaultDir ? 'opslaanDocxOneDrive' : 'opslaanDocx', async () => {});
  }

  async function handleExportPdf() {
    await voerUit('pdf', async () => {
      const pad = await window.api.export.exportPdf(docxPad);
      setPdfPad(pad);
    });
  }

  async function handleOpslaanPdf(defaultDir = null) {
    if (!pdfPad) return;
    const pad = await window.api.export.savePdfAs({
      srcPath: pdfPad,
      standaardNaam: `${standaardNaam}.pdf`,
      defaultDir,
    });
    if (!pad) return;
    setOpgeslagenPdfPad(pad);
    await voerUit(defaultDir ? 'opslaanPdfOneDrive' : 'opslaanPdf', async () => {});
  }

  async function handleEmail(bijlagePad, statusSleutel) {
    await voerUit(statusSleutel, () => window.api.export.sendEmail({ bijlagePad }));
  }

  function handleVervolgTemplate() {
    if (!vervolgTemplate) return;
    navigeer('form', { templateId: vervolgTemplate, initieleWaarden: values });
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

      {/* Ondertekenen sectie — alleen tonen als er ondertekenaars zijn geconfigureerd */}
      {ondertekenaars.length > 0 && (
        <Sectie
          titel="Definitief ondertekenen"
          icoon={<PenLine size={18} className="text-indigo-600" />}
          className="mb-4"
        >
          {getekendDoor ? (
            <div className="flex items-center gap-2.5 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-lg text-sm text-indigo-800">
              <CheckCircle size={16} className="text-indigo-600 shrink-0" />
              <div>
                <span className="font-medium">Getekend door {getekendDoor}</span>
                <span className="text-indigo-500 text-xs ml-2">— document opnieuw gegenereerd met handtekening</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 -mt-1 mb-1">
              Kies de ondertekenaar. Het document wordt opnieuw gegenereerd met de handtekening op de plek van <code className="bg-gray-100 px-1 rounded text-gray-600">{'{%handtekening}'}</code> in het sjabloon.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {ondertekenaars.map(naam => {
              const heeftHandtekening = !!handtekeningPaden[naam];
              return (
                <button
                  key={naam}
                  onClick={() => tekenDocument(naam)}
                  disabled={tekeningBezig || !heeftHandtekening}
                  title={!heeftHandtekening ? 'Geen handtekening geconfigureerd in Instellingen' : `Ondertekenen als ${naam}`}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border ${
                    getekendDoor === naam
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-400 hover:text-indigo-700 hover:bg-indigo-50'
                  }`}
                >
                  {tekeningBezig && getekendDoor !== naam ? (
                    <Loader2 size={14} className="animate-spin shrink-0" />
                  ) : (
                    <User size={14} className="shrink-0" />
                  )}
                  {naam}
                  {!heeftHandtekening && <span className="text-xs opacity-60 ml-1">(geen handtekening)</span>}
                </button>
              );
            })}
          </div>
        </Sectie>
      )}

      {/* Word sectie */}
      <Sectie titel="Word-document" icoon={<FileText size={18} className="text-blue-600" />}>
        <ActieKnop
          label="Openen in Word"
          beschrijving="Bewerk het document verder in Microsoft Word"
          onClick={handleOpenInWord}
          staat={status.word}
          variant="primair"
        />
        <div>
          <ActieKnop
            label="Opslaan als .docx"
            beschrijving="Sla het Word-bestand op een locatie naar keuze op"
            onClick={() => handleOpslaanDocx()}
            staat={status.opslaanDocx}
          />
          {opgeslagenDocxPad && !status.opslaanDocxOneDrive?.klaar && (
            <OpenLink pad={opgeslagenDocxPad} />
          )}
        </div>
        {oneDrivePad && (
          <div>
            <ActieKnop
              label="Opslaan in OneDrive (.docx)"
              beschrijving={oneDrivePad}
              onClick={() => handleOpslaanDocx(oneDrivePad)}
              staat={status.opslaanDocxOneDrive}
              icoon={<Cloud size={14} />}
            />
            {status.opslaanDocxOneDrive?.klaar && opgeslagenDocxPad && (
              <OpenLink pad={opgeslagenDocxPad} />
            )}
          </div>
        )}
        <ActieKnop
          label="Afdrukken (Word)"
          beschrijving="Opent het afdrukdialoogvenster via Microsoft Word"
          onClick={() => voerUit('printDocx', () => window.api.export.print(docxPad))}
          staat={status.printDocx}
          icoon={<Printer size={14} />}
        />
        <ActieKnop
          label="Versturen als bijlage (Word)"
          beschrijving="Opent Outlook met dit bestand als bijlage"
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
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-4 py-2.5 rounded-lg">
              <CheckCircle size={15} />
              PDF aangemaakt
            </div>
            <div>
              <ActieKnop
                label="Opslaan als PDF"
                beschrijving="Sla de PDF op een locatie naar keuze op"
                onClick={() => handleOpslaanPdf()}
                staat={status.opslaanPdf}
              />
              {opgeslagenPdfPad && !status.opslaanPdfOneDrive?.klaar && (
                <OpenLink pad={opgeslagenPdfPad} />
              )}
            </div>
            {oneDrivePad && (
              <div>
                <ActieKnop
                  label="Opslaan in OneDrive (.pdf)"
                  beschrijving={oneDrivePad}
                  onClick={() => handleOpslaanPdf(oneDrivePad)}
                  staat={status.opslaanPdfOneDrive}
                  icoon={<Cloud size={14} />}
                />
                {status.opslaanPdfOneDrive?.klaar && opgeslagenPdfPad && (
                  <OpenLink pad={opgeslagenPdfPad} />
                )}
              </div>
            )}
            <ActieKnop
              label="Afdrukken (PDF)"
              beschrijving="Opent het afdrukdialoogvenster voor de PDF"
              onClick={() => voerUit('printPdf', () => window.api.export.print(pdfPad))}
              staat={status.printPdf}
              icoon={<Printer size={14} />}
            />
            <ActieKnop
              label="Versturen als bijlage (PDF)"
              beschrijving="Opent Outlook met de PDF als bijlage"
              onClick={() => handleEmail(pdfPad, 'emailPdf')}
              staat={status.emailPdf}
              icoon={<Mail size={14} />}
            />
          </>
        )}
      </Sectie>

      {/* Vervolgsjabloon */}
      {alleTemplates.length > 0 && (
        <Sectie
          titel="Vervolgdocument met dezelfde gegevens"
          icoon={<ArrowRight size={18} className="text-purple-600" />}
          className="mt-4"
        >
          <p className="text-xs text-gray-400 -mt-1">
            Kies een sjabloon — overeenkomende velden worden automatisch overgenomen.
          </p>
          <div className="flex gap-2">
            <select
              value={vervolgTemplate}
              onChange={e => setVervolgTemplate(e.target.value)}
              className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
            >
              <option value="">— Kies een sjabloon —</option>
              {alleTemplates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.naam}{t.categorie ? ` (${t.categorie})` : ''}
                </option>
              ))}
            </select>
            <button
              onClick={handleVervolgTemplate}
              disabled={!vervolgTemplate}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              <ArrowRight size={15} />
              Starten
            </button>
          </div>
        </Sectie>
      )}

    </div>
  );
}

function OpenLink({ pad }) {
  const bestandsnaam = pad.split(/[\\/]/).pop();
  return (
    <button
      onClick={() => window.api.export.openInWord(pad)}
      className="flex items-center gap-1.5 mt-1.5 ml-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
    >
      <ExternalLink size={11} />
      {bestandsnaam} openen
    </button>
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
            <div className={`text-xs mt-0.5 font-normal truncate ${variant === 'primair' ? 'text-blue-200' : 'text-gray-400'}`}>
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
