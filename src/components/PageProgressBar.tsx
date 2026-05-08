import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * Subtle top progress bar that animates briefly on every route change,
 * giving the app a "loading" cue during page transitions.
 */
export function PageProgressBar() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    setVisible(true);
    setAnimKey((k) => k + 1);
    const t = setTimeout(() => setVisible(false), 900);
    return () => clearTimeout(t);
  }, [location.pathname]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 h-0.5 z-[60] overflow-hidden bg-transparent pointer-events-none"
      aria-hidden="true"
    >
      <div
        key={animKey}
        className="h-full w-full bg-gradient-to-r from-primary/0 via-primary to-primary/0 animate-page-progress"
      />
    </div>
  );
}
