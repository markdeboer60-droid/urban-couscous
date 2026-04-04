import { useState } from 'react';
import { decodeerBetalingskenmerk, MIDDELCODE_MAP } from '../decodeBelastingkenmerk';

const VOORBEELDEN = [
  { label: 'Voorbeeld (OB)', kenmerk: '0036000011302270' },
];

export default function BetalingskenmerkDecoder() {
  const [input, setInput] = useState('');
  const [resultaat, setResultaat] = useState(null);

  function handleDecode(e) {
    e.preventDefault();
    setResultaat(decodeerBetalingskenmerk(input));
  }

  function handleVoorbeeld(kenmerk) {
    setInput(kenmerk);
    setResultaat(decodeerBetalingskenmerk(kenmerk));
  }

  function handleChange(e) {
    // Sta alleen cijfers en spaties toe, max 16 cijfers
    const val = e.target.value.replace(/[^\d]/g, '').slice(0, 16);
    setInput(val);
    if (resultaat) setResultaat(null);
  }

  return (
    <div className="decoder-wrapper">
      <div className="decoder-card">
        <h2>Betalingskenmerk decoder</h2>
        <p className="decoder-intro">
          Voer een 16-cijferig betalingskenmerk van de Belastingdienst in om het
          bijbehorende aanslagnummer en alle losse onderdelen te zien.
        </p>

        <form onSubmit={handleDecode} className="decoder-form">
          <div className="decoder-input-row">
            <input
              type="text"
              inputMode="numeric"
              placeholder="bijv. 0036000011302270"
              value={input}
              onChange={handleChange}
              maxLength={16}
              className="decoder-input"
              aria-label="Betalingskenmerk"
            />
            <button type="submit" className="decoder-btn" disabled={input.length !== 16}>
              Decoderen
            </button>
          </div>
          <div className="decoder-hint">
            {input.length}/16 cijfers
          </div>
        </form>

        <div className="decoder-examples">
          {VOORBEELDEN.map(({ label, kenmerk }) => (
            <button
              key={kenmerk}
              className="example-btn"
              onClick={() => handleVoorbeeld(kenmerk)}
              type="button"
            >
              {label}: {kenmerk}
            </button>
          ))}
        </div>

        {resultaat && (
          resultaat.fout
            ? <div className="decoder-error">{resultaat.fout}</div>
            : <Resultaat data={resultaat} />
        )}
      </div>

      <MiddelcodeTabel />
    </div>
  );
}

function Resultaat({ data }) {
  return (
    <div className="decoder-result">
      {/* Aanslagnummer — prominent bovenaan */}
      <div className="result-aanslagnummer">
        <div className="result-aanslagnummer-label">Aanslagnummer</div>
        <div className="result-aanslagnummer-value">{data.aanslagnummer}</div>
        <div className={`checksum-badge ${data.checksumGeldig ? 'ok' : 'warn'}`}>
          Checksum {data.checksumGeldig ? 'geldig' : 'ongeldig / onbekend formaat'}
        </div>
      </div>

      {/* Losse onderdelen */}
      <div className="result-grid">
        <Veld label="BSN / RSIN (8 cijfers)" waarde={data.bsn8} />
        <Veld
          label="BSN / RSIN (9 cijfers, gereconstrueerd)"
          waarde={data.bsn9}
          highlight
        />
        <Veld
          label={`Belastingsoort (middelcode ${data.middelCode})`}
          waarde={`${data.middelLetter} — ${data.middelOmschrijving}`}
        />
        <Veld label="Jaar (2-cijferig)" waarde={`20${data.jaarTweecijferig} (positie: ${data.jaarDigit})`} />
        <Veld label="Subnummer / aanslagsoort" waarde={data.subnummer} />
        <Veld label="Tijdvak" waarde={data.tijdvak} />
        <Veld label="Volgnummer" waarde={data.volgnummer} />
        <Veld label="Checksum (positie 1)" waarde={String(data.checksum)} />
      </div>

      {/* Visuele opbouw van het kenmerk */}
      <KenmerkVisueel data={data} />
    </div>
  );
}

function Veld({ label, waarde, highlight }) {
  return (
    <div className={`result-veld ${highlight ? 'highlight' : ''}`}>
      <div className="veld-label">{label}</div>
      <div className="veld-waarde">{waarde}</div>
    </div>
  );
}

function KenmerkVisueel({ data }) {
  const segmenten = [
    { pos: '1',     waarde: String(data.checksum), kleur: '#94a3b8', titel: 'Checksum' },
    { pos: '2–9',   waarde: data.bsn8,             kleur: '#3b82f6', titel: 'BSN/RSIN (8)' },
    { pos: '10',    waarde: String(data.middelCode),kleur: '#8b5cf6', titel: 'Middelcode' },
    { pos: '11',    waarde: data.jaarDigit,         kleur: '#f59e0b', titel: 'Jaar' },
    { pos: '12–13', waarde: data.subnummer,         kleur: '#10b981', titel: 'Subnummer' },
    { pos: '14–15', waarde: data.tijdvak,           kleur: '#ef4444', titel: 'Tijdvak' },
    { pos: '16',    waarde: data.volgnummer,        kleur: '#64748b', titel: 'Volgnr.' },
  ];

  return (
    <div className="kenmerk-visueel">
      <div className="kenmerk-visueel-label">Opbouw kenmerk</div>
      <div className="kenmerk-segmenten">
        {segmenten.map((s) => (
          <div key={s.pos} className="kenmerk-segment" style={{ '--seg-kleur': s.kleur }}>
            <div className="seg-cijfers">{s.waarde}</div>
            <div className="seg-titel">{s.titel}</div>
            <div className="seg-pos">pos {s.pos}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiddelcodeTabel() {
  return (
    <div className="middelcode-card">
      <h3>Middelcode-overzicht</h3>
      <table className="middelcode-tabel">
        <thead>
          <tr>
            <th>Code</th>
            <th>Letter</th>
            <th>Omschrijving</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(MIDDELCODE_MAP).map(([code, { letter, omschrijving }]) => (
            <tr key={code}>
              <td>{code}</td>
              <td><strong>{letter}</strong></td>
              <td>{omschrijving}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
