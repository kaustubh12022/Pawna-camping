import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-stone-100 p-8 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight mb-2">Something went wrong</h1>
            <p className="text-stone-500 text-sm font-medium mb-8">
              We're sorry, an unexpected error occurred. Please try reloading the page.
            </p>
            <button
              onClick={this.handleReload}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Page
            </button>
            
            {import.meta.env.DEV && this.state.error && (
                <details className="mt-6 text-left p-4 bg-stone-100 rounded-lg overflow-x-auto text-xs text-stone-600">
                    <summary className="font-bold cursor-pointer">Error Details (Dev Only)</summary>
                    <pre className="mt-2 whitespace-pre-wrap">{this.state.error.toString()}</pre>
                    <pre className="mt-2 text-[10px] text-stone-500">{this.state.errorInfo?.componentStack}</pre>
                </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
