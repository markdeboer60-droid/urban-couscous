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

// Omgekeerde mapping: letter → middelcode-cijfer
const LETTER_NAAR_DIGIT = Object.fromEntries(
  Object.entries(MIDDELCODE).map(([digit, { letter }]) => [letter, Number(digit)])
);

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
 * Valideert het controlecijfer (positie 1) van een 16-cijferig betalingskenmerk.
 * Gewichten [9,8,7,6,5,4,3,2] herhaald over alle 16 posities; som mod 11 = 0.
 */
function validateControleCijfer(digits16) {
  const gewichten = [9, 8, 7, 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const som = digits16.reduce((acc, d, i) => acc + d * gewichten[i], 0);
  return som % 11 === 0;
}

/**
 * Berekent het controlecijfer voor posities 2–16 (15 cijfers).
 * Geeft null terug als geen geldig enkel cijfer berekend kan worden.
 */
function berekenControleCijfer(digits15) {
  const gewichten = [8, 7, 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const som = digits15.reduce((acc, d, i) => acc + d * gewichten[i], 0);
  const needed = (11 - (som % 11)) % 11;
  // modInverse(9, 11) = 5  →  9 × 5 = 45 ≡ 1 (mod 11)
  const d1 = (needed * 5) % 11;
  return d1 <= 9 ? d1 : null; // 10 = ongeldig combinatie
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
  const [mode, setMode] = useState('decode');            // 'decode' | 'reverse'
  const [inputVal, setInputVal] = useState('');
  const [revInputVal, setRevInputVal] = useState('');
  const [error, setError] = useState('');
  const [revError, setRevError] = useState('');
  const [result, setResult] = useState(null);
  const [revResult, setRevResult] = useState(null);
  const [bedrijf, setBedrijf] = useState(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);

  function switchMode(m) {
    setMode(m);
    setError('');
    setRevError('');
    setResult(null);
    setRevResult(null);
    setBedrijf(null);
    setCopied(false);
  }

  // ── Clipboard ────────────────────────────────────────────────────────────
  async function kopieer(tekst) {
    try {
      await navigator.clipboard.writeText(tekst);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: selecteer tekst
    }
  }

  // ── Decode: input handler ─────────────────────────────────────────────────
  function handleInput(e) {
    setInputVal(autoFormat(e.target.value));
    setError('');
    setResult(null);
    setBedrijf(null);
    setCopied(false);
  }

  // ── Decode ───────────────────────────────────────────────────────────────
  async function decodeer() {
    setError('');
    setResult(null);
    setBedrijf(null);
    setCopied(false);

    const raw = inputVal.replace(/\D/g, '');

    if (raw.length !== 16) {
      setError(`Ongeldig aantal cijfers: ${raw.length} (verwacht: 16).`);
      return;
    }

    const allDigits = raw.split('').map(Number);

    // ── Controlecijfer validatie ──
    const controleGeldig = validateControleCijfer(allDigits);

    // ── Posities (1-indexed zoals in de specificatie) ──
    const rsinDigits = allDigits.slice(1, 9);   // pos 2-9
    const middelcodeChar = raw[9];              // pos 10
    const jaarDigit = raw[10];                  // pos 11
    const subnummer = raw.slice(11, 13);        // pos 12-13
    const tijdvak = raw.slice(13, 15);          // pos 14-15
    const volgnummer = raw[15];                 // pos 16

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
    const jaarCode = '2' + jaarDigit;        // 2-cijferig (in aanslagnummer)
    const jaarVolledig = '202' + jaarDigit;  // 4-cijferig (weergave)

    // ── Aanslagnummer opbouwen ──
    const aanslagnummer =
      rsinVolledig + middelcodeInfo.letter + subnummer + jaarCode + tijdvak + volgnummer;

    setResult({
      aanslagnummer,
      rsinVolledig,
      middelcodeInfo,
      jaarVolledig,
      tijdvak,
      subnummer,
      volgnummer,
      controleGeldig,
    });

    // ── Bedrijfscheck ────────────────────────────────────────────────────
    setBedrijf('loading');
    const gevonden = await zoekBedrijfViaRSIN(rsinVolledig);
    setBedrijf(gevonden);
  }

  // ── Reverse: aanslagnummer → betalingskenmerk ─────────────────────────────
  function genereer() {
    setRevError('');
    setRevResult(null);
    setCopied(false);

    // Normaliseer: strip spaties, punten, koppeltekens; uppercase
    const raw = revInputVal.replace(/[\s.-]/g, '').toUpperCase();

    // Verwacht formaat: 9 cijfers + 1 letter + 7 cijfers = 17 tekens
    if (raw.length !== 17) {
      setRevError(`Ongeldige lengte: ${raw.length} tekens (verwacht: 17).`);
      return;
    }

    const rsinStr = raw.slice(0, 9);
    const letter = raw[9];
    const subnummer = raw.slice(10, 12);
    const jaarCode = raw.slice(12, 14);
    const tijdvak = raw.slice(14, 16);
    const volgnummer = raw[16];

    // Valideer: eerste 9 = alleen cijfers
    if (!/^\d{9}$/.test(rsinStr)) {
      setRevError('De eerste 9 tekens moeten cijfers zijn (RSIN/BSN).');
      return;
    }
    // Valideer: positie 10 = geldige letter
    if (!(letter in LETTER_NAAR_DIGIT)) {
      setRevError(`Onbekende lettercode: "${letter}". Geldig: ${Object.keys(LETTER_NAAR_DIGIT).join(', ')}.`);
      return;
    }
    // Valideer: rest = cijfers
    if (!/^\d{7}$/.test(subnummer + jaarCode + tijdvak + volgnummer)) {
      setRevError('Posities 11–17 moeten cijfers zijn.');
      return;
    }

    // Valideer elfproef van RSIN
    const rsinDigits = rsinStr.slice(0, 8).split('').map(Number);
    const verwacht9 = berekenElfproef(rsinDigits);
    if (verwacht9 === null || verwacht9 !== Number(rsinStr[8])) {
      setRevError(
        `Elfproef van RSIN mislukt: 9e cijfer "${rsinStr[8]}" klopt niet` +
        (verwacht9 !== null ? ` (verwacht: ${verwacht9})` : ' (geen geldig RSIN)') + '.'
      );
      return;
    }

    // Valideer jaarCode: moet "20"–"29" zijn
    if (!/^2\d$/.test(jaarCode)) {
      setRevError(`Ongeldig jaarcijfer "${jaarCode}" – verwacht "20"–"29".`);
      return;
    }

    // Bouw posities 2–16 op (15 cijfers)
    const middelcodeDigit = LETTER_NAAR_DIGIT[letter];
    const jaarDigit = jaarCode[1];
    const digits15 = [
      ...rsinDigits,                              // 8 cijfers
      middelcodeDigit,                            // 1 cijfer (middelcode)
      Number(jaarDigit),                          // 1 cijfer (jaar)
      ...subnummer.split('').map(Number),         // 2 cijfers
      ...tijdvak.split('').map(Number),           // 2 cijfers
      Number(volgnummer),                         // 1 cijfer
    ]; // totaal 15

    const controleCijfer = berekenControleCijfer(digits15);
    if (controleCijfer === null) {
      setRevError('Dit aanslagnummer kan niet worden omgezet naar een geldig betalingskenmerk (controlecijfer = 10).');
      return;
    }

    const kenmerkRaw = String(controleCijfer) + digits15.join('');
    const kenmerkFormatted = kenmerkRaw.replace(/(.{4})(?=.)/g, '$1 ');

    setRevResult({
      kenmerk: kenmerkRaw,
      kenmerkFormatted,
      rsinVolledig: rsinStr,
      middelcodeInfo: MIDDELCODE[middelcodeDigit],
      jaarVolledig: '20' + jaarCode,
      tijdvak,
      subnummer,
      volgnummer,
    });
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') decodeer();
  }
  function handleRevKeyDown(e) {
    if (e.key === 'Enter') genereer();
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '1rem 0 3rem' }}>

      {/* ── Modus-tabs ─────────────────────────────────────────────────── */}
      <div style={styles.tabBar}>
        <button
          style={{ ...styles.tab, ...(mode === 'decode' ? styles.tabActive : {}) }}
          onClick={() => switchMode('decode')}
        >
          Kenmerk → Aanslagnummer
        </button>
        <button
          style={{ ...styles.tab, ...(mode === 'reverse' ? styles.tabActive : {}) }}
          onClick={() => switchMode('reverse')}
        >
          Aanslagnummer → Kenmerk
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          MODUS: DECODEER
      ════════════════════════════════════════════════════════════════ */}
      {mode === 'decode' && (
        <>
          <div style={styles.card}>
            <div style={{ marginBottom: '1.25rem' }}>
              <h2 style={styles.cardTitle}>Betalingskenmerk invoeren</h2>
              <p style={styles.cardSub}>16-cijferig kenmerk van de Belastingdienst.</p>
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
              <button onClick={decodeer} style={styles.btnPrimary}>Decodeer</button>
            </div>

            {error && <p style={styles.errorText}>{error}</p>}

            <p style={styles.hint}>
              Voorbeeld:&nbsp;
              <span
                style={styles.hintCode}
                onClick={() => {
                  setInputVal('2036 0000 1630 1110');
                  setError(''); setResult(null); setBedrijf(null);
                }}
              >
                2036 0000 1630 1110
              </span>
            </p>
          </div>

          {result && (
            <>
              <div style={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 style={{ ...styles.cardTitle, marginBottom: 0 }}>Decoderingsresultaat</h2>
                  {/* Controlecijfer badge */}
                  <span style={{
                    ...styles.badge,
                    background: result.controleGeldig ? '#dcfce7' : '#fee2e2',
                    color: result.controleGeldig ? '#166534' : '#991b1b',
                    fontWeight: 600,
                  }}>
                    {result.controleGeldig ? '✓ Controlecijfer geldig' : '✗ Controlecijfer ongeldig'}
                  </span>
                </div>

                {/* Aanslagnummer highlight + kopieerknop */}
                <div style={styles.aanslagnummerBox}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={styles.aanslagnummerLabel}>Aanslagnummer</div>
                      <div style={styles.aanslagnummerValue}>{result.aanslagnummer}</div>
                    </div>
                    <button
                      onClick={() => kopieer(result.aanslagnummer)}
                      style={styles.btnCopy}
                      title="Kopieer aanslagnummer"
                    >
                      {copied ? '✓ Gekopieerd' : 'Kopieer'}
                    </button>
                  </div>
                </div>

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

              {/* Bedrijfsgegevens */}
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
                        Tip: voeg een KvK API-sleutel toe aan <code>TaxDecoder.jsx</code> voor nauwkeurigere resultaten.
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
                      {bedrijf.kvkNummer && <span style={styles.badge}>KvK: {bedrijf.kvkNummer}</span>}
                      {bedrijf.type && <span style={styles.badge}>{bedrijf.type}</span>}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════
          MODUS: OMGEKEERD (aanslagnummer → betalingskenmerk)
      ════════════════════════════════════════════════════════════════ */}
      {mode === 'reverse' && (
        <>
          <div style={styles.card}>
            <div style={{ marginBottom: '1.25rem' }}>
              <h2 style={styles.cardTitle}>Aanslagnummer invoeren</h2>
              <p style={styles.cardSub}>
                17 tekens: 9 cijfers (RSIN) + 1 letter (belastingsoort) + 7 cijfers.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                type="text"
                value={revInputVal}
                onChange={e => { setRevInputVal(e.target.value.toUpperCase()); setRevError(''); setRevResult(null); setCopied(false); }}
                onKeyDown={handleRevKeyDown}
                maxLength={17}
                placeholder="036000012L0123110"
                style={{ ...styles.input, letterSpacing: '0.06em' }}
              />
              <button onClick={genereer} style={styles.btnPrimary}>Genereer</button>
            </div>

            {revError && <p style={styles.errorText}>{revError}</p>}

            <p style={styles.hint}>
              Voorbeeld:&nbsp;
              <span
                style={styles.hintCode}
                onClick={() => { setRevInputVal('036000012L0123110'); setRevError(''); setRevResult(null); setCopied(false); }}
              >
                036000012L0123110
              </span>
            </p>
          </div>

          {revResult && (
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Betalingskenmerk</h2>

              <div style={styles.aanslagnummerBox}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={styles.aanslagnummerLabel}>Betalingskenmerk</div>
                    <div style={styles.aanslagnummerValue}>{revResult.kenmerkFormatted}</div>
                  </div>
                  <button
                    onClick={() => kopieer(revResult.kenmerkFormatted)}
                    style={styles.btnCopy}
                    title="Kopieer betalingskenmerk"
                  >
                    {copied ? '✓ Gekopieerd' : 'Kopieer'}
                  </button>
                </div>
              </div>

              <div style={styles.detailGrid}>
                <DetailRow label="Zonder spaties" value={revResult.kenmerk} mono />
                <DetailRow label="RSIN / BSN" value={revResult.rsinVolledig} mono />
                <DetailRow
                  label="Belastingsoort"
                  value={`${revResult.middelcodeInfo.letter} — ${revResult.middelcodeInfo.naam}`}
                />
                <DetailRow label="Jaar" value={revResult.jaarVolledig} />
                <DetailRow label="Tijdvak" value={formatTijdvak(revResult.tijdvak)} />
                <DetailRow label="Subnummer" value={revResult.subnummer} mono />
                <DetailRow label="Volgnummer" value={revResult.volgnummer} mono />
              </div>
            </div>
          )}
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
  tabBar: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1.25rem',
  },
  tab: {
    flex: 1,
    padding: '0.6rem 1rem',
    border: '1px solid #cbd5e1',
    background: 'white',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#475569',
    transition: 'all 0.15s',
  },
  tabActive: {
    background: '#2563eb',
    color: 'white',
    borderColor: '#2563eb',
    fontWeight: 600,
  },
  btnCopy: {
    padding: '0.35rem 0.75rem',
    background: 'white',
    border: '1px solid #bfdbfe',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#2563eb',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    transition: 'all 0.15s',
  },
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
