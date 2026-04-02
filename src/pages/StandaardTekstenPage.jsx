import { useEffect, useMemo, useState } from 'react';
import { Plus, Copy, Check, Pencil, Trash2, BookOpen } from 'lucide-react';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToast } from '../context/ToastContext';

export default function StandaardTekstenPage() {
  const showToast = useToast();
  const [teksten, setTeksten]           = useState([]);
  const [actieveCategorie, setActieve]  = useState('alle');
  const [bewerkId, setBewerkId]         = useState(null);
  const [bewerkData, setBewerkData]     = useState({});
  const [toevoegOpen, setToevoegOpen]   = useState(false);
  const [nieuw, setNieuw]               = useState({ categorie: '', vraag: '', antwoord: '' });
  const [kopieerdId, setKopieerdId]     = useState(null);
  const [verwijderBevestig, setVerwijderBevestig] = useState(null);

  useEffect(() => { laad(); }, []);

  async function laad() {
    const data = await window.api.standaardTeksten.getAll();
    setTeksten(data);
  }

  const categorieen = useMemo(() =>
    [...new Set(teksten.map(t => t.categorie || 'Overig'))].sort(),
    [teksten]
  );

  // Reset filter when the active category no longer exists (e.g. after deleting its last item)
  useEffect(() => {
    if (actieveCategorie !== 'alle' && !categorieen.includes(actieveCategorie)) {
      setActieve('alle');
    }
  }, [categorieen, actieveCategorie]);

  const gefilterd = useMemo(() =>
    actieveCategorie === 'alle'
      ? teksten
      : teksten.filter(t => (t.categorie || 'Overig') === actieveCategorie),
    [teksten, actieveCategorie]
  );

  // Group filtered items by category, categories sorted alphabetically
  const gegroepeerd = useMemo(() => {
    const map = new Map();
    for (const t of gefilterd) {
      const cat = t.categorie || 'Overig';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(t);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, 'nl'));
  }, [gefilterd]);

  async function slaBewerkt() {
    if (!bewerkData.vraag?.trim() || !bewerkData.antwoord?.trim()) return;
    await window.api.standaardTeksten.save(bewerkData);
    setBewerkId(null);
    setBewerkData({});
    laad();
    showToast('Opgeslagen');
  }

  async function voegToe() {
    if (!nieuw.vraag.trim() || !nieuw.antwoord.trim()) return;
    await window.api.standaardTeksten.save(nieuw);
    setToevoegOpen(false);
    setNieuw({ categorie: nieuw.categorie, vraag: '', antwoord: '' });
    laad();
    showToast('Tekst toegevoegd');
  }

  async function verwijder(id) {
    await window.api.standaardTeksten.delete(id);
    setVerwijderBevestig(null);
    laad();
    showToast('Verwijderd', 'info');
  }

  function kopieer(tekst, id) {
    navigator.clipboard.writeText(tekst).catch(() => {});
    setKopieerdId(id);
    setTimeout(() => setKopieerdId(id2 => id2 === id ? null : id2), 2000);
  }

  function startBewerk(item) {
    setBewerkId(item.id);
    setBewerkData({ id: item.id, categorie: item.categorie || '', vraag: item.vraag, antwoord: item.antwoord });
  }

  function annuleerBewerk() {
    setBewerkId(null);
    setBewerkData({});
  }

  const telPerCat = (cat) => teksten.filter(t => (t.categorie || 'Overig') === cat).length;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* ── header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Standaard teksten</h1>
          <p className="text-gray-500 mt-1 text-sm">Dossiernotities voor Visionplanner — {teksten.length} tekst{teksten.length !== 1 ? 'en' : ''}</p>
        </div>
        <button
          onClick={() => { setToevoegOpen(true); setNieuw({ categorie: actieveCategorie === 'alle' ? '' : actieveCategorie, vraag: '', antwoord: '' }); }}
          className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={15} />
          Tekst toevoegen
        </button>
      </div>

      {/* ── category filter pills ── */}
      {categorieen.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <Pill actief={actieveCategorie === 'alle'} onClick={() => setActieve('alle')}>
            Alle <span className="opacity-60">({teksten.length})</span>
          </Pill>
          {categorieen.map(cat => (
            <Pill key={cat} actief={actieveCategorie === cat} onClick={() => setActieve(cat)}>
              {cat} <span className="opacity-60">({telPerCat(cat)})</span>
            </Pill>
          ))}
        </div>
      )}

      {/* ── add form (inline, at top) ── */}
      {toevoegOpen && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-blue-800 mb-4">Nieuwe tekst toevoegen</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Categorie</label>
              <input
                list="categorie-lijst"
                value={nieuw.categorie}
                onChange={e => setNieuw(n => ({ ...n, categorie: e.target.value }))}
                placeholder="bijv. Acceptatie, Continuïteit..."
                className="invoer text-sm"
              />
              <datalist id="categorie-lijst">
                {categorieen.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Vraag / onderwerp <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={nieuw.vraag}
                onChange={e => setNieuw(n => ({ ...n, vraag: e.target.value }))}
                placeholder="Bijv. Beoordeel continuïteit"
                className="invoer text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Standaard antwoord / dossiernotitie <span className="text-red-500">*</span></label>
              <textarea
                value={nieuw.antwoord}
                onChange={e => setNieuw(n => ({ ...n, antwoord: e.target.value }))}
                rows={4}
                placeholder="Typ de standaard tekst..."
                className="invoer text-sm resize-y"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setToevoegOpen(false)}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Annuleren
            </button>
            <button
              onClick={voegToe}
              disabled={!nieuw.vraag.trim() || !nieuw.antwoord.trim()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40"
            >
              <Plus size={14} />
              Toevoegen
            </button>
          </div>
        </div>
      )}

      {/* ── empty state ── */}
      {teksten.length === 0 && !toevoegOpen && (
        <div className="flex flex-col items-center py-20 text-gray-400">
          <BookOpen size={40} className="mb-3 opacity-40" />
          <p className="text-sm mb-4">Nog geen standaard teksten</p>
          <button
            onClick={() => setToevoegOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Plus size={15} />
            Eerste tekst toevoegen
          </button>
        </div>
      )}

      {/* ── items, grouped by category ── */}
      {gegroepeerd.map(([cat, items]) => (
        <div key={cat} className="mb-8">
          {/* Category heading — only show when viewing "alle" */}
          {actieveCategorie === 'alle' && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{cat}</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
          )}
          <div className="space-y-3">
            {items.map(item => (
              bewerkId === item.id ? (
                /* ── Edit card ── */
                <div key={item.id} className="bg-white border border-blue-300 rounded-xl p-5 shadow-sm">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Categorie</label>
                      <input
                        list="categorie-lijst-edit"
                        value={bewerkData.categorie || ''}
                        onChange={e => setBewerkData(d => ({ ...d, categorie: e.target.value }))}
                        placeholder="Categorie"
                        className="invoer text-sm"
                      />
                      <datalist id="categorie-lijst-edit">
                        {categorieen.map(c => <option key={c} value={c} />)}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Vraag / onderwerp</label>
                      <input
                        type="text"
                        value={bewerkData.vraag || ''}
                        onChange={e => setBewerkData(d => ({ ...d, vraag: e.target.value }))}
                        className="invoer text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Standaard antwoord</label>
                      <textarea
                        value={bewerkData.antwoord || ''}
                        onChange={e => setBewerkData(d => ({ ...d, antwoord: e.target.value }))}
                        rows={5}
                        className="invoer text-sm resize-y"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <button onClick={annuleerBewerk} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                      Annuleren
                    </button>
                    <button
                      onClick={slaBewerkt}
                      disabled={!bewerkData.vraag?.trim() || !bewerkData.antwoord?.trim()}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40"
                    >
                      <Check size={14} />
                      Opslaan
                    </button>
                  </div>
                </div>
              ) : (
                /* ── View card ── */
                <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors group">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      {actieveCategorie === 'alle' && item.categorie && (
                        <span className="inline-block text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mb-1.5">
                          {item.categorie}
                        </span>
                      )}
                      <p className="text-sm font-semibold text-gray-800 leading-snug">{item.vraag}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startBewerk(item)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Bewerken"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setVerwijderBevestig(item.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Verwijderen"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Answer text — read-only, selectable */}
                  <div className="bg-gray-50 border border-gray-100 rounded-lg px-3.5 py-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mb-3 select-text">
                    {item.antwoord}
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => kopieer(item.antwoord, item.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                        kopieerdId === item.id
                          ? 'bg-green-100 text-green-700 border border-green-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                      }`}
                    >
                      {kopieerdId === item.id
                        ? <><Check size={12} /> Gekopieerd</>
                        : <><Copy size={12} /> Kopiëren</>
                      }
                    </button>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      ))}

      {verwijderBevestig && (
        <ConfirmDialog
          titel="Tekst verwijderen?"
          omschrijving="De standaard tekst wordt definitief verwijderd."
          bevestigLabel="Verwijderen"
          onBevestig={() => verwijder(verwijderBevestig)}
          onAnnuleer={() => setVerwijderBevestig(null)}
        />
      )}
    </div>
  );
}

function Pill({ actief, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
        actief
          ? 'bg-blue-600 text-white border-blue-600'
          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );
}
