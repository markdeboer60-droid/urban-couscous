import { AlertCircle } from 'lucide-react';

export default function ConfirmDialog({ titel, omschrijving, bevestigLabel = 'Bevestigen', bevestigKlasse = 'bg-red-600 hover:bg-red-700', onBevestig, onAnnuleer }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-red-100 rounded-lg shrink-0">
            <AlertCircle size={18} className="text-red-600" />
          </div>
          <div>
            <div className="font-semibold text-gray-900">{titel}</div>
            {omschrijving && (
              <div className="text-sm text-gray-500 mt-1">{omschrijving}</div>
            )}
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onAnnuleer}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Annuleren
          </button>
          <button
            onClick={onBevestig}
            className={`px-4 py-2 text-sm text-white rounded-lg ${bevestigKlasse}`}
          >
            {bevestigLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
