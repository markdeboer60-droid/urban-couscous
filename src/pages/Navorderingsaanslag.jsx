import NavBar from '../components/NavBar.jsx';
import Footer from '../components/Footer.jsx';

export default function Navorderingsaanslag() {
  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <NavBar />
          <h1>Navorderingsaanslag ontvangen: wat betekent het en wat kunt u doen?</h1>
          <p className="header-sub">
            Een navorderingsaanslag is een extra aanslag die de Belastingdienst oplegt nadat de definitieve
            aanslag al is vastgesteld. In het betalingskenmerk herkent u hem aan het cijfer 7, 8 of 9
            op de zestiende positie.
          </p>
        </div>
      </header>

      <main style={s.main}>

        {/* Herkennen in kenmerk */}
        <section style={s.card}>
          <h2 style={s.h2}>Hoe herkent u een navorderingsaanslag in het betalingskenmerk?</h2>
          <p style={s.p}>
            Het betalingskenmerk bevat op de zestiende en laatste positie het volgnummer.
            Dit cijfer vertelt u direct wat voor soort aanslag het is:
          </p>
          <div style={s.volgnummerGrid}>
            {[
              { cijfers: '0–5', label: 'Voorlopige aanslag', kleur: '#eff6ff', tekst: '#1d4ed8', desc: 'Initieel (0) of bijstelling (1–5) van de voorlopige aanslag.' },
              { cijfers: '6',   label: 'Definitieve aanslag', kleur: '#f0fdf4', tekst: '#16a34a', desc: 'De definitieve aanslag na verwerking van uw aangifte.' },
              { cijfers: '7',   label: '1e navorderingsaanslag', kleur: '#fef2f2', tekst: '#dc2626', desc: 'Eerste correctie na de definitieve aanslag.' },
              { cijfers: '8',   label: '2e navorderingsaanslag', kleur: '#fef2f2', tekst: '#dc2626', desc: 'Tweede correctie, opgelegd als de eerste navordering niet volledig was.' },
              { cijfers: '9',   label: '3e navorderingsaanslag', kleur: '#fef2f2', tekst: '#dc2626', desc: 'Derde en laatste correctie.' },
            ].map(rij => (
              <div key={rij.cijfers} style={s.volgnummerRij}>
                <span style={{ ...s.vnBadge, background: rij.kleur, color: rij.tekst }}>{rij.cijfers}</span>
                <div>
                  <div style={s.vnLabel}>{rij.label}</div>
                  <div style={s.vnDesc}>{rij.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={s.tip}>
            Gebruik de <a href="/" style={s.link}>betalingskenmerk omzetter</a> om direct te zien
            of uw kenmerk een navorderingsaanslag is.
          </div>
        </section>

        {/* Wat is het */}
        <section style={s.card}>
          <h2 style={s.h2}>Wat is een navorderingsaanslag?</h2>
          <p style={s.p}>
            Nadat de Belastingdienst een definitieve aanslag heeft opgelegd, is die aanslag in principe
            onherroepelijk. Toch kan de Belastingdienst later een aanvullende aanslag opleggen als
            blijkt dat er te weinig belasting is geheven. Die aanvullende aanslag heet een navorderingsaanslag.
          </p>
          <p style={s.p}>
            Een navorderingsaanslag kan worden opgelegd voor alle soorten belasting:
            inkomstenbelasting, vennootschapsbelasting, BTW en loonheffing.
            Bij loonheffing en BTW wordt dit doorgaans een naheffingsaanslag genoemd
            (belastingcodes A en F), maar het principe is hetzelfde.
          </p>
        </section>

        {/* Wanneer mag */}
        <section style={s.card}>
          <h2 style={s.h2}>Wanneer mag de Belastingdienst navorderen?</h2>
          <p style={s.p}>
            Navordering is niet zomaar toegestaan. De wet stelt twee hoofdvereisten:
          </p>

          <h3 style={s.h3}>1. Een nieuw feit</h3>
          <p style={s.p}>
            De Belastingdienst moet beschikken over een nieuw feit: informatie die bij het opleggen
            van de definitieve aanslag niet bekend was en redelijkerwijs ook niet bekend had kunnen zijn.
            Voorbeelden: gegevens uit een boekenonderzoek, informatie van buitenlandse belastingdiensten
            of signalen uit bankgegevens.
          </p>
          <p style={s.p}>
            Als de Belastingdienst de informatie had kunnen weten maar heeft nagelaten te controleren,
            is er geen nieuw feit en mag er in beginsel niet worden nagevorderd.
          </p>

          <h3 style={s.h3}>2. Kwade trouw of een fout in de aangifte</h3>
          <p style={s.p}>
            Was u te kwader trouw, of heeft u een onjuiste aangifte ingediend waardoor de Belastingdienst
            te weinig belasting heeft geheven? Dan vervalt de eis van een nieuw feit en kan de
            Belastingdienst alsnog navorderen.
          </p>

          <h3 style={s.h3}>Navorderingstermijnen</h3>
          <div style={s.termijnenGrid}>
            {[
              { titel: '5 jaar', sub: 'Standaard termijn', desc: 'De Belastingdienst heeft 5 jaar na het belastingjaar de tijd om een navorderingsaanslag op te leggen. Na die termijn vervalt het recht op navordering.' },
              { titel: '12 jaar', sub: 'Buitenlands inkomen of vermogen', desc: 'Bij inkomsten of vermogen in het buitenland geldt een verlengde navorderingstermijn van 12 jaar. Dit geldt ook als de Belastingdienst vermoedt dat u buitenlands vermogen heeft verzwegen.' },
              { titel: 'Onbeperkt', sub: 'Bij strafrechtelijke veroordeling', desc: 'Is er een onherroepelijke strafrechtelijke veroordeling wegens belastingfraude? Dan geldt geen navorderingstermijn.' },
            ].map(t => (
              <div key={t.titel} style={s.termijnItem}>
                <div style={s.termijnTitel}>{t.titel}</div>
                <div style={s.termijnSub}>{t.sub}</div>
                <p style={{ ...s.p, marginBottom: 0, marginTop: '0.35rem' }}>{t.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Wat te doen */}
        <section style={s.card}>
          <h2 style={s.h2}>Wat kunt u doen bij een navorderingsaanslag?</h2>

          <h3 style={s.h3}>Optie 1: Betalen</h3>
          <p style={s.p}>
            Als u het eens bent met de navorderingsaanslag, betaalt u het openstaande bedrag
            binnen de betalingstermijn, doorgaans zes weken na dagtekening.
            Gebruik het betalingskenmerk op de aanslag. Betaalt u niet op tijd, dan loopt u
            risico op een betalingsverzuimboete en invorderingsrente.
          </p>

          <h3 style={s.h3}>Optie 2: Bezwaar maken</h3>
          <p style={s.p}>
            Bent u het niet eens met de navorderingsaanslag? Dan kunt u bezwaar maken.
            U heeft daarvoor zes weken de tijd, te rekenen vanaf de dagtekening van de aanslag.
            Dient u het bezwaar in via MijnBelastingdienst of per aangetekende post?
            Dan is de datum van ontvangst bepalend.
          </p>
          <p style={s.p}>
            In uw bezwaarschrift onderbouwt u waarom de navorderingsaanslag onjuist is.
            Veelvoorkomende gronden:
          </p>
          <ul style={s.lijst}>
            <li>Er was geen nieuw feit aanwezig.</li>
            <li>De termijn van 5 (of 12) jaar is verstreken.</li>
            <li>Het bedrag van de navorderingsaanslag klopt niet.</li>
            <li>Er is geen sprake van kwade trouw of een fout in de aangifte.</li>
          </ul>

          <h3 style={s.h3}>Optie 3: Uitstel van betaling aanvragen</h3>
          <p style={s.p}>
            Als u bezwaar maakt, kunt u tegelijk uitstel van betaling aanvragen voor het betwiste bedrag.
            De Belastingdienst verleent dit doorgaans automatisch voor het gedeelte dat u in bezwaar betwist.
            Over het resterende, niet-betwiste deel loopt de betalingstermijn wel gewoon door.
          </p>
        </section>

        {/* Boete */}
        <section style={s.card}>
          <h2 style={s.h2}>Vergrijpboete bij een navorderingsaanslag</h2>
          <p style={s.p}>
            Naast de navorderingsaanslag zelf kan de Belastingdienst ook een vergrijpboete opleggen
            als er sprake is van grove nalatigheid of opzet.
          </p>
          <div style={s.boeteGrid}>
            {[
              { pct: '25%', label: 'Grove nalatigheid', desc: 'U had beter op moeten letten, maar heeft niet opzettelijk onjuiste aangifte gedaan.' },
              { pct: '50%', label: 'Voorwaardelijk opzet', desc: 'U heeft een risico genomen waarvan u wist of had moeten weten dat het tot een onjuiste aangifte zou leiden.' },
              { pct: '100%', label: 'Opzet', desc: 'U heeft bewust een onjuiste aangifte gedaan met het doel minder belasting te betalen.' },
            ].map(b => (
              <div key={b.pct} style={s.boeteItem}>
                <div style={s.boetePct}>{b.pct}</div>
                <div style={s.boeteLabel}>{b.label}</div>
                <p style={{ ...s.p, marginBottom: 0, marginTop: '0.25rem' }}>{b.desc}</p>
              </div>
            ))}
          </div>
          <p style={{ ...s.p, marginTop: '0.875rem', marginBottom: 0 }}>
            Ook tegen een vergrijpboete kunt u bezwaar maken. Vermindert de Belastingdienst de
            navorderingsaanslag? Dan wordt de boete doorgaans evenredig verminderd.
          </p>
        </section>

        {/* FAQ */}
        <section style={s.card}>
          <h2 style={s.h2}>Veelgestelde vragen</h2>
          {[
            { v: 'Wat is een navorderingsaanslag?', a: 'Een navorderingsaanslag is een aanvullende aanslag die de Belastingdienst oplegt nadat de definitieve aanslag al is vastgesteld. Dit gebeurt als de Belastingdienst later constateert dat er te weinig belasting is geheven, bijvoorbeeld door een nieuw feit of door opzet.' },
            { v: 'Hoe lang heeft de Belastingdienst de tijd om na te vorderen?', a: 'De standaard navorderingstermijn is 5 jaar na het belastingjaar. Bij inkomsten of vermogen in het buitenland geldt een verlengde termijn van 12 jaar. Bij een strafrechtelijke veroordeling wegens belastingfraude geldt geen termijn.' },
            { v: 'Kan ik bezwaar maken tegen een navorderingsaanslag?', a: 'Ja, u kunt bezwaar maken. U heeft daarvoor zes weken de tijd, te rekenen vanaf de dagtekening van de aanslag. U kunt tegelijk uitstel van betaling aanvragen voor het betwiste bedrag.' },
            { v: 'Is een navorderingsaanslag hetzelfde als een naheffingsaanslag?', a: 'Nee. Een navorderingsaanslag volgt op een definitieve aanslag inkomstenbelasting of vennootschapsbelasting. Een naheffingsaanslag (belastingcodes A en F) wordt opgelegd bij loonheffing of BTW als er te weinig is afgedragen via aangifte.' },
            { v: 'Hoe herken ik een navorderingsaanslag in het betalingskenmerk?', a: 'In het betalingskenmerk staat het volgnummer op de zestiende positie. Cijfer 7 betekent de eerste navorderingsaanslag, 8 de tweede en 9 de derde. Gebruik onze omzetter om dit direct te controleren.' },
            { v: 'Wat als ik het er niet mee eens ben?', a: 'Maak binnen zes weken bezwaar bij de Belastingdienst. Onderbouw waarom de navordering onterecht is, bijvoorbeeld omdat er geen nieuw feit was of de termijn is verstreken. Schakel zo nodig een belastingadviseur of accountant in.' },
          ].map((faq, i, arr) => (
            <div key={faq.v} style={{ borderBottom: i < arr.length - 1 ? '1px solid #f1f5f9' : 'none', paddingBottom: i < arr.length - 1 ? '1rem' : 0, marginBottom: i < arr.length - 1 ? '1rem' : 0 }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.4rem', marginTop: 0 }}>{faq.v}</h3>
              <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.65, margin: 0 }}>{faq.a}</p>
            </div>
          ))}
        </section>

        {/* CTA */}
        <section style={{ ...s.card, background: '#eff6ff', border: '1px solid #bfdbfe', textAlign: 'center' }}>
          <h2 style={{ ...s.h2, color: '#1d4ed8' }}>Uw betalingskenmerk controleren?</h2>
          <p style={{ ...s.p, color: '#3b82f6', marginBottom: '1.25rem' }}>
            Zet uw 16-cijferig betalingskenmerk om naar het aanslagnummer en zie direct
            of het een voorlopige, definitieve of navorderingsaanslag betreft.
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
  h3: { fontSize: '0.95rem', fontWeight: 700, color: '#334155', marginTop: '1.25rem', marginBottom: '0.5rem' },
  p: { fontSize: '0.875rem', color: '#475569', lineHeight: 1.65, marginTop: 0, marginBottom: '0.75rem' },
  lijst: { paddingLeft: '1.25rem', margin: '0.25rem 0 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' },
  link: { color: '#2563eb', textDecoration: 'underline', textDecorationStyle: 'dotted' },
  tip: { marginTop: '0.875rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '0.6rem 0.875rem', fontSize: '0.825rem', color: '#1d4ed8' },
  volgnummerGrid: { display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.875rem' },
  volgnummerRij: { display: 'flex', gap: '0.875rem', alignItems: 'flex-start' },
  vnBadge: { fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem', padding: '0.2rem 0.6rem', borderRadius: 5, whiteSpace: 'nowrap', flexShrink: 0, minWidth: '2.75rem', textAlign: 'center', marginTop: '0.1rem' },
  vnLabel: { fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.1rem' },
  vnDesc: { fontSize: '0.8rem', color: '#64748b' },
  termijnenGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.875rem', marginTop: '0.5rem' },
  termijnItem: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.875rem' },
  termijnTitel: { fontSize: '1.2rem', fontWeight: 800, color: '#1e293b' },
  termijnSub: { fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginTop: '0.1rem' },
  boeteGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.875rem', marginTop: '0.5rem' },
  boeteItem: { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.875rem' },
  boetePct: { fontSize: '1.4rem', fontWeight: 800, color: '#dc2626' },
  boeteLabel: { fontSize: '0.78rem', fontWeight: 600, color: '#991b1b', marginTop: '0.1rem' },
  ctaBtn: { display: 'inline-block', padding: '0.75rem 2rem', background: '#2563eb', color: 'white', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem' },
};
