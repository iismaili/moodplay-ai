import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  message: string | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { message: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { message: error.message || 'Beklenmeyen bir hata oluştu.' };
  }

  render() {
    if (!this.state.message) return this.props.children;
    return (
      <main className="grid min-h-dvh place-items-center bg-slate-950 px-6 text-white">
        <section className="max-w-lg rounded-3xl border border-white/10 p-8" role="alert">
          <h1 className="text-3xl font-semibold">Uygulama toparlanamadı</h1>
          <p className="mt-3 text-lg text-slate-200">{this.state.message}</p>
          <button
            className="mt-6 min-h-12 rounded-full bg-white px-5 font-semibold text-slate-950"
            onClick={() => window.location.reload()}
            type="button"
          >
            Sayfayı yenile
          </button>
        </section>
      </main>
    );
  }
}
