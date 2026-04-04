import { useState, useRef } from 'react';

// ─── Constanten ────────────────────────────────────────────────────────────────

const MIDDELCODE = {
  0: { letter: 'A', naam: 'Naheffing Loonbelasting' },
  1: { letter: 'B', naam: 'Omzetbelasting (BTW)' },
  2: { letter: 'M', naam: 'Motorrijtuigenbelasting' },
  3: { letter: 'H', naam: 'Inkomstenbelasting' },
  4: { letter: 'V', naam: 'Vennootschapsbelasting' },
  5: { letter: 'F', naam: 'Naheffing Omzetbelasting' },
  6: { letter: 'L', naam: 'Loonbelasting' },
  7: { letter: 'T', naam: 'Toeslagen' },
};

// Vul hier uw KvK-API-sleutel in (registreer via https://developers.kvk.nl/)
const KVK_API_KEY = '';

// ─── Hulpfuncties ──────────────────────────────────────────────────────────────

function formatTijdvak(code) {
  const num = parseInt(code, 10);
  if (code === '00') return 'Geheel jaar';
  if (num >= 1 && num <= 12) {
    const maanden = [
      'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
      'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December',
    ];
    return `${maanden[num - 1]} (maand ${code})`;
  }
  const specials = {
    10: 'Kwartaal 1 (Q1)',
    20: 'Kwartaal 2 (Q2)',
    30: 'Kwartaal 4 (Q4)',
    40: 'Kwartaal 4 (Q4)',
  };
  return specials[num] ?? `Tijdvak ${code}`;
}

/**
 * Berekent het 9e cijfer van een BSN/RSIN via de elfproef.
 * @param {number[]} digits8 – de eerste 8 cijfers van het BSN/RSIN
 * @returns {number|null} – het 9e cijfer, of null als ongeldig (rest === 10)
 */
function berekenElfproef(digits8) {
  const gewichten = [9, 8, 7, 6, 5, 4, 3, 2];
  const som = digits8.reduce((acc, d, i) => acc + d * gewichten[i], 0);
  const rest = som % 11;
  return rest === 10 ? null : rest;
}

/**
 * Formatteer invoer naar "XXXX XXXX XXXX XXXX".
 */
function autoFormat(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})(?=.)/g, '$1 ');
}

/**
 * Zoek bedrijfsnaam op via RSIN.
 * Probeert eerst de officiële KvK-API (API-sleutel vereist),
 * daarna openkvk.nl als fallback.
 */
async function zoekBedrijfViaRSIN(rsin) {
  // ── Optie 1: Officiële KvK Handelsregister API ──────────────────────────
  if (KVK_API_KEY) {
    try {
      const res = await fetch(
        `https://api.kvk.nl/api/v1/zoeken?rsin=${rsin}`,
        { headers: { apikey: KVK_API_KEY, Accept: 'application/json' } }
      );
      if (res.ok) {
        const data = await res.json();
        const resultaten = data.resultaten ?? [];
        if (resultaten.length > 0) {
          const b = resultaten[0];
          return { naam: b.naam, kvkNummer: b.kvkNummer, type: b.type };
        }
        return null;
      }
    } catch {
      // val door naar volgende optie
    }
  }

  // ── Optie 2: OpenKvK (geen API-sleutel nodig, CORS-vriendelijk) ─────────
  try {
    const res = await fetch(
      `https://api.openkvk.nl/json/rsin/${rsin}/1/`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (res.ok) {
      const data = await res.json();
      const items = data.data ?? [];
      if (items.length > 0) {
        const b = items[0];
        return {
          naam: b.bedrijfsnaam ?? b.naam ?? '—',
          kvkNummer: b.kvk ?? b.kvknummer ?? null,
          type: b.rechtsvorm ?? null,
        };
      }
    }
  } catch {
    // netwerk-fout of CORS-blokkade
  }

  return null;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function TaxDecoder() {
  const [inputVal, setInputVal] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);           // decoded data
  const [bedrijf, setBedrijf] = useState(null);         // { naam, kvkNummer, type } | false | 'loading'
  const inputRef = useRef(null);

  // ── Input handler ────────────────────────────────────────────────────────
  function handleInput(e) {
    setInputVal(autoFormat(e.target.value));
    setError('');
    setResult(null);
    setBedrijf(null);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') decodeer();
  }

  // ── Decodering ───────────────────────────────────────────────────────────
  async function decodeer() {
    setError('');
    setResult(null);
    setBedrijf(null);

    const raw = inputVal.replace(/\D/g, '');

    if (raw.length !== 16) {
      setError(`Ongeldig aantal cijfers: ${raw.length} (verwacht: 16).`);
      return;
    }

    // ── Posities (1-indexed zoals in de specificatie) ──
    // Positie 1  (index 0): controlecijfer — negeren
    const rsinDigits = raw.slice(1, 9).split('').map(Number); // pos 2-9
    const middelcodeChar = raw[9];                            // pos 10
    const jaarDigit = raw[10];                                // pos 11
    const subnummer = raw.slice(11, 13);                      // pos 12-13
    const tijdvak = raw.slice(13, 15);                        // pos 14-15
    const volgnummer = raw[15];                               // pos 16

    // ── Valideer middelcode ──
    const middelcodeInfo = MIDDELCODE[Number(middelcodeChar)];
    if (!middelcodeInfo) {
      setError(`Onbekende middelcode: "${middelcodeChar}". Geldige waarden: 0–7.`);
      return;
    }

    // ── Elfproef → 9e cijfer ──
    const digit9 = berekenElfproef(rsinDigits);
    if (digit9 === null) {
      setError(
        'Elfproef mislukt: de berekende restwaarde is 10. ' +
        'Dit betalingskenmerk bevat geen geldig BSN/RSIN.'
      );
      return;
    }

    const rsinVolledig = rsinDigits.join('') + digit9;

    // Jaar: positie 11 = laatste cijfer; prepend "2" voor jaren '20
    // bijv. digit "3" → jaarCode "23" → volledig jaar "2023"
    const jaarCode = '2' + jaarDigit;          // 2-cijferig (gebruikt in aanslagnummer)
    const jaarVolledig = '202' + jaarDigit;    // 4-cijferig (voor weergave)

    // ── Aanslagnummer opbouwen ──
    // [9-cijferig RSIN/BSN][lettercode][subnummer][2-cijferig jaar][tijdvak][volgnummer]
    const aanslagnummer =
      rsinVolledig +
      middelcodeInfo.letter +
      subnummer +
      jaarCode +
      tijdvak +
      volgnummer;

    setResult({
      aanslagnummer,
      rsinVolledig,
      middelcodeInfo,
      jaarVolledig,
      tijdvak,
      subnummer,
      volgnummer,
    });

    // ── Bedrijfscheck ────────────────────────────────────────────────────
    setBedrijf('loading');
    const gevonden = await zoekBedrijfViaRSIN(rsinVolledig);
    setBedrijf(gevonden);   // null = niet gevonden, object = gevonden
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '1rem 0 3rem' }}>

      {/* ── Input card ─────────────────────────────────────────────────── */}
      <div style={styles.card}>
        <div style={{ marginBottom: '1.25rem' }}>
          <h2 style={styles.cardTitle}>Betalingskenmerk invoeren</h2>
          <p style={styles.cardSub}>
            Voer het 16-cijferige betalingskenmerk van de Belastingdienst in.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={inputVal}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            maxLength={19}
            placeholder="XXXX XXXX XXXX XXXX"
            style={styles.input}
          />
          <button onClick={decodeer} style={styles.btnPrimary}>
            Decodeer
          </button>
        </div>

        {error && <p style={styles.errorText}>{error}</p>}

        <p style={styles.hint}>
          Voorbeeld:&nbsp;
          <span
            style={styles.hintCode}
            onClick={() => { setInputVal('2036 0000 1630 1110'); setError(''); setResult(null); setBedrijf(null); }}
          >
            2036 0000 1630 1110
          </span>
        </p>
      </div>

      {/* ── Resultatenkaart ─────────────────────────────────────────────── */}
      {result && (
        <>
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Decoderingsresultaat</h2>

            {/* Aanslagnummer highlight */}
            <div style={styles.aanslagnummerBox}>
              <div style={styles.aanslagnummerLabel}>Aanslagnummer</div>
              <div style={styles.aanslagnummerValue}>{result.aanslagnummer}</div>
            </div>

            {/* Detailrijen */}
            <div style={styles.detailGrid}>
              <DetailRow label="RSIN / BSN" value={result.rsinVolledig} mono />
              <DetailRow
                label="Belastingsoort"
                value={`${result.middelcodeInfo.letter} — ${result.middelcodeInfo.naam}`}
              />
              <DetailRow label="Jaar" value={result.jaarVolledig} />
              <DetailRow label="Tijdvak" value={formatTijdvak(result.tijdvak)} />
              <DetailRow label="Subnummer" value={result.subnummer} mono />
              <DetailRow label="Volgnummer" value={result.volgnummer} mono />
            </div>
          </div>

          {/* ── Bedrijfsgegevens ─────────────────────────────────────────── */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Bedrijfsgegevens (KvK/Handelsregister)</h2>

            {bedrijf === 'loading' && (
              <div style={styles.statusRow}>
                <span style={styles.spinner} />
                <span style={{ color: '#64748b', fontSize: '0.9rem' }}>
                  Zoeken in het openbare handelsregister…
                </span>
              </div>
            )}

            {bedrijf === null && (
              <div>
                <div style={styles.statusRow}>
                  <span style={{ ...styles.dot, background: '#f59e0b' }} />
                  <span style={{ color: '#92400e', fontWeight: 600, fontSize: '0.85rem' }}>
                    Niet gevonden in openbaar register
                  </span>
                </div>
                <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6, marginTop: '0.5rem' }}>
                  Dit nummer is niet gevonden in het openbare handelsregister. Het betreft
                  waarschijnlijk een{' '}
                  <strong style={{ color: '#475569' }}>particulier of eenmanszaak (BSN)</strong>{' '}
                  waarvan de gegevens wegens privacywetgeving (AVG) zijn afgeschermd.
                </p>
                {!KVK_API_KEY && (
                  <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                    Tip: voeg een KvK API-sleutel toe aan <code>TaxDecoder.jsx</code> voor nauwkeurigere zoekresultaten.
                  </p>
                )}
              </div>
            )}

            {bedrijf && typeof bedrijf === 'object' && (
              <div>
                <div style={styles.statusRow}>
                  <span style={{ ...styles.dot, background: '#16a34a' }} />
                  <span style={{ color: '#166534', fontWeight: 600, fontSize: '0.85rem' }}>
                    Gevonden in handelsregister
                  </span>
                </div>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '0.5rem', color: '#1e293b' }}>
                  {bedrijf.naam}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  {bedrijf.kvkNummer && (
                    <span style={styles.badge}>KvK: {bedrijf.kvkNummer}</span>
                  )}
                  {bedrijf.type && (
                    <span style={styles.badge}>{bedrijf.type}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Privacy-disclaimer ──────────────────────────────────────────── */}
      <div style={{ ...styles.card, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '1.1rem', marginTop: '0.1rem' }}>🔒</span>
          <div>
            <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.3rem', color: '#374151' }}>
              Privacyverklaring
            </p>
            <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.6 }}>
              Alle berekeningen worden <strong>lokaal in uw browser</strong> uitgevoerd. Er worden geen
              betalingskenmerken of persoonsgegevens verzonden naar of opgeslagen op onze servers.
              Bedrijfsnamen worden uitsluitend opgevraagd uit het openbare handelsregister (KvK). BSN-nummers
              van particulieren zijn wettelijk beschermd onder de AVG en worden nooit publiekelijk weergegeven.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-componenten ───────────────────────────────────────────────────────────

function DetailRow({ label, value, mono }) {
  return (
    <div style={styles.detailRow}>
      <span style={styles.detailLabel}>{label}</span>
      <span style={{ ...styles.detailValue, fontFamily: mono ? 'monospace' : 'inherit' }}>
        {value}
      </span>
    </div>
  );
}

// ─── Stijlen ──────────────────────────────────────────────────────────────────

const styles = {
  card: {
    background: 'white',
    borderRadius: 8,
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
    marginBottom: '1.25rem',
  },
  cardTitle: {
    fontSize: '1.05rem',
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: '0.25rem',
  },
  cardSub: {
    fontSize: '0.875rem',
    color: '#64748b',
  },
  input: {
    flex: 1,
    padding: '0.65rem 0.875rem',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    fontSize: '1.1rem',
    fontFamily: 'monospace',
    letterSpacing: '0.08em',
    outline: 'none',
    color: '#1e293b',
    transition: 'border-color 0.15s',
  },
  btnPrimary: {
    padding: '0.65rem 1.25rem',
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'background 0.15s',
  },
  errorText: {
    marginTop: '0.5rem',
    fontSize: '0.875rem',
    color: '#dc2626',
    fontWeight: 500,
  },
  hint: {
    marginTop: '0.75rem',
    fontSize: '0.8rem',
    color: '#94a3b8',
  },
  hintCode: {
    fontFamily: 'monospace',
    color: '#2563eb',
    cursor: 'pointer',
    textDecoration: 'underline',
    textDecorationStyle: 'dotted',
  },
  aanslagnummerBox: {
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: 6,
    padding: '0.875rem 1rem',
    marginBottom: '1rem',
  },
  aanslagnummerLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#3b82f6',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '0.35rem',
  },
  aanslagnummerValue: {
    fontFamily: 'monospace',
    fontSize: '1.3rem',
    fontWeight: 700,
    color: '#1d4ed8',
    letterSpacing: '0.05em',
    wordBreak: 'break-all',
  },
  detailGrid: {
    display: 'grid',
    gap: '0.5rem',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 0',
    borderBottom: '1px solid #f1f5f9',
    gap: '1rem',
  },
  detailLabel: {
    fontSize: '0.85rem',
    color: '#64748b',
    fontWeight: 500,
    flexShrink: 0,
  },
  detailValue: {
    fontSize: '0.95rem',
    color: '#1e293b',
    fontWeight: 600,
    textAlign: 'right',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.5rem',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  spinner: {
    display: 'inline-block',
    width: 16,
    height: 16,
    border: '2px solid #e2e8f0',
    borderTopColor: '#2563eb',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    flexShrink: 0,
  },
  badge: {
    fontSize: '0.78rem',
    background: '#f1f5f9',
    color: '#475569',
    padding: '0.2rem 0.6rem',
    borderRadius: 4,
    fontWeight: 500,
  },
};
