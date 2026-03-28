import { useEffect, useState } from 'react';
import { ArrowLeft, FolderOpen, Image, Loader2, CheckCircle, Plus, Trash2 } from 'lucide-react';

export default function InstellingenPanel({ onTerug }) {
  const [instellingen, setInstellingen] = useState({
    templateDir: '', kantoorNaam: '', logoPad: '', ondertekenaars: [],
  });
  const [bezig, setBezig] = useState(false);
  const [opgeslagen, setOpgeslagen] = useState(false);
  const [nieuweOndertekenaar, setNieuweOndertekenaar] = useState('');

  useEffect(() => {
    window.api.settings.get().then(s => {
      setInstellingen({
        templateDir: s.templateDir || '',
        kantoorNaam: s.kantoorNaam || '',
        logoPad: s.logoPad || '',
        ondertekenaars: s.ondertekenaars || [],
      });
    });
  }, []);

  function stelIn(key, val) {
    setInstellingen(s => ({ ...s, [key]: val }));
    setOpgeslagen(false);
  }

  async function kiesMap() {
    const pad = await window.api.settings.selectDir();
    if (pad) stelIn('templateDir', pad);
  }

  async function kiesLogo() {
    const pad = await window.api.settings.selectLogo();
    if (pad) stelIn('logoPad', pad);
  }

  function voegOndertekeenaarToe() {
    const naam = nieuweOndertekenaar.trim();
    if (!naam || instellingen.ondertekenaars.includes(naam)) return;
    stelIn('ondertekenaars', [...instellingen.ondertekenaars, naam]);
    setNieuweOndertekenaar('');
  }

  function verwijderOndertekenaar(naam) {
    stelIn('ondertekenaars', instellingen.ondertekenaars.filter(o => o !== naam));
  }

  async function opslaan() {
    setBezig(true);
    try {
      await window.api.settings.set(instellingen);
      setOpgeslagen(true);
    } catch (e) {
      console.error('Instellingen opslaan mislukt:', e);
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <button
        onClick={onTerug}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Terug naar beheer
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-8">Instellingen</h1>

      <div className="space-y-5">
        {/* Kantoor naam */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Kantoor</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Naam kantoor</label>
            <input
              type="text"
              value={instellingen.kantoorNaam}
              onChange={e => stelIn('kantoorNaam', e.target.value)}
              placeholder="Naam van het accountantskantoor"
              className="invoer"
            />
          </div>
        </div>

        {/* Ondertekenaars */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Ondertekenaars</h2>
          <p className="text-xs text-gray-400 mb-4">
            Beschikbaar als veldtype "Ondertekenaar kantoor" in sjablonen. Variabele in Word: <code className="bg-gray-100 px-1 rounded">{'{ondertekenaar}'}</code>
          </p>
          <div className="space-y-2 mb-4">
            {instellingen.ondertekenaars.map(naam => (
              <div key={naam} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700">{naam}</span>
                <button
                  onClick={() => verwijderOndertekenaar(naam)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {instellingen.ondertekenaars.length === 0 && (
              <p className="text-xs text-gray-400 py-2">Nog geen ondertekenaars toegevoegd</p>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={nieuweOndertekenaar}
              onChange={e => setNieuweOndertekenaar(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && voegOndertekeenaarToe()}
              placeholder="bijv. Drs J. Jansen RA"
              className="invoer flex-1"
            />
            <button
              onClick={voegOndertekeenaarToe}
              className="flex items-center gap-1 px-3 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Plus size={14} />
              Toevoegen
            </button>
          </div>
        </div>

        {/* Sjablonenmap */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Sjablonenmap</h2>
          <p className="text-xs text-gray-400 mb-3">
            Gebruik een gedeelde netwerkmap of OneDrive-map zodat alle gebruikers dezelfde sjablonen hebben.
          </p>
          <div className="flex gap-3 items-center">
            <input
              type="text"
              value={instellingen.templateDir}
              readOnly
              placeholder="Geen map geselecteerd"
              className="invoer flex-1 bg-gray-50 cursor-default text-gray-500 text-sm"
            />
            <button onClick={kiesMap} className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 shrink-0">
              <FolderOpen size={15} />
              Kiezen
            </button>
          </div>
        </div>

        {/* Logo */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Logo / huisstijl</h2>
          <p className="text-xs text-gray-400 mb-3">
            Variabele in Word: <code className="bg-gray-100 px-1 rounded">{'{logo}'}</code>
          </p>
          <div className="flex gap-3 items-center">
            <input
              type="text"
              value={instellingen.logoPad}
              readOnly
              placeholder="Geen logo geselecteerd"
              className="invoer flex-1 bg-gray-50 cursor-default text-gray-500 text-sm"
            />
            <button onClick={kiesLogo} className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 shrink-0">
              <Image size={15} />
              Kiezen
            </button>
          </div>
          {instellingen.logoPad && (
            <img
              src={`file://${instellingen.logoPad}`}
              alt="Logo preview"
              className="mt-3 h-16 object-contain border border-gray-100 rounded-lg p-2 bg-gray-50"
            />
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={opslaan}
          disabled={bezig}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {bezig && <Loader2 size={15} className="animate-spin" />}
          {opgeslagen && <CheckCircle size={15} />}
          {opgeslagen ? 'Opgeslagen!' : bezig ? 'Opslaan...' : 'Opslaan'}
        </button>
      </div>
    </div>
  );
}
