import { useEffect, useState } from 'react';
import { History, Trash2, FileText, RotateCcw, FolderOpen, Loader2, AlertCircle } from 'lucide-react';

export default function GeschiedenisPage({ navigeer }) {
  const [geschiedenis, setGeschiedenis] = useState([]);
  const [laden, setLaden] = useState(true);
  const [verwijderBevestig, setVerwijderBevestig] = useState(null);
  const [exportBezig, setExportBezig] = useState({});

  useEffect(() => {
    laad();
  }, []);

  async function laad() {
    const data = await window.api.history.getAll();
    setGeschiedenis(data);
    setLaden(false);
  }

  async function verwijder(id) {
    await window.api.history.delete(id);
    setVerwijderBevestig(null);
    setGeschiedenis(g => g.filter(e => e.id !== id));
  }

  async function openInWord(entry) {
    setExportBezig(b => ({ ...b, [entry.id]: 'word' }));
    try {
      await window.api.export.openInWord(entry.docxPad);
    } finally {
      setExportBezig(b => ({ ...b, [entry.id]: null }));
    }
  }

  function herBewerken(entry) {
    navigeer('form', { templateId: entry.templateId, initieleWaarden: entry.values });
  }

  function formatDatum(iso) {
    return new Date(iso).toLocaleString('nl-NL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  if (laden) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Geschiedenis</h1>
        <p className="text-gray-500 mt-1 text-sm">
          {geschiedenis.length} gegenereerd{geschiedenis.length !== 1 ? 'e' : ''} document{geschiedenis.length !== 1 ? 'en' : ''}
        </p>
      </div>

      {geschiedenis.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-gray-400">
          <History size={40} className="mb-3 opacity-40" />
          <p className="text-sm">Nog geen documenten gegenereerd</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {geschiedenis.map((entry, i) => (
            <div
              key={entry.id}
              className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors ${i < geschiedenis.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              {/* Icoon */}
              <div className="p-2 bg-blue-50 rounded-lg shrink-0">
                <FileText size={16} className="text-blue-600" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-900 truncate">{entry.templateNaam}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                    {entry.categorie}
                  </span>
                  <span className="text-xs text-gray-400">{formatDatum(entry.datum)}</span>
                </div>
              </div>

              {/* Acties */}
              <div className="flex items-center gap-1 shrink-0">
                <KnopActie
                  titel="Openen in Word"
                  icoon={<FolderOpen size={15} />}
                  bezig={exportBezig[entry.id] === 'word'}
                  onClick={() => openInWord(entry)}
                />
                <KnopActie
                  titel="Opnieuw bewerken"
                  icoon={<RotateCcw size={15} />}
                  onClick={() => herBewerken(entry)}
                />
                <KnopActie
                  titel="Verwijderen"
                  icoon={<Trash2 size={15} />}
                  gevaarlijk
                  onClick={() => setVerwijderBevestig(entry.id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Verwijder bevestiging */}
      {verwijderBevestig && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg shrink-0">
                <AlertCircle size={18} className="text-red-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Document verwijderen?</div>
                <div className="text-sm text-gray-500 mt-1">
                  Het document wordt verwijderd uit de geschiedenis en van de schijf.
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setVerwijderBevestig(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Annuleren
              </button>
              <button
                onClick={() => verwijder(verwijderBevestig)}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Verwijderen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KnopActie({ titel, icoon, onClick, bezig, gevaarlijk }) {
  return (
    <button
      onClick={onClick}
      disabled={bezig}
      title={titel}
      className={`p-2 rounded-lg transition-colors disabled:opacity-40 ${
        gevaarlijk
          ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
          : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
      }`}
    >
      {bezig ? <Loader2 size={15} className="animate-spin" /> : icoon}
    </button>
  );
}
