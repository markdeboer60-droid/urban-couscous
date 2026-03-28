import { useEffect, useRef, useState } from 'react';
import Sidebar from './components/layout/Sidebar';
import TemplateBrowser from './pages/TemplateBrowser';
import FormPage from './pages/FormPage';
import ExportPage from './pages/ExportPage';
import AdminPage from './pages/AdminPage';
import GeschiedenisPage from './pages/GeschiedenisPage';
import KlantenPage from './pages/KlantenPage';
import { ToastProvider } from './context/ToastContext';
import ErrorBoundary from './components/ui/ErrorBoundary';
import './index.css';

export default function App() {
  const [nav, setNav] = useState({ pagina: 'browser', data: null });
  const zoekRef = useRef(null);

  function navigeer(pagina, data = null) {
    setNav({ pagina, data });
  }

  // Ctrl+K: ga naar sjablonenoverzicht en focus zoekbalk
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setNav({ pagina: 'browser', data: null });
        // Wacht op render, dan focus zoekbalk
        setTimeout(() => zoekRef.current?.focus(), 50);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <ErrorBoundary>
      <ToastProvider>
      <div className="flex h-screen bg-gray-50 text-gray-800 overflow-hidden">
        <Sidebar actief={nav.pagina === 'form' || nav.pagina === 'export' ? 'browser' : nav.pagina} navigeer={navigeer} />
        <main className="flex-1 overflow-y-auto">
          {nav.pagina === 'browser' && (
            <TemplateBrowser navigeer={navigeer} zoekRef={zoekRef} />
          )}
          {nav.pagina === 'form' && (
            <FormPage
              templateId={nav.data?.templateId ?? nav.data}
              initieleWaarden={nav.data?.initieleWaarden ?? null}
              navigeer={navigeer}
            />
          )}
          {nav.pagina === 'export' && (
            <ExportPage exportData={nav.data} navigeer={navigeer} />
          )}
          {nav.pagina === 'admin' && (
            <AdminPage navigeer={navigeer} />
          )}
          {nav.pagina === 'geschiedenis' && (
            <GeschiedenisPage navigeer={navigeer} />
          )}
          {nav.pagina === 'klanten' && (
            <KlantenPage navigeer={navigeer} />
          )}
        </main>
      </div>
      </ToastProvider>
    </ErrorBoundary>
  );
}
