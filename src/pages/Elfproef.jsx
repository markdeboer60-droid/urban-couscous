import { useState } from 'react';
import NavBar from '../components/NavBar.jsx';

const GEWICHTEN = [9, 8, 7, 6, 5, 4, 3, 2];

function berekenElfproef(digits8) {
  const som = digits8.reduce((acc, d, i) => acc + d * GEWICHTEN[i], 0);
  const rest = som % 11;
  return { som, rest, geldig: rest !== 10 };
}

// ─── Interactieve rekentool ────────────────────────────────────────────────────

function ElfproefCalc() {
  const [modus, setModus] = useState('bereken'); // 'bereken' | 'valideer'
  const [invoer, setInvoer] = useState('');

  const cijfers = invoer.replace(/\D/g, '');
  const klaar8 = cijfers.length === 8;
  const klaar9 = cijfers.length === 9;

  // ── Bereken-modus: 8 invoer → 9e cijfer bepalen ──
  let resultaat = null;
  if (modus === 'bereken' && klaar8) {
    const digits8 = cijfers.split('').map(Number);
    const { som, rest, geldig } = berekenElfproef(digits8);
    resultaat = {
      digits8,
      som,
      rest,
      geldig,
      volledig: geldig ? cijfers + rest : null,
      stappen: digits8.map((d, i) => ({ d, w: GEWICHTEN[i], product: d * GEWICHTEN[i] })),
    };
  }

  // ── Valideer-modus: 9 cijfers invoeren en controleren ──
  let validatie = null;
  if (modus === 'valideer' && klaar9) {
    const digits8 = cijfers.slice(0, 8).split('').map(Number);
    const opgegeven9 = Number(cijfers[8]);
    const { som, rest, geldig } = berekenElfproef(digits8);
    const klopt = geldig && rest === opgegeven9;
    validatie = {
      digits8,
      som,
      rest,
      geldig,
      opgegeven9,
      klopt,
      stappen: digits8.map((d, i) => ({ d, w: GEWICHTEN[i], product: d * GEWICHTEN[i] })),
    };
  }

  const maxLen = modus === 'bereken' ? 8 : 9;
  const actief = modus === 'bereken' ? resultaat : validatie;

  return (
    <div style={s.card}>
      {/* Modus-tabs */}
      <div style={s.modusRow}>
        <button
          style={{ ...s.modusBtn, ...(modus === 'bereken' ? s.modusBtnActive : {}) }}
          onClick={() => { setModus('bereken'); setInvoer(''); }}
        >
          9e cijfer berekenen
        </button>
        <button
          style={{ ...s.modusBtn, ...(modus === 'valideer' ? s.modusBtnActive : {}) }}
          onClick={() => { setModus('valideer'); setInvoer(''); }}
        >
          Nummer valideren
        </button>
      </div>

      <p style={{ ...s.p, marginBottom: '0.75rem' }}>
        {modus === 'bereken'
          ? 'Voer de eerste 8 cijfers van een BSN of RSIN in om het 9e cijfer te berekenen.'
          : 'Voer alle 9 cijfers van een BSN of RSIN in om te controleren of het nummer geldig is.'}
      </p>

      {/* Invoer */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <input
          type="text"
          inputMode="numeric"
          maxLength={maxLen}
          value={invoer}
          onChange={e => setInvoer(e.target.value.replace(/\D/g, '').slice(0, maxLen))}
          placeholder={modus === 'bereken' ? '12345678' : '123456782'}
          style={s.input}
        />
        {invoer && (
          <button onClick={() => setInvoer('')} style={s.btnGhost}>Wis</button>
        )}
      </div>

      {/* Stap-voor-stap berekening */}
      {actief && (
        <div>
          <div style={s.stappenGrid}>
            <div style={s.stapHeader}>Positie</div>
            <div style={s.stapHeader}>Cijfer</div>
            <div style={s.stapHeader}>Gewicht</div>
            <div style={s.stapHeader}>Product</div>
            {actief.stappen.map((stap, i) => (
              <>
                <div key={`pos-${i}`} style={s.stapCell}>{i + 1}</div>
                <div key={`d-${i}`} style={{ ...s.stapCell, ...s.mono }}>{stap.d}</div>
                <div key={`w-${i}`} style={{ ...s.stapCell, color: '#64748b' }}>× {stap.w}</div>
                <div key={`p-${i}`} style={{ ...s.stapCell, ...s.mono, fontWeight: 700, color: '#1d4ed8' }}>= {stap.product}</div>
              </>
            ))}
          </div>

          <div style={s.somRow}>
            <span style={s.somLabel}>Som</span>
            <span style={s.somVal}>{actief.som}</span>
          </div>
          <div style={s.somRow}>
            <span style={s.somLabel}>{actief.som} ÷ 11</span>
            <span style={s.somVal}>{Math.floor(actief.som / 11)} rest <strong>{actief.rest}</strong></span>
          </div>

          {/* Resultaat */}
          {modus === 'bereken' && (
            actief.geldig ? (
              <div style={s.resultaatGoed}>
                <div style={s.resultaatLabel}>9e cijfer</div>
                <div style={s.resultaatWaarde}>{actief.rest}</div>
                <div style={s.resultaatVolledig}>Volledig nummer: <strong style={s.mono}>{actief.volledig}</strong></div>
              </div>
            ) : (
              <div style={s.resultaatFout}>
                Rest is 10 - dit is geen geldig BSN of RSIN. Er bestaat geen geldig 9e cijfer voor deze combinatie.
              </div>
            )
          )}

          {modus === 'valideer' && (
            actief.klopt ? (
              <div style={s.resultaatGoed}>
                <strong>Geldig</strong> - het 9e cijfer ({actief.opgegeven9}) klopt met de elfproef (verwacht: {actief.rest}).
              </div>
            ) : (
              <div style={s.resultaatFout}>
                {!actief.geldig
                  ? 'Ongeldig - de rest is 10, dit BSN/RSIN kan niet bestaan.'
                  : `Ongeldig - het 9e cijfer is ${actief.opgegeven9}, maar de elfproef verwacht ${actief.rest}.`}
              </div>
            )
          )}
        </div>
      )}

      {/* Voorbeelden */}
      <div style={{ marginTop: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
        <p style={{ ...s.p, marginBottom: '0.4rem', fontSize: '0.78rem', color: '#94a3b8' }}>Probeer een voorbeeld:</p>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {(modus === 'bereken'
            ? [
                { label: '03600001 (RSIN)', val: '03600001' },
                { label: '12345678', val: '12345678' },
                { label: '11111111', val: '11111111' },
              ]
            : [
                { label: '036000012 (RSIN)', val: '036000012' },
                { label: '123456782', val: '123456782' },
                { label: '111111110', val: '111111110' },
              ]
          ).map(ex => (
            <button key={ex.val} style={s.exBtn} onClick={() => setInvoer(ex.val)}>
              {ex.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Pagina ────────────────────────────────────────────────────────────────────

export default function Elfproef() {
  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <NavBar />
          <h1>Elfproef berekenen voor BSN en RSIN</h1>
          <p className="header-sub">
            Bereken het 9e controlegetal van een BSN of RSIN, of controleer of een bestaand nummer geldig is.
            De berekening is gebaseerd op dezelfde methode die de Belastingdienst gebruikt.
          </p>
        </div>
      </header>

      <main style={s.main}>

        {/* Interactieve calculator */}
        <ElfproefCalc />

        {/* Uitleg algoritme */}
        <section style={s.card}>
          <h2 style={s.h2}>Hoe werkt de elfproef?</h2>
          <p style={s.p}>
            De elfproef is een wiskundige controle die wordt gebruikt om tikfouten in nummers op te sporen.
            Zowel het BSN (Burgerservicenummer) als het RSIN (Rechtspersonen en Samenwerkingsverbanden Informatienummer)
            zijn 9-cijferige nummers waarvan het laatste cijfer via de elfproef wordt bepaald.
          </p>

          <h3 style={s.h3}>Stap voor stap</h3>
          <div style={s.stappenUitleg}>
            {[
              { nr: '1', tekst: 'Neem de eerste 8 cijfers van het BSN of RSIN.' },
              { nr: '2', tekst: 'Vermenigvuldig het eerste cijfer met 9, het tweede met 8, het derde met 7, enzovoort tot het achtste cijfer maal 2.' },
              { nr: '3', tekst: 'Tel alle acht producten bij elkaar op.' },
              { nr: '4', tekst: 'Deel de som door 11 en bepaal de rest (modulo 11).' },
              { nr: '5', tekst: 'Die rest is het 9e cijfer. Als de rest 10 is, is er geen geldig 9e cijfer en klopt het nummer niet.' },
            ].map(stap => (
              <div key={stap.nr} style={s.stapUitlegRij}>
                <span style={s.stapNr}>{stap.nr}</span>
                <span style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.55 }}>{stap.tekst}</span>
              </div>
            ))}
          </div>

          <h3 style={s.h3}>Formule</h3>
          <div style={s.formuleBox}>
            <code style={s.formule}>
              (9×d1 + 8×d2 + 7×d3 + 6×d4 + 5×d5 + 4×d6 + 3×d7 + 2×d8) mod 11 = d9
            </code>
          </div>

          <h3 style={s.h3}>Uitgewerkt voorbeeld: RSIN 036000012</h3>
          <div style={s.voorbeeldBox}>
            <div style={s.voorbeeldRij}><span style={s.mono}>0 × 9 = 0</span></div>
            <div style={s.voorbeeldRij}><span style={s.mono}>3 × 8 = 24</span></div>
            <div style={s.voorbeeldRij}><span style={s.mono}>6 × 7 = 42</span></div>
            <div style={s.voorbeeldRij}><span style={s.mono}>0 × 6 = 0</span></div>
            <div style={s.voorbeeldRij}><span style={s.mono}>0 × 5 = 0</span></div>
            <div style={s.voorbeeldRij}><span style={s.mono}>0 × 4 = 0</span></div>
            <div style={s.voorbeeldRij}><span style={s.mono}>0 × 3 = 0</span></div>
            <div style={s.voorbeeldRij}><span style={s.mono}>1 × 2 = 2</span></div>
            <div style={{ ...s.voorbeeldRij, borderTop: '1px solid #bfdbfe', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
              <span style={s.mono}><strong>Som = 68</strong></span>
            </div>
            <div style={s.voorbeeldRij}><span style={s.mono}>68 ÷ 11 = 6 rest <strong>2</strong></span></div>
            <div style={{ ...s.voorbeeldRij, color: '#15803d', fontWeight: 700 }}>
              <span style={s.mono}>9e cijfer = 2 → RSIN is <strong>036000012</strong></span>
            </div>
          </div>
        </section>

        {/* BSN vs RSIN */}
        <section style={s.card}>
          <h2 style={s.h2}>BSN versus RSIN: wat is het verschil?</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {[
              {
                titel: 'BSN',
                sub: 'Burgerservicenummer',
                kleur: '#eff6ff',
                border: '#bfdbfe',
                punten: [
                  'Persoonsnummer voor particulieren',
                  'Uitgegeven door de gemeente',
                  'Gebruikt voor IB, toeslagen, MRB',
                  'Beschermd onder de AVG',
                ],
              },
              {
                titel: 'RSIN',
                sub: 'Rechtspersonen en Samenwerkingsverbanden Informatienummer',
                kleur: '#f0fdf4',
                border: '#bbf7d0',
                punten: [
                  'Nummer voor bedrijven en organisaties',
                  'Uitgegeven door de KvK',
                  'Gebruikt voor VPB, BTW, loonheffing',
                  'Openbaar in het Handelsregister',
                ],
              },
            ].map(item => (
              <div key={item.titel} style={{ background: item.kleur, border: `1px solid ${item.border}`, borderRadius: 8, padding: '0.875rem' }}>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1e293b', marginBottom: '0.15rem' }}>{item.titel}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem' }}>{item.sub}</div>
                <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                  {item.punten.map(p => (
                    <li key={p} style={{ fontSize: '0.825rem', color: '#475569', lineHeight: 1.6 }}>{p}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p style={{ ...s.p, marginTop: '0.875rem', marginBottom: 0 }}>
            De elfproef-berekening is voor beide nummers identiek.
            In een betalingskenmerk van de Belastingdienst zitten posities 2 tot en met 9 de eerste 8 cijfers van het BSN of RSIN.
            De tool berekent automatisch het 9e cijfer via de elfproef.
          </p>
        </section>

        {/* FAQ */}
        <section style={s.card}>
          <h2 style={s.h2}>Veelgestelde vragen over de elfproef</h2>
          {[
            {
              v: 'Wat is de elfproef?',
              a: 'De elfproef is een wiskundige controle waarmee de Belastingdienst en andere instanties controleren of een BSN of RSIN geldig is. De eerste 8 cijfers worden vermenigvuldigd met de gewichten 9 tot en met 2. De som gedeeld door 11 geeft de rest, en dat restgetal is het 9e cijfer.',
            },
            {
              v: 'Hoe bereken ik het 9e cijfer van een BSN?',
              a: 'Neem de eerste 8 cijfers van het BSN. Vermenigvuldig het eerste cijfer met 9, het tweede met 8, enzovoort tot het achtste cijfer maal 2. Tel alle uitkomsten op. De rest bij deling door 11 is het 9e cijfer. Gebruik de rekentool hierboven om het direct te berekenen.',
            },
            {
              v: 'Werkt de elfproef hetzelfde voor BSN en RSIN?',
              a: 'Ja, de berekening is identiek. Beide bestaan uit 9 cijfers waarbij het 9e cijfer via dezelfde formule wordt bepaald. Het verschil zit in het gebruik: BSN is voor particulieren, RSIN is voor bedrijven en organisaties.',
            },
            {
              v: 'Wat als de elfproef uitkomt op 10?',
              a: 'Als de berekening een rest van 10 geeft, is er geen geldig 9e cijfer. Het nummer is dan ongeldig. Een correct BSN of RSIN kan nooit een elfproef-rest van 10 hebben.',
            },
            {
              v: 'Waarvoor gebruikt de Belastingdienst de elfproef?',
              a: 'De elfproef wordt gebruikt in betalingskenmerken om te controleren of het ingevoerde BSN of RSIN geldig is. Als de 8 ingevoerde cijfers geen geldige elfproef opleveren, wijst dat op een typ- of invulfout in het betalingskenmerk.',
            },
          ].map((faq, i, arr) => (
            <div key={faq.v} style={{ borderBottom: i < arr.length - 1 ? '1px solid #f1f5f9' : 'none', paddingBottom: i < arr.length - 1 ? '1rem' : 0, marginBottom: i < arr.length - 1 ? '1rem' : 0 }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.4rem', marginTop: 0 }}>{faq.v}</h3>
              <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.65, margin: 0 }}>{faq.a}</p>
            </div>
          ))}
        </section>

        {/* CTA */}
        <section style={{ ...s.card, background: '#eff6ff', border: '1px solid #bfdbfe', textAlign: 'center' }}>
          <h2 style={{ ...s.h2, color: '#1d4ed8' }}>Betalingskenmerk omzetten?</h2>
          <p style={{ ...s.p, color: '#3b82f6', marginBottom: '1.25rem' }}>
            De omzetter gebruikt de elfproef automatisch om uw 16-cijferig betalingskenmerk
            om te zetten naar aanslagnummer, belastingsoort en periode.
          </p>
          <a href="/" style={s.ctaBtn}>Betalingskenmerk omzetten</a>
        </section>

      </main>
    </div>
  );
}

// ─── Stijlen ──────────────────────────────────────────────────────────────────

const s = {
  main: { maxWidth: 700, margin: '0 auto', padding: '0 1rem 3rem' },
  card: {
    background: 'white', borderRadius: 10, padding: '1.5rem',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
    marginBottom: '1.25rem',
  },
  h2: { fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginTop: 0, marginBottom: '0.875rem' },
  h3: { fontSize: '0.95rem', fontWeight: 700, color: '#334155', marginTop: '1.25rem', marginBottom: '0.5rem' },
  p: { fontSize: '0.875rem', color: '#475569', lineHeight: 1.65, marginTop: 0, marginBottom: '0.75rem' },
  modusRow: { display: 'flex', gap: '0.35rem', marginBottom: '1rem' },
  modusBtn: {
    padding: '0.4rem 0.875rem', borderRadius: 6, border: '1px solid #e2e8f0',
    background: 'white', cursor: 'pointer', fontSize: '0.85rem', color: '#64748b', fontWeight: 500,
  },
  modusBtnActive: { background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe', fontWeight: 600 },
  input: {
    flex: 1, padding: '0.65rem 0.875rem', border: '1.5px solid #e2e8f0', borderRadius: 8,
    fontSize: '1.1rem', fontFamily: 'monospace', letterSpacing: '0.1em', outline: 'none',
    color: '#1e293b', background: '#f8fafc', boxSizing: 'border-box', width: '100%',
  },
  btnGhost: {
    padding: '0.3rem 0.65rem', background: 'transparent', border: '1px solid #e2e8f0',
    borderRadius: 6, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: '#64748b',
  },
  exBtn: {
    padding: '0.25rem 0.6rem', background: '#f8fafc', border: '1px solid #e2e8f0',
    borderRadius: 5, cursor: 'pointer', fontSize: '0.78rem', color: '#475569',
    fontFamily: 'monospace',
  },
  stappenGrid: {
    display: 'grid', gridTemplateColumns: '3rem 2.5rem 4rem 4rem',
    gap: '0.2rem 0.5rem', marginBottom: '0.5rem', marginTop: '0.75rem',
  },
  stapHeader: { fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' },
  stapCell: { fontSize: '0.875rem', color: '#334155', padding: '0.1rem 0' },
  mono: { fontFamily: 'monospace' },
  somRow: {
    display: 'flex', gap: '0.5rem', alignItems: 'baseline',
    fontSize: '0.875rem', color: '#475569', marginTop: '0.35rem',
  },
  somLabel: { color: '#94a3b8', minWidth: '8rem' },
  somVal: { fontFamily: 'monospace', fontWeight: 600, color: '#1e293b' },
  resultaatGoed: {
    marginTop: '0.875rem', background: '#f0fdf4', border: '1px solid #bbf7d0',
    borderRadius: 8, padding: '0.875rem', fontSize: '0.875rem', color: '#15803d',
  },
  resultaatLabel: { fontSize: '0.68rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' },
  resultaatWaarde: { fontSize: '2rem', fontWeight: 800, fontFamily: 'monospace', color: '#15803d', marginBottom: '0.3rem' },
  resultaatVolledig: { fontSize: '0.875rem', color: '#166534' },
  resultaatFout: {
    marginTop: '0.875rem', background: '#fef2f2', border: '1px solid #fecaca',
    borderRadius: 8, padding: '0.875rem', fontSize: '0.875rem', color: '#dc2626',
  },
  stappenUitleg: { display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' },
  stapUitlegRij: { display: 'flex', gap: '0.75rem', alignItems: 'flex-start' },
  stapNr: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 22, height: 22, borderRadius: '50%', background: '#2563eb', color: 'white',
    fontSize: '0.75rem', fontWeight: 700, flexShrink: 0, marginTop: '0.1rem',
  },
  formuleBox: {
    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
    padding: '0.875rem 1rem', marginTop: '0.5rem', overflowX: 'auto',
  },
  formule: { fontSize: '0.875rem', color: '#1d4ed8', fontFamily: 'monospace' },
  voorbeeldBox: {
    background: '#f0f6ff', border: '1px solid #bfdbfe', borderRadius: 8,
    padding: '0.875rem 1rem', marginTop: '0.5rem',
  },
  voorbeeldRij: { fontSize: '0.85rem', color: '#334155', lineHeight: 1.8 },
  ctaBtn: {
    display: 'inline-block', padding: '0.75rem 2rem', background: '#2563eb',
    color: 'white', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem',
  },
};
