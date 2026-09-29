import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
            Something went wrong
          </h2>
          <p className="mt-1 max-w-md text-xs text-slate-500 dark:text-slate-400">
            An unexpected error occurred while rendering this view. Click below to refresh the page.
          </p>
          <Button
            onClick={this.handleReload}
            icon={RefreshCw}
            size="sm"
            className="mt-4"
          >
            Reload Screen
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
