import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, FolderOpen, Image, Loader2, CheckCircle, Plus, Trash2, Pen } from 'lucide-react';
import ConfirmDialog from '../ui/ConfirmDialog';
import { useToast } from '../../context/ToastContext';

export default function InstellingenPanel({ onTerug }) {
  const showToast = useToast();
  const [instellingen, setInstellingen] = useState({
    templateDir: '', gedeeldeDataDir: '', kantoorNaam: '', kantoorAdres: '', kantoorPostcode: '',
    kantoorPlaats: '', kantoorTelefoon: '', kantoorEmail: '', kantoorWebsite: '',
    kantoorKvk: '', kantoorBtw: '', logoPad: '', ondertekenaars: [], handtekeningPaden: {},
  });
  const [bezig, setBezig] = useState(false);
  const [opgeslagen, setOpgeslagen] = useState(false);
  const [nieuweOndertekenaar, setNieuweOndertekenaar] = useState('');
  const [mapWijzigingBevestig, setMapWijzigingBevestig] = useState(false);
  const origineleTemplateDir = useRef('');

  useEffect(() => {
    window.api.settings.get().then(s => {
      origineleTemplateDir.current = s.templateDir || '';
      setInstellingen({
        templateDir:      s.templateDir      || '',
        gedeeldeDataDir:  s.gedeeldeDataDir  || '',
        kantoorNaam:    s.kantoorNaam    || '',
        kantoorAdres:   s.kantoorAdres   || '',
        kantoorPostcode: s.kantoorPostcode || '',
        kantoorPlaats:  s.kantoorPlaats  || '',
        kantoorTelefoon: s.kantoorTelefoon || '',
        kantoorEmail:   s.kantoorEmail   || '',
        kantoorWebsite: s.kantoorWebsite || '',
        kantoorKvk:     s.kantoorKvk     || '',
        kantoorBtw:     s.kantoorBtw     || '',
        logoPad:        s.logoPad        || '',
        ondertekenaars: s.ondertekenaars || [],
        handtekeningPaden: s.handtekeningPaden || {},
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

  async function kiesGedeeldeMap() {
    const pad = await window.api.settings.selectGedeeldeDir();
    if (pad) stelIn('gedeeldeDataDir', pad);
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
    const { [naam]: _, ...restPaden } = instellingen.handtekeningPaden;
    setInstellingen(s => ({
      ...s,
      ondertekenaars: s.ondertekenaars.filter(o => o !== naam),
      handtekeningPaden: restPaden,
    }));
    setOpgeslagen(false);
  }

  async function kiesHandtekening(naam) {
    const pad = await window.api.settings.selectHandtekening(naam);
    if (pad) stelIn('handtekeningPaden', { ...instellingen.handtekeningPaden, [naam]: pad });
  }

  function verwijderHandtekening(naam) {
    const { [naam]: _, ...rest } = instellingen.handtekeningPaden;
    stelIn('handtekeningPaden', rest);
  }

  async function opslaan() {
    // Als de sjablonenmap is gewijzigd, controleer of er sjablonen zijn die verwijderd zullen worden
    if (instellingen.templateDir !== origineleTemplateDir.current) {
      const bestaande = await window.api.templates.getAll();
      if (bestaande.length > 0) {
        setMapWijzigingBevestig(true);
        return;
      }
    }
    await slaInstellingenOp();
  }

  async function bevestigMapWijziging() {
    setMapWijzigingBevestig(false);
    setBezig(true);
    try {
      await window.api.templates.deleteAll();
      await slaInstellingenOp();
      showToast('Sjablonenmap gewijzigd — alle sjablonen verwijderd', 'info');
    } catch (e) {
      showToast('Fout bij wijzigen map: ' + (e?.message || 'onbekend'), 'error');
      setBezig(false);
    }
  }

  async function slaInstellingenOp() {
    setBezig(true);
    try {
      await window.api.settings.set(instellingen);
      origineleTemplateDir.current = instellingen.templateDir;
      setOpgeslagen(true);
    } catch (e) {
      console.error('Instellingen opslaan mislukt:', e);
      showToast('Instellingen opslaan mislukt', 'error');
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
        {/* Kantoor gegevens */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Kantoor</h2>
          <p className="text-xs text-gray-400 mb-4">
            Beschikbaar als variabele in sjablonen:{' '}
            <code className="bg-gray-100 px-1 rounded">{'{kantoor_naam}'}</code>{' '}
            <code className="bg-gray-100 px-1 rounded">{'{kantoor_adres}'}</code>{' '}
            <code className="bg-gray-100 px-1 rounded">{'{kantoor_email}'}</code> enz.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Naam kantoor</label>
              <input type="text" value={instellingen.kantoorNaam} onChange={e => stelIn('kantoorNaam', e.target.value)} placeholder="Naam van het accountantskantoor" className="invoer" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Adres + huisnummer</label>
              <input type="text" value={instellingen.kantoorAdres} onChange={e => stelIn('kantoorAdres', e.target.value)} placeholder="Hoofdstraat 1" className="invoer" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Postcode</label>
              <input type="text" value={instellingen.kantoorPostcode} onChange={e => stelIn('kantoorPostcode', e.target.value)} placeholder="1234 AB" className="invoer" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Plaats</label>
              <input type="text" value={instellingen.kantoorPlaats} onChange={e => stelIn('kantoorPlaats', e.target.value)} placeholder="Amsterdam" className="invoer" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefoonnummer</label>
              <input type="text" value={instellingen.kantoorTelefoon} onChange={e => stelIn('kantoorTelefoon', e.target.value)} placeholder="020-1234567" className="invoer" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mailadres</label>
              <input type="email" value={instellingen.kantoorEmail} onChange={e => stelIn('kantoorEmail', e.target.value)} placeholder="info@kantoor.nl" className="invoer" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Website</label>
              <input type="text" value={instellingen.kantoorWebsite} onChange={e => stelIn('kantoorWebsite', e.target.value)} placeholder="www.kantoor.nl" className="invoer" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">KVK-nummer</label>
              <input type="text" value={instellingen.kantoorKvk} onChange={e => stelIn('kantoorKvk', e.target.value)} placeholder="12345678" className="invoer" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">BTW-nummer</label>
              <input type="text" value={instellingen.kantoorBtw} onChange={e => stelIn('kantoorBtw', e.target.value)} placeholder="NL123456789B01" className="invoer" />
            </div>
          </div>
        </div>

        {/* Ondertekenaars */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Ondertekenaars</h2>
          <p className="text-xs text-gray-400 mb-4">
            Variabele naam in Word: <code className="bg-gray-100 px-1 rounded">{'{ondertekenaar}'}</code> —
            handtekening-afbeelding: <code className="bg-gray-100 px-1 rounded">{'{%handtekening}'}</code>
          </p>
          <div className="space-y-3 mb-4">
            {instellingen.ondertekenaars.map(naam => {
              const pad = instellingen.handtekeningPaden[naam];
              return (
                <div key={naam} className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-800">{naam}</span>
                    <button
                      onClick={() => verwijderOndertekenaar(naam)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Ondertekenaar verwijderen"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    {pad ? (
                      <div className="flex items-center gap-3 flex-1">
                        <img
                          src={`file://${pad}`}
                          alt={`Handtekening ${naam}`}
                          className="h-12 max-w-[180px] object-contain border border-gray-200 rounded-lg bg-white p-1"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => kiesHandtekening(naam)}
                            className="flex items-center gap-1.5 text-xs text-blue-600 border border-blue-200 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                          >
                            <Pen size={12} />
                            Vervangen
                          </button>
                          <button
                            onClick={() => verwijderHandtekening(naam)}
                            className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <Trash2 size={12} />
                            Verwijderen
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => kiesHandtekening(naam)}
                        className="flex items-center gap-1.5 text-xs text-blue-600 border border-blue-200 border-dashed px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <Image size={13} />
                        Handtekening uploaden (PNG/JPG)
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {instellingen.ondertekenaars.length === 0 && (
              <p className="text-xs text-gray-400 py-2">Nog geen ondertekenaars toegevoegd</p>
            )}
          </div>
          <div className="flex gap-2 pt-3 border-t border-gray-100">
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

        {/* Gedeelde map (multi-gebruiker) */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Gedeelde map — klanten &amp; standaard teksten</h2>
          <p className="text-xs text-gray-400 mb-3">
            Wijs een gedeelde netwerkmap of OneDrive-map aan. Alle medewerkers die naar dezelfde map verwijzen
            delen automatisch het adresboek en de standaard teksten. Laat leeg om lokaal te werken.
          </p>
          <div className="flex gap-3 items-center">
            <input
              type="text"
              value={instellingen.gedeeldeDataDir}
              readOnly
              placeholder="Geen gedeelde map ingesteld — werkt lokaal"
              className="invoer flex-1 bg-gray-50 cursor-default text-gray-500 text-sm"
            />
            <button onClick={kiesGedeeldeMap} className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 shrink-0">
              <FolderOpen size={15} />
              Kiezen
            </button>
            {instellingen.gedeeldeDataDir && (
              <button onClick={() => stelIn('gedeeldeDataDir', '')} className="flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-500 hover:bg-gray-50 shrink-0">
                Wissen
              </button>
            )}
          </div>
          {instellingen.gedeeldeDataDir && (
            <p className="mt-2 text-xs text-blue-600">
              Klanten en standaard teksten worden gelezen en opgeslagen in deze map. Zorg dat alle medewerkers schrijfrechten hebben op deze map.
            </p>
          )}
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

      {mapWijzigingBevestig && (
        <ConfirmDialog
          titel="Sjablonenmap wijzigen?"
          omschrijving="Je wijzigt de sjablonenmap. Alle bestaande sjablonen en hun veldconfiguraties worden verwijderd — je begint opnieuw leeg. De Word-bestanden in de oude map blijven onaangeroerd. Wil je doorgaan?"
          bevestigLabel="Ja, wijzigen en sjablonen verwijderen"
          onBevestig={bevestigMapWijziging}
          onAnnuleer={() => setMapWijzigingBevestig(false)}
        />
      )}
    </div>
  );
}
