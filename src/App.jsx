import TaxDecoder from './components/TaxDecoder';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import './App.css';

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <NavBar />
          <h1>Betalingskenmerk omzetten naar aanslagnummer</h1>
          <p className="header-sub">
            Voer uw 16-cijferig betalingskenmerk in en zie direct welke belasting, periode en aanslag het betreft.
            Gratis, geen registratie, geen data opgeslagen.
          </p>
        </div>
      </header>
      <main>
        <TaxDecoder />
      </main>
      <Footer />
    </div>
  );
}
