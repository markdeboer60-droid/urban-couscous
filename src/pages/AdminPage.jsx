import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Settings, FileText, Search, Copy } from 'lucide-react';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import TemplateEditor from '../components/admin/TemplateEditor';
import InstellingenPanel from '../components/admin/InstellingenPanel';
import { useToast } from '../context/ToastContext';

export default function AdminPage() {
  const showToast = useToast();
  const [templates, setTemplates] = useState([]);
  const [scherm, setScherm] = useState('lijst'); // 'lijst' | 'editor' | 'instellingen'
  const [bewerkId, setBewerkId] = useState(null);
  const [verwijderBevestig, setVerwijderBevestig] = useState(null);
  const [zoekterm, setZoekterm] = useState('');

  useEffect(() => {
    laadTemplates();
  }, []);

  async function laadTemplates() {
    const data = await window.api.templates.getAll();
    setTemplates(data);
  }

  function nieuw() {
    setBewerkId(null);
    setScherm('editor');
  }

  function bewerk(id) {
    setBewerkId(id);
    setScherm('editor');
  }

  async function verwijder(id) {
    await window.api.templates.delete(id);
    setVerwijderBevestig(null);
    laadTemplates();
    showToast('Sjabloon verwijderd', 'info');
  }

  async function dupliceer(id) {
    await window.api.templates.duplicate(id);
    laadTemplates();
    showToast('Sjabloon gedupliceerd');
  }

  function terug() {
    setScherm('lijst');
    setBewerkId(null);
    laadTemplates();
  }

  if (scherm === 'editor') {
    return <TemplateEditor templateId={bewerkId} onTerug={terug} />;
  }

  if (scherm === 'instellingen') {
    return <InstellingenPanel onTerug={() => setScherm('lijst')} />;
  }

  const gefilterd = zoekterm
    ? templates.filter(t =>
        t.naam.toLowerCase().includes(zoekterm.toLowerCase()) ||
        (t.beschrijving || '').toLowerCase().includes(zoekterm.toLowerCase()) ||
        (t.categorie || '').toLowerCase().includes(zoekterm.toLowerCase())
      )
    : templates;

  const categorieen = [...new Set(gefilterd.map(t => t.categorie).filter(Boolean))].sort();

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Beheer</h1>
          <p className="text-gray-500 mt-1 text-sm">{templates.length} sjabloon{templates.length !== 1 ? 'en' : ''}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setScherm('instellingen')}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Settings size={15} />
            Instellingen
          </button>
          <button
            onClick={nieuw}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={15} />
            Nieuw sjabloon
          </button>
        </div>
      </div>

      {/* Zoekbalk */}
      {templates.length > 0 && (
        <div className="relative mb-6 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Zoeken op naam, categorie of omschrijving..."
            value={zoekterm}
            onChange={e => setZoekterm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
      )}

      {/* Lege staat */}
      {templates.length === 0 && (
        <div className="flex flex-col items-center py-20 text-gray-400">
          <FileText size={40} className="mb-3 opacity-40" />
          <p className="text-sm mb-4">Nog geen sjablonen toegevoegd</p>
          <button
            onClick={nieuw}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Plus size={15} />
            Eerste sjabloon toevoegen
          </button>
        </div>
      )}

      {/* Geen resultaten na zoeken */}
      {templates.length > 0 && gefilterd.length === 0 && (
        <div className="flex flex-col items-center py-16 text-gray-400">
          <Search size={32} className="mb-3 opacity-30" />
          <p className="text-sm">Geen sjablonen gevonden voor deze zoekopdracht</p>
        </div>
      )}

      {/* Sjablonen per categorie */}
      {categorieen.map(cat => (
        <TemplateGroep key={cat} titel={cat} items={gefilterd.filter(t => t.categorie === cat)}
          onBewerk={bewerk} onVerwijder={setVerwijderBevestig} onDupliceer={dupliceer} />
      ))}

      {/* Sjablonen zonder categorie */}
      {gefilterd.filter(t => !t.categorie).length > 0 && (
        <TemplateGroep titel="Overige" items={gefilterd.filter(t => !t.categorie)}
          onBewerk={bewerk} onVerwijder={setVerwijderBevestig} onDupliceer={dupliceer} />
      )}

      {verwijderBevestig && (
        <ConfirmDialog
          titel="Sjabloon verwijderen?"
          omschrijving="Dit verwijdert het sjabloon en alle bijbehorende veldconfiguratie. Dit kan niet ongedaan worden gemaakt."
          bevestigLabel="Verwijderen"
          onBevestig={() => verwijder(verwijderBevestig)}
          onAnnuleer={() => setVerwijderBevestig(null)}
        />
      )}
    </div>
  );
}

function TemplateGroep({ titel, items, onBewerk, onVerwijder, onDupliceer }) {
  return (
    <div className="mb-8">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{titel}</h2>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {items.map((t, i, arr) => (
          <div
            key={t.id}
            className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors ${i < arr.length - 1 ? 'border-b border-gray-100' : ''}`}
          >
            <div className="p-2 bg-blue-50 rounded-lg shrink-0">
              <FileText size={16} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-gray-900 truncate">{t.naam}</div>
              {t.beschrijving && (
                <div className="text-xs text-gray-400 truncate mt-0.5">{t.beschrijving}</div>
              )}
            </div>
            <span className="text-xs text-gray-400 shrink-0">v{t.versie}</span>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => onBewerk(t.id)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Bewerken">
                <Pencil size={15} />
              </button>
              <button onClick={() => onDupliceer(t.id)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Dupliceren">
                <Copy size={15} />
              </button>
              <button onClick={() => onVerwijder(t.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Verwijderen">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
