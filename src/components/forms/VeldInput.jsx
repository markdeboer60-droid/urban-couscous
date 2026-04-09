
export default function VeldInput({ veld, waarde, onChange, ondertekenaars = [] }) {
  const basisKlasse = "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

  // Radio type: kaartachtige keuzeknopgroep
  // Fallback naar tekstveld als er geen opties zijn geconfigureerd
  if (veld.type === 'radio') {
    const opties = veld.radioOpties || [];
    if (opties.length === 0) {
      return (
        <VeldWrap veld={veld}>
          <input
            type="text"
            value={waarde || ''}
            onChange={e => onChange(e.target.value)}
            placeholder={veld.placeholder || ''}
            className={basisKlasse}
          />
        </VeldWrap>
      );
    }
    return (
      <VeldWrap veld={veld}>
        <div className="space-y-2">
          {opties.map(opt => (
            <label
              key={opt.key}
              className={`flex items-start gap-3 p-3.5 border rounded-lg cursor-pointer transition-colors ${
                waarde === opt.key
                  ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name={veld.sleutel}
                value={opt.key}
                checked={waarde === opt.key}
                onChange={() => onChange(opt.key)}
                className="mt-0.5 accent-blue-600 shrink-0"
              />
              <div>
                <div className="text-sm font-medium text-gray-800">{opt.label || opt.key}</div>
                {opt.toelichting && (
                  <div className="text-xs text-gray-500 mt-0.5">{opt.toelichting}</div>
                )}
              </div>
            </label>
          ))}
        </div>
      </VeldWrap>
    );
  }

  // Behandelaar: dropdown gevuld vanuit ondertekenaars (net als het ondertekenaar-type)
  if (veld.sleutel === 'Behandelaar' && ondertekenaars.length > 0) {
    return (
      <VeldWrap veld={veld}>
        <select
          value={waarde || ''}
          onChange={e => onChange(e.target.value)}
          className={basisKlasse}
        >
          <option value="">-- Kies behandelaar --</option>
          {ondertekenaars.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </VeldWrap>
    );
  }

  // Digitaal ondertekenen: vaste ja/nee dropdown (ongeacht het geconfigureerde type)
  if (veld.sleutel === 'digitaal_ondertekenen') {
    return (
      <VeldWrap veld={veld}>
        <select
          value={waarde || ''}
          onChange={e => onChange(e.target.value)}
          className={basisKlasse}
        >
          <option value="">-- Kies --</option>
          <option value="ja">Ja — handtekening automatisch toevoegen</option>
          <option value="nee">Nee — ruimte vrijlaten voor natte handtekening</option>
        </select>
      </VeldWrap>
    );
  }

  // Ondertekenaar type: select gevuld vanuit instellingen
  if (veld.type === 'ondertekenaar') {
    return (
      <VeldWrap veld={veld}>
        <select
          value={waarde || ''}
          onChange={e => onChange(e.target.value)}
          className={basisKlasse}
        >
          <option value="">-- Kies ondertekenaar --</option>
          {ondertekenaars.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </VeldWrap>
    );
  }

  // Currency type: € prefix
  if (veld.type === 'currency') {
    return (
      <VeldWrap veld={veld}>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">€</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={waarde === '' || waarde === null || waarde === undefined ? '' : waarde}
            onChange={e => {
              if (e.target.value === '') { onChange(''); return; }
              const val = parseFloat(e.target.value);
              if (!isNaN(val)) onChange(val);
            }}
            placeholder="0,00"
            className={basisKlasse + ' pl-8'}
          />
        </div>
      </VeldWrap>
    );
  }

  const bekendeTypes = ['text', 'textarea', 'date', 'number', 'select', 'boolean'];

  return (
    <VeldWrap veld={veld}>
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
          value={waarde === '' || waarde === null || waarde === undefined ? '' : waarde}
          onChange={e => {
            if (e.target.value === '') { onChange(''); return; }
            const val = parseFloat(e.target.value);
            if (!isNaN(val)) onChange(val);
          }}
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

      {/* Fallback voor onbekend of verkeerd geconfigureerd type */}
      {!bekendeTypes.includes(veld.type) && (
        <input
          type="text"
          value={waarde || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={veld.placeholder || ''}
          className={basisKlasse}
        />
      )}
    </VeldWrap>
  );
}

function VeldWrap({ veld, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {veld.label}
        {veld.verplicht && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {veld.toelichting && (
        <p className="mt-1.5 text-xs text-gray-400">{veld.toelichting}</p>
      )}
    </div>
  );
}
