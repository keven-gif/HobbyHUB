import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
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
