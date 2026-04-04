import { useEffect, useState } from 'react';
import {
  Search, FileText, ChevronRight, FolderOpen, LayoutGrid, List,
  Star, Sheet, BookmarkCheck, ChevronDown, ChevronUp, ArrowRight, Settings, Copy,
} from 'lucide-react';
import { formatDatum } from '../utils/formatDatum';
import BulkModal from '../components/ui/BulkModal';

const RECENTE_KEY = 'sjablonen-recent';
const MAX_RECENT = 5;

function leesRecent() {
  try { return JSON.parse(localStorage.getItem(RECENTE_KEY) || '[]'); } catch { return []; }
}
function slaRecentOp(id) {
  try {
    const bestaand = leesRecent().filter(x => x !== id);
    localStorage.setItem(RECENTE_KEY, JSON.stringify([id, ...bestaand].slice(0, MAX_RECENT)));
  } catch {}
}

// Versleepbare scheidingslijn voor kolombreedte
function DragHandle({ onDrag }) {
  function onMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();
    let lastX = e.clientX;
    function onMove(ev) { const d = ev.clientX - lastX; lastX = ev.clientX; onDrag(d); }
    function onUp() { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }
  return (
    <div onMouseDown={onMouseDown} className="absolute right-0 top-0 h-full w-3 flex items-center justify-center cursor-col-resize group z-10">
      <div className="w-px h-5 bg-gray-300 rounded-full group-hover:bg-blue-400 group-hover:h-full transition-all duration-100" />
    </div>
  );
}

export default function TemplateBrowser({ navigeer, zoekRef }) {
  const [templates, setTemplates] = useState([]);
  const [zoekterm, setZoekterm] = useState('');
  const [actieveCategorie, setActieveCategorie] = useState('Alle');
  const [laden, setLaden] = useState(true);
  const [weergave, setWeergave] = useState(() => {
    try { return localStorage.getItem('sjablonen-weergave') || 'raster'; } catch { return 'raster'; }
  });
  const [kolBreedte, setKolBreedte] = useState(() => {
    try {
      const s = localStorage.getItem('sjablonen-kolbreedte');
      return s ? JSON.parse(s) : { categorie: 170, bijgewerkt: 110, versie: 90 };
    } catch { return { categorie: 170, bijgewerkt: 110, versie: 90 }; }
  });
  const [bulkTemplate, setBulkTemplate] = useState(null);
  const [recenteIds, setRecenteIds] = useState(leesRecent);
  const [concepten, setConcepten] = useState([]);
  const [conceptenOpen, setConceptenOpen] = useState(true);

  useEffect(() => { laad(); }, []);

  async function laad() {
    const [data, conceptData] = await Promise.all([
      window.api.templates.getAll(),
      window.api.concepten.getAll().catch(() => []),
    ]);
    setTemplates(data);
    setConcepten(conceptData);
    setLaden(false);
  }

  async function toggleFavoriet(e, id) {
    e.stopPropagation();
    await window.api.templates.toggleFavoriet(id);
    laad();
  }

  async function dupliceer(e, id) {
    e.stopPropagation();
    await window.api.templates.duplicate(id);
    laad();
  }

  function openTemplate(id) {
    slaRecentOp(id);
    setRecenteIds(leesRecent());
    navigeer('form', id);
  }

  const categorieen = ['Alle', ...new Set(templates.map(t => t.categorie).filter(Boolean))].sort((a, b) =>
    a === 'Alle' ? -1 : b === 'Alle' ? 1 : a.localeCompare(b)
  );

  const gefilterd = templates
    .filter(t => {
      const matchCat = actieveCategorie === 'Alle' || t.categorie === actieveCategorie;
      const matchZoek = !zoekterm ||
        t.naam.toLowerCase().includes(zoekterm.toLowerCase()) ||
        (t.beschrijving || '').toLowerCase().includes(zoekterm.toLowerCase());
      return matchCat && matchZoek;
    })
    .sort((a, b) => (b.favoriet ? 1 : 0) - (a.favoriet ? 1 : 0));

  const recenteTemplates = (!zoekterm && actieveCategorie === 'Alle')
    ? recenteIds.map(id => templates.find(t => t.id === id)).filter(Boolean)
    : [];

  const conceptTemplateIds = new Set(concepten.map(c => c.templateId));

  // Concepten met sjabloonnaam erbij
  const conceptenMetNaam = concepten.map(c => ({
    ...c,
    templateNaam: templates.find(t => t.id === c.templateId)?.naam || c.templateNaam,
  }));

  function zetKolom(kolom, delta) {
    setKolBreedte(k => {
      const nieuw = { ...k, [kolom]: Math.max(60, k[kolom] + delta) };
      try { localStorage.setItem('sjablonen-kolbreedte', JSON.stringify(nieuw)); } catch {}
      return nieuw;
    });
  }

  // ── Onboarding (lege staat) ──────────────────────────────────────────────────
  if (!laden && templates.length === 0) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Welkom bij Sjablonenplatform</h1>
          <p className="text-gray-500 mt-1">Volg de stappen hieronder om te beginnen.</p>
        </div>
        <div className="space-y-4">
          <StapKaart
            nummer={1}
            titel="Instellingen aanpassen"
            omschrijving="Vul de kantoorgegevens in en kies een opslagmap voor sjablonen."
            actieLabel="Naar instellingen"
            onClick={() => navigeer('admin')}
            gereed={false}
          />
          <StapKaart
            nummer={2}
            titel="Eerste sjabloon toevoegen"
            omschrijving="Upload een Word-document (.docx) en definieer de invulvelden."
            actieLabel="Sjabloon aanmaken"
            onClick={() => navigeer('admin')}
            primair
          />
          <StapKaart
            nummer={3}
            titel="Document genereren"
            omschrijving="Kies een sjabloon, vul de gegevens in en exporteer het document."
            actieLabel="Later — verschijnt automatisch"
            disabled
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sjablonen</h1>
        <p className="text-gray-500 mt-1">Kies een sjabloon om te starten</p>
      </div>

      {/* Zoekbalk + weergave toggle */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={zoekRef}
            type="text"
            placeholder="Zoeken… (Ctrl+K)"
            value={zoekterm}
            onChange={e => setZoekterm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <div className="flex border border-gray-200 rounded-lg overflow-hidden shrink-0">
          <button
            onClick={() => { setWeergave('raster'); try { localStorage.setItem('sjablonen-weergave', 'raster'); } catch {} }}
            title="Rasterweergave"
            className={`p-2.5 transition-colors ${weergave === 'raster' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => { setWeergave('lijst'); try { localStorage.setItem('sjablonen-weergave', 'lijst'); } catch {} }}
            title="Lijstweergave"
            className={`p-2.5 transition-colors border-l border-gray-200 ${weergave === 'lijst' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Categorietabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {categorieen.map(cat => (
          <button
            key={cat}
            onClick={() => setActieveCategorie(cat)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              actieveCategorie === cat
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Openstaande concepten */}
      {conceptenMetNaam.length > 0 && !zoekterm && actieveCategorie === 'Alle' && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setConceptenOpen(o => !o)}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-amber-800 hover:bg-amber-100 transition-colors"
          >
            <BookmarkCheck size={15} className="text-amber-600" />
            <span className="flex-1 text-left">
              {conceptenMetNaam.length} openstaand{conceptenMetNaam.length !== 1 ? 'e' : ''} concept{conceptenMetNaam.length !== 1 ? 'en' : ''}
            </span>
            {conceptenOpen ? <ChevronUp size={14} className="text-amber-500" /> : <ChevronDown size={14} className="text-amber-500" />}
          </button>
          {conceptenOpen && (
            <div className="border-t border-amber-200 divide-y divide-amber-100">
              {conceptenMetNaam.map(c => (
                <button
                  key={c.id}
                  onClick={() => navigeer('form', c.templateId)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-amber-900 hover:bg-amber-100 transition-colors"
                >
                  <FileText size={13} className="text-amber-500 shrink-0" />
                  <span className="flex-1 text-left font-medium">{c.templateNaam}</span>
                  <span className="text-xs text-amber-600">{formatDatum(c.datum)}</span>
                  <ArrowRight size={13} className="text-amber-400 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recente sjablonen */}
      {recenteTemplates.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Recent gebruikt</h2>
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {recenteTemplates.map(t => (
              <button
                key={t.id}
                onClick={() => openTemplate(t.id)}
                className="shrink-0 flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-blue-300 hover:text-blue-700 transition-colors"
              >
                <FileText size={13} className="text-gray-400" />
                {t.naam}
                {conceptTemplateIds.has(t.id) && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="Openstaand concept" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Inhoud */}
      {laden ? (
        <div className="text-gray-400 py-16 text-center">Laden...</div>
      ) : gefilterd.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-gray-400">
          <FolderOpen size={40} className="mb-3 opacity-40" />
          <p className="text-sm">Geen sjablonen gevonden voor deze zoekopdracht.</p>
        </div>
      ) : weergave === 'raster' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {gefilterd.map(t => (
            <TemplateKaart
              key={t.id}
              template={t}
              heeftConcept={conceptTemplateIds.has(t.id)}
              onClick={() => openTemplate(t.id)}
              onToggleFavoriet={e => toggleFavoriet(e, t.id)}
              onBulk={e => { e.stopPropagation(); setBulkTemplate(t); }}
              onDuplicate={e => dupliceer(e, t.id)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-stretch border-b border-gray-200 bg-gray-50 select-none">
            <div className="relative flex-1 px-5 py-2.5 overflow-hidden">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Naam / toelichting</span>
              <DragHandle onDrag={d => zetKolom('categorie', -d)} />
            </div>
            <div className="relative px-3 py-2.5 shrink-0 overflow-hidden" style={{ width: kolBreedte.categorie }}>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Categorie</span>
              <DragHandle onDrag={d => zetKolom('bijgewerkt', -d)} />
            </div>
            <div className="relative px-3 py-2.5 shrink-0" style={{ width: kolBreedte.bijgewerkt }}>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Bijgewerkt</span>
              <DragHandle onDrag={d => zetKolom('versie', -d)} />
            </div>
            <div className="px-3 py-2.5 shrink-0" style={{ width: kolBreedte.versie }}>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Versie</span>
            </div>
          </div>
          {gefilterd.map((t, i) => (
            <TemplateRij
              key={t.id}
              template={t}
              heeftConcept={conceptTemplateIds.has(t.id)}
              laatste={i === gefilterd.length - 1}
              kolBreedte={kolBreedte}
              onClick={() => openTemplate(t.id)}
              onToggleFavoriet={e => toggleFavoriet(e, t.id)}
              onBulk={e => { e.stopPropagation(); setBulkTemplate(t); }}
              onDuplicate={e => dupliceer(e, t.id)}
            />
          ))}
        </div>
      )}

      {bulkTemplate && (
        <BulkModal template={bulkTemplate} onSluit={() => setBulkTemplate(null)} />
      )}
    </div>
  );
}

// ── Onboarding stapkaart ─────────────────────────────────────────────────────
function StapKaart({ nummer, titel, omschrijving, actieLabel, onClick, primair, disabled }) {
  return (
    <div className={`flex items-center gap-5 p-5 rounded-xl border ${primair ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white'} ${disabled ? 'opacity-50' : ''}`}>
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${primair ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
        {nummer}
      </div>
      <div className="flex-1">
        <div className="font-semibold text-gray-900 text-sm">{titel}</div>
        <div className="text-xs text-gray-500 mt-0.5">{omschrijving}</div>
      </div>
      {!disabled && (
        <button
          onClick={onClick}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg shrink-0 transition-colors ${
            primair ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          {primair ? <Settings size={14} /> : <ArrowRight size={14} />}
          {actieLabel}
        </button>
      )}
    </div>
  );
}

// ── Sjabloonkaart (raster) ───────────────────────────────────────────────────
function TemplateKaart({ template, heeftConcept, onClick, onToggleFavoriet, onBulk, onDuplicate }) {
  return (
    <button
      onClick={onClick}
      className={`text-left bg-white border rounded-xl p-5 hover:border-blue-400 hover:shadow-sm transition-all group relative ${template.favoriet ? 'border-yellow-300 bg-yellow-50/30' : 'border-gray-200'}`}
    >
      {heeftConcept && (
        <span className="absolute top-3 right-3 text-[10px] font-semibold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-full leading-none">
          concept
        </span>
      )}
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${template.favoriet ? 'bg-yellow-100' : 'bg-blue-50'}`}>
          <FileText size={20} className={template.favoriet ? 'text-yellow-600' : 'text-blue-600'} />
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <span onClick={onBulk} className="p-1 rounded-md hover:bg-gray-100 transition-colors cursor-pointer" title="Bulk opmaken">
            <Sheet size={13} className="text-gray-300 group-hover:text-gray-500" />
          </span>
          <span onClick={onDuplicate} className="p-1 rounded-md hover:bg-gray-100 transition-colors cursor-pointer" title="Sjabloon kopiëren">
            <Copy size={13} className="text-gray-300 group-hover:text-gray-500" />
          </span>
          <span onClick={onToggleFavoriet} className="p-1 rounded-md hover:bg-gray-100 transition-colors cursor-pointer" title={template.favoriet ? 'Verwijder uit favorieten' : 'Markeer als favoriet'}>
            <Star size={14} className={template.favoriet ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 group-hover:text-gray-400'} />
          </span>
          <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-400 transition-colors" />
        </div>
      </div>
      <div className="font-semibold text-gray-900 text-sm mb-1">{template.naam}</div>
      {template.beschrijving && (
        <div className="text-xs text-gray-500 line-clamp-2 mb-3">{template.beschrijving}</div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">{template.categorie}</span>
        <span className="text-xs text-gray-400">v{template.versie}</span>
      </div>
    </button>
  );
}

// ── Sjabloonrij (lijst) ──────────────────────────────────────────────────────
function TemplateRij({ template, heeftConcept, laatste, kolBreedte, onClick, onToggleFavoriet, onBulk, onDuplicate }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center hover:bg-blue-50 transition-colors group ${!laatste ? 'border-b border-gray-100' : ''}`}
    >
      <div className="flex-1 min-w-0 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span onClick={onToggleFavoriet} className="shrink-0 p-0.5 rounded hover:bg-gray-100 transition-colors" title={template.favoriet ? 'Verwijder uit favorieten' : 'Markeer als favoriet'}>
            <Star size={13} className={template.favoriet ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 group-hover:text-gray-400'} />
          </span>
          <span className="font-medium text-sm text-gray-900 truncate group-hover:text-blue-700">{template.naam}</span>
          {heeftConcept && (
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-full leading-none shrink-0">concept</span>
          )}
        </div>
        {template.beschrijving && (
          <div className="text-xs text-gray-400 truncate mt-0.5 pl-5">{template.beschrijving}</div>
        )}
      </div>
      <div className="px-3 py-3.5 shrink-0 overflow-hidden" style={{ width: kolBreedte.categorie }}>
        <span className="text-xs text-gray-500 truncate block">{template.categorie}</span>
      </div>
      <div className="px-3 py-3.5 shrink-0" style={{ width: kolBreedte.bijgewerkt }}>
        <span className="text-xs text-gray-400">{formatDatum(template.bijgewerkt)}</span>
      </div>
      <div className="px-3 py-3.5 flex items-center justify-between shrink-0" style={{ width: kolBreedte.versie }}>
        <span className="text-xs text-gray-400">v{template.versie}</span>
        <div className="flex items-center gap-1">
          <span onClick={onBulk} className="p-1 rounded hover:bg-gray-100 transition-colors" title="Bulk opmaken">
            <Sheet size={13} className="text-gray-300 group-hover:text-gray-500" />
          </span>
          <span onClick={onDuplicate} className="p-1 rounded hover:bg-gray-100 transition-colors" title="Sjabloon kopiëren">
            <Copy size={13} className="text-gray-300 group-hover:text-gray-500" />
          </span>
          <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-400 transition-colors" />
        </div>
      </div>
    </button>
  );
}
