import { isStaleBuildError, reloadForNewBuild } from '@/utils/staleBuild';
import Button from '@/components/ui/Button';
import { Component, type ReactNode, type ErrorInfo } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    // A file from the previous build (after a deploy): load the new build instead.
    if (isStaleBuildError(error)) reloadForNewBuild();
  }

  public componentDidMount() {
    window.addEventListener('keydown', this.handleKeyDown);
  }

  public componentWillUnmount() {
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if (
      this.state.hasError &&
      (event.key === 'Enter' || event.keyCode === 13)
    ) {
      this.handleReload();
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-panel p-6 font-sans text-fg-soft">
          <div className="w-full max-w-md rounded-lg border border-line-strong bg-panel-raised p-8 text-center shadow-xl">
            <AlertTriangle className="mx-auto mb-6 h-16 w-16 text-red-500" />
            <h1 className="mb-4 text-2xl font-bold text-white">
              Something went wrong
            </h1>
            <p className="mb-8 text-fg-muted">
              We're sorry, but an unexpected error occurred. Please try
              reloading the application.
            </p>
             <Button variant="accent"
               onClick={this.handleReload}
               className="w-full"
            >
              <RefreshCw className="mr-4 h-5 w-5" />
              Reload Application
             </Button>
            {this.state.error && (
              <div className="mt-8 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-sm border border-line-strong bg-panel p-4 text-left font-mono text-xs text-red-400">
                {this.state.error.stack || this.state.error.toString()}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
