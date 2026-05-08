import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { logError } from "@/lib/telemetry";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  reported: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, reported: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, reported: false };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
    void logError({
      message: error.message || "React render crash",
      stack: error.stack || info.componentStack || null,
      source: "react.errorboundary",
      context: { componentStack: info.componentStack?.slice(0, 2000) },
    }).finally(() => this.setState({ reported: true }));
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, reported: false });
    window.location.href = "/";
  };

  handleReload = () => window.location.reload();

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh flex items-center justify-center p-6 bg-background">
          <div className="max-w-md w-full text-center space-y-4">
            <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
            <p className="text-muted-foreground text-sm">
              {this.state.error?.message || "An unexpected error occurred. Please try again."}
            </p>
            <p className="text-xs text-muted-foreground">
              {this.state.reported
                ? "Our team has been notified automatically."
                : "Reporting this issue…"}
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <Button variant="outline" onClick={this.handleReload}>Reload page</Button>
              <Button onClick={this.handleReset}>Return home</Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
