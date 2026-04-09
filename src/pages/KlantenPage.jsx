import { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Users, Search, X, Check, UserPlus, FileText, RotateCcw, FolderOpen, Loader2, Building2, FileUp } from 'lucide-react';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToast } from '../context/ToastContext';
import { formatDatumTijd } from '../utils/formatDatum';

// Sleutels die als standaardvelden worden behandeld (niet in "Overige velden" getoond)
const STANDAARD_SLEUTELS = new Set([
  // Contactpersoon
  'aanhef', 'bsn_nummer', 'geboortedatum', 'email_contactpersoon', 'telefoonnummer_contactpersoon',
  'adres_contactpersoon', 'postcode_contactpersoon', 'plaats_contactpersoon',
  // Onderneming
  'rechtsvorm', 'klantnummer', 'kvk_nummer', 'btw_nummer', 'iban',
  'oprichtingsdatum', 'sbi_code', 'omschrijving_activiteiten',
  'adres', 'postcode', 'plaats',
  // Opdracht & kantoor
  'startjaar_opdracht', 'naam_behandelaar', 'plaats_ondertekening', 'bedragsalaris',
]);
const STANDAARD_VELDEN_INIT = {
  // Contactpersoon
  aanhef: '', bsn_nummer: '', geboortedatum: '',
  email_contactpersoon: '', telefoonnummer_contactpersoon: '',
  adres_contactpersoon: '', postcode_contactpersoon: '', plaats_contactpersoon: '',
  contactpersoon_1: '',
  // Onderneming
  rechtsvorm: '', klantnummer: '', kvk_nummer: '', btw_nummer: '', iban: '',
  oprichtingsdatum: '', sbi_code: '', omschrijving_activiteiten: '',
  adres: '', postcode: '', plaats: '',
  // Opdracht & kantoor
  startjaar_opdracht: '', naam_behandelaar: '', plaats_ondertekening: '', bedragsalaris: '',
};
const CONTACT_REGEX = /^contactpersoon_(\d+)$/;
const RECHTSVORMEN = ['Besloten Vennootschap (BV)', 'Eenmanszaak', 'Vennootschap onder Firma (VOF)', 'Commanditaire Vennootschap (CV)', 'Naamloze Vennootschap (NV)', 'Maatschap', 'Stichting', 'Vereniging', 'Coöperatie'];

function isContactSleutel(sleutel) {
  return CONTACT_REGEX.test(sleutel);
}

export default function KlantenPage({ navigeer }) {
  const showToast = useToast();
  const [klanten, setKlanten] = useState([]);
  const [zoekterm, setZoekterm] = useState('');
  const [bewerkKlant, setBewerkKlant] = useState(null);
  const [verwijderBevestig, setVerwijderBevestig] = useState(null);
  const [duplicaatWaarschuwing, setDuplicaatWaarschuwing] = useState(null); // { bericht } | null
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [sortering, setSortering] = useState('naam-az');

  useEffect(() => { laad(); }, []);

  async function laad() {
    const data = await window.api.klanten.getAll();
    setKlanten(data);
  }

  function nieuw() {
    setBewerkKlant({ naam: '', velden: { ...STANDAARD_VELDEN_INIT } });
  }

  function bewerk(klant) {
    setBewerkKlant({ ...klant, velden: { ...STANDAARD_VELDEN_INIT, ...klant.velden } });
  }

  async function sla(forceer = false) {
    if (!bewerkKlant.naam.trim()) return;
    const isNieuw = !bewerkKlant.id;

    if (!forceer) {
      const kvk = (bewerkKlant.velden?.kvk_nummer || '').trim();
      const naamLc = bewerkKlant.naam.trim().toLowerCase();
      const duplicaat = klanten.find(k => {
        if (k.id === bewerkKlant.id) return false; // zichzelf overslaan bij bewerken
        const kvkMatch = kvk && (k.velden?.kvk_nummer || '').trim() === kvk;
        const naamMatch = k.naam.trim().toLowerCase() === naamLc;
        return kvkMatch || naamMatch;
      });
      if (duplicaat) {
        setDuplicaatWaarschuwing({
          bericht: kvk && (duplicaat.velden?.kvk_nummer || '').trim() === kvk
            ? `Er bestaat al een klant met KVK-nummer ${kvk}: "${duplicaat.naam}".`
            : `Er bestaat al een klant met de naam "${duplicaat.naam}".`,
        });
        return;
      }
    }

    setDuplicaatWaarschuwing(null);
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

  const gefilterd = (zoekterm
    ? klanten.filter(k =>
        k.naam.toLowerCase().includes(zoekterm.toLowerCase()) ||
        (k.velden?.klantnummer || '').toLowerCase().includes(zoekterm.toLowerCase()) ||
        (k.velden?.plaats || '').toLowerCase().includes(zoekterm.toLowerCase()) ||
        Object.values(k.velden || {}).some(v => String(v).toLowerCase().includes(zoekterm.toLowerCase()))
      )
    : [...klanten]
  ).sort((a, b) => {
    if (sortering === 'naam-az') return a.naam.localeCompare(b.naam, 'nl');
    if (sortering === 'naam-za') return b.naam.localeCompare(a.naam, 'nl');
    if (sortering === 'klantnummer') {
      const ka = a.velden?.klantnummer || '';
      const kb = b.velden?.klantnummer || '';
      return ka.localeCompare(kb, 'nl', { numeric: true });
    }
    return 0;
  });

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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCsvImportOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileUp size={15} />
            Importeer CSV
          </button>
          <button
            onClick={nieuw}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={15} />
            Klant toevoegen
          </button>
        </div>
      </div>

      {klanten.length > 0 && (
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Zoeken op naam, klantnummer of plaats..."
              value={zoekterm}
              onChange={e => setZoekterm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <select
            value={sortering}
            onChange={e => setSortering(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-600"
          >
            <option value="naam-az">Naam A–Z</option>
            <option value="naam-za">Naam Z–A</option>
            <option value="klantnummer">Klantnummer</option>
          </select>
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

      {duplicaatWaarschuwing && (
        <ConfirmDialog
          titel="Mogelijke dubbele klant"
          omschrijving={`${duplicaatWaarschuwing.bericht} Wilt u toch doorgaan met opslaan?`}
          bevestigLabel="Toch opslaan"
          onBevestig={() => sla(true)}
          onAnnuleer={() => setDuplicaatWaarschuwing(null)}
        />
      )}

      {csvImportOpen && (
        <CsvImportModal
          onSluiten={() => setCsvImportOpen(false)}
          onImport={async (nieuweKlanten) => {
            for (const k of nieuweKlanten) {
              await window.api.klanten.save(k);
            }
            setCsvImportOpen(false);
            laad();
            showToast(`${nieuweKlanten.length} klant${nieuweKlanten.length !== 1 ? 'en' : ''} geïmporteerd`);
          }}
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
      {klant.bijgewerkt && (
        <div className="text-xs text-gray-300 shrink-0 hidden group-hover:block" title="Laatste wijziging">
          {new Date(klant.bijgewerkt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      )}
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
  const [overeenkomstenFout, setOvereenkomstenFout] = useState(false);
  const [verwijderDoc, setVerwijderDoc] = useState(null);
  const [wordFout, setWordFout] = useState({});
  const [bedrijfLaden, setBedrijfLaden] = useState(false);
  const [bedrijfKeuzes, setBedrijfKeuzes] = useState(null); // null | []
  const [kvkLaden, setKvkLaden] = useState(false);
  const [ondertekenaars, setOndertekenaars] = useState([]);
  const initialKlant = useRef(klant);

  useEffect(() => {
    window.api.settings.get().then(s => setOndertekenaars(s.ondertekenaars || [])).catch(() => {});
  }, []);

  async function scanKvkUittreksel() {
    setKvkLaden(true);
    try {
      const pad = await window.api.kvk.selectPdf();
      if (!pad) return;
      const gevonden = await window.api.kvk.scanPdf(pad);
      const nieuwVelden = { ...velden };
      let n = 0;
      const stel = (key, val) => { if (val) { nieuwVelden[key] = val; n++; } };
      stel('kvk_nummer',      gevonden.kvk_nummer);
      stel('rechtsvorm',      gevonden.rechtsvorm);
      stel('adres',           gevonden.adres);
      stel('postcode',        gevonden.postcode);
      stel('plaats',          gevonden.plaats);
      stel('oprichtingsdatum',gevonden.oprichtingsdatum);
      stel('sbi_code',        gevonden.sbi_code);
      stel('btw_nummer',      gevonden.btw_nummer);
      if (gevonden.geboortedatum && !velden.geboortedatum)     { nieuwVelden.geboortedatum    = gevonden.geboortedatum;    n++; }
      if (gevonden.naam_bestuurder && !velden.contactpersoon_1){ nieuwVelden.contactpersoon_1 = gevonden.naam_bestuurder; n++; }
      const nieuwKlant = { ...klant, velden: nieuwVelden };
      if (gevonden.bedrijfsnaam && !klant.naam) { nieuwKlant.naam = gevonden.bedrijfsnaam; n++; }
      onChange(nieuwKlant);
      showToast(n > 0 ? `${n} veld${n !== 1 ? 'en' : ''} ingevuld vanuit KVK uittreksel` : 'Geen gegevens herkend in dit uittreksel', n > 0 ? undefined : 'info');
    } catch (e) {
      showToast(`Scannen mislukt: ${e?.message || String(e)}`, 'error');
    } finally {
      setKvkLaden(false);
    }
  }

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
    if (rec.adres)     nieuwVelden.adres     = rec.adres;
    if (rec.postcode)  nieuwVelden.postcode  = rec.postcode;
    if (rec.plaats)    nieuwVelden.plaats    = rec.plaats;
    if (rec.kvknummer) nieuwVelden.kvk_nummer = rec.kvknummer;
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
          (vals['klantnaam'] || '').toLowerCase().trim() === naamLc ||
          (vals['Naam onderneming'] || '').toLowerCase().trim() === naamLc
        );
        const matchNr = nr && (
          (vals['Klantnummer'] || '').toLowerCase().trim() === nr ||
          (vals['klantnummer'] || '').toLowerCase().trim() === nr
        );
        return matchNaam || matchNr;
      }));
    }).catch(() => setOvereenkomstenFout(true)).finally(() => setOvereenkomstenLaden(false));
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
  // Extrapersonen = contactpersoon_2 en hoger
  const extraContactLijst = contactIndices.filter(n => n > 1);

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

      {/* 1. Contactpersoon */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Contactpersoon</h2>
        <div className="grid grid-cols-3 gap-3">
          <Invoerveld label="Aanhef" variabele="{Aanhef}">
            <select value={velden.aanhef || ''} onChange={e => setVeld('aanhef', e.target.value)} className="invoer">
              <option value="">— kies —</option>
              <option value="De Heer">De Heer</option>
              <option value="Mevrouw">Mevrouw</option>
            </select>
          </Invoerveld>
          <div className="col-span-2">
            <Invoerveld label="Naam contactpersoon" variabele="{Naam contactpersoon}">
              <input type="text" value={velden.contactpersoon_1 || ''} onChange={e => setVeld('contactpersoon_1', e.target.value)} placeholder="Volledige naam" className="invoer" autoFocus />
            </Invoerveld>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Invoerveld label="Geboortedatum" variabele="{Geboortedatum contactpersoon}">
            <input type="text" value={velden.geboortedatum || ''} onChange={e => setVeld('geboortedatum', e.target.value)} placeholder="bijv. 1 januari 1980" className="invoer" />
          </Invoerveld>
          <Invoerveld label="BSN-nummer" variabele="{BSN nummer}">
            <input type="text" value={velden.bsn_nummer || ''} onChange={e => setVeld('bsn_nummer', e.target.value)} placeholder="123456789" className="invoer" />
          </Invoerveld>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Invoerveld label="E-mailadres" variabele="{Email contactpersoon}">
            <input type="email" value={velden.email_contactpersoon || ''} onChange={e => setVeld('email_contactpersoon', e.target.value)} placeholder="naam@voorbeeld.nl" className="invoer" />
          </Invoerveld>
          <Invoerveld label="Telefoonnummer" variabele="{Telefoonnummer contactpersoon}">
            <input type="text" value={velden.telefoonnummer_contactpersoon || ''} onChange={e => setVeld('telefoonnummer_contactpersoon', e.target.value)} placeholder="06-12345678" className="invoer" />
          </Invoerveld>
        </div>
        <Invoerveld label="Adres en huisnummer" variabele="{Adres + huisnummer contactpersoon}">
          <input type="text" value={velden.adres_contactpersoon || ''} onChange={e => setVeld('adres_contactpersoon', e.target.value)} placeholder="Straat en huisnummer" className="invoer" />
        </Invoerveld>
        <div>
          <div className="grid grid-cols-3 gap-3">
            <Invoerveld label="Postcode">
              <input type="text" value={velden.postcode_contactpersoon || ''} onChange={e => setVeld('postcode_contactpersoon', e.target.value)} placeholder="1234 AB" className="invoer" />
            </Invoerveld>
            <div className="col-span-2">
              <Invoerveld label="Plaats">
                <input type="text" value={velden.plaats_contactpersoon || ''} onChange={e => setVeld('plaats_contactpersoon', e.target.value)} placeholder="Amsterdam" className="invoer" />
              </Invoerveld>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1">Samen gebruikt als <span className="font-mono text-blue-500">{'{Postcode + plaatsnaam contactpersoon}'}</span></p>
        </div>
      </div>

      {/* 2. Extra contactpersonen */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Extra contactpersonen</h2>
          <button
            onClick={voegContactToe}
            className="flex items-center gap-1.5 text-xs text-blue-600 border border-blue-200 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <UserPlus size={13} />
            Toevoegen
          </button>
        </div>
        {extraContactLijst.length === 0 ? (
          <p className="text-xs text-gray-400">Nog geen extra contactpersonen.</p>
        ) : (
          <div className="space-y-3">
            {extraContactLijst.map(n => (
              <div key={n} className="flex items-center gap-2">
                <div className="w-28 shrink-0">
                  <span className="text-xs text-gray-500 block leading-tight">Contactpersoon {n}</span>
                  <span className="text-xs font-mono text-blue-500 leading-tight">{`{Naam contactpersoon${n}}`}</span>
                </div>
                <input
                  type="text"
                  value={velden[`contactpersoon_${n}`] || ''}
                  onChange={e => setVeld(`contactpersoon_${n}`, e.target.value)}
                  placeholder="Naam contactpersoon"
                  className="invoer flex-1"
                />
                <button
                  onClick={() => verwijderContact(n)}
                  className="p-1.5 text-gray-400 hover:text-red-600 transition-colors shrink-0"
                  title="Verwijderen"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Onderneming */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Onderneming</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={scanKvkUittreksel}
              disabled={kvkLaden}
              title="KVK uittreksel uploaden en automatisch inlezen"
              className="flex items-center gap-1.5 text-xs text-green-700 border border-green-200 bg-green-50 px-2.5 py-1.5 rounded-lg hover:bg-green-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {kvkLaden ? <Loader2 size={13} className="animate-spin" /> : <FileUp size={13} />}
              {kvkLaden ? 'Inlezen...' : 'KVK uittreksel'}
            </button>
            <button
              type="button"
              onClick={zoekBedrijfGegevens}
              disabled={!klant.naam.trim() || bedrijfLaden}
              title="Adresgegevens opzoeken via bedrijvenmonitor.info"
              className="flex items-center gap-1.5 text-xs text-blue-600 border border-blue-200 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {bedrijfLaden ? <Loader2 size={13} className="animate-spin" /> : <Building2 size={13} />}
              {bedrijfLaden ? 'Bezig...' : 'Gegevens opzoeken'}
            </button>
          </div>
        </div>
        <Invoerveld label="Naam onderneming" verplicht variabele="{Naam onderneming}">
          <input type="text" value={klant.naam} onChange={e => onChange({ ...klant, naam: e.target.value })} placeholder="Naam bedrijf of onderneming" className="invoer" />
        </Invoerveld>
        <div className="grid grid-cols-2 gap-3">
          <Invoerveld label="Rechtsvorm" variabele="{Rechtsvorm}">
            <select value={velden.rechtsvorm || ''} onChange={e => setVeld('rechtsvorm', e.target.value)} className="invoer">
              <option value="">— kies rechtsvorm —</option>
              {RECHTSVORMEN.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Invoerveld>
          <Invoerveld label="Klantnummer">
            <input type="text" value={velden.klantnummer || ''} onChange={e => setVeld('klantnummer', e.target.value)} placeholder="bijv. K-1042" className="invoer" />
          </Invoerveld>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Invoerveld label="KVK-nummer" variabele="{KVK nummer}">
            <input type="text" value={velden.kvk_nummer || ''} onChange={e => setVeld('kvk_nummer', e.target.value)} placeholder="12345678" className="invoer" />
          </Invoerveld>
          <Invoerveld label="BTW-nummer" variabele="{BTW nummer}">
            <input type="text" value={velden.btw_nummer || ''} onChange={e => setVeld('btw_nummer', e.target.value)} placeholder="NL123456789B01" className="invoer" />
          </Invoerveld>
        </div>
        <Invoerveld label="IBAN (bankrekeningnummer)" variabele="{IBAN}">
          <input type="text" value={velden.iban || ''} onChange={e => setVeld('iban', e.target.value)} placeholder="NL00 BANK 0000 0000 00" className="invoer" />
        </Invoerveld>
        <div className="grid grid-cols-2 gap-3">
          <Invoerveld label="Oprichtingsdatum" variabele="{Oprichtingsdatum}">
            <input type="text" value={velden.oprichtingsdatum || ''} onChange={e => setVeld('oprichtingsdatum', e.target.value)} placeholder="bijv. 1 januari 2020" className="invoer" />
          </Invoerveld>
          <Invoerveld label="SBI-code" variabele="{SBI code}">
            <input type="text" value={velden.sbi_code || ''} onChange={e => setVeld('sbi_code', e.target.value)} placeholder="bijv. 6920" className="invoer" />
          </Invoerveld>
        </div>
        <Invoerveld label="Omschrijving activiteiten" variabele="{Omschrijving activiteiten onderneming}">
          <textarea value={velden.omschrijving_activiteiten || ''} onChange={e => setVeld('omschrijving_activiteiten', e.target.value)} rows={2} placeholder="Korte omschrijving van de ondernemingsactiviteiten" className="invoer w-full resize-y" />
        </Invoerveld>
        <Invoerveld label="Adres en huisnummer" variabele="{Adres + huisnummer onderneming}">
          <input type="text" value={velden.adres || ''} onChange={e => setVeld('adres', e.target.value)} placeholder="Straat en huisnummer" className="invoer" />
        </Invoerveld>
        <div>
          <div className="grid grid-cols-3 gap-3">
            <Invoerveld label="Postcode">
              <input type="text" value={velden.postcode || ''} onChange={e => setVeld('postcode', e.target.value)} placeholder="1234 AB" className="invoer" />
            </Invoerveld>
            <div className="col-span-2">
              <Invoerveld label="Vestigingsplaats" variabele="{Vestigingsplaats}">
                <input type="text" value={velden.plaats || ''} onChange={e => setVeld('plaats', e.target.value)} placeholder="Amsterdam" className="invoer" />
              </Invoerveld>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1">Samen gebruikt als <span className="font-mono text-blue-500">{'{Postcode + plaatsnaam onderneming}'}</span></p>
        </div>
      </div>

      {/* 4. Opdracht & Kantoor */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Opdracht &amp; kantoor</h2>
        <div className="grid grid-cols-2 gap-3">
          <Invoerveld label="Startjaar opdracht" variabele="{Startjaar opdracht}">
            <input type="text" value={velden.startjaar_opdracht || ''} onChange={e => setVeld('startjaar_opdracht', e.target.value)} placeholder="bijv. 2024" className="invoer" />
          </Invoerveld>
          <Invoerveld label="Behandelaar / ondertekenaar" variabele="{Behandelaar}">
            <select value={velden.naam_behandelaar || ''} onChange={e => setVeld('naam_behandelaar', e.target.value)} className="invoer">
              <option value="">— kies behandelaar —</option>
              {ondertekenaars.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </Invoerveld>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Invoerveld label="Plaats ondertekening" variabele="{Plaats ondertekening}">
            <input type="text" value={velden.plaats_ondertekening || ''} onChange={e => setVeld('plaats_ondertekening', e.target.value)} placeholder="bijv. Amsterdam" className="invoer" />
          </Invoerveld>
          <Invoerveld label="DGA-salaris" variabele="{Bedragsalaris}">
            <input type="text" value={velden.bedragsalaris || ''} onChange={e => setVeld('bedragsalaris', e.target.value)} placeholder="bijv. 56.000" className="invoer" />
          </Invoerveld>
        </div>
      </div>

      {/* 5. Overige velden */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">Overige velden</h2>
        <p className="text-xs text-gray-400 mb-4">
          Extra velden die overeenkomen met variabelenamen in sjablonen (bijv. <code className="bg-gray-100 px-1 rounded">aandelen_percentage</code>).
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

      {/* 5. Notities */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
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

      {/* 6. Overeenkomsten — alleen tonen voor bestaande klanten */}
      {klant.id && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Overeenkomsten</h2>
          {overeenkomstenLaden ? (
            <div className="flex items-center gap-2 text-gray-400 py-1">
              <Loader2 size={13} className="animate-spin" />
              <span className="text-xs">Laden...</span>
            </div>
          ) : overeenkomstenFout ? (
            <p className="text-xs text-red-500 py-1">Kon de documenten niet laden. Controleer of de app correct is geïnstalleerd.</p>
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
                  <div className="flex flex-col items-end gap-1">
                    {wordFout[entry.id] && (
                      <span className="text-xs text-red-500 max-w-48 text-right">{wordFout[entry.id]}</span>
                    )}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => navigeer('form', { templateId: entry.templateId, initieleWaarden: entry.values })}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Opnieuw bewerken"
                      >
                        <RotateCcw size={14} />
                      </button>
                      <button
                        onClick={async () => {
                          setWordFout(f => ({ ...f, [entry.id]: null }));
                          try {
                            await window.api.export.openInWord(entry.docxPad);
                          } catch {
                            setWordFout(f => ({ ...f, [entry.id]: 'Bestand niet gevonden — genereer het document opnieuw.' }));
                          }
                        }}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Openen in Word"
                      >
                        <FolderOpen size={14} />
                      </button>
                      <button
                        onClick={() => navigeer('export', {
                          templateId: entry.templateId,
                          templateNaam: entry.templateNaam,
                          docxPad: entry.docxPad,
                          values: entry.values || {},
                          bestandsnaamPatroon: null,
                        })}
                        className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Exportopties (PDF, e-mail, afdrukken)"
                      >
                        <FileText size={14} />
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
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-2 flex justify-end gap-3">
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

// ── CSV import modal ──────────────────────────────────────────────────────────
function parseCsv(tekst) {
  const regels = tekst.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(r => r.trim());
  if (regels.length < 2) return { kolommen: [], rijen: [] };
  const parseerRegel = (regel) => {
    const cellen = [];
    let cel = '', inQuotes = false;
    for (let i = 0; i < regel.length; i++) {
      const c = regel[i];
      if (c === '"') {
        if (inQuotes && regel[i + 1] === '"') { cel += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if ((c === ',' || c === ';') && !inQuotes) {
        cellen.push(cel.trim()); cel = '';
      } else {
        cel += c;
      }
    }
    cellen.push(cel.trim());
    return cellen;
  };
  const kolommen = parseerRegel(regels[0]);
  const rijen = regels.slice(1).map(r => {
    const cellen = parseerRegel(r);
    return Object.fromEntries(kolommen.map((k, i) => [k, cellen[i] || '']));
  });
  return { kolommen, rijen };
}

const CSV_VELD_OPTIES = [
  { sleutel: 'naam',                        label: 'Naam onderneming' },
  { sleutel: 'klantnummer',                 label: 'Klantnummer' },
  { sleutel: 'kvk_nummer',                  label: 'KVK nummer' },
  { sleutel: 'btw_nummer',                  label: 'BTW nummer' },
  { sleutel: 'iban',                        label: 'IBAN' },
  { sleutel: 'rechtsvorm',                  label: 'Rechtsvorm' },
  { sleutel: 'adres',                       label: 'Adres onderneming' },
  { sleutel: 'postcode',                    label: 'Postcode onderneming' },
  { sleutel: 'plaats',                      label: 'Plaats onderneming' },
  { sleutel: 'contactpersoon_1',            label: 'Contactpersoon' },
  { sleutel: 'email_contactpersoon',        label: 'E-mail contactpersoon' },
  { sleutel: 'telefoonnummer_contactpersoon', label: 'Telefoonnummer' },
  { sleutel: 'oprichtingsdatum',            label: 'Oprichtingsdatum' },
  { sleutel: 'naam_behandelaar',            label: 'Behandelaar' },
  { sleutel: 'startjaar_opdracht',          label: 'Startjaar opdracht' },
];

function CsvImportModal({ onSluiten, onImport }) {
  const [stap, setStap] = useState('laden'); // laden | koppelen | bevestigen
  const [kolommen, setKolommen] = useState([]);
  const [rijen, setRijen] = useState([]);
  const [koppeling, setKoppeling] = useState({}); // sleutel → CSV-kolom
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState('');

  async function laadCsv() {
    setBezig(true);
    setFout('');
    try {
      const inhoud = await window.api.klanten.selecteerCsv();
      if (!inhoud) { setBezig(false); return; }
      const { kolommen: k, rijen: r } = parseCsv(inhoud);
      if (k.length === 0) { setFout('Geen kolommen gevonden in het CSV-bestand.'); setBezig(false); return; }
      setKolommen(k);
      setRijen(r);
      // Automatisch koppelen op basis van kolomnaam
      const autoKoppeling = {};
      CSV_VELD_OPTIES.forEach(({ sleutel, label }) => {
        const match = k.find(kol =>
          kol.toLowerCase().replace(/[\s_-]/g, '') === sleutel.toLowerCase().replace(/[\s_-]/g, '') ||
          kol.toLowerCase().replace(/[\s_-]/g, '') === label.toLowerCase().replace(/[\s_-]/g, '')
        );
        if (match) autoKoppeling[sleutel] = match;
      });
      setKoppeling(autoKoppeling);
      setStap('koppelen');
    } catch (e) {
      setFout('Kon het bestand niet lezen: ' + (e.message || 'onbekende fout'));
    } finally {
      setBezig(false);
    }
  }

  function bouwKlanten() {
    return rijen.map(rij => {
      const velden = {};
      CSV_VELD_OPTIES.forEach(({ sleutel }) => {
        if (sleutel === 'naam') return;
        const csvKolom = koppeling[sleutel];
        if (csvKolom && rij[csvKolom]) velden[sleutel] = rij[csvKolom];
      });
      const naamKolom = koppeling['naam'];
      return { naam: (naamKolom && rij[naamKolom]) || '(onbekend)', velden };
    }).filter(k => k.naam && k.naam !== '(onbekend)');
  }

  const preview = bouwKlanten().slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onSluiten} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Klanten importeren via CSV</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {stap === 'laden' && 'Selecteer een CSV-bestand met klantgegevens'}
              {stap === 'koppelen' && `${rijen.length} rijen gevonden — koppel de kolommen aan de juiste velden`}
              {stap === 'bevestigen' && `${bouwKlanten().length} klanten klaar om te importeren`}
            </p>
          </div>
          <button onClick={onSluiten} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {fout && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <X size={14} className="shrink-0" />
              {fout}
            </div>
          )}

          {stap === 'laden' && (
            <div className="flex flex-col items-center py-12 gap-4">
              <div className="p-4 bg-blue-50 rounded-full">
                <FileUp size={28} className="text-blue-600" />
              </div>
              <p className="text-sm text-gray-500 text-center max-w-sm">
                Selecteer een CSV-bestand. De eerste rij moet kolomkoppen bevatten.
                Komma (<code className="bg-gray-100 px-1 rounded">,</code>) en puntkomma (<code className="bg-gray-100 px-1 rounded">;</code>) worden als scheidingsteken herkend.
              </p>
              <button
                onClick={laadCsv}
                disabled={bezig}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {bezig ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
                Bestand kiezen
              </button>
            </div>
          )}

          {stap === 'koppelen' && (
            <>
              <p className="text-xs text-gray-500">
                Kies voor elk veld welke CSV-kolom erbij hoort. Velden zonder koppeling worden overgeslagen.
                <span className="ml-1 font-medium text-gray-700">De naam is verplicht.</span>
              </p>
              <div className="space-y-2">
                {CSV_VELD_OPTIES.map(({ sleutel, label }) => (
                  <div key={sleutel} className="flex items-center gap-3">
                    <div className="w-48 shrink-0">
                      <span className={`text-xs font-medium ${sleutel === 'naam' ? 'text-red-600' : 'text-gray-600'}`}>
                        {label}{sleutel === 'naam' && <span className="text-red-500 ml-0.5">*</span>}
                      </span>
                    </div>
                    <select
                      value={koppeling[sleutel] || ''}
                      onChange={e => setKoppeling(k => ({ ...k, [sleutel]: e.target.value || undefined }))}
                      className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">— niet koppelen —</option>
                      {kolommen.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              {preview.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">Voorbeeld (eerste {preview.length} rijen):</p>
                  <div className="space-y-1.5">
                    {preview.map((k, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-xs text-gray-700">
                        <Users size={12} className="text-gray-400 shrink-0" />
                        <span className="font-medium">{k.naam}</span>
                        {k.velden.klantnummer && <span className="text-gray-400">nr. {k.velden.klantnummer}</span>}
                        {k.velden.plaats && <span className="text-gray-400">{k.velden.plaats}</span>}
                      </div>
                    ))}
                    {rijen.length > 3 && (
                      <p className="text-xs text-gray-400 text-center">... en {rijen.length - 3} meer</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between shrink-0">
          <button onClick={onSluiten} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            Annuleren
          </button>
          {stap === 'koppelen' && (
            <button
              onClick={() => {
                const klanten = bouwKlanten();
                if (klanten.length === 0) { setFout('Geen klanten om te importeren. Zorg dat de naam-kolom is gekoppeld.'); return; }
                onImport(klanten);
              }}
              disabled={!koppeling['naam']}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40"
            >
              <Check size={14} />
              {bouwKlanten().length} klant{bouwKlanten().length !== 1 ? 'en' : ''} importeren
            </button>
          )}
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
