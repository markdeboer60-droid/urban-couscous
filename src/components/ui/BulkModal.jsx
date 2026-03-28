import { useRef, useState } from 'react';
import { X, Upload, FolderOpen, Loader2, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { parseCSV } from '../../utils/parseCSV';

export default function BulkModal({ template, onSluit }) {
  const [csvTekst, setCsvTekst] = useState('');
  const [rijen, setRijen] = useState(null);
  const [parseError, setParseError] = useState('');
  const [opslagMap, setOpslagMap] = useState('');
  const [bezig, setBezig] = useState(false);
  const [voortgang, setVoortgang] = useState(0);  // huidig aantal verwerkt
  const [resultaat, setResultaat] = useState(null);
  const bestandRef = useRef(null);

  function verwerkCSV(tekst) {
    setCsvTekst(tekst);
    setParseError('');
    setResultaat(null);
    if (!tekst.trim()) { setRijen(null); return; }
    const geparseerd = parseCSV(tekst);
    if (geparseerd.length === 0) {
      setParseError('Geen geldige rijen gevonden. Zorg voor een headerregel en ten minste één datarij.');
      setRijen(null);
    } else {
      setRijen(geparseerd);
    }
  }

  function onBestandLaden(e) {
    const bestand = e.target.files?.[0];
    if (!bestand) return;
    const reader = new FileReader();
    reader.onload = ev => verwerkCSV(ev.target.result);
    reader.readAsText(bestand, 'utf-8');
    e.target.value = '';
  }

  async function kiesMap() {
    const map = await window.api.settings.selectDir();
    if (map) setOpslagMap(map);
  }

  async function genereer() {
    if (!rijen?.length || !opslagMap) return;
    setBezig(true);
    setVoortgang(0);
    setResultaat(null);

    const paden = [];
    const fouten = [];

    for (let i = 0; i < rijen.length; i++) {
      try {
        const docxPad = await window.api.export.generateDocx({
          templateId: template.id,
          values: rijen[i],
        });
        const naamBase = Object.values(rijen[i]).filter(Boolean).slice(0, 2)
          .join('_').replace(/[^a-zA-Z0-9_\-]/g, '_') || `rij_${i + 1}`;
        const naam = `${template.naam.replace(/[^a-zA-Z0-9]/g, '_')}_${naamBase}_${i + 1}.docx`;
        const pad = await window.api.export.saveDocxToDir({ srcPath: docxPad, opslagMap, naam });
        paden.push(pad);
      } catch (e) {
        fouten.push({ rij: i + 1, fout: e.message || String(e) });
      }
      setVoortgang(i + 1);
    }

    setResultaat({ paden, fouten });
    setBezig(false);
  }

  const veldSleutels = (template.velden || []).map(v => v.sleutel);
  const csvHeaders = rijen ? Object.keys(rijen[0] || {}) : [];
  const ontbrekendeKolommen = veldSleutels.filter(s => !csvHeaders.includes(s));
  const totaal = rijen?.length ?? 0;
  const voortgangPct = totaal > 0 ? Math.round((voortgang / totaal) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Bulk opmaken</h2>
            <p className="text-xs text-gray-500 mt-0.5">{template.naam}</p>
          </div>
          <button onClick={onSluit} disabled={bezig} className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-40">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Instructie */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs text-blue-700">
            Upload een CSV of plak de inhoud hieronder. Eerste rij = kolomnamen.{' '}
            {veldSleutels.length > 0 ? (
              <>Verwachte kolommen: {veldSleutels.map(s => <code key={s} className="bg-blue-100 px-1 rounded mx-0.5">{s}</code>)}</>
            ) : (
              <span className="italic">geen velden gedefinieerd voor dit sjabloon</span>
            )}
          </div>

          {/* CSV upload */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-xs font-medium text-gray-600">CSV-bestand of plakken</label>
              <button
                onClick={() => bestandRef.current?.click()}
                className="flex items-center gap-1.5 text-xs text-blue-600 border border-blue-200 px-2.5 py-1.5 rounded-lg hover:bg-blue-50"
              >
                <Upload size={12} />
                Bestand kiezen
              </button>
              <input ref={bestandRef} type="file" accept=".csv,.txt" className="hidden" onChange={onBestandLaden} />
            </div>
            <textarea
              value={csvTekst}
              onChange={e => verwerkCSV(e.target.value)}
              rows={6}
              placeholder={'bedrijfsnaam;klantnaam\nAcme BV;Jan Jansen\nBeta BV;Piet Pietersen'}
              className="invoer font-mono text-xs resize-y"
              disabled={bezig}
            />
            {parseError && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle size={12} /> {parseError}
              </p>
            )}
          </div>

          {/* Preview */}
          {rijen && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={13} className="text-green-500" />
                <span className="text-xs font-medium text-gray-700">{rijen.length} rij{rijen.length !== 1 ? 'en' : ''} gevonden</span>
                {ontbrekendeKolommen.length > 0 && (
                  <span className="text-xs text-amber-600">
                    Ontbrekend: {ontbrekendeKolommen.join(', ')}
                  </span>
                )}
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-200 max-h-40">
                <table className="text-xs w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      {csvHeaders.map(h => (
                        <th key={h} className={`px-3 py-2 text-left font-medium ${veldSleutels.includes(h) ? 'text-blue-700' : 'text-gray-400'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rijen.slice(0, 5).map((rij, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {csvHeaders.map(h => (
                          <td key={h} className="px-3 py-1.5 text-gray-700 truncate max-w-[150px]">{rij[h]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rijen.length > 5 && (
                <p className="mt-1 text-xs text-gray-400">… en {rijen.length - 5} meer rijen</p>
              )}
            </div>
          )}

          {/* Opslagmap */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Opslagmap</label>
            <div className="flex gap-2">
              <div className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 truncate text-gray-700">
                {opslagMap || <span className="text-gray-400">Nog geen map gekozen</span>}
              </div>
              <button
                onClick={kiesMap}
                disabled={bezig}
                className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 shrink-0 disabled:opacity-40"
              >
                <FolderOpen size={15} />
                Kiezen
              </button>
            </div>
          </div>

          {/* Voortgang */}
          {bezig && (
            <div>
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Loader2 size={12} className="animate-spin" />
                  Genereren… {voortgang} / {totaal}
                </span>
                <span>{voortgangPct}%</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${voortgangPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Resultaat */}
          {resultaat && !bezig && (
            <div className={`rounded-xl px-4 py-4 text-sm ${resultaat.fouten.length === 0 ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
              <div className="flex items-center gap-2 font-semibold mb-2">
                {resultaat.fouten.length === 0
                  ? <><CheckCircle size={15} /> {resultaat.paden.length} document{resultaat.paden.length !== 1 ? 'en' : ''} gegenereerd</>
                  : <><AlertCircle size={15} /> {resultaat.paden.length} geslaagd, {resultaat.fouten.length} mislukt</>
                }
              </div>
              {resultaat.fouten.map((f, i) => (
                <p key={i} className="text-xs mt-1">Rij {f.rij}: {f.fout}</p>
              ))}
              {resultaat.paden.length > 0 && (
                <button
                  onClick={() => window.api.export.openInWord(opslagMap)}
                  className="mt-3 text-xs font-medium underline"
                >
                  Map openen
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onSluit} disabled={bezig} className="px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">
            Sluiten
          </button>
          <button
            onClick={genereer}
            disabled={!rijen?.length || !opslagMap || bezig}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40"
          >
            {bezig ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            {bezig ? `Bezig (${voortgang}/${totaal})…` : `${totaal || 0} document${totaal !== 1 ? 'en' : ''} genereren`}
          </button>
        </div>
      </div>
    </div>
  );
}
