import { useEffect, useMemo, useState } from 'react';
import { Plus, Copy, Check, Pencil, Trash2, BookOpen, ArrowUp, ArrowDown, Star, Search, X, FileText } from 'lucide-react';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToast } from '../context/ToastContext';

function vindVariabelen(tekst) {
  const matches = [...(tekst || '').matchAll(/\{([a-zA-Z_][a-zA-Z0-9_ ]*)\}/g)];
  return [...new Set(matches.map(m => m[1]))];
}

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
  const [zoekterm, setZoekterm]         = useState('');
  const [vervangModal, setVervangModal] = useState(null); // { item } | null
  const [selectie, setSelectie]         = useState(new Set());
  const [risicoTekst, setRisicoTekst]   = useState(null); // string | null

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

  const gefilterd = useMemo(() => {
    let lijst = actieveCategorie === 'alle'
      ? teksten
      : teksten.filter(t => (t.categorie || 'Overig') === actieveCategorie);
    if (zoekterm.trim()) {
      const q = zoekterm.toLowerCase();
      lijst = lijst.filter(t =>
        (t.vraag || '').toLowerCase().includes(q) ||
        (t.antwoord || '').toLowerCase().includes(q)
      );
    }
    return lijst;
  }, [teksten, actieveCategorie, zoekterm]);

  // Group filtered items by category; within each group favorites first
  const gegroepeerd = useMemo(() => {
    const map = new Map();
    for (const t of gefilterd) {
      const cat = t.categorie || 'Overig';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(t);
    }
    // Sort each group: favorites first, then original order
    for (const [, items] of map) {
      items.sort((a, b) => (b.favoriet ? 1 : 0) - (a.favoriet ? 1 : 0));
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

  async function verplaats(item, richting) {
    const idx = teksten.findIndex(t => t.id === item.id);
    if (idx < 0) return;
    const herschikt = [...teksten];
    const doelIdx = idx + richting;
    if (doelIdx < 0 || doelIdx >= herschikt.length) return;
    [herschikt[idx], herschikt[doelIdx]] = [herschikt[doelIdx], herschikt[idx]];
    setTeksten(herschikt);
    await window.api.standaardTeksten.reorderAll(herschikt);
  }

  async function toggleFavoriet(item) {
    const bijgewerkt = { ...item, favoriet: !item.favoriet };
    setTeksten(t => t.map(x => x.id === item.id ? bijgewerkt : x));
    await window.api.standaardTeksten.save(bijgewerkt);
  }

  function kopieer(item) {
    const vars = vindVariabelen(item.antwoord);
    if (vars.length > 0) {
      setVervangModal({ item });
    } else {
      navigator.clipboard.writeText(item.antwoord).catch(() => {});
      setKopieerdId(item.id);
      setTimeout(() => setKopieerdId(id2 => id2 === item.id ? null : id2), 2000);
    }
  }

  function kopieerTekst(tekst, id) {
    navigator.clipboard.writeText(tekst).catch(() => {});
    setVervangModal(null);
    setKopieerdId(id);
    setTimeout(() => setKopieerdId(id2 => id2 === id ? null : id2), 2000);
  }

  function toggleSelectie(id) {
    setSelectie(s => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  function genereerRisico() {
    const geselecteerd = teksten.filter(t => selectie.has(t.id));
    const isRisico = t => /risico.*motivatie|motivatie.*risico/i.test(t.vraag || '');
    const risicoItem = geselecteerd.find(isRisico);
    const werkstappen = geselecteerd.filter(t => !isRisico(t));

    const delen = [];
    if (risicoItem) delen.push(risicoItem.antwoord);
    for (const w of werkstappen) delen.push(`${w.vraag}:\n${w.antwoord}`);
    if (delen.length === 0) return;
    setRisicoTekst(delen.join('\n\n'));
  }

  function startBewerk(item) {
    setBewerkId(item.id);
    setBewerkData({ id: item.id, categorie: item.categorie || '', vraag: item.vraag, antwoord: item.antwoord });
  }

  function annuleerBewerk() {
    setBewerkId(null);
    setBewerkData({});
  }

  const telPerCat = useMemo(() => {
    const counts = new Map();
    for (const t of teksten) counts.set(t.categorie || 'Overig', (counts.get(t.categorie || 'Overig') || 0) + 1);
    return cat => counts.get(cat) ?? 0;
  }, [teksten]);

  return (
    <div className="flex min-h-full">
      {/* ── zijmenu ── */}
      <aside className="w-52 shrink-0 bg-gray-50 border-r border-gray-200 p-3 space-y-0.5">
        <button
          onClick={() => setActieve('alle')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
            actieveCategorie === 'alle'
              ? 'bg-blue-600 text-white font-medium'
              : 'text-gray-600 hover:bg-gray-200'
          }`}
        >
          <span>Alle teksten</span>
          <span className={`text-xs ${actieveCategorie === 'alle' ? 'text-blue-200' : 'text-gray-400'}`}>
            {teksten.length}
          </span>
        </button>
        {categorieen.map(cat => (
          <button
            key={cat}
            onClick={() => setActieve(cat)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
              actieveCategorie === cat
                ? 'bg-blue-600 text-white font-medium'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span className="truncate text-left">{cat}</span>
            <span className={`text-xs ml-1 shrink-0 ${actieveCategorie === cat ? 'text-blue-200' : 'text-gray-400'}`}>
              {telPerCat(cat)}
            </span>
          </button>
        ))}
      </aside>

      {/* ── hoofdinhoud ── */}
      <div className="flex-1 p-8 max-w-3xl">
        {/* ── header ── */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Standaard teksten</h1>
            <p className="text-gray-500 mt-1 text-sm">
              {actieveCategorie === 'alle'
                ? `${teksten.length} tekst${teksten.length !== 1 ? 'en' : ''}`
                : `${actieveCategorie} — ${telPerCat(actieveCategorie)} tekst${telPerCat(actieveCategorie) !== 1 ? 'en' : ''}`}
            </p>
          </div>
          <button
            onClick={() => { setToevoegOpen(true); setNieuw({ categorie: actieveCategorie === 'alle' ? '' : actieveCategorie, vraag: '', antwoord: '' }); }}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={15} />
            Tekst toevoegen
          </button>
        </div>

        {/* ── zoekbalk ── */}
        <div className="relative mb-5 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Zoeken in vraag of tekst..."
            value={zoekterm}
            onChange={e => setZoekterm(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
          {zoekterm && (
            <button onClick={() => setZoekterm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-700 transition-colors">
              <X size={14} />
            </button>
          )}
        </div>

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

        {/* ── empty state: geen teksten aangemaakt ── */}
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

        {/* ── empty state: geen resultaten voor huidige filter/zoekterm ── */}
        {teksten.length > 0 && gefilterd.length === 0 && (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <Search size={32} className="mb-3 opacity-30" />
            <p className="text-sm">Geen teksten gevonden</p>
            {zoekterm && (
              <button onClick={() => setZoekterm('')} className="mt-2 text-xs text-blue-600 hover:underline">
                Zoekterm wissen
              </button>
            )}
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
                  <div key={item.id} className={`bg-white border rounded-xl p-5 transition-colors group ${selectie.has(item.id) ? 'border-blue-400 bg-blue-50/20' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="flex items-start gap-2.5 mb-3">
                      <input
                        type="checkbox"
                        checked={selectie.has(item.id)}
                        onChange={() => toggleSelectie(item.id)}
                        className="mt-0.5 w-4 h-4 shrink-0 rounded border-gray-300 cursor-pointer accent-blue-600"
                      />
                      <div className="flex-1 min-w-0">
                        {actieveCategorie === 'alle' && item.categorie && (
                          <span className="inline-block text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mb-1.5">
                            {item.categorie}
                          </span>
                        )}
                        <p className="text-sm font-semibold text-gray-800 leading-snug">{item.vraag}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => toggleFavoriet(item)}
                          className={`p-1.5 rounded-lg transition-colors ${item.favoriet ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-300 hover:text-yellow-500 opacity-0 group-hover:opacity-100'}`}
                          title={item.favoriet ? 'Verwijder uit favorieten' : 'Markeer als favoriet'}
                        >
                          <Star size={14} className={item.favoriet ? 'fill-yellow-400' : ''} />
                        </button>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => verplaats(item, -1)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" title="Omhoog"><ArrowUp size={13} /></button>
                          <button onClick={() => verplaats(item, 1)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" title="Omlaag"><ArrowDown size={13} /></button>
                          <button onClick={() => startBewerk(item)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Bewerken"><Pencil size={14} /></button>
                          <button onClick={() => setVerwijderBevestig(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Verwijderen"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </div>

                    {/* Answer text — read-only, selectable */}
                    <div className="bg-gray-50 border border-gray-100 rounded-lg px-3.5 py-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mb-3 select-text">
                      {item.antwoord}
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={() => kopieer(item)}
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

        {vervangModal && (
          <VervangModal
            item={vervangModal.item}
            onKopieer={(tekst) => kopieerTekst(tekst, vervangModal.item.id)}
            onSluiten={() => setVervangModal(null)}
          />
        )}

        {risicoTekst !== null && (
          <RisicoModal tekst={risicoTekst} onSluiten={() => setRisicoTekst(null)} />
        )}
      </div>

      {/* ── Sticky selectiebalk ── */}
      {selectie.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between gap-4 px-6 py-3.5 bg-white border-t border-gray-200 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-800">
              {selectie.size} item{selectie.size !== 1 ? 's' : ''} geselecteerd
            </span>
            <button
              onClick={() => setSelectie(new Set())}
              className="text-xs text-gray-400 hover:text-gray-700 transition-colors underline underline-offset-2"
            >
              Wissen
            </button>
          </div>
          <button
            onClick={genereerRisico}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <FileText size={15} />
            Risico genereren
          </button>
        </div>
      )}
    </div>
  );
}

function RisicoModal({ tekst, onSluiten }) {
  const [inhoud, setInhoud] = useState(tekst);
  const [gekopieerd, setGekopieerd] = useState(false);

  function kopieer() {
    navigator.clipboard.writeText(inhoud).catch(() => {});
    setGekopieerd(true);
    setTimeout(() => setGekopieerd(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onSluiten} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Gegenereerde risicotekst</h2>
            <p className="text-xs text-gray-400 mt-0.5">Risico/motivatie eerst, daarna de geselecteerde werkstappen — bewerkbaar voor kopiëren</p>
          </div>
          <button onClick={onSluiten} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-hidden p-5">
          <textarea
            value={inhoud}
            onChange={e => setInhoud(e.target.value)}
            className="w-full h-full min-h-[360px] text-sm text-gray-700 border border-gray-200 rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 leading-relaxed font-[inherit]"
          />
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between shrink-0">
          <span className="text-xs text-gray-400">{inhoud.length} tekens</span>
          <div className="flex gap-2">
            <button onClick={onSluiten} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
              Sluiten
            </button>
            <button
              onClick={kopieer}
              className={`flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg transition-all ${
                gekopieerd
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {gekopieerd ? <><Check size={13} /> Gekopieerd!</> : <><Copy size={13} /> Kopiëren</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function VervangModal({ item, onKopieer, onSluiten }) {
  const variabelen = vindVariabelen(item.antwoord);
  const [waarden, setWaarden] = useState(() => Object.fromEntries(variabelen.map(v => [v, ''])));

  function stel(v, val) {
    setWaarden(w => ({ ...w, [v]: val }));
  }

  function doeKopieer() {
    let tekst = item.antwoord;
    for (const [v, w] of Object.entries(waarden)) {
      tekst = tekst.replace(new RegExp(`\\{${v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}`, 'g'), w || `{${v}}`);
    }
    onKopieer(tekst);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onSluiten} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Variabelen invullen</h2>
            <p className="text-xs text-gray-400 mt-0.5">Vervang de variabelen voor het kopiëren</p>
          </div>
          <button onClick={onSluiten} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-3">
          {variabelen.map((v, i) => (
            <div key={v}>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                <span className="font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{`{${v}}`}</span>
              </label>
              <input
                type="text"
                value={waarden[v] || ''}
                onChange={e => stel(v, e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doeKopieer()}
                className="invoer text-sm"
                autoFocus={i === 0}
                placeholder={`Waarde voor ${v}`}
              />
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onSluiten} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            Annuleren
          </button>
          <button
            onClick={doeKopieer}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Copy size={13} />
            Kopiëren
          </button>
        </div>
      </div>
    </div>
  );
}

