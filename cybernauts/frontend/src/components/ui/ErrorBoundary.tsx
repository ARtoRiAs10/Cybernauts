import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen items-center justify-center bg-[#0b0e14] text-red-400">
          <div className="text-center space-y-3">
            <p className="text-5xl">⚠</p>
            <p className="font-mono text-lg">Something crashed.</p>
            <p className="text-sm text-zinc-500 font-mono">{this.state.error.message}</p>
            <button
              className="mt-4 px-4 py-2 bg-red-900/30 border border-red-700 rounded text-sm hover:bg-red-800/30 transition-colors"
              onClick={() => this.setState({ error: null })}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
