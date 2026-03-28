import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Users, Search, X, Check, ChevronDown, ChevronUp } from 'lucide-react';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToast } from '../context/ToastContext';

export default function KlantenPage() {
  const showToast = useToast();
  const [klanten, setKlanten] = useState([]);
  const [zoekterm, setZoekterm] = useState('');
  const [bewerkKlant, setBewerkKlant] = useState(null); // null = lijst, object = formulier
  const [verwijderBevestig, setVerwijderBevestig] = useState(null);

  useEffect(() => { laad(); }, []);

  async function laad() {
    const data = await window.api.klanten.getAll();
    setKlanten(data);
  }

  function nieuw() {
    setBewerkKlant({ naam: '', velden: {} });
  }

  function bewerk(klant) {
    setBewerkKlant({ ...klant, velden: { ...(klant.velden || {}) } });
  }

  async function sla() {
    if (!bewerkKlant.naam.trim()) return;
    await window.api.klanten.save(bewerkKlant);
    setBewerkKlant(null);
    laad();
    showToast(bewerkKlant.id ? 'Klant bijgewerkt' : 'Klant toegevoegd');
  }

  async function verwijder(id) {
    await window.api.klanten.delete(id);
    setVerwijderBevestig(null);
    laad();
    showToast('Klant verwijderd', 'info');
  }

  const gefilterd = zoekterm
    ? klanten.filter(k =>
        k.naam.toLowerCase().includes(zoekterm.toLowerCase()) ||
        Object.values(k.velden || {}).some(v => String(v).toLowerCase().includes(zoekterm.toLowerCase()))
      )
    : klanten;

  if (bewerkKlant !== null) {
    return <KlantFormulier klant={bewerkKlant} onChange={setBewerkKlant} onSla={sla} onAnnuleer={() => setBewerkKlant(null)} />;
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Adresboek</h1>
          <p className="text-gray-500 mt-1 text-sm">{klanten.length} klant{klanten.length !== 1 ? 'en' : ''}</p>
        </div>
        <button
          onClick={nieuw}
          className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={15} />
          Klant toevoegen
        </button>
      </div>

      {klanten.length > 0 && (
        <div className="relative mb-6 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Zoeken op naam of gegevens..."
            value={zoekterm}
            onChange={e => setZoekterm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
      )}

      {klanten.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-gray-400">
          <Users size={40} className="mb-3 opacity-40" />
          <p className="text-sm mb-4">Nog geen klanten toegevoegd</p>
          <button onClick={nieuw} className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">
            <Plus size={15} />
            Eerste klant toevoegen
          </button>
        </div>
      ) : gefilterd.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-gray-400">
          <Search size={32} className="mb-3 opacity-30" />
          <p className="text-sm">Geen klanten gevonden</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {gefilterd.map((klant, i) => (
            <KlantRij
              key={klant.id}
              klant={klant}
              laatste={i === gefilterd.length - 1}
              onBewerk={() => bewerk(klant)}
              onVerwijder={() => setVerwijderBevestig(klant.id)}
            />
          ))}
        </div>
      )}

      {verwijderBevestig && (
        <ConfirmDialog
          titel="Klant verwijderen?"
          omschrijving="De klantgegevens worden definitief verwijderd."
          bevestigLabel="Verwijderen"
          onBevestig={() => verwijder(verwijderBevestig)}
          onAnnuleer={() => setVerwijderBevestig(null)}
        />
      )}
    </div>
  );
}

function KlantRij({ klant, laatste, onBewerk, onVerwijder }) {
  const [open, setOpen] = useState(false);
  const veldEntries = Object.entries(klant.velden || {}).filter(([, v]) => v);

  return (
    <div className={!laatste ? 'border-b border-gray-100' : ''}>
      <div
        className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
        onClick={() => setOpen(o => !o)}
      >
        <div className="p-2 bg-blue-50 rounded-lg shrink-0">
          <Users size={15} className="text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-gray-900">{klant.naam}</div>
          {veldEntries.length > 0 && (
            <div className="text-xs text-gray-400 mt-0.5 truncate">
              {veldEntries.slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(' · ')}
              {veldEntries.length > 3 && ` · +${veldEntries.length - 3} meer`}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={e => { e.stopPropagation(); onBewerk(); }} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Bewerken">
            <Pencil size={14} />
          </button>
          <button onClick={e => { e.stopPropagation(); onVerwijder(); }} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Verwijderen">
            <Trash2 size={14} />
          </button>
          {open ? <ChevronUp size={14} className="text-gray-400 ml-1" /> : <ChevronDown size={14} className="text-gray-400 ml-1" />}
        </div>
      </div>
      {open && veldEntries.length > 0 && (
        <div className="px-5 pb-4 grid grid-cols-2 gap-x-6 gap-y-1.5">
          {veldEntries.map(([k, v]) => (
            <div key={k} className="flex gap-2 text-xs">
              <span className="text-gray-400 shrink-0 min-w-[90px]">{k}</span>
              <span className="text-gray-700 truncate">{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function KlantFormulier({ klant, onChange, onSla, onAnnuleer }) {
  const [nieuwSleutel, setNieuwSleutel] = useState('');
  const [nieuwWaarde, setNieuwWaarde] = useState('');

  function setVeld(key, val) {
    onChange({ ...klant, velden: { ...klant.velden, [key]: val } });
  }

  function verwijderVeld(key) {
    const { [key]: _, ...rest } = klant.velden;
    onChange({ ...klant, velden: rest });
  }

  function voegVeldToe() {
    const k = nieuwSleutel.trim().replace(/\s+/g, '_');
    if (!k) return;
    onChange({ ...klant, velden: { ...klant.velden, [k]: nieuwWaarde } });
    setNieuwSleutel('');
    setNieuwWaarde('');
  }

  const veldEntries = Object.entries(klant.velden || {});

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <button onClick={onAnnuleer} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
        <X size={16} />
        Annuleren
      </button>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">
        {klant.id ? 'Klant bewerken' : 'Klant toevoegen'}
      </h1>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Naam</h2>
        <input
          type="text"
          value={klant.naam}
          onChange={e => onChange({ ...klant, naam: e.target.value })}
          placeholder="Naam klant of bedrijf"
          className="invoer w-full"
          autoFocus
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">Velden</h2>
        <p className="text-xs text-gray-400 mb-4">
          De sleutel moet overeenkomen met de variabelenaam in het sjabloon (bijv. <code className="bg-gray-100 px-1 rounded">bedrijfsnaam</code>).
        </p>

        <div className="space-y-2 mb-4">
          {veldEntries.map(([key, val]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1.5 rounded min-w-[130px] shrink-0">{key}</span>
              <input
                type="text"
                value={val}
                onChange={e => setVeld(key, e.target.value)}
                className="invoer flex-1 text-sm"
              />
              <button onClick={() => verwijderVeld(key)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors shrink-0">
                <X size={14} />
              </button>
            </div>
          ))}
          {veldEntries.length === 0 && (
            <p className="text-xs text-gray-400 py-2">Nog geen velden. Voeg hieronder velden toe.</p>
          )}
        </div>

        {/* Nieuw veld */}
        <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
          <input
            type="text"
            value={nieuwSleutel}
            onChange={e => setNieuwSleutel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && voegVeldToe()}
            placeholder="sleutel"
            className="invoer text-sm font-mono w-36 shrink-0"
          />
          <input
            type="text"
            value={nieuwWaarde}
            onChange={e => setNieuwWaarde(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && voegVeldToe()}
            placeholder="waarde"
            className="invoer text-sm flex-1"
          />
          <button
            onClick={voegVeldToe}
            disabled={!nieuwSleutel.trim()}
            className="flex items-center gap-1 px-3 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-40 shrink-0"
          >
            <Plus size={14} />
            Toevoegen
          </button>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onAnnuleer} className="px-5 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
          Annuleren
        </button>
        <button
          onClick={onSla}
          disabled={!klant.naam.trim()}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40"
        >
          <Check size={15} />
          Opslaan
        </button>
      </div>
    </div>
  );
}
