import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Loader2, AlertCircle, FileUp, Users, Save, BookmarkCheck } from 'lucide-react';
import VeldInput from '../components/forms/VeldInput';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToast } from '../context/ToastContext';

// Koppeling van standaard sjabloontags naar klantgegevens in het adresboek
const STANDAARD_VARIABELEN = {
  // ── Contactpersoon ──
  'Naam onderneming':                      (k) => k.naam || '',
  'Aanhef':                                (k) => k.velden?.aanhef || '',
  'Naam contactpersoon':                   (k) => k.velden?.contactpersoon_1 || '',
  'Naam contactpersoon2':                  (k) => k.velden?.contactpersoon_2 || '',
  'Naam contactpersoon3':                  (k) => k.velden?.contactpersoon_3 || '',
  'Geboortedatum contactpersoon':          (k) => k.velden?.geboortedatum || '',
  'BSN nummer':                            (k) => k.velden?.bsn_nummer || '',
  'Email contactpersoon':                  (k) => k.velden?.email_contactpersoon || '',
  'Telefoonnummer contactpersoon':         (k) => k.velden?.telefoonnummer_contactpersoon || '',
  'Adres + huisnummer contactpersoon':     (k) => k.velden?.adres_contactpersoon || '',
  'Postcode + plaatsnaam contactpersoon':  (k) => [k.velden?.postcode_contactpersoon, k.velden?.plaats_contactpersoon].filter(Boolean).join('  '),
  // ── Onderneming ──
  'Rechtsvorm':                            (k) => k.velden?.rechtsvorm || '',
  'KVK nummer':                            (k) => k.velden?.kvk_nummer || '',
  'BTW nummer':                            (k) => k.velden?.btw_nummer || '',
  'IBAN':                                  (k) => k.velden?.iban || '',
  'Oprichtingsdatum':                      (k) => k.velden?.oprichtingsdatum || '',
  'SBI code':                              (k) => k.velden?.sbi_code || '',
  'Omschrijving activiteiten onderneming': (k) => k.velden?.omschrijving_activiteiten || '',
  'Adres + huisnummer onderneming':        (k) => k.velden?.adres || '',
  'Postcode + plaatsnaam onderneming':     (k) => [k.velden?.postcode, k.velden?.plaats].filter(Boolean).join('  '),
  'Vestigingsplaats':                      (k) => k.velden?.plaats || '',
  // ── Opdracht & kantoor ──
  'Startjaar opdracht':                    (k) => k.velden?.startjaar_opdracht || '',
  'Behandelaar':                           (k) => k.velden?.naam_behandelaar || '',
  'Plaats ondertekening':                  (k) => k.velden?.plaats_ondertekening || '',
  'Bedragsalaris':                         (k) => k.velden?.bedragsalaris || '',
  // ── Backwards compat (oude sjablonen) ──
  'Klantnaam':                             (k) => k.naam || '',
  'klantnaam':                             (k) => k.naam || '',
  'Adres + huisnummer':                    (k) => k.velden?.adres || '',
  'Postcode + plaatsnaam':                 (k) => [k.velden?.postcode, k.velden?.plaats].filter(Boolean).join('  '),
};

export default function FormPage({ templateId, initieleWaarden, navigeer }) {
  const showToast = useToast();
  const [template, setTemplate] = useState(null);
  const [waarden, setWaarden] = useState({});
  const [laden, setLaden] = useState(true);
  const [laadFout, setLaadFout] = useState(false);
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
  const [conceptVerwijderBevestig, setConceptVerwijderBevestig] = useState(false);
  const [autoOpgeslagenTijd, setAutoOpgeslagenTijd] = useState(null);
  const [geprobeerd, setGeprobeerd] = useState(false);
  const klantPickerRef = useRef(null);
  const klantMeldingTimer = useRef(null);
  // Ref zodat auto-save altijd de meest recente waarden leest
  // zonder het interval te herstarten bij elke toetsaanslag
  const waardenRef = useRef(waarden);
  useEffect(() => { waardenRef.current = waarden; }, [waarden]);

  // Auto-save concept elke 30 seconden
  useEffect(() => {
    if (!template || laden) return;
    const timer = setInterval(async () => {
      const huidig = waardenRef.current;
      const heeftWaarden = Object.values(huidig).some(v => v !== '' && v !== false);
      if (!heeftWaarden) return;
      try {
        await window.api.concepten.save({ templateId, templateNaam: template.naam, waarden: huidig });
        setAutoOpgeslagenTijd(new Date());
      } catch {
        showToast('Automatisch opslaan mislukt', 'error');
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [template, laden, templateId]);

  // Sneltoetsen: Ctrl+Enter = genereren, Ctrl+S = concept opslaan
  const handleGenereerRef = useRef(null);
  const slaConceptOpRef   = useRef(null);
  useEffect(() => { handleGenereerRef.current = handleGenereer; });
  useEffect(() => { slaConceptOpRef.current   = slaConceptOp; });
  useEffect(() => {
    function onKeyDown(e) {
      if (laden || !template) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleGenereerRef.current?.();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        slaConceptOpRef.current?.();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [laden, template]);

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
      const vandaag = new Date().toISOString().slice(0, 10);
      (t?.velden || []).forEach(v => {
        if (v.type === 'boolean') init[v.sleutel] = false;
        else if (v.type === 'date') init[v.sleutel] = vandaag;
        else init[v.sleutel] = '';
      });
      // Auto-vul standaard datum/jaar velden als ze leeg zijn (text-type velden)
      const nu = new Date();
      const huidigJaar = nu.getFullYear().toString();
      const autoVullen = {
        'Datum':              nu.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }),
        'Boekjaar':           huidigJaar,
        'Startjaar opdracht': huidigJaar,
      };
      for (const [sleutel, waarde] of Object.entries(autoVullen)) {
        if (sleutel in init && !init[sleutel]) init[sleutel] = waarde;
      }
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
    }).catch(() => {
      setLaadFout(true);
      setLaden(false);
    });
  }, [templateId]);

  // Uitgebreide waarden: bevat naast de directe invulwaarden ook de booleaanse
  // vlaggen die radio-velden genereren (bijv. rente='euribor' → rente_euribor=true).
  // Dit zorgt dat zichtbaarAls werkt ongeacht of er verwezen wordt naar de radio-sleutel
  // zelf ('rente'='euribor') of naar de gegenereerde vlag ('rente_euribor'=true).
  const uitgebreideWaarden = useMemo(() => {
    const result = { ...waarden };
    (template?.velden || []).forEach(v => {
      if (v.type === 'radio') {
        const val = waarden[v.sleutel];
        (v.radioOpties || []).forEach(opt => {
          result[`${v.sleutel}_${opt.key}`] = val === opt.key;
        });
      }
    });
    return result;
  }, [waarden, template]);

  function isZichtbaar(veld) {
    if (!veld.zichtbaarAls) return true;
    const { sleutel, waarde } = veld.zichtbaarAls;
    return uitgebreideWaarden[sleutel] === waarde || String(uitgebreideWaarden[sleutel]) === String(waarde);
  }

  function zichtbareVelden() {
    return (template?.velden || []).filter(v => !v.verborgen && isZichtbaar(v));
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
      if (v.type === 'radio') {
        // Zet de geselecteerde optie om naar booleaanse vlaggen per optie:
        // rente = 'euribor' → rente_euribor=true, rente_vast=false, rente_onderling=false
        (v.radioOpties || []).forEach(opt => {
          result[`${v.sleutel}_${opt.key}`] = val === opt.key;
        });
      } else if (v.type === 'currency' && val !== '' && val !== null && val !== undefined) {
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
    // Standaard variabelen: map klantgegevens naar sjabloontags
    for (const [variabele, ophalen] of Object.entries(STANDAARD_VARIABELEN)) {
      if (sleutels.includes(variabele)) {
        const waarde = ophalen(klant);
        if (waarde) matches[variabele] = waarde;
      }
    }
    // Overige klant-velden: directe sleutelovereenkomst (custom velden)
    for (const [key, val] of Object.entries(klant.velden || {})) {
      if (sleutels.includes(key) && val && !(key in matches)) matches[key] = val;
    }
    setWaarden(prev => ({ ...prev, ...matches }));
    setKlantPickerOpen(false);
    setKlantZoek('');
    const n = Object.keys(matches).length;
    setKlantMelding(n > 0 ? `${n} veld${n !== 1 ? 'en' : ''} ingevuld vanuit ${klant.naam}` : `Geen overeenkomende velden gevonden voor ${klant.naam}`);
    clearTimeout(klantMeldingTimer.current);
    klantMeldingTimer.current = setTimeout(() => setKlantMelding(''), 4000);
  }

  async function slaConceptOp() {
    await window.api.concepten.save({
      templateId,
      templateNaam: template.naam,
      waarden,
    });
    setConceptOpgeslagen(true);
    setTimeout(() => setConceptOpgeslagen(false), 2000);
    showToast('Concept opgeslagen');
  }

  async function verwijderConcept() {
    await window.api.concepten.delete(templateId);
    setConcept(null);
    setConceptGeladen(false);
  }

  async function handleGenereer() {
    if (!isIngevuld()) {
      setGeprobeerd(true);
      const eerste = ontbrekendeVelden()[0];
      if (eerste) document.getElementById(`veld-${eerste.sleutel}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
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
      // Concept verwijderen — fout hier mag genereren niet blokkeren
      try { await window.api.concepten.delete(templateId); } catch {}
      navigeer('export', { templateId, docxPad, templateNaam: template.naam, values: waarden, bestandsnaamPatroon: template.bestandsnaamPatroon });
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

  if (laadFout) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
        <AlertCircle size={32} className="text-red-400" />
        <p className="text-sm">Kon het sjabloon niet laden.</p>
        <button onClick={() => navigeer('browser')} className="text-sm text-blue-600 underline">
          Terug naar overzicht
        </button>
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

  // Groepeer velden per groepnaam (leeg = geen header)
  const gegroepeerdeVelden = (() => {
    const groepen = [];
    let huidigeGroep = null;
    for (const v of velden) {
      const groepNaam = v.groep || '';
      if (groepNaam !== huidigeGroep) {
        groepen.push({ naam: groepNaam, velden: [v] });
        huidigeGroep = groepNaam;
      } else {
        groepen[groepen.length - 1].velden.push(v);
      }
    }
    return groepen;
  })();

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
          <button onClick={() => setConceptVerwijderBevestig(true)} className="text-xs text-amber-600 hover:underline shrink-0">Verwijderen</button>
        </div>
      )}
      {autoOpgeslagenTijd && !conceptGeladen && (
        <div className="mb-4 flex items-center gap-2 px-3 py-2 text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-lg">
          <BookmarkCheck size={13} className="text-gray-400" />
          Automatisch opgeslagen om {autoOpgeslagenTijd.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
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

      {/* Velden (gegroepeerd per sectie) */}
      <div className="space-y-6">
        {gegroepeerdeVelden.map((groep, gi) => (
          <div key={gi}>
            {groep.naam && (
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {groep.naam}
              </h2>
            )}
            <div className="space-y-5">
              {groep.velden.map(veld => (
                <div key={veld.sleutel} id={`veld-${veld.sleutel}`}>
                  <VeldInput
                    veld={veld}
                    waarde={waarden[veld.sleutel]}
                    onChange={val => { setWaarden(prev => ({ ...prev, [veld.sleutel]: val })); }}
                    ondertekenaars={ondertekenaars}
                    geprobeerd={geprobeerd}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {fout && (
        <div className="mt-6 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {fout}
        </div>
      )}

      {/* Voortgangsindicator verplichte velden */}
      {(() => {
        const totaal = zichtbareVelden().filter(v => v.verplicht).length;
        const ingevuld = zichtbareVelden().filter(v => v.verplicht).filter(v => {
          const val = waarden[v.sleutel];
          return val !== '' && val !== null && val !== undefined;
        }).length;
        if (totaal === 0) return null;
        const pct = Math.round((ingevuld / totaal) * 100);
        return (
          <div className="mt-8 mb-2">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
              <span>{ingevuld} van {totaal} verplichte velden ingevuld</span>
              <span>{pct}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })()}

      <div className="mt-3 space-y-3">
        <button
          onClick={handleGenereer}
          disabled={bezig}
          className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          title="Ctrl+Enter"
        >
          {bezig && <Loader2 size={16} className="animate-spin" />}
          {bezig ? 'Bezig met genereren...' : 'Document genereren'}
        </button>
        {!isIngevuld() && !bezig && (
          <p className="text-xs text-gray-400 text-center">
            Nog in te vullen:{' '}
            {ontbrekendeVelden().map((v, i) => (
              <span key={v.sleutel}>
                {i > 0 && ', '}
                <button
                  type="button"
                  onClick={() => document.getElementById(`veld-${v.sleutel}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                  className="text-blue-500 hover:underline"
                >
                  {v.label}
                </button>
              </span>
            ))}
          </p>
        )}
        <button
          onClick={slaConceptOp}
          className="w-full py-2 px-6 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          title="Ctrl+S"
        >
          {conceptOpgeslagen ? (
            <><BookmarkCheck size={14} className="text-green-500" /> Concept opgeslagen!</>
          ) : (
            <><Save size={14} /> Concept opslaan</>
          )}
        </button>
      </div>

      {conceptVerwijderBevestig && (
        <ConfirmDialog
          titel="Concept verwijderen?"
          omschrijving="Het opgeslagen concept wordt verwijderd. De ingevulde waarden blijven zichtbaar in het formulier."
          bevestigLabel="Verwijderen"
          onBevestig={() => { verwijderConcept(); setConceptVerwijderBevestig(false); }}
          onAnnuleer={() => setConceptVerwijderBevestig(false)}
        />
      )}
    </div>
  );
}
