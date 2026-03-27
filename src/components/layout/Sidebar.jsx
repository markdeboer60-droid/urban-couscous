import { LayoutGrid, Settings, ChevronRight } from 'lucide-react';

const items = [
  { id: 'browser', label: 'Sjablonen', icon: LayoutGrid },
  { id: 'admin',   label: 'Beheer',    icon: Settings },
];

export default function Sidebar({ actief, navigeer }) {
  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
      <div className="px-5 py-5 border-b border-gray-100">
        <span className="text-base font-semibold text-blue-700 tracking-tight">
          Sjablonenplatform
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => navigeer(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              actief === id
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Icon size={17} />
            <span className="flex-1 text-left">{label}</span>
            {actief === id && <ChevronRight size={14} className="text-blue-400" />}
          </button>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-gray-100">
        <span className="text-xs text-gray-400">v1.0.0</span>
      </div>
    </aside>
  );
}
