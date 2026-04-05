export default function NavBar() {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';
  const isHome = path === '/' || path === '/index.html';
  const isCodes = path.startsWith('/belastingcodes');

  return (
    <nav className="site-nav" aria-label="Hoofdnavigatie">
      <a href="/" className={`site-nav-link${isHome ? ' site-nav-active' : ''}`}>
        Decoder
      </a>
      <a href="/belastingcodes/" className={`site-nav-link${isCodes ? ' site-nav-active' : ''}`}>
        Belastingcodes uitgelegd
      </a>
    </nav>
  );
}
