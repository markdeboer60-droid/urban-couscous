import { useEffect, useState } from 'react';
import { Search, FileText, ChevronRight, FolderOpen, LayoutGrid, List } from 'lucide-react';

function formatDatum(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Versleepbare scheidingslijn voor kolombreedte
function DragHandle({ onDrag }) {
  function onMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();
    let lastX = e.clientX;

    function onMove(e) {
      const delta = e.clientX - lastX;
      lastX = e.clientX;
      onDrag(delta);
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  return (
    <div
      onMouseDown={onMouseDown}
      className="absolute right-0 top-0 h-full w-3 flex items-center justify-center cursor-col-resize group z-10"
    >
      <div className="w-px h-5 bg-gray-300 rounded-full group-hover:bg-blue-400 group-hover:h-full transition-all duration-100" />
    </div>
  );
}

export default function TemplateBrowser({ navigeer }) {
  const [templates, setTemplates] = useState([]);
  const [zoekterm, setZoekterm] = useState('');
  const [actieveCategorie, setActieveCategorie] = useState('Alle');
  const [laden, setLaden] = useState(true);
  const [weergave, setWeergave] = useState(() => localStorage.getItem('sjablonen-weergave') || 'raster');
  // Kolombreedte (px) voor lijstweergave — versleepbaar
  const [kolBreedte, setKolBreedte] = useState({ categorie: 170, bijgewerkt: 110, versie: 90 });

  useEffect(() => {
    window.api.templates.getAll().then(data => {
      setTemplates(data);
      setLaden(false);
    });
  }, []);

  const categorieen = ['Alle', ...new Set(templates.map(t => t.categorie).filter(Boolean))].sort((a, b) =>
    a === 'Alle' ? -1 : b === 'Alle' ? 1 : a.localeCompare(b)
  );

  const gefilterd = templates.filter(t => {
    const matchCategorie = actieveCategorie === 'Alle' || t.categorie === actieveCategorie;
    const matchZoek = !zoekterm ||
      t.naam.toLowerCase().includes(zoekterm.toLowerCase()) ||
      (t.beschrijving || '').toLowerCase().includes(zoekterm.toLowerCase());
    return matchCategorie && matchZoek;
  });

  function zetKolom(kolom, delta) {
    setKolBreedte(k => ({ ...k, [kolom]: Math.max(60, k[kolom] + delta) }));
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
            type="text"
            placeholder="Zoeken..."
            value={zoekterm}
            onChange={e => setZoekterm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <div className="flex border border-gray-200 rounded-lg overflow-hidden shrink-0">
          <button
            onClick={() => { setWeergave('raster'); localStorage.setItem('sjablonen-weergave', 'raster'); }}
            title="Rasterweergave"
            className={`p-2.5 transition-colors ${weergave === 'raster' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => { setWeergave('lijst'); localStorage.setItem('sjablonen-weergave', 'lijst'); }}
            title="Lijstweergave"
            className={`p-2.5 transition-colors border-l border-gray-200 ${weergave === 'lijst' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Categorietabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {categorieen.map(cat => (
          <button
            key={cat}
            onClick={() => setActieveCategorie(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              actieveCategorie === cat
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Inhoud */}
      {laden ? (
        <div className="text-gray-400 py-16 text-center">Laden...</div>
      ) : gefilterd.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-gray-400">
          <FolderOpen size={40} className="mb-3 opacity-40" />
          <p className="text-sm">
            {templates.length === 0
              ? 'Nog geen sjablonen. Ga naar Beheer om sjablonen toe te voegen.'
              : 'Geen sjablonen gevonden voor deze zoekopdracht.'}
          </p>
          {templates.length === 0 && (
            <button onClick={() => navigeer('admin')} className="mt-4 text-sm text-blue-600 underline">
              Naar Beheer
            </button>
          )}
        </div>
      ) : weergave === 'raster' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {gefilterd.map(t => (
            <TemplateKaart key={t.id} template={t} onClick={() => navigeer('form', t.id)} />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Koptekstrij met versleepbare scheidingen */}
          <div className="flex items-stretch border-b border-gray-200 bg-gray-50 select-none">
            <div className="relative flex-1 px-5 py-2.5 overflow-hidden">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Naam / toelichting</span>
              {/* Sleephandvat rechts van naam-kolom: maakt categorie smaller */}
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
          {/* Rijen */}
          {gefilterd.map((t, i) => (
            <TemplateRij
              key={t.id}
              template={t}
              laatste={i === gefilterd.length - 1}
              kolBreedte={kolBreedte}
              onClick={() => navigeer('form', t.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateKaart({ template, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-left bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 bg-blue-50 rounded-lg">
          <FileText size={20} className="text-blue-600" />
        </div>
        <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-400 mt-1 transition-colors" />
      </div>
      <div className="font-semibold text-gray-900 text-sm mb-1">{template.naam}</div>
      {template.beschrijving && (
        <div className="text-xs text-gray-500 line-clamp-2 mb-3">{template.beschrijving}</div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
          {template.categorie}
        </span>
        <span className="text-xs text-gray-400">v{template.versie}</span>
      </div>
    </button>
  );
}

function TemplateRij({ template, laatste, kolBreedte, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center hover:bg-blue-50 transition-colors group ${!laatste ? 'border-b border-gray-100' : ''}`}
    >
      <div className="flex-1 min-w-0 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-blue-500 shrink-0" />
          <span className="font-medium text-sm text-gray-900 truncate group-hover:text-blue-700">
            {template.naam}
          </span>
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
        <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-400 transition-colors" />
      </div>
    </button>
  );
}
