export default function VeldInput({ veld, waarde, onChange }) {
  const basisKlasse = "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {veld.label}
        {veld.verplicht && <span className="text-red-500 ml-1">*</span>}
      </label>

      {veld.type === 'text' && (
        <input
          type="text"
          value={waarde || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={veld.placeholder || ''}
          className={basisKlasse}
        />
      )}

      {veld.type === 'textarea' && (
        <textarea
          value={waarde || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={veld.placeholder || ''}
          rows={4}
          className={basisKlasse + ' resize-y'}
        />
      )}

      {veld.type === 'date' && (
        <input
          type="date"
          value={waarde || ''}
          onChange={e => onChange(e.target.value)}
          className={basisKlasse}
        />
      )}

      {veld.type === 'number' && (
        <input
          type="number"
          value={waarde || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={veld.placeholder || ''}
          className={basisKlasse}
        />
      )}

      {veld.type === 'select' && (
        <select
          value={waarde || ''}
          onChange={e => onChange(e.target.value)}
          className={basisKlasse}
        >
          <option value="">-- Kies een optie --</option>
          {(veld.opties || []).map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )}

      {veld.type === 'boolean' && (
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={!!waarde}
              onChange={e => onChange(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-blue-600 transition-colors" />
            <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
          </div>
          <span className="text-sm text-gray-600">
            {waarde ? (veld.labelAan || 'Ja') : (veld.labelUit || 'Nee')}
          </span>
        </label>
      )}

      {veld.toelichting && (
        <p className="mt-1.5 text-xs text-gray-400">{veld.toelichting}</p>
      )}
    </div>
  );
}
