import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, AlertCircle, FileUp } from 'lucide-react';
import VeldInput from '../components/forms/VeldInput';

export default function FormPage({ templateId, initieleWaarden, navigeer }) {
  const [template, setTemplate] = useState(null);
  const [waarden, setWaarden] = useState({});
  const [laden, setLaden] = useState(true);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState('');
  const [ondertekenaars, setOndertekenaars] = useState([]);
  const [kvkBezig, setKvkBezig] = useState(false);
  const [kvkMelding, setKvkMelding] = useState('');

  useEffect(() => {
    Promise.all([
      window.api.templates.getById(templateId),
      window.api.settings.get(),
    ]).then(([t, settings]) => {
      setTemplate(t);
      setOndertekenaars(settings.ondertekenaars || []);
      const init = {};
      (t?.velden || []).forEach(v => {
        if (v.type === 'boolean') init[v.sleutel] = false;
        else if (v.type === 'currency') init[v.sleutel] = '';
        else init[v.sleutel] = '';
      });
      // Initiële waarden (vanuit geschiedenis) overschrijven defaults
      setWaarden(initieleWaarden ? { ...init, ...initieleWaarden } : init);
      setLaden(false);
    });
  }, [templateId]);

  function isZichtbaar(veld) {
    if (!veld.zichtbaarAls) return true;
    const { sleutel, waarde } = veld.zichtbaarAls;
    return waarden[sleutel] === waarde || String(waarden[sleutel]) === String(waarde);
  }

  function zichtbareVelden() {
    return (template?.velden || []).filter(isZichtbaar);
  }

  function isIngevuld() {
    return zichtbareVelden()
      .filter(v => v.verplicht)
      .every(v => {
        const val = waarden[v.sleutel];
        return val !== '' && val !== null && val !== undefined;
      });
  }

  // Bedragen formatteren als Nederlands valutastring voor in het document
  function bouwValues() {
    const result = {};
    (template?.velden || []).forEach(v => {
      const val = waarden[v.sleutel];
      if (v.type === 'currency' && val !== '' && val !== null && val !== undefined) {
        result[v.sleutel] = new Intl.NumberFormat('nl-NL', {
          style: 'currency', currency: 'EUR',
        }).format(val);
      } else {
        result[v.sleutel] = val ?? '';
      }
    });
    return result;
  }

  async function handleKvkUpload() {
    setKvkMelding('');
    setKvkBezig(true);
    try {
      const pad = await window.api.kvk.selectPdf();
      if (!pad) return;
      const gevonden = await window.api.kvk.scanPdf(pad);
      const sleutels = (template?.velden || []).map(v => v.sleutel);
      const matches = {};
      for (const [key, val] of Object.entries(gevonden)) {
        if (sleutels.includes(key) && val) matches[key] = val;
      }
      if (Object.keys(matches).length === 0) {
        setKvkMelding('Geen overeenkomende velden gevonden in dit uittreksel.');
      } else {
        setWaarden(prev => ({ ...prev, ...matches }));
        setKvkMelding(`${Object.keys(matches).length} veld(en) automatisch ingevuld.`);
      }
    } catch (e) {
      setKvkMelding('Kon het PDF niet lezen: ' + (e.message || 'onbekende fout'));
    } finally {
      setKvkBezig(false);
    }
  }

  async function handleGenereer() {
    setFout('');
    setBezig(true);
    try {
      const values = bouwValues();
      const docxPad = await window.api.export.generateDocx({ templateId, values });

      // Opslaan in geschiedenis
      await window.api.history.add({
        templateId,
        templateNaam: template.naam,
        categorie: template.categorie,
        docxPad,
        values: waarden,
      });

      navigeer('export', { docxPad, templateNaam: template.naam });
    } catch (e) {
      setFout(e.message || 'Er is een fout opgetreden bij het genereren.');
    } finally {
      setBezig(false);
    }
  }

  if (laden) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }

  const velden = zichtbareVelden();

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <button
        onClick={() => navigeer('browser')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Terug naar overzicht
      </button>

      <div className="mb-6">
        <span className="text-xs font-medium text-blue-600 uppercase tracking-wider">
          {template.categorie}
        </span>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">{template.naam}</h1>
        {template.beschrijving && (
          <p className="text-gray-500 mt-2 text-sm">{template.beschrijving}</p>
        )}
      </div>

      {/* KVK upload */}
      <div className="mb-6 flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
        <button
          onClick={handleKvkUpload}
          disabled={kvkBezig}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-50 shrink-0"
        >
          {kvkBezig ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
          KVK uittreksel uploaden
        </button>
        <span className="text-xs text-blue-600">
          {kvkMelding || 'Upload een KVK PDF om velden automatisch in te vullen'}
        </span>
      </div>

      {/* Velden */}
      <div className="space-y-5">
        {velden.map(veld => (
          <VeldInput
            key={veld.sleutel}
            veld={veld}
            waarde={waarden[veld.sleutel]}
            onChange={val => setWaarden(prev => ({ ...prev, [veld.sleutel]: val }))}
            ondertekenaars={ondertekenaars}
          />
        ))}
      </div>

      {fout && (
        <div className="mt-6 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {fout}
        </div>
      )}

      <div className="mt-8">
        <button
          onClick={handleGenereer}
          disabled={!isIngevuld() || bezig}
          className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {bezig && <Loader2 size={16} className="animate-spin" />}
          {bezig ? 'Bezig met genereren...' : 'Document genereren'}
        </button>
      </div>
    </div>
  );
}
