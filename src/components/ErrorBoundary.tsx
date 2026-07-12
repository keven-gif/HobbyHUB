import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message?: string;
  stack?: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown) {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    };
  }

  componentDidCatch(error: unknown) {
    console.error('[ErrorBoundary]', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center"
          style={{ backgroundColor: '#0f1115', color: '#fff' }}
        >
          <p className="font-body text-sm" style={{ color: '#aaa' }}>
            Something went wrong loading this page.
          </p>
          {this.state.message && (
            <pre
              className="font-body text-[11px] max-w-full max-h-48 overflow-auto whitespace-pre-wrap text-left rounded-lg p-3"
              style={{ backgroundColor: '#1a1a1a', color: '#d93a3a', border: '1px solid #333' }}
            >
              {this.state.message}
              {this.state.stack ? `\n\n${this.state.stack}` : ''}
            </pre>
          )}
          <button
            onClick={() => window.location.reload()}
            className="font-body text-sm px-4 py-2 rounded-lg"
            style={{ backgroundColor: '#d93a3a', color: '#fff' }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
