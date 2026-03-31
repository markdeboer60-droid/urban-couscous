import { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Users, Search, X, Check, UserPlus, FileText, RotateCcw, FolderOpen, Loader2, Building2 } from 'lucide-react';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToast } from '../context/ToastContext';
import { formatDatumTijd } from '../utils/formatDatum';

// Sleutels die als standaardvelden worden behandeld (niet in "Overige velden" getoond)
const STANDAARD_SLEUTELS = new Set(['adres', 'postcode', 'plaats', 'klantnummer']);
const CONTACT_REGEX = /^contactpersoon_(\d+)$/;

function isContactSleutel(sleutel) {
  return CONTACT_REGEX.test(sleutel);
}

export default function KlantenPage({ navigeer }) {
  const showToast = useToast();
  const [klanten, setKlanten] = useState([]);
  const [zoekterm, setZoekterm] = useState('');
  const [bewerkKlant, setBewerkKlant] = useState(null);
  const [verwijderBevestig, setVerwijderBevestig] = useState(null);

  useEffect(() => { laad(); }, []);

  async function laad() {
    const data = await window.api.klanten.getAll();
    setKlanten(data);
  }

  function nieuw() {
    setBewerkKlant({
      naam: '',
      velden: { klantnummer: '', adres: '', postcode: '', plaats: '', contactpersoon_1: '' },
    });
  }

  function bewerk(klant) {
    // Zorg dat alle standaardvelden aanwezig zijn
    const velden = { ...klant.velden };
    if (!('klantnummer'    in velden)) velden.klantnummer    = '';
    if (!('adres'          in velden)) velden.adres          = '';
    if (!('postcode'       in velden)) velden.postcode       = '';
    if (!('plaats'         in velden)) velden.plaats         = '';
    if (!('contactpersoon_1' in velden)) velden.contactpersoon_1 = '';
    setBewerkKlant({ ...klant, velden });
  }

  async function sla() {
    if (!bewerkKlant.naam.trim()) return;
    const isNieuw = !bewerkKlant.id;
    await window.api.klanten.save(bewerkKlant);
    setBewerkKlant(null);
    laad();
    showToast(isNieuw ? 'Klant toegevoegd' : 'Klant bijgewerkt');
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
        (k.velden?.klantnummer || '').toLowerCase().includes(zoekterm.toLowerCase()) ||
        (k.velden?.plaats || '').toLowerCase().includes(zoekterm.toLowerCase()) ||
        Object.values(k.velden || {}).some(v => String(v).toLowerCase().includes(zoekterm.toLowerCase()))
      )
    : klanten;

  if (bewerkKlant !== null) {
    return (
      <KlantFormulier
        klant={bewerkKlant}
        onChange={setBewerkKlant}
        onSla={sla}
        onAnnuleer={() => setBewerkKlant(null)}
        navigeer={navigeer}
      />
    );
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
            placeholder="Zoeken op naam, klantnummer of plaats..."
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

// ── Klantrij: klikken → direct bewerken ──────────────────────────────────────
function KlantRij({ klant, laatste, onBewerk, onVerwijder }) {
  const velden = klant.velden || {};
  const samenvatting = [velden.klantnummer, velden.plaats].filter(Boolean).join(' · ');
  const contacten = Object.entries(velden)
    .filter(([k]) => isContactSleutel(k) && velden[k])
    .map(([, v]) => v);

  return (
    <div
      className={`flex items-center gap-4 px-5 py-4 hover:bg-blue-50 transition-colors cursor-pointer group ${!laatste ? 'border-b border-gray-100' : ''}`}
      onClick={onBewerk}
    >
      <div className="p-2 bg-blue-50 rounded-lg shrink-0 group-hover:bg-blue-100 transition-colors">
        <Users size={15} className="text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-gray-900 group-hover:text-blue-700 transition-colors">
          {klant.naam}
        </div>
        <div className="text-xs text-gray-400 mt-0.5 truncate">
          {[samenvatting, ...contacten.slice(0, 1)].filter(Boolean).join(' · ')}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
        <button
          onClick={onBewerk}
          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="Bewerken"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={onVerwijder}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Verwijderen"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Klantformulier met standaardvelden ────────────────────────────────────────
function KlantFormulier({ klant, onChange, onSla, onAnnuleer, navigeer }) {
  const showToast = useToast();
  const velden = klant.velden || {};
  const [nieuwSleutel, setNieuwSleutel] = useState('');
  const [nieuwWaarde, setNieuwWaarde] = useState('');
  const [overeenkomsten, setOvereenkomsten] = useState([]);
  const [overeenkomstenLaden, setOvereenkomstenLaden] = useState(!!klant.id);
  const [verwijderDoc, setVerwijderDoc] = useState(null);
  const [bedrijfLaden, setBedrijfLaden] = useState(false);
  const [bedrijfKeuzes, setBedrijfKeuzes] = useState(null); // null | []
  const initialKlant = useRef(klant);

  async function zoekBedrijfGegevens() {
    if (!klant.naam.trim()) return;
    setBedrijfLaden(true);
    try {
      const result = await window.api.bedrijf.zoek({
        naam: klant.naam.trim(),
        plaats: (velden.plaats || '').trim(),
      });
      if (result.fout) {
        showToast(result.fout, 'error');
        return;
      }
      // Always show the selection modal (even with 1 result for confirmation)
      setBedrijfKeuzes(result.resultaten);
    } catch {
      showToast('Opzoeken mislukt', 'error');
    } finally {
      setBedrijfLaden(false);
    }
  }

  function kiesBedrijf(rec) {
    const nieuwVelden = { ...velden };
    if (rec.adres)    nieuwVelden.adres    = rec.adres;
    if (rec.postcode) nieuwVelden.postcode = rec.postcode;
    if (rec.plaats)   nieuwVelden.plaats   = rec.plaats;
    const nieuwKlant = { ...klant, velden: nieuwVelden };
    if (rec.naam) nieuwKlant.naam = rec.naam;
    onChange(nieuwKlant);
    setBedrijfKeuzes(null);
    showToast('Bedrijfsgegevens ingevuld');
  }

  useEffect(() => {
    if (!klant.id) return;
    const { naam, velden: v } = initialKlant.current;
    const naamLc = (naam || '').toLowerCase().trim();
    const nr = (v?.klantnummer || '').toLowerCase().trim();
    window.api.history.getAll().then(alle => {
      setOvereenkomsten(alle.filter(e => {
        const vals = e.values || {};
        const matchNaam = naamLc && (
          (vals['Klantnaam'] || '').toLowerCase().trim() === naamLc ||
          (vals['klantnaam'] || '').toLowerCase().trim() === naamLc
        );
        const matchNr = nr && (
          (vals['Klantnummer'] || '').toLowerCase().trim() === nr ||
          (vals['klantnummer'] || '').toLowerCase().trim() === nr
        );
        return matchNaam || matchNr;
      }));
    }).catch(() => {}).finally(() => setOvereenkomstenLaden(false));
  }, [klant.id]);

  async function verwijderOvereenkomst(id) {
    await window.api.history.delete(id);
    setOvereenkomsten(prev => prev.filter(e => e.id !== id));
    setVerwijderDoc(null);
  }

  function setVeld(key, val) {
    onChange({ ...klant, velden: { ...velden, [key]: val } });
  }

  function verwijderVeld(key) {
    const { [key]: _, ...rest } = velden;
    onChange({ ...klant, velden: rest });
  }

  // Contactpersonen: geordende lijst op nummer
  const contactIndices = Object.keys(velden)
    .map(k => { const m = k.match(CONTACT_REGEX); return m ? parseInt(m[1]) : null; })
    .filter(Boolean)
    .sort((a, b) => a - b);
  const hoogsteContact = contactIndices.length > 0 ? Math.max(...contactIndices) : 1;
  // Altijd minstens contactpersoon_1 tonen
  const contactLijst = contactIndices.length > 0 ? contactIndices : [1];

  function voegContactToe() {
    setVeld(`contactpersoon_${hoogsteContact + 1}`, '');
  }

  function verwijderContact(n) {
    const nieuwVelden = { ...velden };
    delete nieuwVelden[`contactpersoon_${n}`];
    // Hernummer hoger-genummerde contacten
    for (let i = n + 1; i <= hoogsteContact; i++) {
      if (nieuwVelden[`contactpersoon_${i}`] !== undefined) {
        nieuwVelden[`contactpersoon_${i - 1}`] = nieuwVelden[`contactpersoon_${i}`];
        delete nieuwVelden[`contactpersoon_${i}`];
      }
    }
    onChange({ ...klant, velden: nieuwVelden });
  }

  // Overige velden: alles behalve standaard en contactpersonen
  const overigeVelden = Object.entries(velden).filter(([k]) =>
    !STANDAARD_SLEUTELS.has(k) && !isContactSleutel(k)
  );

  function voegOverigeToe() {
    const k = nieuwSleutel.trim().replace(/\s+/g, '_');
    if (!k) return;
    setVeld(k, nieuwWaarde);
    setNieuwSleutel('');
    setNieuwWaarde('');
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <button onClick={onAnnuleer} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
        <X size={16} />
        Annuleren
      </button>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">
        {klant.id ? klant.naam || 'Klant bewerken' : 'Klant toevoegen'}
      </h1>

      {/* Naam */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Klantgegevens</h2>
          <button
            type="button"
            onClick={zoekBedrijfGegevens}
            disabled={!klant.naam.trim() || bedrijfLaden}
            title="Adresgegevens opzoeken via bedrijvenmonitor.info"
            className="flex items-center gap-1.5 text-xs text-blue-600 border border-blue-200 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {bedrijfLaden
              ? <Loader2 size={13} className="animate-spin" />
              : <Building2 size={13} />}
            {bedrijfLaden ? 'Bezig...' : 'Gegevens opzoeken'}
          </button>
        </div>
        <Invoerveld label="Naam" verplicht variabele="{Klantnaam}">
          <input
            type="text"
            value={klant.naam}
            onChange={e => onChange({ ...klant, naam: e.target.value })}
            placeholder="Naam klant of bedrijf"
            className="invoer"
            autoFocus
          />
        </Invoerveld>
        <Invoerveld label="Klantnummer">
          <input
            type="text"
            value={velden.klantnummer || ''}
            onChange={e => setVeld('klantnummer', e.target.value)}
            placeholder="bijv. K-1042"
            className="invoer"
          />
        </Invoerveld>
        <Invoerveld label="Adres en huisnummer" variabele="{Adres + huisnummer}">
          <input
            type="text"
            value={velden.adres || ''}
            onChange={e => setVeld('adres', e.target.value)}
            placeholder="Straat en huisnummer"
            className="invoer"
          />
        </Invoerveld>
        <div>
          <div className="grid grid-cols-3 gap-3">
            <Invoerveld label="Postcode">
              <input
                type="text"
                value={velden.postcode || ''}
                onChange={e => setVeld('postcode', e.target.value)}
                placeholder="1234 AB"
                className="invoer"
              />
            </Invoerveld>
            <div className="col-span-2">
              <Invoerveld label="Plaats">
                <input
                  type="text"
                  value={velden.plaats || ''}
                  onChange={e => setVeld('plaats', e.target.value)}
                  placeholder="Amsterdam"
                  className="invoer"
                />
              </Invoerveld>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Samen gebruikt als <span className="font-mono text-blue-500">{'{Postcode + plaatsnaam}'}</span> in sjablonen
          </p>
        </div>
      </div>

      {/* Contactpersonen */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">Contactpersonen</h2>
          <button
            onClick={voegContactToe}
            className="flex items-center gap-1.5 text-xs text-blue-600 border border-blue-200 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <UserPlus size={13} />
            Contactpersoon toevoegen
          </button>
        </div>
        <div className="space-y-3">
          {contactLijst.map(n => (
            <div key={n} className="flex items-center gap-2">
              <div className="w-28 shrink-0">
                <span className="text-xs text-gray-500 block leading-tight">Contactpersoon {n}</span>
                <span className="text-xs font-mono text-blue-500 leading-tight">
                  {n === 1 ? '{Naam contactpersoon}' : `{Naam contactpersoon${n}}`}
                </span>
              </div>
              <input
                type="text"
                value={velden[`contactpersoon_${n}`] || ''}
                onChange={e => setVeld(`contactpersoon_${n}`, e.target.value)}
                placeholder="Naam contactpersoon"
                className="invoer flex-1"
              />
              {(n > 1 || contactLijst.length > 1) && (
                <button
                  onClick={() => verwijderContact(n)}
                  className="p-1.5 text-gray-400 hover:text-red-600 transition-colors shrink-0"
                  title="Verwijderen"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Overige velden */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">Overige velden</h2>
        <p className="text-xs text-gray-400 mb-4">
          Extra velden die overeenkomen met variabelenamen in sjablonen (bijv. <code className="bg-gray-100 px-1 rounded">btw_nummer</code>).
        </p>
        <div className="space-y-2 mb-4">
          {overigeVelden.map(([key, val]) => (
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
          {overigeVelden.length === 0 && (
            <p className="text-xs text-gray-400 py-1">Geen extra velden.</p>
          )}
        </div>
        <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
          <input
            type="text"
            value={nieuwSleutel}
            onChange={e => setNieuwSleutel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && voegOverigeToe()}
            placeholder="sleutel"
            className="invoer text-sm font-mono w-36 shrink-0"
          />
          <input
            type="text"
            value={nieuwWaarde}
            onChange={e => setNieuwWaarde(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && voegOverigeToe()}
            placeholder="waarde"
            className="invoer text-sm flex-1"
          />
          <button
            onClick={voegOverigeToe}
            disabled={!nieuwSleutel.trim()}
            className="flex items-center gap-1 px-3 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-40 shrink-0"
          >
            <Plus size={14} />
            Toevoegen
          </button>
        </div>
      </div>

      {/* Notities */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mt-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">Notities</h2>
        <p className="text-xs text-gray-400 mb-3">Interne aantekeningen en bijzonderheden over deze klant.</p>
        <textarea
          value={klant.notities || ''}
          onChange={e => onChange({ ...klant, notities: e.target.value })}
          rows={3}
          placeholder="Bijzonderheden, afspraken, aandachtspunten..."
          className="invoer w-full resize-y text-sm"
        />
      </div>

      {/* Overeenkomsten — alleen tonen voor bestaande klanten */}
      {klant.id && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mt-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Overeenkomsten</h2>
          {overeenkomstenLaden ? (
            <div className="flex items-center gap-2 text-gray-400 py-1">
              <Loader2 size={13} className="animate-spin" />
              <span className="text-xs">Laden...</span>
            </div>
          ) : overeenkomsten.length === 0 ? (
            <p className="text-xs text-gray-400 py-1">
              Geen documenten gevonden voor <span className="font-medium">{klant.naam}</span>.
            </p>
          ) : (
            <div className="space-y-2">
              {overeenkomsten.map(entry => (
                <div key={entry.id} className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg">
                  <FileText size={15} className="text-blue-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{entry.templateNaam}</div>
                    {entry.ondertitel && (
                      <div className="text-xs text-gray-500 truncate">{entry.ondertitel}</div>
                    )}
                    <div className="text-xs text-gray-400 mt-0.5">{formatDatumTijd(entry.datum)}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => navigeer('form', { templateId: entry.templateId, initieleWaarden: entry.values })}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Herbewerken"
                    >
                      <RotateCcw size={14} />
                    </button>
                    <button
                      onClick={async () => { try { await window.api.export.openInWord(entry.docxPad); } catch {} }}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Openen in Word"
                    >
                      <FolderOpen size={14} />
                    </button>
                    <button
                      onClick={() => setVerwijderDoc(entry.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Verwijderen"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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

      {verwijderDoc && (
        <ConfirmDialog
          titel="Document verwijderen?"
          omschrijving="Het document wordt definitief verwijderd uit de geschiedenis."
          bevestigLabel="Verwijderen"
          onBevestig={() => verwijderOvereenkomst(verwijderDoc)}
          onAnnuleer={() => setVerwijderDoc(null)}
        />
      )}

      {bedrijfKeuzes !== null && (
        <BedrijfKiezenModal
          resultaten={bedrijfKeuzes}
          onKies={kiesBedrijf}
          onSluiten={() => setBedrijfKeuzes(null)}
        />
      )}
    </div>
  );
}

// ── Modal: kies het juiste bedrijf uit de zoekresultaten ─────────────────────
function BedrijfKiezenModal({ resultaten, onKies, onSluiten }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onSluiten} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Bedrijf kiezen</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {resultaten.length === 0
                ? 'Geen resultaten gevonden'
                : `${resultaten.length} bedrijf${resultaten.length !== 1 ? 'en' : ''} gevonden — klik op het juiste bedrijf`}
            </p>
          </div>
          <button
            onClick={onSluiten}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* results list */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {resultaten.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-gray-400">
              <Search size={32} className="mb-3 opacity-30" />
              <p className="text-sm">Geen bedrijven gevonden</p>
              <p className="text-xs mt-1">Controleer de bedrijfsnaam en probeer opnieuw</p>
            </div>
          ) : (
            resultaten.map((rec, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onKies(rec)}
                className="w-full text-left p-4 border border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-gray-900 group-hover:text-blue-700 transition-colors">
                      {rec.naam || <span className="text-gray-400 italic">Onbekende naam</span>}
                    </div>
                    {rec.kvknummer && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        KVK: <span className="font-mono">{rec.kvknummer}</span>
                      </div>
                    )}
                    <div className="text-xs text-gray-600 mt-1.5 space-y-0.5">
                      {rec.adres && <div>{rec.adres}</div>}
                      {(rec.postcode || rec.plaats) && (
                        <div>{[rec.postcode, rec.plaats].filter(Boolean).join('  ')}</div>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0 mt-0.5">
                    {rec.bron}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onSluiten}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Sluiten
          </button>
        </div>
      </div>
    </div>
  );
}

function Invoerveld({ label, verplicht, variabele, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <label className="text-xs font-medium text-gray-600">
          {label}{verplicht && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {variabele && (
          <span className="text-xs font-mono text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded leading-none">
            {variabele}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
