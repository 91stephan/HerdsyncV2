import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  /** Reset the boundary when this value changes (e.g. route path or farm id). */
  resetKey?: string | number | null;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class PageErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("PageErrorBoundary caught:", error, info);
  }

  componentDidUpdate(prev: Props) {
    if (this.state.hasError && prev.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center py-16 px-4">
          <div className="max-w-md w-full text-center space-y-4 bg-card border border-border rounded-lg p-6 shadow-sm">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold text-foreground font-display">
              We hit a snag loading this page
            </h2>
            <p className="text-sm text-muted-foreground">
              {this.state.error?.message ||
                "Something went wrong. You can try again or reload the app."}
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <Button variant="outline" onClick={this.handleRetry}>
                Try again
              </Button>
              <Button onClick={this.handleReload}>Reload</Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
