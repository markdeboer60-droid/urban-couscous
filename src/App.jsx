import { useEffect, useState } from 'react';
import { getEntries, saveEntry } from './api';
import InputForm from './components/InputForm';
import Charts from './components/Charts';
import OverviewTable from './components/OverviewTable';
import { calcTotaal, formatEur } from './utils';
import './App.css';

export default function App() {
  const [entries, setEntries] = useState([]);
  const [view, setView] = useState('dashboard');

  useEffect(() => {
    getEntries().then(setEntries);
  }, []);

  async function handleSave(entry) {
    await saveEntry(entry);
    const updated = await getEntries();
    setEntries(updated);
  }

  const latest = entries[entries.length - 1];

  return (
    <div className="app">
      <header className="app-header">
        <h1>Financieel Dashboard</h1>
        <nav>
          <button
            className={view === 'dashboard' ? 'active' : ''}
            onClick={() => setView('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={view === 'invoer' ? 'active' : ''}
            onClick={() => setView('invoer')}
          >
            Invoer
          </button>
        </nav>
      </header>

      {view === 'dashboard' && (
        <main className="dashboard">
          {latest && (
            <div className="summary-cards">
              <SummaryCard
                label="Spaargeld"
                value={(latest.spaarrekeningen || 0) + (latest.traderspublic || 0)}
                color="#16a34a"
              />
              <SummaryCard
                label="Beleggingen"
                value={(latest.meesman || 0) + (latest.degiro || 0)}
                color="#d97706"
              />
              <SummaryCard
                label="Eigen woningwaarde"
                value={(latest.woning || 0) - (latest.hypotheek || 0)}
                color="#7c3aed"
              />
              <SummaryCard
                label="Totaal vermogen"
                value={calcTotaal(latest)}
                color="#2563eb"
                large
              />
            </div>
          )}
          <Charts entries={entries} />
          <OverviewTable entries={entries} />
          {entries.length === 0 && (
            <div className="empty-state">
              <p>Nog geen data. Ga naar <strong>Invoer</strong> om je eerste maand in te vullen.</p>
            </div>
          )}
        </main>
      )}

      {view === 'invoer' && (
        <main className="invoer">
          <InputForm entries={entries} onSave={handleSave} />
        </main>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color, large }) {
  return (
    <div className={`summary-card ${large ? 'large' : ''}`} style={{ borderTopColor: color }}>
      <div className="card-label">{label}</div>
      <div className="card-value" style={{ color }}>{formatEur(value)}</div>
    </div>
  );
}
