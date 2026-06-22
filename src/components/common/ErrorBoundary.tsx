import { Component, ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-red-500 bg-ide-panel rounded border border-red-500/50 m-4">
          <h2 className="text-lg font-bold mb-2">Something went wrong.</h2>
          <details className="whitespace-pre-wrap text-sm font-mono bg-ide-bg p-2 rounded">
            {this.state.error && this.state.error.toString()}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}
