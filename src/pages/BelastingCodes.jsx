import NavBar from '../components/NavBar.jsx';

// Alle 14 officiële belastingcodes van de Belastingdienst
const CODES = [
  {
    letter: 'A',
    naam: 'Naheffingsaanslag loonheffing',
    kenmerk: true,
    wie: 'Werkgevers (RSIN)',
    uitleg:
      'Opgelegd als de Belastingdienst bij een controle constateert dat een werkgever over een bepaalde periode te weinig loonheffing heeft afgedragen. De naheffingsaanslag geldt voor de werkgever, niet voor de individuele werknemer.',
    tip: 'Let op: code A wijst altijd op een correctie achteraf, niet op een reguliere aangifte.',
  },
  {
    letter: 'B',
    naam: 'Omzetbelasting (btw)',
    kenmerk: true,
    wie: 'Btw-plichtige ondernemers (RSIN of BSN)',
    uitleg:
      'De reguliere btw-aangifte. Ondernemers die btw-plichtig zijn, dienen periodiek aangifte te doen: maandelijks bij hoge omzet, per kwartaal bij normale omzet, of jaarlijks bij een lage btw-schuld. Het tijdvak in het kenmerk geeft de aangifteperiode aan.',
    tip: null,
  },
  {
    letter: 'F',
    naam: 'Naheffingsaanslag omzetbelasting',
    kenmerk: true,
    wie: 'Btw-plichtige ondernemers',
    uitleg:
      'Een naheffingsaanslag btw na controle door de Belastingdienst. Wordt opgelegd als er te weinig btw is afgedragen of als een teruggave onterecht is uitbetaald. Het verschil met code B: B is een reguliere aangifte, F is altijd een correctie.',
    tip: 'Het verschil met code B: B is een reguliere aangifte, F is altijd een correctie achteraf.',
  },
  {
    letter: 'H',
    naam: 'Inkomstenbelasting en premie volksverzekeringen',
    kenmerk: true,
    wie: 'Particulieren en ZZP\'ers (BSN)',
    uitleg:
      'De jaarlijkse inkomstenbelastingaanslag. Geldt voor particulieren, ZZP\'ers en iedereen die aangifte doet over box 1 (werk en woning), box 2 (aanmerkelijk belang) of box 3 (sparen en beleggen). Het tijdvak is doorgaans 00 (geheel jaar).',
    tip: null,
  },
  {
    letter: 'J',
    naam: 'Teruggave loonheffingen / ZVW-bijdrage',
    kenmerk: false,
    wie: 'Werkgevers of werknemers',
    uitleg:
      'Een teruggave van teveel ingehouden loonheffing. Komt voor bij loonherberekening of correcties. Omdat het een teruggave betreft, is er geen betalingskenmerk: u ontvangt geld van de Belastingdienst.',
    tip: null,
  },
  {
    letter: 'L',
    naam: 'Loonheffing',
    kenmerk: true,
    wie: 'Werkgevers (RSIN)',
    uitleg:
      'De reguliere loonheffingsaangifte die werkgevers periodiek indienen: maandelijks of per 4 weken. Omvat loonbelasting, premies volksverzekeringen en de inkomensafhankelijke bijdrage ZVW voor werknemers. Het tijdvak 13 staat voor een 13e periode (4-wekelijks).',
    tip: null,
  },
  {
    letter: 'M',
    naam: 'Motorrijtuigenbelasting (MRB)',
    kenmerk: true,
    wie: 'Voertuighouders (BSN of RSIN)',
    uitleg:
      'Wegenbelasting op voertuigen zoals personenauto\'s, bestelwagens en motorfietsen. Het tijdvak is doorgaans een kwartaal of het gehele jaar. De hoogte hangt af van het gewicht, brandstofsoort en provincie.',
    tip: null,
  },
  {
    letter: 'N',
    naam: 'Inkomstenbelasting (gemoedsbezwaarden)',
    kenmerk: true,
    wie: 'Gemoedsbezwaarden (BSN)',
    uitleg:
      'Bijzondere regeling voor mensen die om principiële of religieuze redenen niet verzekerd willen zijn via de gebruikelijke sociale verzekeringen. In plaats van premies betalen zij een vervangende belasting.',
    tip: null,
  },
  {
    letter: 'O',
    naam: 'Teruggave omzetbelasting',
    kenmerk: false,
    wie: 'Btw-plichtige ondernemers',
    uitleg:
      'Een teruggave van btw. Voorkomt bijvoorbeeld bij exporteurs (0% btw-tarief) of als de aftrekbare voorbelasting de verschuldigde btw overstijgt. Omdat het een teruggave is, heeft dit geen betalingskenmerk.',
    tip: null,
  },
  {
    letter: 'T',
    naam: 'Toeslagen',
    kenmerk: true,
    wie: 'Toeslagontvangers (BSN)',
    uitleg:
      'Aanvragen of terugvorderingen van toeslagen. Het subnummer in het betalingskenmerk geeft het type aan: eindigend op 1 is kinderopvangtoeslag, op 2 is huurtoeslag en op 3 is zorgtoeslag. Terugvorderingen krijgen ook een kenmerk met code T.',
    tip: 'Subnummer eindigend op 1 = kinderopvangtoeslag, 2 = huurtoeslag, 3 = zorgtoeslag.',
  },
  {
    letter: 'V',
    naam: 'Vennootschapsbelasting (VPB)',
    kenmerk: true,
    wie: 'BV\'s, NV\'s, stichtingen met winstoogmerk (RSIN)',
    uitleg:
      'Winstbelasting voor rechtspersonen. Wordt jaarlijks opgelegd over de belastbare winst. Voorlopige aanslagen worden gedurende het jaar opgelegd; de definitieve aanslag volgt na de aangifte. Het tijdvak is doorgaans 00 (geheel jaar).',
    tip: null,
  },
  {
    letter: 'W',
    naam: 'Zorgverzekeringswet (ZVW)',
    kenmerk: true,
    wie: 'ZZP\'ers en zelfstandigen (BSN)',
    uitleg:
      'Inkomensafhankelijke bijdrage ZVW voor ondernemers zonder werkgever. Werknemers betalen dit via hun werkgever; ZZP\'ers krijgen een aparte aanslag. Vaak gecombineerd met de IB-aanslag (code H) maar soms apart aangeslagen.',
    tip: null,
  },
  {
    letter: 'Y',
    naam: 'Naheffingsaanslag motorrijtuigenbelasting',
    kenmerk: true,
    wie: 'Voertuighouders',
    uitleg:
      'Een naheffing wegenbelasting, opgelegd als de MRB niet of niet tijdig is betaald. Verschil met code M: M is de reguliere aanslag, Y is een correctie achteraf na controle of niet-betaling.',
    tip: 'Net als A (loonheffing) en F (btw): de Y-code wijst altijd op een naheffing, niet op een reguliere aanslag.',
  },
  {
    letter: 'Z',
    naam: 'Overige',
    kenmerk: true,
    wie: 'Wisselend',
    uitleg:
      'Restcategorie voor belastingsoorten die niet in een van de bovenstaande codes vallen. In de praktijk zelden voorkomend voor particulieren en reguliere ondernemers.',
    tip: null,
  },
];

const STATUS_CODES = [
  { range: '0', label: 'Voorlopige aanslag (initieel)', uitleg: 'Eerste opleg van de voorlopige aanslag.' },
  { range: '1–5', label: 'Voorlopige aanslag (bijstelling)', uitleg: 'Eerste tot en met vijfde bijstelling van de voorlopige aanslag in hetzelfde jaar.' },
  { range: '6', label: 'Definitieve aanslag', uitleg: 'De definitieve aanslag na verwerking van de aangifte.' },
  { range: '7–9', label: 'Navorderingsaanslag', uitleg: 'Eerste tot en met derde navorderingsaanslag na de definitieve aanslag.' },
];

export default function BelastingCodes() {
  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <NavBar />
          <h1>Belastingcodes uitgelegd: de letters in uw aanslagnummer</h1>
          <p className="header-sub">
            De letter op de tiende positie van het aanslagnummer vertelt welk soort belasting het betreft.
            Hieronder vindt u alle 14 officiële codes van de Belastingdienst.
          </p>
        </div>
      </header>

      <main style={s.main}>

        {/* Intro uitleg */}
        <section style={s.card}>
          <h2 style={s.h2}>Hoe werkt de lettercode in het aanslagnummer?</h2>
          <p style={s.p}>
            Een aanslagnummer bestaat uit 17 tekens: 9 cijfers (uw BSN of RSIN), 1 letter en 7 cijfers.
            Die letter staat op positie 10 en bepaalt direct welk soort belasting het is.
            In een betalingskenmerk (16 cijfers) zit op positie 10 een cijfer van 0 tot 7.
            Onze decoder vertaalt dat cijfer automatisch naar de bijbehorende letter en naam.
          </p>
          <div style={s.exampleRow}>
            <span style={s.exCode}>036000012</span>
            <span style={{ ...s.exCode, background: '#dbeafe', color: '#1d4ed8', fontWeight: 700 }}>L</span>
            <span style={s.exCode}>0123110</span>
            <span style={s.exLabel}>RSIN + letter (loonheffing) + subnummer + jaar + tijdvak + volgnummer</span>
          </div>
        </section>

        {/* Codes overzicht */}
        <section style={s.card}>
          <h2 style={s.h2}>Alle 14 belastingcodes</h2>
          <div style={s.codeGrid}>
            {CODES.map(code => (
              <article key={code.letter} style={s.codeCard}>
                <div style={s.codeCardHeader}>
                  <span style={s.letterBadge}>{code.letter}</span>
                  <div>
                    <div style={s.codeName}>{code.naam}</div>
                    <div style={s.codeWie}>{code.wie}</div>
                  </div>
                  <span style={{ ...s.kenmerkBadge, background: code.kenmerk ? '#dcfce7' : '#fef2f2', color: code.kenmerk ? '#16a34a' : '#dc2626' }}>
                    {code.kenmerk ? 'Betalingskenmerk' : 'Geen kenmerk'}
                  </span>
                </div>
                <p style={s.codeUitleg}>{code.uitleg}</p>
                {code.tip && (
                  <div style={s.codeTip}>{code.tip}</div>
                )}
              </article>
            ))}
          </div>
        </section>

        {/* Statuscodes */}
        <section style={s.card}>
          <h2 style={s.h2}>Statuscode: het laatste cijfer van het aanslagnummer</h2>
          <p style={s.p}>
            Het laatste cijfer (positie 17 van het aanslagnummer, positie 16 van het betalingskenmerk)
            geeft de status van de aanslag aan.
          </p>
          <div style={s.statusGrid}>
            {STATUS_CODES.map(sc => (
              <div key={sc.range} style={s.statusRow}>
                <span style={s.statusNum}>{sc.range}</span>
                <div>
                  <div style={s.statusLabel}>{sc.label}</div>
                  <div style={s.statusDesc}>{sc.uitleg}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Tijdvakcodes */}
        <section style={s.card}>
          <h2 style={s.h2}>Tijdvakcodes: de aangifteperiode</h2>
          <p style={s.p}>
            Positie 14 en 15 van het betalingskenmerk geven de periode aan waarop de aanslag betrekking heeft.
          </p>
          <div style={s.statusGrid}>
            {[
              { code: '00', label: 'Geheel jaar', desc: 'Jaaraangifte, bijv. IB of VPB.' },
              { code: '01–12', label: 'Maand 1 tot en met 12', desc: 'Maandelijkse aangifte, bijv. loonheffing of btw.' },
              { code: '13', label: '13e periode (4-wekelijks)', desc: 'Voor loonheffing bij 4-wekelijkse loonaangifte.' },
              { code: '21', label: 'Kwartaal 1 (jan–mrt)', desc: 'Eindmaand 3 + 18 = 21.' },
              { code: '24', label: 'Kwartaal 2 (apr–jun)', desc: 'Eindmaand 6 + 18 = 24.' },
              { code: '27', label: 'Kwartaal 3 (jul–sep)', desc: 'Eindmaand 9 + 18 = 27.' },
              { code: '30', label: 'Kwartaal 4 (okt–dec)', desc: 'Eindmaand 12 + 18 = 30.' },
            ].map(tv => (
              <div key={tv.code} style={s.statusRow}>
                <span style={s.statusNum}>{tv.code}</span>
                <div>
                  <div style={s.statusLabel}>{tv.label}</div>
                  <div style={s.statusDesc}>{tv.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section style={s.card}>
          <h2 style={s.h2}>Veelgestelde vragen over belastingcodes</h2>
          {[
            {
              v: 'Wat betekent de letter in het aanslagnummer van de Belastingdienst?',
              a: 'De letter staat op de tiende positie van het aanslagnummer en geeft aan om welk soort belasting het gaat. B is omzetbelasting (btw), L is loonheffing, H is inkomstenbelasting, V is vennootschapsbelasting en T is toeslagen. Naheffingsaanslagen krijgen een andere letter dan reguliere aangiften.',
            },
            {
              v: 'Wat is het verschil tussen belastingcode B en F?',
              a: 'B staat voor een reguliere btw-aangifte die u zelf indient. F staat voor een naheffingsaanslag omzetbelasting: dat is een aanslag die de Belastingdienst achteraf oplegt na een controle. Bij code F heeft de Belastingdienst geconstateerd dat er te weinig btw is afgedragen.',
            },
            {
              v: 'Wat is het verschil tussen belastingcode L en A?',
              a: 'L staat voor een reguliere loonheffingsaangifte die u als werkgever zelf indient. A staat voor een naheffingsaanslag loonheffing die de Belastingdienst achteraf oplegt na een controle. Het patroon is hetzelfde als bij B en F voor btw.',
            },
            {
              v: 'Welke codes hebben geen betalingskenmerk?',
              a: 'De codes J (teruggave loonheffingen) en O (teruggave omzetbelasting) hebben geen betalingskenmerk omdat u bij deze codes geld terugontvangt van de Belastingdienst. U hoeft dan niets te betalen en er is dus geen kenmerk nodig.',
            },
            {
              v: 'Wat betekent T in een aanslagnummer?',
              a: 'T staat voor toeslagen. In het betalingskenmerk geeft het subnummer (posities 12 en 13) aan om welk type toeslag het gaat: eindigend op 1 is kinderopvangtoeslag, op 2 is huurtoeslag en op 3 is zorgtoeslag. Zowel toekenningen als terugvorderingen kunnen een T-kenmerk hebben.',
            },
          ].map((faq, i, arr) => (
            <div key={faq.v} style={{ borderBottom: i < arr.length - 1 ? '1px solid #f1f5f9' : 'none', paddingBottom: i < arr.length - 1 ? '1rem' : 0, marginBottom: i < arr.length - 1 ? '1rem' : 0 }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.4rem', marginTop: 0 }}>{faq.v}</h3>
              <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.65, margin: 0 }}>{faq.a}</p>
            </div>
          ))}
        </section>

        {/* CTA naar decoder */}
        <section style={{ ...s.card, background: '#eff6ff', border: '1px solid #bfdbfe', textAlign: 'center' }}>
          <h2 style={{ ...s.h2, color: '#1d4ed8' }}>Betalingskenmerk direct omzetten?</h2>
          <p style={{ ...s.p, color: '#3b82f6', marginBottom: '1.25rem' }}>
            Gebruik de gratis decoder om een 16-cijferig kenmerk te vertalen naar het aanslagnummer
            inclusief belastingsoort, periode en boekhoudomschrijving.
          </p>
          <a href="/" style={s.ctaBtn}>Naar de decoder</a>
        </section>

      </main>
    </div>
  );
}

// Stijlen (inline, zodat de pagina zelfstandig werkt zonder extra CSS-klassen)
const s = {
  main: {
    maxWidth: 700,
    margin: '0 auto',
    padding: '0 1rem 3rem',
  },
  card: {
    background: 'white',
    borderRadius: 10,
    padding: '1.5rem',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
    marginBottom: '1.25rem',
  },
  h2: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#1e293b',
    marginTop: 0,
    marginBottom: '0.875rem',
  },
  p: {
    fontSize: '0.875rem',
    color: '#475569',
    lineHeight: 1.65,
    marginTop: 0,
    marginBottom: '0.75rem',
  },
  exampleRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '0.4rem',
    marginTop: '0.75rem',
  },
  exCode: {
    fontFamily: 'monospace',
    fontSize: '1rem',
    fontWeight: 600,
    background: '#f1f5f9',
    color: '#334155',
    padding: '0.3rem 0.5rem',
    borderRadius: 5,
  },
  exLabel: {
    fontSize: '0.78rem',
    color: '#94a3b8',
    width: '100%',
    marginTop: '0.25rem',
  },
  codeGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.875rem',
  },
  codeCard: {
    border: '1px solid #f1f5f9',
    borderRadius: 8,
    padding: '0.875rem 1rem',
  },
  codeCardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    marginBottom: '0.5rem',
    flexWrap: 'wrap',
  },
  letterBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 8,
    background: '#eff6ff',
    color: '#1d4ed8',
    fontWeight: 800,
    fontSize: '1.1rem',
    fontFamily: 'monospace',
    flexShrink: 0,
  },
  codeName: {
    fontWeight: 700,
    fontSize: '0.9rem',
    color: '#1e293b',
    marginBottom: '0.1rem',
  },
  codeWie: {
    fontSize: '0.75rem',
    color: '#94a3b8',
  },
  kenmerkBadge: {
    marginLeft: 'auto',
    fontSize: '0.72rem',
    fontWeight: 600,
    padding: '0.2rem 0.5rem',
    borderRadius: 4,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  codeUitleg: {
    fontSize: '0.85rem',
    color: '#475569',
    lineHeight: 1.6,
    margin: 0,
  },
  codeTip: {
    marginTop: '0.5rem',
    fontSize: '0.78rem',
    color: '#92400e',
    background: '#fef9ec',
    border: '1px solid #fde68a',
    borderRadius: 5,
    padding: '0.35rem 0.6rem',
  },
  statusGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginTop: '0.5rem',
  },
  statusRow: {
    display: 'flex',
    gap: '0.875rem',
    alignItems: 'flex-start',
  },
  statusNum: {
    fontFamily: 'monospace',
    fontWeight: 700,
    color: '#2563eb',
    background: '#eff6ff',
    padding: '0.15rem 0.5rem',
    borderRadius: 4,
    fontSize: '0.85rem',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    minWidth: '3rem',
    textAlign: 'center',
  },
  statusLabel: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#1e293b',
    marginBottom: '0.1rem',
  },
  statusDesc: {
    fontSize: '0.8rem',
    color: '#64748b',
  },
  ctaBtn: {
    display: 'inline-block',
    padding: '0.75rem 2rem',
    background: '#2563eb',
    color: 'white',
    borderRadius: 8,
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '0.95rem',
  },
};
