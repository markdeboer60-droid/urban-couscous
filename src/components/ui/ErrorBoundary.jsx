import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  state = { fout: null, info: null };

  static getDerivedStateFromError(fout) {
    return { fout };
  }

  componentDidCatch(fout, info) {
    console.error('[ErrorBoundary]', fout, info);
    this.setState({ info });
  }

  render() {
    if (this.state.fout) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-50 gap-4 p-8">
          <div className="p-4 bg-red-50 rounded-full">
            <AlertTriangle size={36} className="text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Er is een fout opgetreden</h1>
          <p className="text-sm text-gray-500 text-center max-w-md">
            {this.state.fout?.message || 'Een onverwachte fout heeft de applicatie laten crashen.'}
          </p>
          <button
            onClick={() => this.setState({ fout: null, info: null })}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <RefreshCw size={15} />
            Opnieuw proberen
          </button>
          {this.state.fout?.stack && (
            <details className="mt-2 max-w-xl w-full">
              <summary className="text-xs text-gray-400 cursor-pointer">Technische details</summary>
              <pre className="mt-2 text-xs bg-gray-100 rounded p-3 overflow-auto text-gray-600 whitespace-pre-wrap">
                {this.state.fout.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
