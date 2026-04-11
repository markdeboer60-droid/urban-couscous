import { useEffect, useState } from 'react';
import { History, Trash2, FileText, RotateCcw, FolderOpen, Loader2, Search, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { formatDatumTijd } from '../utils/formatDatum';
import { useToast } from '../context/ToastContext';

export default function GeschiedenisPage({ navigeer }) {
  const showToast = useToast();
  const [geschiedenis, setGeschiedenis] = useState([]);
  const [laden, setLaden] = useState(true);
  const [verwijderBevestig, setVerwijderBevestig] = useState(null);
  const [exportBezig, setExportBezig] = useState({});
  const [exportFout, setExportFout] = useState({});
  const [zoekterm, setZoekterm] = useState('');
  const [sortering, setSortering] = useState('datum-nieuw');
  const [actieveCategorie, setActieveCategorie] = useState('alle');
  const [ingeklapt, setIngeklapt] = useState(() => {
    try { return localStorage.getItem('geschiedenis-sidebar-ingeklapt') === 'true'; } catch { return false; }
  });

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
    showToast('Document verwijderd uit geschiedenis', 'info');
  }

  async function openInWord(entry) {
    setExportBezig(b => ({ ...b, [entry.id]: 'word' }));
    setExportFout(f => ({ ...f, [entry.id]: null }));
    try {
      await window.api.export.openInWord(entry.docxPad);
    } catch {
      setExportFout(f => ({ ...f, [entry.id]: 'Bestand niet gevonden — mogelijk verplaatst of verwijderd. Genereer het document opnieuw via "Opnieuw bewerken".' }));
    } finally {
      setExportBezig(b => ({ ...b, [entry.id]: null }));
    }
  }

  function herBewerken(entry) {
    navigeer('form', { templateId: entry.templateId, initieleWaarden: entry.values });
  }

  function toggleSidebar() {
    setIngeklapt(v => {
      const nieuw = !v;
      try { localStorage.setItem('geschiedenis-sidebar-ingeklapt', String(nieuw)); } catch {}
      return nieuw;
    });
  }

  const categorieen = [...new Set(geschiedenis.map(e => e.categorie || '').filter(Boolean))].sort();

  const gefilterd = geschiedenis
    .filter(e =>
      (actieveCategorie === 'alle' || (e.categorie || '') === actieveCategorie) &&
      (!zoekterm ||
        e.templateNaam.toLowerCase().includes(zoekterm.toLowerCase()) ||
        (e.ondertitel || '').toLowerCase().includes(zoekterm.toLowerCase()) ||
        (e.categorie || '').toLowerCase().includes(zoekterm.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortering === 'datum-nieuw') return new Date(b.datum) - new Date(a.datum);
      if (sortering === 'datum-oud') return new Date(a.datum) - new Date(b.datum);
      if (sortering === 'naam') return a.templateNaam.localeCompare(b.templateNaam);
      return 0;
    });

  if (laden) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-full">
      {/* Zijmenu — alleen tonen als er categorieën zijn */}
      {categorieen.length > 0 && (
        <aside className={`${ingeklapt ? 'w-14' : 'w-48'} shrink-0 bg-gray-50 border-r border-gray-200 flex flex-col transition-all duration-200 overflow-hidden`}>
          <div className={`flex items-center border-b border-gray-200 ${ingeklapt ? 'justify-center px-0 py-3' : 'justify-between px-3 py-3'}`}>
            {!ingeklapt && <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Categorie</span>}
            <button
              onClick={toggleSidebar}
              title={ingeklapt ? 'Uitklappen' : 'Inklappen'}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors shrink-0"
            >
              {ingeklapt ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
            </button>
          </div>

          <nav className={`flex-1 py-3 space-y-0.5 ${ingeklapt ? 'px-1.5' : 'px-2'}`}>
            {/* "Alle" knop */}
            <button
              onClick={() => setActieveCategorie('alle')}
              title={ingeklapt ? 'Alle' : undefined}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                actieveCategorie === 'alle'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              } ${ingeklapt ? 'justify-center' : ''}`}
            >
              <History size={15} className="shrink-0" />
              {!ingeklapt && <span className="flex-1 text-left">Alle</span>}
            </button>

            {categorieen.map(cat => (
              <button
                key={cat}
                onClick={() => setActieveCategorie(cat === actieveCategorie ? 'alle' : cat)}
                title={ingeklapt ? cat : undefined}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  actieveCategorie === cat
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                } ${ingeklapt ? 'justify-center' : ''}`}
              >
                <FileText size={15} className="shrink-0" />
                {!ingeklapt && <span className="flex-1 text-left truncate">{cat}</span>}
              </button>
            ))}
          </nav>
        </aside>
      )}

      {/* Hoofdinhoud */}
      <div className="flex-1 p-8 overflow-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Geschiedenis</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {geschiedenis.length} gegenereerd{geschiedenis.length !== 1 ? 'e' : ''} document{geschiedenis.length !== 1 ? 'en' : ''}
          </p>
        </div>

        {geschiedenis.length > 0 && (
          <div className="flex gap-3 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Zoeken op naam, klant of categorie..."
                value={zoekterm}
                onChange={e => setZoekterm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <select
              value={sortering}
              onChange={e => setSortering(e.target.value)}
              className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-600"
            >
              <option value="datum-nieuw">Nieuwst eerst</option>
              <option value="datum-oud">Oudst eerst</option>
              <option value="naam">Naam A–Z</option>
            </select>
          </div>
        )}

        {geschiedenis.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-gray-400">
            <History size={40} className="mb-3 opacity-40" />
            <p className="text-sm">Nog geen documenten gegenereerd</p>
          </div>
        ) : gefilterd.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <Search size={32} className="mb-3 opacity-30" />
            <p className="text-sm">Geen resultaten voor deze zoekopdracht</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {gefilterd.map((entry, i) => (
              <div
                key={entry.id}
                className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors ${i < gefilterd.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                {/* Icoon */}
                <div className="p-2 bg-blue-50 rounded-lg shrink-0">
                  <FileText size={16} className="text-blue-600" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 truncate">{entry.templateNaam}</div>
                  {entry.ondertitel && (
                    <div className="text-sm text-gray-700 truncate font-medium">{entry.ondertitel}</div>
                  )}
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                      {entry.categorie}
                    </span>
                    <span className="text-xs text-gray-400">{formatDatumTijd(entry.datum)}</span>
                  </div>
                </div>

                {/* Acties */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {exportFout[entry.id] && (
                    <span className="text-xs text-red-500">{exportFout[entry.id]}</span>
                  )}
                  <div className="flex items-center gap-1">
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
              </div>
            ))}
          </div>
        )}

        {verwijderBevestig && (
          <ConfirmDialog
            titel="Document verwijderen?"
            omschrijving="Het document wordt verwijderd uit de geschiedenis en van de schijf."
            bevestigLabel="Verwijderen"
            onBevestig={() => verwijder(verwijderBevestig)}
            onAnnuleer={() => setVerwijderBevestig(null)}
          />
        )}
      </div>
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
