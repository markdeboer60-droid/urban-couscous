import { useEffect, useState } from 'react';
import { LayoutGrid, Settings, History, ChevronRight, ChevronLeft, Users, BookOpen, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

const items = [
  { id: 'browser',          label: 'Sjablonen',         icon: LayoutGrid },
  { id: 'geschiedenis',     label: 'Geschiedenis',      icon: History },
  { id: 'klanten',          label: 'Adresboek',         icon: Users },
  { id: 'standaardTeksten', label: 'Standaard teksten', icon: BookOpen },
  { id: 'admin',            label: 'Beheer',             icon: Settings },
];

export default function Sidebar({ actief, navigeer }) {
  const [versie, setVersie] = useState('');
  const [kantoorNaam, setKantoorNaam] = useState('');
  const [ingeklapt, setIngeklapt] = useState(() => {
    try { return localStorage.getItem('sidebar-ingeklapt') === 'true'; } catch { return false; }
  });

  useEffect(() => {
    window.api.app?.getVersion().then(setVersie).catch(() => {});
    window.api.settings?.get().then(s => setKantoorNaam(s.kantoorNaam || '')).catch(() => {});
  }, []);

  function toggle() {
    setIngeklapt(v => {
      const nieuw = !v;
      try { localStorage.setItem('sidebar-ingeklapt', String(nieuw)); } catch {}
      return nieuw;
    });
  }

  return (
    <aside className={`${ingeklapt ? 'w-14' : 'w-56'} bg-white border-r border-gray-200 flex flex-col shrink-0 transition-all duration-200 overflow-hidden`}>
      {/* Header */}
      <div className={`flex items-center border-b border-gray-100 ${ingeklapt ? 'justify-center px-0 py-4' : 'justify-between px-4 py-5'}`}>
        {!ingeklapt && (
          <span className="text-base font-semibold text-blue-700 tracking-tight truncate">
            {kantoorNaam || 'Sjabloongenerator'}
          </span>
        )}
        <button
          onClick={toggle}
          title={ingeklapt ? 'Menu uitklappen' : 'Menu inklappen'}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
        >
          {ingeklapt ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className={`flex-1 py-4 space-y-1 ${ingeklapt ? 'px-1.5' : 'px-3'}`}>
        {items.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => navigeer(id)}
            title={ingeklapt ? label : undefined}
            className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              actief === id
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            } ${ingeklapt ? 'justify-center' : ''}`}
          >
            <Icon size={17} className="shrink-0" />
            {!ingeklapt && (
              <>
                <span className="flex-1 text-left">{label}</span>
                {actief === id && <ChevronRight size={14} className="text-blue-400 shrink-0" />}
              </>
            )}
          </button>
        ))}
      </nav>

      {/* Versie */}
      {!ingeklapt && (
        <div className="px-5 py-4 border-t border-gray-100">
          <span className="text-xs text-gray-400">{versie ? `v${versie}` : 'v1.0.0'}</span>
        </div>
      )}
    </aside>
  );
}
