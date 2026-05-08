import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "@/lib/fbPixel";

/**
 * Mounted once inside the BrowserRouter. Fires Facebook Pixel PageView on
 * every SPA route change (skipped automatically when no Pixel ID is set).
 */
export function RouteTracker() {
  const location = useLocation();
  useEffect(() => {
    trackPageView();
  }, [location.pathname, location.search]);
  return null;
}
