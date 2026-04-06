export default function Footer() {
  return (
    <footer className="site-footer">
      <nav className="footer-nav" aria-label="Footer navigatie">
        <div className="footer-col">
          <div className="footer-heading">Tools</div>
          <a href="/">Betalingskenmerk omzetten</a>
          <a href="/elfproef/">Elfproef berekenen</a>
        </div>
        <div className="footer-col">
          <div className="footer-heading">Uitleg</div>
          <a href="/belastingcodes/">Belastingcodes</a>
          <a href="/aanslagnummer/">Aanslagnummer uitgelegd</a>
        </div>
        <div className="footer-col">
          <div className="footer-heading">Artikelen</div>
          <a href="/navorderingsaanslag/">Navorderingsaanslag</a>
        </div>
      </nav>
      <p className="footer-tagline">
        Gratis hulpmiddel voor boekhouders, accountants en ondernemers.
        Geen data opgeslagen, geen registratie vereist.
      </p>
    </footer>
  );
}
