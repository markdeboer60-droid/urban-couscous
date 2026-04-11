import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Settings, FileText, Search, Copy, LayoutGrid, Trash, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import TemplateEditor from '../components/admin/TemplateEditor';
import InstellingenPanel from '../components/admin/InstellingenPanel';
import { useToast } from '../context/ToastContext';

const SECTIES = [
  { id: 'sjablonen',    label: 'Sjablonen',    icon: LayoutGrid },
  { id: 'instellingen', label: 'Instellingen', icon: Settings },
  { id: 'opruimen',     label: 'Opruimen',     icon: Trash },
];

export default function AdminPage() {
  const showToast = useToast();
  const [templates, setTemplates] = useState([]);
  const [sectie, setSectie] = useState('sjablonen');
  const [bewerkId, setBewerkId] = useState(null);
  const [verwijderBevestig, setVerwijderBevestig] = useState(null);
  const [opruimenBevestig, setOpruimenBevestig] = useState(false);
  const [zoekterm, setZoekterm] = useState('');
  const [ingeklapt, setIngeklapt] = useState(() => {
    try { return localStorage.getItem('admin-sidebar-ingeklapt') === 'true'; } catch { return false; }
  });

  useEffect(() => {
    laadTemplates();
  }, []);

  async function laadTemplates() {
    const data = await window.api.templates.getAll();
    setTemplates(data);
  }

  function nieuw() {
    setBewerkId(null);
    setSectie('editor');
  }

  function bewerk(id) {
    setBewerkId(id);
    setSectie('editor');
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
    setSectie('sjablonen');
    setBewerkId(null);
    laadTemplates();
  }

  async function opruimen() {
    setOpruimenBevestig(false);
    try {
      await window.api.admin.opruimen();
      showToast('Alles opgeruimd', 'success');
    } catch (err) {
      showToast('Fout bij opruimen: ' + (err?.message || 'onbekend'), 'error');
    }
  }

  function toggleSidebar() {
    setIngeklapt(v => {
      const nieuw = !v;
      try { localStorage.setItem('admin-sidebar-ingeklapt', String(nieuw)); } catch {}
      return nieuw;
    });
  }

  if (sectie === 'editor') {
    return <TemplateEditor templateId={bewerkId} onTerug={terug} />;
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
    <div className="flex min-h-full">
      {/* Zijmenu */}
      <aside className={`${ingeklapt ? 'w-14' : 'w-48'} shrink-0 bg-gray-50 border-r border-gray-200 flex flex-col transition-all duration-200 overflow-hidden`}>
        <div className={`flex items-center border-b border-gray-200 ${ingeklapt ? 'justify-center px-0 py-3' : 'justify-between px-3 py-3'}`}>
          {!ingeklapt && <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Beheer</span>}
          <button
            onClick={toggleSidebar}
            title={ingeklapt ? 'Uitklappen' : 'Inklappen'}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors shrink-0"
          >
            {ingeklapt ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          </button>
        </div>

        <nav className={`flex-1 py-3 space-y-0.5 ${ingeklapt ? 'px-1.5' : 'px-2'}`}>
          {SECTIES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSectie(id)}
              title={ingeklapt ? label : undefined}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                sectie === id
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              } ${ingeklapt ? 'justify-center' : ''}`}
            >
              <Icon size={16} className="shrink-0" />
              {!ingeklapt && <span className="flex-1 text-left">{label}</span>}
            </button>
          ))}
        </nav>
      </aside>

      {/* Hoofdinhoud */}
      <div className="flex-1 overflow-auto">
        {sectie === 'sjablonen' && (
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Sjablonen</h1>
                <p className="text-gray-500 mt-1 text-sm">{templates.length} sjabloon{templates.length !== 1 ? 'en' : ''}</p>
              </div>
              <button
                onClick={nieuw}
                className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={15} />
                Nieuw sjabloon
              </button>
            </div>

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

            {templates.length > 0 && gefilterd.length === 0 && (
              <div className="flex flex-col items-center py-16 text-gray-400">
                <Search size={32} className="mb-3 opacity-30" />
                <p className="text-sm">Geen sjablonen gevonden voor deze zoekopdracht</p>
              </div>
            )}

            {categorieen.map(cat => (
              <TemplateGroep key={cat} titel={cat} items={gefilterd.filter(t => t.categorie === cat)}
                onBewerk={bewerk} onVerwijder={setVerwijderBevestig} onDupliceer={dupliceer} />
            ))}

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
        )}

        {sectie === 'instellingen' && (
          <InstellingenPanel onTerug={() => setSectie('sjablonen')} />
        )}

        {sectie === 'opruimen' && (
          <div className="p-8 max-w-xl">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Opruimen</h1>
              <p className="text-gray-500 mt-1 text-sm">Verwijder gegenereerde bestanden en reset de werkruimte</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-800 mb-1">Alles opruimen</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Hiermee worden alle gegenereerde documenten, alle geschiedenis en alle concepten verwijderd.
                  Sjablonen en standaard teksten blijven behouden.
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 mb-4">
                  Let op: dit kan niet ongedaan worden gemaakt. Alle overeenkomsten per klant, recente documenten en concepten worden gewist.
                </div>
                <button
                  onClick={() => setOpruimenBevestig(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash size={15} />
                  Alles opruimen
                </button>
              </div>
            </div>

            {opruimenBevestig && (
              <ConfirmDialog
                titel="Alles opruimen?"
                omschrijving="Alle gegenereerde documenten, geschiedenis en concepten worden permanent verwijderd. Sjablonen en standaard teksten blijven behouden. Dit kan niet ongedaan worden gemaakt."
                bevestigLabel="Ja, alles verwijderen"
                onBevestig={opruimen}
                onAnnuleer={() => setOpruimenBevestig(false)}
              />
            )}
          </div>
        )}
      </div>
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
