import NavBar from '../components/NavBar.jsx';
import Footer from '../components/Footer.jsx';

const POSITIES = [
  { pos: '1–9',   label: 'RSIN of BSN',      kleur: '#eff6ff', tekst: '#1d4ed8', uitleg: '9-cijferig fiscaal nummer. Het 9e cijfer volgt uit de elfproef op de eerste 8 cijfers.' },
  { pos: '10',    label: 'Belastingcode',     kleur: '#f0fdf4', tekst: '#16a34a', uitleg: 'Letter die de belastingsoort aangeeft: B = BTW, L = loonheffing, H = IB, V = VPB, T = toeslagen.' },
  { pos: '11–12', label: 'Subnummer',         kleur: '#fff7ed', tekst: '#c2410c', uitleg: 'Nadere onderverdeling van de aanslag. Bij toeslagen geeft het laatste cijfer het type aan (1=KOT, 2=HT, 3=ZT).' },
  { pos: '13–14', label: 'Jaarcode',          kleur: '#fdf4ff', tekst: '#9333ea', uitleg: 'Laatste twee cijfers van het belastingjaar. Jaarcode "25" staat voor het jaar 2025.' },
  { pos: '15–16', label: 'Tijdvak',           kleur: '#fff7ed', tekst: '#c2410c', uitleg: 'Aangifteperiode. 01–12 = maanden, 13 = 13e periode, 21 = Q1, 24 = Q2, 27 = Q3, 30 = Q4, 00 = geheel jaar.' },
  { pos: '17',    label: 'Volgnummer',        kleur: '#fef2f2', tekst: '#dc2626', uitleg: '0–5 = voorlopige aanslag, 6 = definitief, 7–9 = navorderingsaanslag.' },
];

const VOORBEELDEN = [
  {
    nummer: '036000012L012524 6',
    raw: '036000012L0125246',
    label: 'Loonheffing Q2 2025 (definitief)',
    delen: [
      { val: '036000012', label: 'RSIN', kleur: '#eff6ff', tekst: '#1d4ed8' },
      { val: 'L',         label: 'LH',   kleur: '#f0fdf4', tekst: '#16a34a' },
      { val: '01',        label: 'sub',  kleur: '#fff7ed', tekst: '#c2410c' },
      { val: '25',        label: 'jaar', kleur: '#fdf4ff', tekst: '#9333ea' },
      { val: '24',        label: 'Q2',   kleur: '#fff7ed', tekst: '#c2410c' },
      { val: '6',         label: 'def.', kleur: '#fef2f2', tekst: '#dc2626' },
    ],
  },
  {
    raw: '036000012H0124006',
    label: 'Inkomstenbelasting 2024 (definitief)',
    delen: [
      { val: '036000012', label: 'RSIN', kleur: '#eff6ff', tekst: '#1d4ed8' },
      { val: 'H',         label: 'IB',   kleur: '#f0fdf4', tekst: '#16a34a' },
      { val: '01',        label: 'sub',  kleur: '#fff7ed', tekst: '#c2410c' },
      { val: '24',        label: 'jaar', kleur: '#fdf4ff', tekst: '#9333ea' },
      { val: '00',        label: 'jaar', kleur: '#fff7ed', tekst: '#c2410c' },
      { val: '6',         label: 'def.', kleur: '#fef2f2', tekst: '#dc2626' },
    ],
  },
];

export default function Aanslagnummer() {
  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <NavBar />
          <h1>Aanslagnummer uitgelegd: opbouw en betekenis per positie</h1>
          <p className="header-sub">
            Een aanslagnummer bestaat uit 17 tekens en bevat alle informatie over uw belastingaanslag.
            Hieronder leest u wat elke positie betekent en hoe u een aanslagnummer afleest.
          </p>
        </div>
      </header>

      <main style={s.main}>

        {/* Wat is een aanslagnummer */}
        <section style={s.card}>
          <h2 style={s.h2}>Wat is een aanslagnummer?</h2>
          <p style={s.p}>
            Een aanslagnummer is het officiële identificatienummer van een belastingaanslag van de Belastingdienst.
            U vindt het op het aanslagbiljet, in uw MijnBelastingdienst-account en in alle correspondentie
            over de betreffende aanslag. Het nummer maakt de aanslag uniek identificeerbaar.
          </p>
          <p style={s.p}>
            Een aanslagnummer bestaat altijd uit precies 17 tekens: 9 cijfers gevolgd door 1 letter
            en daarna nog 7 cijfers. Elk onderdeel heeft een vaste betekenis.
          </p>

          <div style={s.vergelijkBox}>
            <div style={s.vergelijkItem}>
              <div style={s.vergelijkLabel}>Aanslagnummer</div>
              <div style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700, color: '#1e293b', letterSpacing: '0.05em' }}>036000012L0125246</div>
              <div style={s.vergelijkSub}>17 tekens &bull; op aanslagbiljet</div>
            </div>
            <div style={{ fontSize: '1.25rem', color: '#94a3b8', alignSelf: 'center' }}>&#8597;</div>
            <div style={s.vergelijkItem}>
              <div style={s.vergelijkLabel}>Betalingskenmerk</div>
              <div style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700, color: '#2563eb', letterSpacing: '0.05em' }}>0036 0000 1650 2406</div>
              <div style={s.vergelijkSub}>16 cijfers &bull; bij overschrijving</div>
            </div>
          </div>
        </section>

        {/* Posities */}
        <section style={s.card}>
          <h2 style={s.h2}>Opbouw: wat betekent elke positie?</h2>
          <div style={s.positieGrid}>
            {POSITIES.map(p => (
              <div key={p.pos} style={s.positieRij}>
                <span style={{ ...s.posBadge, background: p.kleur, color: p.tekst }}>{p.pos}</span>
                <div>
                  <div style={s.posLabel}>{p.label}</div>
                  <div style={s.posDesc}>{p.uitleg}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Visuele voorbeelden */}
        <section style={s.card}>
          <h2 style={s.h2}>Voorbeelden</h2>
          {VOORBEELDEN.map(vb => (
            <div key={vb.raw} style={{ marginBottom: '1.25rem' }}>
              <div style={s.vbLabel}>{vb.label}</div>
              <div style={s.vbNummerRij}>
                {vb.delen.map((d, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <div style={{ ...s.vbSegment, background: d.kleur, color: d.tekst }}>{d.val}</div>
                    <div style={s.vbSegLabel}>{d.label}</div>
                  </div>
                ))}
              </div>
              <div style={s.vbRaw}>Volledig: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{vb.raw}</span></div>
            </div>
          ))}
        </section>

        {/* Waar vinden */}
        <section style={s.card}>
          <h2 style={s.h2}>Waar vindt u uw aanslagnummer?</h2>
          <div style={s.vindGrid}>
            {[
              { titel: 'Aanslagbiljet', tekst: 'Rechtsboven op het papieren of digitale aanslagbiljet staat het aanslagnummer vermeld, meestal met het label "Aanslagnummer" of "Kenmerk".' },
              { titel: 'MijnBelastingdienst', tekst: 'Log in op mijnbelastingdienst.nl en ga naar "Aanslagen en aangiften". Per aanslag ziet u het aanslagnummer.' },
              { titel: 'Correspondentie', tekst: 'Herinneringen, bezwaarbesluiten en andere brieven van de Belastingdienst vermelden altijd het aanslagnummer van de betrokken aanslag.' },
            ].map(item => (
              <div key={item.titel} style={s.vindItem}>
                <div style={s.vindTitel}>{item.titel}</div>
                <p style={{ ...s.p, marginBottom: 0 }}>{item.tekst}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Verschil met betalingskenmerk */}
        <section style={s.card}>
          <h2 style={s.h2}>Aanslagnummer versus betalingskenmerk</h2>
          <div style={s.tabel}>
            <div style={s.tabelHeader}>
              <span>Kenmerk</span>
              <span>Aanslagnummer</span>
              <span>Betalingskenmerk</span>
            </div>
            {[
              ['Lengte', '17 tekens', '16 cijfers'],
              ['Formaat', '9 cijfers + 1 letter + 7 cijfers', 'Alleen cijfers'],
              ['Gebruik', 'Identificatie aanslag, bezwaar, correspondentie', 'Overschrijving naar Belastingdienst'],
              ['Vindplaats', 'Aanslagbiljet, MijnBelastingdienst', 'Acceptgiro, MijnBelastingdienst'],
              ['Boekhouding', 'Vermelding in journaalpost', 'Betalingsopdracht'],
            ].map(([kenmerk, aanslagval, kenmerkval]) => (
              <div key={kenmerk} style={s.tabelRij}>
                <span style={s.tabelKol1}>{kenmerk}</span>
                <span style={s.tabelKol}>{aanslagval}</span>
                <span style={s.tabelKol}>{kenmerkval}</span>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section style={s.card}>
          <h2 style={s.h2}>Veelgestelde vragen</h2>
          {[
            { v: 'Wat is een aanslagnummer?', a: 'Een aanslagnummer is het officiële identificatienummer van een belastingaanslag van de Belastingdienst. Het bestaat uit 17 tekens: 9 cijfers voor het BSN of RSIN, 1 letter voor de belastingsoort en 7 cijfers voor subnummer, jaarcode, tijdvak en volgnummer.' },
            { v: 'Wat is het verschil tussen aanslagnummer en betalingskenmerk?', a: 'Het aanslagnummer staat op het aanslagbiljet en is bedoeld voor identificatie in correspondentie en bezwaar. Het betalingskenmerk is een 16-cijferige code die u gebruikt bij een overschrijving. Onze omzetter zet het betalingskenmerk automatisch om naar het aanslagnummer.' },
            { v: 'Waar vind ik mijn aanslagnummer?', a: 'Uw aanslagnummer staat op het aanslagbiljet dat u per post of digitaal ontvangt, in uw MijnBelastingdienst-account onder "Aanslagen en aangiften", en in alle brieven van de Belastingdienst over de betreffende aanslag.' },
            { v: 'Wat betekent de letter in het aanslagnummer?', a: 'De letter op de tiende positie geeft de belastingsoort aan. B is omzetbelasting (BTW), L is loonheffing, H is inkomstenbelasting, V is vennootschapsbelasting en T is toeslagen. Zie onze pagina over belastingcodes voor het volledige overzicht.' },
          ].map((faq, i, arr) => (
            <div key={faq.v} style={{ borderBottom: i < arr.length - 1 ? '1px solid #f1f5f9' : 'none', paddingBottom: i < arr.length - 1 ? '1rem' : 0, marginBottom: i < arr.length - 1 ? '1rem' : 0 }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.4rem', marginTop: 0 }}>{faq.v}</h3>
              <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.65, margin: 0 }}>{faq.a}</p>
            </div>
          ))}
        </section>

        {/* CTA */}
        <section style={{ ...s.card, background: '#eff6ff', border: '1px solid #bfdbfe', textAlign: 'center' }}>
          <h2 style={{ ...s.h2, color: '#1d4ed8' }}>Betalingskenmerk omzetten naar aanslagnummer?</h2>
          <p style={{ ...s.p, color: '#3b82f6', marginBottom: '1.25rem' }}>
            Gebruik de gratis omzetter: voer uw 16-cijferig betalingskenmerk in en
            zie direct het aanslagnummer, belastingsoort en periode.
          </p>
          <a href="/" style={s.ctaBtn}>Betalingskenmerk omzetten</a>
        </section>

      </main>
      <Footer />
    </div>
  );
}

const s = {
  main: { maxWidth: 700, margin: '0 auto', padding: '0 1rem 3rem' },
  card: { background: 'white', borderRadius: 10, padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)', marginBottom: '1.25rem' },
  h2: { fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginTop: 0, marginBottom: '0.875rem' },
  p: { fontSize: '0.875rem', color: '#475569', lineHeight: 1.65, marginTop: 0, marginBottom: '0.75rem' },
  vergelijkBox: { display: 'flex', gap: '1rem', alignItems: 'stretch', marginTop: '1rem', flexWrap: 'wrap' },
  vergelijkItem: { flex: 1, minWidth: 200, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.875rem 1rem' },
  vergelijkLabel: { fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' },
  vergelijkSub: { fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.35rem' },
  positieGrid: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  positieRij: { display: 'flex', gap: '0.875rem', alignItems: 'flex-start' },
  posBadge: { display: 'inline-block', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem', padding: '0.2rem 0.5rem', borderRadius: 5, whiteSpace: 'nowrap', flexShrink: 0, minWidth: '3.5rem', textAlign: 'center', marginTop: '0.1rem' },
  posLabel: { fontSize: '0.875rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.15rem' },
  posDesc: { fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 },
  vbLabel: { fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' },
  vbNummerRij: { display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginBottom: '0.4rem' },
  vbSegment: { fontFamily: 'monospace', fontWeight: 700, fontSize: '0.9rem', padding: '0.3rem 0.4rem', borderRadius: 5, letterSpacing: '0.04em' },
  vbSegLabel: { fontSize: '0.65rem', color: '#94a3b8', textAlign: 'center', marginTop: '0.15rem' },
  vbRaw: { fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.25rem' },
  vindGrid: { display: 'flex', flexDirection: 'column', gap: '0.875rem' },
  vindItem: { background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 8, padding: '0.875rem 1rem' },
  vindTitel: { fontSize: '0.875rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' },
  tabel: { border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', fontSize: '0.825rem' },
  tabelHeader: { display: 'grid', gridTemplateColumns: '1fr 1.5fr 1.5fr', gap: '0.5rem', padding: '0.625rem 0.875rem', background: '#f8fafc', fontWeight: 700, color: '#475569', borderBottom: '1px solid #e2e8f0' },
  tabelRij: { display: 'grid', gridTemplateColumns: '1fr 1.5fr 1.5fr', gap: '0.5rem', padding: '0.625rem 0.875rem', borderBottom: '1px solid #f1f5f9', color: '#475569' },
  tabelKol1: { fontWeight: 600, color: '#334155' },
  tabelKol: { color: '#64748b' },
  ctaBtn: { display: 'inline-block', padding: '0.75rem 2rem', background: '#2563eb', color: 'white', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem' },
};
