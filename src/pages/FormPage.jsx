import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Loader2, AlertCircle, FileUp, Users, Save, BookmarkCheck } from 'lucide-react';
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
  const [klanten, setKlanten] = useState([]);
  const [klantZoek, setKlantZoek] = useState('');
  const [klantPickerOpen, setKlantPickerOpen] = useState(false);
  const [klantMelding, setKlantMelding] = useState('');
  const [concept, setConcept] = useState(null);
  const [conceptGeladen, setConceptGeladen] = useState(false);
  const [conceptOpgeslagen, setConceptOpgeslagen] = useState(false);
  const klantPickerRef = useRef(null);

  // Sluit klantpicker bij klik buiten
  useEffect(() => {
    if (!klantPickerOpen) return;
    function handleClickOutside(e) {
      if (klantPickerRef.current && !klantPickerRef.current.contains(e.target)) {
        setKlantPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [klantPickerOpen]);

  useEffect(() => {
    Promise.all([
      window.api.templates.getById(templateId),
      window.api.settings.get(),
      window.api.klanten.getAll(),
      window.api.concepten.getByTemplate(templateId),
    ]).then(([t, settings, klantenData, conceptData]) => {
      setTemplate(t);
      setOndertekenaars(settings.ondertekenaars || []);
      setKlanten(klantenData);
      const init = {};
      (t?.velden || []).forEach(v => {
        if (v.type === 'boolean') init[v.sleutel] = false;
        else init[v.sleutel] = '';
      });
      if (initieleWaarden) {
        setWaarden({ ...init, ...initieleWaarden });
      } else if (conceptData) {
        setConcept(conceptData);
        setWaarden({ ...init, ...conceptData.waarden });
        setConceptGeladen(true);
      } else {
        setWaarden(init);
      }
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

  function ontbrekendeVelden() {
    return zichtbareVelden()
      .filter(v => v.verplicht)
      .filter(v => {
        const val = waarden[v.sleutel];
        return val === '' || val === null || val === undefined;
      });
  }

  function isIngevuld() {
    return ontbrekendeVelden().length === 0;
  }

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
        setTimeout(() => setKvkMelding(''), 4000);
      }
    } catch (e) {
      setKvkMelding('Kon het PDF niet lezen: ' + (e.message || 'onbekende fout'));
    } finally {
      setKvkBezig(false);
    }
  }

  function laadKlant(klant) {
    const sleutels = (template?.velden || []).map(v => v.sleutel);
    const matches = {};
    for (const [key, val] of Object.entries(klant.velden || {})) {
      if (sleutels.includes(key) && val) matches[key] = val;
    }
    setWaarden(prev => ({ ...prev, ...matches }));
    setKlantPickerOpen(false);
    setKlantZoek('');
    const n = Object.keys(matches).length;
    setKlantMelding(n > 0 ? `${n} veld${n !== 1 ? 'en' : ''} ingevuld vanuit ${klant.naam}` : `Geen overeenkomende velden gevonden voor ${klant.naam}`);
  }

  async function slaConceptOp() {
    await window.api.concepten.save({
      templateId,
      templateNaam: template.naam,
      waarden,
    });
    setConceptOpgeslagen(true);
    setTimeout(() => setConceptOpgeslagen(false), 2000);
  }

  async function verwijderConcept() {
    await window.api.concepten.delete(templateId);
    setConcept(null);
    setConceptGeladen(false);
  }

  async function handleGenereer() {
    setFout('');
    setBezig(true);
    try {
      const values = bouwValues();
      const docxPad = await window.api.export.generateDocx({ templateId, values });
      await window.api.history.add({
        templateId,
        templateNaam: template.naam,
        categorie: template.categorie,
        docxPad,
        values: waarden,
      });
      // Verwijder concept na succesvol genereren
      await window.api.concepten.delete(templateId);
      navigeer('export', { docxPad, templateNaam: template.naam, values: waarden, bestandsnaamPatroon: template.bestandsnaamPatroon });
    } catch (e) {
      setFout(e.message || 'Er is een fout opgetreden bij het genereren.');
    } finally {
      setBezig(false);
    }
  }

  const gefilterdKlanten = klantZoek
    ? klanten.filter(k => k.naam.toLowerCase().includes(klantZoek.toLowerCase()))
    : klanten;

  if (laden) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
        <AlertCircle size={32} className="text-red-400" />
        <p className="text-sm">Sjabloon niet gevonden.</p>
        <button onClick={() => navigeer('browser')} className="text-sm text-blue-600 underline">
          Terug naar overzicht
        </button>
      </div>
    );
  }

  const velden = zichtbareVelden();

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm mb-6 text-gray-400">
        <button onClick={() => navigeer('browser')} className="hover:text-blue-600 transition-colors">
          Sjablonen
        </button>
        {template.categorie && (
          <>
            <ChevronRight size={14} />
            <button onClick={() => navigeer('browser')} className="hover:text-blue-600 transition-colors">
              {template.categorie}
            </button>
          </>
        )}
        <ChevronRight size={14} />
        <span className="text-gray-700 font-medium truncate">{template.naam}</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{template.naam}</h1>
        {template.beschrijving && (
          <p className="text-gray-500 mt-2 text-sm">{template.beschrijving}</p>
        )}
      </div>

      {/* Concept melding */}
      {conceptGeladen && concept && (
        <div className="mb-4 flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <BookmarkCheck size={16} className="text-amber-600 shrink-0" />
          <span className="text-xs text-amber-700 flex-1">
            Concept geladen van {new Date(concept.datum).toLocaleString('nl-NL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </span>
          <button onClick={verwijderConcept} className="text-xs text-amber-600 hover:underline shrink-0">Verwijderen</button>
        </div>
      )}

      {/* Toolbar: KVK + Klant ophalen */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button
          onClick={handleKvkUpload}
          disabled={kvkBezig}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 disabled:opacity-50"
        >
          {kvkBezig ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
          KVK uittreksel
        </button>

        {klanten.length > 0 && (
          <div className="relative" ref={klantPickerRef}>
            <button
              onClick={() => { setKlantPickerOpen(o => !o); setKlantMelding(''); }}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <Users size={14} />
              Klant ophalen
            </button>
            {klantPickerOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-20">
                <div className="p-2 border-b border-gray-100">
                  <input
                    type="text"
                    placeholder="Zoeken..."
                    value={klantZoek}
                    onChange={e => setKlantZoek(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {gefilterdKlanten.length === 0 ? (
                    <div className="p-3 text-xs text-gray-400 text-center">Geen klanten gevonden</div>
                  ) : (
                    gefilterdKlanten.map(k => (
                      <button
                        key={k.id}
                        onClick={() => laadKlant(k)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors"
                      >
                        {k.naam}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {kvkMelding && (
          <span className="text-xs text-blue-600">{kvkMelding}</span>
        )}
        {klantMelding && (
          <span className="text-xs text-gray-500">{klantMelding}</span>
        )}
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

      <div className="mt-8 space-y-3">
        <button
          onClick={handleGenereer}
          disabled={!isIngevuld() || bezig}
          className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {bezig && <Loader2 size={16} className="animate-spin" />}
          {bezig ? 'Bezig met genereren...' : 'Document genereren'}
        </button>
        {!isIngevuld() && !bezig && (
          <p className="text-xs text-gray-400 text-center">
            Nog in te vullen: {ontbrekendeVelden().map(v => v.label).join(', ')}
          </p>
        )}
        <button
          onClick={slaConceptOp}
          className="w-full py-2 px-6 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
        >
          {conceptOpgeslagen ? (
            <><BookmarkCheck size={14} className="text-green-500" /> Concept opgeslagen!</>
          ) : (
            <><Save size={14} /> Concept opslaan</>
          )}
        </button>
      </div>
    </div>
  );
}
