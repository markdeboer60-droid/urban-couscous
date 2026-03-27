import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import VeldInput from '../components/forms/VeldInput';

export default function FormPage({ templateId, navigeer }) {
  const [template, setTemplate] = useState(null);
  const [waarden, setWaarden] = useState({});
  const [laden, setLaden] = useState(true);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState('');

  useEffect(() => {
    window.api.templates.getById(templateId).then(t => {
      setTemplate(t);
      // Standaardwaarden instellen
      const init = {};
      (t?.velden || []).forEach(v => {
        if (v.type === 'boolean') init[v.sleutel] = false;
        else init[v.sleutel] = '';
      });
      setWaarden(init);
      setLaden(false);
    });
  }, [templateId]);

  function isZichtbaar(veld) {
    if (!veld.zichtbaarAls) return true;
    const { sleutel, waarde } = veld.zichtbaarAls;
    return waarden[sleutel] === waarde || String(waarden[sleutel]) === String(waarde);
  }

  function handleWijzig(sleutel, waarde) {
    setWaarden(prev => ({ ...prev, [sleutel]: waarde }));
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

  async function handleGenereer() {
    setFout('');
    setBezig(true);
    try {
      const docxPad = await window.api.export.generateDocx({
        templateId,
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
      {/* Terug */}
      <button
        onClick={() => navigeer('browser')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Terug naar overzicht
      </button>

      {/* Header */}
      <div className="mb-8">
        <span className="text-xs font-medium text-blue-600 uppercase tracking-wider">
          {template.categorie}
        </span>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">{template.naam}</h1>
        {template.beschrijving && (
          <p className="text-gray-500 mt-2 text-sm">{template.beschrijving}</p>
        )}
      </div>

      {/* Velden */}
      <div className="space-y-5">
        {velden.map(veld => (
          <VeldInput
            key={veld.sleutel}
            veld={veld}
            waarde={waarden[veld.sleutel]}
            onChange={val => handleWijzig(veld.sleutel, val)}
          />
        ))}
      </div>

      {/* Foutmelding */}
      {fout && (
        <div className="mt-6 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {fout}
        </div>
      )}

      {/* Genereer knop */}
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
