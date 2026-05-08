import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";

const STORAGE_KEY = "herdsync.cookie-consent.v1";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        // Small delay so it doesn't flash before first paint
        const t = setTimeout(() => setVisible(true), 600);
        return () => clearTimeout(t);
      }
    } catch {
      // ignore (private mode etc.)
    }
  }, []);

  const accept = (value: "all" | "essential") => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ value, at: new Date().toISOString() }),
      );
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-[100] p-3 sm:p-4"
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto max-w-3xl rounded-xl border border-border bg-card shadow-lg p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          <div className="hidden sm:flex w-10 h-10 rounded-lg bg-primary/10 items-center justify-center shrink-0">
            <Cookie className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground mb-1">
              We value your privacy
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              HerdSync uses cookies for essential site functionality and to remember
              your preferences. We comply with POPIA and GDPR. See our{" "}
              <Link to="/privacy-policy" className="text-primary underline">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => accept("essential")}
              className="min-h-[44px] sm:min-h-0"
            >
              Essential only
            </Button>
            <Button
              size="sm"
              onClick={() => accept("all")}
              className="min-h-[44px] sm:min-h-0"
            >
              Accept all
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
