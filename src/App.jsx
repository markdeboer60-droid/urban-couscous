import { useState } from 'react';
import Sidebar from './components/layout/Sidebar';
import TemplateBrowser from './pages/TemplateBrowser';
import FormPage from './pages/FormPage';
import ExportPage from './pages/ExportPage';
import AdminPage from './pages/AdminPage';
import GeschiedenisPage from './pages/GeschiedenisPage';
import KlantenPage from './pages/KlantenPage';
import './index.css';

export default function App() {
  const [nav, setNav] = useState({ pagina: 'browser', data: null });

  function navigeer(pagina, data = null) {
    setNav({ pagina, data });
  }

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800 overflow-hidden">
      <Sidebar actief={nav.pagina === 'form' || nav.pagina === 'export' ? 'browser' : nav.pagina} navigeer={navigeer} />
      <main className="flex-1 overflow-y-auto">
        {nav.pagina === 'browser' && (
          <TemplateBrowser navigeer={navigeer} />
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
          <KlantenPage />
        )}
      </main>
    </div>
  );
}
