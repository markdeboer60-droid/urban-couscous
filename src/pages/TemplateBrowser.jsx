import { useEffect, useState } from 'react';
import { Search, FileText, ChevronRight, FolderOpen } from 'lucide-react';

export default function TemplateBrowser({ navigeer }) {
  const [templates, setTemplates] = useState([]);
  const [zoekterm, setZoekterm] = useState('');
  const [actieveCategorie, setActieveCategorie] = useState('Alle');
  const [laden, setLaden] = useState(true);

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

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sjablonen</h1>
        <p className="text-gray-500 mt-1">Kies een sjabloon om te starten</p>
      </div>

      {/* Zoekbalk */}
      <div className="relative mb-6 max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Zoeken..."
          value={zoekterm}
          onChange={e => setZoekterm(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
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

      {/* Template grid */}
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
            <button
              onClick={() => navigeer('admin')}
              className="mt-4 text-sm text-blue-600 underline"
            >
              Naar Beheer
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {gefilterd.map(t => (
            <TemplateKaart key={t.id} template={t} onClick={() => navigeer('form', t.id)} />
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
