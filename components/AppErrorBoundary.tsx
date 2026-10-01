import React, { ReactNode, ErrorInfo } from 'react';

/** Tela de erro: segura falhas de renderização e oferece recarregar o app. */
interface AppErrorBoundaryProps { children?: ReactNode; }
interface AppErrorBoundaryState { hasError: boolean; error: Error | null; }

export default class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full bg-dark-bg flex flex-col items-center justify-center p-4 text-center overflow-auto">
          <h1 className="text-2xl font-bold text-white mb-2">Ops! Algo falhou.</h1>
          {this.state.error && (
            <div className="bg-red-900/40 border border-red-500/30 rounded-xl p-3 my-4 max-w-md text-left overflow-auto text-xs font-mono text-red-200">
              <p className="font-bold text-red-400 mb-1">{this.state.error.name}: {this.state.error.message}</p>
              <pre className="text-[10px] whitespace-pre-wrap text-red-300 opacity-80">{this.state.error.stack?.slice(0, 500)}</pre>
            </div>
          )}
          <button onClick={this.handleReload} className="px-6 py-3 rounded-2xl bg-blue-600 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/20">Recarregar App</button>
        </div>
      );
    }
    return this.props.children ?? null;
  }
}
