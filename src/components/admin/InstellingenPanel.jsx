import { useEffect, useState } from 'react';
import { ArrowLeft, FolderOpen, Image, Loader2, CheckCircle } from 'lucide-react';

export default function InstellingenPanel({ onTerug }) {
  const [instellingen, setInstellingen] = useState({ templateDir: '', kantoorNaam: '', logoPad: '' });
  const [bezig, setBezig] = useState(false);
  const [opgeslagen, setOpgeslagen] = useState(false);

  useEffect(() => {
    window.api.settings.get().then(setInstellingen);
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

  async function opslaan() {
    setBezig(true);
    await window.api.settings.set(instellingen);
    setBezig(false);
    setOpgeslagen(true);
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

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">

        {/* Kantoor naam */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Naam kantoor</label>
          <input
            type="text"
            value={instellingen.kantoorNaam || ''}
            onChange={e => stelIn('kantoorNaam', e.target.value)}
            placeholder="Naam van het accountantskantoor"
            className="invoer"
          />
        </div>

        {/* Template map */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Sjablonenmap
          </label>
          <p className="text-xs text-gray-400 mb-2">
            Locatie waar de Word-sjablonen (.docx) worden opgeslagen. Gebruik een gedeelde netwerkmap of OneDrive-map voor meerdere gebruikers.
          </p>
          <div className="flex gap-3 items-center">
            <input
              type="text"
              value={instellingen.templateDir || ''}
              readOnly
              placeholder="Geen map geselecteerd"
              className="invoer flex-1 bg-gray-50 cursor-default text-gray-500 text-sm"
            />
            <button
              onClick={kiesMap}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 shrink-0"
            >
              <FolderOpen size={15} />
              Kiezen
            </button>
          </div>
        </div>

        {/* Logo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Logo / huisstijl
          </label>
          <p className="text-xs text-gray-400 mb-2">
            Kies een afbeelding (PNG of JPG). Het pad wordt opgeslagen; het logo kan in sjablonen worden gebruikt via de variabele <code className="bg-gray-100 px-1 rounded">{'{logo}'}</code>.
          </p>
          <div className="flex gap-3 items-center">
            <input
              type="text"
              value={instellingen.logoPad || ''}
              readOnly
              placeholder="Geen logo geselecteerd"
              className="invoer flex-1 bg-gray-50 cursor-default text-gray-500 text-sm"
            />
            <button
              onClick={kiesLogo}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 shrink-0"
            >
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

      {/* Opslaan */}
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
