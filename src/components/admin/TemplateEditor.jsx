import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Upload, Plus, Trash2, GripVertical, X,
  ChevronDown, ChevronUp, Loader2, CheckCircle, AlertCircle, ScanLine, Undo2
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const VELD_TYPES = [
  { waarde: 'text',          label: 'Tekst (korte invoer)' },
  { waarde: 'textarea',      label: 'Tekst (lange invoer)' },
  { waarde: 'date',          label: 'Datum' },
  { waarde: 'number',        label: 'Getal' },
  { waarde: 'currency',      label: 'Bedrag (€)' },
  { waarde: 'select',        label: 'Keuzelijst (dropdown)' },
  { waarde: 'radio',         label: 'Keuzeknop (radio — meerdere opties)' },
  { waarde: 'boolean',       label: 'Ja / Nee (schakelaar)' },
  { waarde: 'ondertekenaar', label: 'Ondertekenaar kantoor' },
];

// Slim type afleiden uit de variabelenaam
const SLIMME_TYPES = {
  datum: 'date', geboortedatum: 'date', startdatum: 'date', einddatum: 'date',
  bedrag: 'currency', limiet: 'currency', honorarium: 'currency', vergoeding: 'currency',
  rekening_courant: 'currency', kredietlimiet: 'currency',
  ondertekenaar: 'ondertekenaar', ondertekenaar_kantoor: 'ondertekenaar',
};

function slimLabel(sleutel) {
  return sleutel.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

const leegVeld = () => ({
  sleutel: '',
  label: '',
  type: 'text',
  verplicht: true,
  volgorde: 0,
  opties: [],
  radioOpties: [],
  zichtbaarAls: null,
  toelichting: '',
  placeholder: '',
  toonInGeschiedenisTitel: false,
  groep: '',
});

export default function TemplateEditor({ templateId, onTerug }) {
  const showToast = useToast();
  const bewerkModus = !!templateId;
  const [meta, setMeta] = useState({
    id: '', naam: '', categorie: '', beschrijving: '', versie: 1, bestandsnaamPatroon: '',
    volgnummerActief: false, volgnummerPrefix: '', volgnummerHuidig: 1, volgnummerPadding: 4,
  });
  const [velden, setVelden] = useState([]);
  const [docxPad, setDocxPad] = useState('');
  const [opgeslagen, setOpgeslagen] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [scanBezig, setScanBezig] = useState(false);
  const [fout, setFout] = useState('');
  const [uitgevouwen, setUitgevouwen] = useState({});
  const [categorieSuggesties, setCategorieSuggesties] = useState([]);
  const [ongedaanVeld, setOngedaanVeld] = useState(null); // { veld, idx }
  const [ongedaanSeconden, setOngedaanSeconden] = useState(0);
  const ongedaanTimer = useRef(null);

  // Cleanup bij unmount
  useEffect(() => () => clearTimeout(ongedaanTimer.current), []);

  // Aftellen voor undo-knop
  useEffect(() => {
    if (!ongedaanVeld) { setOngedaanSeconden(0); return; }
    setOngedaanSeconden(5);
    const interval = setInterval(() => {
      setOngedaanSeconden(s => (s <= 1 ? (clearInterval(interval), 0) : s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [ongedaanVeld]);

  useEffect(() => {
    window.api.templates.getCategorieen().then(setCategorieSuggesties);
    if (bewerkModus) {
      window.api.templates.getById(templateId).then(t => {
        if (!t) return;
        const { velden: v, ...m } = t;
        setMeta(m);
        setVelden(v || []);
      });
    }
  }, [templateId]);

  function setMetaVeld(key, val) {
    setMeta(m => ({ ...m, [key]: val }));
  }

  // ── Veld beheer ─────────────────────────────────────────────────────────────
  function voegVeldToe() {
    const nieuw = { ...leegVeld(), volgorde: velden.length };
    setVelden(v => [...v, nieuw]);
    setUitgevouwen(u => ({ ...u, [velden.length]: true }));
  }

  function verwijderVeld(idx) {
    const veld = velden[idx];
    setVelden(v => v.filter((_, i) => i !== idx));
    setOngedaanVeld({ veld, idx });
    clearTimeout(ongedaanTimer.current);
    ongedaanTimer.current = setTimeout(() => setOngedaanVeld(null), 5000);
  }

  function herstelVeld() {
    if (!ongedaanVeld) return;
    setVelden(v => {
      const nieuw = [...v];
      nieuw.splice(ongedaanVeld.idx, 0, ongedaanVeld.veld);
      return nieuw;
    });
    setOngedaanVeld(null);
    clearTimeout(ongedaanTimer.current);
  }

  function updateVeld(idx, key, val) {
    setVelden(v => v.map((veld, i) => i === idx ? { ...veld, [key]: val } : veld));
  }

  function toggleUitvouwen(idx) {
    setUitgevouwen(u => ({ ...u, [idx]: !u[idx] }));
  }

  function verplaatsVeld(vanIdx, naarIdx) {
    if (vanIdx === naarIdx) return;
    setVelden(v => {
      const nieuw = [...v];
      const [item] = nieuw.splice(vanIdx, 1);
      nieuw.splice(naarIdx, 0, item);
      return nieuw;
    });
    // Uitgevouwen state meeschuiven
    setUitgevouwen(u => {
      const nieuw = {};
      Object.entries(u).forEach(([k, val]) => {
        const i = parseInt(k);
        if (i === vanIdx) nieuw[naarIdx] = val;
        else if (vanIdx < naarIdx && i > vanIdx && i <= naarIdx) nieuw[i - 1] = val;
        else if (vanIdx > naarIdx && i >= naarIdx && i < vanIdx) nieuw[i + 1] = val;
        else nieuw[i] = val;
      });
      return nieuw;
    });
  }

  // ── DOCX selecteren + scannen ─────────────────────────────────────────────────
  async function selecteerDocx() {
    const pad = await window.api.templates.selectDocx();
    if (pad) setDocxPad(pad);
  }

  async function scanVariabelen() {
    if (!docxPad) return;
    setScanBezig(true);
    try {
      const { variabelen, condities } = await window.api.templates.scanDocxVars(docxPad);
      const bestaandeSleutels = new Set(velden.map(v => v.sleutel));
      // Voeg ook de radio-gegenereerde sleutels toe als 'al aanwezig',
      // zodat de scanner ze niet opnieuw aanmaakt als losse boolean-velden.
      velden.forEach(v => {
        if (v.type === 'radio') {
          (v.radioOpties || []).forEach(opt => {
            bestaandeSleutels.add(`${v.sleutel}_${opt.key}`);
          });
        }
      });
      const nieuw = [];

      variabelen.forEach(sleutel => {
        if (bestaandeSleutels.has(sleutel)) return;
        nieuw.push({
          ...leegVeld(),
          sleutel,
          label: slimLabel(sleutel),
          type: SLIMME_TYPES[sleutel] || 'text',
          volgorde: velden.length + nieuw.length,
        });
      });

      condities.forEach(sleutel => {
        if (bestaandeSleutels.has(sleutel)) return;
        nieuw.push({
          ...leegVeld(),
          sleutel,
          label: slimLabel(sleutel),
          type: 'boolean',
          volgorde: velden.length + nieuw.length,
        });
      });

      if (nieuw.length === 0) {
        setFout('Alle variabelen uit het document zijn al gedefinieerd, of er zijn geen variabelen gevonden.');
      } else {
        setVelden(v => [...v, ...nieuw]);
        setFout('');
      }
    } catch (e) {
      setFout('Scanfout: ' + (e.message || 'onbekend'));
    } finally {
      setScanBezig(false);
    }
  }

  // ── Opslaan ──────────────────────────────────────────────────────────────────
  async function opslaan() {
    setFout('');
    if (!meta.id.trim()) return setFout('Vul een uniek ID in.');
    if (!meta.naam.trim()) return setFout('Vul een naam in.');
    if (!meta.categorie.trim()) return setFout('Vul een categorie in.');
    if (!bewerkModus && !docxPad) return setFout('Selecteer een Word-sjabloon (.docx).');
    if (velden.some(v => !v.sleutel.trim())) return setFout('Elk veld moet een sleutel hebben.');
    if (velden.some(v => !v.label.trim())) return setFout('Elk veld moet een label hebben.');
    const sleutels = velden.map(v => v.sleutel.trim()).filter(Boolean);
    const dubbele = sleutels.filter((s, i) => sleutels.indexOf(s) !== i);
    if (dubbele.length > 0) return setFout(`Dubbele veldsleutels gevonden: ${[...new Set(dubbele)].join(', ')} — elke sleutel moet uniek zijn.`);

    setBezig(true);
    try {
      const metaPayload = { ...meta, versie: meta.versie || 1 };

      if (bewerkModus) {
        await window.api.templates.update({ id: templateId, meta: metaPayload, velden });
        if (docxPad) {
          await window.api.templates.copyDocx({ srcPath: docxPad, templateId, versie: meta.versie });
        }
      } else {
        await window.api.templates.create({ meta: metaPayload, velden });
        await window.api.templates.copyDocx({ srcPath: docxPad, templateId: meta.id, versie: meta.versie });
      }

      setOpgeslagen(true);
      showToast(bewerkModus ? 'Sjabloon bijgewerkt' : 'Sjabloon aangemaakt');
      setTimeout(onTerug, 1000);
    } catch (e) {
      setFout(e.message || 'Fout bij opslaan.');
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <button
        onClick={onTerug}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Terug naar beheer
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-8">
        {bewerkModus ? 'Sjabloon bewerken' : 'Nieuw sjabloon'}
      </h1>

      {/* ── Basisgegevens ── */}
      <Sectie titel="Basisgegevens">
        <div className="grid grid-cols-2 gap-4">
          <Invoerveld label="ID (uniek, geen spaties)" verplicht>
            <input
              type="text"
              value={meta.id}
              onChange={e => setMetaVeld('id', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              disabled={bewerkModus}
              placeholder="bijv. opdrachtbevestiging-bv"
              className="invoer disabled:bg-gray-50 disabled:text-gray-400"
            />
          </Invoerveld>
          <Invoerveld label="Versienummer" verplicht>
            <input
              type="number"
              min={1}
              value={meta.versie}
              onChange={e => setMetaVeld('versie', parseInt(e.target.value) || 1)}
              className="invoer"
            />
          </Invoerveld>
        </div>
        <Invoerveld label="Naam" verplicht>
          <input
            type="text"
            value={meta.naam}
            onChange={e => setMetaVeld('naam', e.target.value)}
            placeholder="Weergavenaam van het sjabloon"
            className="invoer"
          />
        </Invoerveld>
        <Invoerveld label="Categorie" verplicht>
          <input
            type="text"
            value={meta.categorie}
            onChange={e => setMetaVeld('categorie', e.target.value)}
            placeholder="bijv. Opdrachtbevestigingen"
            list="categorieen-list"
            className="invoer"
          />
          <datalist id="categorieen-list">
            {categorieSuggesties.map(c => <option key={c} value={c} />)}
          </datalist>
        </Invoerveld>
        <Invoerveld label="Beschrijving (optioneel)">
          <textarea
            value={meta.beschrijving}
            onChange={e => setMetaVeld('beschrijving', e.target.value)}
            rows={2}
            placeholder="Korte omschrijving voor de gebruiker"
            className="invoer resize-none"
          />
        </Invoerveld>
        <Invoerveld label="Bestandsnaam patroon (optioneel)">
          <input
            type="text"
            value={meta.bestandsnaamPatroon || ''}
            onChange={e => setMetaVeld('bestandsnaamPatroon', e.target.value)}
            placeholder="bijv. {klantnaam}_{datum} → laat leeg voor standaard"
            className="invoer"
          />
          <p className="mt-1.5 text-xs text-gray-400">
            Beschikbare variabelen: veldsleutels zoals <code className="bg-gray-100 px-1 rounded">{'{klantnaam}'}</code>, plus <code className="bg-gray-100 px-1 rounded">{'{datum}'}</code> en <code className="bg-gray-100 px-1 rounded">{'{templatenaam}'}</code>.
          </p>
        </Invoerveld>

        {/* Volgnummer */}
        <div className="pt-2 border-t border-gray-100">
          <label className="flex items-center gap-2.5 cursor-pointer select-none mb-3">
            <input
              type="checkbox"
              checked={!!meta.volgnummerActief}
              onChange={e => setMetaVeld('volgnummerActief', e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            <span className="text-xs font-medium text-gray-600">Automatisch volgnummer activeren</span>
          </label>
          {meta.volgnummerActief && (
            <div className="grid grid-cols-3 gap-3 pl-6">
              <Invoerveld label="Prefix (optioneel)">
                <input
                  type="text"
                  value={meta.volgnummerPrefix || ''}
                  onChange={e => setMetaVeld('volgnummerPrefix', e.target.value)}
                  placeholder="bijv. OB- of 2025-"
                  className="invoer"
                />
              </Invoerveld>
              <Invoerveld label="Huidige waarde">
                <input
                  type="number"
                  min={1}
                  value={meta.volgnummerHuidig || 1}
                  onChange={e => setMetaVeld('volgnummerHuidig', parseInt(e.target.value) || 1)}
                  className="invoer"
                />
              </Invoerveld>
              <Invoerveld label="Cijfers (opvulling)">
                <select
                  value={meta.volgnummerPadding || 4}
                  onChange={e => setMetaVeld('volgnummerPadding', parseInt(e.target.value))}
                  className="invoer"
                >
                  {[2,3,4,5,6].map(n => (
                    <option key={n} value={n}>{n} → {String(meta.volgnummerHuidig || 1).padStart(n, '0')}</option>
                  ))}
                </select>
              </Invoerveld>
            </div>
          )}
          {meta.volgnummerActief && (
            <p className="mt-2 pl-6 text-xs text-gray-400">
              Gebruik <code className="bg-gray-100 px-1 rounded">{'{volgnummer}'}</code> in je Word-document.
              Voorbeeld: <strong>{(meta.volgnummerPrefix || '') + String(meta.volgnummerHuidig || 1).padStart(meta.volgnummerPadding || 4, '0')}</strong>
            </p>
          )}
        </div>
      </Sectie>

      {/* ── Word-sjabloon ── */}
      <Sectie titel="Word-sjabloon (.docx)" className="mt-6">
        <p className="text-xs text-gray-500 mb-3">
          Gebruik <code className="bg-gray-100 px-1 rounded">{'{sleutel}'}</code> in je Word-document als variabele
          en <code className="bg-gray-100 px-1 rounded">{'{#conditie}'}...{'{/conditie}'}</code> voor conditionele blokken.
        </p>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={selecteerDocx}
            className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            <Upload size={16} />
            {docxPad ? 'Ander bestand kiezen' : 'Bestand selecteren'}
          </button>
          {docxPad && (
            <span className="text-sm text-gray-600 truncate max-w-xs">
              {docxPad.split(/[\\/]/).pop()}
            </span>
          )}
          {bewerkModus && !docxPad && (
            <span className="text-xs text-gray-400">Laat leeg om bestaand bestand te behouden</span>
          )}
        </div>
        {docxPad && (
          <button
            type="button"
            onClick={scanVariabelen}
            disabled={scanBezig}
            className="flex items-center gap-2 mt-3 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50"
          >
            {scanBezig ? <Loader2 size={14} className="animate-spin" /> : <ScanLine size={14} />}
            {scanBezig ? 'Scannen...' : 'Variabelen automatisch detecteren'}
          </button>
        )}
      </Sectie>

      {/* ── Velden ── */}
      <Sectie titel="Invoervelden" className="mt-6">
        <p className="text-xs text-gray-500 mb-4">
          Definieer de velden die de gebruiker moet invullen. De sleutel moet overeenkomen met de variabele in het Word-document.
        </p>

        <div className="space-y-3">
          {velden.map((veld, idx) => (
            <VeldRij
              key={idx}
              veld={veld}
              idx={idx}
              uitgevouwen={!!uitgevouwen[idx]}
              alleVelden={velden}
              onToggle={() => toggleUitvouwen(idx)}
              onChange={(key, val) => updateVeld(idx, key, val)}
              onVerwijder={() => verwijderVeld(idx)}
              onVerplaats={verplaatsVeld}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={voegVeldToe}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <Plus size={16} />
            Veld toevoegen
          </button>
          {ongedaanVeld && (
            <button
              type="button"
              onClick={herstelVeld}
              className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors"
            >
              <Undo2 size={13} />
              Ongedaan maken: &ldquo;{ongedaanVeld.veld.label || ongedaanVeld.veld.sleutel || 'naamloos'}&rdquo;
              <span className="ml-1 text-amber-500 tabular-nums">({ongedaanSeconden}s)</span>
            </button>
          )}
        </div>
      </Sectie>

      {/* Fout */}
      {fout && (
        <div className="mt-6 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {fout}
        </div>
      )}

      {/* Opslaan */}
      <div className="mt-8 flex justify-end gap-3">
        <button onClick={onTerug} className="px-5 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
          Annuleren
        </button>
        <button
          onClick={opslaan}
          disabled={bezig || opgeslagen}
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

// ── VeldRij ───────────────────────────────────────────────────────────────────
function VeldRij({ veld, idx, uitgevouwen, alleVelden, onToggle, onChange, onVerwijder, onVerplaats }) {
  const andereVelden = alleVelden.filter((_, i) => i !== idx);

  function onDragStart(e) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  }

  function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function onDrop(e) {
    e.preventDefault();
    const vanIdx = parseInt(e.dataTransfer.getData('text/plain'));
    onVerplaats(vanIdx, idx);
  }

  return (
    <div
      className="border border-gray-200 rounded-lg overflow-hidden"
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={onToggle}
      >
        <GripVertical size={15} className="text-gray-300 cursor-grab active:cursor-grabbing shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-700">
            {veld.label || <span className="text-gray-400 italic">Naamloos veld</span>}
          </span>
          {veld.sleutel && (
            <code className="ml-2 text-xs bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">{'{' + veld.sleutel + '}'}</code>
          )}
        </div>
        <span className="text-xs text-gray-400 shrink-0">
          {VELD_TYPES.find(t => t.waarde === veld.type)?.label || veld.type}
        </span>
        <button
          onClick={e => { e.stopPropagation(); onVerwijder(); }}
          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
        >
          <Trash2 size={14} />
        </button>
        {uitgevouwen ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
      </div>

      {/* Body */}
      {uitgevouwen && (
        <div className="px-4 py-4 space-y-4 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-4">
            <Invoerveld label="Sleutel (variabelenaam)" verplicht>
              <input
                type="text"
                value={veld.sleutel}
                onChange={e => onChange('sleutel', e.target.value.replace(/\s+/g, '_'))}
                placeholder="bijv. bedrijfsnaam"
                className="invoer"
              />
            </Invoerveld>
            <Invoerveld label="Label (zichtbaar voor gebruiker)" verplicht>
              <input
                type="text"
                value={veld.label}
                onChange={e => onChange('label', e.target.value)}
                placeholder="bijv. Naam van het bedrijf"
                className="invoer"
              />
            </Invoerveld>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Invoerveld label="Type">
              <select value={veld.type} onChange={e => onChange('type', e.target.value)} className="invoer">
                {VELD_TYPES.map(t => (
                  <option key={t.waarde} value={t.waarde}>{t.label}</option>
                ))}
              </select>
            </Invoerveld>
            <Invoerveld label="Verplicht">
              <select value={veld.verplicht ? 'ja' : 'nee'} onChange={e => onChange('verplicht', e.target.value === 'ja')} className="invoer">
                <option value="ja">Ja</option>
                <option value="nee">Nee</option>
              </select>
            </Invoerveld>
          </div>

          {/* Opties voor select */}
          {veld.type === 'select' && (
            <Invoerveld label="Opties (één per regel)">
              <textarea
                value={(veld.opties || []).join('\n')}
                onChange={e => onChange('opties', e.target.value.split('\n').map(s => s.trim()).filter(Boolean))}
                rows={4}
                placeholder="BV&#10;Eenmanszaak&#10;VOF&#10;Maatschap"
                className="invoer resize-y font-mono text-xs"
              />
            </Invoerveld>
          )}

          {/* Opties voor radio */}
          {veld.type === 'radio' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                Keuzemogelijkheden
              </label>
              <div className="space-y-2 mb-2">
                <div className="grid grid-cols-[7rem_1fr_1fr_1.5rem] gap-2 text-xs text-gray-400 px-1">
                  <span>Sleutel*</span><span>Label*</span><span>Toelichting</span><span />
                </div>
                {(veld.radioOpties || []).map((opt, i) => (
                  <div key={i} className="grid grid-cols-[7rem_1fr_1fr_1.5rem] gap-2 items-center">
                    <input
                      type="text"
                      value={opt.key}
                      onChange={e => {
                        const n = [...(veld.radioOpties || [])];
                        n[i] = { ...n[i], key: e.target.value.replace(/\s+/g, '_') };
                        onChange('radioOpties', n);
                      }}
                      placeholder="bijv. euribor"
                      className="invoer font-mono text-xs"
                    />
                    <input
                      type="text"
                      value={opt.label}
                      onChange={e => {
                        const n = [...(veld.radioOpties || [])];
                        n[i] = { ...n[i], label: e.target.value };
                        onChange('radioOpties', n);
                      }}
                      placeholder="Label voor gebruiker"
                      className="invoer text-xs"
                    />
                    <input
                      type="text"
                      value={opt.toelichting || ''}
                      onChange={e => {
                        const n = [...(veld.radioOpties || [])];
                        n[i] = { ...n[i], toelichting: e.target.value };
                        onChange('radioOpties', n);
                      }}
                      placeholder="Optionele toelichting"
                      className="invoer text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => onChange('radioOpties', (veld.radioOpties || []).filter((_, j) => j !== i))}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => onChange('radioOpties', [...(veld.radioOpties || []), { key: '', label: '', toelichting: '' }])}
                className="flex items-center gap-1.5 text-xs text-blue-600 border border-blue-200 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <Plus size={12} />
                Optie toevoegen
              </button>
              <p className="mt-1.5 text-xs text-gray-400">
                Per geselecteerde optie worden booleaanse sjabloonvariabelen aangemaakt:
                <code className="bg-gray-100 px-1 rounded ml-1">{`{${veld.sleutel || 'veld'}_sleutel}`}</code>
              </p>
            </div>
          )}

          {/* Placeholder */}
          {['text', 'textarea', 'number'].includes(veld.type) && (
            <Invoerveld label="Plaatshouder (optioneel)">
              <input
                type="text"
                value={veld.placeholder || ''}
                onChange={e => onChange('placeholder', e.target.value)}
                placeholder="Voorbeeldtekst in het invulveld"
                className="invoer"
              />
            </Invoerveld>
          )}

          {/* Toelichting */}
          <Invoerveld label="Toelichting (optioneel)">
            <input
              type="text"
              value={veld.toelichting || ''}
              onChange={e => onChange('toelichting', e.target.value)}
              placeholder="Extra uitleg onder het veld"
              className="invoer"
            />
          </Invoerveld>

          {/* Groep */}
          <Invoerveld label="Sectiegroep (optioneel)">
            <input
              type="text"
              value={veld.groep || ''}
              onChange={e => onChange('groep', e.target.value)}
              placeholder="bijv. Klantgegevens, Financieel…"
              className="invoer"
            />
          </Invoerveld>

          {/* Toon in geschiedenis */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!veld.toonInGeschiedenisTitel}
              onChange={e => onChange('toonInGeschiedenisTitel', e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            <span className="text-xs text-gray-600">
              Toon waarde als klantidentificatie in geschiedenis
            </span>
          </label>

          {/* Conditionele zichtbaarheid */}
          <div className="pt-2 border-t border-gray-100">
            <div className="text-xs font-medium text-gray-500 mb-2">Zichtbaar als (conditioneel)</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Ander veld</label>
                <select
                  value={veld.zichtbaarAls?.sleutel || ''}
                  onChange={e => {
                    if (!e.target.value) {
                      onChange('zichtbaarAls', null);
                    } else {
                      onChange('zichtbaarAls', { sleutel: e.target.value, waarde: veld.zichtbaarAls?.waarde ?? true });
                    }
                  }}
                  className="invoer text-xs"
                >
                  <option value="">— Altijd zichtbaar —</option>
                  {andereVelden.map(v => (
                    <option key={v.sleutel} value={v.sleutel}>{v.label || v.sleutel}</option>
                  ))}
                </select>
              </div>
              {veld.zichtbaarAls?.sleutel && (
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Heeft waarde</label>
                  <ConditionWaardeInput
                    bronVeld={andereVelden.find(v => v.sleutel === veld.zichtbaarAls.sleutel)}
                    waarde={veld.zichtbaarAls.waarde}
                    onChange={w => onChange('zichtbaarAls', { ...veld.zichtbaarAls, waarde: w })}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ConditionWaardeInput({ bronVeld, waarde, onChange }) {
  if (!bronVeld) return null;

  if (bronVeld.type === 'boolean') {
    return (
      <select value={String(waarde)} onChange={e => onChange(e.target.value === 'true')} className="invoer text-xs">
        <option value="true">Ja (aan)</option>
        <option value="false">Nee (uit)</option>
      </select>
    );
  }

  if (bronVeld.type === 'select') {
    return (
      <select value={waarde || ''} onChange={e => onChange(e.target.value)} className="invoer text-xs">
        <option value="">-- kies --</option>
        {(bronVeld.opties || []).map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }

  if (bronVeld.type === 'radio') {
    return (
      <select value={waarde || ''} onChange={e => onChange(e.target.value)} className="invoer text-xs">
        <option value="">-- kies --</option>
        {(bronVeld.radioOpties || []).map(o => (
          <option key={o.key} value={o.key}>{o.label || o.key}</option>
        ))}
      </select>
    );
  }

  return (
    <input
      type="text"
      value={waarde || ''}
      onChange={e => onChange(e.target.value)}
      className="invoer text-xs"
      placeholder="Waarde..."
    />
  );
}

// ── Hulpcomponenten ───────────────────────────────────────────────────────────
function Sectie({ titel, children, className = '' }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      <h2 className="text-sm font-semibold text-gray-700 mb-4">{titel}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Invoerveld({ label, verplicht, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}{verplicht && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
