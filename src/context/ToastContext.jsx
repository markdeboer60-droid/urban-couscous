import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((bericht, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, bericht, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  function sluit(id) {
    setToasts(t => t.filter(x => x.id !== id));
  }

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
          {toasts.map(t => <ToastItem key={t.id} toast={t} onSluit={sluit} />)}
        </div>
      )}
    </ToastContext.Provider>
  );
}

const ICONEN = {
  success: <CheckCircle size={15} className="text-green-500 shrink-0" />,
  error:   <AlertCircle size={15} className="text-red-500 shrink-0" />,
  info:    <Info        size={15} className="text-blue-500 shrink-0" />,
};

function ToastItem({ toast, onSluit }) {
  return (
    <div className="pointer-events-auto flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-lg text-sm text-gray-800 min-w-[240px] max-w-sm">
      {ICONEN[toast.type] ?? ICONEN.info}
      <span className="flex-1">{toast.bericht}</span>
      <button
        onClick={() => onSluit(toast.id)}
        className="text-gray-400 hover:text-gray-600 shrink-0 ml-1"
      >
        <X size={13} />
      </button>
    </div>
  );
}
